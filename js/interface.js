"use strict";
/* ---------- toast & modal ---------- */
let tt;
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.hidden=false; clearTimeout(tt); tt=setTimeout(()=>t.hidden=true, 3200); }
function toastAcao(msg, label, fn){ const t=$("#toast"); t.innerHTML = `<span>${esc(msg)}</span> <button type="button" class="btn sm" id="toast-acao">${esc(label)}</button>`; t.hidden=false; clearTimeout(tt);
  $("#toast-acao").onclick = async ()=>{ t.hidden = true; try{ await fn(); }catch(err){ toast(writeErr(err)); } }; tt=setTimeout(()=>t.hidden=true, 8000); }
function openModal(html, cls){ state.modalDirty = false; state.closeArmed = 0; const m=$("#modal"); voltar.empilhar("modal"); m.innerHTML=`<div class="sheet ${cls||""}" role="dialog" aria-modal="true">${html}</div>`; m.hidden=false; const f=m.querySelector("input,select,textarea"); if(f && window.innerWidth>700) f.focus(); }
function closeModal(){ const m=$("#modal"); const estava = !m.hidden; m.hidden=true; m.innerHTML=""; if(estava) voltar.desempilhar("modal"); state.apIds = null; state.modalDirty = false; if(state.renderPend){ state.renderPend = false; scheduleRender(); } }
function tryCloseModal(){
  if(state.modalDirty && Date.now() - (state.closeArmed||0) > 4000){ state.closeArmed = Date.now(); toast("Há dados não salvos. Toque fora de novo para descartar."); return; }
  if($("#dayForm")) rascunho.limpar();
  closeModal();
}
$("#modal").addEventListener("click", e=>{ if(e.target.id==="modal") tryCloseModal(); });
/* botão Voltar do Android (e gesto de voltar): fecha a foto, depois a janela, depois volta ao Painel; só então sai do app */
const voltar = {
  ignorar: 0,
  empilhar(tipo){ if(history.state?.gaap!==tipo){ try{ history.pushState({gaap:tipo}, ""); }catch(e){} } },
  desempilhar(tipo){ if(history.state?.gaap===tipo){ this.ignorar++; history.back(); } },
  ajustar(){ // depois de um "voltar" nosso, garante a entrada certa para o que ficou aberto
    const foto = $("#fotoview") && !$("#fotoview").hidden;
    if(foto) this.empilhar("foto"); else if(!$("#modal").hidden) this.empilhar("modal"); else if(!["painel","worker"].includes(state.view)) this.empilhar("tela"); }
};
window.addEventListener("popstate", ()=>{
  if(voltar.ignorar){ voltar.ignorar--; voltar.ajustar(); return; }
  const fv = $("#fotoview");
  if(fv && !fv.hidden){ fv.hidden = true; fv.innerHTML = ""; voltar.ajustar(); return; }
  if(!$("#modal").hidden){ tryCloseModal(); if(!$("#modal").hidden) voltar.empilhar("modal"); else voltar.ajustar(); return; }
  if(state.ready && !state.worker && state.view!=="painel"){
    if(state.view==="ajustes" && state.cfgDirty){ toast("Há alterações não salvas em Ajustes. Toque em Salvar ajustes, ou volte de novo para sair sem salvar."); state.cfgDirty = false; voltar.empilhar("tela"); return; }
    if(state.view==="orcEdit" && state.orcDirty){ toast("Há alterações não salvas no orçamento. Volte de novo para sair sem salvar."); state.orcDirty = false; voltar.empilhar("tela"); return; }
    state.view = "painel"; state.rendered = null; render(); window.scrollTo(0,0);
  }
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && !$("#modal").hidden) tryCloseModal(); });
document.addEventListener("input", e=>{ if(e.target.closest("#apForm,#dayForm,#fechForm,#recForm,#despForm")) state.modalDirty = true;
  if(e.target.closest("#cfgForm")){ state.cfgDirty = true; const a = $("#cfg-aviso"); if(a) a.hidden = false; } });
const rascunho = {
  key(){ return "gaap-rascunho-dia-" + (session?.user?.id || ""); },
  salvar(){ try{ const d = state.day; if($("#dayForm") && d && d.rows.some(r=>r.os||r.desc||r.fim)) localStorage.setItem(this.key(), JSON.stringify(d)); }catch(err){} },
  ler(){ try{ return JSON.parse(localStorage.getItem(this.key())||"null"); }catch(err){ return null; } },
  limpar(){ clearTimeout(state.rascT); try{ localStorage.removeItem(this.key()); }catch(err){} }
};
window.addEventListener("pagehide", ()=>{ if($("#dayForm")) rascunho.salvar(); });

