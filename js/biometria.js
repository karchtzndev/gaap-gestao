"use strict";
/* ---------- Face ID / digital para abrir o app ----------
   Usa a biometria do próprio aparelho (WebAuthn, autenticador da plataforma). É uma trava local:
   a sessão do Supabase continua guardada no aparelho; ao abrir o app (ou voltar depois de um tempo)
   ele pede Face ID / digital antes de mostrar os dados. Se a biometria falhar, dá para entrar com a senha. */
const bio = {
  VOLTA_MIN: 5, // voltou ao app depois de 5 min em segundo plano: pede de novo
  chave(){ return "gaap-bio-" + (session?.user?.id || ""); },
  credId(){ try{ return localStorage.getItem(this.chave()) || ""; }catch(e){ return ""; } },
  ligado(){ return !!(session && (this.credId() || session.user?.user_metadata?.passkey)); },
  async suportado(){
    try{ return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); }catch(e){ return false; }
  },
  nome(){ return /iPhone|iPad|Macintosh/.test(navigator.userAgent) ? "Face ID / Touch ID" : "biometria"; },
  b64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); },
  buf(s){ s = s.replace(/-/g,"+").replace(/_/g,"/"); while(s.length % 4) s += "="; return Uint8Array.from(atob(s), c=>c.charCodeAt(0)); },
  aleatorio(n){ return crypto.getRandomValues(new Uint8Array(n)); },
  /* cadastra a chave no servidor (permite entrar com Face ID mesmo depois de sair da conta) */
  async ativar(){
    if(!session) return false;
    try{
      const {data:o, error} = await sb.functions.invoke("passkey", {body:{acao:"registrar-opcoes"}});
      if(error || !o?.op) throw {servidor:true};
      const op = o.op;
      const cred = await navigator.credentials.create({publicKey:{...op, challenge:this.buf(op.challenge), user:{...op.user, id:this.buf(op.user.id)},
        excludeCredentials:(op.excludeCredentials||[]).map(c=>({...c, id:this.buf(c.id)}))}});
      if(!cred) return false;
      const r = cred.response, resp = {id:cred.id, rawId:this.b64(cred.rawId), type:cred.type, authenticatorAttachment:cred.authenticatorAttachment||"platform", clientExtensionResults:{},
        response:{clientDataJSON:this.b64(r.clientDataJSON), attestationObject:this.b64(r.attestationObject), transports:r.getTransports?r.getTransports():["internal"]}};
      const {data:v, error:e2} = await sb.functions.invoke("passkey", {body:{acao:"registrar", id:o.id, resp, aparelho:navigator.platform||""}});
      if(e2 || !v?.ok) throw {servidor:true};
      localStorage.setItem(this.chave(), this.b64(cred.rawId)); localStorage.setItem("gaap-bio-tem", "1");
      sb.auth.updateUser({data:{passkey:true}}).catch(()=>{});
      toast(`Pronto! Agora você entra com ${this.nome()}, mesmo depois de sair da conta.`);
      return true;
    }catch(e){ if(e?.name!=="NotAllowedError" && e?.name!=="InvalidStateError") toast(e?.servidor ? "Sem conexão com o servidor. Tente de novo com internet." : "Não consegui ligar a biometria neste aparelho."); else if(e?.name==="InvalidStateError"){ try{ localStorage.setItem(this.chave(), "1"); localStorage.setItem("gaap-bio-tem", "1"); }catch(err){} sb.auth.updateUser({data:{passkey:true}}).catch(()=>{}); toast("Este aparelho já tem a biometria ligada."); return true; } return false; }
  },
  /* login sem senha: o aparelho assina o desafio, o servidor confere e devolve um token de uso único */
  async entrar(btn){
    if(btn) btn.disabled = true;
    try{
      const {data:o, error} = await sb.functions.invoke("passkey", {body:{acao:"entrar-opcoes"}});
      if(error || !o?.op) throw {servidor:true};
      const op = o.op;
      const a = await navigator.credentials.get({publicKey:{...op, challenge:this.buf(op.challenge), allowCredentials:(op.allowCredentials||[]).map(c=>({...c, id:this.buf(c.id)}))}});
      if(!a) return;
      const r = a.response, resp = {id:a.id, rawId:this.b64(a.rawId), type:a.type, authenticatorAttachment:a.authenticatorAttachment||"platform", clientExtensionResults:{},
        response:{clientDataJSON:this.b64(r.clientDataJSON), authenticatorData:this.b64(r.authenticatorData), signature:this.b64(r.signature), userHandle:r.userHandle?this.b64(r.userHandle):undefined}};
      const {data:v, error:e2} = await sb.functions.invoke("passkey", {body:{acao:"entrar", id:o.id, resp}});
      if(e2 || !v?.token){ toast(v?.erro==="chave" ? "Essa biometria não está cadastrada. Entre com a senha e ligue de novo em Ajustes." : v?.erro==="bloqueado" ? "Acesso bloqueado. Fale com o responsável." : "Não consegui entrar com a biometria. Use a senha."); return; }
      const {error:e3} = await sb.auth.verifyOtp({token_hash:v.token, type:"magiclink"});
      if(e3){ toast("Não consegui abrir a sessão. Use a senha."); return; }
      try{ localStorage.setItem("gaap-bio-" + (await sb.auth.getUser()).data.user.id, resp.rawId); localStorage.setItem("gaap-bio-tem", "1"); }catch(e){}
    }catch(e){ if(e?.name!=="NotAllowedError") toast(e?.servidor ? "Sem internet: entre com a senha." : "Não consegui usar a biometria. Use a senha."); }
    finally{ if(btn) btn.disabled = false; }
  },
  botaoLogin(){ return window.PublicKeyCredential ? `<button type="button" class="btn lg-go" data-bio="entrar" style="margin-top:8px">🔐 Entrar com ${this.nome()}</button>` : ""; },
  desligar(){ try{ localStorage.removeItem(this.chave()); }catch(e){} sb.auth.updateUser({data:{passkey:false}}).catch(()=>{}); if(session?.user?.user_metadata) session.user.user_metadata.passkey = false; toast(`Desbloqueio por ${this.nome()} desligado neste aparelho.`); },
  async verificar(){
    try{
      const r = await navigator.credentials.get({publicKey:{
        challenge: this.aleatorio(32), rpId: location.hostname, timeout: 60000, userVerification: "required",
        ...(this.credId() && this.credId()!=="1" ? {allowCredentials: [{type:"public-key", id: this.buf(this.credId()), transports:["internal"]}]} : {})
      }});
      return !!r;
    }catch(e){ return false; }
  },
  /* tela de bloqueio por cima do app */
  trancar(){
    if(!this.ligado() || document.getElementById("bio-trava")) return;
    const d = document.createElement("div");
    d.id = "bio-trava"; d.className = "bio-trava";
    d.innerHTML = `<div class="bio-card"><img src="${LOGO}" alt=""><b>GAAP ENGENHARIA</b>
      <p class="muted">App protegido com ${this.nome()}.</p>
      <button class="btn primary" type="button" data-bio="abrir">🔓 Desbloquear</button>
      <button class="btn ghost sm" type="button" data-bio="senha">Entrar com a senha</button></div>`;
    document.body.appendChild(d);
    setTimeout(()=>this.abrir(), 350); // pede na hora (no iPhone o pedido automático pode exigir um toque)
  },
  async abrir(){
    if(this.abrindo) return; this.abrindo = true;
    const ok = await this.verificar(); this.abrindo = false;
    if(ok){ document.getElementById("bio-trava")?.remove(); this.saiuEm = 0; }
  },
  /* depois de entrar com a senha: oferece ligar (uma vez por conta/aparelho) */
  async oferecer(){
    if(!session || this.ligado() || !(await this.suportado())) return;
    const k = "gaap-bio-perguntado-" + session.user.id;
    try{ if(localStorage.getItem(k)) return; localStorage.setItem(k, "1"); }catch(e){ return; }
    const d = document.createElement("div");
    d.id = "bio-oferta"; d.className = "bio-trava";
    d.innerHTML = `<div class="bio-card"><img src="${LOGO}" alt=""><b>Entrar mais rápido?</b>
      <p class="muted">Use ${this.nome()} para entrar no app, sem digitar a senha.</p>
      <button class="btn primary" type="button" data-bio="ligar">Usar ${this.nome()}</button>
      <button class="btn ghost sm" type="button" data-bio="agora-nao">Agora não</button></div>`;
    document.body.appendChild(d);
  },
  painel(){ // linha em Ajustes
    return `<div class="panel" style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap" id="bio-painel"><div><b>Entrar com ${this.nome()}</b><p class="muted" style="margin:2px 0 0">${this.ligado() ? "Ligado neste aparelho." : "Abre o app com a biometria do celular, sem digitar a senha."}</p></div>
      <button class="btn sm ${this.ligado()?"":"primary"}" type="button" data-bio="${this.ligado()?"desligar":"ligar"}">${this.ligado()?"Desligar":"Ligar"}</button></div>`;
  }
};
document.addEventListener("click", async e=>{
  const b = e.target.closest("[data-bio]"); if(!b) return;
  const a = b.dataset.bio;
  if(a==="abrir") bio.abrir();
  else if(a==="senha"){ document.getElementById("bio-trava")?.remove(); await sb.auth.signOut().catch(()=>{}); }
  else if(a==="entrar") bio.entrar(b);
  else if(a==="ligar"){ const ok = await bio.ativar(); document.getElementById("bio-oferta")?.remove(); if(ok && state.view==="ajustes"){ state.rendered = null; render(); } }
  else if(a==="agora-nao") document.getElementById("bio-oferta")?.remove();
  else if(a==="desligar"){ bio.desligar(); state.rendered = null; render(); }
});
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden){ bio.saiuEm = Date.now(); return; }
  if(bio.saiuEm && Date.now() - bio.saiuEm > bio.VOLTA_MIN * 60000) bio.trancar();
});

/* olhinho nos campos de senha: mostra/esconde o que foi digitado */
function olhoSenha(raiz){
  (raiz||document).querySelectorAll('input[type="password"]:not([data-olho])').forEach(inp=>{
    inp.dataset.olho = "1";
    const caixa = document.createElement("span"); caixa.className = "senha-caixa";
    inp.parentNode.insertBefore(caixa, inp); caixa.appendChild(inp);
    const b = document.createElement("button"); b.type = "button"; b.className = "olho"; b.setAttribute("aria-label", "Mostrar senha"); b.textContent = "👁";
    b.addEventListener("click", ()=>{ const ver = inp.type === "password"; inp.type = ver ? "text" : "password"; b.textContent = ver ? "🙈" : "👁"; b.setAttribute("aria-label", ver ? "Esconder senha" : "Mostrar senha"); inp.focus(); });
    caixa.appendChild(b);
  });
}
new MutationObserver(()=>olhoSenha()).observe(document.body, {childList:true, subtree:true});
olhoSenha();
