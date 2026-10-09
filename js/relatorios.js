"use strict";
/* ---------- RELATÓRIOS ---------- */
const WDL = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
const wdl = ds => WDL[parseYmd(ds).getDay()].toLowerCase();
function repNames(){ return dimVals("prof"); }
function repUnids(){ return dimVals("unid"); }
function vRelatorios(){
  const r = state.rep;
  const sel = (id, label, cur, opts) => `<label class="field"><span>${label}</span><select id="${id}">${opts.map(([v,l])=>`<option value="${esc(v)}" ${cur===v?"selected":""}>${esc(l)}</option>`).join("")}</select></label>`;
  return `<div class="pagehead"><div><span class="eyebrow">Relatórios</span><h1>Controle de ordens</h1><p class="muted">OS de cada dia com horário, horas em decimal, extras 50% e 100% e total no final. Filtre ou separe por funcionário, unidade ou empresa.</p></div></div>
  <div class="panel form">
    <div class="filters" role="group" aria-label="Tipo de relatório">
      <button class="chipbtn" data-act="repModo" data-m="dia" aria-pressed="${r.modo==="dia"}">Diário</button>
      <button class="chipbtn" data-act="repModo" data-m="periodo" aria-pressed="${r.modo==="periodo"}">Período / fechamento</button>
    </div>
    <div class="grid3">
      ${r.modo==="dia" ? `<label class="field"><span>Dia</span><input type="date" id="rep-dia" value="${r.dia}"></label>`
      : `<label class="field"><span>De</span><input type="date" id="rep-de" value="${r.de}"></label><label class="field"><span>Até</span><input type="date" id="rep-ate" value="${r.ate}"></label>
         <div class="field"><span>Atalhos</span><div class="row"><button class="btn sm" data-act="repPreset" data-p="mes">Este mês</button><button class="btn sm" data-act="repPreset" data-p="ant">Mês passado</button>${medicao(r.f.emp!==ALL?r.f.emp:"")?`<button class="btn sm" data-act="repPreset" data-p="med">Medição atual</button><button class="btn sm" data-act="repPreset" data-p="medAnt">Medição anterior</button>`:""}</div></div>`}
    </div>
    <div class="filtergrid">${filterBar("rep", r.f, r.by)}</div>
    <div class="row" style="gap:6px 18px">
      ${sel("rep-fmt","Horas em",r.fmt,[["dec","Decimal (4,50)"],["hm","Horas e minutos (4h30)"]])}
      <label class="check" style="align-self:end;padding-bottom:10px"><input type="checkbox" id="rep-val" ${r.valores?"checked":""}> Mostrar valores em R$</label>
      ${r.modo==="periodo"?`<label class="check" style="align-self:end;padding-bottom:10px"><input type="checkbox" id="rep-vaz" ${r.vazios?"checked":""}> Listar dias sem OS</label>`:""}
      ${state.ap.some(e=>e.orcId)?`<label class="check" style="align-self:end;padding-bottom:10px"><input type="checkbox" id="rep-orc" ${r.orc?"checked":""}> Incluir horas de orçamento (empreitada)</label>`:""}
      <label class="check" style="align-self:end;padding-bottom:10px"><input type="checkbox" id="rep-fotos" ${r.fotos?"checked":""}> Incluir fotos no PDF</label>
    </div>
    <div class="row">
      <button class="btn primary" data-act="repPdf">Baixar PDF</button>
      <button class="btn" data-act="repXlsx">Baixar Excel</button>
      <button class="btn" data-act="repCopy">Copiar texto</button>
      <button class="btn" data-act="repWhats">Enviar texto no WhatsApp</button>
      ${r.modo==="periodo"?`<button class="btn" data-act="repTerceiros">Fechamento p/ fiscal (modelo Brejeiro)</button><button class="btn" data-act="fechAbrir">Fechar período…</button>`:""}
    </div>
  </div>
  <div id="repOut"></div>`;
}
function repRange(){ const r=state.rep; return r.modo==="dia" ? [r.dia, r.dia] : [r.de, r.ate]; }
function repRows(){
  const [de, ate] = repRange();
  return applyF(state.ap.filter(e=>e.data>=de && e.data<=ate && (state.rep.orc || state.rep.os || !e.orcId) && (!state.rep.os || (e.os||"(sem nº)")===state.rep.os) && !e.andamento), state.rep.f)
    .sort((a,b)=>(a.data+a.inicio+(a.profissional||"")).localeCompare(b.data+b.inicio+(b.profissional||"")));
}
function repGroups(){ return groupBy(repRows(), state.rep.by); }
function repDays(rows){
  const [de, ate] = repRange(), by = {};
  rows.forEach(e=>(by[e.data] ||= []).push(e));
  let dates = Object.keys(by).sort();
  if(state.rep.modo==="periodo" && state.rep.vazios && de && ate && de<=ate){
    dates = []; for(let d=parseYmd(de), n=0; ymd(d)<=ate && n<400; d=addDays(d,1), n++) dates.push(ymd(d));
  }
  return dates.map(d=>({data:d, rows:by[d]||[]}));
}
function repTitle(){ const r=state.rep; return r.modo==="dia" ? `${WD[parseYmd(r.dia).getDay()]}, ${fdate(r.dia)}` : `${fdate(r.de)} a ${fdate(r.ate)}`; }
const oneOf = (rows, k) => { const s = new Set(rows.map(DIMS[k].get)); return s.size===1 ? [...s][0] : ""; };
function repHeading(rows){
  const r = state.rep, emp = oneOf(rows,"emp");
  if(r.os) return `Relatório de Atendimento - OS ${r.os}`;
  const sub = (r.by==="prof" || r.f.prof!==ALL) ? oneOf(rows,"prof") : (r.by==="unid" || r.f.unid!==ALL) ? oneOf(rows,"unid") : "";
  return `Controle de Ordens${emp?" "+emp:""}${sub?" - "+sub.toUpperCase():""}`;
}
const repH = m => state.rep.fmt==="hm" ? fh(m) : fdec(m);
const repX = m => m ? repH(m) : "";
function repCols(rows){
  const many = k => new Set(rows.map(DIMS[k].get)).size>1;
  return {prof: many("prof"), unid: rows.some(e=>e.cliente) && !(oneOf(rows,"unid") && (state.rep.by==="unid"||state.rep.f.unid!==ALL)), emp: many("emp"), val: state.rep.valores};
}
function repSummary(t){
  const cfg = state.cfg;
  return [
    ["Horas normais", t.n, t.vn],
    [`Horas extras ${cfg.extraPct}%`, t.e50, t.v50],
    [`Horas extras ${cfg.feriadoPct}% (domingo e feriado)`, t.e100, t.v100],
    ["Total de horas extras", t.e50+t.e100, t.v50+t.v100],
    ["Total geral de horas", t.total, t.valor]
  ];
}
function repHead(C){ const cfg=state.cfg; return ["ORDEM","DIA","DATA","INÍCIO","FIM","DESCRIÇÃO","HORAS",`${cfg.extraPct}%`,`${cfg.feriadoPct}%`,...(C.val?["VALOR"]:[]),...(C.unid?["UNIDADE"]:[]),...(C.emp?["EMPRESA"]:[]),...(C.prof?["FUNCIONÁRIO"]:[])]; }
function repExtra(e, C){ return [...(C.unid?[e.cliente||""]:[]), ...(C.emp?[empOf(e)]:[]), ...(C.prof?[e.profissional||""]:[])]; }
function groupHtml(rows){
  const days = repDays(rows), cfg = state.cfg, t = sumCalc(rows), C = repCols(rows), nDias = days.filter(d=>d.rows.length).length;
  const head = repHead(C), ncols = head.length, nExtra = ncols - 9 - (C.val?1:0);
  const body = days.map(d=>{
    const hol = holidayName(d.data), sun = parseYmd(d.data).getDay()===0;
    const dayCells = k => `<td rowspan="${k}" style="white-space:nowrap">${wdl(d.data)}${hol?`<br><span class="pill bad">${esc(hol)}</span>`:""}</td><td rowspan="${k}" class="mono">${fdate(d.data)}</td>`;
    if(!d.rows.length) return `<tr style="${sun||hol?"background:var(--surface-2)":""}"><td></td>${dayCells(1)}<td colspan="${ncols-3}"></td></tr>`;
    return d.rows.map((e,i)=>{ const c=calc(e); return `<tr><td class="mono">${esc(e.os||"-")}</td>${i===0?dayCells(d.rows.length):""}<td class="mono">${esc(e.inicio)}</td><td class="mono">${esc(e.fim)}</td><td>${esc(e.descricao||"")}${e.emergencia?' <span class="pill warn">Emergência</span>':""}</td><td class="r mono"><b>${repH(c.total)}</b></td><td class="r mono">${repX(c.e50)}</td><td class="r mono">${repX(c.e100)}</td>${C.val?`<td class="r mono">${brl(c.valor)}</td>`:""}${repExtra(e,C).map(x=>`<td>${esc(x)}</td>`).join("")}</tr>`; }).join("");
  }).join("");
  return `<section class="section"><header><h2>${esc(repHeading(rows))}</h2><span class="muted">${repTitle()} · ${nDias} ${nDias>1?"dias":"dia"} · ${rows.length} OS</span></header>
  <div class="tablewrap"><table><thead><tr>${head.map((h,i)=>`<th${i>=6&&i<9+(C.val?1:0)?' class="r"':""}>${h}</th>`).join("")}</tr></thead>
  <tbody>${body}</tbody>
  <tfoot><tr style="background:var(--warn-bg)"><td colspan="6">TOTAL</td><td class="r mono">${repH(t.total)}</td><td class="r mono">${repH(t.e50)}</td><td class="r mono">${repH(t.e100)}</td>${C.val?`<td class="r mono">${brl(t.valor)}</td>`:""}${"<td></td>".repeat(nExtra)}</tr></tfoot></table></div>
  <div class="tablewrap" style="max-width:600px"><table><tbody>${repSummary(t).map((r,i)=>`<tr ${i>=3?'style="font-weight:700"':""}><td>${r[0]}</td><td class="r mono">${fdec(r[1])} h</td><td class="r mono muted">${fh(r[1])}</td>${C.val?`<td class="r mono">${brl(r[2])}</td>`:""}</tr>`).join("")}</tbody></table></div></section>`;
}
// fechamentos que caem no período escolhido (inclusive os das planilhas importadas), com os PDFs
function fechsDoPeriodo(){
  const [de, ate] = repRange(), emp = state.rep.f.emp;
  const fs = state.fech.filter(f=>f.de<=ate && f.ate>=de && (!emp || emp===ALL || chaveEmp(f.empresa||"")===chaveEmp(emp))).sort((a,b)=>b.de.localeCompare(a.de));
  if(!fs.length) return "";
  return `<section class="section" style="margin-top:14px"><header><h2>Fechamentos deste período</h2><button class="btn sm" data-act="nav" data-view="financeiro">Ver no Financeiro</button></header>
  <div class="fechlist">${fs.map(f=>`<div class="fechcard"><div class="fc-top"><span><b class="mono">${esc(f.numero)}</b> · ${f.competencia?ymLabel(f.competencia):`${fdate(f.de)} a ${fdate(f.ate)}`}${f.empresa?` · ${esc(f.empresa)}`:""}</span><span class="pill ${fechSaldo(f)>0.005?"warn":"good"}">${fechSaldo(f)>0.005?"A receber":"Recebido"}</span></div>
    <p class="muted" style="margin:0">${f.os||0} OS · ${fdec(+f.horas||0)} h · <b>${brl(+f.valor||0)}</b>${f.itens?" · planilha aprovada":""}</p>
    <div class="row fc-acts"><button class="btn sm primary" data-act="terceirosPdf" data-id="${esc(f.id)}">Ver PDF do fiscal</button><button class="btn sm" data-act="terceirosXlsx" data-id="${esc(f.id)}">Excel</button>${f.itens?"":`<button class="btn sm" data-act="fechPdfBtn" data-id="${esc(f.id)}">PDF de horas enviado</button>`}</div></div>`).join("")}</div></section>`;
}
function renderReport(){
  const out = $("#repOut"); if(!out) return;
  const rows = repRows();
  const fz = fechsDoPeriodo();
  if(!rows.length){ out.innerHTML = fz || `<div class="empty" style="margin-top:20px"><b>Nenhum apontamento em ${repTitle()}</b>Escolha outras datas ou filtros, ou registre as OS em Horas.</div>`; return; }
  const groups = repGroups(), by = state.rep.by;
  out.innerHTML = fz + (groups.length>1 ? `<section class="section"><header><h2>Resumo por ${DIMS[by].label.toLowerCase()}</h2><span class="muted">${repTitle()}</span></header>${dimTable(rows, by)}</section>` : "")
    + groups.map(g=>groupHtml(g.rows)).join("");
}
document.addEventListener("change", e=>{
  const id = e.target.id; const r = state.rep;
  const map = {"rep-dia":"dia","rep-de":"de","rep-ate":"ate","rep-fmt":"fmt"};
  if(map[id]){ r[map[id]] = e.target.value || (id==="rep-dia"?today():r[map[id]]); renderReport(); }
  if(id==="rep-val"){ r.valores = e.target.checked; renderReport(); }
  if(id==="rep-vaz"){ r.vazios = e.target.checked; renderReport(); }
  if(id==="rep-orc"){ r.orc = e.target.checked; renderReport(); }
  if(id==="rep-fotos"){ r.fotos = e.target.checked; }
});
function repText(){
  const v = state.rep.valores, groups = repGroups(), all = repRows();
  const L = [`*${state.cfg.empresa.nome}*`, repTitle()];
  groups.forEach(g=>{
    const rows = g.rows, C = repCols(rows), t = sumCalc(rows);
    L.push("", `*${repHeading(rows).toUpperCase()}*`);
    repDays(rows).filter(d=>d.rows.length).forEach(d=>{
      const hol = holidayName(d.data);
      L.push("", `*${WDL[parseYmd(d.data).getDay()]}, ${fdate(d.data)}${hol?` - Feriado: ${hol}`:""}*`);
      d.rows.forEach(e=>{ const c=calc(e); const x = [c.e50?`${repH(c.e50)} a ${pct50()}`:"", c.e100?`${repH(c.e100)} a ${pct100()}`:""].filter(Boolean).join(", ");
        L.push(`• OS ${e.os||"s/n"} | ${e.inicio} às ${e.fim} | ${repH(c.total)} h${x?` (extra: ${x})`:""}${repExtra(e,C).filter(Boolean).map(z=>" | "+z).join("")}${descRep(e)?"\n   "+descRep(e):""}`); });
    });
    L.push("", "*RESUMO DE HORAS*");
    repSummary(t).forEach(r=>L.push(`${r[0]}: ${repH(r[1])} h${v?` - ${brl(r[2])}`:""}`));
  });
  if(groups.length>1){
    L.push("", `*TOTAL POR ${DIMS[state.rep.by].label.toUpperCase()}*`);
    groups.forEach(g=>{ const t=sumCalc(g.rows); L.push(`${g.label}: ${repH(t.total)} h (extra ${repH(t.e50+t.e100)} h)${v?` - ${brl(t.valor)}`:""}`); });
    const t = sumCalc(all); L.push(`Total geral: ${repH(t.total)} h${v?` - ${brl(t.valor)}`:""}`);
  }
  return L.join("\n");
}
async function copyText(txt){
  try{ await navigator.clipboard.writeText(txt); toast("Texto copiado. Cole no WhatsApp ou e-mail."); }
  catch(e){ openModal(`<header><h2>Copie o texto</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header><textarea class="copybox field" readonly id="copybox">${esc(txt)}</textarea><p class="muted">Selecione tudo e copie.</p>`); const b=$("#copybox"); b.focus(); b.select(); }
}
const MIME = {csv:"text/csv", json:"application/json", pdf:"application/pdf", zip:"application/zip", xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"};
async function offerFile(filename, data){
  const tipo = MIME[filename.split(".").pop().toLowerCase()] || "application/octet-stream";
  let blob = data instanceof Blob ? data : new Blob([data], {type:tipo});
  if(!blob.type) blob = new Blob([blob], {type:tipo});
  let file = null; try{ file = new File([blob], filename, {type:tipo}); }catch(err){}
  if(tipo==="application/pdf" && !window.__semPrevia){ previaPdf(blob, filename, file); return; }
  if(file && navigator.canShare && navigator.share){ let ok = false; try{ ok = navigator.canShare({files:[file]}); }catch(err){}
    if(ok){
      state.arquivo = {file, blob, filename};
      openModal(`<header><h2>Arquivo pronto</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
        <div class="form"><p style="margin:0"><b>${esc(filename)}</b><br><span class="muted">${(blob.size/1024).toFixed(0)} KB</span></p>
        <div class="row"><button class="btn primary" data-act="arqEnviar">Enviar (WhatsApp, e-mail, Arquivos…)</button><button class="btn" data-act="arqBaixar">Baixar</button></div></div>`);
      return;
    }
  }
  baixarBlob(blob, filename);
}
/* prévia do PDF antes de enviar: desenha as páginas na tela (funciona também no Android, que não abre PDF dentro do app) */
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", PDFJS_W = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
async function pdfjs(){
  if(!window.pdfjsLib) await loadScript(PDFJS);
  if(!window.pdfjsLib.GlobalWorkerOptions.workerSrc){ // o worker vem do CDN conferido (SRI) e roda a partir de um blob local
    const r = await fetch(PDFJS_W, {integrity:SRI[PDFJS_W], mode:"cors"}); if(!r.ok) throw new Error("worker");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([await r.text()], {type:"text/javascript"})); }
  return window.pdfjsLib;
}
function previaPdf(blob, filename, file){
  let pode = false; try{ pode = !!(file && navigator.canShare && navigator.share && navigator.canShare({files:[file]})); }catch(err){}
  state.arquivo = {file, blob, filename}; if(state.previaUrl) URL.revokeObjectURL(state.previaUrl); state.previaUrl = URL.createObjectURL(blob);
  openModal(`<header><h2>Conferir antes de enviar</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
    <p class="muted" style="margin:0 0 8px"><b>${esc(filename)}</b> · ${(blob.size/1024).toFixed(0)} KB · <span id="pv-info">abrindo…</span></p>
    <div id="pv-paginas" class="pv-paginas"><div class="loading">Preparando a prévia…</div></div>
    <footer><a class="btn" href="${state.previaUrl}" target="_blank" rel="noopener">Tela cheia</a><span class="row" style="gap:8px">${pode?`<button class="btn" data-act="arqBaixar">Baixar</button><button class="btn primary" data-act="arqEnviar">Enviar</button>`:`<button class="btn primary" data-act="arqBaixar">Baixar</button>`}</span></footer>`, "wide");
  desenharPdf(blob).catch(()=>{ const b = $("#pv-paginas"); if(b) b.innerHTML = `<div class="empty"><b>Não consegui mostrar a prévia aqui.</b>Toque em “Tela cheia” para ver o PDF, ou baixe/envie direto.</div>`; const i = $("#pv-info"); if(i) i.textContent = ""; });
}
async function desenharPdf(blob){
  const lib = await pdfjs(), doc = await lib.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise;
  const box = $("#pv-paginas"); if(!box) return; box.innerHTML = "";
  const info = $("#pv-info"); if(info) info.textContent = `${doc.numPages} página${doc.numPages>1?"s":""}`;
  const larg = Math.max(300, box.clientWidth || 360), dpr = Math.min(2, window.devicePixelRatio || 1);
  for(let n=1; n<=Math.min(doc.numPages, 40); n++){
    if(!box.isConnected) return;
    const pg = await doc.getPage(n), v1 = pg.getViewport({scale:1}), vp = pg.getViewport({scale: larg/v1.width*dpr});
    const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height; c.className = "pv-pag"; c.setAttribute("aria-label", `Página ${n}`);
    box.appendChild(c); await pg.render({canvasContext:c.getContext("2d"), viewport:vp}).promise;
  }
  if(doc.numPages>40){ const m = document.createElement("p"); m.className = "muted"; m.textContent = `Mostrando 40 de ${doc.numPages} páginas. Toque em Tela cheia para ver todas.`; box.appendChild(m); }
}
function baixarBlob(blob, filename){
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 10000); toast("Arquivo baixado.");
}
const slug = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^\w]+/g,"-").replace(/^-|-$/g,"").toLowerCase();
function repFileTag(){
  if(state.rep.os) return `os-${slug(state.rep.os)}`;
  if(state.rep.fechArq) return state.rep.fechArq;
  if(state.rep.fechNum) return `fechamento-${state.rep.fechNum}-${state.rep.f.emp!==ALL?slug(state.rep.f.emp)+"-":""}${state.rep.de}_a_${state.rep.ate}`;
  const r = state.rep, f = Object.keys(DIMS).filter(k=>r.f[k]!==ALL).map(k=>slug(r.f[k]));
  return [...f, r.by?`por-${slug(DIMS[r.by].label)}`:"", r.modo==="dia"?r.dia:`${r.de}_a_${r.ate}`].filter(Boolean).join("-");
}
const SRI = {"https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js": "sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F", "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js": "sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e", "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js": "sha384-SnzOobpRMLXZ52iJvZm/C0fYw0OQemTXzTjIsdsfMcrCtCEe9qgzxTd3RSklO5x2", "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js": "sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw", "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js": "sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG", "https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/lite.umd.js": "sha384-KRanV2NRwHPanp7iM6nlLQC5jPCTscSYMko30dLJHzNXJaUNtcucWv+SOi3jV3PE"};
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement("script"); s.src=src; if(SRI[src]){ s.integrity = SRI[src]; s.crossOrigin = "anonymous"; } s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
function xlsxSheet(X, rows){
  const days = repDays(rows), cfg = state.cfg, C = repCols(rows), t = sumCalc(rows);
  const head = repHead(C), nc = head.length, H = m => Math.round(m/60*10000)/10000;
  const aoa = [[repHeading(rows)], [`${cfg.empresa.nome} - CNPJ ${cfg.empresa.cnpj} - Período: ${repTitle()}`], head];
  const merges = [{s:{r:0,c:0},e:{r:0,c:nc-1}}, {s:{r:1,c:0},e:{r:1,c:nc-1}}];
  days.forEach(d=>{
    const start = aoa.length, list = d.rows.length ? d.rows : [null];
    list.forEach((e,i)=>{
      if(!e){ aoa.push(["", wdl(d.data), fdate(d.data)]); return; }
      const c = calc(e);
      aoa.push([e.os||"", i?"":wdl(d.data), i?"":fdate(d.data), e.inicio, e.fim, descRep(e), H(c.total), c.e50?H(c.e50):"", c.e100?H(c.e100):"", ...(C.val?[c.valor]:[]), ...repExtra(e,C)]);
    });
    if(list.length>1){ merges.push({s:{r:start,c:1},e:{r:start+list.length-1,c:1}}, {s:{r:start,c:2},e:{r:start+list.length-1,c:2}}); }
  });
  const first = 4, last = aoa.length, totR = aoa.length;
  aoa.push(["TOTAL","","","","","", H(t.total), H(t.e50), H(t.e100), ...(C.val?[t.valor]:[])]);
  merges.push({s:{r:totR,c:0},e:{r:totR,c:5}});
  aoa.push([]); aoa.push(["RESUMO DE HORAS","","","","","","HORAS",...(C.val?["","","VALOR"]:[])]);
  const sumStart = aoa.length;
  repSummary(t).forEach(r=>aoa.push([r[0],"","","","","",H(r[1]),...(C.val?["","",Math.round(r[2]*100)/100]:[])]));
  const ws = X.utils.aoa_to_sheet(aoa), valCol = C.val ? 9 : -1;
  ["G","H","I"].forEach((L,k)=>{ ws[`${L}${totR+1}`] = {t:"n", v:[H(t.total),H(t.e50),H(t.e100)][k], f:`SUM(${L}${first}:${L}${last})`}; });
  if(C.val) ws[`J${totR+1}`] = {t:"n", v:t.valor, f:`SUM(J${first}:J${last})`};
  const range = X.utils.decode_range(ws["!ref"]);
  for(let R=3; R<=range.e.r; R++) for(let Cc=6; Cc<=range.e.c; Cc++){
    const cell = ws[X.utils.encode_cell({r:R,c:Cc})]; if(!cell || cell.t!=="n") continue;
    cell.z = (Cc===valCol && R<sumStart) || (R>=sumStart && Cc===9) ? '"R$" #,##0.00' : "0.00";
  }
  ws["!merges"] = merges;
  ws["!cols"] = [10,14,11,8,8,52,8,8,8,...(C.val?[13]:[]),...(C.unid?[16]:[]),...(C.emp?[18]:[]),...(C.prof?[22]:[])].map(w=>({wch:w}));
  return ws;
}
async function repXlsx(){
  const groups = repGroups(), all = repRows();
  if(!all.length){ toast("Nenhum apontamento nesse período."); return; }
  if(!window.XLSX){ toast("Preparando planilha…"); try{ await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"); }catch(err){ toast("Não consegui carregar o gerador de Excel. Verifique a conexão."); return; } }
  const X = window.XLSX, wb = X.utils.book_new(), used = new Set(), v = state.rep.valores;
  const sheetName = s => { let n = String(s||"Controle").replace(/[\\/?*[\]:]/g,"").slice(0,31) || "Controle", k = 2; while(used.has(n)) n = n.slice(0,28)+" "+(k++); used.add(n); return n; };
  if(groups.length>1){
    const H = m => Math.round(m/60*10000)/10000, by = state.rep.by;
    const aoa = [[`Resumo por ${DIMS[by].label.toLowerCase()} - ${repTitle()}`], [DIMS[by].label.toUpperCase(),"OS","HORAS",`EXTRA ${pct50()}`,`EXTRA ${pct100()}`,...(v?["VALOR"]:[])]];
    groups.forEach(g=>{ const t=sumCalc(g.rows); aoa.push([g.label, g.rows.length, H(t.total), H(t.e50), H(t.e100), ...(v?[t.valor]:[])]); });
    const t = sumCalc(all); aoa.push(["TOTAL", all.length, H(t.total), H(t.e50), H(t.e100), ...(v?[t.valor]:[])]);
    const ws = X.utils.aoa_to_sheet(aoa);
    for(let R=2; R<aoa.length; R++) for(let c=2; c<=5; c++){ const cell = ws[X.utils.encode_cell({r:R,c})]; if(cell && cell.t==="n") cell.z = c===5 ? '"R$" #,##0.00' : "0.00"; }
    ws["!cols"] = [28,6,10,10,10,14].map(w=>({wch:w}));
    X.utils.book_append_sheet(wb, ws, sheetName("Resumo"));
  }
  groups.forEach(g=>X.utils.book_append_sheet(wb, xlsxSheet(X, g.rows), sheetName(g.key!=null ? g.label : (oneOf(g.rows,"prof") || "Controle"))));
  const buf = X.write(wb, {type:"array", bookType:"xlsx"});
  offerFile(`controle-ordens-${repFileTag()}.xlsx`, new Blob([buf]));
}

/* ---------- FECHAMENTOS ---------- */
function fechRows(de, ate, emp, prof){ return state.ap.filter(e=>e.data>=de && e.data<=ate && !e.orcId && !e.andamento && (!emp || empOf(e)===emp) && (!prof || e.profissional===prof)); }
/* ---------- lembretes (notificações no celular) ---------- */
const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
let pedidoInstalar = null;
window.addEventListener("beforeinstallprompt", e=>{ e.preventDefault(); pedidoInstalar = e; scheduleRender(); });
window.addEventListener("appinstalled", ()=>{ pedidoInstalar = null; toast("App instalado. Abra o GAAP pelo ícone na tela inicial."); scheduleRender(); });
const ehAndroid = () => /android/i.test(navigator.userAgent);
function instalarHtml(){
  if(instalado()) return "";
  if(pedidoInstalar) return `<div class="banner"><span>Instale o GAAP no celular: abre pelo ícone, em tela cheia, e funciona sem internet.</span><button class="btn sm primary" data-act="instalarApp">Instalar app</button></div>`;
  if(ehAndroid()) return `<div class="banner"><span>Para instalar no Android: no Chrome, toque nos ⋮ (três pontos) → <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</span></div>`;
  return "";
}
const instalado = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
const pushSuportado = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
function b64u(s){ const p = "=".repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g,"+").replace(/_/g,"/")); return Uint8Array.from(b, c=>c.charCodeAt(0)); }
async function pushEstado(){
  if(!pushSuportado()) return;
  try{ const reg = await navigator.serviceWorker.register("/sw.js"); const sub = await reg.pushManager.getSubscription(); state.pushOn = false;
    if(sub){ const {data} = await sb.from("push_inscricoes").select("endpoint").eq("endpoint", sub.endpoint).maybeSingle(); state.pushOn = !!data; }
    // permissão já dada neste aparelho: ativa sozinho, sem precisar tocar em nada
    if(!state.pushOn && Notification.permission==="granted" && window.GAAP_CONFIG?.vapidPublica){
      const s2 = sub || await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64u(window.GAAP_CONFIG.vapidPublica)});
      const {error} = await sb.from("push_inscricoes").upsert({endpoint:s2.endpoint, sub:s2.toJSON(), aparelho:navigator.userAgent.slice(0,140)});
      if(!error){ state.pushOn = true; } }
    if(state.view==="painel" || state.worker){ state.rendered = null; render(); }
  }catch(err){}
}
// faixa no início: um toque para ativar os lembretes (o celular exige o toque da pessoa)
function pushConvite(){
  let fora = ""; try{ fora = localStorage.getItem("gaap-push-depois")||""; }catch(e){}
  if(state.pushOn || fora===today()) return "";
  if(!pushSuportado()) return ehIOS() && !instalado() ? `<div class="banner"><span>🔔 Para receber os lembretes no iPhone, instale o app: Safari → <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>, e abra por lá.</span><button class="btn sm" data-act="pushDepois">Agora não</button></div>` : "";
  if(Notification.permission!=="default") return "";
  return `<div class="banner"><span>🔔 <b>Ative os lembretes neste celular</b> para ser avisado ${state.worker?"quando faltar lançar OS ou ficar cronômetro aberto":"do resumo do dia, do fechamento do dia 20 e de documentos vencendo"}.</span><div class="row"><button class="btn sm primary" data-act="pushAtivar">Ativar</button><button class="btn sm" data-act="pushDepois">Agora não</button></div></div>`;
}
function lembretesHtml(){
  let corpo;
  if(!pushSuportado()) corpo = ehIOS() && !instalado()
    ? `<p style="margin:0">No iPhone os lembretes só funcionam com o app instalado:</p><ol style="margin:4px 0 0 18px;padding:0"><li>Abra este endereço no <b>Safari</b>.</li><li>Toque em <b>Compartilhar</b> (quadrado com seta) → <b>Adicionar à Tela de Início</b>.</li><li>Abra o GAAP pelo ícone novo e volte aqui para ativar.</li></ol>`
    : `<p class="muted" style="margin:0">Este navegador não aceita notificações. No iPhone, instale o app pela Tela de Início (Safari → Compartilhar → Adicionar à Tela de Início).</p>`;
  else if(Notification.permission==="denied") corpo = `<p style="margin:0">As notificações estão bloqueadas para este app. ${ehAndroid() ? (instalado() ? "Segure o ícone do GAAP → <b>Informações do app</b> → <b>Notificações</b> → permitir" : "No Chrome, toque no ícone ao lado do endereço → <b>Permissões</b> → <b>Notificações</b> → permitir") : "Libere em Ajustes do celular → Notificações → GAAP"} e toque em Ativar de novo.</p><div class="row"><button class="btn" data-act="pushAtivar">Ativar de novo</button></div>`;
  else if(state.pushOn) corpo = `<p style="margin:0"><span class="pill good">Ativado neste aparelho</span></p><div class="row"><button class="btn" data-act="pushTestar">Enviar um teste</button><button class="btn" data-act="pushDesativar">Desativar</button></div>`;
  else corpo = `<div class="row"><button class="btn primary" data-act="pushAtivar">Ativar lembretes neste aparelho</button></div>`;
  return `<div class="panel form" id="lembretes"><h3>Lembretes no celular</h3>
    <p class="muted" style="margin:0">${state.worker ? "Uns 20 minutos depois do fim do expediente, se você não tiver lançado as OS do dia (ou se esqueceu um cronômetro aberto), o celular avisa." : "Uns 20 minutos depois do fim do expediente você recebe um resumo: quem ficou sem lançar, cronômetros abertos e cadastros aguardando liberação. Cada funcionário ativa no próprio celular."}</p>
    ${corpo}</div>`;
}
const emAndamento = () => state.ap.filter(e=>e.andamento && (!state.worker || e.profissional===state.me)).sort((a,b)=>(a.data+a.inicio).localeCompare(b.data+b.inicio));
function decorrido(e){ const ini = parseYmd(e.data); ini.setHours(0, hm(e.inicio)); return Math.max(0, Math.floor((Date.now()-ini.getTime())/60000)); }
function cronoBar(){
  const ls = emAndamento(); if(!ls.length) return "";
  return `<div class="cronobar">${ls.map(e=>`<div class="crono"><span class="crono-dot"></span><span class="crono-txt"><b>OS ${esc(e.os||"s/n")}</b>${e.emergencia?' <span class="pill warn">Emergência</span>':""}${e.profissional&&!state.worker?` · ${esc(e.profissional)}`:""}<br><small>desde ${esc(e.inicio)}${e.data!==today()?` de ${fdate(e.data).slice(0,5)}`:""} · <span class="crono-t mono" data-id="${esc(e.id)}">${fh(decorrido(e))}</span></small></span>
    <span class="row" style="flex-wrap:nowrap"><button class="btn sm" data-act="cronoTrocar" data-id="${esc(e.id)}">Trocar de OS</button><button class="btn sm primary" data-act="cronoEncerrar" data-id="${esc(e.id)}">Encerrar</button></span></div>`).join("")}</div>`;
}
setInterval(()=>{ document.querySelectorAll(".crono-t").forEach(el=>{ const e = state.ap.find(x=>x.id===el.dataset.id); if(e) el.textContent = fh(decorrido(e)); }); }, 30000);
function cronoForm(pre={}){
  const ps = profs(), used = {}; [...state.ap].sort((a,b)=>(b.data+b.inicio).localeCompare(a.data+a.inicio)).forEach(e=>{ if(e.os && !used[e.os]) used[e.os] = e.descricao||""; }); osSugestoes(used);
  let last = []; try{ last = JSON.parse(localStorage.getItem("gaap-last-prof")||"[]"); }catch(err){}
  const quem = pre.profs || last.filter(n=>ps.includes(n));
  return `<header><h2>${pre.troca?"Trocar de OS":"Iniciar OS agora"}</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <form class="form" id="cronoForm">
    <p class="muted" style="margin:0">O início fica marcado agora (${nowHM()}). Quando terminar, toque em <b>Encerrar</b> na faixa do topo${pre.troca?"":" ou em <b>Trocar de OS</b> para passar direto para a próxima"}.</p>
    <div class="grid2"><label class="field"><span>Nº da OS</span><input id="cr-os" list="os-list" inputmode="numeric" placeholder="Ex.: 2165557"></label><label class="field"><span>ID TracOS</span><input id="cr-tid" inputmode="numeric" maxlength="40" placeholder="ID do papel"></label><input type="hidden" id="cr-nota"><div class="field" style="grid-column:1/-1">${papelBtn("cr")}</div>
    <label class="field"><span>Unidade</span>${unidCampo('id="cr-unid"', pre.emp||lastEmp(), pre.unid, "Selecione a unidade")}</label></div>
    <label class="field"><span>Serviço</span><input id="cr-desc" placeholder="Pode completar depois" value="${esc(pre.desc||"")}"></label>
    ${state.worker?"":`<label class="field"><span>Empresa</span><input id="cr-emp" list="emp-list" value="${esc(pre.emp||lastEmp())}"><datalist id="emp-list">${dimVals("emp").map(v=>`<option value="${esc(v)}">`).join("")}</datalist></label>`}
    ${ps.length && !state.worker?`<div class="field"><span>Quem está na OS</span><div class="filters" style="margin:0">${ps.map(n=>`<label class="chipcheck"><input type="checkbox" name="cr-prof" value="${esc(n)}" ${quem.includes(n)?"checked":""}><span>${esc(n)}</span></label>`).join("")}</div></div>`:""}
    <label class="check"><input type="checkbox" id="cr-emerg" ${pre.emerg?"checked":""}> Chamado de emergência</label>
    <div class="grid2 emergbox" id="cr-acion" ${pre.emerg?"":"hidden"}><label class="field"><span>Quem acionou</span><input id="cr-ac-por" list="acion-list" value="${esc(pre.acPor||"")}"></label><label class="field"><span>Como</span><select id="cr-ac-meio"><option value="">—</option>${MEIOS.map(m=>`<option ${pre.acMeio===m?"selected":""}>${m}</option>`).join("")}</select></label><label class="field" style="grid-column:1/-1"><span>Motivo / equipamento</span><input id="cr-ac-mot"></label></div>
    <datalist id="acion-list">${acionadores().map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
    <datalist id="os-list">${Object.entries(used).slice(0,80).map(([o,ds])=>`<option value="${esc(o)}">${esc(ds)}</option>`).join("")}</datalist>
    <footer><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" type="submit">▶ Iniciar agora</button></footer>
  </form>`;
}
async function encerrarOS(e, quando){
  const lk = lockOf(e.data, empOf(e), e.profissional); if(lk) throw {code:"db", message:`A OS ${e.os||"s/n"} está num período já fechado (${lk.numero}). Peça ao responsável para ajustar.`};
  if(e.data!==today()) throw {code:"db", message:`A OS ${e.os||"s/n"} ficou aberta desde ${fdate(e.data).slice(0,5)} às ${e.inicio}. Toque em Encerrar na faixa e informe a hora real de término.`};
  let f = quando || nowHM();
  if(e.data===today() && hm(f)<=hm(e.inicio)){
    if(quando){ await removeAp(e); return null; } // trocou no mesmo minuto: nada foi trabalhado nela
    f = hhmm(Math.min(1439, hm(e.inicio)+1));
  }
  const novo = {...e, fim:f}; delete novo.andamento; await save("apontamentos", novo); return novo;
}
// onde o técnico estava ao iniciar a OS (se o celular permitir; nunca trava o lançamento)
function localizacao(){ return new Promise(res=>{ if(!navigator.geolocation) return res(null); let ok = false; const t = setTimeout(()=>{ if(!ok) res(null); }, 7000);
  try{ navigator.geolocation.getCurrentPosition(p=>{ ok = true; clearTimeout(t); res({lat:Math.round(p.coords.latitude*1e6)/1e6, lng:Math.round(p.coords.longitude*1e6)/1e6, acc:Math.round(p.coords.accuracy||0), em:new Date().toISOString()}); }, ()=>{ ok = true; clearTimeout(t); res(null); }, {enableHighAccuracy:true, timeout:6500, maximumAge:60000}); }catch(e){ res(null); } }); }