/* ---------- nav ---------- */
const ICONS = {
  mais:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  painel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/></svg>',
  horas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  relatorios:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>',
  orcamentos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h10"/><rect x="2" y="3" width="20" height="18" rx="2"/></svg>',
  financeiro:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 6.5c-1-1.5-3-2-5-2-2.5 0-4.5 1.2-4.5 3.3 0 4.7 9.5 2.4 9.5 7.2 0 2.2-2.2 3.5-5 3.5-2.2 0-4.3-.8-5.3-2.5"/></svg>'
};
const NAV = [["painel","Painel"],["horas","Horas"],["relatorios","Relatórios"],["orcamentos","Orçamentos"],["financeiro","Financeiro"],["mais","Mais"]];
const MAIS_VIEWS = ["mais","equipe","equipamentos","escala","atividade","ajuda"];
function renderNav(){
  if(state.worker){ $("#tabbar").hidden = true; $("#railnav").innerHTML = ""; const g=document.querySelector('.topbar [data-view="ajustes"]'); if(g) g.hidden = true; return; }
  const cur = state.view==="orcEdit" ? "orcamentos" : MAIS_VIEWS.includes(state.view) ? "mais" : state.view;
  const html = NAV.map(([k,l])=>`<button class="navbtn" data-act="nav" data-view="${k}" ${cur===k?'aria-current="page"':""}>${ICONS[k]}<span>${l}</span></button>`).join("");
  $("#tabbar").innerHTML = html; $("#railnav").innerHTML = html;
}

