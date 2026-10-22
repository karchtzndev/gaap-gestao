"use strict";
/* ---------- GAAP · extras: ditado por voz, comparativo, avaliações, galeria do site, ponto com localização ---------- */

/* ===== 1) ditado por voz nos campos de descrição ===== */
const Voz = window.SpeechRecognition || window.webkitSpeechRecognition;
const VOZ_CAMPOS = "#f-desc, #f-obs, #cr-desc, [data-f='desc'], #nv-desc";
let vozAtiva = null;
function vozBotoes(raiz){
  if(!Voz) return;
  (raiz||document).querySelectorAll(VOZ_CAMPOS).forEach(campo=>{
    if(campo.dataset.voz) return; campo.dataset.voz = "1";
    const b = document.createElement("button"); b.type = "button"; b.className = "btn sm vozbtn"; b.textContent = "🎤"; b.title = "Ditar por voz"; b.setAttribute("aria-label", "Ditar por voz");
    campo.insertAdjacentElement("afterend", b);
    b.addEventListener("click", ()=>vozDitar(campo, b));
  });
}
function vozDitar(campo, b){
  if(vozAtiva){ vozAtiva.stop(); return; }
  const r = new Voz(); r.lang = "pt-BR"; r.interimResults = true; r.continuous = false;
  const base = campo.value ? campo.value.replace(/\s*$/, " ") : "";
  r.onresult = ev=>{ let t = ""; for(const res of ev.results) t += res[0].transcript; campo.value = base + t.charAt(0).toUpperCase() + t.slice(1); campo.dispatchEvent(new Event("input", {bubbles:true})); };
  r.onerror = ev=>{ if(ev.error==="not-allowed") toast("Libere o microfone para o app nas configurações do celular."); else if(ev.error!=="no-speech" && ev.error!=="aborted") toast("Não consegui ouvir. Tente de novo."); };
  r.onend = ()=>{ vozAtiva = null; b.classList.remove("ouvindo"); b.textContent = "🎤"; campo.dispatchEvent(new Event("change", {bubbles:true})); };
  try{ r.start(); vozAtiva = r; b.classList.add("ouvindo"); b.textContent = "⏹"; toast("Pode falar…"); }catch(e){ toast("Ditado indisponível neste aparelho."); }
}
new MutationObserver(()=>vozBotoes()).observe(document.body, {childList:true, subtree:true});

const nbr = v => (Math.round(v*100)/100).toLocaleString("pt-BR");

