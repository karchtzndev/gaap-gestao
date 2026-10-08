// Backup diário no Google Drive do responsável.
// O pg_cron chama às 03:30 (x-cron-token); o app chama pelo botão "Enviar backup agora" (login de responsável).
// Manda o JSON com todos os dados para o App da Web do Google Apps Script que o responsável publicou na conta dele
// (URL guardada em segredos.drive_url, com a chave na query). O script grava na pasta "GAAP Backups".
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-token", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const TABELAS = ["apontamentos", "orcamentos", "recebimentos", "fechamentos", "despesas", "pagamentos", "equipamentos", "documentos", "ordens"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: seg } = await sb.from("segredos").select("chave, valor").in("chave", ["cron_token", "drive_url"]);
  const S = Object.fromEntries((seg ?? []).map((r: any) => [r.chave, r.valor]));
  if (req.headers.get("x-cron-token") !== S.cron_token) {
    const tok = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(tok);
    if (!u?.user) return json({ ok: false, erro: "login" }, 401);
    const { data: p } = await sb.from("perfis").select("papel").eq("user_id", u.user.id).maybeSingle();
    if (p?.papel !== "dono") return json({ ok: false, erro: "só o responsável" }, 403);
  }
  if (!S.drive_url) return json({ ok: false, erro: "Google Drive não configurado" });

  const dados: Record<string, unknown> = { sistema: "GAAP Gestão de Serviços", versao: 2, exportadoEm: new Date().toISOString(), origem: "google-drive" };
  const { data: cfg } = await sb.from("config").select("data").eq("id", "main").maybeSingle();
  const c: any = { ...(cfg?.data ?? {}) }; delete c.driveChave; dados.config = c;
  for (const t of TABELAS) {
    const rows: any[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await sb.from(t).select("id, data").range(de, de + 999);
      if (error || !data?.length) break;
      rows.push(...data.map((r: any) => ({ ...r.data, id: r.id }))); if (data.length < 1000) break;
    }
    dados[t] = rows;
  }
  const { data: perfis } = await sb.from("perfis").select("*"); dados.perfis = perfis ?? [];

  const br = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 16).replace("T", "_").replace(":", "h");
  const nome = `gaap-backup-${br}.json`;
  let res: any = { ok: false, erro: "sem resposta" };
  try {
    const r = await fetch(`${S.drive_url}&nome=${encodeURIComponent(nome)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados), redirect: "follow" });
    const txt = await r.text();
    try { res = JSON.parse(txt); } catch { res = { ok: false, erro: r.status === 200 ? "o script não respondeu como esperado (confira se colou o código todo e implantou como App da Web)" : `Google respondeu ${r.status}` }; }
  } catch (e) { res = { ok: false, erro: String((e as Error)?.message ?? e).slice(0, 200) }; }
  const status = { em: new Date().toISOString(), ok: !!res.ok, arquivo: res.arquivo ?? nome, erro: res.ok ? undefined : (res.erro ?? "falhou") };
  await sb.from("segredos").upsert({ chave: "drive_ultimo", valor: JSON.stringify(status) });
  return json({ ...res, arquivo: res.arquivo ?? nome });
});
