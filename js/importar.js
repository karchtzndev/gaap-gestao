"use strict";
/* ---------- GAAP · importar ordens do TracOS (Excel/CSV) e distribuir no período ----------
   Só para o responsável (dono). Lê a planilha, você escolhe o período e os horários de CADA dia
   (entrada, saída para o almoço, retorno e saída), e o app distribui as ordens preenchendo o horário
   de cada uma, pulando o almoço. Nada disso aparece para o funcionário. */

/* ===== lógica pura (testável) ===== */
function impMinHM(m){ m = Math.round(m); const h = Math.floor(m/60), mm = ((m%60)+60)%60; return String(h).padStart(2,"0")+":"+String(mm).padStart(2,"0"); }
function impNetMin(d){
  const e = hm(d.entrada), as = hm(d.almoco), ar = hm(d.retorno), s = hm(d.saida);
  if(e==null || s==null || s<=e) return 0;
  const temAlm = as!=null && ar!=null && ar>as && as>=e && ar<=s;
  return temAlm ? (as-e)+(s-ar) : (s-e);
}
// divide um dia em n fatias de tempo líquido igual, em sequência, pulando o almoço
function impFatiarDia(d, n){
  if(n<=0) return [];
  const e = hm(d.entrada), as = hm(d.almoco), ar = hm(d.retorno), s = hm(d.saida);
  const temAlm = as!=null && ar!=null && ar>as && as>=e && ar<=s;
  const manha = temAlm ? (as-e) : 0;
  const net = impNetMin(d);
  const mapa = p => (!temAlm || p<=manha) ? e+p : ar+(p-manha); // posição líquida -> relógio
  const out = [];
  for(let i=0;i<n;i++){
    const ni = i*net/n, nf = (i+1)*net/n;
    const cruza = temAlm && ni<manha && nf>manha;
    out.push({ inicio:impMinHM(mapa(ni)), fim:impMinHM(mapa(nf)),
      almIni: cruza?impMinHM(as):"", almFim: cruza?impMinHM(ar):"" });
  }
  return out;
}
// distribui as ordens pelos dias, proporcional às horas de cada dia (todo mundo com ~o mesmo tempo por ordem)
function impDistribuir(ordens, dias){
  const nets = dias.map(impNetMin), total = nets.reduce((a,b)=>a+b,0), N = ordens.length;
  if(!N || !dias.length) return [];
  const exato = nets.map(n => total ? N*n/total : N/dias.length);
  const base = exato.map(Math.floor);
  let resto = N - base.reduce((a,b)=>a+b,0);
  const ordem = exato.map((x,i)=>[i, x-Math.floor(x)]).sort((a,b)=>b[1]-a[1]);
  for(let k=0; k<resto && ordem.length; k++) base[ordem[k%ordem.length][0]]++;
  const res = []; let idx = 0;
  dias.forEach((d,i)=>{ const fatias = impFatiarDia(d, base[i]); fatias.forEach(f=>{ const o = ordens[idx++]; if(o) res.push({...o, data:d.data, ...f}); }); });
  return res;
}