/* ===== 10) comparativo mês a mês ===== */
function vComparativo(){
  const meses = []; const d = parseYmd(today()); d.setDate(1);
  for(let i=0; i<12; i++){ meses.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}`); d.setMonth(d.getMonth()-1); }
  const dados = m => { const aps = state.ap.filter(e=>ym(e.data)===m && !e.andamento), c = sumCalc(aps), orc = state.orc.filter(o=>["aprovado","concluido"].includes(o.status) && ym(o.aprovadoEm||o.data||"")===m).reduce((s,o)=>s+orcTotals(o).total,0);
    return {m, horas:c.total, valor:c.valor + orc, os:new Set(aps.map(e=>e.os||e.id)).size, clientes:new Set(aps.map(e=>empOf(e)).filter(Boolean)).size}; };
  const L = meses.map(dados), max = Math.max(1, ...L.map(x=>x.valor));
  const ant = m => { const [y,mm] = m.split("-").map(Number); const p = new Date(y, mm-2, 1); return `${p.getFullYear()}-${pad(p.getMonth()+1)}`; };
  const anoPassado = m => `${+m.slice(0,4)-1}${m.slice(4)}`;
  const delta = (a, b) => !b ? "" : (()=>{ const p = Math.round((a-b)/b*100); return `<small class="${p>=0?"pos":"neg"}">${p>=0?"▲":"▼"} ${Math.abs(p)}%</small>`; })();
  const atual = L[0], prev = dados(ant(atual.m)), ap = dados(anoPassado(atual.m));
  return `<div class="pagehead"><div><span class="eyebrow">Relatórios</span><h1>Comparativo mês a mês</h1><p class="muted">Faturamento (horas + orçamentos aprovados), horas, OS e clientes atendidos nos últimos 12 meses.</p></div><button class="btn" data-act="nav" data-view="mais">‹ Mais</button></div>
  <section class="resumo">
    <div class="rs"><span>${ymLabel(atual.m)}</span><b>${brl(atual.valor)}</b>${delta(atual.valor, prev.valor)}<small>vs. mês anterior</small></div>
    <div class="rs"><span>Mesmo mês, ano passado</span><b>${brl(ap.valor)}</b>${delta(atual.valor, ap.valor)}</div>
    <div class="rs"><span>Horas no mês</span><b>${fh(atual.horas)}</b>${delta(atual.horas, prev.horas)}</div>
    <div class="rs"><span>Clientes atendidos</span><b>${atual.clientes}</b>${delta(atual.clientes, prev.clientes)}</div>
  </section>
  <div class="tablewrap"><table class="comparativo"><thead><tr><th>Mês</th><th>Faturamento</th><th class="r">Horas</th><th class="r">OS</th><th class="r">Clientes</th><th class="r">vs. anterior</th></tr></thead>
  <tbody>${L.map((x,i)=>`<tr><td><b>${ymLabel(x.m)}</b></td><td><div class="barra"><i style="width:${Math.round(x.valor/max*100)}%"></i><span class="mono">${brl(x.valor)}</span></div></td><td class="r mono">${fh(x.horas)}</td><td class="r mono">${x.os}</td><td class="r mono">${x.clientes}</td><td class="r">${delta(x.valor, (L[i+1]||dados(ant(x.m))).valor)}</td></tr>`).join("")}</tbody></table></div>`;
}

/* ===== 5) avaliação do cliente ===== */
async function carregarAvaliacoes(){ const {data} = await sb.from("avaliacoes").select("*").order("criado_em", {ascending:false}).limit(200); state.avals = data || []; if(state.view==="avaliacoes"){ state.rendered = null; render(); } }
function vAvaliacoes(){
  if(!state.avals){ setTimeout(carregarAvaliacoes, 0); return `<div class="pagehead"><div><span class="eyebrow">Clientes</span><h1>Avaliações</h1></div></div><p class="muted">Carregando…</p>`; }
  const resp = state.avals.filter(a=>a.nota), media = resp.length ? resp.reduce((s,a)=>s+a.nota,0)/resp.length : 0;
  const est = n => "★".repeat(n) + "☆".repeat(5-n);
  return `<div class="pagehead"><div><span class="eyebrow">Clientes</span><h1>Avaliações</h1><p class="muted">Peça a avaliação pela OS (Horas → toque na OS → ⭐ Pedir avaliação). Marque <b>Mostrar no site</b> nas que quiser exibir na página inicial.</p></div><button class="btn" data-act="nav" data-view="mais">‹ Mais</button></div>
  <section class="resumo"><div class="rs"><span>Média</span><b>${resp.length?`${nbr(media)} ★`:"—"}</b></div><div class="rs"><span>Respondidas</span><b>${resp.length}</b><small>de ${state.avals.length} pedidas</small></div><div class="rs"><span>No site</span><b>${state.avals.filter(a=>a.publicar).length}</b></div></section>
  ${state.avals.length?`<div class="list">${state.avals.map(a=>`<div class="item" style="cursor:default;flex-wrap:wrap"><span><b>${a.nota?`<span class="estrelas">${est(a.nota)}</span>`:'<span class="pill">aguardando resposta</span>'}</b> ${esc(a.nome||a.ref?.cliente||"")}<br><small class="muted">${esc(a.ref?.servico||"")} · ${fdate(String(a.respondido_em||a.criado_em).slice(0,10))}</small>${a.comentario?`<br>“${esc(a.comentario)}”`:""}</span>
    <span class="row">${a.nota?`<label class="check"><input type="checkbox" data-aval-pub="${esc(a.token)}" ${a.publicar?"checked":""}> Mostrar no site</label>`:`<button class="btn sm" data-act="avalReenviar" data-t="${esc(a.token)}">Reenviar link</button>`}</span></div>`).join("")}</div>`
  :`<section class="panel"><p class="muted" style="margin:0">Nenhuma avaliação pedida ainda.</p></section>`}`;
}
document.addEventListener("change", async e=>{ const t = e.target.dataset?.avalPub; if(!t) return;
  const {error} = await sb.from("avaliacoes").update({publicar:e.target.checked}).eq("token", t);
  if(error){ toast("Não consegui salvar."); e.target.checked = !e.target.checked; return; }
  const a = (state.avals||[]).find(x=>x.token===t); if(a) a.publicar = e.target.checked; toast(e.target.checked ? "Vai aparecer no site." : "Saiu do site."); });
const linkAval = t => `${location.origin}/avaliar#t=${t}`;
function msgAval(t, servico){ return `Olá! Aqui é da ${state.cfg.empresa.nome}. Obrigado pela confiança${servico?` no serviço "${servico}"`:""}. Pode nos avaliar? Leva 10 segundos: ${linkAval(t)}`; }

/* ===== 6) galeria de obras no site ===== */
async function carregarGaleria(){ const {data} = await sb.from("site_obras").select("*").order("criado_em", {ascending:false}); state.galeria = data || []; if(state.view==="galeria"){ state.rendered = null; render(); } }
function vGaleria(){
  if(!state.galeria){ setTimeout(carregarGaleria, 0); return `<div class="pagehead"><div><span class="eyebrow">Site</span><h1>Galeria de obras</h1></div></div><p class="muted">Carregando…</p>`; }
  return `<div class="pagehead"><div><span class="eyebrow">Site</span><h1>Galeria de obras</h1><p class="muted">Para publicar: Horas → toque na OS → <b>🖼️ Publicar no site</b> e escolha as fotos. Elas aparecem na página inicial.</p></div><button class="btn" data-act="nav" data-view="mais">‹ Mais</button></div>
  ${state.galeria.length?`<div class="galeria-adm">${state.galeria.map(g=>`<div class="panel"><div class="thumbs">${(g.fotos||[]).map(u=>`<span class="thumb"><img src="${esc(u)}" alt="" loading="lazy"></span>`).join("")}</div><b>${esc(g.titulo)}</b>${g.descricao?`<p class="muted" style="margin:2px 0 8px">${esc(g.descricao)}</p>`:""}<button class="btn sm danger" data-act="galeriaTirar" data-id="${esc(g.id)}">Tirar do site</button></div>`).join("")}</div>`
  :`<section class="panel"><p class="muted" style="margin:0">Nenhuma obra publicada ainda.</p></section>`}`;
}
function galeriaForm(os){
  const rows = state.ap.filter(e=>(e.os||"(sem nº)")===os), fotos = [...new Set(rows.flatMap(e=>e.fotos||[]))];
  if(!fotos.length){ toast("Esta OS não tem fotos. Tire fotos de antes e depois ao lançar."); return; }
  const desc = rows.find(e=>e.descricao)?.descricao || "";
  openModal(`<header><h2>Publicar no site</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <form class="form" id="galForm"><p class="muted" style="margin:0">Escolha até 4 fotos (antes e depois funcionam melhor). Não aparece o nome do cliente se você não escrever.</p>
    <div class="galpick">${fotos.map(id=>`<label class="galopt"><input type="checkbox" value="${esc(id)}"><img src="${esc(blobSrc(id))}" data-fid="${esc(id)}" alt=""><i>${esc(fotoTipo(id)||"")}</i></label>`).join("")}</div>
    <label class="field"><span>Título</span><input id="gal-tit" value="${esc(desc.slice(0,60))}" required placeholder="Ex.: Troca do quadro geral"></label>
    <label class="field"><span>Descrição (opcional)</span><textarea id="gal-desc" rows="2" placeholder="Ex.: Quadro antigo com aquecimento substituído por quadro novo com DR e DPS."></textarea></label>
    <footer><span></span><button class="btn primary" type="submit">Publicar</button></footer></form>`);
  assinarFotos(fotos).then(()=>document.querySelectorAll(".galopt img").forEach(i=>{ i.src = blobSrc(i.dataset.fid); })).catch(()=>{});
}
document.addEventListener("submit", async e=>{
  if(e.target.id!=="galForm") return; e.preventDefault();
  const ids = [...document.querySelectorAll(".galopt input:checked")].map(x=>x.value).slice(0,4);
  if(!ids.length){ toast("Escolha pelo menos uma foto."); return; }
  const btn = e.target.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Enviando…";
  try{
    const urls = [];
    for(const id of ids){ await assinarFotos([id]); const r = await fetch(blobSrc(id)); if(!r.ok) throw 0; const b = await r.blob();
      const path = `obras/${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}.jpg`;
      const {error} = await sb.storage.from("site").upload(path, b, {contentType:b.type || "image/jpeg"}); if(error) throw error;
      urls.push(sb.storage.from("site").getPublicUrl(path).data.publicUrl); }
    const {error} = await sb.from("site_obras").insert({titulo:$("#gal-tit").value.trim() || "Obra", descricao:$("#gal-desc").value.trim() || null, fotos:urls});
    if(error) throw error;
    state.galeria = null; closeModal(); toast("Publicado! Já aparece na página inicial.");
  }catch(err){ btn.disabled = false; btn.textContent = "Publicar"; toast("Não consegui publicar. Confira a internet."); }
});

/* ===== 13) ponto com localização: saída registrada ao encerrar a OS ===== */
if(typeof encerrarOS==="function"){ const _encerrar = encerrarOS;
  encerrarOS = async (e, quando) => { const gf = await localizacao().catch(()=>null); return _encerrar(gf ? {...e, geoFim:gf} : e, quando); }; }
function distM(a, b){ if(!a || !b) return null; const R = 6371000, r = x=>x*Math.PI/180, dLat = r(b.lat-a.lat), dLng = r(b.lng-a.lng);
  const h = Math.sin(dLat/2)**2 + Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLng/2)**2; return Math.round(2*R*Math.asin(Math.sqrt(h))); }
