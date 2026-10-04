// Lembretes por notificação (Web Push) do GAAP Gestão.
// Chamada a cada 15 min pelo pg_cron (cabeçalho x-cron-token) ou pelo app (botão "Testar", com o login do usuário).
// Envia ~20 min depois do fim da jornada do dia:
//   - funcionário: "Você ainda não lançou as OS de hoje" / OS com cronômetro aberto
//   - responsável: quem ficou sem lançar hoje, cronômetros abertos e cadastros aguardando liberação
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-token", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const hm = (s?: string) => { if (!s) return null; const [h, m] = s.split(":").map(Number); return h * 60 + m; };

function agoraBrasilia() { // UTC-3, sem horário de verão
  const d = new Date(Date.now() - 3 * 3600 * 1000);
  return { dia: ymd(d), dow: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
function pascoa(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, mo - 1, da));
}
function ehFeriado(dia: string, fer: any = {}) {
  const y = +dia.slice(0, 4), md = dia.slice(5);
  if (["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"].includes(md)) return true;
  const p = pascoa(y), off = (n: number) => ymd(new Date(p.getTime() + n * 864e5));
  if (dia === off(-2)) return true;
  if (fer.carnaval && (dia === off(-48) || dia === off(-47))) return true;
  if (fer.corpus && dia === off(60)) return true;
  for (const ln of String(fer.extras ?? "31/07 Aniversário de Anápolis").split("\n")) {
    const m = ln.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/); if (!m) continue;
    if (m[3] && +m[3] !== y) continue;
    if (md === `${pad(+m[2])}-${pad(+m[1])}`) return true;
  }
  return false;
}
const JORNADA_PADRAO: Record<string, { ini: string; fim: string }> = { "1": { ini: "07:00", fim: "16:00" }, "2": { ini: "07:00", fim: "16:00" }, "3": { ini: "07:00", fim: "16:00" }, "4": { ini: "07:00", fim: "16:00" }, "5": { ini: "07:00", fim: "16:00" }, "6": { ini: "07:00", fim: "11:00" } };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: seg } = await sb.from("segredos").select("chave, valor");
  const S = Object.fromEntries((seg ?? []).map((r: any) => [r.chave, r.valor]));
  webpush.setVapidDetails("mailto:gaapengenharia3m@gmail.com", S.vapid_publica, S.vapid_privada);
  const body = await req.json().catch(() => ({}));

  const enviar = async (userIds: string[], payload: Record<string, unknown>) => {
    if (!userIds.length) return 0;
    const { data: subs } = await sb.from("push_inscricoes").select("endpoint, user_id, sub").in("user_id", userIds);
    let n = 0;
    for (const s of subs ?? []) {
      try { await webpush.sendNotification(s.sub, JSON.stringify(payload), { TTL: 6 * 3600 }); n++; }
      catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("push_inscricoes").delete().eq("endpoint", s.endpoint); }
    }
    return n;
  };

  // Teste pedido pelo próprio usuário no app
  if (body?.teste) {
    const tok = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(tok);
    if (!u?.user) return json({ erro: "login" }, 401);
    const n = await enviar([u.user.id], { title: "GAAP Gestão", body: "Lembretes ativados neste aparelho. 👍", url: "/" });
    return json({ enviados: n });
  }

  if (req.headers.get("x-cron-token") !== S.cron_token) return json({ erro: "proibido" }, 403);

  let { dia, dow, min } = agoraBrasilia();
  if (body?.simular && /^\d{4}-\d{2}-\d{2}$/.test(body?.dia ?? "")) { dia = body.dia; dow = new Date(dia + "T12:00:00Z").getUTCDay(); }
  const { data: cfgRow } = await sb.from("config").select("data").eq("id", "main").maybeSingle();
  const cfg: any = cfgRow?.data ?? {};
  const jor = { ...JORNADA_PADRAO, ...(cfg.jornada ?? {}) }[String(dow)] ?? {};
  const fim = hm(jor.fim), ini = hm(jor.ini);
  const resultado: any = { dia, min, fim, acao: "nada" };
  if (dow === 0 || ehFeriado(dia, cfg.feriados) || fim == null || ini == null) { resultado.acao = "dia sem jornada"; return json(resultado); }
  const hora = body?.forcar || (min >= fim + 20 && min < fim + 35);
  if (!hora) return json(resultado);

  const [{ data: perfis }, { data: aps }] = await Promise.all([
    sb.from("perfis").select("user_id, nome, papel"),
    sb.from("apontamentos").select("id, data, profissional, dia").or(`dia.eq.${dia},data->>andamento.eq.true`),
  ]);
  const hoje = (aps ?? []).filter((a: any) => a.dia === dia && !a.data?.excluido);
  const abertos = (aps ?? []).filter((a: any) => a.data?.andamento && !a.data?.excluido);
  const funcs = (perfis ?? []).filter((p: any) => p.papel === "funcionario" && p.nome);
  const donos = (perfis ?? []).filter((p: any) => p.papel === "dono");
  const pend = (perfis ?? []).filter((p: any) => p.papel === "pendente").length;
  const profsCfg = String(cfg.profissionais ?? "").split("\n").map((x: string) => x.trim()).filter(Boolean);
  const semLanc = profsCfg.filter((n) => !hoje.some((a: any) => a.profissional === n && !a.data?.andamento));

  const { data: ja } = await sb.from("lembretes_enviados").select("user_id, tipo").eq("dia", dia);
  const jaFoi = (u: string, t: string) => (ja ?? []).some((x: any) => x.user_id === u && x.tipo === t);
  const plano: any[] = [];
  for (const f of funcs) {
    const meu = abertos.find((a: any) => a.profissional === f.nome);
    if (meu) plano.push({ u: f.user_id, t: "aberto", p: { title: "Cronômetro ainda aberto", body: `A OS ${meu.data.os || "s/n"} está em andamento desde ${meu.data.inicio}. Encerre quando terminar.`, url: "/" } });
    else if (semLanc.includes(f.nome)) plano.push({ u: f.user_id, t: "sem_os", p: { title: "Faltou lançar as OS de hoje", body: "Você ainda não lançou nenhuma OS hoje. Leva um minuto.", url: "/" } });
  }
  const partes: string[] = [];
  if (semLanc.length) partes.push(`Sem lançamento hoje: ${semLanc.join(", ")}.`);
  if (abertos.length) partes.push(`${abertos.length} cronômetro(s) aberto(s).`);
  if (pend) partes.push(`${pend} cadastro(s) aguardando liberação.`);
  if (partes.length) for (const d of donos) plano.push({ u: d.user_id, t: "resumo", p: { title: "Resumo do dia", body: partes.join(" "), url: "/" } });

  const fazer = plano.filter((x) => !jaFoi(x.u, x.t));
  resultado.plano = fazer.map((x) => ({ tipo: x.t, body: x.p.body }));
  if (body?.simular) { resultado.acao = "simulado"; return json(resultado); }
  let enviados = 0;
  for (const x of fazer) {
    enviados += await enviar([x.u], x.p);
    await sb.from("lembretes_enviados").upsert({ dia, user_id: x.u, tipo: x.t });
  }
  resultado.acao = "enviado"; resultado.enviados = enviados;
  return json(resultado);
});