/* ---------- render ---------- */
function render(){
  renderNav();
  const v = $("#view");
  if(!state.ready){ v.innerHTML = `<div class="loading">Carregando seus dados…</div>`; return; }
  if(!sessOk()){ document.body.classList.add("locked"); v.innerHTML = vLogin(); state.rendered = "login"; const f = $("#lg-email") || $("#lg-senha"); if(f && window.innerWidth>700) f.focus(); return; }
  document.body.classList.remove("locked");
  const fn = state.worker ? (state.view==="ajuda" ? vAjuda : state.view==="carteira" ? vCarteira : vWorker) : ({carteira:vCarteira, painel:vPainel, horas:vHoras, relatorios:vRelatorios, orcamentos:vOrcamentos, orcEdit:vOrcEdit, financeiro:vFinanceiro, ajustes:vAjustes, mais:vMais, ajuda:vAjuda, escala:vEscala, atividade:vAtividade, equipe:vEquipe, equipamentos:vEquipamentos}[state.view] || vPainel);
  try{ v.innerHTML = cronoBar() + fn(); }
  catch(err){ console.error(err); v.innerHTML = `<div class="empty"><b>Não consegui mostrar esta tela.</b>Algum registro está com dado inválido. Toque em Atualizar; se continuar, me avise.<div class="row" style="justify-content:center;margin-top:10px"><button class="btn primary" data-act="recarregar">Atualizar</button></div></div>`; }
  state.rendered = state.view; document.body.dataset.ajaba = state.view==="ajustes" ? (state.ajAba||"valores") : "";
  if(state.view==="painel") drawChart();
  if(state.view==="relatorios") renderReport();
}
function exampleBanner(){
  if(state.worker) return "";
  const pend = state.perfis.filter(p=>p.papel==="pendente").length;
  const bk = state.cfg.backupBaixadoEm, velho = state.ap.length >= 5 && (!bk || Date.now() - new Date(bk).getTime() > 7*86400000);
  const aviso = (pend && state.view!=="painel" ? `<div class="banner aprov-mini"><span>${pend===1 ? "1 pedido de cadastro aguardando sua aprovação." : `${pend} pedidos de cadastro aguardando sua aprovação.`}</span><button class="btn sm primary" data-act="nav" data-view="painel">Aprovar</button></div>` : "")
    + (velho ? `<div class="banner"><span>${bk ? "Faz mais de uma semana que você não baixa" : "Você ainda não baixou"} uma cópia completa dos dados e fotos. Leva um minuto.</span><button class="btn sm" data-act="irBackup">Fazer backup</button></div>` : "");
  const n = state.ap.filter(x=>x.exemplo).length + state.orc.filter(x=>x.exemplo).length + state.rec.filter(x=>x.exemplo).length;
  if(!n) return aviso;
  return aviso + `<div class="banner"><span>Estes são dados de exemplo para você ver o sistema funcionando (${n} registros marcados como exemplo).</span><button class="btn sm" data-act="clearExamples">Apagar exemplos</button></div>`;
}
function monthNav(){ return `<div class="monthnav"><button data-act="month" data-d="-1" aria-label="Mês anterior">‹</button><span>${ymLabel(state.month)}</span><button data-act="month" data-d="1" aria-label="Próximo mês">›</button></div>`; }
function bucketChips(c){
  const out=[]; if(c.n) out.push(`<span class="pill"><i class="dot d-n"></i>${fh(c.n)} normal</span>`);
  if(c.e50) out.push(`<span class="pill"><i class="dot d-50"></i>${fh(c.e50)} extra ${pct50()}</span>`);
  if(c.e100) out.push(`<span class="pill"><i class="dot d-100"></i>${fh(c.e100)} extra ${pct100()}</span>`);
  return out.join("");
}
/* ---------- fechamentos, fotos e orçamentos ligados ---------- */
const money = v => state.worker ? "" : brl(v);
function fechList(){ return state.worker ? (state.pub?.fechados||[]) : state.fech; }
const chaveEmp = x => String(x||"").trim().toLowerCase();
function lockOf(data, emp, prof){ return fechList().find(f=>data>=f.de && data<=f.ate && (!f.empresa || chaveEmp(f.empresa)===chaveEmp(emp)) && (!f.profissional || !prof || f.profissional===prof)); }
const lockedE = e => lockOf(e.data, empOf(e), e.profissional);
const lockMsg = f => state.worker ? `Esse período já foi fechado (${f.numero||""}). Fale com o responsável para alterar.` : `Período fechado (${f.numero||""}). Para alterar, reabra o fechamento no Financeiro.`;
function orcOpts(){ return state.worker ? (state.pub?.orcs||[]) : state.orc.filter(orcAberto).map(o=>({id:o.id, numero:o.numero||"", titulo:o.titulo||"", cliente:o.cliente?.nome||""})); }
function orcNum(id){ const o = orcOpts().find(x=>x.id===id) || state.orc.find(x=>x.id===id); return o ? (o.numero||"") : ""; }
const eqList = () => (state.worker ? (state.pub?.equipamentos||[]) : state.cfg.preventivas ? state.eq.filter(x=>!x.inativo) : []).slice().sort((a,b)=>(a.tag||"").localeCompare(b.tag||""));
const eqDe = id => (state.worker ? (state.pub?.equipamentos||[]) : state.eq).find(x=>x.id===id);
function eqSelect(attr, equipId, prevId){
  const ls = eqList(); if(!ls.length) return "";
  const cur = equipId ? `${equipId}|${prevId||""}` : "";
  return `<label class="field"><span>Equipamento / preventiva (opcional)</span><select ${attr}><option value="">—</option>${ls.map(q=>`<option value="${esc(q.id)}|" ${cur===`${q.id}|`?"selected":""}>${esc(q.tag||"")} ${esc(q.nome||"")}</option>${(q.plano||[]).map(pl=>`<option value="${esc(q.id)}|${esc(pl.id)}" ${cur===`${q.id}|${pl.id}`?"selected":""}>&nbsp;&nbsp;↳ preventiva: ${esc(pl.atividade||"")}</option>`).join("")}`).join("")}</select></label>`;
}
const eqSplit = v => { const [a,b] = String(v||"").split("|"); return {equipId:a||undefined, prevId:b||undefined}; };
function orcSelect(id, cur){
  const os = orcOpts(); if(!os.length && !cur) return "";
  return `<label class="field"><span>Serviço de orçamento (empreitada)</span><select id="${id}"><option value="">Não, horas do contrato</option>${os.map(o=>`<option value="${esc(o.id)}" ${o.id===cur?"selected":""}>${esc(o.numero)} · ${esc(o.cliente)} · ${esc(o.titulo)}</option>`).join("")}</select></label>`;
}
const assetUrls = {};
const PIX = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const blobSrc = id => assetUrls[id] || PIX;
const EXIFR = "https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/lite.umd.js";
async function dataDaFoto(file){
  try{ if(!window.exifr) await loadScript(EXIFR); const x = await window.exifr.parse(file, ["DateTimeOriginal","CreateDate"]); const d = x && (x.DateTimeOriginal || x.CreateDate); if(d instanceof Date && !isNaN(d)) return d; }catch(err){}
  return new Date(file.lastModified || Date.now());
}
const TIPO_FOTO = {antes:"ANTES", durante:"", depois:"DEPOIS", assinatura:"ASSINATURA"};
async function compressImage(file, stamp){
  try{
    const url = URL.createObjectURL(file);
    const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
    const k = Math.min(1, 1280/Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth*k); c.height = Math.round(img.naturalHeight*k);
    const g = c.getContext("2d"); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    if(stamp){ const fs = Math.max(10, Math.round(c.width/42)), mg = Math.round(fs*0.6), maxW = c.width - mg*2;
      g.font = `600 ${fs}px Arial, sans-serif`;
      const partes = stamp.split(" · "), linhas = [""];
      partes.forEach(pt=>{ const cand = linhas[linhas.length-1] ? linhas[linhas.length-1] + " · " + pt : pt; if(g.measureText(cand).width <= maxW || !linhas[linhas.length-1]) linhas[linhas.length-1] = cand; else linhas.push(pt); });
      const lh = Math.round(fs*1.25), h = lh*linhas.length + mg*2;
      g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, c.height-h, c.width, h);
      g.fillStyle = "#fff"; g.textBaseline = "top";
      linhas.forEach((l,i)=>{ let t = l; while(g.measureText(t).width > maxW && t.length > 4) t = t.slice(0,-2); g.fillText(t===l?t:t+"…", mg, c.height - h + mg + i*lh); }); }
    const b = await new Promise(res=>c.toBlob(res, "image/jpeg", 0.7));
    return b || file;
  }catch(e){ return file; }
}
function photoErr(err){ const c = err && err.code; if(/quota|exceed|limit|storage/i.test(err?.message||"") && c!=="too_large") return "Espaço para fotos do plano gratuito esgotado. Baixe um backup completo e fale com o responsável."; return c==="quota_or_state" ? "Espaço para fotos esgotado. Apague fotos antigas." : c==="too_large" ? "Foto muito grande." : c==="unsupported_type" ? "Formato de imagem não aceito. Use JPG ou PNG." : c==="rate_limited" ? "Muitas fotos de uma vez. Espere um pouco e tente de novo." : "Não consegui enviar a foto. Verifique a conexão."; }
function enviandoFotos(delta){
  state.enviando = Math.max(0, (state.enviando||0) + delta);
  document.querySelectorAll("#d-save,#apForm [type=submit],#despForm [type=submit]").forEach(b=>{ if(state.enviando){ b.dataset.txt ||= b.textContent; b.disabled = true; b.textContent = "Enviando fotos…"; } else if(b.dataset.txt){ b.disabled = false; b.textContent = b.dataset.txt; delete b.dataset.txt; } });
}
async function uploadPhotos(files, ctx){
  if(!assets){ toast("Fotos indisponíveis nesta visualização."); return []; }
  enviandoFotos(+1); try{ return await uploadPhotosInt(files, ctx); } finally { enviandoFotos(-1); if(state.day) updateDay(); }
}
async function uploadPhotosInt(files, ctx){
  const ids = [], ok = ["image/jpeg","image/png","image/webp","image/gif"];
  for(const f of files){
    try{ toast(`Enviando foto ${ids.length+1} de ${files.length}…`);
      let stamp = "", em = null;
      if(ctx){ em = await dataDaFoto(f); const dt = `${em.toLocaleDateString("pt-BR")} ${pad(em.getHours())}:${pad(em.getMinutes())}`;
        if(state.cfg.carimbo!==false && ctx.tipo!=="assinatura") stamp = [TIPO_FOTO[ctx.tipo]||"", ctx.os?`OS ${ctx.os}`:"", ctx.unid||"", dt].filter(Boolean).join(" · "); }
      const b = await compressImage(f, stamp); const r = await assets.upload(b, {type: ok.includes(b.type) ? b.type : "image/jpeg"}); assetUrls[r.id] = r.url; ids.push(r.id); if(ctx) (state.fotoMetaNovo ||= {})[r.id] = {tipo:ctx.tipo||"durante", em: em ? em.toISOString() : "", ...(ctx.nome?{nome:ctx.nome}:{})}; }
    catch(err){ toast(photoErr(err)); break; }
  }
  if(ids.length) toast(`${ids.length} foto${ids.length>1?"s":""} adicionada${ids.length>1?"s":""}`);
  return ids;
}
function deleteAssetIfUnused(id, except=[]){ if(!assets || !id) return; if(state.ap.some(e=>!except.includes(e.id) && (e.fotos||[]).includes(id)) || state.ord.some(o=>o.foto===id)) return; assets.delete(id).catch(()=>{}); }
function fotoTipo(id){ const m = state.fotoMetaNovo?.[id] || state.ap.find(e=>e.fotoMeta && e.fotoMeta[id])?.fotoMeta[id]; return m && TIPO_FOTO[m.tipo] ? TIPO_FOTO[m.tipo] : ""; }
function thumbs(ids, removable){ return (ids||[]).map(id=>`<span class="thumb">${fotoTipo(id)?`<i class="thumbtag">${fotoTipo(id)}</i>`:""}<img src="${esc(blobSrc(id))}" data-fid="${esc(id)}" alt="Foto do serviço" data-act="fotoVer" data-id="${esc(id)}" loading="lazy">${removable?`<button type="button" class="thumbx" data-act="fotoDel" data-id="${esc(id)}" aria-label="Remover foto">✕</button>`:""}</span>`).join(""); }
document.addEventListener("change", async e=>{
  const t = e.target;
  if(t.id==="dp-foto" && t.files.length){ const ids = await uploadPhotos([...t.files]); state.dpFotos = [...(state.dpFotos||[]), ...ids]; const box=$("#dp-thumbs"); if(box) box.innerHTML = thumbs(state.dpFotos, false); t.value=""; }
  if(t.id==="dp-orc" && t.value){ const o = state.orc.find(x=>x.id===t.value); if(o?.cliente?.nome && $("#dp-emp")) $("#dp-emp").value = o.cliente.nome; }
  if(t.id==="dp-tipo"){ const k = t.value==="Km rodado"; $("#dp-km-w").hidden = !k; $("#dp-v-w").hidden = k; }
  if(/^f-foto/.test(t.id) && t.files.length){ const ids = await uploadPhotos([...t.files], {tipo:t.dataset.tipo||"durante", os:$("#f-os")?.value.trim(), unid:$("#f-cli")?.value.trim()}); state.apFotos = [...(state.apFotos||[]), ...ids]; const box=$("#f-thumbs"); if(box) box.innerHTML = thumbs(state.apFotos, true); t.value=""; }
  if(t.dataset && t.dataset.fotoRow!=null && t.files.length){ const i=+t.dataset.fotoRow, r=state.day.rows[i]; const ids = await uploadPhotos([...t.files], {tipo:t.dataset.tipo||"durante", os:r.os, unid:r.cli||state.day.unid}); r.fotoMeta = {...(r.fotoMeta||{}), ...Object.fromEntries(ids.map(id=>[id, state.fotoMetaNovo?.[id]]))}; r.fotos = [...(r.fotos||[]), ...ids]; renderDayRows(); updateDay(); const lb=document.querySelector(`label[for="d-foto-${i}"]`); if(lb) lb.textContent = `Fotos (${r.fotos.length})`; t.value=""; }
});
/* ---------- assinatura do responsável da unidade (desenhada com o dedo) ---------- */
function assinPad(row){
  document.getElementById("assinpad")?.remove();
  const el = document.createElement("div"); el.id = "assinpad"; el.className = "assinpad"; el.dataset.row = row==null ? "" : row;
  el.innerHTML = `<div class="assinbox"><h3 style="margin:0">Assinatura do responsável da unidade</h3>
    <div class="grid2"><label class="field"><span>Nome</span><input id="as-nome" maxlength="80" placeholder="Quem está assinando"></label><label class="field"><span>Cargo (opcional)</span><input id="as-cargo" maxlength="40" placeholder="Ex.: Supervisor"></label></div>
    <canvas id="as-cv" width="900" height="360" aria-label="Área para assinar"></canvas><p class="muted" style="margin:0;font-size:.85rem">Assine com o dedo no quadro acima. Confirmo que o serviço foi realizado.</p>
    <div class="row" style="justify-content:space-between"><button type="button" class="btn" data-act="assinLimpar">Limpar</button><span class="row"><button type="button" class="btn" data-act="assinFechar">Cancelar</button><button type="button" class="btn primary" data-act="assinOk">Confirmar assinatura</button></span></div></div>`;
  document.body.appendChild(el);
  const cv = el.querySelector("canvas"), g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0,0,cv.width,cv.height); g.lineWidth = 4; g.lineCap = g.lineJoin = "round"; g.strokeStyle = "#0d1f6b";
  let des = false; state.assinTracos = 0;
  const pt = ev => { const r = cv.getBoundingClientRect(); return [(ev.clientX-r.left)*cv.width/r.width, (ev.clientY-r.top)*cv.height/r.height]; };
  cv.addEventListener("pointerdown", ev=>{ des = true; cv.setPointerCapture(ev.pointerId); const [x,y] = pt(ev); g.beginPath(); g.moveTo(x,y); ev.preventDefault(); });
  cv.addEventListener("pointermove", ev=>{ if(!des) return; const [x,y] = pt(ev); g.lineTo(x,y); g.stroke(); state.assinTracos++; ev.preventDefault(); });
  ["pointerup","pointercancel","pointerleave"].forEach(t=>cv.addEventListener(t, ()=>{ des = false; }));
  setTimeout(()=>$("#as-nome")?.focus(), 50);
}
async function assinConfirmar(){
  const el = $("#assinpad"); if(!el) return; const nome = [$("#as-nome").value.trim(), $("#as-cargo").value.trim()].filter(Boolean).join(" - ");
  if(!$("#as-nome").value.trim()){ toast("Informe o nome de quem assina."); return; } if((state.assinTracos||0) < 8){ toast("Faça a assinatura no quadro."); return; }
  const cv = $("#as-cv"), g = cv.getContext("2d"); g.fillStyle = "#555"; g.font = "22px sans-serif"; g.fillText(`${nome} · ${new Date().toLocaleString("pt-BR")}`, 16, cv.height-14);
  const blob = await new Promise(ok=>cv.toBlob(ok, "image/png")), file = new File([blob], "assinatura.png", {type:"image/png"}), row = el.dataset.row;
  el.remove();
  if(row!==""){ const r = state.day.rows[+row]; const ids = await uploadPhotos([file], {tipo:"assinatura", os:r.os, unid:r.cli||state.day.unid, nome});
    r.fotoMeta = {...(r.fotoMeta||{}), ...Object.fromEntries(ids.map(id=>[id, state.fotoMetaNovo?.[id]]))}; r.fotos = [...(r.fotos||[]), ...ids]; renderDayRows(); updateDay(); }
  else { const ids = await uploadPhotos([file], {tipo:"assinatura", os:$("#f-os")?.value.trim(), unid:$("#f-cli")?.value.trim(), nome}); state.apFotos = [...(state.apFotos||[]), ...ids]; const box = $("#f-thumbs"); if(box) box.innerHTML = thumbs(state.apFotos, true); state.modalDirty = true; }
}
/* ---------- portal da contratante: retrato da medição publicado para o link só de leitura ---------- */
const portalEmps = () => state.worker ? [] : empresasCfg().filter(n=>ficha(n).portal);
function portalSnap(emp){
  const med = medicao(emp, 0) || [ym(today())+"-01", today()], [de, ate] = med, k = chaveEmp(emp), F = ficha(emp), r2 = v => Math.round(v*100)/100;
  const rows = state.ap.filter(e=>!e.orcId && e.data>=de && e.data<=ate && chaveEmp(empOf(e))===k && !e.exemplo).sort((a,b)=>(b.data+b.inicio).localeCompare(a.data+a.inicio));
  const fe = rows.filter(e=>!e.andamento), t = sumCalc(fe), uni = {};
  fe.forEach(e=>{ const u = e.cliente||""; const c = calc(e); (uni[u] ||= {unid:u, os:0, total:0, valor:0}); uni[u].os++; uni[u].total += c.total/60; uni[u].valor += c.valor; });
  const fechs = state.fech.filter(f=>chaveEmp(f.empresa||"")===k).sort((a,b)=>(b.ate||"").localeCompare(a.ate||"")).slice(0,12);
  return {de, ate, valores: F.portalValores!==false,
    tot:{os:fe.length, n:r2(t.n/60), e50:r2(t.e50/60), e100:r2(t.e100/60), total:r2(t.total/60), valor:F.portalValores!==false ? r2(t.valor) : 0, emerg:fe.filter(e=>e.emergencia).length, assin:fe.filter(assinOS).length},
    unidades: Object.values(uni).sort((a,b)=>b.total-a.total).map(u=>({unid:u.unid, os:u.os, total:r2(u.total), valor:F.portalValores!==false ? r2(u.valor) : 0})),
    os: rows.slice(0,400).map(e=>{ const c = calc(e), q = e.equipId && eqDe(e.equipId); return {data:e.data, os:e.os||"", tracos:e.tracos||"", unid:e.cliente||"", desc:e.descricao||"", prof:e.profissional||"", ini:e.inicio, fim:e.fim||"", alm:e.almIni&&e.almFim?`${e.almIni}–${e.almFim}`:"", horas:e.andamento?0:r2(c.total/60), emerg:!!e.emergencia, andamento:!!e.andamento, assin:assinOS(e), equip:q?`${q.tag||""} ${q.nome||""}`.trim():""}; }),
    fechs: fechs.map(f=>({numero:f.numero, de:f.de, ate:f.ate, prof:f.profissional||"", horas:r2((+f.horas||0)/60), valor:F.portalValores!==false ? +f.valor||0 : 0, pago:fechSaldo(f)<=0.005}))};
}
let portalT = null;
function portalAgendar(){ if(!state.ready || state.worker || !portalEmps().length) return; clearTimeout(portalT); portalT = setTimeout(portalPublicar, 4000); }
async function portalPublicar(){ for(const emp of portalEmps()){ try{ await sb.rpc("publicar_portal", {p_emp:emp, p_snap:portalSnap(emp)}); }catch(e){} } }
const portalUrl = t => `${location.origin}/portal#t=${t}`;
async function portalModal(emp){
  const F = ficha(emp); let tok = "";
  if(F.portal){ const {data} = await sb.rpc("criar_portal", {p_emp:emp}); tok = data || ""; }
  openModal(`<header><h2>Portal da ${esc(emp)}</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <div class="form"><p class="muted" style="margin:0">Um link só de leitura para a ${esc(emp)} acompanhar a medição ao vivo (OS, horas por unidade, assinaturas) e <b>abrir chamados de emergência</b> que chegam na hora no celular da equipe.</p>
  ${tok?`<label class="field"><span>Link do portal</span><input readonly value="${esc(portalUrl(tok))}" id="pt-link"></label>
    <label class="check"><input type="checkbox" id="pt-val" ${F.portalValores!==false?"checked":""} data-emp="${esc(emp)}"> Mostrar valores (R$) no portal</label>
    <div class="row"><button class="btn primary" data-act="portalZap" data-emp="${esc(emp)}">Enviar pelo WhatsApp</button><button class="btn" data-act="portalCopiar">Copiar link</button><a class="btn" href="${esc(portalUrl(tok))}" target="_blank" rel="noopener">Abrir</a></div>
    <div class="row"><button class="btn sm" data-act="portalTrocar" data-emp="${esc(emp)}">Gerar novo link (o antigo para de funcionar)</button><button class="btn sm danger" data-act="portalDesligar" data-emp="${esc(emp)}">Desligar portal</button></div>`
  :`<div class="row"><button class="btn primary" data-act="portalLigar" data-emp="${esc(emp)}">Ligar portal da ${esc(emp)}</button></div>`}</div>`);
}
async function portalSalvarFicha(emp, mud){ const c = clone(state.cfg); c.contratantes = {...(c.contratantes||{})}; c.contratantes[emp] = {...(c.contratantes[emp]||{}), ...mud}; await saveCfg(c); state.cfg = deepMerge(DEFAULT_CFG, c); }
/* ---------- chamados de emergência ---------- */
async function carregarChamados(){ if(!session || !state.ready) return; try{ const {data} = await sb.from("chamados").select("*").order("criado_em", {ascending:false}).limit(100); if(data){ const mudou = JSON.stringify(data.filter(c=>c.status==="aberto").map(c=>c.id)) !== JSON.stringify((state.chamados||[]).filter(c=>c.status==="aberto").map(c=>c.id)); state.chamados = data; if(mudou && $("#modal").hidden){ state.rendered = null; render(); } } }catch(e){} }
setInterval(()=>{ if(!document.hidden) carregarChamados(); }, 60000);
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) carregarChamados(); });
function chamadosHtml(){
  const ab = (state.chamados||[]).filter(c=>c.status==="aberto"); if(!ab.length) return "";
  const min = c => Math.max(0, Math.round((Date.now()-new Date(c.criado_em))/60000));
  return `<section class="aprovbox chamadobox" role="alert"><h2>🚨 ${ab.length===1?"Chamado de emergência aberto":`${ab.length} chamados de emergência abertos`}</h2>
  ${ab.map(c=>{ const d = c.data||{}; return `<div class="aprovcard"><div><b>${esc(c.empresa)}${d.unidade?` · ${esc(d.unidade)}`:""}</b>${d.parada?' <span class="pill bad">máquina parada</span>':""}<br>${esc(d.descricao||"")}${d.equipamento?`<br><small>Equipamento: ${esc(d.equipamento)}</small>`:""}<br><small>${d.nome?`${esc(d.nome)} `:""}${d.fone?`· <a href="tel:${esc(d.fone)}">${esc(d.fone)}</a> `:""}· há ${min(c)} min</small></div>
    <div class="row aprov-acts"><button class="btn primary" data-act="chamadoAtender" data-id="${esc(c.id)}">▶ Atender agora</button>${state.worker?"":`<button class="btn" data-act="chamadoCancelar" data-id="${esc(c.id)}">Cancelar</button>`}</div></div>`; }).join("")}</section>`;
}
function apItem(e, showDate, bad){
  const c = calc(e), lk = lockedE(e), nf = (e.fotos||[]).length;
  return `<button class="item" data-act="editAp" data-id="${esc(e.id)}">
    <span class="t">${showDate?`${fdate(e.data).slice(0,5)}<br>`:""}${esc(e.inicio)}–${e.andamento?"…":esc(e.fim)}${e.almIni&&e.almFim?`<br><small class="muted">alm. ${esc(e.almIni)}–${esc(e.almFim)}</small>`:""}</span>
    <span class="main"><b>${e.os?`OS ${esc(e.os)}`:"Sem nº de OS"}${e.tracos?` <span class="pill">TracOS ${esc(e.tracos)}</span>`:""}${e.andamento?' <span class="pill info">Em andamento</span>':""}${e.emergencia?' <span class="pill warn">Emergência</span>':""}${e.exemplo?' <span class="pill">Exemplo</span>':""}${e._pend?' <span class="pill warn" title="Será enviado quando a internet voltar">⏳ a enviar</span>':""}${e.geo && !state.worker?` <span class="pill" role="link" data-act="abrirMapa" data-lat="${esc(e.geo.lat)}" data-lng="${esc(e.geo.lng)}" title="Onde estava ao iniciar (precisão ${e.geo.acc||"?"} m)">📍 local</span>`:""}</b>
      <span class="sub">${esc(e.descricao||"")}</span>
      <span class="sub" style="display:block">${[empOf(e), e.cliente].filter(Boolean).map(esc).join(" · ")}</span>
      ${e.profissional && !state.worker?`<span class="sub" style="display:block"><b style="display:inline;font-weight:600;color:var(--fg)">${esc(e.profissional)}</b></span>`:""}
      <span class="chips">${bucketChips(c)}${e.orcId?`<span class="pill info">Orçamento ${esc(orcNum(e.orcId))}</span>`:""}${nf?`<span class="pill">${nf} foto${nf>1?"s":""}</span>`:""}${lk?`<span class="pill">Fechado ${esc(lk.numero||"")}</span>`:""}${e.lancadoPor==="funcionario"&&!state.worker?'<span class="pill">Lançado pelo funcionário</span>':""}${bad&&bad.has(e.id)?'<span class="pill bad">Horário sobreposto</span>':""}</span></span>
    <span class="val">${fh(c.total)}<br><span class="muted">${state.worker ? "" : c.orc ? "orçamento" : brl(c.valor)}</span></span></button>`;
}

