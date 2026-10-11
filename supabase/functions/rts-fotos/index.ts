// Fotos do relatório técnico para a página pública de verificação (/verificar).
// Recebe só o código de autenticidade; devolve links temporários (1 h) das fotos e da assinatura daquele relatório.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const FOTO = /^[0-9a-f-]{36}\/[A-Za-z0-9_-]{1,40}\.(jpg|png|webp|gif)$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "método" }, 405);
  let codigo = "";
  try { codigo = String((await req.json())?.codigo || "").trim().toUpperCase(); } catch { return json({ erro: "pedido inválido" }, 400); }
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codigo)) return json({ erro: "código inválido" }, 400);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data, error } = await sb.from("ordens").select("data").eq("data->relatorio->>codigo", codigo).limit(1).maybeSingle();
  if (error) return json({ erro: "falha ao ler" }, 500);
  const r = data?.data?.relatorio;
  if (!r) return json({ fotos: [], assin: null });
  const fotos = (Array.isArray(r.fotos) ? r.fotos : []).filter((f: any) => FOTO.test(String(f?.id || ""))).slice(0, 12);
  const assin = r.assin && FOTO.test(String(r.assin.foto || "")) ? r.assin : null;
  const ids = [...fotos.map((f: any) => f.id), ...(assin ? [assin.foto] : [])];
  if (!ids.length) return json({ fotos: [], assin: null });
  const { data: urls } = await sb.storage.from("fotos").createSignedUrls(ids, 3600);
  const url: Record<string, string> = {};
  (urls || []).forEach((u: any) => { if (u?.path && u?.signedUrl) url[u.path] = u.signedUrl; });
  return json({
    fotos: fotos.map((f: any) => ({ tipo: f.tipo || "durante", url: url[f.id] })).filter((f: any) => f.url),
    assin: assin && url[assin.foto] ? { url: url[assin.foto], nome: assin.nome || "", em: assin.em || "" } : null,
  });
});