async function submitCrono(){
  const os = $("#cr-os").value.trim(), emp = state.worker ? (state.cfg.contratante||"") : $("#cr-emp").value.trim();
  if(!os && osObrigatoria(emp)){ toast(`A ${emp} exige o nº da OS.`); return; }
  const quem = state.worker ? [state.me] : (profs().length ? [...document.querySelectorAll('input[name="cr-prof"]:checked')].map(x=>x.value) : [""]);
  if(!quem.length){ toast("Marque quem está na OS."); return; }
  const agora = nowHM(), data = today(), lk = lockOf(data, emp); if(lk){ toast(lockMsg(lk)); return; }
  const em = $("#cr-emerg").checked;
  const base = {...(state.worker ? {} : rateFor(emp, data)), data, inicio:agora, fim:"", andamento:true, tipo:"auto", os, tracos:limpaTracos($("#cr-tid")?.value), ...($("#cr-nota")?.value?{nota:$("#cr-nota").value}:{}), descricao:$("#cr-desc").value.trim(), cliente:$("#cr-unid").value.trim(), empresa:emp, emergencia:em, criadoEm:new Date().toISOString(),
    ...(em?{acion:{por:$("#cr-ac-por").value.trim(), as:state.chamadoAt?.as || agora, meio:$("#cr-ac-meio").value, motivo:$("#cr-ac-mot").value.trim()}}:{})};
  const geo = await localizacao(); if(geo) base.geo = geo;
  try{
    const velhos = state.ap.filter(x=>x.andamento && x.data!==data && quem.includes(x.profissional||""));
    if(velhos.length){ const v = velhos[0]; toast(`A OS ${v.os||"s/n"} ficou aberta desde ${fdate(v.data).slice(0,5)} às ${v.inicio}. Encerre ela primeiro (faixa do topo) informando a hora real de término.`); return; }
    for(const pr of quem){ for(const r of state.ap.filter(x=>x.andamento && x.profissional===pr)) await encerrarOS(r, agora);
      await save("apontamentos", {...base, id: (state.crIds ||= {})[pr||"_"] ||= uid(), profissional:pr}); }
    if(state.chamadoAt){ const ch = state.chamadoAt; state.chamadoAt = null; await sb.rpc("atender_chamado", {p_id:ch.id, p_os:os}).catch(()=>{}); carregarChamados(); }
    state.crIds = null; try{ if(quem[0]) localStorage.setItem("gaap-last-prof", JSON.stringify(quem)); }catch(err){}
    state.modalDirty = false; closeModal(); render(); toast(`OS ${os||"s/n"} iniciada às ${agora}.`);
  }catch(err){ toast(writeErr(err)); }
}
function nextFech(ate){ const y = (ate||today()).slice(0,4); const n = state.fech.map(f=>f.numero||"").filter(x=>x.startsWith(`F-${y}-`)).map(x=>+x.split("-")[2]||0); return `F-${y}-${String((n.length?Math.max(...n):0)+1).padStart(3,"0")}`; }
const fechRecebido = f => state.rec.filter(r=>r.origem==="fech" && r.fechId===f.id).reduce((s,r)=>s+recBruto(r),0);
const fechGlosa = f => (f.glosas||[]).reduce((s,g)=>s+numIn(g.valor),0);
const fechDevido = f => Math.round(((+f.valor||0) + (+f.reemb||0) - fechGlosa(f))*100)/100;
const fechSaldo = f => Math.max(0, Math.round((fechDevido(f) - fechRecebido(f))*100)/100);
const diasEntre = (a,b) => Math.round((parseYmd(b)-parseYmd(a))/864e5);
function fechVenc(f){ if(f.vencimento) return f.vencimento; const pz = ficha(f.empresa||state.cfg.contratante||"").prazo; return ymd(addDays(parseYmd(f.enviadoEm||f.ate||today()), pz==null||pz===""?30:+pz)); }
function fechSituacao(f){
  const sd = fechSaldo(f), rc = fechRecebido(f); if(sd<=0.005) return ["good","Recebido"];
  const d = diasEntre(fechVenc(f), today());
  if(d>0) return ["bad", `Vencido há ${d} dia${d>1?"s":""}${rc>0?" · parcial":""}`];
  return [rc>0?"warn":"info", d===0?"Vence hoje":`Vence em ${-d} dia${d<-1?"s":""}${rc>0?" · parcial":""}`];
}
const despCobrada = x => state.fech.some(f=>(f.despIds||[]).includes(x.id));
function despReemb(de, ate, emp){ return state.desp.filter(x=>x.reembolsavel && !x.orcId && x.data<=ate && !despCobrada(x) && (!emp || chaveEmp(x.empresa||state.cfg.contratante||"")===chaveEmp(emp))); }
const despValor = x => Math.round((x.tipo==="Km rodado" ? numIn(x.km)*numIn(x.valorKm) : numIn(x.valor))*100)/100;
function fechAlterado(f){ if(!f.snap) return false; const cur = fechRows(f.de, f.ate, f.empresa||"", f.profissional||""); return cur.length!==f.snap.aps.length || Math.abs(sumCalc(cur).valor - (+f.valor||0)) > 0.01; }
function fechConflict(de, ate, emp, prof){ return state.fech.find(f=>f.de<=ate && f.ate>=de && (!f.empresa || !emp || f.empresa===emp) && (!f.profissional || !prof || f.profissional===prof)); }
function fechFormHtml(){
  const r = state.rep, emps = dimVals("emp"), cur = r.f.emp!==ALL ? r.f.emp : (emps.length===1 ? emps[0] : "");
  return `<header><h2>Fechar período</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <form class="form" id="fechForm">
    <div class="grid3">
      <label class="field"><span>De</span><input type="date" id="fx-de" value="${esc(r.de)}" required></label>
      <label class="field"><span>Até</span><input type="date" id="fx-ate" value="${esc(r.ate)}" required></label>
      <label class="field"><span>Empresa</span><select id="fx-emp"><option value="">Todas as empresas</option>${emps.map(v=>`<option ${v===cur?"selected":""}>${esc(v)}</option>`).join("")}</select></label>
    </div>
    <div id="fx-prev" class="preview"></div>
    <p class="muted" style="margin:0">Depois de fechado, as OS desse período ficam travadas, inclusive para os funcionários. O fechamento aparece no Financeiro como enviado, aguardando pagamento. Se precisar corrigir algo, reabra por lá.</p>
    <footer><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" type="submit" id="fx-ok">Fechar (1 PDF por funcionário)</button></footer>
  </form>`;
}
// um fechamento por funcionário: nunca mistura dois profissionais no mesmo fechamento
function fechGrupos(de, ate, emp){ const g = new Map(); fechRows(de, ate, emp).forEach(e=>{ const k = e.profissional||""; if(!g.has(k)) g.set(k, []); g.get(k).push(e); });
  return [...g.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([prof, rows])=>({prof, rows, cf:fechConflict(de, ate, emp, prof)})); }