/* ===== leitura do arquivo ===== */
async function impLerTexto(file){
  const buf = new Uint8Array(await file.arrayBuffer());
  let enc = "utf-8";
  if(buf[0]===0xFF && buf[1]===0xFE) enc = "utf-16le"; else if(buf[0]===0xFE && buf[1]===0xFF) enc = "utf-16be";
  return new TextDecoder(enc).decode(buf).replace(/^﻿/, "");
}
function impCsvAoa(txt){
  const linhas = txt.split(/\r?\n/).filter(l=>l.trim());
  if(!linhas.length) return [];
  const delim = [["\t",(linhas[0].match(/\t/g)||[]).length], [";",(linhas[0].match(/;/g)||[]).length], [",",(linhas[0].match(/,/g)||[]).length]].sort((a,b)=>b[1]-a[1])[0][0];
  return linhas.map(l=>l.split(delim).map(c=>c.replace(/^"|"$/g,"").trim()));
}
function impAoaParaOrdens(aoa){
  const limpas = aoa.filter(r=>r.some(c=>String(c).trim()));
  if(!limpas.length) return [];
  const head = limpas[0].map(c=>String(c).toLowerCase());
  const acha = re => head.findIndex(h=>re.test(h));
  let iOs = acha(/ordem|n[uú]mero|^os\b|o\.?s\.?/), iTid = acha(/tractian|^id\b/), iDesc = acha(/descri|servi/);
  const temHead = iOs>=0 || iDesc>=0;
  if(iOs<0) iOs = 0;
  if(iDesc<0) iDesc = iTid>=0 ? (iTid+1) : 2; // export do TracOS: ORDEM, ID TRACTIAN, ..., DESCRIÇÃO
  const corpo = temHead ? limpas.slice(1) : limpas;
  return corpo.map(r=>({ os:String(r[iOs]??"").trim(), tracos:(iTid>=0?String(r[iTid]??""):"").replace(/\D/g,""), descricao:String(r[iDesc]??"").trim() }))
    .filter(o=>o.os || o.descricao);
}
const IMP_XLSX = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
async function impXmlOrdens(txt){
  // 1) muitos "Exportar Excel" do TracOS são XML (SpreadsheetML): o próprio XLSX lê
  try{ if(!window.XLSX) await loadScript(IMP_XLSX); const wb = window.XLSX.read(txt, {type:"string"});
    if(wb.SheetNames.length){ const ords = impAoaParaOrdens(window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1, raw:false, defval:""})); if(ords.length) return ords; }
  }catch(e){}
  // 2) XML genérico: acha o elemento que se repete como "ordem" e lê os campos pelo nome da tag
  const doc = new DOMParser().parseFromString(txt, "application/xml");
  if(doc.querySelector("parsererror")) return [];
  const campo = (el, re) => { for(const c of el.children){ if(re.test(c.tagName) && !c.children.length){ const v = (c.textContent||"").trim(); if(v) return v; } } return ""; };
  const tags = {}; doc.querySelectorAll("*").forEach(el=>{ if(el.children.length) tags[el.tagName] = (tags[el.tagName]||0)+1; });
  let melhor = [];
  Object.keys(tags).forEach(tag=>{
    const linhas = [...doc.getElementsByTagName(tag)].map(el=>({
      os: campo(el, /^(ordem|numero|num|os|codigo|id)$|ordem|numero/i),
      tracos: campo(el, /tractian|tracos|idtrac/i).replace(/\D/g,""),
      descricao: campo(el, /descri|servi|titulo|atividade|nome/i)
    })).filter(o=>o.os || o.descricao);
    if(linhas.length > melhor.length) melhor = linhas;
  });
  return melhor;
}
async function impLerArquivo(file){
  const nome = (file.name||"").toLowerCase();
  if(nome.endsWith(".xml")) return impXmlOrdens(await impLerTexto(file));
  if(nome.endsWith(".csv") || nome.endsWith(".txt")) return impAoaParaOrdens(impCsvAoa(await impLerTexto(file)));
  if(!window.XLSX) await loadScript(IMP_XLSX);
  const wb = window.XLSX.read(new Uint8Array(await file.arrayBuffer()), {type:"array"});
  const ws = wb.Sheets[wb.SheetNames[0]];
  return impAoaParaOrdens(window.XLSX.utils.sheet_to_json(ws, {header:1, raw:false, defval:""}));
}

