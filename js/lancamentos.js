"use strict";
/* ---------- HORAS ---------- */
function vHoras(){
  if(state.hmode==="os") return vHorasOS();
  const H = state.hf, all = state.ap.filter(e=>ym(e.data)===state.month);
  const list = applyF(all, H.f).sort((a,b)=>(b.data+b.inicio).localeCompare(a.data+a.inicio));
  const c = sumCalc(list); const bad = overlaps(list);
  const dayList = rows => { const byDay = {}; rows.forEach(e=>(byDay[e.data] ||= []).push(e)); return Object.keys(byDay).sort().reverse().map(d=>{ const dc=sumCalc(byDay[d]); const hol=holidayName(d); return `<div class="dayhead"><span>${WD[parseYmd(d).getDay()]}, ${fdate(d)} ${hol?`<span class="pill bad">${esc(hol)}</span>`:""}</span><span class="mono">${fh(dc.total)} · ${brl(dc.valor)}</span></div>${byDay[d].sort((a,b)=>a.inicio.localeCompare(b.inicio)).map(e=>apItem(e,false,bad)).join("")}`; }).join(""); };
  const groups = groupBy(list, H.by), pl = resumoPlan(planilhasDoMes(state.month));
  return `${exampleBanner()}
  <div class="pagehead"><div><span class="eyebrow">Apontamentos</span><h1>Horas por OS</h1><p class="muted">Cada linha é uma ordem de serviço com início e fim. O sistema separa hora normal e extra pela sua jornada.</p></div>
    <div class="row">${monthNav()}<button class="btn" data-act="newAp">+ Uma OS</button><button class="btn primary" data-act="newDay">+ Lançar OS do dia</button></div></div>
  ${hmodeChips()}
  <div class="panel filtergrid" style="margin-bottom:12px">${filterBar("h", H.f, H.by)}</div>
  <div class="summary"><span><b>${list.length}</b> apontamentos</span><span><i class="dot d-n"></i>Normal <b>${fh(c.n)}</b></span><span><i class="dot d-50"></i>Extra ${pct50()} <b>${fh(c.e50)}</b></span><span><i class="dot d-100"></i>Extra ${pct100()} <b>${fh(c.e100)}</b></span><span>Total <b>${fh(c.total)}</b></span><span>Valor <b>${brl(c.valor)}</b></span></div>
  ${planilhaTabela(pl, `Planilha aprovada de ${ymLabel(state.month)}`)}
  ${!list.length ? (pl.os ? "" : `<div class="empty"><b>Nenhum apontamento em ${ymLabel(state.month)}${all.length?" com esses filtros":""}</b>Use “Lançar OS do dia” para registrar as OS com o horário de cada uma.</div>`)
   : H.by ? `${dimTable(list, H.by)}${groups.map(g=>{ const gc=sumCalc(g.rows); return `<section class="section"><header><h2>${esc(g.label)}</h2><span class="mono muted">${g.rows.length} OS · ${fdec(gc.total)} h · ${brl(gc.valor)}</span></header><div class="list">${dayList(g.rows)}</div></section>`; }).join("")}`
   : `<div class="list">${dayList(list)}</div>`}`;
}
function hmodeChips(){ return `<div class="filters" role="group" aria-label="Ver por"><button class="chipbtn" data-act="hmode" data-m="dia" aria-pressed="${state.hmode!=="os"}">Por dia</button><button class="chipbtn" data-act="hmode" data-m="os" aria-pressed="${state.hmode==="os"}">Por OS (histórico)</button></div>`; }
function osGroups(list){
  const m = new Map();
  list.forEach(e=>{ const k = e.os || "(sem nº)"; if(!m.has(k)) m.set(k, []); m.get(k).push(e); });
  return [...m.entries()].map(([os, rows])=>{ rows.sort((a,b)=>(a.data+a.inicio).localeCompare(b.data+b.inicio)); const last = rows[rows.length-1];
    return {os, rows, desc:last.descricao||"", last:last.data, first:rows[0].data, c:sumCalc(rows), dias:new Set(rows.map(e=>e.data)).size, profs:[...new Set(rows.map(e=>e.profissional).filter(Boolean))], locais:[...new Set(rows.map(e=>[empOf(e),e.cliente].filter(Boolean).join(" · ")).filter(Boolean))], fotos:rows.reduce((s,e)=>s+(e.fotos||[]).length,0), orc:rows.find(e=>e.orcId)?.orcId}; })
    .sort((a,b)=>b.last.localeCompare(a.last));
}
function vHorasOS(){
  const H = state.hf, q = state.osQ.trim().toLowerCase();
  const gs = osGroups(applyF(state.ap, H.f)).filter(g=>!q || g.os.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q));
  const vistos = new Set(gs.map(g=>g.os)), plOS = new Map();
  state.fech.filter(f=>f.itens && (!H.f.emp || H.f.emp===ALL || chaveEmp(f.empresa||"")===chaveEmp(H.f.emp))).forEach(f=>f.itens.forEach(x=>{ const k = x.os||"(sem nº)"; if(vistos.has(k)) return;
    const o = plOS.get(k) || {os:k, desc:x.desc||"", meses:new Set(), min:0, ext:0, valor:0, local:[f.empresa, x.unid].filter(Boolean).join(" · ")}; o.meses.add(compDe(f)); o.min += ((+x.hn||0)+(+x.h50||0)+(+x.h100||0))*60; o.ext += ((+x.h50||0)+(+x.h100||0))*60; o.valor += +x.total||0; if(!o.desc && x.desc) o.desc = x.desc; plOS.set(k, o); }));
  const gp = [...plOS.values()].filter(g=>!q || g.os.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q)).sort((a,b)=>[...b.meses].sort().pop().localeCompare([...a.meses].sort().pop()));
  return `${exampleBanner()}
  <div class="pagehead"><div><span class="eyebrow">Apontamentos</span><h1>Histórico por OS</h1><p class="muted">Todas as horas já lançadas em cada ordem de serviço, de todos os dias e funcionários.</p></div>
    <div class="row"><button class="btn primary" data-act="newDay">+ Lançar OS do dia</button></div></div>
  ${hmodeChips()}
  <div class="panel filtergrid" style="margin-bottom:12px"><label class="field" style="grid-column:1/-1"><span>Buscar OS ou serviço</span><input id="h-os-q" value="${esc(state.osQ)}" placeholder="Ex.: 2165557 ou telhado" inputmode="search"></label>${filterBar("h", H.f, "").replace(/<label class="field"><span>Separar por<\/span>[\s\S]*$/,"")}</div>
  ${gs.length ? `<div class="tablewrap"><table><thead><tr><th>OS</th><th>Serviço</th><th>Local</th><th class="r">Dias</th><th class="r">Horas</th><th class="r">Extras</th><th class="r">Valor</th><th>Último dia</th></tr></thead>
  <tbody>${gs.map(g=>`<tr class="click" data-act="osHist" data-os="${esc(g.os)}"><td class="mono"><b>${esc(g.os)}</b></td><td>${esc(g.desc)}${g.orc?` <span class="pill info">Orçamento ${esc(orcNum(g.orc))}</span>`:""}${g.fotos?` <span class="pill">${g.fotos} foto${g.fotos>1?"s":""}</span>`:""}</td><td>${esc(g.locais.join(", "))}</td><td class="r mono">${g.dias}</td><td class="r mono"><b>${fdec(g.c.total)}</b></td><td class="r mono">${fdec(g.c.e50+g.c.e100)}</td><td class="r mono">${g.orc?"orçamento":brl(g.c.valor)}</td><td class="mono">${fdate(g.last)}</td></tr>`).join("")}</tbody></table></div>`
    : gp.length ? "" : `<div class="empty"><b>Nenhuma OS encontrada</b>Confira a busca ou os filtros.</div>`}
  ${gp.length ? `<section class="section"><header><h2>OS das planilhas aprovadas</h2><span class="mono muted">${gp.length} OS</span></header><div class="tablewrap"><table class="cards-sm"><thead><tr><th>OS</th><th>Serviço</th><th>Local</th><th class="r">Horas</th><th class="r">Extras</th><th class="r">Valor</th><th>Mês</th></tr></thead>
  <tbody>${gp.map(g=>`<tr class="click" data-act="osHist" data-os="${esc(g.os)}"><td class="mono"><b>${esc(g.os)}</b></td><td>${esc(g.desc)} <span class="pill">planilha</span></td><td>${esc(g.local)}</td><td class="r mono" data-l="Horas">${fdec(g.min)} h</td><td class="r mono" data-l="Extras">${g.ext?fdec(g.ext)+" h":""}</td><td class="r mono" data-l="Valor"><b>${brl(Math.round(g.valor*100)/100)}</b></td><td data-l="Mês">${[...g.meses].sort().map(m=>ymLabel(m)).join(", ")}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
}
function osHistHtml(os){
  const pl = state.fech.filter(f=>f.itens).flatMap(f=>f.itens.filter(x=>(x.os||"(sem nº)")===os).map(x=>({...x, f})));
  const plHtml = pl.length ? `<h3 style="margin:12px 0 6px">Nas planilhas aprovadas</h3><div class="tablewrap"><table><thead><tr><th>Mês</th><th>Fechamento</th><th class="r">Normal</th><th class="r">Extras</th><th class="r">Valor</th></tr></thead><tbody>${pl.map(x=>`<tr><td>${ymLabel(compDe(x.f))}</td><td class="mono">${esc(x.f.numero)}</td><td class="r mono">${fdec((+x.hn||0)*60)}</td><td class="r mono">${fdec(((+x.h50||0)+(+x.h100||0))*60)}</td><td class="r mono">${brl(+x.total||0)}</td></tr>`).join("")}</tbody></table></div>` : "";
  const g = osGroups(state.ap.filter(e=>(e.os||"(sem nº)")===os))[0];
  if(!g) return pl.length ? `<header><h2>OS ${esc(os)}</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header><p style="margin:0 0 10px"><b>${esc(pl[pl.length-1].desc||"")}</b><br><span class="muted">${esc([pl[0].f.empresa, pl[0].unid].filter(Boolean).join(" · "))}</span></p>${plHtml}<footer><span></span><button class="btn primary" data-act="osLancar" data-os="${esc(os)}">Lançar horas nesta OS</button></footer>` : "";
  const fotos = g.rows.flatMap(e=>e.fotos||[]);
  return `<header><h2>OS ${esc(os)}</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <p style="margin:0 0 10px"><b>${esc(g.desc)}</b><br><span class="muted">${esc(g.locais.join(" / "))}</span></p>
  <div class="summary"><span><b>${fdec(g.c.total)} h</b> no total</span><span>Normal <b>${fdec(g.c.n)}</b></span><span>Extra <b>${fdec(g.c.e50+g.c.e100)}</b></span><span><b>${g.dias}</b> dia(s)</span><span>De <b>${fdate(g.first)}</b> a <b>${fdate(g.last)}</b></span>${g.orc?`<span>Orçamento <b>${esc(orcNum(g.orc))}</b></span>`:`<span>Valor <b>${brl(g.c.valor)}</b></span>`}</div>
  ${g.profs.length?`<p class="muted" style="margin:0 0 10px">Funcionários: ${esc(g.profs.join(", "))}</p>`:""}
  ${fotos.length?`<div class="thumbs" style="margin-bottom:12px">${thumbs(fotos,false)}</div>`:""}
  <div class="tablewrap"><table><thead><tr><th>Data</th><th>Funcionário</th><th>Início</th><th>Fim</th><th class="r">Horas</th><th class="r">Extra</th></tr></thead>
  <tbody>${g.rows.map(e=>{ const c=calc(e); return `<tr><td class="mono">${fdate(e.data)}</td><td>${esc(e.profissional||"-")}</td><td class="mono">${esc(e.inicio)}</td><td class="mono">${esc(e.fim)}</td><td class="r mono">${fdec(c.total)}</td><td class="r mono">${c.e50+c.e100?fdec(c.e50+c.e100):""}</td></tr>`; }).join("")}</tbody></table></div>
  ${plHtml}
  <footer><button class="btn" data-act="osPdf" data-os="${esc(os)}">PDF desta OS</button><button class="btn primary" data-act="osLancar" data-os="${esc(os)}">Lançar mais horas nesta OS</button></footer>`;
}
let osQT = 0;
document.addEventListener("input", e=>{ if(e.target.id==="h-os-q"){ state.osQ = e.target.value; clearTimeout(osQT); osQT = setTimeout(()=>{ const pos = $("#h-os-q")?.selectionStart; render(); const i=$("#h-os-q"); if(i){ i.focus(); try{ i.setSelectionRange(pos,pos); }catch(err){} } }, 250); } });
function apForm(e){
  const isNew = !e.id;
  const clientes = [...new Set([...lines(state.cfg.unidades), ...state.ap.map(x=>x.cliente).filter(Boolean)])];
  const ps = profs();
  let last = []; try{ last = JSON.parse(localStorage.getItem("gaap-last-prof")||"[]"); }catch(err){}
  state.apFotos = [...(e.fotos||[])];
  const profField = (!ps.length || state.worker) ? "" : isNew
    ? `<div class="field"><span>Quem trabalhou (marque todos que estavam na OS)</span><div class="filters" style="margin:0">${ps.map(n=>`<label class="chipcheck"><input type="checkbox" name="f-prof" value="${esc(n)}" ${(e.profissional?e.profissional===n:last.includes(n))?"checked":""}><span>${esc(n)}</span></label>`).join("")}</div></div>`
    : `<label class="field"><span>Profissional</span><select id="f-prof1"><option value="">(sem profissional)</option>${[...new Set([...ps, e.profissional].filter(Boolean))].map(n=>`<option ${e.profissional===n?"selected":""}>${esc(n)}</option>`).join("")}</select></label>`;
  return `<header><h2>${isNew?"Novo apontamento":"Editar apontamento"}</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <form class="form" id="apForm" data-id="${esc(e.id||"")}">
    <div class="grid2">
      <label class="field"><span>Data</span><input type="date" id="f-data" value="${esc(e.data)}" required></label>
      <label class="field"><span>Nº da ordem de serviço</span><input id="f-os" list="os-list-ap" inputmode="numeric" value="${esc(e.os||"")}" placeholder="Ex.: 48213"><datalist id="os-list-ap">${[...osLista().entries()].slice(0,300).map(([o,x])=>`<option value="${esc(o)}">${esc([x.desc,x.unid].filter(Boolean).join(" · "))}</option>`).join("")}</datalist></label>
      <label class="field"><span>ID TracOS</span><input id="f-tid" inputmode="numeric" maxlength="40" value="${esc(e.tracos||"")}" placeholder="Nº do ID impresso no papel"></label><input type="hidden" id="f-nota" value="${esc(e.nota||"")}">
      <div class="field" style="grid-column:1/-1">${papelBtn("ap")}<small class="muted"> O app lê o nº da OS, o ID TracOS, o título e a unidade do papel.</small></div>
    </div>
    ${profField}
    <label class="field"><span>Serviço executado</span><input id="f-desc" value="${esc(e.descricao||"")}" placeholder="Ex.: Troca de rolamento do elevador de canecas 02"></label>
    <div class="grid2">
      <label class="field"><span>Entrada</span><span class="timepair"><input type="time" id="f-ini" value="${esc(e.inicio||"")}" required><button type="button" class="btn sm" data-act="now" data-t="f-ini">Agora</button></span></label>
      <label class="field"><span>Saída p/ almoço</span><input type="time" id="f-almi" value="${esc(e.almIni||"")}"></label>
      <label class="field"><span>Retorno do almoço</span><input type="time" id="f-almf" value="${esc(e.almFim||"")}"></label>
      <label class="field"><span>Saída</span><span class="timepair"><input type="time" id="f-fim" value="${esc(e.fim||"")}" required><button type="button" class="btn sm" data-act="now" data-t="f-fim">Agora</button></span></label>
    </div>
    <div class="grid2">
      <label class="field"><span>Empresa</span><input id="f-emp" list="emp-list" value="${esc(e.empresa || lastEmp())}" placeholder="Ex.: Brejeiro"><datalist id="emp-list">${dimVals("emp").map(v=>`<option value="${esc(v)}">`).join("")}</datalist></label>
      <label class="field"><span>Unidade / local</span>${unidCampo('id="f-cli"', e.empresa || lastEmp(), e.cliente, "Selecione a unidade")}</label>
    </div>
    ${orcSelect("f-orc", e.orcId)}
    ${eqSelect('id="f-eq"', e.equipId, e.prevId)}
    ${state.worker?"":`<label class="field"><span>Cálculo da hora</span><select id="f-tipo">${Object.entries(TIPOS).map(([k,l])=>`<option value="${k}" ${ (e.tipo||"auto")===k?"selected":""}>${l}</option>`).join("")}</select></label>`}
    <p class="muted" style="margin:-4px 0 0;font-size:.85rem">Horário exato do almoço: esse intervalo não conta como hora trabalhada. Deixe em branco se não parou para almoçar nessa OS.</p>
    ${state.cfg.almoco.ativo?`<label class="check"><input type="checkbox" id="f-noalm" ${e.noAlmoco?"checked":""}> Trabalhei no horário de almoço (${esc(state.cfg.almoco.ini)}–${esc(state.cfg.almoco.fim)} conta como extra 50%)</label>`:""}
    <label class="check"><input type="checkbox" id="f-emerg" ${e.emergencia?"checked":""}> Chamado de emergência (fora da escala)</label>
    <div class="grid2 emergbox" id="f-acion" ${e.emergencia?"":"hidden"}>
      <label class="field"><span>Quem acionou</span><input id="f-ac-por" list="acion-list" value="${esc(e.acion?.por||"")}" placeholder="Ex.: Carlos (supervisor)"></label>
      <label class="field"><span>Acionado às</span><div class="row" style="flex-wrap:nowrap"><input type="time" id="f-ac-as" value="${esc(e.acion?.as||"")}"><button type="button" class="btn sm" data-act="now" data-t="f-ac-as">Agora</button></div></label>
      <label class="field"><span>Como</span><select id="f-ac-meio"><option value="">—</option>${MEIOS.map(m=>`<option ${e.acion?.meio===m?"selected":""}>${m}</option>`).join("")}</select></label>
      <label class="field"><span>Motivo / equipamento</span><input id="f-ac-mot" value="${esc(e.acion?.motivo||"")}" placeholder="Ex.: elevador 02 parado"></label>
      <datalist id="acion-list">${acionadores().map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
    </div>
    <label class="field"><span>Observações</span><textarea id="f-obs" rows="2" placeholder="Peças trocadas, pendências, quem solicitou…">${esc(e.obs||"")}</textarea></label>
    ${assets?`<div class="field"><span>Fotos do serviço</span><div class="thumbs" id="f-thumbs">${thumbs(state.apFotos, true)}</div><div class="row"><label class="btn sm" for="f-foto-antes">+ Antes</label><label class="btn sm" for="f-foto">+ Durante</label><label class="btn sm" for="f-foto-depois">+ Depois</label><button type="button" class="btn sm" data-act="assinar">✍ Assinatura do responsável</button>
      <input type="file" id="f-foto-antes" data-tipo="antes" accept="image/*" multiple hidden><input type="file" id="f-foto" data-tipo="durante" accept="image/*" multiple hidden><input type="file" id="f-foto-depois" data-tipo="depois" accept="image/*" multiple hidden></div></div>`:""}
    <div id="f-prev" class="preview"></div>
    ${!isNew && !state.worker?`<details class="fichabox" id="f-hist" data-id="${esc(e.id)}"><summary>Histórico de alterações</summary><div class="muted" id="f-hist-box">Carregando…</div></details>`:""}
    <footer>${isNew?"<span></span>":`<button type="button" class="btn danger" data-act="delAp" data-id="${esc(e.id)}">Excluir</button>`}
      <span class="row">${isNew?"":`<button type="button" class="btn" data-act="dupAp">Duplicar</button>`}<button class="btn primary" type="submit">${isNew?"Salvar apontamento":"Salvar alterações"}</button></span></footer>
  </form>`;
}
const CAMPOS = [["data","Data",fdate],["os","OS"],["tracos","ID TracOS"],["nota","Nota SAP"],["inicio","Início"],["fim","Término"],["almIni","Saída p/ almoço"],["almFim","Retorno almoço"],["descricao","Serviço"],["profissional","Funcionário"],["empresa","Empresa"],["cliente","Unidade"],["tipo","Cálculo",v=>TIPOS[v]||v],["emergencia","Emergência",v=>v?"sim":"não"],["obs","Obs."],["noAlmoco","Trabalhou no almoço",v=>v?"sim":"não"],["orcId","Orçamento",v=>v?orcNum(v):"—"],["excluido","Excluído",v=>v?"sim":"não"]];
function difHist(a, b){ a = a||{}; b = b||{}; return CAMPOS.filter(([k])=>JSON.stringify(a[k]??"")!==JSON.stringify(b[k]??"")).map(([k,l,f])=>{ const F = f || (v=>v); return `${l}: ${esc(F(a[k])||"—")} → <b>${esc(F(b[k])||"—")}</b>`; }); }
async function carregarHist(id){
  const box = $("#f-hist-box"); if(!box) return;
  const {data, error} = await sb.rpc("historico_de", {p_tabela:"apontamentos", p_id:id});
  if(error){ box.textContent = "Não consegui carregar o histórico."; return; }
  state.hist = data || [];
  box.classList.remove("muted");
  box.innerHTML = state.hist.length ? `<div class="list">${state.hist.map((h,i)=>{ const dif = h.acao==="insert" ? ["Lançamento criado"] : difHist(h.antes, h.depois);
    return `<div class="item" style="cursor:default;grid-template-columns:1fr auto"><span><small class="muted">${new Date(h.quando).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})} · ${esc(h.quem_nome||"")}</small><br>${dif.join("<br>")||"Sem mudança nos campos principais"}</span>${h.acao!=="insert"&&h.antes?`<button type="button" class="btn sm" data-act="histVoltar" data-i="${i}">Desfazer esta</button>`:""}</div>`; }).join("")}</div>` : "Nenhuma alteração registrada.";
}
document.addEventListener("toggle", e=>{ if(e.target.id==="f-hist" && e.target.open) carregarHist(e.target.dataset.id); }, true);
const TAB_LABEL = {apontamentos:"OS", despesas:"Despesa", recebimentos:"Recebimento", fechamentos:"Fechamento", orcamentos:"Orçamento", ordens:"OS recebida"};
async function carregarLixeira(){
  const box = $("#lx-list"); if(!box) return;
  const {data, error} = await sb.rpc("lixeira", {p_dias:90}); if(!$("#lx-list")) return;
  if(error){ box.textContent = "Não consegui carregar a lixeira."; return; }
  state.lixo = data || [];
  box.classList.remove("muted"); const acts = $("#lx-acts"); if(acts){ acts.hidden = !state.lixo.length; const eb = acts.querySelector('[data-act="lixoEsvaziar"]'); if(eb){ eb.disabled = false; delete eb.dataset.armed; eb.textContent = "Esvaziar lixeira"; } }
  box.innerHTML = state.lixo.length ? `<div class="bk-list">${state.lixo.map((x,i)=>{ const d = x.dados||{}; const res = x.tabela==="apontamentos" ? `OS ${d.os||"s/n"} · ${fdate(d.data)} ${d.inicio||""}–${d.fim||""}${d.profissional?` · ${d.profissional}`:""}` : x.tabela==="despesas" ? `${d.tipo||""} · ${fdate(d.data)} · ${brl(d.valor)}` : x.tabela==="recebimentos" ? `${fdate(d.data)} · ${brl(d.valor)}` : x.tabela==="fechamentos" ? `${d.numero||""} · ${fdate(d.de)} a ${fdate(d.ate)}` : `${d.numero||""} ${d.titulo||""}`;
    return `<div class="bk-item"><span><b>${TAB_LABEL[x.tabela]||x.tabela}</b> ${esc(res)}<small class="muted">Excluído por ${esc(x.quem_nome||"")} em ${new Date(x.quando).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</small></span><button class="btn sm" data-act="lixoRestaurar" data-i="${i}">Restaurar</button></div>`; }).join("")}</div>` : "A lixeira está vazia.";
}
function readApForm(){
  const id = $("#apForm").dataset.id;
  const old = state.ap.find(x=>x.id===id) || {};
  const eqv = $("#f-eq") ? eqSplit($("#f-eq").value) : {equipId:old.equipId, prevId:old.prevId};
  return {...old, ...eqv, id: id||undefined, data:$("#f-data").value, os:$("#f-os").value.trim(), descricao:$("#f-desc").value.trim(), inicio:$("#f-ini").value, fim:$("#f-fim").value, tracos:limpaTracos($("#f-tid")?.value), nota:($("#f-nota")?.value||"").replace(/\D/g,"").slice(0,14), almIni:$("#f-almi")?.value||"", almFim:$("#f-almf")?.value||"", cliente:$("#f-cli").value.trim(), empresa:$("#f-emp").value.trim(), tipo: $("#f-tipo") ? $("#f-tipo").value : (old.tipo||"auto"), noAlmoco: $("#f-noalm") ? $("#f-noalm").checked : !!old.noAlmoco, emergencia:$("#f-emerg").checked, acion: $("#f-emerg").checked ? {por:$("#f-ac-por").value.trim(), as:$("#f-ac-as").value, meio:$("#f-ac-meio").value, motivo:$("#f-ac-mot").value.trim()} : undefined, obs:$("#f-obs").value.trim(), profissional: state.worker ? state.me : $("#f-prof1") ? $("#f-prof1").value : (selProfs()[0] || old.profissional || ""), orcId: $("#f-orc") ? $("#f-orc").value : (old.orcId||""), fotos:[...(state.apFotos||[])], fotoMeta: Object.fromEntries((state.apFotos||[]).map(id=>[id, (old.fotoMeta||{})[id] || state.fotoMetaNovo?.[id]]).filter(([,v])=>v))};
}
function lastEmp(){ let v=""; try{ v = localStorage.getItem("gaap-last-emp")||""; }catch(err){} return v || state.cfg.contratante || ""; }
function selProfs(){ return [...document.querySelectorAll('input[name="f-prof"]:checked')].map(x=>x.value); }
function updateApPreview(){
  const p = $("#f-prev"); if(!p) return;
  const e = readApForm();
  if(!e.data || !e.inicio || !e.fim){ p.innerHTML = `<span class="muted">Preencha data, início e término para ver as horas.</span>`; return; }
  const c = calc({...e, valorHora: e.valorHora, extraPct: e.extraPct, feriadoPct: e.feriadoPct});
  const hol = holidayName(e.data); const wd = parseYmd(e.data).getDay();
  const sameDay = state.ap.filter(x=>x.data===e.data && x.id!==e.id);
  const who = $("#f-prof1") ? [e.profissional] : (selProfs().length ? selProfs() : [""]);
  const ov = who.some(pr=>overlaps([...sameDay.filter(x=>(x.profissional||"")===pr), {...e, profissional:pr, id:"__new"}]).has("__new"));
  p.innerHTML = `${hm(e.fim)<=hm(e.inicio)?`<div class="muted">Término no dia seguinte (virada de meia-noite).</div>`:""}
    ${wd===0||hol?`<div class="muted">${hol?esc(hol):"Domingo"}: horas contam como extra ${pct100()}.</div>`:""}
    ${c.n?`<div class="line"><span><i class="dot d-n"></i> Normal ${fh(c.n)}</span><span class="mono">${money(c.vn)}</span></div>`:""}
    ${c.e50?`<div class="line"><span><i class="dot d-50"></i> Extra ${pct50()} ${fh(c.e50)}</span><span class="mono">${money(c.v50)}</span></div>`:""}
    ${c.e100?`<div class="line"><span><i class="dot d-100"></i> Extra ${pct100()} ${fh(c.e100)}</span><span class="mono">${money(c.v100)}</span></div>`:""}
    <div class="line tot"><span>Total ${fh(c.total)}</span><span class="mono">${c.orc && !state.worker ? "serviço de orçamento" : money(c.valor)}</span></div>
    ${lockOf(e.data, empOf(e), e.profissional)?`<div class="warnbox">${esc(lockMsg(lockOf(e.data, empOf(e), e.profissional)))}</div>`:""}
    ${ov?`<div class="warnbox">Esse horário se sobrepõe a outro apontamento do mesmo profissional nesse dia.</div>`:""}`;
}
/* ---------- LANÇAR OS DO DIA ---------- */
const blankRow = () => ({os:"", desc:"", ini:"", fim:"", almIni:"", almFim:"", cli:"", emerg:false, noAlm:false, ids:{}});
function nextStart(fim){ const a = state.cfg.almoco; return (a.ini && a.fim && fim===a.ini) ? a.fim : fim; }
function dayPresets(ds){
  const cfg = state.cfg, j = cfg.jornada[parseYmd(ds).getDay()] || {}, a = cfg.almoco;
  if(!j.ini || !j.fim) return [];
  if(a.ini && a.fim && hm(a.ini)>hm(j.ini) && hm(a.fim)<hm(j.fim)) return [["Manhã", j.ini, a.ini], ["Tarde", a.fim, j.fim]];
  return [["Jornada", j.ini, j.fim]];
}
function dayOpen(ds, opt={}){
  ds = ds || today();
  let last = []; try{ last = JSON.parse(localStorage.getItem("gaap-last-prof")||"[]"); }catch(err){}
  const ps = profs();
  let draft = (!opt.row && !opt.orcId) ? rascunho.ler() : null;
  if(draft && draft.rows){ // rascunho cujo conteúdo já está todo salvo é descartado
    const ativas = draft.rows.filter(r=>r.os||r.desc||r.fim), ids = ativas.flatMap(r=>Object.values(r.ids||{}));
    if(!ativas.length || (ids.length && ids.length >= ativas.length * Math.max(1,(draft.profs||[]).length||1) && ids.every(id=>state.ap.some(e=>e.id===id)))){ rascunho.limpar(); draft = null; }
  }
  if(draft && ds && opt.pedido && draft.data!==ds && !confirm(`Há um lançamento de ${fdate(draft.data)} que não foi salvo. Continuar esse lançamento? (Cancelar descarta e abre ${fdate(ds)})`)){ rascunho.limpar(); draft = null; }
  if(draft && draft.rows && draft.rows.length){
    state.day = draft;
    openModal(dayForm(), "wide"); state.modalDirty = true;
    toast("Continuei o lançamento que não tinha sido salvo.");
    renderDayRows(); updateDay(); return;
  }
  state.day = {data:ds, profs: state.worker ? [state.me] : (opt.profs || last.filter(n=>ps.includes(n))), unid:opt.unid||"", emp:opt.emp||lastEmp(), orcId:opt.orcId||"", rows:[]};
  const ex = dayExisting(), pre = dayPresets(ds);
  const r = {...blankRow(), ...(opt.row||{})}; if(!opt.row?.ini) r.ini = ex.length ? ex[ex.length-1].fim : (pre[0]?.[1] || "07:00");
  state.day.rows.push(r);
  openModal(dayForm(), "wide");
  renderDayRows(); updateDay();
}
function dayExisting(){
  const d = state.day, ps = profs();
  return state.ap.filter(e=>e.data===d.data && (!ps.length || !d.profs.length || d.profs.includes(e.profissional))).sort((a,b)=>a.inicio.localeCompare(b.inicio));
}
function dayForm(){
  const d = state.day, ps = profs();
  const unids = repUnids();
  const used = {}; [...state.ap].sort((a,b)=>(b.data+b.inicio).localeCompare(a.data+a.inicio)).forEach(e=>{ if(e.os && !used[e.os]) used[e.os] = e.descricao||""; }); osSugestoes(used);
  const pre = dayPresets(d.data)[0] || ["", "07:00", "11:00"];
  return `<header><h2>Lançar OS do dia</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <form class="form" id="dayForm">
    <div class="grid3">
      <label class="field"><span>Data</span><input type="date" id="d-data" value="${esc(d.data)}" required></label>
      <label class="field"><span>Empresa</span><input id="d-emp" list="emp-list" value="${esc(d.emp)}" placeholder="Ex.: Brejeiro"><datalist id="emp-list">${dimVals("emp").map(v=>`<option value="${esc(v)}">`).join("")}</datalist></label>
      <label class="field"><span>Unidade (vale para todas as linhas)</span>${unidCampo('id="d-unid"', d.emp, d.unid, "Selecione a unidade")}</label>
    </div>
    ${orcSelect("d-orc", d.orcId)}
    ${state.worker?`<p class="muted" style="margin:0">Lançando como <b>${esc(state.me)}</b>.</p>`:""}
    ${ps.length && !state.worker?`<div class="field"><span>Quem trabalhou (as OS são lançadas para cada um marcado)</span><div class="filters" style="margin:0">${ps.map(n=>`<label class="chipcheck"><input type="checkbox" name="d-prof" value="${esc(n)}" ${d.profs.includes(n)?"checked":""}><span>${esc(n)}</span></label>`).join("")}</div></div>`:""}
    <div id="d-exist"></div>
    <div id="d-rows" class="items"></div>
    <div class="row"><button type="button" class="btn primary" data-act="dayAdd">+ Adicionar outra OS</button><span class="muted" style="font-size:.85rem">A próxima OS começa no horário em que a anterior terminou.</span></div>
    <details class="splitwrap"><summary>Dividir um período igualmente entre várias OS (opcional)</summary>
    <div class="splitbox">
      <div class="field" style="grid-column:1/-1"><div class="row" id="d-presets"></div></div>
      <label class="field"><span>De</span><input type="time" id="d-sp-ini" value="${esc(pre[1])}"></label>
      <label class="field"><span>Até</span><input type="time" id="d-sp-fim" value="${esc(pre[2])}"></label>
      <label class="field"><span>Nº de OS</span><input type="number" id="d-sp-n" min="1" max="12" value="4"></label>
      <button type="button" class="btn" data-act="daySplit" style="align-self:end">Criar linhas</button>
    </div></details>
    <datalist id="acion-list">${acionadores().map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
    <datalist id="os-list">${Object.entries(used).slice(0,80).map(([o,ds])=>`<option value="${esc(o)}">${esc(ds)}</option>`).join("")}</datalist>
    <div id="d-tot" class="preview"></div>
    <footer><button type="button" class="btn" data-act="dayDescartar">Descartar</button><button class="btn primary" type="submit" id="d-save">Salvar</button></footer>
  </form>`;
}
function renderDayRows(){
  const box = $("#d-rows"); if(!box) return;
  const d = state.day;
  box.innerHTML = d.rows.map((r,i)=>`<div class="dayrow" data-r="${i}">
    <span class="num">${i+1}</span>
    <label class="field f-os"><span>Nº da OS</span><input data-f="os" list="os-list" inputmode="numeric" value="${esc(r.os)}" placeholder="Ex.: 2165557"></label>
    <label class="field f-tid"><span>ID TracOS</span><input data-f="tid" inputmode="numeric" maxlength="40" value="${esc(r.tid||"")}" placeholder="ID do papel"></label>
    <div class="f-papel">${papelBtn(i)}</div>
    <label class="field f-ini"><span>Entrada</span><input type="time" data-f="ini" value="${esc(r.ini)}"></label>
    <label class="field f-almi"><span>Saída p/ almoço</span><input type="time" data-f="almIni" value="${esc(r.almIni||"")}"></label>
    <label class="field f-almf"><span>Retorno almoço</span><input type="time" data-f="almFim" value="${esc(r.almFim||"")}"></label>
    <label class="field f-fim"><span>Saída</span><input type="time" data-f="fim" value="${esc(r.fim)}"></label>
    <button type="button" class="iconbtn" data-act="dayDel" data-r="${i}" aria-label="Remover linha ${i+1}" style="align-self:end">✕</button>
    <label class="field f-desc"><span>Serviço executado</span><input data-f="desc" value="${esc(r.desc)}" placeholder="Descrição da OS"></label>
    <label class="field f-cli"><span>Unidade</span>${unidCampo('data-f="cli"', d.emp, r.cli, d.unid ? `Igual à de cima (${d.unid})` : "Igual à de cima")}</label>
    <label class="check emerg"><input type="checkbox" data-f="emerg" ${r.emerg?"checked":""}> Emergência</label>
    ${eqList().length?`<div class="f-eq">${eqSelect('data-f="eq"', eqSplit(r.eq).equipId, eqSplit(r.eq).prevId)}</div>`:""}
    ${state.cfg.almoco.ativo?`<label class="check noalm"><input type="checkbox" data-f="noAlm" ${r.noAlm?"checked":""}> Trabalhei no almoço (conta como extra)</label>`:""}
    <label class="field f-obs"><span>Observação (sai no relatório)</span><input data-f="obs" value="${esc(r.obs||"")}" placeholder="Opcional: peças, pendências…"></label>
    ${r.emerg?`<div class="acionrow"><label class="field"><span>Quem acionou</span><input data-f="acPor" list="acion-list" value="${esc(r.acPor||"")}" placeholder="Ex.: Carlos (supervisor)"></label>
      <label class="field"><span>Acionado às</span><input type="time" data-f="acAs" value="${esc(r.acAs||"")}"></label>
      <label class="field"><span>Como</span><select data-f="acMeio"><option value="">—</option>${MEIOS.map(m=>`<option ${r.acMeio===m?"selected":""}>${m}</option>`).join("")}</select></label>
      <label class="field"><span>Motivo / equipamento</span><input data-f="acMot" value="${esc(r.acMot||"")}" placeholder="Ex.: elevador 02 parado"></label></div>`:""}
    ${assets?`<span class="fotos"><span class="muted" style="font-size:.8rem">Fotos:</span>${["antes","durante","depois"].map(tp=>`<label class="btn sm" for="d-foto-${i}-${tp}">${tp[0].toUpperCase()+tp.slice(1)}</label><input type="file" id="d-foto-${i}-${tp}" data-foto-row="${i}" data-tipo="${tp}" accept="image/*" multiple hidden>`).join("")}<button type="button" class="btn sm" data-act="assinar" data-row="${i}">✍ Assinatura</button>${(r.fotos||[]).length?`<span class="thumbs mini">${thumbs(r.fotos,false)}</span>`:""}</span>`:""}
    <div class="info" id="d-info-${i}"></div>
  </div>`).join("");
}
function dayEntries(){
  const d = state.day, ps = profs();
  const who = ps.length ? d.profs : [""];
  const rows = d.rows.map((r,i)=>({...r,i})).filter(r=>r.os||r.desc||r.fim);
  return {who, rows};
}
function updateDay(){
  const d = state.day; if(!d || !$("#dayForm")) return;
  const pre = dayPresets(d.data);
  $("#d-presets").innerHTML = pre.map(([n,a,b])=>`<button type="button" class="chipbtn" data-act="dayPreset" data-a="${a}" data-b="${b}">${n} ${a}–${b}</button>`).join("") || `<span class="muted">Dia sem jornada normal: tudo conta como extra.</span>`;
  const ex = dayExisting();
  $("#d-exist").innerHTML = ex.length ? `<div class="warnbox">Já lançado neste dia${d.profs.length?" para "+esc(d.profs.join(" e ")):""}: ${ex.map(e=>`OS ${esc(e.os||"s/n")} ${esc(e.inicio)}–${esc(e.fim)}`).join(" · ")}</div>` : "";
  const {who, rows} = dayEntries();
  const tot = {n:0,e50:0,e100:0,total:0,valor:0};
  d.rows.forEach((r,i)=>{
    const el = $("#d-info-"+i); if(!el) return;
    if(!r.ini || !r.fim){ el.innerHTML = r.os||r.desc ? `<span class="pill warn">Falta ${!r.ini?"início":"fim"}</span>` : ""; return; }
    const c = calc({data:d.data, inicio:r.ini, fim:r.fim, almIni:r.almIni, almFim:r.almFim, noAlmoco:!!r.noAlm, empresa:d.emp, ...(d.orcId?{orcId:d.orcId}:{}), ...(state.worker?{}:rateFor(d.emp||state.cfg.contratante||"", d.data))});
    ["n","e50","e100","total","valor"].forEach(k=>tot[k]+=c[k]);
    const others = [...ex, ...d.rows.filter((x,k)=>k!==i && x.ini && x.fim).map((x,k)=>({id:"r"+k, data:d.data, inicio:x.ini, fim:x.fim}))];
    const ov = overlaps([...others.map(o=>({...o, profissional:""})), {id:"__me", data:d.data, inicio:r.ini, fim:r.fim, profissional:""}]).has("__me");
    const hist = r.os ? state.ap.filter(x=>x.os===r.os.trim()) : [];
    const lk = lockOf(d.data, d.emp || state.cfg.contratante || "");
    el.innerHTML = `<b class="mono">${fdec(c.total)} h</b>${bucketChips(c)}${ov?'<span class="pill bad">Horário sobreposto</span>':""}${lk?`<span class="pill bad">Período fechado</span>`:""}${hist.length?`<span class="muted">OS já tem ${fdec(sumCalc(hist).total)} h em ${new Set(hist.map(x=>x.data)).size} dia(s)</span>`:""}`;
  });
  const nWho = Math.max(1, who.length);
  $("#d-tot").innerHTML = rows.length ? `<div class="line"><span>${rows.length} OS no dia${who.length>1?` · por profissional`:""}</span><span class="mono">${fdec(tot.total)} h</span></div>
    <div class="line"><span class="muted">Normal ${fdec(tot.n)} h · Extra ${pct50()} ${fdec(tot.e50)} h${tot.e100?` · Extra ${pct100()} ${fdec(tot.e100)} h`:""}</span><span class="mono">${d.orcId||state.worker ? "" : brl(tot.valor)}</span></div>
    ${who.length>1 && !d.orcId?`<div class="line tot"><span>${who.length} profissionais</span><span class="mono">${brl(tot.valor*nWho)}</span></div>`:""}
    ${d.orcId?`<div class="muted">Serviço de orçamento: as horas contam para acompanhar a obra, não para cobrança por hora.</div>`:""}` : `<span class="muted">Para cada OS, informe o número, o horário de início e o de término.</span>`;
  const n = rows.length * nWho;
  $("#d-save").textContent = n ? `Salvar ${n} apontamento${n>1?"s":""}` : "Salvar";
}
document.addEventListener("input", e=>{
  if(!e.target.closest("#dayForm")) return;
  const t = e.target, d = state.day;
  if(t.value==="__outra") return;
  if(t.dataset.f){ const i = +t.closest(".dayrow").dataset.r; d.rows[i][t.dataset.f] = t.type==="checkbox" ? t.checked : t.value; }
  if(t.id==="d-unid") d.unid = t.value;
  if(t.id==="d-emp") d.emp = t.value;
  if(t.id==="d-orc"){ d.orcId = t.value; const o = orcOpts().find(x=>x.id===d.orcId); if(o && o.cliente){ d.emp = o.cliente; const ie=$("#d-emp"); if(ie) ie.value = o.cliente; } }
  if(t.id==="d-data" && t.value) d.data = t.value;
  if(t.name==="d-prof") d.profs = [...document.querySelectorAll('input[name="d-prof"]:checked')].map(x=>x.value);
  updateDay(); clearTimeout(state.rascT); state.rascT = setTimeout(()=>rascunho.salvar(), 600);
});
document.addEventListener("change", e=>{
  if(!e.target.closest("#dayForm")) return;
  const t = e.target, d = state.day;
  if(t.id==="d-unid" || t.id==="d-emp"){ renderDayRows(); updateDay(); return; }
  if(!t.dataset.f) return;
  if(t.dataset.f==="emerg"){ renderDayRows(); updateDay(); return; }
  const i = +t.closest(".dayrow").dataset.r, r = d.rows[i];
  if(t.dataset.f==="os" && r.os){
    const prev = [...state.ap].filter(x=>x.os===r.os).sort((a,b)=>(b.data+b.inicio).localeCompare(a.data+a.inicio))[0]
      || d.rows.find((x,k)=>k!==i && x.os===r.os && (x.desc||x.cli));
    if(prev){ const row = t.closest(".dayrow");
      if(!r.desc){ r.desc = prev.descricao ?? prev.desc ?? ""; row.querySelector('[data-f="desc"]').value = r.desc; }
      const pc = prev.cliente ?? prev.cli ?? ""; if(!r.cli && pc && pc!==d.unid){ r.cli = pc; unidValor(row.querySelector('[data-f="cli"]'), r.cli); } }
  }
  if(t.dataset.f==="fim" && r.fim && d.rows[i+1] && !d.rows[i+1].ini){ d.rows[i+1].ini = nextStart(r.fim); const nx = document.querySelector(`.dayrow[data-r="${i+1}"] [data-f="ini"]`); if(nx) nx.value = d.rows[i+1].ini; }
  updateDay();
});
async function submitDay(){
  if(state.enviando){ toast("Aguarde: as fotos ainda estão sendo enviadas."); return; }
  const d = state.day, {who, rows} = dayEntries();
  if(!d.data){ toast("Informe a data."); return; }
  if(profs().length && !d.profs.length && !state.worker){ toast("Marque quem trabalhou."); return; }
  const lk = lockOf(d.data, d.emp || state.cfg.contratante || ""); if(lk){ toast(lockMsg(lk)); return; }
  if(!rows.length){ toast("Preencha pelo menos uma OS."); return; }
  const bad = rows.find(r=>!r.ini || !r.fim || r.ini===r.fim);
  if(bad){ toast(`Linha ${bad.i+1}: confira início e fim.`); return; }
  for(const r of rows){ const ae = r.ini && r.fim ? almErro(r.ini, r.fim, r.almIni, r.almFim) : ""; if(ae){ toast(`Linha ${r.i+1}: ${ae}.`); return; } }
  if(osObrigatoria(d.emp)){ const sem = rows.find(r=>!r.os.trim()); if(sem){ toast(`Linha ${sem.i+1}: a ${d.emp||state.cfg.contratante} exige o nº da OS.`); return; } }
  const btn = $("#d-save"); btn.disabled = true;
  const base = {...(state.worker ? {} : rateFor(d.emp || state.cfg.contratante || "", d.data)), tipo:"auto", obs:"", ...(d.orcId?{orcId:d.orcId}:{})};
  const col = "apontamentos", quem = state.worker ? [state.me] : who;
  for(const r of rows){ const row = d.rows[r.i]; row.ids ||= {}; for(const pr of quem) row.ids[pr||"_"] ||= uid(); }
  rascunho.salvar();
  let n = 0;
  try{
    for(const r of rows) for(const pr of quem){
      const row = d.rows[r.i]; row.ids ||= {}; const id = row.ids[pr||"_"] ||= uid();
      await save(col, {...base, id, ...eqSplit(r.eq), almIni:r.almIni||"", almFim:r.almFim||"", noAlmoco:!!r.noAlm, obs:(r.obs||"").trim(), ...(r.emerg?{acion:{por:(r.acPor||"").trim(), as:r.acAs||"", meio:r.acMeio||"", motivo:(r.acMot||"").trim()}}:{}), data:d.data, os:r.os.trim(), tracos:limpaTracos(r.tid), ...(r.nota?{nota:r.nota}:{}), descricao:r.desc.trim(), inicio:r.ini, fim:r.fim, cliente:(r.cli||d.unid).trim(), empresa:(d.emp||"").trim(), emergencia:!!r.emerg, profissional:pr, fotos:r.fotos||[], fotoMeta:r.fotoMeta||{}, criadoEm:new Date().toISOString()});
      n++;
    }
    try{ if(d.profs.length) localStorage.setItem("gaap-last-prof", JSON.stringify(d.profs)); if(d.emp) localStorage.setItem("gaap-last-emp", d.emp); }catch(err){}
    rascunho.limpar(); state.modalDirty = false; closeModal(); state.month = ym(d.data); render(); toast(`${n} apontamento${n>1?"s":""} salvo${n>1?"s":""}`);
  }catch(err){ btn.disabled = false; toast(n ? `${n} salvos, mas parei por um erro. ${writeErr(err)} Toque em Salvar de novo: o que já foi salvo não será duplicado.` : writeErr(err)); }
}
document.addEventListener("input", e=>{ if(e.target.closest("#apForm")) updateApPreview(); });
document.addEventListener("change", e=>{ if(e.target.id==="f-emerg"){ const b = $("#f-acion"); if(b) b.hidden = !e.target.checked; } if(e.target.id==="cr-emerg"){ const b = $("#cr-acion"); if(b) b.hidden = !e.target.checked; } });
document.addEventListener("change", e=>{ if(e.target.closest("#apForm")) updateApPreview(); });
document.addEventListener("submit", async e=>{
  if(e.target.id==="apForm"){
    e.preventDefault();
    if(state.enviando){ toast("Aguarde: as fotos ainda estão sendo enviadas."); return; }
    const d = readApForm(); delete d.andamento;
    if(!d.data || !d.inicio || !d.fim){ toast("Preencha data, início e término."); return; }
    if(d.inicio===d.fim){ toast("Início e término iguais. Confira os horários."); return; }
    { const ae = almErro(d.inicio, d.fim, d.almIni, d.almFim); if(ae){ toast("Almoço: "+ae+"."); return; } }
    if(!d.os && osObrigatoria(empOf(d))){ toast(`A ${empOf(d)} exige o nº da OS.`); return; }
    const multi = (!$("#f-prof1") && !state.worker) ? selProfs() : [];
    if(!d.id && profs().length && !multi.length && !state.worker){ toast("Marque quem trabalhou nessa OS."); return; }
    const lk = lockOf(d.data, empOf(d), d.profissional); if(lk){ toast(lockMsg(lk)); return; }
    const prev = d.id ? state.ap.find(x=>x.id===d.id) : null, novo = !prev;
    state.apIds ||= {};
    if(novo){ d.criadoEm = state.apIds._criado ||= new Date().toISOString(); delete d.exemplo; if(!d.id) d.id = state.apIds._ ||= uid(); }
    if(state.worker){ delete d.valorHora; delete d.extraPct; delete d.feriadoPct; }
    else if(!prev || (prev.empresa||"")!==(d.empresa||"") || prev.data!==d.data){ Object.assign(d, rateFor(empOf(d), d.data)); }
    const col = "apontamentos";
    const btn = e.target.querySelector('[type="submit"]'); if(btn) btn.disabled = true;
    try{
      if(novo && multi.length){ for(const pr of multi) await save(col, {...d, id: state.apIds[pr] ||= uid(), profissional:pr}); try{ localStorage.setItem("gaap-last-prof", JSON.stringify(multi)); }catch(err){} }
      else await save(col, d);
      (prev?.fotos||[]).filter(id=>!(d.fotos||[]).includes(id)).forEach(id=>deleteAssetIfUnused(id, [d.id]));
      state.modalDirty = false; closeModal(); toast(!novo ? "Apontamento atualizado" : multi.length>1 ? `${multi.length} apontamentos salvos (um por profissional)` : "Apontamento salvo"); state.month = ym(d.data); render();
    }
    catch(err){ if(btn) btn.disabled = false; toast(writeErr(err)); }
  }
  if(e.target.id==="recForm"){ e.preventDefault(); submitRec(); }
  if(e.target.id==="dayForm"){ e.preventDefault(); submitDay(); }
  if(e.target.id==="fechForm"){ e.preventDefault(); submitFech(); }
  if(e.target.id==="loginForm"){ e.preventDefault(); submitLogin(e.target); }
  if(e.target.id==="cfgForm"){ e.preventDefault(); submitCfg(); }
});
function writeErr(err){ if(err && err.code==="db" && err.message) return err.message; if(err && err.code==="quota_exceeded") return "Limite de armazenamento atingido. Apague registros antigos ou exporte um backup."; if(err && err.code==="invalid_argument") return "Você não tem permissão para salvar aqui."; return "Não consegui salvar. Verifique a conexão e tente de novo."; }

