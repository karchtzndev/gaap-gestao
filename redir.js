"use strict";
// Página inicial (clientes). Quem é da equipe vai direto para o app:
// - app instalado na tela do celular (inclusive ícones instalados antes, que abrem em "/")
// - links de confirmação de e-mail e de troca de senha do Supabase (vêm com o token no endereço)
(function(){
  if(location.pathname.startsWith("/app")) return; // já está no app (cópia antiga do aparelho sem internet): não fica num vai e volta
  const h = location.hash, q = location.search;
  const auth = /access_token=|refresh_token=|error_description=|type=(signup|recovery|invite|magiclink|email_change)/.test(h) || /[?&](code|token_hash|error)=/.test(q);
  const instalado = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
  if(auth || instalado) location.replace("/app" + q + h);
})();