function pontoHtml(e){
  if(state.worker || (!e.geo && !e.geoFim)) return "";
  const d = distM(e.geo, e.geoFim), longe = d != null && d > 500;
  return `${e.geoFim?` <span class="pill ${longe?"warn":""}" role="link" data-act="abrirMapa" data-lat="${esc(e.geoFim.lat)}" data-lng="${esc(e.geoFim.lng)}" title="Onde estava ao encerrar">📍 saída${longe?` · ${d>=1000?nbr(d/1000)+" km":d+" m"} do início`:""}</span>`:""}`;
}

/* ===== ações ===== */
window.addEventListener("DOMContentLoaded", ()=>Object.assign(A, {
  async avalPedir(b){ const os = b.dataset.os, rows = state.ap.filter(e=>(e.os||"(sem nº)")===os), e0 = rows[rows.length-1] || {};
    const servico = e0.descricao || (os!=="(sem nº)" ? `OS ${os}` : "");
    const {data:t, error} = await sb.rpc("criar_avaliacao", {p_ref:{os, servico, cliente:empOf(e0)||"", data:e0.data||today()}});
    if(error || !t){ toast("Não consegui criar o link. Confira a internet."); return; }
    state.avals = null; closeModal(); toast("Link de avaliação criado. Escolha o cliente no WhatsApp."); window.open(`https://wa.me/?text=${encodeURIComponent(msgAval(t, servico))}`, "_blank", "noopener"); },
  avalReenviar(b){ const a = (state.avals||[]).find(x=>x.token===b.dataset.t); window.open(`https://wa.me/?text=${encodeURIComponent(msgAval(b.dataset.t, a?.ref?.servico))}`, "_blank", "noopener"); },
  galeriaPublicar(b){ galeriaForm(b.dataset.os); },
  async galeriaTirar(b){ if(!b.dataset.armed){ b.dataset.armed = "1"; b.textContent = "Toque de novo para tirar"; return; }
    const g = (state.galeria||[]).find(x=>x.id===b.dataset.id); const {error} = await sb.from("site_obras").delete().eq("id", b.dataset.id);
    if(error){ toast("Não consegui tirar."); return; }
    const paths = (g?.fotos||[]).map(u=>u.split("/object/public/site/")[1]).filter(Boolean); if(paths.length) sb.storage.from("site").remove(paths).catch(()=>{});
    state.galeria = state.galeria.filter(x=>x.id!==b.dataset.id); state.rendered = null; render(); toast("Tirado do site."); }
}));

