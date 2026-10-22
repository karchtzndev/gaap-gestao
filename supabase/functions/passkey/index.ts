// Entrar com Face ID / digital (passkeys / WebAuthn), mesmo depois de sair da conta.
// acao "registrar-opcoes" e "registrar": com o login do usuário, cadastra a chave deste aparelho.
// acao "entrar-opcoes" e "entrar": sem login; confere a assinatura da chave e devolve um token de uso único
// que o app troca por uma sessão (supabase.auth.verifyOtp com type "magiclink").
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
} from "npm:@simplewebauthn/server@13.3.3";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
// sites que podem usar as chaves (o domínio do app; localhost só para testes)
const ORIGENS: Record<string, string> = { "https://gaap-gestao.vercel.app": "gaap-gestao.vercel.app", "http://localhost:8766": "localhost" };
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64 = (s: string) => { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const origem = req.headers.get("origin") ?? "", rpID = ORIGENS[origem];
  if (!rpID) return json({ erro: "origem" }, 403);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));
  const acao = String(body?.acao ?? "");
  // desafios valem 5 minutos
  await sb.from("passkey_desafios").delete().lt("criado_em", new Date(Date.now() - 5 * 60000).toISOString());

  const usuario = async () => {
    const tok = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data } = await sb.auth.getUser(tok); return data?.user ?? null;
  };

  try {
    if (acao === "registrar-opcoes") {
      const u = await usuario(); if (!u) return json({ erro: "login" }, 401);
      const { data: ja } = await sb.from("passkeys").select("cred_id").eq("user_id", u.id);
      const op = await generateRegistrationOptions({
        rpName: "GAAP Gestão", rpID, userName: u.email ?? u.id, userDisplayName: u.email ?? "GAAP",
        userID: new TextEncoder().encode(u.id), attestationType: "none",
        excludeCredentials: (ja ?? []).map((c: any) => ({ id: c.cred_id })),
        authenticatorSelection: { residentKey: "required", userVerification: "required", authenticatorAttachment: "platform" },
      });
      const id = crypto.randomUUID();
      await sb.from("passkey_desafios").insert({ id, desafio: op.challenge, user_id: u.id });
      return json({ id, op });
    }
    if (acao === "registrar") {
      const u = await usuario(); if (!u) return json({ erro: "login" }, 401);
      const { data: d } = await sb.from("passkey_desafios").select("*").eq("id", String(body.id)).maybeSingle();
      if (!d || d.user_id !== u.id) return json({ erro: "desafio" }, 400);
      await sb.from("passkey_desafios").delete().eq("id", d.id);
      const v = await verifyRegistrationResponse({ response: body.resp, expectedChallenge: d.desafio, expectedOrigin: origem, expectedRPID: rpID, requireUserVerification: true });
      if (!v.verified || !v.registrationInfo) return json({ erro: "verificacao" }, 400);
      const c = v.registrationInfo.credential;
      await sb.from("passkeys").upsert({ cred_id: c.id, user_id: u.id, public_key: b64(c.publicKey), contador: c.counter, aparelho: String(body.aparelho ?? "").slice(0, 80) });
      return json({ ok: true, credId: c.id });
    }
    if (acao === "entrar-opcoes") {
      const op = await generateAuthenticationOptions({ rpID, userVerification: "required" });
      const id = crypto.randomUUID();
      await sb.from("passkey_desafios").insert({ id, desafio: op.challenge });
      return json({ id, op });
    }
    if (acao === "entrar") {
      const { data: d } = await sb.from("passkey_desafios").select("*").eq("id", String(body.id)).maybeSingle();
      if (!d) return json({ erro: "desafio" }, 400);
      await sb.from("passkey_desafios").delete().eq("id", d.id);
      const { data: k } = await sb.from("passkeys").select("*").eq("cred_id", String(body.resp?.id ?? "")).maybeSingle();
      if (!k) return json({ erro: "chave" }, 404);
      const v = await verifyAuthenticationResponse({
        response: body.resp, expectedChallenge: d.desafio, expectedOrigin: origem, expectedRPID: rpID, requireUserVerification: true,
        credential: { id: k.cred_id, publicKey: deB64(k.public_key), counter: Number(k.contador) },
      });
      if (!v.verified) return json({ erro: "verificacao" }, 401);
      await sb.from("passkeys").update({ contador: v.authenticationInfo.newCounter, usado_em: new Date().toISOString() }).eq("cred_id", k.cred_id);
      const { data: p } = await sb.from("perfis").select("papel").eq("user_id", k.user_id).maybeSingle();
      if (!p || p.papel === "bloqueado") return json({ erro: "bloqueado" }, 403);
      const { data: au } = await sb.auth.admin.getUserById(k.user_id);
      const email = au?.user?.email; if (!email) return json({ erro: "usuario" }, 404);
      const { data: lk, error } = await sb.auth.admin.generateLink({ type: "magiclink", email });
      if (error || !lk?.properties?.hashed_token) return json({ erro: "sessao" }, 500);
      return json({ ok: true, token: lk.properties.hashed_token, email });
    }
    if (acao === "remover") {
      const u = await usuario(); if (!u) return json({ erro: "login" }, 401);
      await sb.from("passkeys").delete().eq("user_id", u.id).eq("cred_id", String(body.credId ?? ""));
      return json({ ok: true });
    }
    return json({ erro: "acao" }, 400);
  } catch (e) {
    return json({ erro: String((e as Error)?.message ?? e).slice(0, 200) }, 400);
  }
});
