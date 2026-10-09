"use strict";
/* ---------- ORÇAMENTOS ---------- */
function orcCard(o){
  const T = orcTotals(o), st = ST[o.status]||ST.rascunho, val = orcValidade(o);
  const vencido = o.status==="enviado" && val && val < today();
  const rec = orcAberto(o) ? orcRecebido(o.id) : 0;
  return `<button class="orccard" data-act="editOrc" data-id="${esc(o.id)}">
    <span style="min-width:0"><b>${esc(o.cliente?.nome||"Sem cliente")}</b><br><span class="muted">${esc(o.titulo||"Sem título")}</span></span>
    <span class="val">${brl(T.total)}</span>
    <span class="meta"><span class="mono">Nº ${esc(o.numero||"-")}</span> · ${fdate(o.data)} <span class="pill ${st[1]}">${st[0]}</span>${vencido?'<span class="pill warn">Validade vencida</span>':""}${orcAberto(o)?(rec>=T.total-0.005?'<span class="pill good">Recebido</span>':`<span class="pill info">A receber ${brl(T.total-rec)}</span>`):""}${orcAberto(o)?(()=>{ const a=orcAndamento(o); return a.ents.length||a.prev ? `<span class="pill ${a.pct>100?"bad":""}">${fdec(a.h*60)} de ${fdec(a.prev*60)} h</span>` : ""; })():""}${o.exemplo?'<span class="pill">Exemplo</span>':""}</span></button>`;
}
function vOrcamentos(){
  const f = state.orcFilter;
  const list = state.orc.filter(o=>f==="todos"||o.status===f).sort((a,b)=>(b.numero||"").localeCompare(a.numero||""));
  const cnt = k => state.orc.filter(o=>k==="todos"||o.status===k).length;
  const sumSt = k => state.orc.filter(o=>o.status===k).reduce((s,o)=>s+orcTotals(o).total,0);
  return `${exampleBanner()}
  <div class="pagehead"><div><span class="eyebrow">Orçamentos</span><h1>Propostas</h1><p class="muted">Monte a proposta, baixe o PDF com a marca da GAAP e acompanhe a resposta do cliente.</p></div><button class="btn primary" data-act="newOrc">+ Novo orçamento</button></div>
  <div class="kpis" style="margin:0 0 16px">
    <div class="kpi"><span class="eyebrow">Rascunhos</span><span class="v">${cnt("rascunho")}</span><span class="s">${brl(sumSt("rascunho"))}</span></div>
    <div class="kpi"><span class="eyebrow">Enviados</span><span class="v">${cnt("enviado")}</span><span class="s">${brl(sumSt("enviado"))} aguardando</span></div>
    <div class="kpi"><span class="eyebrow">Aprovados</span><span class="v">${cnt("aprovado")+cnt("concluido")}</span><span class="s">${brl(sumSt("aprovado")+sumSt("concluido"))}</span></div>
    <div class="kpi"><span class="eyebrow">Recusados</span><span class="v">${cnt("recusado")}</span><span class="s">${brl(sumSt("recusado"))}</span></div>
  </div>
  <div class="filters">${[["todos","Todos"],...Object.entries(ST).map(([k,v])=>[k,v[0]])].map(([k,l])=>`<button class="chipbtn" data-act="orcFilter" data-f="${k}" aria-pressed="${f===k}">${l} (${cnt(k)})</button>`).join("")}</div>
  ${list.length?`<div class="list">${list.map(orcCard).join("")}</div>`:`<div class="empty"><b>Nenhum orçamento ${f==="todos"?"ainda":"com esse status"}</b>Crie uma proposta com itens de mão de obra, material e serviços.</div>`}`;
}
function nextNumero(){ const y = new Date().getFullYear(); const n = state.orc.map(o=>o.numero||"").filter(s=>s.startsWith(y+"-")).map(s=>+s.split("-")[1]||0); return `${y}-${String((n.length?Math.max(...n):0)+1).padStart(3,"0")}`; }
function newOrcDraft(){ return {cliente:{nome:"",documento:"",contato:"",telefone:"",email:"",cidade:""}, titulo:"", escopo:"", itens:[{tipo:"mo",desc:"Mão de obra - montagem/manutenção mecânica",un:"h",qtd:"8",valor:String(state.cfg.valorHora)}], descontoPct:"", pagamento:"50% na aprovação e 50% na conclusão dos serviços", prazo:"", validadeDias:15, obs:"", status:"rascunho", data:today(), apresentacao:true}; }
function orcAndamento(o){
  const prev = (o.itens||[]).filter(i=>i.tipo==="mo" || String(i.un||"").trim().toLowerCase()==="h").reduce((s,i)=>s+numIn(i.qtd),0);
  const ents = state.ap.filter(e=>e.orcId===o.id), h = sumCalc(ents).total/60, cu = custoSum(ents) + state.desp.filter(x=>x.orcId===o.id).reduce((s,x)=>s+despValor(x),0);
  return {prev, ents, h, cu, pct: prev ? Math.round(100*h/prev) : null};
}
function vOrcEdit(){
  const o = state.orcDraft; const C = o.cliente;
  const and = o.id && orcAberto(o) ? orcAndamento(o) : null;
  const clientes = [...new Map(state.orc.filter(x=>x.cliente?.nome).map(x=>[x.cliente.nome,x.cliente])).keys()];
  return `<div class="pagehead"><div><span class="eyebrow">${o.id?`Orçamento Nº ${esc(o.numero)}`:"Novo orçamento"}</span><h1>${esc(o.titulo||"Proposta")}</h1></div>
    <div class="row"><button class="btn" data-act="nav" data-view="orcamentos">Voltar</button><button class="btn" data-act="orcPdf">Salvar e baixar PDF</button><button class="btn primary" data-act="saveOrc">Salvar</button></div></div>
  <div class="form" id="orcForm">
    ${and?`<div class="panel form"><header class="row" style="justify-content:space-between"><h3>Andamento do serviço</h3><button class="btn sm primary" data-act="orcLancar" data-id="${esc(o.id)}">Lançar horas neste serviço</button></header>
      <div class="summary" style="margin:0"><span>Mão de obra prevista <b>${fdec(and.prev*60)} h</b></span><span>Lançada <b>${fdec(and.h*60)} h</b></span>${and.pct!=null?`<span><b>${and.pct}%</b> usada</span>`:""}${temCustos()?`<span>Custo da equipe <b>${brl(and.cu)}</b></span><span>Valor do orçamento − equipe <b>${brl(orcTotals(o).total-and.cu)}</b></span>`:""}</div>
      ${and.pct!=null?`<div class="bar ${and.pct>100?"over":""}"><i style="width:${Math.min(100,and.pct)}%"></i></div>`:""}
      ${and.pct>100?`<div class="warnbox">As horas lançadas já passaram do previsto no orçamento.</div>`:""}
      ${and.ents.length?`<div class="tablewrap"><table><thead><tr><th>Data</th><th>Funcionário</th><th>OS</th><th>Início</th><th>Fim</th><th class="r">Horas</th></tr></thead><tbody>${and.ents.sort((a,b)=>(b.data+b.inicio).localeCompare(a.data+a.inicio)).map(e=>`<tr><td class="mono">${fdate(e.data)}</td><td>${esc(e.profissional||"-")}</td><td class="mono">${esc(e.os||"-")}</td><td class="mono">${esc(e.inicio)}</td><td class="mono">${esc(e.fim)}</td><td class="r mono">${fdec(calc(e).total)}</td></tr>`).join("")}</tbody></table></div>`:`<p class="muted" style="margin:0">Nenhuma hora lançada ainda. Ao lançar as OS do dia, escolha este orçamento em “Serviço de orçamento”.</p>`}
    </div>`:""}
    <div class="panel form"><h3>Cliente</h3>
      <div class="grid2"><label class="field"><span>Nome / razão social</span><input data-k="cliente.nome" list="orc-cli" value="${esc(C.nome)}" placeholder="Ex.: Cerealista Boa Safra Ltda"><datalist id="orc-cli">${clientes.map(c=>`<option value="${esc(c)}">`).join("")}</datalist></label>
      <label class="field"><span>CNPJ / CPF</span><input data-k="cliente.documento" value="${esc(C.documento)}"></label></div>
      <div class="grid3"><label class="field"><span>A/C (contato)</span><input data-k="cliente.contato" value="${esc(C.contato)}"></label>
      <label class="field"><span>Telefone</span><input data-k="cliente.telefone" inputmode="tel" value="${esc(C.telefone)}"></label>
      <label class="field"><span>E-mail</span><input data-k="cliente.email" inputmode="email" value="${esc(C.email)}"></label></div>
      <label class="field"><span>Cidade / endereço</span><input data-k="cliente.cidade" value="${esc(C.cidade)}"></label>
    </div>
    <div class="panel form"><h3>Proposta</h3>
      <div class="grid3"><label class="field" style="grid-column:1/-1"><span>Objeto (título)</span><input data-k="titulo" value="${esc(o.titulo)}" placeholder="Ex.: Montagem de transportador helicoidal 12 m"></label>
      <label class="field"><span>Data de emissão</span><input type="date" data-k="data" value="${esc(o.data)}"></label>
      <label class="field"><span>Validade (dias)</span><input type="number" min="1" data-k="validadeDias" value="${esc(o.validadeDias)}"></label>
      <label class="field"><span>Status</span><select data-k="status">${Object.entries(ST).map(([k,v])=>`<option value="${k}" ${o.status===k?"selected":""}>${v[0]}</option>`).join("")}</select></label></div>
      <label class="field"><span>Escopo dos serviços</span><textarea data-k="escopo" rows="4" placeholder="Descreva o que será executado, o que está incluso e o que não está.">${esc(o.escopo)}</textarea></label>
      <label class="check"><input type="checkbox" data-k="apresentacao" ${o.apresentacao?"checked":""}> Incluir “Quem somos” no PDF</label>
    </div>
    <div class="panel form"><header class="row" style="justify-content:space-between"><h3>Itens</h3><span class="row"><button class="btn sm" data-act="addItem" data-t="mo">+ Mão de obra</button><button class="btn sm" data-act="addItem" data-t="mat">+ Material</button><button class="btn sm" data-act="addItem" data-t="srv">+ Serviço</button></span></header>
      <div class="items" id="items">${itemsHtml(o)}</div>
      <div class="grid3"><label class="field"><span>Desconto (%)</span><input data-k="descontoPct" inputmode="decimal" value="${esc(o.descontoPct)}" placeholder="0"></label></div>
      <div class="totals" id="orcTotals">${totalsHtml(o)}</div>
    </div>
    <div class="panel form"><h3>Condições</h3>
      <div class="grid2"><label class="field"><span>Condições de pagamento</span><input data-k="pagamento" value="${esc(o.pagamento)}"></label>
      <label class="field"><span>Prazo de execução</span><input data-k="prazo" value="${esc(o.prazo)}" placeholder="Ex.: 10 dias úteis após aprovação"></label></div>
      <label class="field"><span>Observações</span><textarea data-k="obs" rows="3" placeholder="Ex.: Içamento e andaimes por conta do cliente. Inclui ART.">${esc(o.obs)}</textarea></label>
    </div>
    <div class="row" style="justify-content:space-between">${o.id?`<span class="row"><button class="btn danger" data-act="delOrc">Excluir orçamento</button><button class="btn" data-act="dupOrc">Duplicar</button></span>`:"<span></span>"}
      <span class="row"><button class="btn" data-act="orcPdf">Salvar e baixar PDF</button><button class="btn primary" data-act="saveOrc">Salvar</button></span></div>
  </div>`;
}
function itemsHtml(o){
  if(!o.itens.length) return `<div class="empty">Adicione mão de obra, materiais ou serviços.</div>`;
  const lab = {mo:"Mão de obra",mat:"Material",srv:"Serviço"};
  return o.itens.map((i,k)=>`<div class="itemrow" data-i="${k}">
    <label class="field desc"><span>${lab[i.tipo]||"Item"} ${k+1}</span><input data-f="desc" value="${esc(i.desc)}" placeholder="Descrição"></label>
    <label class="field"><span>Un.</span><input data-f="un" value="${esc(i.un)}"></label>
    <label class="field"><span>Qtd.</span><input data-f="qtd" inputmode="decimal" value="${esc(i.qtd)}"></label>
    <label class="field"><span>Valor unit. (R$)</span><input data-f="valor" inputmode="decimal" value="${esc(i.valor)}"></label>
    <span class="tot" data-tot="${k}">${brl(numIn(i.qtd)*numIn(i.valor))}</span>
    <button class="iconbtn" data-act="delItem" data-i="${k}" aria-label="Remover item">✕</button></div>`).join("");
}
function totalsHtml(o){ const T=orcTotals(o); return `<div><span>Subtotal</span><span class="mono">${brl(T.sub)}</span></div>${T.desc?`<div><span>Desconto</span><span class="mono">- ${brl(T.desc)}</span></div>`:""}<div class="grand"><span>Total</span><span>${brl(T.total)}</span></div>`; }
document.addEventListener("input", e=>{
  if(state.view!=="orcEdit" || !e.target.closest("#orcForm")) return;
  const o = state.orcDraft; const t = e.target;
  if(t.dataset.k){ const v = t.type==="checkbox" ? t.checked : t.value; const p = t.dataset.k.split("."); if(p.length===2) o[p[0]][p[1]] = v; else o[p[0]] = v; }
  if(t.dataset.f){ const k = +t.closest(".itemrow").dataset.i; o.itens[k][t.dataset.f] = t.value; const el=document.querySelector(`[data-tot="${k}"]`); if(el) el.textContent = brl(numIn(o.itens[k].qtd)*numIn(o.itens[k].valor)); }
  $("#orcTotals").innerHTML = totalsHtml(o);
  state.orcDirty = true;
});
document.addEventListener("change", e=>{ if(state.view==="orcEdit" && e.target.dataset && e.target.dataset.k && (e.target.type==="checkbox"||e.target.tagName==="SELECT")){ const o=state.orcDraft; const p=e.target.dataset.k; o[p] = e.target.type==="checkbox"?e.target.checked:e.target.value; state.orcDirty=true; } });
async function saveOrc(){
  const o = clone(state.orcDraft);
  if(!o.cliente.nome.trim()){ toast("Informe o nome do cliente."); return false; }
  if(!o.numero) o.numero = nextNumero();
  o.validadeDias = +o.validadeDias || 15;
  delete o.exemplo;
  try{ const id = await save("orcamentos", o); state.orcDraft.id = id; state.orcDraft.numero = o.numero; state.orcDirty=false; toast(`Orçamento ${o.numero} salvo`); return true; }
  catch(err){ toast(writeErr(err)); return false; }
}