/* ===== acessos ao app (só o responsável vê: Mais → Acessos ao app) ===== */
function dtBr(q){ const d = new Date(q); return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"}); }
function acessosHtml(ls){
  const porPessoa = {};
  (ls||[]).forEach(a=>{ const k = a.user_id; (porPessoa[k] = porPessoa[k] || {nome:a.nome||a.usuario||"—", usuario:a.usuario||"", itens:[]}).itens.push(a); });
  const pessoas = Object.values(porPessoa).sort((a,b)=> new Date(b.itens[0].quando) - new Date(a.itens[0].quando));
  if(!pessoas.length) return `<p class="muted">Nenhum acesso registrado ainda. (Os acessos são gravados a partir de agora, quando cada pessoa abre o app.)</p>`;
  return pessoas.map(p=>{
    const ult = p.itens[0], hoje = p.itens.filter(x=> new Date(x.quando).toDateString()===new Date().toDateString()).length;
    const dias = new Set(p.itens.map(x=> new Date(x.quando).toDateString())).size;
    return `<section class="panel" style="margin-bottom:10px"><div class="row" style="justify-content:space-between;align-items:baseline"><b>${esc(p.nome)}</b><span class="muted">${p.usuario?"@"+esc(p.usuario):""}</span></div>
      <p class="muted" style="margin:4px 0 8px">Último acesso: <b>${dtBr(ult.quando)}</b> · ${esc(ult.aparelho||"")} · ${p.itens.length} acesso(s) em ${dias} dia(s)${hoje?` · ${hoje} hoje`:""}</p>
      <details><summary class="muted" style="cursor:pointer">Ver todos os acessos</summary>
        <div class="list" style="margin-top:8px">${p.itens.map(x=>`<div class="item" style="cursor:default"><span class="mono">${dtBr(x.quando)}</span><span class="muted">${esc(x.aparelho||"")}</span><span></span></div>`).join("")}</div>
      </details></section>`;
  }).join("");
}
async function abrirAcessos(){
  if(state.worker) return;
  openModal(`<header><h2>Acessos ao app</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
    <p class="muted" style="margin:0 0 8px">Quem abriu o app e quando (últimos 90 dias). Só o responsável vê isto.</p>
    <div id="acessos-corpo"><p class="muted">Carregando…</p></div>`);
  const {data, error} = await sb.rpc("acessos_recentes", {p_dias:90});
  const box = document.getElementById("acessos-corpo"); if(!box) return;
  box.innerHTML = error ? `<p class="muted">Não consegui carregar. Confira a internet.</p>` : acessosHtml(data);
}
function checarHashAcessos(){ if(location.hash==="#log-acessos"){ history.replaceState(null, "", location.pathname); abrirAcessos(); } }
window.addEventListener("hashchange", checarHashAcessos);
window.addEventListener("DOMContentLoaded", checarHashAcessos);

/* grava o acesso ao app (no máx. 1x a cada 30 min por aparelho) */
function aparelhoTxt(){
  const u = navigator.userAgent || "";
  const so = /iPhone/.test(u)?"iPhone":/iPad/.test(u)?"iPad":/Android/.test(u)?"Android":/Macintosh|Mac OS/.test(u)?"Mac":/Windows/.test(u)?"Windows":/Linux/.test(u)?"Linux":"Aparelho";
  const nv = /CriOS|Chrome/.test(u)?"Chrome":/FxiOS|Firefox/.test(u)?"Firefox":/Edg/.test(u)?"Edge":/Safari/.test(u)?"Safari":"";
  return [so, nv].filter(Boolean).join(" · ");
}
function registrarAcesso(uid){
  try{ const k = "gaap-ac-" + (uid||""), t = +(localStorage.getItem(k)||0); if(Date.now()-t < 1800000) return; localStorage.setItem(k, Date.now()); }catch(e){}
  if(navigator.onLine) sb.rpc("registrar_acesso", {p_aparelho: aparelhoTxt()}).catch(()=>{});
}
sb.auth.onAuthStateChange((ev, s)=>{ if((ev==="SIGNED_IN" || ev==="INITIAL_SESSION") && s?.user?.id) registrarAcesso(s.user.id); });
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden && typeof session!=="undefined" && session?.user?.id) registrarAcesso(session.user.id); });