/* ===== telas ===== */
function impUnidades(){ const s = new Set(); state.ap.forEach(e=>{ if(e.cliente) s.add(e.cliente); }); lines(state.cfg.unidades).forEach(u=>s.add(u)); return [...s]; }
function impPadraoDias(){
  const de = parseYmd(state.imp.de), ate = parseYmd(state.imp.ate);
  const P = state.imp.padrao, dias = [];
  for(let d = new Date(de); d <= ate; d.setDate(d.getDate()+1)){
    const data = ymd(d), dom = d.getDay()===0, fer = !!holidayName(data);
    dias.push({data, incluir: !dom && !fer, entrada:P.entrada, almoco:P.almoco, retorno:P.retorno, saida:P.saida});
  }
  return dias;
}
function impConfigHtml(){
  const o = state.imp, ps = profs(), uni = impUnidades();
  return `<header><h2>Importar ordens do TracOS</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <form class="form" id="impForm">
    <p class="muted" style="margin:0"><b>Passo 1 de 3.</b> Diga de quem são, onde e o período. Depois você preenche os horários de cada dia e, por último, envia o XML do TracOS para distribuir as ordens.</p>
    <label class="field"><span>Profissional</span><select id="imp-prof"><option value="">(sem profissional)</option>${ps.map(n=>`<option ${o.prof===n?"selected":""}>${esc(n)}</option>`).join("")}</select></label>
    <label class="field"><span>Unidade</span><input id="imp-uni" list="imp-unis" value="${esc(o.unidade||"")}" placeholder="Ex.: 1001 - ANÁPOLIS"><datalist id="imp-unis">${uni.map(u=>`<option value="${esc(u)}">`).join("")}</datalist></label>
    <label class="field"><span>Empresa / contratante (opcional)</span><input id="imp-emp" value="${esc(o.empresa||"")}" placeholder="${esc(state.cfg.contratante||"")}"></label>
    <div class="grid2">
      <label class="field"><span>De</span><input type="date" id="imp-de" value="${esc(o.de)}"></label>
      <label class="field"><span>Até</span><input type="date" id="imp-ate" value="${esc(o.ate)}"></label>
    </div>
    <p class="muted" style="margin:6px 0 0"><b>Horário padrão</b> (aplicado a todos os dias; você edita dia a dia depois):</p>
    <div class="grid2">
      <label class="field"><span>Entrada</span><input type="time" id="imp-e" value="${o.padrao.entrada}"></label>
      <label class="field"><span>Saída p/ almoço</span><input type="time" id="imp-a" value="${o.padrao.almoco}"></label>
      <label class="field"><span>Retorno do almoço</span><input type="time" id="imp-r" value="${o.padrao.retorno}"></label>
      <label class="field"><span>Saída</span><input type="time" id="imp-s" value="${o.padrao.saida}"></label>
    </div>
    <footer><span></span><button class="btn primary" type="submit">Preencher os dias ›</button></footer>
  </form>`;
}
function impDiasHtml(){
  const o = state.imp, incl = o.dias.filter(d=>d.incluir), prev = impDistribuir(o.ordens, incl);
  const porData = {}; prev.forEach(r=>porData[r.data]=(porData[r.data]||0)+1);
  return `<header><h2>Horários por dia</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <p class="muted" style="margin:0"><b>Passo 2 de 3.</b> Preencha entrada, saída p/ almoço, retorno e saída de <b>cada dia</b> (podem ser diferentes). Desmarque os dias que não quer usar. No próximo passo você envia o XML, e as ordens são divididas nesses horários.</p>
  <div class="implista">
    ${o.dias.map((d,i)=>{ const dom = parseYmd(d.data).getDay()===0, fer = holidayName(d.data); const n = porData[d.data]||0;
      return `<div class="impdia ${d.incluir?"":"off"}" data-i="${i}">
        <label class="check impchk"><input type="checkbox" data-imp="dia" data-i="${i}" ${d.incluir?"checked":""}> <b>${wdl(d.data)}</b> <span class="mono">${fdate(d.data)}</span>${fer?` <span class="pill warn">${esc(fer)}</span>`:dom?` <span class="pill">domingo</span>`:""}</label>
        <div class="imph">
          <input type="time" data-imp="entrada" data-i="${i}" value="${d.entrada}" title="Entrada">
          <input type="time" data-imp="almoco" data-i="${i}" value="${d.almoco}" title="Saída p/ almoço">
          <input type="time" data-imp="retorno" data-i="${i}" value="${d.retorno}" title="Retorno">
          <input type="time" data-imp="saida" data-i="${i}" value="${d.saida}" title="Saída">
          <span class="mono muted impn">${n?`${n} OS`:"—"}</span>
        </div>
      </div>`; }).join("")}
  </div>
  <footer><button class="btn" data-act="impVoltar">‹ Voltar</button><button class="btn primary" data-act="impArquivo">Enviar XML do TracOS ›</button></footer>`;
}
function impResumoHtml(){
  const o = state.imp, incl = o.dias.filter(d=>d.incluir), prev = impDistribuir(o.ordens, incl);
  state.imp.gerado = prev;
  const porData = {}; prev.forEach(r=>{ (porData[r.data]=porData[r.data]||[]).push(r); });
  const horasDe = r => { const c = calc({data:r.data, inicio:r.inicio, fim:r.fim, almIni:r.almIni, almFim:r.almFim}); return c.total; };
  const totalH = prev.reduce((s,r)=>s+horasDe(r),0);
  return `<header><h2>Conferir antes de lançar</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <p class="muted" style="margin:0">${prev.length} ordens em ${Object.keys(porData).length} dia(s) · ${fdec(totalH)} horas · ${esc(o.prof||"sem profissional")}${o.unidade?` · ${esc(o.unidade)}`:""}.</p>
  <div class="tablewrap" style="max-height:48vh;overflow:auto"><table><thead><tr><th>Dia</th><th>OS</th><th>Início</th><th>Fim</th><th>Descrição</th></tr></thead><tbody>
    ${prev.map(r=>`<tr><td class="mono">${fdate(r.data)}</td><td class="mono">${esc(r.os||"-")}</td><td class="mono">${r.inicio}</td><td class="mono">${r.fim}${r.almIni?` <span class="muted">(alm ${r.almIni}–${r.almFim})</span>`:""}</td><td>${esc((r.descricao||"").slice(0,60))}</td></tr>`).join("")}
  </tbody></table></div>
  <footer><button class="btn" data-act="impDias">‹ Voltar</button><button class="btn primary" data-act="impSalvar">Lançar ${prev.length} ordens</button></footer>`;
}