/* ---------- FINANCEIRO ---------- */
const TIPOS_DESP = ["Km rodado","Combustível","Pedágio","Alimentação","Hospedagem","Material / peça","Ferramenta","Outro"];
function despSection(){
  const m = state.month, ls = state.desp.filter(x=>ym(x.data)===m).sort((a,b)=>b.data.localeCompare(a.data)), tot = ls.reduce((s,x)=>s+despValor(x),0), re = ls.filter(x=>x.reembolsavel).reduce((s,x)=>s+despValor(x),0);
  return `<section class="section"><header><h2>Despesas de ${ymLabel(m)}</h2><span class="row">${monthNav()}<button class="btn sm primary" data-act="newDesp">+ Despesa</button></span></header>
  ${ls.length?`<p class="muted" style="margin:0 0 8px">Total ${brl(tot)} · reembolsável ${brl(re)} · por sua conta ${brl(tot-re)}</p><div class="list">${ls.map(x=>`<button class="item" data-act="editDesp" data-id="${esc(x.id)}"><span class="mono">${fdate(x.data)}</span><span><b>${esc(x.tipo||"")}</b>${x.os?` · OS ${esc(x.os)}`:""}${x.unidade?` · ${esc(x.unidade)}`:""}<br><small class="muted">${x.tipo==="Km rodado"?`${numIn(x.km)} km × ${brl(numIn(x.valorKm))} `:""}${esc(x.obs||"")}</small></span><span class="r"><b class="mono">${brl(despValor(x))}</b><br>${x.reembolsavel?'<span class="pill info">Reembolsável</span>':'<span class="pill">Custo</span>'}${(x.fotos||[]).length?' <span class="pill">📎</span>':""}</span></button>`).join("")}</div>`
  :`<div class="empty"><b>Nenhuma despesa em ${ymLabel(m)}</b>Lance combustível, km, pedágio, alimentação e material. As reembolsáveis entram no fechamento da empresa.</div>`}</section>`;
}
function despForm(x){
  state.dpFotos = [...(x.fotos||[])]; const km = x.tipo==="Km rodado" || !x.id;
  let vk = ""; try{ vk = localStorage.getItem("gaap-valor-km")||""; }catch(err){}
  return `<header><h2>${x.id?"Editar":"Lançar"} despesa</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <form class="form" id="despForm" data-id="${esc(x.id||"")}">
    <div class="grid2"><label class="field"><span>Data</span><input type="date" id="dp-data" value="${esc(x.data||today())}" required></label>
    <label class="field"><span>Tipo</span><select id="dp-tipo">${TIPOS_DESP.map(t=>`<option ${(x.tipo||"Km rodado")===t?"selected":""}>${t}</option>`).join("")}</select></label></div>
    <div class="grid2" id="dp-km-w" ${km?"":"hidden"}><label class="field"><span>Km rodados</span><input id="dp-km" inputmode="decimal" value="${esc(x.km??"")}"></label><label class="field"><span>Valor por km (R$)</span><input id="dp-vkm" inputmode="decimal" value="${esc(x.valorKm??vk)}" placeholder="Ex.: 1,20"></label></div>
    <label class="field" id="dp-v-w" ${km?"hidden":""}><span>Valor (R$)</span><input id="dp-valor" inputmode="decimal" value="${x.valor!=null?String(x.valor).replace(".",","):""}"></label>
    <div class="grid2"><label class="field"><span>Empresa</span><input id="dp-emp" list="emp-list" value="${esc(x.empresa||lastEmp())}"><datalist id="emp-list">${dimVals("emp").map(v=>`<option value="${esc(v)}">`).join("")}</datalist></label>
    <label class="field"><span>Unidade</span>${unidCampo('id="dp-unid"', x.empresa||lastEmp(), x.unidade, "Selecione a unidade")}</label></div>
    <div class="grid2"><label class="field"><span>Nº da OS (opcional)</span><input id="dp-os" value="${esc(x.os||"")}" inputmode="numeric"></label>${orcSelect("dp-orc", x.orcId)}</div>
    <label class="check"><input type="checkbox" id="dp-reemb" ${x.reembolsavel?"checked":""}> Reembolsável (cobrar da empresa no fechamento)</label>
    <label class="field"><span>Observação</span><input id="dp-obs" value="${esc(x.obs||"")}" placeholder="Ex.: ida e volta Uruaçu"></label>
    <div class="field"><span>Comprovante</span><div class="thumbs" id="dp-thumbs">${thumbs(state.dpFotos, false)}</div><div><label class="btn sm" for="dp-foto">+ Foto do comprovante</label><input type="file" id="dp-foto" accept="image/*" multiple hidden></div></div>
    <footer>${x.id?`<button type="button" class="btn danger" data-act="delDesp" data-id="${esc(x.id)}">Excluir</button>`:"<span></span>"}<button class="btn primary" type="submit">Salvar despesa</button></footer>
  </form>`;
}
async function submitDesp(){
  if(state.enviando){ toast("Aguarde: a foto do comprovante ainda está sendo enviada."); return; }
  const id = $("#despForm").dataset.id, tipo = $("#dp-tipo").value;
  const x = {...(state.desp.find(d=>d.id===id)||{}), id:id||undefined, data:$("#dp-data").value, tipo, empresa:$("#dp-emp").value.trim(), unidade:$("#dp-unid").value.trim(), os:$("#dp-os").value.trim(), orcId:$("#dp-orc")?$("#dp-orc").value:"", reembolsavel:$("#dp-reemb").checked, obs:$("#dp-obs").value.trim(), fotos:[...(state.dpFotos||[])]};
  if(tipo==="Km rodado"){ x.km = numIn($("#dp-km").value); x.valorKm = numIn($("#dp-vkm").value); x.valor = Math.round(x.km*x.valorKm*100)/100; try{ localStorage.setItem("gaap-valor-km", $("#dp-vkm").value); }catch(err){} }
  else { x.valor = numIn($("#dp-valor").value); delete x.km; delete x.valorKm; }
  if(!x.data || !(x.valor>0)){ toast("Informe a data e o valor (ou os km e o valor por km)."); return; }
  const lk = x.reembolsavel && state.fech.find(f=>(f.despIds||[]).includes(x.id)); if(lk){ toast(`Essa despesa já foi cobrada no fechamento ${lk.numero}.`); return; }
  const lkd = x.reembolsavel && !x.orcId && lockOf(x.data, x.empresa||state.cfg.contratante||"");
  try{ x.id = id || (state.dpId ||= uid()); await save("despesas", x); state.dpId = null; state.modalDirty = false; closeModal(); toast(lkd ? `Despesa salva. O período ${lkd.numero} já foi fechado: ela entra no próximo fechamento da ${x.empresa||state.cfg.contratante}.` : `Despesa de ${brl(x.valor)} salva`); }
  catch(err){ toast(writeErr(err)); }
}
function fechCard(f){
  const rc = fechRecebido(f), gl = fechGlosa(f), sd = fechSaldo(f), [cl, st] = fechSituacao(f), nf = f.nf||{}, ult = (f.cobrancas||[]).slice(-1)[0];
  return `<div class="fechcard">
    <div class="fc-top"><span><b class="mono">${esc(f.numero)}</b>${f.profissional?` · <b>${esc(f.profissional)}</b>`:""} · ${fdate(f.de)} a ${fdate(f.ate)}${f.empresa?` · ${esc(f.empresa)}`:""}</span><span class="pill ${cl}">${st}</span></div>
    <div class="fc-vals">
      <span>Horas <b class="mono">${brl(+f.valor||0)}</b><small>${f.os||0} OS · ${fdec(+f.horas||0)} h</small></span>
      ${+f.reemb?`<span>Despesas <b class="mono">${brl(+f.reemb)}</b><small>reembolsáveis</small></span>`:""}
      ${gl?`<span>Glosado <b class="mono">−${brl(gl)}</b><small>${(f.glosas||[]).length} item(ns)</small></span>`:""}
      <span>Recebido <b class="mono">${brl(rc)}</b><small>vence ${fdate(fechVenc(f))}</small></span>
      <span>Saldo <b class="mono">${brl(sd)}</b><small>${nf.numero?`NF ${esc(nf.numero)}${nf.status==="cancelada"?" (cancelada)":""}`:'<span class="pill warn" style="padding:0 6px">Sem NF</span>'}</small></span>
    </div>
    ${fechAlterado(f)?`<div class="warnbox">Há OS deste período alteradas depois do fechamento. O PDF continua igual ao que foi enviado; use “PDF atual” para ver como ficaria hoje.</div>`:""}
    ${f.aprovacao?`<p style="margin:0">${f.aprovacao.aprovado?`<span class="pill good">Aprovado por ${esc(f.aprovacao.nome||"aprovador")}${f.aprovacao.cargo?` (${esc(f.aprovacao.cargo)})`:""} ${f.aprovacao.em?` em ${fdate(f.aprovacao.em.slice(0,10))}`:""}</span>`:`<span class="pill bad">Contestado: ${(f.aprovacao.contestadas||[]).length} OS · ${esc(f.aprovacao.nome||"")}</span>`}</p>`:f.aprovPedida?`<p class="muted" style="margin:0;font-size:.85rem">Aprovação pedida em ${fdate(f.aprovPedida)}, aguardando resposta.</p>`:""}
    ${ult?`<p class="muted" style="margin:0;font-size:.85rem">Última cobrança em ${fdate(ult)}${(f.cobrancas||[]).length>1?` (${f.cobrancas.length} no total)`:""}.</p>`:""}
    ${f.itens?`<p class="muted" style="margin:0;font-size:.85rem"><span class="pill info">Planilha importada</span> ${f.itens.length} OS lançadas pela planilha aprovada${f.pedido?` · pedido ${esc(f.pedido)}`:""}.</p>`:""}
    <div class="row fc-acts">${f.itens?"":`<button class="btn sm" data-act="fechPdfBtn" data-id="${esc(f.id)}">PDF enviado</button>`}<button class="btn sm" data-act="terceirosPdf" data-id="${esc(f.id)}">Fechamento p/ fiscal (PDF)</button><button class="btn sm" data-act="terceirosXlsx" data-id="${esc(f.id)}">Excel</button>${f.profissional && fechIrmaos(f).length>1?`<button class="btn sm" data-act="fechJuntos" data-id="${esc(f.id)}">Todos do período em 1 PDF (${fechIrmaos(f).length})</button>`:""}${f.profissional?`<button class="btn sm" data-act="fechAcerto" data-id="${esc(f.id)}">Acerto do funcionário</button>`:""}${f.itens?"":`<button class="btn sm" data-act="indicadoresPdf" data-id="${esc(f.id)}">📊 Indicadores do mês (PDF)</button>`}<button class="btn sm" data-act="fechConferir" data-id="${esc(f.id)}">Conferir planilha deles</button>${fechAlterado(f)?`<button class="btn sm" data-act="fechPdfBtn" data-id="${esc(f.id)}" data-atual="1">PDF atual</button>`:""}
      ${sd>0.005?`<button class="btn sm primary" data-act="newRec" data-o="fech" data-id="${esc(f.id)}" data-v="${sd}">Receber</button><button class="btn sm" data-act="fechCobrar" data-id="${esc(f.id)}">Cobrar</button>`:""}
      <button class="btn sm" data-act="fechNF" data-id="${esc(f.id)}">Nota fiscal / vencimento</button>${f.snap?`<button class="btn sm" data-act="fechAprov" data-id="${esc(f.id)}">${f.aprovacao?"Ver aprovação":"Pedir aprovação"}</button>`:""}${sd>0.005?`<button class="btn sm" data-act="fechGlosa" data-id="${esc(f.id)}">Glosa</button>`:""}
      <button class="btn sm danger" data-act="fechReabrir" data-id="${esc(f.id)}">Reabrir</button></div>
  </div>`;
}
function agingHtml(fechs){
  const ab = fechs.filter(f=>fechSaldo(f)>0.005); if(!ab.length) return "";
  const b = {av:0, a30:0, a60:0, a90:0}; ab.forEach(f=>{ const d = diasEntre(fechVenc(f), today()), v = fechSaldo(f); if(d<=0) b.av+=v; else if(d<=30) b.a30+=v; else if(d<=60) b.a60+=v; else b.a90+=v; });
  return `<div class="kpis aging"><div class="kpi"><span class="eyebrow">A vencer</span><span class="v">${brl(b.av)}</span></div><div class="kpi"><span class="eyebrow">Vencido 1–30 dias</span><span class="v" style="color:${b.a30?"var(--bad)":"inherit"}">${brl(b.a30)}</span></div><div class="kpi"><span class="eyebrow">Vencido 31–60</span><span class="v" style="color:${b.a60?"var(--bad)":"inherit"}">${brl(b.a60)}</span></div><div class="kpi"><span class="eyebrow">Mais de 60 dias</span><span class="v" style="color:${b.a90?"var(--bad)":"inherit"}">${brl(b.a90)}</span></div></div>`;
}
function naoFechadoHtml(){
  const ate = ymd(addDays(parseYmd(today()),-1)), ls = state.ap.filter(e=>!e.orcId && !e.andamento && e.data<=ate && !lockOf(e.data, empOf(e), e.profissional));
  const dp = state.desp.filter(x=>x.reembolsavel && !x.orcId && !despCobrada(x)), vdp = dp.reduce((s,x)=>s+despValor(x),0);
  if(!ls.length && !dp.length) return ""; const t = sumCalc(ls), datas = [...ls.map(e=>e.data), ...dp.map(x=>x.data)], first = datas.reduce((m,x)=>x<m?x:m, datas[0]), d = diasEntre(first, today());
  return `<div class="banner ${d>35?"warn":""}"><span><b>${brl(t.valor+vdp)}</b> ainda não fechado (${ls.length} OS${dp.length?` e ${dp.length} despesa(s) reembolsável(eis) de ${brl(vdp)}`:""} desde ${fdate(first)}${d>35?` — há ${d} dias`:""}).</span><button class="btn sm" data-act="irFechar" data-de="${first}">Fechar período</button></div>`;
}
function vFinanceiro(){
  const t = totalsReceber();
  const recH = state.rec.filter(r=>r.origem==="horas"), recEmp = r => r.empresa || state.cfg.contratante || "";
  const apH = state.ap.filter(e=>!e.orcId);
  const multiEmp = new Set([...apH.map(empOf), ...recH.map(recEmp)]).size > 1;
  const keys = [...new Set([...apH.map(e=>ym(e.data)+"|"+(multiEmp?empOf(e):"")), ...recH.map(r=>(r.competencia||"")+"|"+(multiEmp?recEmp(r):""))])].filter(k=>!k.startsWith("|")).sort((a,b)=>b.localeCompare(a));
  const fechRecs = state.rec.filter(r=>r.origem==="fech"), shareCache = {};
  const share = (f, m, emp) => { const key = f.id+"|"+m+"|"+emp; if(key in shareCache) return shareCache[key]; const rows = fechRows(f.de, f.ate, f.empresa||"", f.profissional||""), tot = sumCalc(rows).valor; return shareCache[key] = tot ? sumCalc(rows.filter(e=>ym(e.data)===m && (!multiEmp || empOf(e)===emp))).valor/tot : 0; };
  const mrows = keys.map(k=>{ const [m,emp] = k.split("|"); const doMes = apH.filter(e=>ym(e.data)===m && (!multiEmp || empOf(e)===emp)), c = sumCalc(doMes);
    c.valor = Math.round((sumCalc(doMes.filter(e=>!lockedE(e))).valor + state.fech.reduce((s,f)=>s + (+f.valor||0)*share(f, m, emp), 0))*100)/100;
    const rec = recH.filter(r=>r.competencia===m && (!multiEmp || recEmp(r)===emp)).reduce((s,r)=>s+recBruto(r),0)
      + fechRecs.reduce((s,r)=>{ const f = state.fech.find(x=>x.id===r.fechId); return s + (f ? recBruto(r)*share(f, m, emp) : 0); }, 0)
      + state.fech.reduce((s,f)=>s + fechGlosa(f)*share(f, m, emp), 0);
    return {m,emp,c,rec,saldo:Math.round((c.valor-rec)*100)/100}; });
  const fechs = [...state.fech].sort((a,b)=>(b.de||"").localeCompare(a.de||""));
  const aguard = fechs.reduce((s,f)=>s+fechSaldo(f),0);
  const byEmp = multiEmp ? [...new Set(mrows.map(r=>r.emp))].map(emp=>{ const rs=mrows.filter(r=>r.emp===emp); const v=rs.reduce((s,r)=>s+r.c.valor,0), rc=rs.reduce((s,r)=>s+r.rec,0); return {emp, v, rc, saldo:Math.max(0,Math.round((v-rc)*100)/100)}; }) : [];
  const orcs = state.orc.filter(orcAberto);
  const recs = [...state.rec].sort((a,b)=>(b.data||"").localeCompare(a.data||""));
  const stPill = (saldo, rec) => saldo<=0.005 ? '<span class="pill good">Recebido</span>' : rec>0 ? '<span class="pill warn">Parcial</span>' : '<span class="pill">Pendente</span>';
  return `${exampleBanner()}
  <div class="pagehead"><div><span class="eyebrow">Financeiro</span><h1>A receber</h1><p class="muted">Horas por mês de competência e orçamentos aprovados. Registre cada pagamento recebido para baixar o saldo.</p></div><div class="row"><button class="btn" data-act="pacoteContador">Pacote do contador</button><button class="btn primary" data-act="newRec">+ Registrar recebimento</button></div></div>
  <div class="kpis" style="margin:0">
    <div class="kpi"><span class="eyebrow">A receber total</span><span class="v">${brl(t.horas+t.orc)}</span><span class="s">horas + orçamentos</span></div>
    <div class="kpi"><span class="eyebrow">Horas a receber</span><span class="v">${brl(t.horas)}</span><span class="s">${brl(t.prod)} produzido${t.reemb?` + ${brl(t.reemb)} despesas`:""} · ${brl(t.recH)} recebido${t.glosas?` · ${brl(t.glosas)} glosado`:""}</span></div>
    <div class="kpi"><span class="eyebrow">Orçamentos a receber</span><span class="v">${brl(t.orc)}</span><span class="s">${brl(t.orcTot)} aprovado · ${brl(t.recO)} recebido</span></div>
    <div class="kpi"><span class="eyebrow">Fechamentos aguardando</span><span class="v">${brl(aguard)}</span><span class="s">${fechs.filter(f=>fechSaldo(f)>0.005).length} enviado(s) sem pagamento completo</span></div>
  </div>
  ${agingHtml(fechs)}
  ${naoFechadoHtml()}
  ${previsaoHtml()}
  <section class="section"><header><h2>Fechamentos enviados</h2><button class="btn sm" data-act="nav" data-view="relatorios">Fechar um período</button></header>
  ${fechs.length?`<div class="fechlist">${fechs.map(fechCard).join("")}</div>`:""}
  ${false?`<div class="tablewrap"><table><thead><tr><th>Nº</th><th>Período</th><th>Empresa</th><th class="r">OS</th><th class="r">Horas</th><th class="r">Valor</th><th class="r">Recebido</th><th class="r">Saldo</th><th>Situação</th><th></th></tr></thead>
  <tbody>${fechs.map(f=>{ const rc = fechRecebido(f), sd = fechSaldo(f); return `<tr><td class="mono"><b>${esc(f.numero)}</b></td><td class="mono">${fdate(f.de)} a ${fdate(f.ate)}</td><td>${esc(f.empresa||"Todas")}</td><td class="r mono">${f.os||0}</td><td class="r mono">${fdec(+f.horas||0)}</td><td class="r mono">${brl(+f.valor||0)}</td><td class="r mono">${brl(rc)}</td><td class="r mono">${brl(sd)}</td>
    <td>${sd<=0.005?'<span class="pill good">Recebido</span>':rc>0?'<span class="pill warn">Parcial</span>':'<span class="pill info">Enviado, aguardando</span>'}</td>
    <td><span class="row" style="flex-wrap:nowrap"><button class="btn sm" data-act="fechPdfBtn" data-id="${esc(f.id)}">PDF</button>${sd>0.005?`<button class="btn sm" data-act="newRec" data-o="fech" data-id="${esc(f.id)}" data-v="${sd}">Receber</button>`:""}<button class="btn sm danger" data-act="fechReabrir" data-id="${esc(f.id)}">Reabrir</button></span></td></tr>`; }).join("")}</tbody></table></div>`
  :fechs.length?"":`<div class="empty"><b>Nenhum período fechado</b>Em Relatórios, escolha “Período / fechamento” e toque em “Fechar período…” quando mandar o relatório para a empresa.</div>`}</section>
  ${byEmp.length?`<section class="section"><header><h2>Horas a receber por empresa</h2></header><div class="tablewrap"><table><thead><tr><th>Empresa</th><th class="r">Produzido</th><th class="r">Recebido</th><th class="r">A receber</th></tr></thead><tbody>${byEmp.map(r=>`<tr><td>${esc(r.emp||"(sem empresa)")}</td><td class="r mono">${brl(r.v)}</td><td class="r mono">${brl(r.rc)}</td><td class="r mono"><b>${brl(r.saldo)}</b></td></tr>`).join("")}</tbody></table></div></section>`:""}
  <section class="section"><header><h2>Horas por mês${multiEmp?" e empresa":""}</h2></header>
  ${mrows.length?`<div class="tablewrap"><table><thead><tr><th>Competência</th>${multiEmp?"<th>Empresa</th>":""}<th class="r hs">Normal</th><th class="r hs">Extra ${pct50()}</th><th class="r hs">Extra ${pct100()}</th><th class="r">Valor</th><th class="r">Recebido</th><th class="r">Saldo</th><th>Situação</th><th></th></tr></thead>
  <tbody>${mrows.map(r=>`<tr><td style="text-transform:capitalize">${ymLabel(r.m)}</td>${multiEmp?`<td>${esc(r.emp||"(sem empresa)")}</td>`:""}<td class="r mono hs">${fh(r.c.n)}</td><td class="r mono hs">${fh(r.c.e50)}</td><td class="r mono hs">${fh(r.c.e100)}</td><td class="r mono">${brl(r.c.valor)}</td><td class="r mono">${brl(r.rec)}</td><td class="r mono">${brl(Math.max(0,r.saldo))}</td><td>${stPill(r.saldo,r.rec)}</td><td>${r.saldo>0.005?`<button class="btn sm" data-act="newRec" data-o="horas" data-m="${r.m}" data-e="${esc(r.emp||"")}" data-v="${r.saldo}">Receber</button>`:""}</td></tr>`).join("")}</tbody></table></div>`
  :`<div class="empty"><b>Sem horas registradas</b>Os meses aparecem aqui conforme você aponta as OS.</div>`}</section>
  <section class="section"><header><h2>Orçamentos aprovados</h2></header>
  ${orcs.length?`<div class="tablewrap"><table><thead><tr><th>Nº</th><th>Cliente</th><th class="r">Total</th><th class="r">Recebido</th><th class="r">Saldo</th><th>Situação</th><th></th></tr></thead>
  <tbody>${orcs.map(o=>{const T=orcTotals(o).total, rec=orcRecebido(o.id), s=Math.round((T-rec)*100)/100; return `<tr><td class="mono">${esc(o.numero)}</td><td>${esc(o.cliente?.nome)}<br><span class="muted">${esc(o.titulo||"")}</span></td><td class="r mono">${brl(T)}</td><td class="r mono">${brl(rec)}</td><td class="r mono">${brl(Math.max(0,s))}</td><td>${stPill(s,rec)}</td><td>${s>0.005?`<button class="btn sm" data-act="newRec" data-o="orc" data-id="${esc(o.id)}" data-v="${s}">Receber</button>`:""}</td></tr>`;}).join("")}</tbody></table></div>`
  :`<div class="empty"><b>Nenhum orçamento aprovado</b>Quando você marcar um orçamento como Aprovado, ele entra aqui como valor a receber.</div>`}</section>
  ${despSection()}
  ${anualHtml()}
  <section class="section"><header><h2>Recebimentos registrados</h2><span class="muted">${brl(state.rec.filter(r=>ym(r.data||"")===ym(today())).reduce((s,r)=>s+numIn(r.valor),0))} recebido em ${ymLabel(ym(today()))}</span></header>
  ${recs.length?`<div class="tablewrap"><table><thead><tr><th>Data</th><th>Origem</th><th class="hs">Observação</th><th class="r">Valor</th><th></th></tr></thead>
  <tbody>${recs.map(r=>`<tr><td class="mono">${fdate(r.data)}</td><td>${r.origem==="fech"?`Fechamento ${esc(state.fech.find(f=>f.id===r.fechId)?.numero||"(reaberto)")}${r.empresa?` · ${esc(r.empresa)}`:""}`:r.origem==="horas"?`Horas · <span style="text-transform:capitalize">${ymLabel(r.competencia||"2000-01")}</span>${multiEmp?` · ${esc(recEmp(r))}`:""}`:`Orçamento ${esc(state.orc.find(o=>o.id===r.orcId)?.numero||"(excluído)")}`}${r.exemplo?' <span class="pill">Exemplo</span>':""}</td><td class="hs">${esc(r.obs||"")}</td><td class="r mono">${brl(numIn(r.valor))}</td><td><button class="btn sm danger" data-act="delRec" data-id="${esc(r.id)}">Excluir</button></td></tr>`).join("")}</tbody></table></div>`
  :`<div class="empty"><b>Nenhum recebimento registrado</b>Use “Registrar recebimento” quando a empresa ou o cliente pagar.</div>`}</section>`;
}
/* ---------- indicadores do mês para a gerência da contratante ---------- */
async function indicadoresPdf(f){
  const fs = f.profissional && fechIrmaos(f).length ? fechIrmaos(f) : [f], emp = f.empresa || state.cfg.contratante || "";
  const rows = fs.flatMap(x=>x.snap?.aps || fechRows(x.de, x.ate, x.empresa||"", x.profissional||"")).filter(e=>!e.andamento && !e.orcId);
  if(!rows.length){ toast("Esse fechamento não tem OS lançadas no app."); return; }
  const doc = pdfDoc(); if(!doc) return; const W = pw(doc), t = sumCalc(rows), H = m => fdec(m);
  let y = pdfHeader(doc, "INDICADORES DO MÊS", [emp, `${fdate(f.de)} a ${fdate(f.ate)}`]);
  const emerg = rows.filter(e=>e.emergencia), resp = emerg.map(e=>e.acion?.as ? ((hm(e.inicio)-hm(e.acion.as))+1440)%1440 : null).filter(v=>v!=null && v<720);
  const chs = (state.chamados||[]).filter(c=>chaveEmp(c.empresa)===chaveEmp(emp) && c.status==="atendido" && c.criado_em.slice(0,10)>=f.de && c.criado_em.slice(0,10)<=f.ate);
  const tChs = chs.map(c=>Math.round((new Date(c.atendido_em)-new Date(c.criado_em))/60000));
  const tResp = [...tChs, ...resp], media = tResp.length ? Math.round(tResp.reduce((a,b)=>a+b,0)/tResp.length) : null;
  const prev = rows.filter(e=>e.prevId), assin = rows.filter(assinOS), osN = new Set(rows.map(e=>e.os||e.id)).size;
  const kpis = [["OS atendidas", String(osN)], ["Horas trabalhadas", H(t.total)+" h"], ["Horas normais", t.total ? Math.round(100*t.n/t.total)+"%" : "-"], ["Emergências", String(emerg.length)],
    ["Tempo médio de resposta", media==null ? "-" : media<60 ? `${media} min` : `${Math.floor(media/60)}h${pad(media%60)}`], ...(state.cfg.preventivas?[["Preventivas realizadas", String(prev.length)]]:[]), ["OS assinadas pela unidade", rows.length ? Math.round(100*assin.length/rows.length)+"%" : "-"]];
  const bw = (W-28-6*3)/4;
  kpis.forEach(([l,v],i)=>{ const x = 14 + (i%4)*(bw+3), yy = y + Math.floor(i/4)*24; doc.setFillColor(240,246,242); doc.roundedRect(x, yy, bw, 21, 2, 2, "F");
    doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...GREY); doc.text(l.toUpperCase(), x+3, yy+6); doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.setTextColor(...INK); doc.text(v, x+3, yy+16); });
  y += 52;
  const uni = {}; rows.forEach(e=>{ const u = e.cliente||"(sem unidade)", c = calc(e); (uni[u] ||= {os:new Set(), m:0}); uni[u].os.add(e.os||e.id); uni[u].m += c.total; });
  const us = Object.entries(uni).sort((a,b)=>b[1].m-a[1].m), mx = Math.max(...us.map(u=>u[1].m), 1);
  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(...NAVY); doc.text("Horas por unidade", 14, y); y += 3;
  doc.autoTable({startY:y, theme:"plain", margin:{left:14, right:14}, head:[["Unidade","OS","Horas","%",""]], body:us.map(([u,v])=>[u, String(v.os.size), H(v.m), Math.round(100*v.m/(t.total||1))+"%", ""]),
    styles:{fontSize:8.5, cellPadding:1.4, textColor:INK}, headStyles:{textColor:GREY, fontStyle:"bold"}, columnStyles:{0:{cellWidth:62}, 1:{halign:"right", cellWidth:14}, 2:{halign:"right", cellWidth:20}, 3:{halign:"right", cellWidth:14}},
    didDrawCell:d=>{ if(d.section==="body" && d.column.index===4){ const v = us[d.row.index][1].m; doc.setFillColor(...GREEN); doc.rect(d.cell.x+2, d.cell.y+1.6, (d.cell.width-4)*v/mx, d.cell.height-3.2, "F"); } }});
  y = doc.lastAutoTable.finalY + 8;
  const eqs = {}; rows.filter(e=>e.equipId).forEach(e=>{ const q = eqDe(e.equipId); const k = q ? `${q.tag||""} ${q.nome||""}`.trim() : e.equipId; (eqs[k] ||= {n:0, m:0}); eqs[k].n++; eqs[k].m += calc(e).total; });
  const top = Object.entries(eqs).sort((a,b)=>b[1].m-a[1].m).slice(0,10);
  if(top.length){ if(y > ph(doc)-60){ doc.addPage(); y = 20; } doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(...NAVY); doc.text("Equipamentos com mais horas", 14, y); y += 3;
    doc.autoTable({startY:y, theme:"striped", margin:{left:14, right:14}, head:[["Equipamento","OS","Horas"]], body:top.map(([k,v])=>[k, String(v.n), H(v.m)]), styles:{fontSize:8.5, cellPadding:1.4, textColor:INK}, headStyles:{fillColor:GREEN}, columnStyles:{1:{halign:"right"},2:{halign:"right"}}}); y = doc.lastAutoTable.finalY + 8; }
  if(emerg.length){ if(y > ph(doc)-60){ doc.addPage(); y = 20; } doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(...NAVY); doc.text("Emergências atendidas", 14, y); y += 3;
    doc.autoTable({startY:y, theme:"striped", margin:{left:14, right:14}, head:[["Data","OS","Unidade","Motivo","Acionado","Início","Resposta"]],
      body:emerg.map(e=>{ const r = e.acion?.as ? ((hm(e.inicio)-hm(e.acion.as))+1440)%1440 : null; return [fdate(e.data), e.os||"-", e.cliente||"", e.acion?.motivo||e.descricao||"", e.acion?.as||"-", e.inicio, r==null||r>=720 ? "-" : `${r} min`]; }),
      styles:{fontSize:8, cellPadding:1.3, textColor:INK}, headStyles:{fillColor:GREEN}}); y = doc.lastAutoTable.finalY + 8; }
  const atras = state.eq.filter(q=>!q.inativo && chaveEmp(q.empresa||emp)===chaveEmp(emp)).flatMap(q=>prevStatus(q).filter(s=>s.nivel==="bad").map(s=>[`${q.tag||""} ${q.nome||""}`.trim(), s.pl.atividade||"", s.ult?fdate(s.ult):"nunca", fdate(s.prox)]));
  if(state.cfg.preventivas && (prev.length || atras.length)){ if(y > ph(doc)-60){ doc.addPage(); y = 20; } doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(...NAVY); doc.text(`Preventivas: ${prev.length} realizada(s) no período${atras.length?`, ${atras.length} pendente(s)`:""}`, 14, y); y += 3;
    if(atras.length){ doc.autoTable({startY:y, theme:"striped", margin:{left:14, right:14}, head:[["Equipamento","Atividade","Última","Prevista"]], body:atras, styles:{fontSize:8, cellPadding:1.3, textColor:INK}, headStyles:{fillColor:[180,120,20]}}); y = doc.lastAutoTable.finalY + 8; } }
  pdfFooter(doc); await offerFile(`indicadores-${slug(emp)}-${(f.ate||"").slice(0,7)}.pdf`, doc.output("blob"));
}
/* ---------- relatório anual para o contador ---------- */
function anualDados(ano){
  const r2 = v => Math.round(v*100)/100;
  return Array.from({length:12}, (_,i)=>{ const m = `${ano}-${pad(i+1)}`;
    const fs = state.fech.filter(f=>compDe(f)===m), rs = state.rec.filter(r=>ym(r.data||"")===m);
    const ret = Object.fromEntries(RETS.map(([k])=>[k, r2(rs.reduce((s,r)=>s+numIn((r.ret||{})[k]),0))]));
    const pg = state.pag.filter(x=>ym(x.data||"")===m && ["vale","pagamento","bancoPago","bonus"].includes(x.tipo)).reduce((s,x)=>s+numIn(x.valor),0) - state.pag.filter(x=>ym(x.data||"")===m && x.tipo==="desconto").reduce((s,x)=>s+numIn(x.valor),0);
    const o = {m, fat:r2(fs.reduce((s,f)=>s+(+f.valor||0),0)), reemb:r2(fs.reduce((s,f)=>s+(+f.reemb||0),0)), glosa:r2(fs.reduce((s,f)=>s+fechGlosa(f),0)),
      liq:r2(rs.reduce((s,r)=>s+numIn(r.valor),0)), ret, desp:r2(state.desp.filter(x=>ym(x.data||"")===m && !x.orcId).reduce((s,x)=>s+despValor(x),0)), equipe:r2(pg)};
    o.bruto = r2(o.liq + RETS.reduce((s,[k])=>s+o.ret[k],0)); o.result = r2(o.liq - o.desp - o.equipe); return o; });
}
const anoAnual = () => state.anual || today().slice(0,4);
function anualAnos(){ const ys = new Set([today().slice(0,4)]); state.fech.forEach(f=>ys.add(compDe(f).slice(0,4))); state.rec.forEach(r=>r.data && ys.add(r.data.slice(0,4))); return [...ys].filter(Boolean).sort().reverse(); }
const ANUAL_COLS = [["fat","Faturado (fechamentos)"],["glosa","Glosas"],["bruto","Recebido bruto"],...RETS.map(([k,l])=>["ret."+k, l+" retido"]),["liq","Recebido líquido"],["desp","Despesas"],["equipe","Pago à equipe"],["result","Resultado (caixa)"]];
const anualVal = (o, k) => k.startsWith("ret.") ? o.ret[k.slice(4)] : o[k];
function anualHtml(){
  const ano = anoAnual(), ds = anualDados(ano), tot = k => ds.reduce((s,o)=>s+anualVal(o,k),0);
  return `<section class="section" id="anual"><header><h2>Relatório anual (contador / imposto de renda)</h2><div class="row"><select id="anual-ano" aria-label="Ano">${anualAnos().map(y=>`<option ${y===ano?"selected":""}>${y}</option>`).join("")}</select><button class="btn sm" data-act="anualPdf">PDF</button><button class="btn sm" data-act="anualXlsx">Excel</button></div></header>
  <div class="tablewrap"><table><thead><tr><th>Mês</th>${ANUAL_COLS.map(([,l])=>`<th class="r">${l}</th>`).join("")}</tr></thead>
  <tbody>${ds.map(o=>`<tr><td style="text-transform:capitalize">${MESES[+o.m.slice(5)-1]}</td>${ANUAL_COLS.map(([k])=>`<td class="r mono">${anualVal(o,k)?brl(anualVal(o,k)):"-"}</td>`).join("")}</tr>`).join("")}</tbody>
  <tfoot><tr><th>Total ${ano}</th>${ANUAL_COLS.map(([k])=>`<th class="r mono">${brl(tot(k))}</th>`).join("")}</tr></tfoot></table></div>
  <p class="muted" style="margin:0">Faturado pela competência do fechamento; recebido, retenções, despesas e pagamentos pela data em que aconteceram.</p></section>`;
}
document.addEventListener("change", async e=>{ if(e.target.id==="pt-val"){ await portalSalvarFicha(e.target.dataset.emp, {portalValores:e.target.checked}); portalPublicar(); toast(e.target.checked ? "Valores aparecem no portal." : "Valores escondidos do portal."); } });
document.addEventListener("change", e=>{ if(e.target.id==="anual-ano"){ state.anual = e.target.value; state.rendered = null; render(); } });
async function anualRel(fmt){
  const ano = anoAnual(), ds = anualDados(ano), tot = k => Math.round(ds.reduce((s,o)=>s+anualVal(o,k),0)*100)/100, nome = `relatorio-anual-${slug(state.cfg.empresa.nome||"gaap")}-${ano}`;
  if(fmt==="xlsx"){
    if(!window.XLSX) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
    const X = window.XLSX, aoa = [[`${state.cfg.empresa.nome} - CNPJ ${state.cfg.empresa.cnpj||""}`], [`Relatório anual ${ano}`], [], ["Mês", ...ANUAL_COLS.map(([,l])=>l)], ...ds.map(o=>[MESES[+o.m.slice(5)-1], ...ANUAL_COLS.map(([k])=>anualVal(o,k))]), ["TOTAL", ...ANUAL_COLS.map(([k])=>tot(k))]];
    const ws = X.utils.aoa_to_sheet(aoa); ws["!cols"] = [{wch:12}, ...ANUAL_COLS.map(()=>({wch:16}))];
    for(let r=4; r<aoa.length; r++) for(let c=1; c<=ANUAL_COLS.length; c++){ const cell = ws[X.utils.encode_cell({r,c})]; if(cell && typeof cell.v==="number") cell.z = "#,##0.00"; }
    const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, String(ano));
    return offerFile(nome+".xlsx", new Blob([X.write(wb, {type:"array", bookType:"xlsx"})], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
  }
  const doc = pdfDoc(true); if(!doc) return;
  const y = pdfHeader(doc, `RELATÓRIO ANUAL ${ano}`, [`Faturamento, recebimentos e retenções`, `Emitido em ${fdate(today())}`]);
  doc.autoTable({startY:y, theme:"grid", margin:{left:14, right:14}, head:[["Mês", ...ANUAL_COLS.map(([,l])=>l)]],
    body: ds.map(o=>[MESES[+o.m.slice(5)-1], ...ANUAL_COLS.map(([k])=>n2(anualVal(o,k)))]), foot:[["TOTAL", ...ANUAL_COLS.map(([k])=>n2(tot(k)))]],
    styles:{fontSize:7.5, cellPadding:1.2, textColor:INK, halign:"right"}, headStyles:{fillColor:GREEN, textColor:255, halign:"center", fontSize:7}, footStyles:{fillColor:[255,240,150], textColor:INK, fontStyle:"bold", halign:"right"}, columnStyles:{0:{halign:"left", fontStyle:"bold"}}});
  doc.setFontSize(7.5); doc.setTextColor(...GREY); doc.text("Faturado pela competência do fechamento; recebido, retenções, despesas e pagamentos pela data em que aconteceram. Valores em R$.", 14, doc.lastAutoTable.finalY + 6);
  pdfFooter(doc); await offerFile(nome+".pdf", doc.output("blob"));
}
function recForm(o){
  const orcs = state.orc.filter(orcAberto), fs = state.fech.filter(f=>fechSaldo(f)>0.005 || f.id===o.id);
  if(!o.o && fs.length){ o = {...o, o:"fech", id:fs[0].id}; }
  if(o.o==="horas" && o.m){ const f = fs.find(f=>f.de.slice(0,7)<=o.m && f.ate.slice(0,7)>=o.m && (!f.empresa || !o.e || chaveEmp(f.empresa)===chaveEmp(o.e))); if(f) o = {...o, o:"fech", id:f.id, v:fechSaldo(f)}; }
  return `<header><h2>Registrar recebimento</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <form class="form" id="recForm">
    <div class="grid2"><label class="field"><span>Data do pagamento</span><input type="date" id="r-data" value="${today()}" required></label>
    <label class="field"><span>Valor recebido (R$)</span><input id="r-valor" inputmode="decimal" value="${o.v?String(o.v).replace(".",","):""}" required></label></div>
    <label class="field"><span>Referente a</span><select id="r-origem"><option value="fech" ${o.o==="fech"?"selected":""} ${fs.length?"":"disabled"}>Fechamento enviado</option><option value="horas" ${!o.o||o.o==="horas"?"selected":""}>Horas trabalhadas (por mês)</option><option value="orc" ${o.o==="orc"?"selected":""} ${orcs.length?"":"disabled"}>Orçamento aprovado</option></select></label>
    <label class="field" id="r-fech-w" ${o.o==="fech"?"":"hidden"}><span>Fechamento</span><select id="r-fech">${fs.map(f=>`<option value="${esc(f.id)}" ${f.id===o.id?"selected":""}>${esc(f.numero)} · ${fdate(f.de)} a ${fdate(f.ate)} · saldo ${brl(fechSaldo(f))}</option>`).join("")}</select></label>
    <div class="grid2" id="r-comp-w" ${o.o==="orc"||o.o==="fech"?"hidden":""}><label class="field"><span>Mês de competência</span><input type="month" id="r-comp" value="${o.m||ym(today())}"></label>
    <label class="field"><span>Empresa que pagou</span><select id="r-emp">${dimVals("emp").map(v=>`<option ${v===(o.e||state.cfg.contratante)?"selected":""}>${esc(v)}</option>`).join("")||'<option value="">(sem empresa)</option>'}</select></label></div>
    <label class="field" id="r-orc-w" ${o.o==="orc"?"":"hidden"}><span>Orçamento</span><select id="r-orc">${orcs.map(x=>`<option value="${esc(x.id)}" ${x.id===o.id?"selected":""}>${esc(x.numero)} · ${esc(x.cliente?.nome)} · ${brl(orcTotals(x).total)}</option>`).join("")}</select></label>
    <details class="fichabox"><summary>Houve retenção de impostos? (ISS, INSS, IR)</summary>
      <p class="muted" style="margin:6px 0">O valor recebido é o que caiu na conta. As retenções também baixam o saldo e ficam anotadas para o contador.</p>
      <div class="grid2">${RETS.map(([k,l])=>`<label class="field"><span>${l} retido (R$)</span><input id="r-ret-${k}" inputmode="decimal" placeholder="0,00"></label>`).join("")}</div>
    </details>
    <div class="grid2"><label class="field"><span>Forma</span><select id="r-forma"><option>PIX</option><option>TED / transferência</option><option>Boleto</option><option>Dinheiro</option><option>Cheque</option></select></label>
    <label class="field"><span>Observação</span><input id="r-obs" placeholder="Ex.: nota fiscal 123"></label></div>
    <footer><span></span><button class="btn primary" type="submit">Salvar recebimento</button></footer>
  </form>`;
}
document.addEventListener("change", e=>{ if(e.target.id==="r-origem"){ const v=e.target.value; $("#r-comp-w").hidden=v!=="horas"; $("#r-orc-w").hidden=v!=="orc"; $("#r-fech-w").hidden=v!=="fech"; } });
async function gerarPacoteContador(m, btn){
  if(!m) return; if(btn){ btn.disabled = true; btn.textContent = "Preparando…"; }
  try{
    if(!window.XLSX) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
    if(!window.JSZip) await loadScript(JSZIP);
    const X = window.XLSX, wb = X.utils.book_new(), noMes = d => (d||"").slice(0,7)===m;
    const fechs = state.fech.filter(f=>noMes(f.nf?.data) || noMes(f.enviadoEm));
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Fechamento","Período","Empresa","Valor serviços","Despesas reemb.","Glosas","Nº NF","Emissão NF","Situação NF","Vencimento"],
      ...fechs.map(f=>[f.numero, `${fdate(f.de)} a ${fdate(f.ate)}`, f.empresa||"", +f.valor||0, +f.reemb||0, fechGlosa(f), f.nf?.numero||"", fdate(f.nf?.data||""), f.nf?.status||(f.nf?.numero?"emitida":"a emitir"), fdate(fechVenc(f))])]), "Notas e fechamentos");
    const recs = state.rec.filter(r=>noMes(r.data));
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Data","Origem","Empresa","Valor recebido","ISS retido","INSS retido","IR retido","Outras retenções","Total (bruto)","Forma","Observação"],
      ...recs.map(r=>[fdate(r.data), r.origem==="fech" ? (state.fech.find(f=>f.id===r.fechId)?.numero||"fechamento") : r.origem==="orc" ? "orçamento" : "horas", r.empresa||"", numIn(r.valor), numIn(r.ret?.iss), numIn(r.ret?.inss), numIn(r.ret?.ir), numIn(r.ret?.outras), recBruto(r), r.forma||"", r.obs||""])]), "Recebimentos");
    const desp = state.desp.filter(x=>noMes(x.data));
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Data","Tipo","Valor","Reembolsável","Empresa","OS","Observação","Comprovante"],
      ...desp.map(x=>[fdate(x.data), x.tipo||"", despValor(x), x.reembolsavel?"sim":"não", x.empresa||"", x.os||"", x.obs||"", (x.fotos||[]).length?`comprovantes/${x.id}-1.jpg`:""])]), "Despesas");
    const tot = k => recs.reduce((s,r)=>s+numIn(r.ret?.[k]),0);
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Resumo de "+ymLabel(m)], [], ["Serviços faturados (fechamentos do mês)", fechs.reduce((s,f)=>s+(+f.valor||0),0)],
      ["Recebido (líquido)", recs.reduce((s,r)=>s+numIn(r.valor),0)], ["ISS retido", tot("iss")], ["INSS retido", tot("inss")], ["IR retido", tot("ir")], ["Outras retenções", tot("outras")],
      ["Despesas do mês", desp.reduce((s,x)=>s+despValor(x),0)], ["Despesas reembolsáveis", desp.filter(x=>x.reembolsavel).reduce((s,x)=>s+despValor(x),0)]]), "Resumo");
    const zip = new JSZip(); zip.file(`contador-${m}.xlsx`, X.write(wb, {type:"array", bookType:"xlsx"}));
    const ids = desp.flatMap(x=>(x.fotos||[]).map((id,i)=>[x, id, i])); await assinarFotos(ids.map(z=>z[1]));
    for(const [x, id, i] of ids){ try{ const r = await fetch(assetUrls[id]); if(r.ok) zip.file(`comprovantes/${x.id}-${i+1}.jpg`, await r.blob()); }catch(err){} }
    const blob = await zip.generateAsync({type:"blob"}); closeModal();
    await offerFile(`pacote-contador-${m}.zip`, blob);
  }catch(err){ toast("Não consegui gerar o pacote. Verifique a conexão."); if(btn){ btn.disabled = false; btn.textContent = "Gerar pacote"; } }
}
function nfTexto(f){
  const E = state.cfg.empresa, F0 = ficha(f.empresa||state.cfg.contratante||""), iss = numIn(E.issPct), comp = f.competencia || (f.ate||"").slice(0,7);
  const extra = `\nCompetência: ${COMPET[+comp.slice(5,7)-1]||""}/${comp.slice(0,4)}.${f.pedido?` Pedido de compra: ${f.pedido}.`:""}${F0.codigo?` Fornecedor ${F0.codigo}.`:""}${E.codServico?`\nCódigo do serviço (LC 116): ${E.codServico}.`:""}${iss?` ISS ${String(iss).replace(".",",")}%: ${brl(Math.round((+f.valor||0)*iss)/100)}.`:""}`;
  if(f.itens){ const t = f.totais || totaisTerceiros(f.itens);
    return `Prestação de serviços de manutenção mecânica industrial${F0.razao||f.empresa?` para ${F0.razao||f.empresa}`:""}, conforme fechamento ${f.numero}.
Ordens de serviço: ${f.itens.map(x=>x.os).filter(Boolean).join(", ")}.
Horas normais: ${n2(t.hn)} h; extras 50%: ${n2(t.h50)} h; extras 100%: ${n2(t.h100)} h${t.not?`; adicional noturno: ${n2(t.not)} h`:""}. Valor dos serviços: ${brl(+f.valor||0)}.${extra}`; }
  return nfTextoHoras(f) + extra;
}
function nfTextoHoras(f){
  const aps = (f.snap?.aps) || fechRows(f.de, f.ate, f.empresa||"", f.profissional||""), cfg = f.snap?.cfg || state.cfg;
  const taxas = [...new Map(aps.map(e=>{ const t = {...rateFor(empOf(e)), ...(e.valorHora!=null?{valorHora:+e.valorHora}:{}), ...(e.extraPct!=null?{extraPct:+e.extraPct}:{}), ...(e.feriadoPct!=null?{feriadoPct:+e.feriadoPct}:{})}; return [JSON.stringify(t), t]; })).values()];
  const T = taxas[0] || rateFor(f.empresa||state.cfg.contratante||"");
  const c = (()=>{ const ap = state.ap, cf = state.cfg; state.ap = aps; state.cfg = {...cf, ...cfg}; holCache = {}; try{ return sumCalc(aps); } finally { state.ap = ap; state.cfg = cf; holCache = {}; } })();
  const F = ficha(f.empresa||state.cfg.contratante||""), oss = [...new Set(aps.map(e=>e.os).filter(Boolean))];
  return `Prestação de serviços de manutenção mecânica industrial${F.razao||f.empresa?` para ${F.razao||f.empresa}`:""}, conforme fechamento ${f.numero}, período de ${fdate(f.de)} a ${fdate(f.ate)}.
Ordens de serviço: ${oss.length?oss.join(", "):"-"}.
Horas normais: ${fdec(c.n)} h; horas extras ${T.extraPct}%: ${fdec(c.e50)} h; horas extras ${T.feriadoPct}% (domingos e feriados): ${fdec(c.e100)} h. Total: ${fdec(c.total)} h.
${taxas.length>1 ? `Valores da hora: ${taxas.map(t=>brl(t.valorHora)).join(", ")}.` : `Valor da hora: ${brl(T.valorHora)}.`} Valor dos serviços: ${brl(+f.valor||0)}.${+f.reemb?`
Despesas reembolsáveis: ${brl(+f.reemb)}. Total: ${brl((+f.valor||0)+(+f.reemb))}.`:""}`;
}
document.addEventListener("submit", async e=>{
  if(e.target.id==="nfForm"){ e.preventDefault(); const f = state.fech.find(x=>x.id===e.target.dataset.id); if(!f) return;
    const nf = {numero:$("#nf-num").value.trim(), data:$("#nf-data").value, status:$("#nf-st").value};
    try{ await save("fechamentos", {...f, nf, vencimento:$("#nf-venc").value || fechVenc(f)}); closeModal(); toast("Nota fiscal salva"); }catch(err){ toast(writeErr(err)); } }
  if(e.target.id==="glosaForm"){ e.preventDefault(); const f = state.fech.find(x=>x.id===e.target.dataset.id); if(!f) return;
    const v = numIn($("#gl-v").value); if(!(v>0)){ toast("Informe o valor glosado."); return; }
    const o = $("#gl-os"), ap = (f.snap?.aps||state.ap).find(x=>x.id===o.value);
    const g = {data:today(), valor:v, motivo:$("#gl-mot").value, obs:$("#gl-obs").value.trim(), ...(ap?{apId:ap.id, os:ap.os||""}:{})};
    if(v > fechSaldo(f)+0.005){ toast(`A glosa não pode passar do saldo (${brl(fechSaldo(f))}).`); return; }
    try{ await save("fechamentos", {...f, glosas:[...(f.glosas||[]), g]}); closeModal(); toast(`Glosa de ${brl(v)} registrada`); }catch(err){ toast(writeErr(err)); } }
  if(e.target.id==="despForm"){ e.preventDefault(); submitDesp(); }
  if(e.target.id==="cronoForm"){ e.preventDefault(); submitCrono(); }
  if(e.target.id==="ordForm"){ e.preventDefault(); const id = e.target.dataset.id, old = state.ord.find(x=>x.id===id) || {}, os = $("#od-os").value.replace(/\D/g,"");
    if(!os){ toast("Informe o nº da OS."); return; }
    const empF = $("#od-emp").value.trim(), dup = state.ord.find(x=>x.id!==id && soDig(x.os)===os && (!x.empresa || !empF || chaveEmp(x.empresa)===chaveEmp(empF)));
    if(dup){ toast(`A OS ${os} já está na carteira: abrindo a existente.`); openModal(ordForm(dup)); return; }
    const x = {...old, id: id || idOrdem(os, empF), os, tracos:limpaTracos($("#od-tid").value), titulo:$("#od-tit").value.trim(), empresa:$("#od-emp").value.trim(), unidade:$("#od-unid").value.trim(), vencimento:$("#od-venc").value, prioridade:$("#od-prior").value.trim(), obs:$("#od-obs").value.trim()};
    if(!id){ x.recebidaEm = new Date().toISOString(); x.recebidaPor = state.me || perfil?.nome || nomeDoEmail(session?.user?.email); }
    try{ await save("ordens", x); state.modalDirty = false; closeModal(); state.rendered = null; render(); toast(`OS ${os} salva na carteira.`); }catch(err){ toast(writeErr(err)); } }
  if(e.target.id==="pagForm"){ e.preventDefault(); const id = e.target.dataset.id, old = state.pag.find(x=>x.id===id) || {};
    const x = {...old, id: id || (state.pgId ||= uid()), profissional:$("#pg-prof").value, tipo:$("#pg-tipo").value, data:$("#pg-data").value, valor:numIn($("#pg-valor").value), obs:$("#pg-obs").value.trim()};
    if(HORAS_PAG.includes(x.tipo)){ x.horas = numIn($("#pg-horas").value); if(!(x.horas>0)){ toast("Informe quantas horas."); return; } if(x.tipo==="folga") x.valor = 0; } else delete x.horas;
    if(!id && x.tipo==="pagamento") x.ref = {...state.eqp};
    if(!x.profissional || !x.data || (x.tipo!=="folga" && !(x.valor>0))){ toast("Informe funcionário, data e valor."); return; }
    try{ await save("pagamentos", x); state.pgId = null; state.modalDirty = false; closeModal(); render(); toast(`${TIPOS_PAG[x.tipo][0]} de ${pagValTxt(x)} para ${x.profissional} salvo.`); }catch(err){ toast(writeErr(err)); } }
  if(e.target.id==="docForm"){ e.preventDefault(); const id = e.target.dataset.id, old = state.docs.find(x=>x.id===id) || {}, btn = e.target.querySelector("[type=submit]");
    const x = {...old, id: id || (state.dcId ||= uid()), tipo:$("#dc-tipo").value, titular:$("#dc-tit").value, emissao:$("#dc-emi").value, validade:$("#dc-val").value, obs:$("#dc-obs").value.trim()};
    // FGTS/DARF valem pela última competência: sem validade informada, vence no fim do mês seguinte à emissão
    if(DOC_MENSAL.has(x.tipo) && !x.validade){ const d = parseYmd(x.emissao || today()); x.validade = ymd(new Date(d.getFullYear(), d.getMonth()+2, 0)); }
    try{ btn.disabled = true;
      if(state.docArq){ const f = state.docArq, ext = (f.name.split(".").pop()||"pdf").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,5) || "pdf", path = `docs/${uid()}.${ext}`;
        const {error} = await sb.storage.from("documentos").upload(path, f, {contentType: f.type || "application/pdf"}); if(error) throw {code:"db", message:"Não consegui enviar o arquivo: "+error.message}; x.arquivo = path; }
      await save("documentos", x); state.dcId = null; state.docArq = null; state.modalDirty = false; closeModal(); render(); toast("Documento salvo.");
    }catch(err){ btn.disabled = false; toast(writeErr(err)); } }
  if(e.target.id==="eqForm"){ e.preventDefault(); lerEqPlano(); const id = e.target.dataset.id, old = state.eq.find(x=>x.id===id) || {};
    const x = {...old, id: id || (state.eqId ||= uid()), tag:$("#eqf-tag").value.trim(), nome:$("#eqf-nome").value.trim(), empresa:$("#eqf-emp").value.trim(), unidade:$("#eqf-unid").value.trim(), obs:$("#eqf-obs").value.trim(),
      inativo: $("#eqf-inativo") ? $("#eqf-inativo").checked : false, plano: state.eqPlano.filter(p=>p.atividade.trim()).map(p=>({id:p.id||uid(), atividade:p.atividade.trim(), cadaDias:Math.max(1, +p.cadaDias||30), horasPrev:p.horasPrev}))};
    if(!x.tag){ toast("Informe a TAG."); return; }
    if(state.eq.some(q=>q.id!==x.id && chaveEmp(q.tag)===chaveEmp(x.tag))){ toast(`Já existe um equipamento com a TAG ${x.tag}.`); return; }
    try{ await save("equipamentos", x); state.eqId = null; state.modalDirty = false; closeModal(); render(); toast(`Equipamento ${x.tag} salvo.`); }catch(err){ toast(writeErr(err)); } }
  if(e.target.id==="reajForm"){ e.preventDefault(); const emp = e.target.dataset.emp, novo = numIn($("#rj-valor").value), desde = $("#rj-desde").value;
    if(!(novo>0) || !desde){ toast("Informe o novo valor e a data."); return; }
    const c = clone(state.cfg); c.taxas ||= {}; const t = c.taxas[emp] ||= {}, T = rateFor(emp);
    t.historico = [...(t.historico||[]).filter(h=>h.ate < desde), {ate:desde, valorHora:T.valorHora, extraPct:T.extraPct, feriadoPct:T.feriadoPct}];
    t.valorHora = novo; t.desde = desde;
    try{ await saveCfg(c); state.cfg = deepMerge(DEFAULT_CFG, c); calcCache = new WeakMap();
      // lançamentos já feitos a partir da vigência (e ainda não fechados) passam para o novo valor
      const alvo = state.ap.filter(x=>x.data>=desde && chaveEmp(empOf(x))===chaveEmp(emp) && !lockedE(x) && !x.orcId && +x.valorHora===+T.valorHora);
      let n = 0; for(const x of alvo){ try{ await save("apontamentos", {...x, valorHora:novo}); n++; }catch(_){} }
      closeModal(); state.rendered = null; render(); toast(`Novo valor de ${brl(novo)} vale a partir de ${fdate(desde)}.${n?` ${n} lançamento(s) já feitos foram atualizados.`:""}`); }catch(err){ toast(writeErr(err)); } }
  if(e.target.id==="empForm"){ e.preventDefault(); const nome = $("#ne-nome").value.trim(), un = lines($("#ne-unids").value);
    if(!nome){ toast("Informe o nome da empresa."); return; }
    if(empresasCfg().some(x=>chaveEmp(x)===chaveEmp(nome))){ toast(`A empresa ${nome} já existe. Edite as unidades na ficha dela.`); return; }
    const c = clone(state.cfg); c.empresas = [...lines(c.empresas), nome].join("\n"); c.contratantes ||= {}; c.contratantes[nome] = {...(c.contratantes[nome]||{}), unidades:un.join("\n")};
    try{ await saveCfg(c); state.cfg = deepMerge(DEFAULT_CFG, c); state.modalDirty = false; closeModal(); state.cfgDirty = false; state.rendered = null; render(); toast(`Empresa ${nome} criada${un.length?` com ${un.length} unidade(s)`:""}.`); }catch(err){ toast(writeErr(err)); } }
  if(e.target.id==="contForm"){ e.preventDefault(); gerarPacoteContador($("#ct-mes").value, e.target.querySelector("[type=submit]")); }
});
document.addEventListener("change", async e=>{ if(e.target.id!=="conf-arq" || !e.target.files[0]) return; const f = state.fech.find(x=>x.id===state.confId); if(!f) return;
  toast("Lendo a planilha…"); try{ const l = await lerPlanilhaFiscal(e.target.files[0]); openModal(conferirHtml(f, l), "wide"); }catch(err){ toast("Não consegui ler esse arquivo. Envie o Excel ou o PDF do fechamento."); } });
