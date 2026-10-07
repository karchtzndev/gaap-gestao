// Lembretes por notificação (Web Push) do GAAP Gestão.
// Chamada a cada 15 min pelo pg_cron (cabeçalho x-cron-token) ou pelo app (botão "Testar", com o login do usuário).
// Envia ~20 min depois do fim da jornada do dia:
//   - funcionário: "Você ainda não lançou as OS de hoje" / OS com cronômetro aberto
//   - responsável: quem ficou sem lançar hoje, cronômetros abertos e cadastros aguardando liberação
// E ~30 min depois do início da jornada, só para o responsável ("Para fazer hoje"):
//   medições vencidas ou vencendo, nota fiscal a emitir, documentos vencendo e preventivas atrasadas
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

const num = (v: unknown) => { if (typeof v === "number") return isFinite(v) ? v : 0; const t = String(v ?? ""); const n = parseFloat(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t); return isFinite(n) ? n : 0; };
const somaDias = (d: string, n: number) => ymd(new Date(Date.parse(d.slice(0, 10) + "T12:00:00Z") + n * 864e5));
const dif = (a: string, b: string) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a.slice(0, 10) + "T12:00:00Z")) / 864e5);
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
async function alertasManha(sb: any, cfg: any, dia: string): Promise<string[]> {
  const out: string[] = [];
  const [{ data: fechs }, { data: recs }, { data: docs }, { data: eqs }] = await Promise.all([
    sb.from("fechamentos").select("id, data"), sb.from("recebimentos").select("data"),
    sb.from("documentos").select("data"), sb.from("equipamentos").select("id, data"),
  ]);
  const rec = (recs ?? []).map((r: any) => r.data);
  for (const { id, data: f } of fechs ?? []) {
    const recebido = rec.filter((r: any) => r.origem === "fech" && r.fechId === id).reduce((s: number, r: any) => s + num(r.valor) + ["iss", "inss", "ir", "outras"].reduce((t, k) => t + num(r.ret?.[k]), 0), 0);
    const glosa = (f.glosas ?? []).reduce((s: number, g: any) => s + num(g.valor), 0);
    const saldo = Math.round(((+f.valor || 0) + (+f.reemb || 0) - glosa - recebido) * 100) / 100;
    if (saldo > 0.005) {
      const pz = (cfg.contratantes ?? {})[f.empresa || cfg.contratante || ""]?.prazo;
      const venc = f.vencimento || somaDias(f.enviadoEm || f.ate || dia, pz == null || pz === "" ? 30 : +pz);
      const d = dif(venc, dia);
      if (d > 0) out.push(`${f.numero} vencido há ${d} dia(s): ${brl(saldo)}`);
      else if (d >= -3) out.push(`${f.numero} vence ${d === 0 ? "hoje" : `em ${-d} dia(s)`}: ${brl(saldo)}`);
      if ((!f.nf || !f.nf.numero || f.nf.status === "emitir") && dif(f.enviadoEm || f.ate || dia, dia) >= 2) out.push(`${f.numero}: emitir nota fiscal`);
    }
  }
  // dia de corte da medição (ex.: Brejeiro todo dia 20)
  for (const [emp, F] of Object.entries<any>(cfg.contratantes ?? {})) {
    const corte = +F?.corte || 0; if (!corte) continue;
    const dd = +dia.slice(8), ate = `${dia.slice(0, 8)}${pad(corte)}`;
    const fechado = (fechs ?? []).some(({ data: f }: any) => (f.empresa || "") === emp && (f.ate || "") >= ate);
    if (dd === corte) out.unshift(`Hoje é dia ${corte}: fechar a medição ${emp}`);
    else if (dd > corte && dd <= corte + 7 && !fechado) out.unshift(`Medição ${emp} até ${pad(corte)}/${dia.slice(5, 7)} ainda não foi fechada`);
  }
  for (const { data: x } of docs ?? []) {
    if (!x.validade) continue; const d = dif(dia, x.validade);
    if (d < 0) out.push(`${x.tipo} de ${x.titular || "Empresa"} vencido`); else if (d <= 30 && (d % 7 === 0 || d <= 3)) out.push(`${x.tipo} de ${x.titular || "Empresa"} vence em ${d} dia(s)`);
  }
  if ((eqs ?? []).length) {
    const ids = (eqs ?? []).map((q: any) => q.id);
    const { data: aps } = await sb.from("apontamentos").select("dia, data->>equipId, data->>prevId").in("data->>equipId", ids);
    for (const { id, data: q } of eqs ?? []) {
      if (q.inativo) continue;
      for (const pl of q.plano ?? []) {
        const ult = (aps ?? []).filter((a: any) => a.equipId === id && a.prevId === pl.id).map((a: any) => a.dia).sort().pop();
        if (!ult) continue;
        const d = dif(somaDias(ult, +pl.cadaDias || 30), dia);
        if (d > 0) out.push(`Preventiva ${q.tag} (${pl.atividade}) atrasada ${d} dia(s)`);
      }
    }
  }
  return out;
}

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

  // chamado de emergência aberto pela contratante no portal: avisa toda a equipe na hora
  if (body?.chamado) {
    const { data: ch } = await sb.from("chamados").select("*").eq("id", String(body.chamado)).maybeSingle();
    if (!ch) return json({ erro: "chamado" }, 404);
    const { data: ps } = await sb.from("perfis").select("user_id").in("papel", ["dono", "funcionario"]);
    const d = ch.data ?? {};
    const n = await enviar((ps ?? []).map((p: any) => p.user_id), { title: `🚨 Chamado de emergência · ${ch.empresa}`, body: `${d.unidade ? d.unidade + ": " : ""}${d.descricao ?? ""}${d.parada ? " (máquina parada)" : ""}${d.nome ? ` — ${d.nome}` : ""}`.slice(0, 220), url: "/#chamados" });
    return json({ acao: "chamado", enviados: n });
  }

  let { dia, dow, min } = agoraBrasilia();
  if (body?.simular && /^\d{4}-\d{2}-\d{2}$/.test(body?.dia ?? "")) { dia = body.dia; dow = new Date(dia + "T12:00:00Z").getUTCDay(); }
  const { data: cfgRow } = await sb.from("config").select("data").eq("id", "main").maybeSingle();
  const cfg: any = cfgRow?.data ?? {};
  const jor = { ...JORNADA_PADRAO, ...(cfg.jornada ?? {}) }[String(dow)] ?? {};
  const fim = hm(jor.fim), ini = hm(jor.ini);
  const resultado: any = { dia, min, fim, acao: "nada" };
  if (dow === 0 || ehFeriado(dia, cfg.feriados) || fim == null || ini == null) { resultado.acao = "dia sem jornada"; return json(resultado); }
  const manha = body?.manha || (!body?.forcar && min >= ini + 30 && min < ini + 45);
  if (manha) {
    const R = await alertasManha(sb, cfg, dia);
    resultado.alertas = R;
    if (!R.length) { resultado.acao = "manha: nada"; return json(resultado); }
    const { data: perfis } = await sb.from("perfis").select("user_id, papel").eq("papel", "dono");
    const { data: ja } = await sb.from("lembretes_enviados").select("user_id").eq("dia", dia).eq("tipo", "manha");
    const corpo = R.length === 1 ? R[0] : `${R.slice(0, 3).join(" · ")}${R.length > 3 ? ` (+${R.length - 3})` : ""}`;
    if (body?.simular) { resultado.acao = "manha: simulado"; resultado.body = corpo; return json(resultado); }
    let enviados = 0;
    for (const d of perfis ?? []) {
      if ((ja ?? []).some((x: any) => x.user_id === d.user_id)) continue;
      enviados += await enviar([d.user_id], { title: `Para fazer hoje (${R.length})`, body: corpo, url: "/" });
      await sb.from("lembretes_enviados").upsert({ dia, user_id: d.user_id, tipo: "manha" });
    }
    resultado.acao = "manha: enviado"; resultado.enviados = enviados; return json(resultado);
  }
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

  // véspera do corte: funcionário confere as próprias OS
  const amanha = +somaDias(dia, 1).slice(8);
  const corteAmanha = Object.entries<any>(cfg.contratantes ?? {}).filter(([, F]) => +F?.corte === amanha).map(([n]) => n);
  if (corteAmanha.length) for (const f of funcs) plano.push({ u: f.user_id, t: "vespera", p: { title: "Amanhã é dia de fechamento", body: `Fechamento ${corteAmanha.join(", ")} amanhã (dia ${amanha}). Confira se todas as suas OS estão lançadas e sem cronômetro aberto.`, url: "/" } });
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