/* ===== contatos do site (leads do formulário da página inicial) ===== */
async function carregarLeads(){ const {data, error} = await sb.rpc("leads_recentes", {p_dias:120}); state.leads = error ? [] : (data||[]); if(state.view==="contatos"){ state.rendered = null; render(); } }
function leadWa(tel){ const n = String(tel||"").replace(/\D/g,""); if(n.length < 10) return ""; return "https://wa.me/" + (n.startsWith("55") ? n : "55"+n); }
function vContatos(){
  if(!state.leads){ setTimeout(carregarLeads, 0); return `<div class="pagehead"><div><span class="eyebrow">Site</span><h1>Contatos do site</h1></div><button class="btn" data-act="nav" data-view="mais">‹ Mais</button></div><p class="muted">Carregando…</p>`; }
  const ls = state.leads, novos = ls.filter(l=>!l.visto).length;
  return `<div class="pagehead"><div><span class="eyebrow">Site</span><h1>Contatos do site</h1><p class="muted">Pedidos de orçamento que chegaram pela página inicial.${novos?` <b>${novos} novo(s)</b>.`:""}</p></div><button class="btn" data-act="nav" data-view="mais">‹ Mais</button></div>
  ${ls.length? `<div class="list">`+ls.map(l=>{ const wa = leadWa(l.telefone);
    return `<div class="item" style="cursor:default;align-items:start">
      <span>${l.visto?"":"🟢"}</span>
      <span><b>${esc(l.nome||"Sem nome")}</b>${l.servico?` · ${esc(l.servico)}`:""}<br>
        <small class="muted">${dtBr(l.criado_em)}${l.telefone?` · ${esc(l.telefone)}`:" · sem telefone"}</small>
        ${l.descricao?`<br><span class="muted">${esc(l.descricao)}</span>`:""}</span>
      <span class="row" style="flex-direction:column;gap:6px;align-items:stretch">
        ${wa?`<a class="btn sm primary" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>`:""}
        <button class="btn sm" data-act="leadVisto" data-id="${esc(l.id)}" data-v="${l.visto?0:1}">${l.visto?"Reabrir":"✓ Atendido"}</button>
      </span></div>`; }).join("")+`</div>`
  : `<section class="panel"><p class="muted" style="margin:0">Nenhum contato pelo site ainda. Quando alguém preencher o formulário da página inicial, aparece aqui.</p></section>`}`;
}
window.addEventListener("DOMContentLoaded", ()=>Object.assign(A, {
  acessosAbrir(){ abrirAcessos(); },
  async leadVisto(b){ const v = b.dataset.v==="1"; await sb.rpc("lead_visto", {p_id:b.dataset.id, p_visto:v}).catch(()=>{}); const l=(state.leads||[]).find(x=>x.id===b.dataset.id); if(l) l.visto = v; state.rendered = null; render(); }
}));

