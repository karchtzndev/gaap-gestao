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
