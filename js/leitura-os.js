"use strict";
/* ---------- ler o papel da OS do TracOS (foto ou PDF): ID, nº da OS, título, nota SAP e unidade ---------- */
// Modelo do papel (impressão do TracOS/Tractian da Brejeiro):
//   "Ordem de Serviço: #22316"                       → ID do TracOS
//   Título "000002218080 - 000200186907 - VERIFICAR…" → nº da OS (sem zeros), nota SAP e título
//   Local Vinculado "1001_1011 - Armazém Farelo"      → centro 1001 = unidade "1001 - ANÁPOLIS"
const TESS = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
let tessWorker = null;
async function tesseract(){
  if(!window.Tesseract) await loadScript(TESS);
  return tessWorker ||= await window.Tesseract.createWorker("por", 1, {workerPath:"https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js", corePath:"https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1", langPath:"https://cdn.jsdelivr.net/npm/@tesseract.js-data/por@1.0.0/4.0.0_best_int"});
}
// prepara a foto: reduz para 1800px e passa para cinza; "sombra" também divide pelo fundo borrado (tira sombra e luz desigual)
async function prepFoto(file, modo){
  const img = await createImageBitmap(file), k = Math.min(1, 1800/Math.max(img.width, img.height)), W = Math.round(img.width*k), H = Math.round(img.height*k);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d", {willReadFrequently:true});
  if(modo!=="sombra"){ g.filter = "grayscale(1) contrast(1.4)"; g.drawImage(img, 0, 0, W, H); return cv; }
  g.filter = "grayscale(1)"; g.drawImage(img, 0, 0, W, H);
  const bg = document.createElement("canvas"); bg.width = W; bg.height = H; const gb = bg.getContext("2d", {willReadFrequently:true});
  gb.filter = `blur(${Math.round(Math.max(W, H)/60)}px)`; gb.drawImage(cv, 0, 0);
  const a = g.getImageData(0, 0, W, H), b = gb.getImageData(0, 0, W, H).data, d = a.data;
  for(let i = 0; i < d.length; i += 4){ const v = Math.min(255, Math.round(d[i] / Math.max(1, b[i]) * 235)); d[i] = d[i+1] = d[i+2] = v; }
  g.putImageData(a, 0, 0); return cv;
}
// modo "sombra" (2ª tentativa): também endireita a foto torta (rotateAuto). Na 1ª não, porque em foto de tela ele piora a leitura do ID
async function ocrImagem(file, modo){ const w = await tesseract(); const {data} = await w.recognize(await prepFoto(file, modo), modo==="sombra" ? {rotateAuto:true} : {}); return data.text || ""; }
// tamanho usual do ID (5 dígitos hoje), aprendido dos IDs já salvos: o "#" lido como dígito vira um dígito a mais
function tamIdTracos(){ const n = {}; state.ap.forEach(e=>{ const t = String(e.tracos||""); if(/^\d{3,8}$/.test(t)) n[t.length] = (n[t.length]||0)+1; });
  const best = Object.entries(n).sort((a,b)=>b[1]-a[1])[0]; return best && best[1] >= 3 ? +best[0] : 5; }