/* ===== nota fiscal: ponto de entrada único (fechamento ou avulsa) ===== */
function nfAvulsaModal(){
  const E = state.cfg.empresa, iss = numIn(E.issPct);
  openModal(`<header><h2>Nota fiscal avulsa</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <form class="form" id="nfAvForm">
    <p class="muted" style="margin:0">1. Toque em <b>Abrir Emissor Nacional</b>, entre com o gov.br ou o certificado da empresa e escolha <b>Emitir NFS-e</b>. 2. Copie cada campo abaixo.</p>
    <button type="button" class="btn primary" data-act="nfEmissor">🧾 Abrir Emissor Nacional</button>
    <div class="grid2">
      <label class="field"><span>Tomador · CNPJ/CPF</span><span class="row" style="flex-wrap:nowrap"><input id="nv-cnpj"><button type="button" class="btn sm" data-act="nvCopia" data-f="nv-cnpj">Copiar</button></span></label>
      <label class="field"><span>Tomador · nome / razão social</span><span class="row" style="flex-wrap:nowrap"><input id="nv-razao"><button type="button" class="btn sm" data-act="nvCopia" data-f="nv-razao">Copiar</button></span></label>
      <label class="field"><span>Valor do serviço (R$)</span><span class="row" style="flex-wrap:nowrap"><input id="nv-valor" inputmode="decimal"><button type="button" class="btn sm" data-act="nvCopia" data-f="nv-valor">Copiar</button></span></label>
      <label class="field"><span>Código de tributação nacional</span><span class="row" style="flex-wrap:nowrap"><input id="nv-ctrib" value="${esc(E.cTribNac||"")}" placeholder="Ajustes → Minha empresa"><button type="button" class="btn sm" data-act="nvCopia" data-f="nv-ctrib">Copiar</button></span></label>
    </div>
    ${iss?`<p class="muted" style="margin:0">ISS ${String(iss).replace(".",",")}% · item LC 116: ${esc(E.codServico||"")}</p>`:""}
    <label class="field"><span>Descrição do serviço</span><textarea id="nv-desc" rows="5">${esc(descServ()+".")}</textarea></label>
    <button type="button" class="btn" data-act="nvCopia" data-f="nv-desc">Copiar descrição</button>
    <p class="muted" style="margin:0">Nota avulsa: guarde o PDF/XML no seu e-mail ou no Drive. Para guardar no app, emita pela nota de um fechamento.</p>
  </form>`);
}
window.addEventListener("DOMContentLoaded", ()=>Object.assign(A, {
  nfMenu(){
    const fs = state.fech.filter(f=>!f.nf?.numero || f.nf.status==="emitir").sort((a,b)=>(b.ate||"").localeCompare(a.ate||"")).slice(0,8);
    openModal(`<header><h2>Emitir nota fiscal</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
    <p class="muted" style="margin-top:0">Escolha de onde vem a nota. O app prepara os campos para copiar no Emissor Nacional (gov.br).</p>
    <h3 style="margin:10px 0 6px">Fechamentos sem nota</h3>
    ${fs.length?`<div class="list">${fs.map(f=>`<button class="item" data-act="fechNF" data-id="${esc(f.id)}"><span><b>${esc(f.numero)}</b> · ${esc(f.empresa||"")}<br><small class="muted">${fdate(f.de)} a ${fdate(f.ate)}</small></span><span class="mono">${brl(+f.valor||0)}</span></button>`).join("")}</div>`
      :`<p class="muted">Nenhum fechamento pendente. Os fechamentos são criados em <b>Relatórios → Fechar período</b>.</p>`}
    <footer><button class="btn" data-act="nfAvulsa">Nota avulsa (outro serviço)</button></footer>`); },
  nfAvulsa(){ nfAvulsaModal(); },
  nvCopia(b){ const el = document.getElementById(b.dataset.f); if(el) copyText(el.value); }
}));

