"use strict";
// Página inicial (clientes): todos os botões abrem o WhatsApp com uma mensagem pronta.
// Troque aqui o número (com DDI 55 e DDD, só números). Ex.: "5562999998888"
const WHATSAPP = "5562993103507";

const linkWa = texto => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
const abrirWa = texto => { window.location.href = linkWa(texto); };
const OLA = "Olá! Vim pelo site da GAAP Engenharia e gostaria de um orçamento.";

// botões diretos (topo, início, flutuante): mensagem curta
document.querySelectorAll("[data-wa]").forEach(a => {
  if(WHATSAPP){ a.href = linkWa(OLA); a.target = "_blank"; a.rel = "noopener"; }
});

// formulário: monta a mensagem com o que o cliente preencheu
const form = document.getElementById("form-orc"), aviso = document.getElementById("form-aviso");
form.addEventListener("submit", e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form).entries());
  const nome = (d.nome || "").trim();
  if(!nome){ aviso.textContent = "Escreva seu nome para a gente saber com quem fala."; aviso.hidden = false; form.nome.focus(); return; }
  if(!WHATSAPP){ aviso.textContent = "O número do WhatsApp ainda não foi configurado."; aviso.hidden = false; return; }
  aviso.hidden = true;
  // grava o contato no sistema (keepalive: envia mesmo quando a página pula para o WhatsApp): nenhum pedido se perde
  try{
    const cfg = window.GAAP_CONFIG;
    if(cfg?.supabaseUrl && cfg?.supabaseKey){
      fetch(`${cfg.supabaseUrl}/rest/v1/rpc/registrar_lead`, {
        method:"POST", keepalive:true,
        headers:{"Content-Type":"application/json", apikey:cfg.supabaseKey, Authorization:"Bearer "+cfg.supabaseKey},
        body: JSON.stringify({p_nome:nome, p_servico:d.servico||"", p_descricao:(d.descricao||"").trim(), p_telefone:(d.telefone||"").trim()})
      }).catch(()=>{});
    }
  }catch(e){}
  const linhas = [
    `Olá! Meu nome é ${nome}${d.empresa?.trim() ? `, da ${d.empresa.trim()}` : ""}.`,
    `Gostaria de um orçamento de *${d.servico}*${d.cidade?.trim() ? ` em ${d.cidade.trim()}` : ""}.`,
    d.descricao?.trim() ? `\n${d.descricao.trim()}` : ""
  ].filter(Boolean);
  abrirWa(linhas.join("\n"));
});

// botão flutuante: só aparece depois que o botão grande do início sai da tela
const flut = document.querySelector(".flutuante"), heroBtn = document.querySelector('[data-wa="hero"]');
if(flut && heroBtn && "IntersectionObserver" in window){
  flut.classList.add("longe");
  new IntersectionObserver(([e]) => flut.classList.toggle("longe", e.isIntersecting)).observe(heroBtn);
}

document.getElementById("ano").textContent = new Date().getFullYear();

// entrada suave dos blocos ao rolar a página
if("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches){
  document.documentElement.classList.add("js");
  const alvos = document.querySelectorAll(".card, .lista li, .passos li, .faq details, .form");
  alvos.forEach(el=>el.classList.add("surge"));
  const io = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("visivel"); io.unobserve(e.target); } }), {rootMargin:"0px 0px -40px 0px"});
  alvos.forEach(el=>io.observe(el));
}

// obras publicadas e avaliações dos clientes (vêm do sistema; as seções só aparecem quando houver conteúdo)
(async () => {
  const C = window.GAAP_CONFIG; if(!C?.supabaseUrl) return;
  const h = {apikey:C.supabaseKey, Authorization:`Bearer ${C.supabaseKey}`, "Content-Type":"application/json"};
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  try{
    const r = await fetch(`${C.supabaseUrl}/rest/v1/site_obras?select=titulo,descricao,fotos&order=criado_em.desc&limit=9`, {headers:h});
    const obras = r.ok ? await r.json() : [];
    if(obras.length){ document.getElementById("obras-lista").innerHTML = obras.map(o=>`<article class="obra"><div class="obra-fotos f${Math.min(4,(o.fotos||[]).length)}">${(o.fotos||[]).slice(0,4).map(u=>`<img src="${esc(u)}" alt="${esc(o.titulo)}" loading="lazy">`).join("")}</div><h3>${esc(o.titulo)}</h3>${o.descricao?`<p class="muted">${esc(o.descricao)}</p>`:""}</article>`).join("");
      document.getElementById("obras").hidden = false; }
  }catch(e){}
  try{
    const r = await fetch(`${C.supabaseUrl}/rest/v1/rpc/avaliacoes_site`, {method:"POST", headers:h, body:"{}"});
    const av = r.ok ? await r.json() : [];
    if(av.length){ const media = av.reduce((s,a)=>s+a.nota,0)/av.length;
      document.getElementById("aval-titulo").textContent = `Nota ${media.toFixed(1).replace(".",",")} de 5 pelos nossos clientes`;
      document.getElementById("aval-lista").innerHTML = av.map(a=>`<figure class="aval"><div class="aval-est">${"★".repeat(a.nota)}${"☆".repeat(5-a.nota)}</div>${a.comentario?`<blockquote>“${esc(a.comentario)}”</blockquote>`:""}<figcaption>${esc(a.nome)}</figcaption></figure>`).join("");
      document.getElementById("avaliacoes").hidden = false; }
  }catch(e){}
})();