function lerTracos(txt, opt = {}){
  const norm = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const linhas = String(txt||"").split(/\r?\n/).map(l => l.trim()).filter(Boolean), N = linhas.map(norm);
  const r = {id:"", os:"", nota:"", titulo:"", centro:"", tituloFechado:false, conf:{id:0, os:0, titulo:0}};
  const L = opt.tamId || 5, fixaId = (pre, d) => { d = d.replace(/\s+/g, ""); if(pre!=="#" && d.length === L + 1) d = d.slice(1); return d; }; // o "#" lido como dígito vira um dígito a mais
  // ID no papel: número depois de "Ordem de Serviço:" (o "#" costuma virar 4, 1, %, H, * ou sumir)
  const iId = N.findIndex(l => /ordem\s*d[eo]\s*serv\S*\s*:?\s*[#%*h£¥&@$€]?\s*\d/.test(l) || /serv[il1]c?o\s*:\s*\S*\d/.test(l));
  if(iId >= 0){ const m = linhas[iId].replace(/^.*?serv\S*\s*:?/i, "").match(/^\s*([#%*H£¥&@$€]?)\s*(\d[\d ]{1,9}\d|\d)/);
    if(m){ r.id = fixaId(m[1], m[2]); r.conf.id = m[1]==="#" || r.id.length===L ? 0.9 : 0.6; } }
  // linha do título: nº da ordem (12 dígitos, zeros à esquerda) [- nota SAP] - texto; na tela o ID vem antes na mesma linha
  const reT = /(?:([#%*H£¥&@$€]?)\s*(\d{3,8})\s+)?(0{2,}\d[\d ]{3,12}\d)\s*[-–—~*•·+=]+\s*(?:(\d[\d ]{6,13}\d)\s*[-–—~*•·+=]+\s*)?(.+)$/;
  let iT = N.findIndex(l => /^t[i1l]tu[l1i]o\b/.test(l)), k0 = -1, mt = null;
  for(let k = (iT >= 0 ? iT + 1 : 0); k < linhas.length && k < (iT >= 0 ? iT + 4 : linhas.length); k++){ const m = linhas[k].match(reT); if(m){ mt = m; k0 = k; break; } }
  if(!mt && iT >= 0) for(let k = 0; k < linhas.length; k++){ const m = linhas[k].match(reT); if(m){ mt = m; k0 = k; break; } }
  if(mt){
    const n1 = mt[3].replace(/\s+/g, ""), v1 = n1.replace(/^0+/, "");
    // nota SAP (9 dígitos, "200…") no lugar da ordem: a ordem ficou ilegível (ex.: número selecionado na tela)
    if(!mt[4] && ehNota(v1)){ r.nota = v1; r.conf.os = 0; }
    else { r.os = v1; r.conf.os = n1.length === 12 ? 0.95 : 0.6; if(mt[4]) r.nota = mt[4].replace(/\s+/g, "").replace(/^0+/, ""); }
    if(!r.id){ const mi = linhas[k0].match(/^\s*([#%*H£¥&@$€]?)\s*(\d{3,8})\b/); if(mi && mi[2] !== n1){ r.id = fixaId(mi[1], mi[2]); r.conf.id = 0.7; } }
    if(!r.id && mt[2]){ r.id = fixaId(mt[1], mt[2]); r.conf.id = mt[1]==="#" || r.id.length===L ? 0.85 : 0.6; }
    // texto: corta no lixo da tela (botões em minúsculas como "Editar") e junta as linhas de continuação (título quebrado)
    let partes = [cortaLixo(mt[5])], fechado = /[.,]\s*(\S{1,6})?\s*$/.test(mt[5].trim());
    for(let k = k0 + 1; k < linhas.length && k <= k0 + 4; k++){
      if(linhas[k].replace(/[^A-Za-zÀ-ÿ]/g, "").length < 4 || !/[A-ZÀ-Ú]{3,}/.test(linhas[k]) && !/[a-zà-ÿ]{4,}/.test(linhas[k])) continue; // lixo da foto (moiré) entre as linhas do título
      if(/\b(status|respons\S*|prioridade|categoria|local|em aberto)\b/.test(N[k]) || !continuacao(linhas[k])) break;
      partes.push(cortaLixo(linhas[k])); fechado = /[.,]\s*$/.test(linhas[k]);
    }
    r.titulo = limparTitulo(partes.join(" ")); r.conf.titulo = r.titulo.length >= 6 ? 0.85 : 0.4; r.tituloFechado = fechado || partes.length > 1;
  } else { const z = String(txt).replace(/(\d) (\d)/g, "$1$2").match(/\b0{3,}\d{5,9}\b/); if(z){ r.os = z[0].replace(/^0+/, ""); r.conf.os = 0.5; } }
  // nº da OS ainda vazio: "00000" + 7 dígitos em outro lugar, ou a busca na barra de endereço ("search=2207968")
  if(!r.os){ const t = String(txt).replace(/(\d) (\d)/g, "$1$2"), m = t.match(/search=(\d{5,9})\b/i) || [...t.matchAll(/\b0{3,}(\d{5,9})\b/g)].find(x=>!ehNota(x[1]));
    if(m){ r.os = m[1]; r.conf.os = 0.5; } }
  // ID ainda vazio: "#NNNNN" solto (tela)
  if(!r.id){ const m = String(txt).match(/(?:^|\s)#\s?(\d{3,8})\b/); if(m){ r.id = m[1]; r.conf.id = 0.7; } }
  // Unidade: centro do "Local Vinculado"/"Nome"/"Local" (o "_" costuma virar "." ou espaço)
  for(let k = 0; k < N.length && !r.centro; k++){ if(!/^(local vinculado|nome)\b/.test(N[k])) continue;
    for(const l of [linhas[k].replace(/^\S+(\s+vinculado)?\s*:?/i, ""), linhas[k+1]||""]){ const mc = l.match(/^\s*(\d{4})(?:[._ ]?\d{2,4})/); if(mc){ r.centro = mc[1]; break; } } }
  if(!r.centro){ const mc = String(txt).match(/\b(\d{4})[._]\d{3,4}/); if(mc) r.centro = mc[1]; }
  // vencimento (papel: "Data de Vencimento: 06/11/2026"; tela: rótulo e a data na linha de baixo), prioridade e categoria
  const reData = /\b([0-3]?\d)\/([01]?\d)\/(20\d\d)\b/g, outroRot = /criad|inicio|abertura|planejad|conclu/;
  const iv = N.findIndex(l => /vencimento/.test(l));
  if(iv >= 0){ const pos = N[iv].indexOf("vencimento"); let md = [...N[iv].slice(pos).matchAll(reData)][0];
    if(!md && N[iv+1] && !outroRot.test(N[iv+1])){ // tela: rótulos numa linha, datas na de baixo, na mesma ordem
      const antes = N[iv].slice(0, pos), k = (antes.match(/\bdata\b/g)||[]).length - (/\bdata( de)?\s*$/.test(antes) ? 1 : 0), ds = [...N[iv+1].matchAll(reData)];
      md = ds.length > k ? ds[k] : k===0 ? ds[0] : null; }
    if(md) r.venc = `${md[3]}-${pad(+md[2])}-${pad(+md[1])}`; }
  const trechoRot = re => { const i = N.findIndex(l => re.test(l)); if(i < 0) return []; const pos = N[i].search(re); return [linhas[i].slice(pos), linhas[i+1]||""]; };
  for(const l of trechoRot(/prioridade/)){ const mp = l.match(/\b([1-5])\s*[-–]?\s*(urgente|emerg\S*|elevad[oa]|alt[oa]|m[eé]di[oa]|baix[oa]|cr[ií]tic[oa])\b/i); if(mp){ r.prior = `${mp[1]}-${mp[2][0].toUpperCase()}${mp[2].slice(1).toLowerCase()}`; break; } }
  for(const l of trechoRot(/categoria/)){ const mk = l.match(/\b(0\d\d)[ \t]*[-–.][ \t]*(manut\S*(?:[ \t]+[^\s|]+)?)/i); if(mk){ r.cat = `${mk[1]} - ${mk[2].replace(/[|.,;]+$/, "")}`; break; } }
  return r;
}
const ehNota = v => /^20\d{7}$/.test(v); // nota SAP da Brejeiro: 9 dígitos começando com 20 (ex.: 200186907)
// lixo da tela na mesma linha do título: corta a partir da primeira palavra com minúsculas (os títulos são em maiúsculas)
function cortaLixo(s){ const ws = String(s||"").trim().split(/\s+/), i = ws.findIndex((w, k) => k > 0 && (/[a-zà-ÿ]{2,}/.test(w) || /^[|¦]+$/.test(w)));
  if(i < 0) return ws.join(" "); const t = ws.slice(0, i); while(t.length > 1 && /^\S$|^\d{1,2}$/.test(t[t.length-1])) t.pop(); return t.join(" "); }
// linha que continua o título: quase só maiúsculas, pelo menos uma palavra de 3+ letras
function continuacao(l){ const w = l.trim(); if(!/[A-ZÀ-Ú]{3,}/.test(w)) return false; const letras = w.replace(/[^A-Za-zÀ-ÿ]/g, ""); return letras.length >= 4 && letras.replace(/[^a-zà-ÿ]/g, "").length <= letras.length * 0.2; }
function limparTitulo(s){
  const ws = String(s||"").replace(/\s+/g, " ").trim().split(" ");
  while(ws.length > 1 && (/[.,:;]{2,}/.test(ws[ws.length-1]) || /^[^A-Za-zÀ-ÿ0-9]+$/.test(ws[ws.length-1]) || (ws.length > 3 && /^[A-Za-zÀ-ÿ]$/.test(ws[ws.length-1])))) ws.pop(); // lixo do fundo depois do título
  return ws.join(" ").replace(/[\s.,;:|'"`-]+$/, "").replace(/^[\s.,;:|'"`-]+/, "");
}
// junta duas leituras: a primeira manda; a segunda completa o que faltou ou estende um título cortado
function juntarLeituras(a, b){
  if(!b) return a; const r = {...a, conf:{...a.conf}};
  for(const c of ["id","os","nota","centro"]) if(!r[c] && b[c]){ r[c] = b[c]; if(r.conf[c] != null) r.conf[c] = b.conf[c]; }
  const k = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if(!r.titulo || (!a.tituloFechado && b.titulo && k(b.titulo).length > k(r.titulo).length && k(b.titulo).startsWith(k(r.titulo)))){ r.titulo = b.titulo; r.conf.titulo = b.conf.titulo; r.tituloFechado = b.tituloFechado; }
  return r;
}
const leituraBoa = r => !!(r.id && r.os && r.titulo && r.tituloFechado);
// PDF da OS (quando chega pelo WhatsApp): o texto vem exato, sem OCR
async function textoPdf(file){
  const lib = await pdfjs(), doc = await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise, out = [];
  for(let n = 1; n <= Math.min(doc.numPages, 3); n++){ const tc = await (await doc.getPage(n)).getTextContent(), rows = {};
    tc.items.forEach(it=>{ const y = Math.round(it.transform[5]/3); (rows[y] ||= []).push([it.transform[4], it.str]); });
    Object.keys(rows).sort((a,b)=>b-a).forEach(y=>out.push(rows[y].sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join(" ").replace(/\s+/g," ").trim())); }
  return out.join("\n");
}
// nome do arquivo do TracOS: "22316_000002218080_-_000200186907_-_VERIFICAR_BICA_….pdf"
function lerNomeTracos(nome){ const m = String(nome||"").match(/(?:^|[^\d])(\d{3,8})_(\d{8,14})_-_(\d{8,14})_-_(.+?)\.pdf$/i); if(!m) return null;
  return {id:m[1], os:m[2].replace(/^0+/, ""), nota:m[3].replace(/^0+/, ""), titulo:limparTitulo(m[4].replace(/_/g, " ")), centro:"", tituloFechado:true, conf:{id:0.9, os:0.9, titulo:0.6}}; }
function juntarExtras(r, b){ if(b) for(const c of ["venc","prior","cat"]) if(!r[c] && b[c]) r[c] = b[c]; return r; }
async function papelLer(alvo, file){
  const pdf = /\.pdf$/i.test(file.name) || file.type==="application/pdf";
  toast(pdf ? "Lendo o PDF da OS…" : "Lendo o papel… (na primeira vez demora um pouco)");
  papelUI(alvo, file, await lerPapelArquivo(file), pdf);
}
async function lerPapelArquivo(file){
  const pdf = /\.pdf$/i.test(file.name) || file.type==="application/pdf";
  let r = null, txt = "";
  try{
    if(pdf){ txt = await textoPdf(file); r = lerTracos(txt, {tamId:99}); r = juntarLeituras(r, lerNomeTracos(file.name)); }
    else { const tam = tamIdTracos(); txt = await ocrImagem(file); r = lerTracos(txt, {tamId:tam});
      if(!leituraBoa(r)){ toast("Conferindo de novo…"); const t2 = await ocrImagem(file, "sombra"), r2 = lerTracos(t2, {tamId:tam}); r = juntarExtras(juntarLeituras(r, r2), r2); txt += "\n" + t2; } }
  }catch(err){ toast("Não consegui ler. Confira e digite os números."); }
  r ||= {id:"", os:"", nota:"", titulo:"", centro:"", conf:{}};
  conferirId(r);
  // números para tocar e corrigir: os soltos e os partidos por um espaço (sem colar dois números diferentes)
  const brutos = String(txt).match(/\d[\d ]*\d|\d/g) || [], cand = [];
  const tamOk = new Set([tamIdTracos(), 7, 9, 12]);
  brutos.forEach(t=>{ const ps = t.split(/ +/); cand.push(...ps); const j = ps.join(""); if(ps.length > 1 && tamOk.has(j.length)) cand.push(j); });
  r.nums = [...new Set(cand.map(x=>x.replace(/^0{3,}/, "")).filter(x=>x.length>=4 && x.length<=10))].slice(0, 10);
  return r;
}
// confere o ID lido com o que já se sabe da OS (carteira ou lançamentos de outros dias): a OS pode durar vários dias com o mesmo ID
function conferirId(r){
  r.conf ||= {};
  const conhecido = r.os ? (limpaTracos(ordemDe(r.os)?.tracos) || tracosDe(r.os)) : "";
  if(conhecido && conhecido !== r.id){
    if(!r.id || (r.conf.id||0) < 0.8){ r.id = conhecido; r.conf.id = 0.95; }
    else r.aviso = `O ID lido (${r.id}) é diferente do ID já salvo para a OS ${r.os} (${conhecido}). Confira no papel.`;
  }
  const outra = r.id && state.ap.find(e=>e.tracos===r.id && e.os && soDig(e.os)!==soDig(r.os));
  if(outra && !r.aviso) r.aviso = `O ID ${r.id} já foi usado na OS ${outra.os}. Confira no papel.`;
  if(r.aviso) r.conf.id = Math.min(r.conf.id||0, 0.5);
  return r;
}
function papelUI(alvo, file, r, pdf){
  document.getElementById("papelbox")?.remove();
  const emp = alvo.nova ? (state.cfg.contratante || lastEmp()) : alvo.row!=null ? (state.day?.emp || lastEmp()) : alvo.form==="cr" ? ($("#cr-emp")?.value || lastEmp()) : ($("#f-emp")?.value || lastEmp());
  const us = unidsEmp(emp), unid = r.centro ? (us.find(u=>u.startsWith(r.centro)) || "") : "";
  const el = document.createElement("div"); el.id = "papelbox"; el.className = "assinpad"; state.papel = {alvo, file, pdf, emp};
  const duv = c => (r.conf?.[c]||0) < 0.8 ? ' class="duvida"' : "";
  const jaTem = alvo.nova && r.os && ordemDe(r.os, emp);
  el.innerHTML = `<div class="assinbox"><h3 style="margin:0">Papel da OS</h3>${jaTem?`<p class="muted" style="margin:0"><span class="pill info">já na carteira</span> Os dados já conferidos são mantidos; só o que estiver vazio é completado.</p>`:""}
    ${pdf?`<p class="muted" style="margin:0">PDF: <b>${esc(file.name)}</b></p>`:`<img src="${URL.createObjectURL(file)}" alt="Foto do papel" style="max-height:200px;object-fit:contain;width:100%;border-radius:8px;background:#000">`}
    <div class="grid2"><label class="field"><span>Nº da OS</span><input id="pp-os" inputmode="numeric" value="${esc(r.os)}"${duv("os")}></label><label class="field"><span>ID TracOS</span><input id="pp-tid" inputmode="numeric" value="${esc(r.id)}"${duv("id")}></label></div>
    <label class="field"><span>Título (vai para "Serviço executado")</span><input id="pp-tit" value="${esc(r.titulo)}"${duv("titulo")}></label>
    <div class="grid2">${us.length?`<label class="field"><span>Unidade</span><select id="pp-unid"><option value="">${r.centro?`(centro ${esc(r.centro)} não cadastrado)`:"— não mudar —"}</option>${us.map(u=>`<option ${u===unid?"selected":""}>${esc(u)}</option>`).join("")}</select></label>`:""}
<label class="field"><span>Vencimento</span><input type="date" id="pp-venc" value="${esc(r.venc||"")}"></label></div><input type="hidden" id="pp-nota" value="${esc(r.nota)}"><input type="hidden" id="pp-prior" value="${esc(r.prior||"")}"><input type="hidden" id="pp-cat" value="${esc(r.cat||"")}">
    ${(r.nums||[]).length?`<div class="field"><span>Números encontrados (toque para colocar no campo selecionado)</span><div class="row">${r.nums.map(n=>`<button type="button" class="btn sm" data-act="papelNum" data-n="${esc(n)}">${esc(n)}</button>`).join("")}</div></div>`:""}
    ${r.aviso?`<p class="pill warn" style="margin:0;white-space:normal;border-radius:8px;padding:6px 10px">${esc(r.aviso)}</p>`:""}
    <p class="muted" style="margin:0;font-size:.85rem">${!r.os && !r.id && !r.titulo ? "Não consegui ler esta foto. Tire outra com o papel reto e bem iluminado, ou digite acima." : "Confira antes de usar. Campos em amarelo têm menos certeza."}</p>
    ${assets && !pdf?`<label class="check"><input type="checkbox" id="pp-anexar" checked> Anexar a foto do papel na OS</label>`:""}
    ${alvo.nova ? `<div class="papelacoes"><button type="button" class="btn primary" data-act="papelAcao" data-acao="iniciar">▶ Guardar e iniciar agora</button><button type="button" class="btn" data-act="papelAcao" data-acao="lancar">+ Guardar e lançar horas</button><button type="button" class="btn" data-act="papelAcao" data-acao="proximo">📷 Guardar e fotografar o próximo</button><button type="button" class="btn" data-act="papelAcao" data-acao="guardar">Só guardar na carteira</button><button type="button" class="btn" data-act="papelFechar">Cancelar</button></div>`
      : `<div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="papelFechar">Cancelar</button><button type="button" class="btn primary" data-act="papelUsar">Usar estes dados</button></div>`}</div>`;
  document.body.appendChild(el); state.papelCampo = !r.os ? "pp-os" : !r.id ? "pp-tid" : "pp-os";
  el.addEventListener("focusin", e=>{ if(/^pp-(os|tid)$/.test(e.target.id)) state.papelCampo = e.target.id; });
}
async function papelAplicar(acao){
  const p = state.papel; if(!p) return; const v = id => ($("#"+id)?.value||"").trim();
  const os = v("pp-os").replace(/\D/g,""), tid = limpaTracos(v("pp-tid")), tit = v("pp-tit"), unid = v("pp-unid"), nota = v("pp-nota").replace(/\D/g,"").slice(0,14), venc = v("pp-venc"), prior = v("pp-prior"), cat = v("pp-cat"), anexar = $("#pp-anexar")?.checked;
  if(p.alvo.nova && !os){ toast("Informe o nº da OS."); $("#pp-os")?.focus(); return; }
  const caixa = $("#papelbox"); if(p.alvo.nova){ caixa?.querySelectorAll("button").forEach(b=>b.disabled = true); } else { caixa?.remove(); state.papel = null; }
  const pôr = (el, val) => { if(el && val){ if(el.tagName==="SELECT") unidValor(el, val); else el.value = val; el.dispatchEvent(new Event("input", {bubbles:true})); } };
  const aplicar = (osEl, tidEl, descEl, unidEl) => { pôr(tidEl, tid); pôr(descEl, tit); pôr(unidEl, unid); if(osEl){ osEl.value = os; osEl.dispatchEvent(new Event("input", {bubbles:true})); osEl.dispatchEvent(new Event("change", {bubbles:true})); } };
  const carteira = fotoId => os ? guardarNaCarteira({os, tracos:tid, titulo:tit, unidade:unid, empresa:p.emp||"", nota, vencimento:venc, prioridade:prior, categoria:cat, foto:fotoId}) : Promise.resolve(null);
  if(p.alvo.nova){ // todo papel lido entra (ou completa) a carteira de OS recebidas
    let ord = null;
    try{ const ids = anexar && !p.pdf ? await uploadPhotos([p.file], {tipo:"antes", os, unid}) : []; ord = await carteira(ids[0]); }
    catch(err){ toast(writeErr(err)); }
    if(!ord){ caixa?.querySelectorAll("button").forEach(b=>b.disabled = false); return; } // a caixa continua aberta com o que foi digitado
    caixa?.remove(); state.papel = null;
    if(acao==="iniciar") ordIniciar(ord); else if(acao==="lancar") ordLancar(ord);
    else { toast(`OS ${os} guardada na carteira.`); if(state.view==="carteira" || state.view==="painel" || state.worker){ state.rendered = null; render(); } }
    return;
  }
  // destinos antigos: preenche os campos na hora; foto e carteira seguem depois, sem travar a tela
  let rowRef = null;
  if(p.alvo.row!=null){ const row = document.querySelector(`.dayrow[data-r="${p.alvo.row}"]`); rowRef = state.day.rows[p.alvo.row];
    aplicar(row?.querySelector('[data-f="os"]'), row?.querySelector('[data-f="tid"]'), row?.querySelector('[data-f="desc"]'), row?.querySelector('[data-f="cli"]')); if(rowRef) rowRef.nota = nota; }
  else if(p.alvo.form==="cr"){ aplicar($("#cr-os"), $("#cr-tid"), $("#cr-desc"), $("#cr-unid")); const h = $("#cr-nota"); if(h) h.value = nota; }
  else if(p.alvo.form==="ap"){ aplicar($("#f-os"), $("#f-tid"), $("#f-desc"), $("#f-cli")); const h = $("#f-nota"); if(h) h.value = nota; state.modalDirty = true; }
  const unidC = unid || (rowRef ? (rowRef.cli || state.day?.unid) : p.alvo.form==="ap" ? $("#f-cli")?.value : "") || "";
  (async ()=>{
    const ids = anexar && !p.pdf && p.alvo.form!=="cr" ? await uploadPhotos([p.file], {tipo:"antes", os, unid:unidC}) : [];
    if(ids.length && rowRef && state.day && state.day.rows.includes(rowRef)){ rowRef.fotoMeta = {...(rowRef.fotoMeta||{}), ...Object.fromEntries(ids.map(id=>[id, state.fotoMetaNovo?.[id]]))}; rowRef.fotos = [...(rowRef.fotos||[]), ...ids]; renderDayRows(); updateDay(); }
    if(ids.length && p.alvo.form==="ap" && $("#apForm")){ state.apFotos = [...(state.apFotos||[]), ...ids]; const box = $("#f-thumbs"); if(box) box.innerHTML = thumbs(state.apFotos, true); }
    await carteira(ids[0]).catch(()=>{});
  })();
  const outro = tid && state.ap.find(e=>e.tracos===tid && e.os && e.os!==os);
  toast(outro ? `Atenção: o ID TracOS ${tid} já foi usado na OS ${outro.os}. Confira.` : `OS ${os||"?"} · ID ${tid||"?"}${tit?` · ${tit.slice(0,40)}`:""}`);
}
document.addEventListener("change", e=>{ const t = e.target; if(t.dataset?.papel==null || !t.files?.length) return; const fs = [...t.files], tipo = t.dataset.papel; t.value = ""; if(tipo==="proximo") t.remove();
  if(tipo==="lote" && fs.length > 1) return papelLote(fs);
  papelLer(tipo==="ap" ? {form:"ap"} : tipo==="cr" ? {form:"cr"} : (tipo==="nova" || tipo==="lote" || tipo==="proximo") ? {nova:true} : {row:+tipo}, fs[0]); });
const papelNovaBtn = (cls="btn") => `<label class="${cls} papelbtn">📷 Nova OS pelo papel<input type="file" accept="image/*" capture="environment" data-papel="nova" hidden></label>`;
const papelLoteBtn = () => `<label class="btn papelbtn" title="Escolha uma ou várias fotos/PDFs de OS">📚 Vários papéis / PDF<input type="file" accept="image/*,application/pdf,.pdf" multiple data-papel="lote" hidden></label>`;
const papelBtn = alvo => `<span class="papelbtns"><label class="btn sm papelbtn" title="Tirar foto do papel da OS">📷 Foto do papel<input type="file" accept="image/*" capture="environment" data-papel="${alvo}" hidden></label><label class="btn sm papelbtn" title="Escolher o PDF da OS ou uma foto da galeria">📄 PDF / galeria<input type="file" accept="image/*,application/pdf,.pdf" data-papel="${alvo}" hidden></label></span>`;
/* ---------- carteira de OS recebidas (papel/tela do TracOS) ---------- */
const soDig = v => String(v||"").replace(/\D/g, "");
function ordemDe(os, emp){ const k = soDig(os); if(!k) return null; return state.ord.find(o=>soDig(o.os)===k && (!emp || !o.empresa || chaveEmp(o.empresa)===chaveEmp(emp))) || null; }
// id fixo por OS e empresa: dois técnicos fotografando a mesma OS caem no mesmo registro
const idOrdem = (os, emp) => ("os-" + soDig(os) + "-" + slug(chaveEmp(emp || state.cfg.contratante || "")||"x")).slice(0, 64);
async function guardarNaCarteira(c, tentativa = 0){
  c = {...c, empresa:c.empresa || state.cfg.contratante || ""};
  const id = idOrdem(c.os, c.empresa); let old = ordemDe(c.os, c.empresa);
  if(!old && !state.worker){ await recarregarDoc("ordens", id).catch(()=>{}); old = state.ord.find(x=>x.id===id) || null; } // pode ter sido criada em outro aparelho
  const novo = {}; Object.entries(c).forEach(([k, v])=>{ if(v!=null && String(v).trim()!=="") novo[k] = v; });
  let o;
  if(old){ o = {...old}; Object.entries(novo).forEach(([k, v])=>{ if(old[k]==null || String(old[k]).trim()==="") o[k] = v; }); } // não troca o que já foi conferido
  else o = {...novo, id, recebidaEm:new Date().toISOString(), recebidaPor:state.me || perfil?.nome || nomeDoEmail(session?.user?.email)};
  try{ await save("ordens", o); }
  catch(err){ if(err && err.conflito && tentativa < 1){ await recarregarDoc("ordens", o.id).catch(()=>{}); return guardarNaCarteira(c, tentativa + 1); } throw err; }
  return state.ord.find(x=>x.id===o.id) || o;
}
const ST_ORD = {recebida:["Recebida","info"], execucao:["Em execução","warn"], concluida:["Concluída","good"], medida:["Medida","good"]};
let apsPorOS = {ref:null, map:null};
function apsDaOS(k){ if(apsPorOS.ref!==state.ap){ const m = new Map(); state.ap.forEach(e=>{ const kk = soDig(e.os); if(kk && !e.orcId){ if(!m.has(kk)) m.set(kk, []); m.get(kk).push(e); } }); apsPorOS = {ref:state.ap, map:m}; } return apsPorOS.map.get(k) || []; }
function ordStatus(o){
  const aps = apsDaOS(soDig(o.os)).filter(e=>!o.empresa || chaveEmp(empOf(e))===chaveEmp(o.empresa));
  const feitas = aps.filter(e=>!e.andamento), min = feitas.reduce((s,e)=>s+calc(e).total,0), outros = +o._naps || 0, and = aps.some(e=>e.andamento);
  const st = and ? "execucao" : o.concluida && feitas.length && feitas.every(e=>lockedE(e)) ? "medida" : o.concluida ? "concluida" : (aps.length || outros) ? "execucao" : "recebida";
  return {st, aps, min, and};
}
const vencOrd = o => o.vencimento ? diasEntre(today(), o.vencimento) : null;
const ordAberta = st => st==="recebida" || st==="execucao";
function vencChip(o, st){ const d = vencOrd(o); if(d==null) return ""; if(!ordAberta(st)) return `<span class="muted">venc. ${esc(fdate(o.vencimento))}</span>`;
  return d < 0 ? `<span class="pill bad">vencida há ${-d} dia${d<-1?"s":""}</span>` : d <= 3 ? `<span class="pill warn">${d===0?"vence hoje":`vence em ${d} dia${d>1?"s":""}`}</span>` : `<span class="muted">vence ${esc(fdate(o.vencimento))}</span>`; }
function carteiraResumo(){
  const ls = state.ord.map(o=>({o, ...ordStatus(o)})), n = st => ls.filter(x=>x.st===st).length, venc = ls.filter(x=>ordAberta(x.st) && vencOrd(x.o)!=null && vencOrd(x.o)<=3).length;
  if(!state.ord.length) return `<div class="banner"><span>📋 <b>Carteira de OS:</b> fotografe o papel (ou a tela do TracOS) de cada OS que a Brejeiro passar. O app guarda e acompanha até a medição.</span><div class="row">${papelNovaBtn("btn sm primary")}<button class="btn sm" data-act="nav" data-view="carteira">Abrir</button></div></div>`;
  return `<div class="banner ${venc?"warn":""}"><span>📋 <b>Carteira de OS:</b> ${n("recebida")} recebida(s) · ${n("execucao")} em execução${venc?` · <b>${venc} vencendo</b>`:""}</span><div class="row">${papelNovaBtn("btn sm primary")}<button class="btn sm" data-act="nav" data-view="carteira">Ver carteira</button></div></div>`;
}
function vCarteira(){
  const f = state.cartF || "abertas", q = (state.cartQ||"").toLowerCase();
  const ls = state.ord.map(o=>({o, ...ordStatus(o), d:vencOrd(o)})), cont = {recebida:0, execucao:0, concluida:0, medida:0}; ls.forEach(x=>cont[x.st]++);
  const urg = x => ordAberta(x.st) && x.d!=null && x.d<=3 ? 0 : 1;
  const vis = ls.filter(x=>(f==="todas" || (f==="abertas" ? ordAberta(x.st) : x.st===f)) && (!q || `${x.o.os} ${x.o.tracos||""} ${x.o.titulo||""} ${x.o.unidade||""}`.toLowerCase().includes(q)))
    .sort((a,b)=>urg(a)-urg(b) || (a.d??9999)-(b.d??9999) || String(b.o.recebidaEm||"").localeCompare(String(a.o.recebidaEm||"")));
  const chip = (k, l, n) => `<button class="chipbtn" data-act="cartFiltro" data-f="${k}" aria-pressed="${f===k}">${l}${n!=null?` (${n})`:""}</button>`;
  return `<div class="pagehead"><div><span class="eyebrow">Carteira de OS</span><h1>OS recebidas</h1><p class="muted">Cada papel ou tela do TracOS fotografado vira uma OS da carteira, de recebida até medida no fechamento.</p></div><div class="row"><button class="btn" data-act="nav" data-view="${state.worker?"painel":"mais"}">‹ Voltar</button></div></div>
  <div class="row" style="margin-bottom:10px">${papelNovaBtn("btn primary")}${papelLoteBtn()}<button class="btn" data-act="ordNova">+ Digitar OS</button></div>
  <div class="filters" role="group" aria-label="Situação">${chip("abertas","Abertas", cont.recebida+cont.execucao)}${chip("recebida","Recebidas", cont.recebida)}${chip("execucao","Em execução", cont.execucao)}${chip("concluida","Concluídas", cont.concluida)}${chip("medida","Medidas", cont.medida)}${chip("todas","Todas", ls.length)}</div>
  ${ls.length>6?`<div class="panel" style="margin:8px 0"><label class="field"><span>Buscar</span><input id="cart-q" value="${esc(state.cartQ||"")}" placeholder="Nº da OS, ID, título, unidade…"></label></div>`:""}
  ${vis.length?`<div class="fechlist">${vis.map(x=>{ const o = x.o, [l, cl] = ST_ORD[x.st]; return `<div class="fechcard ordcard">
    <div class="fc-top"><span><b class="mono">OS ${esc(o.os)}</b>${o.tracos?` · <span class="mono">#${esc(o.tracos)}</span>`:""}</span><span class="pill ${cl}">${l}${x.and?" · ▶":""}</span></div>
    ${o.titulo?`<p style="margin:0"><b>${esc(o.titulo)}</b></p>`:""}
    <p class="muted" style="margin:0;font-size:.85rem">${[o.unidade, o.categoria, o.prioridade].filter(Boolean).map(esc).join(" · ")}</p>
    <p class="muted" style="margin:0;font-size:.85rem">${vencChip(o, x.st)} ${o.recebidaEm?`· recebida ${esc(fdate(String(o.recebidaEm).slice(0,10)))}${o.recebidaPor?` por ${esc(o.recebidaPor)}`:""}`:""}${x.min?` · <b>${fdec(x.min)} h</b> lançadas`:""}${o.concluida && o.concluidaEm?` · concluída ${esc(fdate(String(o.concluidaEm).slice(0,10)))}`:""}</p>
    <div class="row fc-acts">${x.st!=="medida"?`<button class="btn sm primary" data-act="ordIniciar" data-id="${esc(o.id)}">▶ Iniciar</button><button class="btn sm" data-act="ordLancar" data-id="${esc(o.id)}">+ Lançar horas</button>`:""}
      ${x.st==="medida"?"":o.concluida?`<button class="btn sm" data-act="ordConcluir" data-id="${esc(o.id)}" data-v="0">↺ Reabrir</button>`:`<button class="btn sm" data-act="ordConcluir" data-id="${esc(o.id)}" data-v="1">✓ Concluir</button>`}
      ${o.foto?`<button class="btn sm" data-act="fotoVer" data-id="${esc(o.foto)}">📷 Papel</button>`:""}${state.worker?"":`<button class="btn sm" data-act="ordEditar" data-id="${esc(o.id)}">Editar</button>`}</div></div>`; }).join("")}</div>`
  :`<div class="empty"><b>${ls.length?"Nada nesta situação":"Nenhuma OS na carteira"}</b>${ls.length?"Escolha outra situação acima.":"Toque em <b>📷 Nova OS pelo papel</b> e fotografe o papel ou a tela do TracOS."}</div>`}`;
}
function ordIniciar(o){ state.crIds = null; openModal(cronoForm({emp:o.empresa, unid:o.unidade, desc:o.titulo}));
  const pôr = (id, v) => { const el = $("#"+id); if(el && v) el.value = v; }; pôr("cr-os", o.os); pôr("cr-tid", o.tracos); pôr("cr-nota", o.nota); setTimeout(()=>$("#cronoForm [type=submit]")?.focus(), 50); }
function ordLancar(o){ dayOpen(today(), {pedido:true, emp:o.empresa}); const d = state.day; if(!d) return;
  let i = d.rows.findIndex(r=>!r.os && !r.desc && !r.fim); if(i < 0){ A.dayAdd(); i = d.rows.length - 1; }
  const row = document.querySelector(`.dayrow[data-r="${i}"]`); if(!row) return; const r = d.rows[i];
  const pôr = (sel, v) => { const el = row.querySelector(sel); if(el && v){ if(el.tagName==="SELECT") unidValor(el, v); else el.value = v; el.dispatchEvent(new Event("input", {bubbles:true})); } };
  pôr('[data-f="tid"]', o.tracos); pôr('[data-f="desc"]', o.titulo); pôr('[data-f="cli"]', o.unidade); pôr('[data-f="os"]', o.os); r.nota = o.nota || "";
  setTimeout(()=>row.querySelector('[data-f="ini"]')?.focus(), 80); }
function ordForm(o){
  return `<header><h2>${o.id?"Editar":"Nova"} OS da carteira</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <form class="form" id="ordForm" data-id="${esc(o.id||"")}">
    <div class="grid2"><label class="field"><span>Nº da OS</span><input id="od-os" inputmode="numeric" required value="${esc(o.os||"")}"></label><label class="field"><span>ID TracOS</span><input id="od-tid" inputmode="numeric" value="${esc(o.tracos||"")}"></label></div>
    <label class="field"><span>Título</span><input id="od-tit" value="${esc(o.titulo||"")}"></label>
    <div class="grid2"><label class="field"><span>Empresa</span><input id="od-emp" list="emp-list" value="${esc(o.empresa||lastEmp())}"><datalist id="emp-list">${dimVals("emp").map(v=>`<option value="${esc(v)}">`).join("")}</datalist></label>
    <label class="field"><span>Unidade</span>${unidCampo('id="od-unid"', o.empresa||lastEmp(), o.unidade, "Selecione a unidade")}</label>
    <label class="field"><span>Vencimento</span><input type="date" id="od-venc" value="${esc(o.vencimento||"")}"></label><label class="field"><span>Prioridade</span><input id="od-prior" value="${esc(o.prioridade||"")}" placeholder="Ex.: 2-Elevado"></label></div>
    <label class="field"><span>Observação</span><input id="od-obs" value="${esc(o.obs||"")}"></label>
    <footer>${o.id && !state.worker?`<button type="button" class="btn danger" data-act="ordExcluir" data-id="${esc(o.id)}">Excluir</button>`:"<span></span>"}<button class="btn primary" type="submit">Salvar</button></footer>
  </form>`;
}
/* várias fotos/PDFs de uma vez: lê tudo e mostra uma lista para conferir antes de guardar */
async function papelLote(files){
  const out = [];
  for(const [i, f] of files.entries()){ toast(`Lendo ${i+1} de ${files.length}…`); let r = {}; try{ r = await lerPapelArquivo(f); }catch(e){} out.push({f, r, pdf:/\.pdf$/i.test(f.name) || f.type==="application/pdf"}); }
  state.lote = out; loteUI();
}
function loteUI(){
  document.getElementById("papelbox")?.remove(); const L = state.lote || [], emp = state.cfg.contratante || lastEmp(), us = unidsEmp(emp);
  const el = document.createElement("div"); el.id = "papelbox"; el.className = "assinpad";
  el.innerHTML = `<div class="assinbox"><h3 style="margin:0">${L.length} papéis lidos</h3><p class="muted" style="margin:0">Confira cada um. Os campos em amarelo têm menos certeza.</p>
    <div class="lotelista">${L.map(({f, r, pdf}, i)=>{ const unid = r.centro ? (us.find(u=>u.startsWith(r.centro)) || "") : "", ja = ordemDe(r.os, emp), duv = c => (r.conf?.[c]||0) < 0.8 ? ' class="duvida"' : "";
      return `<div class="loteitem" data-i="${i}"><label class="lotehead"><input type="checkbox" class="lt-ok" ${r.os?"checked":""}><span><b>${i+1}.</b> ${esc(f.name.length>30?f.name.slice(0,28)+"…":f.name)} ${ja?'<span class="pill info">já na carteira</span>':""}${!r.os?'<span class="pill bad">sem nº</span>':""}${r.erro?`<span class="pill bad">${esc(r.erro)}</span>`:""}</span></label>
        ${pdf?"":`<img src="${URL.createObjectURL(f)}" alt="" class="lotefoto">`}
        <div class="grid2"><label class="field"><span>Nº da OS</span><input class="lt-os" inputmode="numeric" value="${esc(r.os||"")}"${duv("os")}></label><label class="field"><span>ID TracOS</span><input class="lt-tid" inputmode="numeric" value="${esc(r.id||"")}"${duv("id")}></label></div>
        <label class="field"><span>Título</span><input class="lt-tit" value="${esc(r.titulo||"")}"${duv("titulo")}></label>
        <div class="grid2">${us.length?`<label class="field"><span>Unidade</span><select class="lt-unid"><option value="">—</option>${us.map(u=>`<option ${u===unid?"selected":""}>${esc(u)}</option>`).join("")}</select></label>`:""}<label class="field"><span>Vencimento</span><input type="date" class="lt-venc" value="${esc(r.venc||"")}"></label></div></div>`; }).join("")}</div>
    ${assets?`<label class="lotehead"><input type="checkbox" id="lt-anexar" checked><span>Guardar a foto de cada papel</span></label>`:""}
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="papelFechar">Cancelar</button><button type="button" class="btn primary" data-act="loteSalvar">Guardar na carteira</button></div></div>`;
  document.body.appendChild(el);
}
async function loteSalvar(b){
  const L = state.lote || [], emp = state.cfg.contratante || lastEmp(), anexar = $("#lt-anexar")?.checked; let n = 0, pulados = 0; const falhas = []; b.disabled = true;
  const itens = [...document.querySelectorAll("#papelbox .loteitem")].map(el=>({el, i:+el.dataset.i, x:L[+el.dataset.i]}));
  for(const {el, i, x} of itens){ const v = c => (el.querySelector(c)?.value||"").trim(), os = v(".lt-os").replace(/\D/g,"");
    if(!el.querySelector(".lt-ok").checked || !os){ pulados++; continue; }
    try{ const ids = anexar && !x.pdf ? await uploadPhotos([x.f], {tipo:"antes", os, unid:v(".lt-unid")}) : [];
      await guardarNaCarteira({os, tracos:limpaTracos(v(".lt-tid")), titulo:v(".lt-tit"), unidade:v(".lt-unid"), empresa:emp, nota:x.r.nota||"", vencimento:v(".lt-venc"), prioridade:x.r.prior||"", categoria:x.r.cat||"", foto:ids[0]}); n++; }
    catch(err){ x.r = {...x.r, os, id:v(".lt-tid"), titulo:v(".lt-tit"), venc:v(".lt-venc"), erro:writeErr(err)}; falhas.push(i); } }
  if(falhas.length){ state.lote = falhas.map(i=>L[i]); loteUI(); toast(`${n} guardada(s). ${falhas.length} não foi(ram) guardada(s): confira e tente de novo.`); return; }
  $("#papelbox")?.remove(); state.lote = null; toast(`${n} OS guardada(s) na carteira${pulados?` · ${pulados} não marcada(s) ou sem nº ficaram de fora`:""}.`); state.view = "carteira"; state.rendered = null; render();
}
document.addEventListener("input", e=>{ if(e.target.classList?.contains("lt-os")){ const ok = e.target.closest(".loteitem")?.querySelector(".lt-ok"); if(ok && soDig(e.target.value)) ok.checked = true; } });
function osSugestoes(used){ const m = osLista(); m.forEach((v,k)=>{ if(!(k in used)) used[k] = [v.desc, v.unid].filter(Boolean).join(" · "); }); return used; }
// escolheu uma OS da lista: completa serviço e unidade (se estiverem vazios)
function osPreencher(os, descEl, unidEl){ const x = osLista().get(String(os||"").trim()); if(!x) return false;
  if(descEl && !descEl.value.trim() && x.desc){ descEl.value = x.desc; descEl.dispatchEvent(new Event("input", {bubbles:true})); }
  if(unidEl && !unidEl.value && x.unid){ unidValor(unidEl, x.unid); unidEl.dispatchEvent(new Event("input", {bubbles:true})); }
  return true; }
document.addEventListener("change", e=>{ const t = e.target, os = (t.value||"").trim(); if(!os) return;
  const tid = (el)=>{ if(el && !el.value.trim()){ const v = tracosDe(os); if(v){ el.value = v; el.dispatchEvent(new Event("input", {bubbles:true})); } } };
  if(t.id==="f-os"){ tid($("#f-tid")); osPreencher(os, $("#f-desc"), $("#f-cli")); }
  else if(t.id==="cr-os"){ tid($("#cr-tid")); osPreencher(os, $("#cr-desc"), $("#cr-unid")); }
  else if(t.dataset && t.dataset.f==="os" && t.closest(".dayrow")){ const row = t.closest(".dayrow"); tid(row.querySelector('[data-f="tid"]')); osPreencher(os, row.querySelector('[data-f="desc"]'), row.querySelector('[data-f="cli"]')); }
  else return;
  const l = osLista(); if(l.size && !l.has(os.replace(/\D/g,""))) toast(`A OS ${os} não está na lista da contratante. Confira o número.`); });
const unidsEmp = emp => lines(ficha(emp || state.cfg.contratante || "").unidades);
function unidDl(){ let dl = document.getElementById("unid-dl"); if(!dl){ dl = document.createElement("datalist"); dl.id = "unid-dl"; document.body.appendChild(dl); } dl.innerHTML = dimVals("unid").map(u=>`<option value="${esc(u)}">`).join(""); }
function unidCampo(attrs, emp, val, ph){
  const l = unidsEmp(emp); val = val || ""; emp = emp || state.cfg.contratante || "";
  if(!l.length){ try{ unidDl(); }catch(e){} return `<input ${attrs} list="unid-dl" value="${esc(val)}" placeholder="${esc(ph||"Ex.: Uruaçu")}" data-unid="${esc(emp)}" data-ph="${esc(ph||"")}">`; }
  const extra = val && !l.includes(val);
  return `<select ${attrs} data-unid="${esc(emp)}" data-ph="${esc(ph||"")}"><option value="">${esc(ph||"Selecione a unidade")}</option>${l.map(u=>`<option ${u===val?"selected":""}>${esc(u)}</option>`).join("")}${extra?`<option selected>${esc(val)}</option>`:""}<option value="__outra">+ Outra unidade…</option></select>`;
}
const unidAttrs = el => el.id ? `id="${el.id}"` : `data-f="${el.dataset.f}"`;
function unidValor(el, v){ if(!el) return; if(el.tagName==="SELECT" && v && ![...el.options].some(o=>o.value===v)){ const o = document.createElement("option"); o.textContent = v; el.insertBefore(o, el.lastElementChild); } el.value = v; }
// trocou a empresa: troca a lista de unidades dos campos do mesmo formulário
function unidTrocarEmp(form, emp){ form.querySelectorAll("[data-unid]").forEach(el=>{ if(el.dataset.unidNova!=null) return; const tmp = document.createElement("div"); tmp.innerHTML = unidCampo(unidAttrs(el), emp, el.value==="__outra"?"":el.value, el.dataset.ph); el.replaceWith(tmp.firstElementChild); }); }
async function unidAdicionar(emp, v){
  v = (v||"").trim(); if(state.worker || !emp || !v) return;
  if(unidsEmp(emp).some(u=>chaveEmp(u)===chaveEmp(v))) return;
  const c = clone(state.cfg); c.contratantes ||= {}; const F = c.contratantes[emp] ||= {}; F.unidades = [...lines(F.unidades), v].join("\n");
  try{ await saveCfg(c); state.cfg = deepMerge(DEFAULT_CFG, c); toast(`Unidade "${v}" adicionada à lista da ${emp}.`); }catch(err){ toast(writeErr(err)); }
}
document.addEventListener("change", e=>{
  const t = e.target;
  if(t.tagName==="SELECT" && t.dataset.unid!=null && t.value==="__outra"){
    const i = document.createElement("input"); if(t.id) i.id = t.id; if(t.dataset.f) i.dataset.f = t.dataset.f;
    i.dataset.unid = t.dataset.unid; i.dataset.ph = t.dataset.ph || ""; i.dataset.unidNova = t.dataset.unid; i.placeholder = "Digite a nova unidade"; i.setAttribute("list", "unid-dl");
    t.replaceWith(i); i.focus(); return; }
  if(t.dataset && t.dataset.unidNova!=null && t.value.trim()) unidAdicionar(t.dataset.unidNova, t.value);
  if(["f-emp","d-emp","cr-emp","dp-emp","eqf-emp"].includes(t.id)){ const f = t.closest("form"); if(f) unidTrocarEmp(f, t.value.trim()); }
});
function empresasCfg(){ const l = lines(state.cfg.empresas); if(state.cfg.contratante && !l.includes(state.cfg.contratante)) l.unshift(state.cfg.contratante); return l; }
const DIMS = {
  prof:{label:"Funcionário", plural:"Funcionários", none:"(sem funcionário)", get:e=>e.profissional||"", cfg:()=>profs()},
  unid:{label:"Unidade", plural:"Unidades", none:"(sem unidade)", get:e=>e.cliente||"", cfg:()=>[...lines(state.cfg.unidades), ...Object.values(state.cfg.contratantes||{}).flatMap(F=>lines(F && F.unidades))]},
  emp:{label:"Empresa", plural:"Empresas", none:"(sem empresa)", get:e=>empOf(e), cfg:()=>empresasCfg()}
};
function dimVals(k, list){ return [...new Set([...DIMS[k].cfg(), ...(list||state.ap).map(DIMS[k].get).filter(Boolean)])]; }
function applyF(list, f){ return list.filter(e=>Object.keys(DIMS).every(k=>!f || !f[k] || f[k]===ALL || DIMS[k].get(e)===f[k])); }
function groupBy(list, k){
  if(!k) return [{key:null, label:"", rows:list}];
  const m = new Map(); list.forEach(e=>{ const v = DIMS[k].get(e); if(!m.has(v)) m.set(v, []); m.get(v).push(e); });
  return [...m.entries()].sort((a,b)=>(a[0]||"~").localeCompare(b[0]||"~", "pt-BR")).map(([key,rows])=>({key, label:key||DIMS[k].none, rows}));
}
function filterBar(prefix, f, by){
  const sel = (id, label, cur, opts) => `<label class="field"><span>${label}</span><select id="${id}">${opts.map(([v,l])=>`<option value="${esc(v)}" ${cur===v?"selected":""}>${esc(l)}</option>`).join("")}</select></label>`;
  const parts = Object.entries(DIMS).map(([k,d])=>{ const vals = dimVals(k); return vals.length ? sel(`${prefix}-f-${k}`, d.label, f[k], [[ALL, k==="prof"?"Todos":"Todas"], ...vals.map(v=>[v,v])]) : ""; }).join("");
  return parts + sel(`${prefix}-by`, "Separar por", by, [["","Não separar"],["prof","Funcionário"],["unid","Unidade"],["emp","Empresa"]]);
}
function dimTable(list, k, opt={}){
  const groups = groupBy(list, k);
  if(!list.length || (groups.length<2 && !groups[0].key)) return "";
  const t = sumCalc(list), lu = opt.lucro && temCustos();
  const pc = (v,c) => v>0 ? Math.round(100*(v-c)/v)+"%" : "-";
  const cells = (rows, c) => { const cu = lu ? custoSum(rows.filter(e=>!e.orcId)) : 0; return `<td class="r mono">${rows.length}</td><td class="r mono">${fdec(c.total)}</td><td class="r mono">${fdec(c.e50)}</td><td class="r mono">${fdec(c.e100)}</td><td class="r mono">${brl(c.valor)}</td>${lu?`<td class="r mono">${brl(cu)}</td><td class="r mono"><b>${brl(c.valor-cu)}</b></td><td class="r mono">${pc(c.valor,cu)}</td>`:""}`; };
  return `<div class="tablewrap"><table><thead><tr><th>${DIMS[k].label}</th><th class="r">OS</th><th class="r">Horas</th><th class="r">Extra ${pct50()}</th><th class="r">Extra ${pct100()}</th><th class="r">Faturado</th>${lu?'<th class="r">Custo equipe</th><th class="r">Lucro</th><th class="r">Margem</th>':""}</tr></thead>
  <tbody>${groups.map(g=>`<tr><td>${esc(g.label)}</td>${cells(g.rows, sumCalc(g.rows))}</tr>`).join("")}</tbody>
  ${groups.length>1?`<tfoot><tr><td>Total</td>${cells(list, t)}</tr></tfoot>`:""}</table></div>`;
}
document.addEventListener("change", e=>{
  const m = e.target.id.match(/^(h|rep)-(?:f-(prof|unid|emp)|(by))$/); if(!m) return;
  const tgt = m[1]==="h" ? state.hf : state.rep;
  if(m[2]) tgt.f[m[2]] = e.target.value; else tgt.by = e.target.value;
  if(m[1]==="h") render(); else renderReport();
});