/* ---------- dimensões: funcionário, unidade, empresa ---------- */
const ALL = "__all";
const empOf = e => e.empresa || state.cfg.contratante || "";
/* ---------- unidades por empresa (lista de cada contratante) ---------- */
// lista de OS colada pela contratante: "2217864;BOMBA DO REATOR;1001 - ANÁPOLIS" (ou separada por tabulação / " - ")
function osLista(emp){
  const out = new Map(), cs = emp ? [ficha(emp)] : Object.values(state.cfg.contratantes||{});
  cs.forEach(F=>lines(F && F.osLista).forEach(l=>{ let p = l.split(/\t|;/).map(x=>x.trim()); if(p.length<2){ const m = l.match(/^\s*(\d{4,})\s*[-–:]\s*(.*)$/); p = m ? [m[1], m[2]] : [l.trim()]; }
    const os = (p[0]||"").replace(/\D/g,""); if(os) out.set(os, {desc:p[1]||"", unid:p.slice(2).join(" - ")}); }));
  return out;
}
// ID do TracOS já usado antes nessa mesma OS (a OS pode durar vários dias)
function tracosDe(os){ os = String(os||"").trim(); if(!os) return ""; const e = [...state.ap].filter(x=>x.os===os && x.tracos).sort((a,b)=>(b.data||"").localeCompare(a.data||""))[0]; return e ? e.tracos : ""; }
const limpaTracos = v => String(v||"").replace(/[^\w.-]/g,"").slice(0,40);
// teclado aberto (campo de texto em foco, só em tela de toque): a classe "kb" esconde as barras que flutuam sobre a tela
const telaToque = () => matchMedia("(pointer: coarse)").matches;
document.addEventListener("focusin", e=>{ if(telaToque() && e.target.matches?.("input:not([type=checkbox]):not([type=radio]):not([type=file]),textarea,select")) document.body.classList.add("kb"); });
document.addEventListener("focusout", ()=>{ setTimeout(()=>{ if(!document.activeElement?.matches?.("input:not([type=checkbox]):not([type=radio]):not([type=file]),textarea,select")) document.body.classList.remove("kb"); }, 80); });