document.addEventListener("change", e=>{ if(e.target.id==="dc-arq" && e.target.files[0]){ state.docArq = e.target.files[0]; const n = $("#dc-arq-nome"); if(n) n.textContent = e.target.files[0].name; }
  if(e.target.id==="eq-de" || e.target.id==="eq-ate"){ state.eqp[e.target.id==="eq-de"?"de":"ate"] = e.target.value; state.rendered = null; render(); } });
document.addEventListener("input", e=>{ if(e.target.id==="cart-q"){ state.cartQ = e.target.value; clearTimeout(state.cartQT); state.cartQT = setTimeout(()=>{ state.rendered = null; render(); const i = $("#cart-q"); if(i){ i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); } });
document.addEventListener("input", e=>{ if(e.target.id==="eq-q"){ state.eqQ = e.target.value; clearTimeout(state.eqQT); state.eqQT = setTimeout(()=>{ render(); const i = $("#eq-q"); if(i){ i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); } });
document.addEventListener("change", e=>{ if(e.target.id==="gl-os"){ const op = e.target.selectedOptions[0]; if(op && op.dataset.v) $("#gl-v").value = String(Math.round(+op.dataset.v*100)/100).replace(".",","); } });
async function submitRec(){
  const r = {data:$("#r-data").value, valor:numIn($("#r-valor").value), origem:$("#r-origem").value, obs:$("#r-obs").value.trim(), forma:$("#r-forma").value, ret:{}};
  RETS.forEach(([k])=>{ const v = numIn($("#r-ret-"+k).value); if(v>0) r.ret[k] = v; });
  if(r.origem==="horas"){ r.competencia = $("#r-comp").value; r.empresa = $("#r-emp").value;
    const f = state.fech.find(f=>fechSaldo(f)>0.005 && f.de.slice(0,7)<=r.competencia && f.ate.slice(0,7)>=r.competencia && (!f.empresa || chaveEmp(f.empresa)===chaveEmp(r.empresa)));
    if(f){ r.origem = "fech"; r.fechId = f.id; delete r.competencia; r.empresa = f.empresa||""; toast(`Esse mês está no fechamento ${f.numero}: o recebimento foi ligado a ele.`); } }
  else if(r.origem==="fech"){ r.fechId = $("#r-fech").value; const f = state.fech.find(x=>x.id===r.fechId); if(!f){ toast("Escolha o fechamento."); return; } r.empresa = f.empresa||""; }
  else r.orcId = $("#r-orc").value;
  if(!r.data || !(r.valor>0)){ toast("Informe a data e um valor maior que zero."); return; }
  try{ await save("recebimentos", r); closeModal(); toast(`Recebimento de ${brl(r.valor)} registrado${retTot(r)?` + ${brl(retTot(r))} de retenções`:""}`); }
  catch(err){ toast(writeErr(err)); }
}