window.addEventListener("DOMContentLoaded", ()=>Object.assign(A, {
  impOrdens(){ // passo 1: abre a configuração (o arquivo vem só no fim)
    if(state.worker) return;
    const hoje = today();
    state.imp = { ordens:[], prof:profs()[0]||"", unidade:impUnidades()[0]||"", empresa:"", de:hoje, ate:hoje, padrao:{entrada:"07:00", almoco:"12:00", retorno:"13:00", saida:"17:00"}, dias:[] };
    openModal(impConfigHtml());
  },
  impVoltar(){ openModal(impConfigHtml()); },
  impDias(){ openModal(impDiasHtml()); },
  impArquivo(){ // passo 3: envia o XML/planilha do TracOS, que divide as ordens nos horários
    if(!state.imp || !state.imp.dias.some(d=>d.incluir)){ toast("Marque pelo menos um dia."); return; }
    const i = $("#imp-arq") || Object.assign(document.createElement("input"), {type:"file", id:"imp-arq", accept:".xml,.xlsx,.xls,.csv,.txt", hidden:true});
    if(!i.isConnected) document.body.appendChild(i);
    i.value = ""; i.onchange = async () => { const f = i.files[0]; if(!f) return;
      toast("Lendo o arquivo do TracOS…");
      try{ const ordens = await impLerArquivo(f);
        if(!ordens.length){ toast("Não encontrei ordens no arquivo. Use o XML ou o Excel exportado do TracOS (com ORDEM e DESCRIÇÃO)."); return; }
        state.imp.ordens = ordens; openModal(impResumoHtml());
      }catch(err){ toast("Não consegui ler o arquivo. Tente o XML ou o Excel (.xlsx) do TracOS."); }
    };
    i.click();
  },
  async impSalvar(b){
    const o = state.imp, lista = o.gerado || [];
    if(!lista.length){ toast("Nada para lançar."); return; }
    b.disabled = true; const total = lista.length; let feitos = 0;
    for(const r of lista){
      try{ await save("apontamentos", { data:r.data, os:(r.os||"").trim(), tracos:(r.tracos||"").replace(/\D/g,""), descricao:(r.descricao||"").trim(),
        inicio:r.inicio, fim:r.fim, almIni:r.almIni||"", almFim:r.almFim||"", cliente:(o.unidade||"").trim(), empresa:(o.empresa||"").trim(),
        profissional:o.prof||"", tipo:"auto", criadoEm:new Date().toISOString() }); feitos++; }
      catch(err){ /* segue; mostra no fim */ }
      b.textContent = `Lançando ${feitos}/${total}…`;
    }
    closeModal(); state.imp = null; state.view = "horas"; state.rendered = null; render();
    toast(feitos===total ? `${feitos} ordens lançadas.` : `${feitos} de ${total} lançadas (algumas falharam; confira em Horas).`);
  }
}));
// atualiza os campos do editor de dias sem redesenhar a tela toda
document.addEventListener("input", e=>{
  const t = e.target.dataset?.imp; if(!t || !state.imp) return;
  const i = +e.target.dataset.i, d = state.imp.dias[i]; if(!d) return;
  if(t==="dia"){ d.incluir = e.target.checked; e.target.closest(".impdia")?.classList.toggle("off", !d.incluir); recalcImpN(); }
  else { d[t] = e.target.value; recalcImpN(); }
});
function recalcImpN(){
  if(!state.imp) return; const incl = state.imp.dias.filter(d=>d.incluir), prev = impDistribuir(state.imp.ordens, incl);
  const porData = {}; prev.forEach(r=>porData[r.data]=(porData[r.data]||0)+1);
  document.querySelectorAll(".impdia").forEach(el=>{ const d = state.imp.dias[+el.dataset.i]; const s = el.querySelector(".impn"); if(s) s.textContent = porData[d.data] ? `${porData[d.data]} OS` : "—"; });
}
document.addEventListener("submit", e=>{
  if(e.target.id!=="impForm") return; e.preventDefault();
  const o = state.imp, g = id => document.getElementById(id);
  o.prof = g("imp-prof").value; o.unidade = g("imp-uni").value.trim(); o.empresa = g("imp-emp").value.trim();
  o.de = g("imp-de").value; o.ate = g("imp-ate").value;
  o.padrao = {entrada:g("imp-e").value, almoco:g("imp-a").value, retorno:g("imp-r").value, saida:g("imp-s").value};
  if(!o.de || !o.ate || o.ate < o.de){ toast("Confira o período (a data final não pode ser antes da inicial)."); return; }
  o.dias = impPadraoDias();
  if(o.dias.length > 120){ toast("Período muito longo. Escolha no máximo uns 4 meses."); return; }
  openModal(impDiasHtml());
});
