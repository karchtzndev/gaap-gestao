// Contas por usuário e senha (o e-mail é opcional, só para recuperar a senha).
// criar: cria a conta já confirmada (sem e-mail de confirmação); fica "aguardando liberação" até o responsável aprovar.
// entrar: confere usuário e senha e devolve a sessão (o app não precisa saber o e-mail interno).
// recuperar: se a conta tiver e-mail de verdade, manda o link de nova senha para ele.
// email: com login, cadastra ou troca o e-mail de recuperação.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const INTERNO = "@usuarios.gaap-gestao.app";
const limpaUsuario = (u: unknown) => String(u ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, ".");
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
// cada conta precisa de um e-mail único: "voce@gmail.com" vira "voce+usuario@gmail.com", que chega na mesma caixa de entrada
const emailDaConta = (real: string, usuario: string) => { const [l, d] = real.split("@"); return `${l.split("+")[0]}+${usuario}@${d}`; };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const URL_SB = Deno.env.get("SUPABASE_URL")!;
  const adm = createClient(URL_SB, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const anon = () => createClient(URL_SB, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
  const b = await req.json().catch(() => ({}));
  const acao = String(b?.acao ?? ""), usuario = limpaUsuario(b?.usuario), senha = String(b?.senha ?? "");
  const origem = req.headers.get("origin") ?? "https://gaap-gestao.vercel.app";

  try {
    if (acao === "criar") {
      if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) return json({ erro: "Usuário: de 3 a 30 letras, números, ponto, hífen ou sublinhado, sem espaços." }, 400);
      if (senha.length < 6) return json({ erro: "A senha precisa ter pelo menos 6 caracteres." }, 400);
      const { data: ja } = await adm.from("usuarios_login").select("usuario").eq("usuario", usuario).maybeSingle();
      if (ja) return json({ erro: "Esse usuário já existe. Escolha outro." }, 409);
      const real = String(b?.email ?? "").trim().toLowerCase();
      if (real && !emailOk(real)) return json({ erro: "E-mail inválido (ou deixe em branco)." }, 400);
      const { data: cu, error } = await adm.auth.admin.createUser({ email: real ? emailDaConta(real, usuario) : usuario + INTERNO, password: senha, email_confirm: true, user_metadata: { usuario } });
      if (error || !cu?.user) return json({ erro: /already|registered|exists/i.test(error?.message ?? "") ? "Esse e-mail já tem conta. Entre com ele ou use outro." : "Não consegui criar a conta." }, 400);
      await adm.from("usuarios_login").insert({ usuario, user_id: cu.user.id });
      await adm.from("perfis").update({ nome: usuario.toUpperCase().replace(/[._-]/g, " ") }).eq("user_id", cu.user.id).is("nome", null);
      return json({ ok: true });
    }
    if (acao === "entrar") {
      const { data: m } = await adm.from("usuarios_login").select("user_id").eq("usuario", usuario).maybeSingle();
      if (!m) return json({ erro: "Usuário ou senha incorretos." }, 401);
      const { data: u } = await adm.auth.admin.getUserById(m.user_id);
      if (!u?.user?.email) return json({ erro: "Usuário ou senha incorretos." }, 401);
      const { data: s, error } = await anon().auth.signInWithPassword({ email: u.user.email, password: senha });
      if (error || !s?.session) return json({ erro: "Usuário ou senha incorretos." }, 401);
      return json({ ok: true, access_token: s.session.access_token, refresh_token: s.session.refresh_token });
    }
    if (acao === "recuperar") {
      const { data: m } = await adm.from("usuarios_login").select("user_id").eq("usuario", usuario).maybeSingle();
      if (m) {
        const { data: u } = await adm.auth.admin.getUserById(m.user_id);
        const e = u?.user?.email ?? "";
        if (e && !e.endsWith(INTERNO)) await anon().auth.resetPasswordForEmail(e, { redirectTo: origem + "/app" });
        else return json({ ok: false, semEmail: true });
      }
      return json({ ok: true });
    }
    if (acao === "email") {
      // a própria pessoa, ou o responsável para outra pessoa (alvo)
      const tok = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data: u } = await adm.auth.getUser(tok); if (!u?.user) return json({ erro: "login" }, 401);
      let alvo = u.user.id;
      if (b?.alvo && b.alvo !== u.user.id) {
        const { data: p } = await adm.from("perfis").select("papel").eq("user_id", u.user.id).maybeSingle();
        if (p?.papel !== "dono") return json({ erro: "Só o responsável pode mudar o e-mail de outra pessoa." }, 403);
        alvo = String(b.alvo);
      }
      const real = String(b?.email ?? "").trim().toLowerCase();
      if (!emailOk(real)) return json({ erro: "E-mail inválido." }, 400);
      const { data: m } = await adm.from("usuarios_login").select("usuario").eq("user_id", alvo).maybeSingle();
      const novo = m ? emailDaConta(real, m.usuario) : real;
      const { error } = await adm.auth.admin.updateUserById(alvo, { email: novo, email_confirm: true });
      if (error) return json({ erro: /already|registered|exists/i.test(error.message) ? "Esse e-mail já está em outra conta." : "Não consegui salvar o e-mail." }, 400);
      await adm.from("perfis").update({ email: novo }).eq("user_id", alvo);
      return json({ ok: true, email: novo });
    }
    if (acao === "senha") {
      const tok = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data: u } = await adm.auth.getUser(tok); if (!u?.user) return json({ erro: "login" }, 401);
      const { data: p } = await adm.from("perfis").select("papel").eq("user_id", u.user.id).maybeSingle();
      if (p?.papel !== "dono") return json({ erro: "Só o responsável pode trocar a senha de outra pessoa." }, 403);
      if (senha.length < 6) return json({ erro: "A senha precisa ter pelo menos 6 caracteres." }, 400);
      const { error } = await adm.auth.admin.updateUserById(String(b?.alvo ?? ""), { password: senha });
      return error ? json({ erro: "Não consegui trocar a senha." }, 400) : json({ ok: true });
    }
    return json({ erro: "acao" }, 400);
  } catch (e) {
    return json({ erro: "Falha no servidor. Tente de novo." }, 500);
  }
});