function updateFech(){
  const de = $("#fx-de")?.value, ate = $("#fx-ate")?.value, emp = $("#fx-emp")?.value || ""; if(!de || !ate) return;
  const gs = fechGrupos(de, ate, emp), livres = gs.filter(g=>!g.cf), rows = livres.flatMap(g=>g.rows), t = sumCalc(rows), fechados = gs.filter(g=>g.cf), cf = gs.length && !livres.length ? fechados[0].cf : null;
  $("#fx-prev").innerHTML = `<div class="line"><span>${rows.length} OS · ${new Set(rows.map(e=>e.profissional).filter(Boolean)).size} funcionário(s)</span><span class="mono">${fdec(t.total)} h</span></div>
    <div class="line"><span class="muted">Normal ${fdec(t.n)} h · Extra ${fdec(t.e50+t.e100)} h</span><span class="mono"><b>${brl(t.valor)}</b></span></div>
    ${livres.length?`<div class="line"><span class="muted">Serão ${livres.length} fechamento(s), um por funcionário: ${livres.map(g=>`${esc(g.prof||"sem nome")} (${brl(sumCalc(g.rows).valor)})`).join(", ")}</span></div>`:""}
    ${fechados.length && livres.length?`<div class="line"><span class="muted">Já fechado(s): ${fechados.map(g=>`${esc(g.prof||"sem nome")} (${esc(g.cf.numero)})`).join(", ")}</span></div>`:""}
    ${cf?`<div class="warnbox">Esse período já tem o fechamento ${esc(cf.numero)} (${fdate(cf.de)} a ${fdate(cf.ate)}). Escolha outras datas.</div>`:""}
    ${!rows.length?`<div class="warnbox">Não há OS nesse período.</div>`:""}
    ${fechPendencias(de, ate, emp, rows)}`;
  const abertas = state.ap.filter(e=>e.andamento && e.data>=de && e.data<=ate && (!emp || chaveEmp(empOf(e))===chaveEmp(emp)));
  if(abertas.length) $("#fx-prev").insertAdjacentHTML("beforeend", `<div class="warnbox">Não dá para fechar com cronômetro aberto no período: ${abertas.map(e=>`OS ${esc(e.os||"s/n")} (${esc(e.profissional||"")}, ${fdate(e.data).slice(0,5)})`).join(", ")}. Encerre antes.</div>`);
  $("#fx-ok").disabled = !!cf || !rows.length || abertas.length>0;
}
document.addEventListener("change", e=>{ if(e.target.closest && e.target.closest("#fechForm")) updateFech(); });
function fechPendencias(de, ate, emp, rows){
  const conf = conferencia(de, ate), sobre = overlaps(rows), semOS = rows.filter(e=>!e.os), forc = rows.filter(e=>e.tipo && e.tipo!=="auto");
  const itens = [];
  if(conf.length) itens.push(`${conf.length} dia(s) útil(eis) com horário da jornada sem lançamento (${fh(conf.reduce((s,x)=>s+x.falta,0))}). Confira no Painel.`);
  if(sobre.size) itens.push(`${sobre.size} OS com horário sobreposto.`);
  if(semOS.length) itens.push(`${semOS.length} lançamento(s) sem nº de OS.`);
  if(forc.length) itens.push(`${forc.length} lançamento(s) com cálculo forçado (normal/50%/100%).`);
  const longas = rows.filter(e=>calc(e).total>12*60); if(longas.length) itens.push(`${longas.length} lançamento(s) com mais de 12 h — confira se não é cronômetro esquecido aberto.`);
  const and = state.ap.filter(e=>e.andamento && e.data>=de && e.data<=ate && (!emp || chaveEmp(empOf(e))===chaveEmp(emp))); if(and.length) itens.push(`${and.length} OS ainda em andamento (cronômetro aberto) — encerre antes de fechar, senão ficam de fora.`);
  return itens.length ? `<div class="warnbox"><b>Antes de fechar, confira:</b><br>${itens.map(esc).join("<br>")}</div>` : `<div class="line"><span class="muted">Conferência: nenhuma pendência encontrada.</span></div>`;
}
async function submitFech(){
  const de = $("#fx-de").value, ate = $("#fx-ate").value, emp = $("#fx-emp").value || "";
  if(!de || !ate || de>ate){ toast("Confira as datas."); return; }
  const gs = fechGrupos(de, ate, emp).filter(g=>!g.cf); if(!gs.length){ toast("Não há OS em aberto nesse período."); return; }
  const C = state.cfg, rbAll = despReemb(de, ate, emp), cfgSnap = clone({jornada:C.jornada, almoco:C.almoco, tolerancia:C.tolerancia, feriados:C.feriados, valorHora:C.valorHora, extraPct:C.extraPct, feriadoPct:C.feriadoPct, taxas:C.taxas}), feitos = [];
  $("#fx-ok").disabled = true;
  try{
    for(const [i, g] of gs.entries()){
      // despesas reembolsáveis vão no fechamento de quem lançou (ou no primeiro, se não tiver nome)
      const rb = rbAll.filter(x=>x.profissional ? x.profissional===g.prof || (!gs.some(o=>o.prof===x.profissional) && i===0) : i===0);
      const t = sumCalc(g.rows);
      const f = {numero:nextFech(ate), de, ate, empresa:emp, profissional:g.prof, os:g.rows.length, horas:t.total, valor:t.valor, enviadoEm:today(), criadoEm:new Date().toISOString(),
        reemb: Math.round(rb.reduce((s,x)=>s+despValor(x),0)*100)/100, despIds: rb.map(x=>x.id), snap:{aps: clone(g.rows), desp: clone(rb), cfg: cfgSnap}};
      f.vencimento = fechVenc(f);
      f.id = await save("fechamentos", f); if(!state.fech.find(x=>x.id===f.id)) state.fech = [...state.fech, f]; feitos.push(f);
    }
  }catch(err){ $("#fx-ok").disabled = false; toast(writeErr(err)); if(!feitos.length) return; }
  closeModal(); toast(feitos.length>1 ? `${feitos.length} fechamentos criados (um por funcionário)` : `Fechamento ${feitos[0].numero} criado`);
  if(feitos.length===1) return fechArquivo(feitos[0]);
  openModal(`<header><h2>${feitos.length} fechamentos criados</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
    <div class="form"><p class="muted" style="margin:0">Um PDF por funcionário. Toque em cada um para ver e enviar, ou junte todos num PDF só.</p>
    <div class="row"><button class="btn primary" data-act="fechJuntos" data-id="${esc(feitos[0].id)}">Todos em um PDF</button></div>
    ${feitos.map(f=>`<div class="line"><span><b>${esc(f.profissional||"Sem nome")}</b> · <span class="mono">${esc(f.numero)}</span> · ${brl(f.valor)}</span><span class="row"><button class="btn sm primary" data-act="${ficha(f.empresa||state.cfg.contratante||"").codigo?"terceirosPdf":"fechPdfBtn"}" data-id="${esc(f.id)}">PDF</button>${ficha(f.empresa||state.cfg.contratante||"").codigo?`<button class="btn sm" data-act="terceirosXlsx" data-id="${esc(f.id)}">Excel</button>`:""}</span></div>`).join("")}</div>`);
}
function fechArquivo(f){ return ficha(f.empresa||state.cfg.contratante||"").codigo ? fechTerceiros(f, "pdf") : fechPdf(f); }
// nome do arquivo começa pelo funcionário e pela empresa
function fechNomeArq(f, resto){ return [f.profissional, f.empresa||state.cfg.contratante||""].filter(Boolean).map(slug).join("-") + "-" + resto; }
async function fechPdf(f, atual){
  const saved = clone(state.rep), ap = state.ap, desp = state.desp, cfg = state.cfg;
  state.rep = {...state.rep, modo:"periodo", orc:false, os:"", de:f.de, ate:f.ate, f:{prof:f.profissional||ALL, unid:ALL, emp:f.empresa||ALL}, fechNum:f.numero, fechArq:f.profissional ? fechNomeArq(f, `fechamento-${f.numero}-${f.de}_a_${f.ate}`) : "", reembIds:f.despIds||null};
  if(f.snap && !atual){ state.ap = f.snap.aps; state.desp = f.snap.desp||[]; state.cfg = {...cfg, ...f.snap.cfg}; holCache = {}; mmCache.ref = null; }
  try{ await repPdf(); } finally { state.rep = saved; state.ap = ap; state.desp = desp; state.cfg = cfg; holCache = {}; mmCache.ref = null; }
}
/* ---------- fechamento para o fiscal: modelo "FECHAMENTO DE TERCEIROS - HORAS E VALORES" (pedido pelo fiscal da Brejeiro) ---------- */
const COMPET = ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
// "1001 - ANÁPOLIS" → centro 1001, cidade ANÁPOLIS
function centroDe(u){ const m = String(u||"").match(/^\s*(\d{2,})\s*[-–]\s*(.+)$/); return m ? {centro:m[1], cidade:m[2].trim().toUpperCase()} : {centro:"", cidade:String(u||"").trim().toUpperCase()}; }
// linhas por OS: horas e valores por tipo (das OS do fechamento ou das linhas importadas da planilha aprovada)
function linhasTerceiros(f){
  if(f.itens) return f.itens.map(x=>({...x, unid:x.unid||f.unidade||"", tracos:x.tracos || ordemDe(x.os, f.empresa)?.tracos || ""}));
  const aps = (f.snap?.aps || fechRows(f.de, f.ate, f.empresa||"", f.profissional||"")).filter(e=>!e.andamento && !e.orcId).slice().sort((a,b)=>(a.data+a.inicio).localeCompare(b.data+b.inicio));
  const g = new Map();
  aps.forEach(e=>{ const k = `${(e.os||"").trim()||"s/n-"+e.id}|${e.cliente||""}`, c = calc(e);
    const o = g.get(k) || {os:(e.os||"").trim(), tracos:"", desc:"", unid:e.cliente||"", hn:0, vn:0, h50:0, v50:0, h100:0, v100:0, not:0, notv:0, total:0};
    if(!o.desc && e.descricao) o.desc = e.descricao; if(!o.tracos && e.tracos) o.tracos = e.tracos;
    o.hn += c.n/60; o.vn += c.vn; o.h50 += c.e50/60; o.v50 += c.v50; o.h100 += c.e100/60; o.v100 += c.v100; o.not += c.not/60; o.notv += c.vnot; o.total += c.valor; g.set(k, o); });
  const r2 = v => Math.round(v*100)/100;
  return [...g.values()].map(o=>({...o, tracos:o.tracos || ordemDe(o.os, f.empresa)?.tracos || "", desc:(o.desc||"").toUpperCase(), hn:r2(o.hn), vn:r2(o.vn), h50:r2(o.h50), v50:r2(o.v50), h100:r2(o.h100), v100:r2(o.v100), not:r2(o.not), notv:r2(o.notv), total:r2(o.total)}));
}
function fechIrmaos(f){ return state.fech.filter(x=>x.profissional && x.de===f.de && x.ate===f.ate && chaveEmp(x.empresa||"")===chaveEmp(f.empresa||"")).sort((a,b)=>(a.profissional||"").localeCompare(b.profissional||"")); }
// todos os funcionários do período num PDF só: capa com o resumo + as folhas de cada um
async function fechJuntosPdf(fs){
  if(!fs.length) return; const doc = pdfDoc(true); if(!doc) return;
  const f0 = fs[0], emp = f0.empresa || state.cfg.contratante || "", W = pw(doc), tot = fs.reduce((s,f)=>s+(+f.valor||0),0);
  doc.setFont("helvetica","bold"); doc.setFontSize(13); doc.setTextColor(0); doc.text("FECHAMENTO DE TERCEIROS - RESUMO POR FUNCIONÁRIO", W/2, 14, {align:"center"});
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.text(`${ficha(emp).nomeFech || state.cfg.empresa.nome}  ·  ${emp}  ·  período ${fdate(f0.de)} a ${fdate(f0.ate)}`, W/2, 20, {align:"center"});
  doc.autoTable({startY:26, theme:"grid", margin:{left:30, right:30}, head:[["Funcionário","Fechamento","OS","Horas","Valor"]],
    body: fs.map(f=>[f.profissional||"", f.numero, String(f.os||0), fdec(+f.horas||0), "R$ "+n2(f.valor)]),
    foot:[["TOTAL", `${fs.length} fechamento(s)`, String(fs.reduce((s,f)=>s+(+f.os||0),0)), fdec(fs.reduce((s,f)=>s+(+f.horas||0),0)), "R$ "+n2(tot)]],
    styles:{fontSize:9, cellPadding:1.6, textColor:0}, headStyles:{fillColor:[235,235,235], textColor:0}, footStyles:{fillColor:[235,235,235], textColor:0, fontStyle:"bold"}, columnStyles:{2:{halign:"right"},3:{halign:"right"},4:{halign:"right"}}});
  for(const f of fs){ const d = terceirosDados(f); if(!d) continue; for(const g of d.grupos.values()){ doc.addPage(); terceirosPagina(doc, g, d.cab, f); } }
  await offerFile(`todos-funcionarios-${slug(emp)}-${(f0.ate||"").slice(0,7)}.pdf`, doc.output("blob"));
}
function terceirosDados(f){
  const cfg = state.cfg;
  if(f.snap && !f.itens){ state.cfg = {...cfg, ...f.snap.cfg}; holCache = {}; calcCache = new WeakMap(); }
  let linhas; try{ linhas = linhasTerceiros(f); } finally { state.cfg = cfg; holCache = {}; calcCache = new WeakMap(); }
  if(!linhas.length) return null;
  const emp = f.empresa || state.cfg.contratante || "", F = ficha(emp), mes = (f.competencia || f.ate || "").slice(0,7);
  const cab = {nome: F.nomeFech || state.cfg.empresa.nome, codigo: F.codigo || "", compet: COMPET[+mes.slice(5,7)-1] || "", ano: mes.slice(0,4)};
  // uma folha por centro (unidade)
  const grupos = new Map(); linhas.forEach(l=>{ const c = centroDe(l.unid); const k = c.centro || c.cidade; if(!grupos.has(k)) grupos.set(k, {...c, linhas:[]}); grupos.get(k).linhas.push(l); });
  const nome = f.profissional ? fechNomeArq(f, `fechamento-${mes}-${f.numero}`) : `fechamento-terceiros-${slug(emp)}-${mes}`;
  return {grupos, cab, nome};
}
async function fechTerceiros(f, fmt){
  const d = terceirosDados(f); if(!d){ toast("Esse fechamento não tem OS."); return; }
  const {grupos, cab, nome} = d;
  if(fmt==="xlsx") return terceirosXlsx(grupos, cab, nome, f);
  const doc = pdfDoc(true); if(!doc) return;
  let pg = 0; for(const g of grupos.values()){ if(pg++) doc.addPage(); terceirosPagina(doc, g, cab, f); }
  await offerFile(nome + ".pdf", doc.output("blob"));
}
const TC = ["hn","vn","h50","v50","h100","v100","not","notv","total"];
function totaisTerceiros(ls){ const t = {}; TC.forEach(k=>t[k] = Math.round(ls.reduce((s,l)=>s+(+l[k]||0),0)*100)/100); return t; }
const n2 = v => (Math.round((+v||0)*100)/100).toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2});
function terceirosPagina(doc, g, cab, f){
  const W = pw(doc), L = 8, R = W-8, t = f.itens && f.totais && grupos1(f) ? f.totais : totaisTerceiros(g.linhas);
  doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.setTextColor(0); doc.text("FECHAMENTO DE TERCEIROS - HORAS E VALORES", W/2, 12, {align:"center"});
  doc.setFontSize(7.5); const kv = [["NOME DA EMPRESA:", cab.nome], ...(f.profissional?[["FUNCIONÁRIO:", f.profissional.toUpperCase()]]:[]), ["EMPRESA:", cab.codigo], ["COMPETÊNCIA:", `${cab.compet}   ${cab.ano}`], ["CENTRO:", g.centro], ["CIDADE:", g.cidade]];
  kv.forEach(([k,v],i)=>{ doc.setFont("helvetica","bold"); doc.text(k, 34, 18+i*3.6, {align:"right"}); doc.setFont("helvetica","normal"); doc.text(String(v||""), 36, 18+i*3.6); });
  const z = "0,00", body = g.linhas.map(l=>[l.os||"", l.tracos ? "#"+l.tracos : "", l.cargo||"TERCEIRIZADO", l.desc||"", n2(l.dt), n2(l.dtv), n2(l.dc), n2(l.dcv), n2(l.km), n2(l.kmv), n2(l.hn), n2(l.vn), n2(l.h50), n2(l.v50), n2(l.h100), n2(l.v100), n2(l.not), n2(l.notv), n2(l.total)]);
  const H = (c, o={}) => ({content:c, ...o, styles:{halign:"center", valign:"middle", fontStyle:"bold"}});
  doc.autoTable({startY:f.profissional?39:36, margin:{left:L, right:8, bottom:8}, theme:"grid", tableWidth:R-L,
    head:[[H("ORDENS",{rowSpan:2}), H("ID TRACOS",{rowSpan:2}), H("CARGO",{rowSpan:2}), H("DESCRIÇÃO DO SERVIÇO",{rowSpan:2}), H("DIÁRIAS TRABALHADAS",{colSpan:2}), H("DIÁRIAS DE CUSTO",{colSpan:2}), H("KM RODADO",{colSpan:2}), H("HORAS NORMAIS",{colSpan:2}), H("HORAS EXTRAS 50%",{colSpan:2}), H("HORAS EXTRAS 100%",{colSpan:2}), H("ADICIONAL NOTURNO",{colSpan:2}), H("VALOR TOTAL DA ORDEM",{rowSpan:2})],
      ["Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$"].map(x=>H(x))],
    body, foot:[[{content:"TOTAIS", colSpan:4, styles:{halign:"left"}}, z, z, z, z, z, z, n2(t.hn), n2(t.vn), n2(t.h50), n2(t.v50), n2(t.h100), n2(t.v100), n2(t.not), n2(t.notv), n2(t.total)]],
    styles:{font:"helvetica", fontSize:g.linhas.length>32 ? 5.4 : 6, cellPadding:g.linhas.length>32 ? 0.45 : 0.8, textColor:0, lineColor:[150,150,150], lineWidth:0.1, overflow:"ellipsize"},
    headStyles:{fillColor:[235,235,235], textColor:0, fontSize:5.6, lineColor:[150,150,150], lineWidth:0.1, overflow:"linebreak"},
    footStyles:{fillColor:[235,235,235], textColor:0, fontStyle:"bold", halign:"right"},
    columnStyles:{0:{cellWidth:13, halign:"center"}, 1:{cellWidth:13, halign:"center"}, 2:{cellWidth:18.5}, 3:{cellWidth:46.5}, ...Object.fromEntries(Array.from({length:14},(_,i)=>[i+4, {halign:"right", cellWidth:(R-L-13-13-18.5-46.5-20)/14}])), 18:{halign:"right", cellWidth:20}}});
  let y = doc.lastAutoTable.finalY + 5; if(y > ph(doc)-44){ doc.addPage(); y = 15; }
  doc.autoTable({startY:y, margin:{left:L+20, right:W/2+10}, theme:"plain", head:[[{content:"RESUMO GERAL", colSpan:3, styles:{halign:"center", fontStyle:"bold", fontSize:8}}]],
    body:[["DIÁRIAS TRABALHADAS", "0,00", "R$ 0,00"], ["DIÁRIAS DE CUSTO", "0,00", "R$ 0,00"], ["KM RODADO", "0,00", "R$ 0,00"], ["HORAS NORMAIS", n2(t.hn), "R$ "+n2(t.vn)], ["HORAS EXTRAS 50%", n2(t.h50), "R$ "+n2(t.v50)], ["HORAS EXTRAS 100%", n2(t.h100), "R$ "+n2(t.v100)], ["ADICIONAL NOTURNO", n2(t.not), "R$ "+n2(t.notv)]],
    styles:{fontSize:6.5, cellPadding:0.6, textColor:0}, columnStyles:{0:{fontStyle:"bold"}, 1:{halign:"right"}, 2:{halign:"right"}}});
  const bx = W/2+30, bw = R-bx-10;
  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.text("VALOR TOTAL A PAGAR", bx + bw/2, y+3, {align:"center"});
  doc.setDrawColor(0); doc.setLineWidth(0.3); doc.rect(bx, y+6, bw, 16); doc.setFontSize(16); doc.text("R$ "+n2(t.total), bx + bw/2, y+16.5, {align:"center"});
  doc.setLineWidth(0.2); doc.line(bx+10, y+38, bx+bw-10, y+38); doc.setFont("helvetica","normal"); doc.setFontSize(7);
  const a = f.aprovacao; doc.text(a && a.aprovado!==false && a.nome ? `Aprovado: ${a.nome}${a.cargo?` - ${a.cargo}`:""}${a.em?` em ${fdate(String(a.em).slice(0,10))}`:""}` : "Aprovação (gerente / fiscal)", bx + bw/2, y+41.5, {align:"center"});
}
const grupos1 = f => new Set((f.itens||[]).map(l=>centroDe(l.unid||f.unidade).centro)).size<=1;
async function terceirosXlsx(grupos, cab, nome, f){
  if(!window.XLSX) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
  const X = window.XLSX, wb = X.utils.book_new();
  for(const g of grupos.values()){
    const t = f.itens && f.totais && grupos1(f) ? f.totais : totaisTerceiros(g.linhas), N = v => Math.round((+v||0)*100)/100;
    const aoa = [["","","","","","","","FECHAMENTO DE TERCEIROS - HORAS E VALORES"], ["NOME DA EMPRESA:", cab.nome], ...(f.profissional?[["FUNCIONÁRIO:", f.profissional.toUpperCase()]]:[]), ["EMPRESA:", cab.codigo], ["COMPETÊNCIA:", cab.compet, cab.ano], ["CENTRO:", g.centro], ["CIDADE:", g.cidade], [],
      ["ORDENS","ID TRACOS","CARGO","DESCRIÇÃO DO SERVIÇO","DIÁRIAS TRABALHADAS","","DIÁRIAS DE CUSTO","","KM RODADO","","HORAS NORMAIS","","HORAS EXTRAS 50%","","HORAS EXTRAS 100%","","ADICIONAL NOTURNO","","VALOR TOTAL DA ORDEM"],
      ["","","","","Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$",""],
      ...g.linhas.map(l=>[l.os||"", l.tracos ? "#"+l.tracos : "", l.cargo||"TERCEIRIZADO", l.desc||"", N(l.dt), N(l.dtv), N(l.dc), N(l.dcv), N(l.km), N(l.kmv), N(l.hn), N(l.vn), N(l.h50), N(l.v50), N(l.h100), N(l.v100), N(l.not), N(l.notv), N(l.total)]),
      ["TOTAIS","","","",0,0,0,0,0,0,N(t.hn),N(t.vn),N(t.h50),N(t.v50),N(t.h100),N(t.v100),N(t.not),N(t.notv),N(t.total)], [],
      ["RESUMO GERAL","","","","","","","","","","","","VALOR TOTAL A PAGAR"], ["DIÁRIAS TRABALHADAS","",0,0,"","","","","","","","",N(t.total)], ["DIÁRIAS DE CUSTO","",0,0], ["KM RODADO","",0,0], ["HORAS NORMAIS","",N(t.hn),N(t.vn)], ["HORAS EXTRAS 50%","",N(t.h50),N(t.v50)], ["HORAS EXTRAS 100%","",N(t.h100),N(t.v100)], ["ADICIONAL NOTURNO","",N(t.not),N(t.notv)]];
    const ws = X.utils.aoa_to_sheet(aoa);
    const hr = aoa.findIndex(r=>r[0]==="ORDENS"); // a linha "FUNCIONÁRIO:" (fechamento por funcionário) desce o cabeçalho
    ws["!merges"] = [[0,0],[1,1],[2,2],[3,3]].map(([c])=>[hr,c,hr+1,c]).concat([[4,5],[6,7],[8,9],[10,11],[12,13],[14,15],[16,17]].map(([a,b])=>[hr,a,hr,b]), [[hr,18,hr+1,18]]).map(([r1,c1,r2,c2])=>({s:{r:r1,c:c1},e:{r:r2,c:c2}}));
    ws["!cols"] = [{wch:10},{wch:10},{wch:14},{wch:44},...Array(14).fill({wch:9}),{wch:14}];
    const rr = aoa.findIndex(r=>r[0]==="RESUMO GERAL");
    for(let r=rr+1; r<aoa.length; r++) for(const c of [2,3,12]){ const cell = ws[X.utils.encode_cell({r,c})]; if(cell && typeof cell.v==="number") cell.z = "#,##0.00"; }
    for(let r=hr+2; r<aoa.length; r++) for(let c=4; c<19; c++){ const cell = ws[X.utils.encode_cell({r,c})]; if(cell && typeof cell.v==="number") cell.z = "#,##0.00"; }
    X.utils.book_append_sheet(wb, ws, (g.centro || g.cidade || "Fechamento").slice(0,31));
  }
  await offerFile(nome + ".xlsx", new Blob([X.write(wb, {type:"array", bookType:"xlsx"})], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
}
/* ---------- PDF ---------- */
const GREEN=[27,122,61], NAVY=[29,63,143], INK=[23,33,26], GREY=[95,105,98];
function pdfDoc(landscape){ if(!window.jspdf){ toast("Gerador de PDF ainda carregando. Tente em alguns segundos."); return null; } return new window.jspdf.jsPDF({unit:"mm",format:"a4",orientation:landscape?"landscape":"portrait"}); }
const pw = doc => doc.internal.pageSize.getWidth(), ph = doc => doc.internal.pageSize.getHeight();
function pdfHeader(doc, title, sub){
  const E = state.cfg.empresa, R = pw(doc)-14;
  try{ doc.addImage(LOGO,"JPEG",14,9,24,24); }catch(e){}
  doc.setTextColor(...INK); doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.text(E.nome||"",42,16);
  doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...GREY);
  doc.text(`CNPJ: ${E.cnpj||""}`,42,21.5); doc.text(`${E.email||""}  |  ${E.telefone||""}`,42,26); doc.text(`Montagens e manutenção mecânica industrial  |  ${E.cidade||""}`,42,30.5);
  doc.setTextColor(...NAVY); doc.setFont("helvetica","bold"); doc.setFontSize(12.5); doc.text(title,R,16,{align:"right"});
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(...GREY); (Array.isArray(sub)?sub:[sub]).forEach((s,i)=>doc.text(s,R,21.5+i*4.5,{align:"right"}));
  doc.setDrawColor(...GREEN); doc.setLineWidth(0.8); doc.line(14,36,R,36);
  return 43;
}
function pdfFooter(doc){
  const n = doc.getNumberOfPages(), E = state.cfg.empresa, R = pw(doc)-14, Y = ph(doc)-8;
  for(let i=1;i<=n;i++){ doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(...GREY); doc.setFont("helvetica","normal"); doc.text(`${E.nome} - CNPJ ${E.cnpj}`,14,Y); doc.text(`Página ${i} de ${n}`,R,Y,{align:"right"}); }
}
function ensure(doc,y,need){ if(y+need>ph(doc)-17){ doc.addPage(); return 20; } return y; }
function signature(doc, y, left, right){
  y = ensure(doc, y, 40);
  const R = pw(doc)-14, mid = pw(doc)/2;
  doc.setFont("helvetica","italic"); doc.setFontSize(9.5); doc.setTextColor(...INK); doc.text(`${state.cfg.empresa.cidade||"Anápolis GO"}, ${extenso()}.`,R,y,{align:"right"}); y += 22;
  doc.setDrawColor(...GREY); doc.setLineWidth(0.3); doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
  if(right){ doc.line(14,y,mid-11,y); doc.line(mid+11,y,R,y); doc.text(left,(14+mid-11)/2,y+4.5,{align:"center"}); doc.text(right,(mid+11+R)/2,y+4.5,{align:"center"}); }
  else { doc.line(mid-45,y,mid+45,y); doc.text(left,mid,y+4.5,{align:"center"}); }
  return y+10;
}
function repPdfSub(){ const r = state.rep; return [...(r.fechNum?[`Fechamento Nº ${r.fechNum}`]:[]), r.modo!=="dia"?`Período: ${fdate(r.de)} a ${fdate(r.ate)}`:`${WDL[parseYmd(r.dia).getDay()]}, ${fdate(r.dia)}`, `Emitido em ${fdate(today())}`]; }
async function imgData(id){
  try{
    await assinarFotos([id]);
    const res = await fetch(blobSrc(id)); if(!res.ok) throw 0; const b = await res.blob();
    const u0 = URL.createObjectURL(b);
    const im = await new Promise((ok,no)=>{ const i=new Image(); i.onload=()=>ok(i); i.onerror=no; i.src=u0; });
    const k = Math.min(1, 800/Math.max(im.naturalWidth, im.naturalHeight)), cv = document.createElement("canvas");
    cv.width = Math.round(im.naturalWidth*k); cv.height = Math.round(im.naturalHeight*k); cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u0);
    const url = cv.toDataURL("image/jpeg", 0.6);
    return {url, w:cv.width, h:cv.height, fmt:"JPEG"};
  }catch(e){ return null; }
}
async function pdfFotos(doc, rows){
  const ordem = {antes:0, durante:1, depois:2};
  const items = rows.flatMap(e=>(e.fotos||[]).map((id,k)=>({id, e, k, m:(e.fotoMeta||{})[id]||{}}))).sort((a,b)=>(a.e.os||"").localeCompare(b.e.os||"") || (a.e.data+a.e.inicio).localeCompare(b.e.data+b.e.inicio) || (ordem[a.m.tipo]??1)-(ordem[b.m.tipo]??1) || a.k-b.k); if(!items.length) return;
  doc.addPage(); let y = pdfHeader(doc, "REGISTRO FOTOGRÁFICO", repPdfSub()) + 2;
  const W = pw(doc), cols = 3, gap = 6, bw = (W-28-gap*(cols-1))/cols, bh = bw*0.68;
  let col = 0;
  for(const it of items){
    if(col===0 && y + bh + 10 > ph(doc)-14){ doc.addPage(); y = 20; }
    const x = 14 + col*(bw+gap), im = await imgData(it.id);
    doc.setDrawColor(205,212,201); doc.setLineWidth(0.2); doc.rect(x, y, bw, bh);
    if(im){ const k = Math.min(bw/im.w, bh/im.h), w = im.w*k, h = im.h*k; try{ doc.addImage(im.url, im.fmt, x+(bw-w)/2, y+(bh-h)/2, w, h); }catch(err){} }
    else { doc.setFontSize(8); doc.setTextColor(...GREY); doc.text("Foto indisponível", x+bw/2, y+bh/2, {align:"center"}); }
    doc.setFontSize(7.8); doc.setTextColor(...INK); doc.setFont("helvetica","normal");
    const quando = it.m.em ? new Date(it.m.em) : null, tp = TIPO_FOTO[it.m.tipo] || "";
    doc.text(doc.splitTextToSize(`${tp?tp+" · ":""}OS ${it.e.os||"s/n"} · ${quando?`${quando.toLocaleDateString("pt-BR")} ${pad(quando.getHours())}:${pad(quando.getMinutes())}`:fdate(it.e.data)} · ${it.e.descricao||""}`, bw)[0], x, y+bh+4);
    col++; if(col===cols){ col = 0; y += bh + 10; }
  }
}
async function pdfGroup(doc, rows){
  const cfg = state.cfg, t = sumCalc(rows), C = repCols(rows), days = repDays(rows);
  const nDias = days.filter(d=>d.rows.length).length, emp = oneOf(rows,"emp"), prof = oneOf(rows,"prof"), unid = oneOf(rows,"unid");
  let y = pdfHeader(doc, repHeading(rows).toUpperCase(), repPdfSub());
  doc.setFontSize(9.5); doc.setTextColor(...INK);
  const info = [["Prestador:", `${cfg.empresa.nome}${cfg.empresa.responsavel?" - "+cfg.empresa.responsavel:""}`]];
  if(emp){ const F = ficha(emp); info.push(["Contratante:", `${F.razao||emp}${F.cnpj?` - CNPJ ${F.cnpj}`:""}`]); }
  if(prof && !C.prof && profs().length) info.push(["Funcionário:", prof]);
  if(unid && !C.unid) info.push(["Unidade:", unid]);
  info.push(["Resumo:", `${nDias} ${nDias>1?"dias trabalhados":"dia trabalhado"} · ${rows.length} ordens de serviço · ${fdec(t.total)} horas`]);
  info.forEach(([a,b])=>{ doc.setFont("helvetica","bold"); doc.text(a,14,y); doc.setFont("helvetica","normal"); doc.text(b,40,y); y+=5; });
  y += 1;
  const head = [repHead(C)], ncols = head[0].length, body = [], shade = [244,246,243];
  days.forEach(d=>{
    const hol = holidayName(d.data), sun = parseYmd(d.data).getDay()===0, k = Math.max(1,d.rows.length);
    const dia = {content: wdl(d.data)+(hol?`\n${hol}`:""), rowSpan:k, styles:{halign:"center"}}, data = {content: fdate(d.data), rowSpan:k, styles:{halign:"center"}};
    if(!d.rows.length){ const st = (sun||hol) ? {fillColor:shade} : {}; body.push([{content:"",styles:st}, {...dia, styles:{...dia.styles,...st,textColor:GREY}}, {...data, styles:{...data.styles,...st,textColor:GREY}}, {content:"", colSpan:ncols-3, styles:st}]); return; }
    d.rows.forEach((e,i)=>{ const c = calc(e);
      body.push([e.os||"-", ...(i===0?[dia,data]:[]), e.inicio, e.fim, descRep(e), {content:repH(c.total),styles:{fontStyle:"bold"}}, repX(c.e50), repX(c.e100), ...(C.val?[brl(c.valor)]:[]), ...repExtra(e,C)]); });
  });
  const yellow = {fillColor:[255,240,150], textColor:INK, fontStyle:"bold"}, nExtra = ncols - 9 - (C.val?1:0);
  const foot = [[{content:"TOTAL",colSpan:6,styles:yellow}, ...[repH(t.total), repH(t.e50), repH(t.e100), ...(C.val?[brl(t.valor)]:[])].map(x=>({content:x,styles:{...yellow,halign:"right"}})), ...Array.from({length:nExtra},()=>({content:"",styles:yellow}))]];
  const cs = {0:{cellWidth:18}, 1:{cellWidth:22}, 2:{cellWidth:19}, 3:{cellWidth:13,halign:"center"}, 4:{cellWidth:13,halign:"center"}, 6:{cellWidth:15,halign:"right"}, 7:{cellWidth:13,halign:"right"}, 8:{cellWidth:13,halign:"right"}};
  let ci = 9; if(C.val) cs[ci++] = {cellWidth:24, halign:"right"}; if(C.unid) cs[ci++] = {cellWidth:24}; if(C.emp) cs[ci++] = {cellWidth:24}; if(C.prof) cs[ci++] = {cellWidth:30};
  doc.autoTable({startY:y, head, body, foot, theme:"grid", margin:{left:14,right:14}, showFoot:"lastPage",
    styles:{fontSize:7.8,cellPadding:1.4,textColor:INK,lineColor:[205,212,201],lineWidth:0.2,valign:"middle"},
    headStyles:{fillColor:GREEN,textColor:255,fontStyle:"bold",halign:"center"}, columnStyles:cs});
  y = doc.lastAutoTable.finalY + 7;
  y = ensure(doc,y,48);
  doc.setFont("helvetica","bold"); doc.setFontSize(10.5); doc.setTextColor(...NAVY); doc.text("RESUMO DE HORAS",14,y); y += 2;
  const sum = repSummary(t).map((s,i)=>{ const st = i>=3 ? {fontStyle:"bold"} : {}; if(i===4) Object.assign(st,{fillColor:[226,240,230],textColor:[20,95,47]}); return [{content:s[0],styles:st},{content:fdec(s[1]),styles:st},{content:fh(s[1]),styles:{...st,textColor:i===4?[20,95,47]:GREY}}, ...(C.val?[{content:brl(s[2]),styles:st}]:[])]; });
  doc.autoTable({startY:y, theme:"grid", margin:{left:14,right:pw(doc)-14-(C.val?160:130)}, body:sum,
    head:[["", "Decimal", "h:min", ...(C.val?["Valor"]:[])]],
    styles:{fontSize:9,cellPadding:1.8,textColor:INK,lineColor:[205,212,201],lineWidth:0.2},
    headStyles:{fillColor:[244,247,243],textColor:GREY,fontStyle:"bold",fontSize:8},
    columnStyles:{1:{halign:"right",cellWidth:22},2:{halign:"right",cellWidth:22},3:{halign:"right",cellWidth:30}}});
  y = doc.lastAutoTable.finalY + 6;
  const F = ficha(emp), ap = F.aprovador ? `${F.aprovador}${F.cargo?" - "+F.cargo:""} (${emp})` : `Responsável ${emp||"contratante"} (visto)`;
  signature(doc, y, `${cfg.empresa.nome}${prof && !C.prof && profs().length?" - "+prof:cfg.empresa.responsavel?" - "+cfg.empresa.responsavel:""}`, ap);
  if(state.rep.fotos) await pdfFotos(doc, rows);
}
function pdfDespesas(doc, ds, horas){
  doc.addPage(); let y = pdfHeader(doc, "DESPESAS REEMBOLSÁVEIS", repPdfSub()) + 2;
  const tot = ds.reduce((s,x)=>s+despValor(x),0);
  doc.autoTable({startY:y, theme:"grid", margin:{left:14,right:14},
    head:[["DATA","TIPO","DESCRIÇÃO","OS / UNIDADE","VALOR"]],
    body: ds.sort((a,b)=>a.data.localeCompare(b.data)).map(x=>[fdate(x.data), x.tipo||"", (x.tipo==="Km rodado"?`${numIn(x.km)} km × ${brl(numIn(x.valorKm))} · `:"")+(x.obs||""), [x.os?`OS ${x.os}`:"", x.unidade||""].filter(Boolean).join(" · "), brl(despValor(x))]),
    foot:[[{content:"TOTAL DE DESPESAS",colSpan:4},brl(tot)],[{content:"TOTAL GERAL (HORAS + DESPESAS)",colSpan:4},brl(horas+tot)]],
    styles:{fontSize:8.5,cellPadding:1.6,textColor:INK,lineColor:[205,212,201],lineWidth:0.2}, headStyles:{fillColor:GREEN,textColor:255}, footStyles:{fillColor:[255,240,150],textColor:INK},
    columnStyles:{0:{cellWidth:24},1:{cellWidth:32},4:{cellWidth:32,halign:"right"}}});
  doc.setFontSize(8.5); doc.setTextColor(...GREY); doc.text(`Comprovantes disponíveis mediante solicitação.`, 14, doc.lastAutoTable.finalY+6);
}
async function repPdf(){
  const groups = repGroups(), all = repRows();
  if(!all.length){ toast("Nenhum apontamento nesse período."); return; }
  const doc = pdfDoc(true); if(!doc) return;
  const v = state.rep.valores, by = state.rep.by;
  if(groups.length>1){
    let y = pdfHeader(doc, `RESUMO POR ${DIMS[by].label.toUpperCase()}`, repPdfSub());
    const t = sumCalc(all);
    doc.autoTable({startY:y+2, theme:"grid", margin:{left:14,right:14},
      head:[[DIMS[by].label.toUpperCase(),"OS","HORAS",`EXTRA ${pct50()}`,`EXTRA ${pct100()}`,...(v?["VALOR"]:[])]],
      body: groups.map(g=>{ const c=sumCalc(g.rows); return [g.label, String(g.rows.length), fdec(c.total), fdec(c.e50), fdec(c.e100), ...(v?[brl(c.valor)]:[])]; }),
      foot:[["TOTAL", String(all.length), fdec(t.total), fdec(t.e50), fdec(t.e100), ...(v?[brl(t.valor)]:[])]],
      styles:{fontSize:9.5,cellPadding:2,textColor:INK,lineColor:[205,212,201],lineWidth:0.2}, headStyles:{fillColor:GREEN,textColor:255}, footStyles:{fillColor:[255,240,150],textColor:INK},
      columnStyles:{1:{halign:"right",cellWidth:20},2:{halign:"right",cellWidth:28},3:{halign:"right",cellWidth:28},4:{halign:"right",cellWidth:28},5:{halign:"right",cellWidth:36}}});
    doc.setFontSize(9); doc.setTextColor(...GREY); doc.setFont("helvetica","normal"); doc.text("O detalhamento de cada um começa na próxima página.",14,doc.lastAutoTable.finalY+7);
  }
  if(state.rep.fotos) toast("Gerando PDF com fotos…");
  for(const [i,g] of groups.entries()){ if(groups.length>1 || i>0) doc.addPage(); await pdfGroup(doc, g.rows); }
  const rr = state.rep;
  if(rr.modo==="periodo" && v){ const emp = rr.f.emp!==ALL ? rr.f.emp : ""; const ds = rr.reembIds ? state.desp.filter(x=>rr.reembIds.includes(x.id)) : rr.os ? state.desp.filter(x=>x.reembolsavel && (x.os||"")===rr.os) : (rr.f.prof!==ALL || rr.f.unid!==ALL) ? [] : despReemb(rr.de, rr.ate, emp).filter(x=>x.data>=rr.de); if(ds.length) pdfDespesas(doc, ds, sumCalc(all).valor); }
  pdfFooter(doc);
  offerFile(`controle-ordens-${repFileTag()}.pdf`, doc.output("blob"));
}
function orcPdf(o){
  const doc = pdfDoc(); if(!doc) return;
  const T = orcTotals(o), E = state.cfg.empresa, val = orcValidade(o);
  let y = pdfHeader(doc, "PROPOSTA DE ORÇAMENTO", [`Nº ${o.numero||"-"}`, `Emissão: ${fdate(o.data)}`]);
  const C = o.cliente||{};
  doc.setFillColor(240,244,238); doc.roundedRect(14,y-4,182,24,2,2,"F");
  doc.setFontSize(8); doc.setTextColor(...GREY); doc.setFont("helvetica","bold"); doc.text("CLIENTE",18,y+0.5);
  doc.setFontSize(10.5); doc.setTextColor(...INK); doc.text(C.nome||"-",18,y+6);
  doc.setFont("helvetica","normal"); doc.setFontSize(8.8);
  const l2 = [C.documento?`CNPJ/CPF: ${C.documento}`:"", C.cidade||""].filter(Boolean).join("   |   ");
  const l3 = [C.contato?`A/C: ${C.contato}`:"", C.telefone||"", C.email||""].filter(Boolean).join("   |   ");
  if(l2) doc.text(l2,18,y+11); if(l3) doc.text(l3,18,y+15.5);
  y += 28;
  const block = (title, text) => {
    if(!text) return;
    doc.setFont("helvetica","normal"); doc.setFontSize(9.2);
    const lines = doc.splitTextToSize(text, 182);
    y = ensure(doc, y, 12);
    doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(...NAVY); doc.text(title,14,y); y+=5;
    doc.setFont("helvetica","normal"); doc.setFontSize(9.2); doc.setTextColor(...INK);
    lines.forEach(l=>{ y = ensure(doc,y,5); doc.text(l,14,y); y+=4.4; }); y+=3;
  };
  if(o.titulo){ doc.setFont("helvetica","bold"); doc.setFontSize(11.5); doc.setTextColor(...INK); const tl=doc.splitTextToSize(`Objeto: ${o.titulo}`,182); tl.forEach(l=>{doc.text(l,14,y); y+=5.5;}); y+=2; }
  if(o.apresentacao) block("Quem somos", E.sobre);
  block("Escopo dos serviços", o.escopo);
  const itens = (o.itens||[]).filter(i=>i.desc||numIn(i.valor));
  y = ensure(doc,y,30);
  doc.autoTable({startY:y, theme:"grid", margin:{left:14,right:14},
    head:[["Item","Descrição","Un.","Qtd.","Valor unit.","Total"]],
    body: itens.map((i,k)=>[String(k+1), i.desc||"", i.un||"", String(numIn(i.qtd)).replace(".",","), brl(numIn(i.valor)), brl(numIn(i.qtd)*numIn(i.valor))]),
    styles:{fontSize:8.8,cellPadding:2,textColor:INK,lineColor:[210,216,206],lineWidth:0.2,valign:"middle"},
    headStyles:{fillColor:GREEN,textColor:255}, columnStyles:{0:{cellWidth:12,halign:"center"},2:{cellWidth:14,halign:"center"},3:{cellWidth:16,halign:"right"},4:{cellWidth:28,halign:"right"},5:{cellWidth:30,halign:"right"}}});
  y = doc.lastAutoTable.finalY + 2;
  const tot = [["Subtotal", brl(T.sub)]];
  if(T.desc) tot.push([`Desconto (${String(numIn(o.descontoPct)).replace(".",",")}%)`, "- "+brl(T.desc)]);
  tot.push([{content:"VALOR TOTAL",styles:{fontStyle:"bold",fontSize:10.5}},{content:brl(T.total),styles:{fontStyle:"bold",fontSize:10.5,textColor:GREEN}}]);
  doc.autoTable({startY:y, theme:"plain", margin:{left:120,right:14}, body:tot, styles:{fontSize:9.2,cellPadding:1.4,textColor:INK}, columnStyles:{1:{halign:"right"}}});
  y = doc.lastAutoTable.finalY + 7;
  const cond = [];
  if(o.pagamento) cond.push(["Condições de pagamento", o.pagamento]);
  if(o.prazo) cond.push(["Prazo de execução", o.prazo]);
  if(val) cond.push(["Validade da proposta", `${o.validadeDias} dias (até ${fdate(val)})`]);
  if(o.obs) cond.push(["Observações", o.obs]);
  if(cond.length){ y = ensure(doc,y,20); doc.autoTable({startY:y, theme:"plain", margin:{left:14,right:14}, body:cond, styles:{fontSize:9,cellPadding:1.4,textColor:INK}, columnStyles:{0:{fontStyle:"bold",cellWidth:46,textColor:NAVY}}}); y = doc.lastAutoTable.finalY + 6; }
  signature(doc, y+4, `${E.nome}${E.responsavel?" - "+E.responsavel:""}`, `De acordo - ${C.nome||"Cliente"}`);
  pdfFooter(doc);
  offerFile(`orcamento-${o.numero||"rascunho"}-${(C.nome||"cliente").replace(/[^\wÀ-ú]+/g,"-").slice(0,30)}.pdf`, doc.output("blob"));
}