/* ===== contas por usuário: nova senha (responsável) e e-mail de recuperação ===== */
window.addEventListener("DOMContentLoaded", ()=>Object.assign(A, {
  async perfilSenha(b){ const p = state.perfis.find(x=>x.user_id===b.dataset.uid); const nova = prompt(`Nova senha para ${p ? loginDe(p.email) : "este usuário"} (mínimo 6 caracteres):`); if(!nova) return;
    if(nova.length < 6){ toast("A senha precisa ter pelo menos 6 caracteres."); return; }
    const {data, error} = await sb.functions.invoke("conta", {body:{acao:"senha", alvo:b.dataset.uid, senha:nova}});
    toast(data?.ok ? "Senha trocada. Passe a nova senha para a pessoa." : (data?.erro || (error ? "Sem conexão." : "Não consegui trocar a senha."))); },
  async meuEmail(){ const e = ($("#meu-email")?.value||"").trim(); if(!e){ toast("Informe o e-mail."); return; }
    const {data, error} = await sb.functions.invoke("conta", {body:{acao:"email", email:e}});
    toast(data?.ok ? "E-mail de recuperação salvo." : (data?.erro || (error ? "Sem conexão." : "Não consegui salvar."))); }
}));

window.addEventListener("DOMContentLoaded", ()=>Object.assign(A, {
  async perfilEmail(b){ const p = state.perfis.find(x=>x.user_id===b.dataset.uid); const atual = p && !/@usuarios\.gaap-gestao\.app$/.test(p.email) ? p.email.replace(/\+[^@]*@/, "@") : "";
    const e = prompt(`E-mail de recuperação de ${p ? loginDe(p.email).split(" · ")[0] : "este usuário"} (pode ser o mesmo de outras pessoas):`, atual); if(!e) return;
    const {data, error} = await sb.functions.invoke("conta", {body:{acao:"email", alvo:b.dataset.uid, email:e.trim()}});
    if(data?.ok){ if(p) p.email = data.email; state.rendered = null; render(); toast("E-mail de recuperação salvo."); } else toast(data?.erro || (error ? "Sem conexão." : "Não consegui salvar.")); },
  async emailTodos(){ const e = prompt("E-mail de recuperação para toda a equipe (os links de nova senha chegam nele):"); if(!e) return;
    const alvos = state.perfis.filter(p=>p.user_id!==session?.user?.id); let ok = 0, falha = "";
    for(const p of alvos){ const {data} = await sb.functions.invoke("conta", {body:{acao:"email", alvo:p.user_id, email:e.trim()}}); if(data?.ok){ ok++; p.email = data.email; } else falha = data?.erro || "falhou"; }
    state.rendered = null; render(); toast(`${ok} de ${alvos.length} conta(s) atualizada(s).${falha?` Erro: ${falha}`:""}`); }
}));
