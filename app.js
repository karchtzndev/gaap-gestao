"use strict";
const SOBRE = "A GAAP ENGENHARIA é uma empresa especializada no ramo de montagem e manutenção mecânica industrial, para empresas voltadas para manipulação de grãos, cervejarias e farmacêuticas. Fabricação e montagem de galpões e estruturas metálicas no geral. Atuamos na área de engenharia Mecânica, Civil e de Segurança do Trabalho; projetos, laudos, ART e treinamentos de segurança. A empresa está estrategicamente localizada na cidade de Anápolis GO, onde se encontra o maior polo industrial do Centro-Oeste.";
const DEFAULT_CFG = {
  empresa:{nome:"GAAP ENGENHARIA",cnpj:"58.486.529/0001-47",email:"gaapengenharia3m@gmail.com",telefone:"(62) 9 9310-3507",cidade:"Anápolis GO",responsavel:"",sobre:SOBRE},
  contratante:"Brejeiro",
  valorHora:60, extraPct:50, feriadoPct:100,
  jornada:{"0":{ini:"",fim:""},"1":{ini:"07:00",fim:"16:00"},"2":{ini:"07:00",fim:"16:00"},"3":{ini:"07:00",fim:"16:00"},"4":{ini:"07:00",fim:"16:00"},"5":{ini:"07:00",fim:"16:00"},"6":{ini:"07:00",fim:"11:00"}},
  almoco:{ativo:false,ini:"11:00",fim:"12:00"},
  feriados:{carnaval:false,corpus:false,extras:"31/07 Aniversário de Anápolis"},
  tolerancia:5, profissionais:"", unidades:"", empresas:"Brejeiro", custos:{}, taxas:{}, carimbo:true
};
const pct50 = () => state.worker ? "" : state.cfg.extraPct+"%", pct100 = () => state.worker ? "" : state.cfg.feriadoPct+"%";
const WD = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const WDS = ["dom","seg","ter","qua","qui","sex","sáb"];
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const ST = {rascunho:["Rascunho",""],enviado:["Enviado","info"],aprovado:["Aprovado","good"],concluido:["Concluído","good"],recusado:["Recusado","bad"]};
const TIPOS = {auto:"Automático pelo horário",normal:"Forçar hora normal",e50:"Forçar extra 50%",e100:"Forçar extra 100%"};

/* ---------- utils ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const brl = v => (Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const num = v => { const n = parseFloat(String(v ?? "").replace(/\./g,"").replace(",", ".")); return isFinite(n) ? n : 0; };
const numIn = v => { const s=String(v??"").trim(); if(!s) return 0; if(s.includes(",")) return num(s); const n=parseFloat(s); return isFinite(n)?n:0; };
const pad = n => String(n).padStart(2,"0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y,m-1,d); };
const addDays = (d,n) => new Date(d.getFullYear(), d.getMonth(), d.getDate()+n);
const today = () => ymd(new Date());
const nowHM = () => { const d=new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const hm = s => { if(!s) return null; const m = String(s).match(/^(\d{1,2}):(\d{2})$/); return m ? (+m[1])*60 + (+m[2]) : null; };
const fh = m => `${Math.floor(m/60)}h${pad(Math.round(m%60))}`;
const fdec = m => (m/60).toFixed(2).replace(".",",");
const lines = s => String(s||"").split("\n").map(x=>x.trim()).filter(Boolean);
const profs = () => lines(state.cfg.profissionais);
const fdate = s => s ? s.split("-").reverse().join("/") : "";
const ym = s => s.slice(0,7);
const ymLabel = k => { const [y,m]=k.split("-").map(Number); return `${MESES[m-1]} ${y}`; };
const shiftYm = (k,n) => { const [y,m]=k.split("-").map(Number); const d=new Date(y,m-1+n,1); return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
const clone = o => JSON.parse(JSON.stringify(o));
function deepMerge(base, over){ const out = clone(base); if(!over||typeof over!=="object") return out; for(const k of Object.keys(over)){ const v=over[k]; if(v===undefined || v===null) continue; out[k] = (v && typeof v==="object" && !Array.isArray(v) && out[k] && typeof out[k]==="object") ? deepMerge(out[k], v) : v; } return out; }
function extenso(d=new Date()){ const m=MESES[d.getMonth()]; return `${d.getDate()} de ${m[0].toUpperCase()+m.slice(1)} de ${d.getFullYear()}`; }

/* ---------- feriados ---------- */
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da);}
let holCache = {};
function holidays(y){
  const key = y+JSON.stringify(state.cfg.feriados);
  if(holCache[key]) return holCache[key];
  const map = {};
  const put = (d,n) => { map[ymd(d)] = n; };
  [["01-01","Confraternização Universal"],["04-21","Tiradentes"],["05-01","Dia do Trabalho"],["09-07","Independência do Brasil"],["10-12","Nossa Senhora Aparecida"],["11-02","Finados"],["11-15","Proclamação da República"],["11-20","Consciência Negra"],["12-25","Natal"]].forEach(([md,n])=>map[`${y}-${md}`]=n);
  const e = easter(y);
  put(addDays(e,-2),"Sexta-feira Santa");
  if(state.cfg.feriados.carnaval){ put(addDays(e,-48),"Carnaval"); put(addDays(e,-47),"Carnaval"); }
  if(state.cfg.feriados.corpus) put(addDays(e,60),"Corpus Christi");
  String(state.cfg.feriados.extras||"").split("\n").forEach(line=>{
    const m = line.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s*(.*)$/);
    if(!m) return; if(m[3] && +m[3]!==y) return;
    map[`${y}-${pad(+m[2])}-${pad(+m[1])}`] = m[4] || "Feriado";
  });
  return holCache[key] = map;
}
const holidayName = ds => holidays(+ds.slice(0,4))[ds] || null;

/* ---------- cálculo de horas ---------- */
let calcCache = new WeakMap();
function calc(e){ // memória: mesma OS e mesma configuração → mesmo resultado
  if(!e || typeof e!=="object") return calcRaw(e);
  const c = calcCache.get(e); if(c && c.cfg===state.cfg) return c.r;
  const r = Object.freeze(calcRaw(e)); calcCache.set(e, {cfg:state.cfg, r}); return r;
}
function calcRaw(e){
  const cfg = state.cfg;
  const r = {n:0,e50:0,e100:0,total:0,valor:0,vn:0,v50:0,v100:0,not:0,vnot:0};
  const s0 = hm(e.inicio), f0 = hm(e.fim);
  if(!e.data || s0==null || f0==null) return r;
  let f = f0; if(f <= s0) f += 1440;
  const base = parseYmd(e.data), days = {};
  const aIni = hm(cfg.almoco.ini), aFim = hm(cfg.almoco.fim);
  let early = 0, late = 0;
  for(let t=s0; t<f; t++){
    const dn = Math.floor(t/1440), mod = t%1440;
    let info = days[dn];
    if(!info){ const dt=addDays(base,dn), wd=dt.getDay(), j=cfg.jornada[wd]||{}; info = days[dn] = {special: wd===0 || !!holidayName(ymd(dt)), ji:hm(j.ini), jf:hm(j.fim)}; }
    const almoco = cfg.almoco.ativo && aIni!=null && aFim!=null && mod>=aIni && mod<aFim;
    if(almoco && !e.noAlmoco) continue;
    if(mod>=NOITE_INI || mod<NOITE_FIM) r.not++; // 22h às 5h
    let b;
    if(e.tipo==="normal") b="n"; else if(e.tipo==="e50") b="e50"; else if(e.tipo==="e100") b="e100";
    else if(info.special) b="e100";
    else if(almoco) b="e50";
    else if(info.ji!=null && info.jf!=null && mod>=info.ji && mod<info.jf) b="n";
    else { b="e50"; if(info.ji!=null && info.jf!=null){ if(mod<info.ji) early++; else late++; } }
    r[b]++;
  }
  const tol = +cfg.tolerancia || 0;
  if(tol && r.n>0 && (!e.tipo || e.tipo==="auto")){
    if(early && early<=tol){ r.e50-=early; r.n+=early; }
    if(late && late<=tol){ r.e50-=late; r.n+=late; }
  }
  const T = rateFor(empOf(e), e.data);
  const rate = (e.valorHora ?? T.valorHora) / 60;
  const p50 = e.extraPct ?? T.extraPct, p100 = e.feriadoPct ?? T.feriadoPct;
  r.vn = rate*r.n; r.v50 = rate*r.e50*(1+p50/100); r.v100 = rate*r.e100*(1+p100/100);
  const pNot = e.noturnoPct ?? T.noturnoPct; r.vnot = pNot ? rate*r.not*pNot/100 : 0; if(!pNot) r.not = 0;
  r.total = r.n+r.e50+r.e100;
  if(e.orcId){ r.orc = true; r.vn = r.v50 = r.v100 = r.vnot = 0; }
  r.valor = Math.round((r.vn+r.v50+r.v100+r.vnot)*100)/100;
  return r;
}
const VERSAO = "2026.10.06-7";
const NOITE_INI = 22*60, NOITE_FIM = 5*60;
function rateFor(emp, data){
  let t = (state.cfg.taxas||{})[emp] || {}; const num0 = (v,d) => (v===""||v==null||isNaN(+v)) ? d : +v;
  if(data && t.desde && data < t.desde){ const h = (t.historico||[]).filter(x=>data < x.ate).sort((a,b)=>a.ate.localeCompare(b.ate))[0]; if(h) t = h; }
  return {valorHora:num0(t.valorHora, +state.cfg.valorHora), extraPct:num0(t.extraPct, +state.cfg.extraPct), feriadoPct:num0(t.feriadoPct, +state.cfg.feriadoPct), noturnoPct:num0(t.noturnoPct, +state.cfg.noturnoPct||0)};
}
let mmCache = {ref:null, map:null};
function monthMinutes(){
  if(mmCache.ref===state.ap) return mmCache.map;
  const m = {}; state.ap.forEach(e=>{ const k=(e.profissional||"")+"|"+ym(e.data); m[k]=(m[k]||0)+calc(e).total; });
  mmCache = {ref:state.ap, map:m}; return m;
}
const temCustos = () => Object.values(state.cfg.custos||{}).some(c=>+c.valor>0);
const HORAS_MES = 220;
function custoHora(nome){ const c = (state.cfg.custos||{})[nome]; if(!c || !(+c.valor>0)) return 0; return c.tipo==="mes" ? +c.valor/HORAS_MES : +c.valor; }
function custo(e){
  const v = custoHora(e.profissional); if(!v) return 0;
  const k = calc(e);
  return v/60*(k.n + k.e50*(1+state.cfg.extraPct/100) + k.e100*(1+state.cfg.feriadoPct/100));
}
const custoSum = list => Math.round(list.reduce((s,e)=>s+custo(e),0)*100)/100;
function sumCalc(list){ const t={n:0,e50:0,e100:0,total:0,valor:0,vn:0,v50:0,v100:0,not:0,vnot:0}; list.forEach(e=>{const c=calc(e); for(const k in t) t[k]+=c[k];}); t.valor=Math.round(t.valor*100)/100; return t; }
function overlaps(list){
  const bad = new Set(); list = list.filter(e=>!e.andamento && e.fim);
  const iv = list.map(e=>{const s=hm(e.inicio); let f=hm(e.fim); if(f<=s) f+=1440; const o=(parseYmd(e.data)-parseYmd("2000-01-01"))/864e5*1440; return {id:e.id,p:e.profissional||"",s:o+s,f:o+f};}).sort((a,b)=>a.s-b.s);
  for(let i=1;i<iv.length;i++) for(let j=0;j<i;j++) if(iv[i].p===iv[j].p && iv[i].s < iv[j].f){ bad.add(iv[i].id); bad.add(iv[j].id); }
  return bad;
}

/* ---------- descrição para relatórios (emergência + observações) ---------- */
const MEIOS = ["Ligação","WhatsApp","Presencial","Rádio","Outro"];
function emergTxt(e){ if(!e.emergencia) return ""; const a = e.acion||{};
  return ["EMERGÊNCIA", a.por?`acionado por ${a.por}`:"", a.as?`às ${a.as}`:"", a.meio?`via ${a.meio}`:"", a.motivo?`(${a.motivo})`:""].filter(Boolean).join(" "); }
function descRep(e){ const q = e.equipId && eqDe(e.equipId), pl = q && e.prevId && (q.plano||[]).find(x=>x.id===e.prevId);
  return [e.descricao||"", q?`Equip. ${q.tag||""}${pl?` (preventiva: ${pl.atividade})`:""}`:"", emergTxt(e), e.obs?`Obs.: ${e.obs}`:""].filter(Boolean).join(" · "); }
function acionadores(){ const m = {}; state.ap.forEach(e=>{ const p = e.acion?.por; if(p) m[p] = (m[p]||0)+1; }); return Object.keys(m).sort((a,b)=>m[b]-m[a]).slice(0,30); }
/* ---------- ficha da contratante ---------- */
const ficha = emp => ((state.cfg.contratantes||{})[emp]) || {};
function osObrigatoria(emp){ return !!ficha(emp || state.cfg.contratante || "").exigirOS; }
function medicao(emp, desloc=0){
  const corte = +ficha(emp || state.cfg.contratante || "").corte || 0; if(!corte) return null;
  const t = parseYmd(today()); let ate = new Date(t.getFullYear(), t.getMonth(), corte); if(ate < t) ate = new Date(t.getFullYear(), t.getMonth()+1, corte);
  ate = new Date(ate.getFullYear(), ate.getMonth()+desloc, corte); let de = ymd(new Date(ate.getFullYear(), ate.getMonth()-1, corte+1));
  // não sobrepõe meses já fechados (ex.: setembro importado de 01 a 30)
  const k = chaveEmp(emp || state.cfg.contratante || ""), ult = state.fech.filter(f=>chaveEmp(f.empresa||"")===k && f.ate>=de && f.ate<ymd(ate)).map(f=>f.ate).sort().pop();
  if(ult) de = ymd(addDays(parseYmd(ult), 1));
  return [de, ymd(ate)];
}
/* ---------- conferência: dias úteis sem lançamento e buracos na jornada ---------- */
function conferencia(de, ate, quem){
  const cfg = state.cfg, out = [], lim = ymd(addDays(parseYmd(today()), -1)); if(ate > lim) ate = lim;
  const pessoas = quem ? [quem] : (profs().length ? profs() : [""]);
  const aI = hm(cfg.almoco.ini), aF = hm(cfg.almoco.fim), inicio = {};
  state.ap.forEach(e=>{ const k = e.profissional||""; if(!inicio[k] || e.data < inicio[k]) inicio[k] = e.data; if(!inicio._ || e.data < inicio._) inicio._ = e.data; });
  for(let d = parseYmd(de), n = 0; ymd(d) <= ate && n < 120; d = addDays(d,1), n++){
    const ds = ymd(d), j = cfg.jornada[d.getDay()] || {}, ji = hm(j.ini), jf = hm(j.fim);
    if(ji==null || jf==null || d.getDay()===0 || holidayName(ds)) continue;
    const janelas = (cfg.almoco.ativo && aI!=null && aF!=null && aI>ji && aF<jf) ? [[ji,aI],[aF,jf]] : [[ji,jf]];
    const prevista = janelas.reduce((s,[a,b])=>s+b-a,0);
    for(const p of pessoas){
      const ini = p ? inicio[p] : inicio._; if(!ini || ds < ini) continue;
      const list = state.ap.filter(e=>e.data===ds && (!p || e.profissional===p) && !e.andamento);
      const iv = list.map(e=>{ const a = hm(e.inicio); let b = hm(e.fim); if(b<=a) b = 1440; return [a,b]; }).sort((x,y)=>x[0]-y[0]);
      const buracos = []; let coberto = 0;
      for(const [ja,jb] of janelas){
        let cur = ja;
        for(const [a,b] of iv){ if(b<=cur || a>=jb) continue; if(a>cur) buracos.push([cur, Math.min(a,jb)]); cur = Math.max(cur, Math.min(b,jb)); if(cur>=jb) break; }
        if(cur<jb) buracos.push([cur,jb]);
      }
      const falta = buracos.filter(([a,b])=>b-a>=15).reduce((s,[a,b])=>s+b-a,0);
      coberto = prevista - buracos.reduce((s,[a,b])=>s+b-a,0);
      if(falta>0) out.push({data:ds, prof:p, prevista, coberto, falta, semNada:!list.length, buracos:buracos.filter(([a,b])=>b-a>=15)});
    }
  }
  return out;
}
const hhmm = m => `${pad(Math.floor(m/60))}:${pad(m%60)}`;
function alertasDinheiro(){
  const out = [], hoje = today();
  state.fech.forEach(f=>{ const sd = fechSaldo(f); if(sd<=0.005) return; const d = diasEntre(fechVenc(f), hoje);
    if(d>0) out.push({nivel:"bad", txt:`${f.numero}${f.empresa?` (${f.empresa})`:""} vencido há ${d} dia${d>1?"s":""}: ${brl(sd)}`, btn:`<button class="btn sm" data-act="fechCobrar" data-id="${esc(f.id)}">Cobrar</button>`});
    else if(d>=-3) out.push({nivel:"warn", txt:`${f.numero} vence ${d===0?"hoje":`em ${-d} dia${d<-1?"s":""}`}: ${brl(sd)}`, btn:`<button class="btn sm" data-act="fechCobrar" data-id="${esc(f.id)}">Lembrar</button>`});
    if((!f.nf || !f.nf.numero || f.nf.status==="emitir") && diasEntre(f.enviadoEm||f.ate, hoje) >= 2) out.push({nivel:"warn", txt:`${f.numero}: nota fiscal ainda não emitida`, btn:`<button class="btn sm" data-act="fechNF" data-id="${esc(f.id)}">Nota fiscal</button>`});
  });
  empresasCfg().forEach(emp=>{ const m0 = medicao(emp, 0), m1 = medicao(emp, -1); if(!m0) return;
    if(m0[1]===hoje) out.push({nivel:"info", txt:`Hoje é o dia de corte da medição ${emp} (${fdate(m0[0])} a ${fdate(m0[1])}).`, btn:`<button class="btn sm" data-act="irFechar" data-de="${m0[0]}" data-ate="${m0[1]}">Fechar medição</button>`});
    if(m1 && !fechConflict(m1[0], m1[1], emp) && state.ap.some(e=>e.data>=m1[0] && e.data<=m1[1] && !e.orcId && chaveEmp(empOf(e))===chaveEmp(emp)))
      out.push({nivel:"warn", txt:`Medição ${emp} de ${fdate(m1[0])} a ${fdate(m1[1])} ainda não foi fechada.`, btn:`<button class="btn sm" data-act="irFechar" data-de="${m1[0]}" data-ate="${m1[1]}">Fechar</button>`});
  });
  return out;
}
function alertasAcesso(){ return []; } // os pedidos de cadastro aparecem na faixa vermelha do Painel (aprovacoesHtml)
// "alan.cardoso8714@gmail.com" → "Alan Cardoso"
const nomeDoEmail = e => String(e||"").split("@")[0].replace(/\d+/g," ").split(/[._\-\s]+/).filter(Boolean).map(w=>w[0].toUpperCase()+w.slice(1).toLowerCase()).join(" ");
function aprovacoesHtml(){
  if(state.worker) return ""; const ps = state.perfis.filter(p=>p.papel==="pendente"); if(!ps.length) return "";
  return `<section class="aprovbox" role="alert" aria-live="polite"><h2>⚠️ ${ps.length===1 ? "1 pedido de cadastro precisa da sua aprovação" : `${ps.length} pedidos de cadastro precisam da sua aprovação`}</h2>
  ${ps.map(p=>`<div class="aprovcard" data-uid="${esc(p.user_id)}"><div><b>${esc(p.email)}</b><br><small>pediu cadastro ${p.criado_em ? `em ${fdate(String(p.criado_em).slice(0,10))} às ${new Date(p.criado_em).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}` : ""}</small></div>
    <label class="field"><span>Nome</span><input class="pf-nome" list="pf-profs-p" value="${esc(p.nome || nomeDoEmail(p.email))}"></label>
    <div class="row aprov-acts"><button type="button" class="btn primary" data-act="perfilLiberar" data-papel="funcionario" data-uid="${esc(p.user_id)}">✓ Aprovar como funcionário</button><button type="button" class="btn" data-act="perfilLiberar" data-papel="dono" data-uid="${esc(p.user_id)}">Aprovar como responsável</button><button type="button" class="btn danger" data-act="perfilBloquear" data-uid="${esc(p.user_id)}">Recusar</button></div></div>`).join("")}
  <datalist id="pf-profs-p">${profs().map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
  <p class="aprov-dica">Funcionário: lança só as próprias OS, sem ver valores. Responsável: vê tudo, como você.</p></section>`;
}
function alertasHtml(){
  const a = [...alertasAcesso(), ...alertasDinheiro(), ...(typeof alertasEquipe==="function" ? alertasEquipe() : [])]; if(!a.length) return "";
  return `<section class="section"><header><h2>Para fazer hoje</h2><span class="pill ${a.some(x=>x.nivel==="bad")?"bad":"warn"}">${a.length}</span></header>
  <div class="list">${a.slice(0,10).map(x=>`<div class="item alerta" style="cursor:default"><span class="dot-${x.nivel}"></span><span>${esc(x.txt)}</span><span>${x.btn||""}</span></div>`).join("")}</div></section>`;
}
function confHtml(lista, titulo, max=8){
  if(!lista.length) return "";
  const tot = lista.reduce((s,x)=>s+x.falta,0);
  return `<section class="section"><header><h2>${titulo}</h2><span class="pill warn">${lista.length} dia${lista.length>1?"s":""} · ${fh(tot)} sem lançamento</span></header>
  <div class="list">${lista.slice(0,max).map(x=>`<button class="item confitem" data-act="confAbrir" data-d="${x.data}" data-p="${esc(x.prof)}" data-a="${x.buracos[0]?hhmm(x.buracos[0][0]):""}" data-b="${x.buracos[0]?hhmm(x.buracos[0][1]):""}">
    <span><b>${WDS[parseYmd(x.data).getDay()]} ${fdate(x.data)}</b>${x.prof&&!state.worker?` · ${esc(x.prof)}`:""}<br><small class="muted">${x.semNada?"Nenhuma OS lançada":`${fh(x.coberto)} de ${fh(x.prevista)} · sem lançamento: ${x.buracos.map(([a,b])=>`${hhmm(a)}–${hhmm(b)}`).join(", ")}`}</small></span>
    <span class="pill">Lançar</span></button>`).join("")}</div>
  ${lista.length>max?`<p class="muted" style="margin:6px 0 0">E mais ${lista.length-max} dia(s).</p>`:""}</section>`;
}
/* ---------- orçamento ---------- */
function orcTotals(o){ const sub=(o.itens||[]).reduce((s,i)=>s+numIn(i.qtd)*numIn(i.valor),0); const desc=sub*numIn(o.descontoPct)/100; return {sub,desc,total:Math.round((sub-desc)*100)/100}; }
const RETS = [["iss","ISS"],["inss","INSS"],["ir","IR"],["outras","Outras"]];
const retTot = r => RETS.reduce((s,[k])=>s+numIn((r.ret||{})[k]),0);
const recBruto = r => numIn(r.valor) + retTot(r);
const orcRecebido = id => state.rec.filter(r=>r.origem==="orc"&&r.orcId===id).reduce((s,r)=>s+recBruto(r),0);
const orcAberto = o => ["aprovado","concluido"].includes(o.status);
function orcValidade(o){ if(!o.data) return null; return ymd(addDays(parseYmd(o.data), +o.validadeDias||0)); }

/* ---------- dados (Supabase) ---------- */
const COLS = ["apontamentos","orcamentos","recebimentos","fechamentos","despesas","pagamentos","equipamentos","documentos"];
const KEY = {apontamentos:"ap",orcamentos:"orc",recebimentos:"rec",fechamentos:"fech",despesas:"desp",pagamentos:"pag",equipamentos:"eq",documentos:"docs"};
const state = {
  ready:false, cfg:clone(DEFAULT_CFG), ap:[], orc:[], rec:[], fech:[], desp:[], pag:[], eq:[], docs:[], perfis:[], worker:false, me:"", pub:null, hmode:"dia", osQ:"",
  view:"painel", month:ym(today()), orcFilter:"todos", orcDraft:null, auth:"entrar",
  rep:{modo:"dia", dia:today(), de:ym(today())+"-01", ate:today(), valores:true, f:{prof:"__all",unid:"__all",emp:"__all"}, by:"", vazios:true, fmt:"dec"},
  hf:{f:{prof:"__all",unid:"__all",emp:"__all"}, by:""}, pby:"prof"
};
const sb = window.supabase.createClient(window.GAAP_CONFIG.supabaseUrl, window.GAAP_CONFIG.supabaseKey, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}});
let session = null, perfil = null;
const MSG_DB = {SEM_PERMISSAO:"Seu acesso ainda não foi liberado para lançar OS. Fale com o responsável.", NAO_E_SEU:"Esse lançamento não é seu.", DATA_INVALIDA:"Data inválida.", HORA_INVALIDA:"Horário inválido. Use HH:MM.", ID_INVALIDO:"Código de registro inválido.", DADOS_INVALIDOS:"Dados inválidos.", OS_OBRIGATORIA:"Essa contratante exige o nº da OS.", NOME_VAZIO:"Digite o novo nome."};
function dbErr(error){
  const m = String(error?.message||"");
  if(m.startsWith("PERIODO_FECHADO:")) return {code:"db", message:`Esse período já foi fechado (${m.split(":")[1]}). Fale com o responsável.`};
  if(m==="CONFLITO") return {code:"db", conflito:true, message:MSG_CONFLITO};
  if(MSG_DB[m]) return {code:"db", message:MSG_DB[m]};
  if(error?.code==="42501" || /row-level security/i.test(m)) return {code:"invalid_argument", message:""};
  return {code:"unavailable", message:""};
}
async function fetchAll(table, desde){
  const out = []; const step = 1000; let ultimo = "";
  for(;;){
    let q = sb.from(table).select("id,data,atualizado_em").order("id").limit(step);
    if(ultimo) q = q.gt("id", ultimo); if(desde) q = q.gt("atualizado_em", desde);
    const {data, error} = await q;
    if(error) throw error; out.push(...data); if(data.length < step) break; ultimo = data[data.length-1].id;
  }
  return out;
}
const doRow = r => { if(r.atualizado_em && (!state.lido || r.atualizado_em > state.lido)) state.lido = r.atualizado_em; return {id:r.id, ...r.data, _v:r.atualizado_em}; };
const semV = o => { const d = clone(o); delete d._v; delete d.id; delete d._col; return d; };
const MSG_CONFLITO = "Este registro foi alterado em outro aparelho enquanto você editava. Atualizei com a versão mais nova: confira e faça sua alteração de novo.";
async function recarregarDoc(col, id){
  if(state.worker){ await loadWorker(); return; }
  if(col==="config"){ const {data} = await sb.from("config").select("data,atualizado_em").eq("id","main").maybeSingle(); if(data){ state.cfg = deepMerge(DEFAULT_CFG, data.data); state.cfgV = data.atualizado_em; holCache = {}; calcCache = new WeakMap(); } return; }
  const {data} = await sb.from(col).select("id,data,atualizado_em").eq("id", id).maybeSingle();
  const k = KEY[col];
  if(!data || (col==="apontamentos" && data.data?.excluido)) setList(k, state[k].filter(x=>x.id!==id)); else upsertLocal(k, doRow(data));
}
const setList = (k, list) => { state[k] = list; if(k==="ap") mmCache.ref = null; try{ snap.agendar(); }catch(e){} };
function upsertLocal(k, row){ setList(k, [...state[k].filter(x=>x.id!==row.id), row]); }
async function save(col, obj){
  const id = obj.id || uid(), versao = obj._v || null; const data = semV(obj); delete data._pend;
  data.atualizadoEm = new Date().toISOString(); state.gen = (state.gen||0) + 1;
  if(precisaFila(col, id, data)) return filaSalvar(col, id, data, versao);
  try{ return await saveNet(col, id, data, versao); }
  catch(e){ if(e && e.rede) return filaSalvar(col, id, data, versao); throw e; }
}
// envio de um registro ao servidor; erro de conexão vem marcado com {rede:true}
async function saveNet(col, id, data, versao){
  if(state.worker){
    const {data:ret, error} = await sb.rpc("func_salvar_os", {p_id:id, p_data:{...data, ...(versao?{_v:versao}:{})}});
    if(error){ if(ehRede(error)) throw {rede:true}; const e = dbErr(error); if(e.conflito) await recarregarDoc(col, id).catch(()=>{}); throw e; }
    const [newId, v] = String(ret||id).split("|");
    const row = {...data, id:newId||id, profissional:state.me, lancadoPor:"funcionario", tipo:"auto", ...(v?{_v:v}:{})}; delete row.valorHora; delete row.extraPct; delete row.feriadoPct;
    upsertLocal("ap", row); scheduleRender(); return row.id;
  }
  const {data:v, error} = await sb.rpc("salvar_doc", {p_tabela:col, p_id:id, p_data:data, p_versao:versao});
  if(error){ if(ehRede(error)) throw {rede:true}; const e = dbErr(error); if(e.conflito) await recarregarDoc(col, id).catch(()=>{}); throw e; }
  upsertLocal(KEY[col], {id, ...data, _v:v}); scheduleRender();
  return id;
}
async function saveMany(col, lista){ // registros novos em lote (importação)
  for(let i=0; i<lista.length; i+=500){
    const {error} = await sb.from(col).upsert(lista.slice(i, i+500).map(r=>({id:r.id, data:semV(r)})));
    if(error) throw dbErr(error);
  }
}
async function removeDoc(col, id){
  state.gen = (state.gen||0) + 1;
  if(outbox.tem(col, id) || state.offline){ await outbox.por({op:"del", col, id}); }
  else try{ await removeNet(col, id); }catch(e){ if(e && e.rede) await outbox.por({op:"del", col, id}); else throw e; }
  setList(KEY[col], state[KEY[col]].filter(x=>x.id!==id)); scheduleRender();
}
async function removeNet(col, id){
  const {error} = state.worker ? await sb.rpc("func_excluir_os", {p_id:id}) : await sb.from(col).delete().eq("id", id);
  if(error){ if(ehRede(error)) throw {rede:true}; throw dbErr(error); }
}
/* ---------- sem internet: fila de envio, fotos guardadas e cópia dos dados no aparelho ---------- */
const ehRede = err => !navigator.onLine || /failed to fetch|fetch failed|networkerror|network request|load failed|internet|timed? ?out|ERR_/i.test(String(err?.message || err?.error || err || ""));
const idb = (()=>{ let con;
  const abrir = () => con ||= new Promise((res, rej)=>{ try{ const r = indexedDB.open("gaap-offline", 1); r.onupgradeneeded = ()=>r.result.createObjectStore("kv"); r.onsuccess = ()=>res(r.result); r.onerror = ()=>rej(r.error); }catch(e){ rej(e); } });
  const tx = async (modo, fn) => { const db = await abrir(); return new Promise((res, rej)=>{ const t = db.transaction("kv", modo), r = fn(t.objectStore("kv")); t.oncomplete = ()=>res(r ? r.result : undefined); t.onerror = ()=>rej(t.error); t.onabort = ()=>rej(t.error); }); };
  return { get:k=>tx("readonly", s=>s.get(k)), set:(k,v)=>tx("readwrite", s=>s.put(v,k)), del:k=>tx("readwrite", s=>s.delete(k)) };
})();
const fotosPend = new Set();
const outbox = {
  lista: [], dono: "",
  chave(){ return "fila:" + (session?.user?.id || ""); },
  tem(col, id){ return this.lista.some(x=>x.col===col && x.id===id); },
  async carregar(){ this.dono = session?.user?.id || "";
    try{ this.lista = (await idb.get(this.chave())) || []; (await idb.get("fotos:" + this.dono) || []).forEach(p=>fotosPend.add(p)); }catch(e){ this.lista = []; }
    for(const p of fotosPend){ if(assetUrls[p]) continue; try{ const b = await idb.get("foto:" + p); if(b) assetUrls[p] = URL.createObjectURL(b); }catch(e){} }
    syncTag(); },
  async gravar(){ try{ await idb.set(this.chave(), this.lista); await idb.set("fotos:" + this.dono, [...fotosPend]); }catch(e){} syncTag(); },
  async por(item){
    const i = this.lista.findIndex(x=>x.col===item.col && x.id===item.id);
    if(i>=0 && this.lista[i]===this.enviando){ this.lista.push(item); return this.gravar(); } // já está indo para o servidor: entra depois
    if(i>=0){ const ant = this.lista[i];
      if(item.op==="del" && ant.op==="save" && !ant.versao && ant.novo){ this.lista.splice(i,1); return this.gravar(); } // criado e apagado sem internet
      item.versao = ant.versao; if(ant.novo) item.novo = true; this.lista.splice(i,1); }
    this.lista.push(item); return this.gravar(); }
};
function precisaFila(col, id, data){
  if(state.offline || outbox.tem(col, id)) return true;
  return fotosPend.size > 0 && (data.fotos||[]).some(f=>fotosPend.has(f));
}
function filaSalvar(col, id, data, versao){
  const novo = !versao && !state[KEY[col]].some(x=>x.id===id && x._v);
  outbox.por({op:"save", col, id, data, versao, worker:state.worker, ...(novo?{novo:true}:{})});
  const row = {...data, id, _pend:true, ...(versao?{_v:versao}:{})};
  if(state.worker){ row.profissional = state.me; row.lancadoPor = "funcionario"; row.tipo = "auto"; }
  upsertLocal(KEY[col], row); scheduleRender(); syncTag(); agendarSync(4000);
  return id;
}
let syncT = 0; const agendarSync = ms => { clearTimeout(syncT); syncT = setTimeout(sincronizar, ms); };
async function sincronizar(){
  if(outbox.rodando || !session || !perfil || (!outbox.lista.length && !fotosPend.size)) return;
  if(!navigator.onLine){ state.offline = true; syncTag(); return; }
  if(state.sessaoLocal && !(await reconectar())) return;
  outbox.rodando = true; syncTag(); let enviados = 0; const avisos = [], ant = state.offline; state.offline = false;
  try{
    for(const p of [...fotosPend]){
      const b = await idb.get("foto:" + p).catch(()=>null);
      if(b){ const {error} = await sb.storage.from("fotos").upload(p, b, {contentType:b.type || "image/jpeg", upsert:false});
        if(error && !/exist|duplicate/i.test(error.message||"")){ if(ehRede(error)) throw {rede:true}; avisos.push("Uma foto não pôde ser enviada: " + photoErr(error)); } }
      fotosPend.delete(p); await idb.del("foto:" + p).catch(()=>{}); await outbox.gravar();
    }
    while(outbox.lista.length){
      const it = outbox.lista[0]; outbox.enviando = it;
      try{ if(it.op==="del") await removeNet(it.col, it.id); else await saveNet(it.col, it.id, it.data, it.versao); enviados++;
        // editado de novo enquanto enviava: a próxima versão parte da que acabou de ser gravada
        const prox = outbox.lista.find(x=>x!==it && x.col===it.col && x.id===it.id);
        if(prox){ const r = state[KEY[it.col]].find(x=>x.id===it.id); prox.versao = r?._v || prox.versao; delete prox.novo; reaplicarFila(); } }
      catch(e){ if(e && e.rede) throw e;
        const o = it.data ? ` (OS ${it.data.os||"s/n"} de ${fdate(it.data.data||"")})` : "";
        avisos.push((e && e.conflito ? "Alterado em outro aparelho; sua alteração feita sem internet não foi aplicada" : (e && e.message) || "Não foi aceito pelo servidor") + o);
        if(it.op==="save" && !(e && e.conflito)) setList(KEY[it.col], state[KEY[it.col]].filter(x=>!(x.id===it.id && x._pend))); }
      const i = outbox.lista.indexOf(it); if(i>=0) outbox.lista.splice(i,1); await outbox.gravar();
    }
  }catch(e){ state.offline = !!(e && e.rede) || ant; }
  finally{ outbox.rodando = false; outbox.enviando = null; syncTag(); }
  if(avisos.length){ state.avisosSync = avisos; toastAcao(`${avisos.length} item(ns) feitos sem internet precisam de atenção.`, "Ver", ()=>openModal(`<header><h2>Itens não enviados</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header><div class="list">${avisos.map(a=>`<div class="item" style="cursor:default"><span>⚠️</span><span>${esc(a)}</span><span></span></div>`).join("")}</div><footer><span></span><button class="btn" data-act="closeModal">Fechar</button></footer>`)); }
  else if(enviados) toast(`${enviados} lançamento(s) feito(s) sem internet foram enviados.`);
  if(enviados || avisos.length){ snap.agendar(); scheduleRender(); }
}
function syncTag(){
  let t = $("#synctag");
  if(!t){ const sp = document.querySelector(".topbar .spacer"); if(!sp) return; t = document.createElement("button"); t.type = "button"; t.id = "synctag"; t.dataset.act = "sincronizar"; t.hidden = true; sp.after(t); } const n = outbox.lista.length + fotosPend.size;
  t.hidden = !n && !state.offline;
  t.className = "synctag" + (state.offline ? " off" : "");
  t.textContent = state.offline ? (n ? `Sem internet · ${n} a enviar` : "Sem internet") : outbox.rodando ? `Enviando ${n}…` : `${n} a enviar ⟳`;
}
const snap = {
  t: 0, chave: id => "dados:" + id,
  agendar(){ clearTimeout(this.t); this.t = setTimeout(()=>this.gravar(), 1500); },
  async gravar(){ if(!session || !perfil || !state.ready) return;
    try{ await idb.set(this.chave(session.user.id), {em:Date.now(), perfil, cfg:state.cfg, cfgV:state.cfgV, pub:state.pub, perfis:state.perfis, lido:state.lido, listas:Object.fromEntries(COLS.map(c=>[KEY[c], state[KEY[c]]]))}); }catch(e){} },
  async ler(id){ try{ return await idb.get(this.chave(id)); }catch(e){ return null; } },
  aplicar(s){ perfil = s.perfil; state.worker = perfil.papel==="funcionario"; state.me = state.worker ? (perfil.nome||"") : "";
    if(state.worker) state.view = "worker"; else if(state.view==="worker") state.view = "painel";
    state.cfg = deepMerge(DEFAULT_CFG, s.cfg || {}); state.cfgV = s.cfgV || null; state.pub = s.pub || null; state.perfis = s.perfis || []; state.lido = s.lido || "";
    holCache = {}; calcCache = new WeakMap(); Object.entries(s.listas || {}).forEach(([k, v])=>setList(k, v || [])); }
};
// sessão guardada pelo Supabase no aparelho (para abrir sem internet mesmo com o token vencido)
function sessaoGuardada(){ try{ for(let i=0; i<localStorage.length; i++){ const k = localStorage.key(i); if(/^sb-.*-auth-token$/.test(k)){ const v = JSON.parse(localStorage.getItem(k)); const u = v?.user || v?.currentSession?.user; if(u?.id) return {user:u}; } } }catch(e){} return null; }
async function reconectar(){
  try{ const {data} = await sb.auth.getSession(); if(!data.session) return false; session = data.session; state.sessaoLocal = false; return true; }catch(e){ return false; }
}
window.addEventListener("online", async ()=>{ if(!session) return; if(state.sessaoLocal && !(await reconectar())) return; await sincronizar(); if(!state.offline){ state.offline = false; syncTag(); atualizar(); } });
window.addEventListener("offline", ()=>{ state.offline = true; syncTag(); });
window.addEventListener("pagehide", ()=>{ clearTimeout(snap.t); snap.gravar(); });
document.addEventListener("visibilitychange", ()=>{ if(document.hidden){ clearTimeout(snap.t); snap.gravar(); } });
setInterval(()=>{ if(outbox.lista.length || fotosPend.size) sincronizar(); }, 60000);
const removeAp = e => removeDoc("apontamentos", e.id);
async function saveCfg(cfg){
  holCache = {}; calcCache = new WeakMap(); const d = clone(cfg); delete d._v;
  const {data:v, error} = await sb.rpc("salvar_doc", {p_tabela:"config", p_id:"main", p_data:d, p_versao:state.cfgV||null});
  if(error){ const e = dbErr(error); if(e.conflito){ await recarregarDoc("config").catch(()=>{}); e.message = "A configuração foi alterada em outro aparelho. Recarreguei a versão mais nova: refaça sua alteração."; } throw e; }
  state.cfgV = v; snap.agendar();
}
async function loadOwner(){
  const g = state.gen;
  const [cfg, perfis, ...rows] = await Promise.all([sb.from("config").select("data,atualizado_em").eq("id","main").maybeSingle(), sb.from("perfis").select("*").order("criado_em"), ...COLS.map(c=>fetchAll(c))]);
  if(cfg.error) throw cfg.error;
  if(g!==state.gen) return false;
  state.lido = "";
  state.cfg = deepMerge(DEFAULT_CFG, cfg.data?.data || null); state.cfgV = cfg.data?.atualizado_em || null; holCache = {}; calcCache = new WeakMap();
  state.perfis = perfis.data || [];
  COLS.forEach((c,i)=>{ let list = rows[i].map(doRow); if(c==="apontamentos") list = list.filter(e=>!e.excluido); setList(KEY[c], list); });
  return true;
}
// atualização incremental: só o que mudou desde a última leitura
async function loadOwnerInc(){
  if(!state.lido) return loadOwner();
  const g = state.gen, desde = state.lido;
  const [cfg, perfis, exc, ...rows] = await Promise.all([sb.from("config").select("data,atualizado_em").eq("id","main").maybeSingle(), sb.from("perfis").select("*").order("criado_em"), sb.rpc("excluidos_desde", {p_desde:desde}), ...COLS.map(c=>fetchAll(c, desde))]);
  if(cfg.error) throw cfg.error; if(exc.error) throw exc.error;
  if(g!==state.gen) return false;
  if(cfg.data && cfg.data.atualizado_em !== state.cfgV && !state.cfgDirty){ state.cfg = deepMerge(DEFAULT_CFG, cfg.data.data); state.cfgV = cfg.data.atualizado_em; holCache = {}; calcCache = new WeakMap(); }
  state.perfis = perfis.data || state.perfis;
  COLS.forEach((c,i)=>{ if(!rows[i].length) return; const k = KEY[c], novos = rows[i].map(doRow), ids = new Set(novos.map(x=>x.id));
    setList(k, [...state[k].filter(x=>!ids.has(x.id)), ...novos.filter(x=>!(c==="apontamentos" && x.excluido))]); });
  (exc.data||[]).forEach(x=>{ const k = KEY[x.tabela]; if(k) setList(k, state[k].filter(y=>y.id!==x.registro_id)); });
  if(outbox.lista.length) reaplicarFila();
  return true;
}
async function loadWorker(){
  const g = state.gen;
  const [pc, os] = await Promise.all([sb.rpc("pub_config"), sb.rpc("minhas_os")]);
  if(pc.error) throw pc.error; if(os.error) throw os.error;
  if(g!==state.gen) return false;
  state.pub = pc.data || {}; state.cfg = deepMerge(DEFAULT_CFG, state.pub.cfg || {}); holCache = {}; calcCache = new WeakMap();
  setList("ap", (os.data||[]).map(r=>({id:r.id, ...r.data})));
  if(outbox.lista.length) reaplicarFila();
  return true;
}
async function carregar(){
  if(!session || !perfil) return;
  if(perfil.papel==="funcionario") await loadWorker(); else if(perfil.papel==="dono") await loadOwner();
  if(outbox.lista.length) reaplicarFila();
}
async function boot(){
  state.ready = false; render();
  await outbox.carregar();
  try{
    if(state.sessaoLocal) throw {rede:true};
    const {data, error} = await sb.from("perfis").select("*").eq("user_id", session.user.id).maybeSingle();
    if(error) throw error;
    perfil = data;
    state.worker = perfil?.papel==="funcionario"; state.me = state.worker ? (perfil.nome||"") : "";
    if(state.worker) state.view = "worker"; else if(state.view==="worker") state.view = "painel";
    if(outbox.lista.length || fotosPend.size) await sincronizar();
    await carregar(); state.offline = false;
    pushEstado().catch(()=>{});
  }catch(err){
    const s = (err && err.rede) || ehRede(err) ? await snap.ler(session.user.id) : null;
    if(s && s.perfil){ snap.aplicar(s); state.offline = true; reaplicarFila(); toast("Sem internet: mostrando os dados salvos neste aparelho. O que você lançar será enviado quando a conexão voltar."); }
    else toast("Não consegui carregar os dados. Verifique a conexão e recarregue a página.");
  }
  state.ready = true; render(); syncTag(); snap.agendar();
}
// itens ainda na fila aparecem na tela mesmo depois de recarregar os dados
function reaplicarFila(){ outbox.lista.forEach(it=>{ const k = KEY[it.col]; if(!k) return; if(it.op==="del") setList(k, state[k].filter(x=>x.id!==it.id)); else upsertLocal(k, {...it.data, id:it.id, _pend:true, ...(it.versao?{_v:it.versao}:{})}); }); }
async function initStore(){
  let r = null; try{ r = await sb.auth.getSession(); }catch(e){} session = r?.data?.session || null;
  if(!session && !navigator.onLine){ const s = sessaoGuardada(); if(s){ session = s; state.sessaoLocal = true; } }
  sb.auth.onAuthStateChange((ev, s)=>{
    const tinha = !!session; session = s;
    if(ev==="PASSWORD_RECOVERY"){ state.auth = "nova-senha"; state.ready = true; render(); return; }
    if(ev==="SIGNED_OUT"){ perfil = null; Object.assign(state, {worker:false, me:"", ap:[], orc:[], rec:[], fech:[], desp:[], pag:[], eq:[], docs:[], perfis:[], pub:null, view:"painel", auth:"entrar"}); render(); return; }
    if(ev==="SIGNED_IN" && !tinha) boot();
  });
  if(!session){ state.ready = true; render(); return; }
  await boot();
}
/* atualiza sozinho: ao voltar para a aba e a cada 2 minutos */
let recarregando = false;
async function atualizar(){
  if(document.hidden || recarregando || !session || !perfil || !state.ready || !$("#modal").hidden || ["orcEdit","ajustes"].includes(state.view)) return;
  recarregando = true;
  if(outbox.lista.length || fotosPend.size){ await sincronizar(); if(state.offline || outbox.lista.length){ recarregando = false; return; } }
  try{ const ok = perfil.papel==="dono" ? await loadOwnerInc() : perfil.papel==="funcionario" ? await loadWorker() : false; if(ok){ if(state.offline){ state.offline = false; syncTag(); } scheduleRender(); } else if(ok===false) setTimeout(atualizar, 3000); }
  catch(e){} finally{ recarregando = false; }
}
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) atualizar(); });
setInterval(atualizar, 300000);
setInterval(async ()=>{ if(document.hidden || !session || perfil?.papel!=="dono" || !state.ready || state.view!=="painel" || !$("#modal").hidden || document.activeElement?.closest?.(".aprovbox")) return;
  try{ const {data} = await sb.from("perfis").select("*").order("criado_em"); if(!data) return;
    const pend = l => l.filter(p=>p.papel==="pendente").map(p=>p.user_id).sort().join();
    if(pend(data)!==pend(state.perfis)){ state.perfis = data; state.rendered = null; render(); } }catch(e){} }, 60000);
/* fotos no Storage privado: o id é o caminho do arquivo */
const assets = {
  async upload(blob, {type}){
    const path = `${session.user.id}/${uid()}.${type==="image/png"?"png":type==="image/webp"?"webp":type==="image/gif"?"gif":"jpg"}`;
    let error = null;
    if(state.offline || !navigator.onLine) error = {message:"offline"}; else try{ ({error} = await sb.storage.from("fotos").upload(path, blob, {contentType:type, upsert:false})); }catch(e){ error = e; }
    if(error && (state.offline || ehRede(error) || error.message==="offline")){ // guarda no aparelho e envia depois
      await idb.set("foto:" + path, blob); fotosPend.add(path); await outbox.gravar(); assetUrls[path] = URL.createObjectURL(blob); agendarSync(5000);
      return {id:path, url:assetUrls[path]}; }
    if(error) throw {code:/size/i.test(error.message)?"too_large":/mime|type/i.test(error.message)?"unsupported_type":"upstream_error", message:error.message};
    await assinarFotos([path]);
    return {id:path, url:assetUrls[path]};
  },
  async delete(id){ await sb.storage.from("fotos").remove([id]); return {deleted:true}; }
};
async function assinarFotos(ids){
  const falta = [...new Set(ids)].filter(id=>id && !assetUrls[id]); if(!falta.length) return;
  const {data} = await sb.storage.from("fotos").createSignedUrls(falta, 60*60*6);
  (data||[]).forEach(d=>{ if(d.signedUrl) assetUrls[d.path] = d.signedUrl; });
}
let fotoT = 0;
new MutationObserver(()=>{ clearTimeout(fotoT); fotoT = setTimeout(async ()=>{
  const imgs = [...document.querySelectorAll("img[data-fid]")].filter(i=>!i.dataset.ok);
  if(!imgs.length) return;
  await assinarFotos(imgs.map(i=>i.dataset.fid));
  imgs.forEach(i=>{ const u = assetUrls[i.dataset.fid]; if(u){ i.src = u; i.dataset.ok = "1"; } });
}, 60); }).observe(document.body, {childList:true, subtree:true});
let rq = 0;
function scheduleRender(){ if(!$("#modal").hidden){ state.renderPend = true; return; } cancelAnimationFrame(rq); rq = requestAnimationFrame(()=>{ if(!state.ready) return; if(["orcEdit","ajustes"].includes(state.view) && state.rendered===state.view) return; if(state.rendered==="login" && $("#loginForm")) return; render(); }); }
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
  const fn = state.worker ? (state.view==="ajuda" ? vAjuda : vWorker) : ({painel:vPainel, horas:vHoras, relatorios:vRelatorios, orcamentos:vOrcamentos, orcEdit:vOrcEdit, financeiro:vFinanceiro, ajustes:vAjustes, mais:vMais, ajuda:vAjuda, escala:vEscala, atividade:vAtividade, equipe:vEquipe, equipamentos:vEquipamentos}[state.view] || vPainel);
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
const eqList = () => (state.worker ? (state.pub?.equipamentos||[]) : state.eq.filter(x=>!x.inativo)).slice().sort((a,b)=>(a.tag||"").localeCompare(b.tag||""));
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
const TIPO_FOTO = {antes:"ANTES", durante:"", depois:"DEPOIS"};
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
        if(state.cfg.carimbo!==false) stamp = [TIPO_FOTO[ctx.tipo]||"", ctx.os?`OS ${ctx.os}`:"", ctx.unid||"", dt].filter(Boolean).join(" · "); }
      const b = await compressImage(f, stamp); const r = await assets.upload(b, {type: ok.includes(b.type) ? b.type : "image/jpeg"}); assetUrls[r.id] = r.url; ids.push(r.id); if(ctx) (state.fotoMetaNovo ||= {})[r.id] = {tipo:ctx.tipo||"durante", em: em ? em.toISOString() : ""}; }
    catch(err){ toast(photoErr(err)); break; }
  }
  if(ids.length) toast(`${ids.length} foto${ids.length>1?"s":""} adicionada${ids.length>1?"s":""}`);
  return ids;
}
function deleteAssetIfUnused(id, except=[]){ if(!assets || !id) return; if(state.ap.some(e=>!except.includes(e.id) && (e.fotos||[]).includes(id))) return; assets.delete(id).catch(()=>{}); }
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
function apItem(e, showDate, bad){
  const c = calc(e), lk = lockedE(e), nf = (e.fotos||[]).length;
  return `<button class="item" data-act="editAp" data-id="${esc(e.id)}">
    <span class="t">${showDate?`${fdate(e.data).slice(0,5)}<br>`:""}${esc(e.inicio)}–${e.andamento?"…":esc(e.fim)}</span>
    <span class="main"><b>${e.os?`OS ${esc(e.os)}`:"Sem nº de OS"}${e.andamento?' <span class="pill info">Em andamento</span>':""}${e.emergencia?' <span class="pill warn">Emergência</span>':""}${e.exemplo?' <span class="pill">Exemplo</span>':""}${e._pend?' <span class="pill warn" title="Será enviado quando a internet voltar">⏳ a enviar</span>':""}${e.geo && !state.worker?` <span class="pill" role="link" data-act="abrirMapa" data-lat="${esc(e.geo.lat)}" data-lng="${esc(e.geo.lng)}" title="Onde estava ao iniciar (precisão ${e.geo.acc||"?"} m)">📍 local</span>`:""}</b>
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
function osSugestoes(used){ const m = osLista(); m.forEach((v,k)=>{ if(!(k in used)) used[k] = [v.desc, v.unid].filter(Boolean).join(" · "); }); return used; }
// escolheu uma OS da lista: completa serviço e unidade (se estiverem vazios)
function osPreencher(os, descEl, unidEl){ const x = osLista().get(String(os||"").trim()); if(!x) return false;
  if(descEl && !descEl.value.trim() && x.desc){ descEl.value = x.desc; descEl.dispatchEvent(new Event("input", {bubbles:true})); }
  if(unidEl && !unidEl.value && x.unid){ unidValor(unidEl, x.unid); unidEl.dispatchEvent(new Event("input", {bubbles:true})); }
  return true; }
document.addEventListener("change", e=>{ const t = e.target, os = (t.value||"").trim(); if(!os) return;
  if(t.id==="f-os") osPreencher(os, $("#f-desc"), $("#f-cli"));
  else if(t.id==="cr-os") osPreencher(os, $("#cr-desc"), $("#cr-unid"));
  else if(t.dataset && t.dataset.f==="os" && t.closest(".dayrow")){ const row = t.closest(".dayrow"); osPreencher(os, row.querySelector('[data-f="desc"]'), row.querySelector('[data-f="cli"]')); }
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
/* ---------- LOGIN ---------- */
const sessOk = () => !!session && !!perfil && ["dono","funcionario"].includes(perfil.papel);
const AUTH_ERR = {"Invalid login credentials":"E-mail ou senha incorretos.", "Email not confirmed":"Confirme seu e-mail antes de entrar. Procure a mensagem na sua caixa de entrada (e no spam).", "User already registered":"Esse e-mail já tem conta. Use “Entrar”.", "Password should be at least 6 characters.":"A senha precisa ter pelo menos 6 caracteres."};
const authMsg = e => AUTH_ERR[e?.message] || (/rate limit/i.test(e?.message||"") ? "Muitas tentativas. Aguarde alguns minutos." : e?.message ? `Não foi possível: ${e.message}` : "Não foi possível. Verifique a conexão.");
function vLogin(){
  const marca = `<div class="lg-brand"><img src="${LOGO}" alt="Logo GAAP Engenharia"><div><b>GAAP ENGENHARIA</b><span>Ordens de serviço, horas e orçamentos</span></div></div>`;
  const card = body => `<div class="lg-wrap"><div class="lg-card">${marca}${body}<p class="lg-err" id="lg-err" role="alert"></p></div></div>`;
  if(session && perfil && !sessOk()){
    return card(perfil.papel==="bloqueado"
      ? `<h1>Acesso bloqueado</h1><p class="muted">Seu acesso foi bloqueado pelo responsável.</p><button class="btn" data-act="sair">Sair</button>`
      : `<h1>Aguardando liberação</h1><p class="muted">Sua conta (${esc(perfil.email)}) foi criada. Agora o responsável precisa liberar o seu acesso e escolher o seu nome na equipe. Depois disso, toque em “Verificar de novo”.</p><div class="row"><button class="btn primary" data-act="reverificar">Verificar de novo</button><button class="btn" data-act="sair">Sair</button></div>`);
  }
  if(session && !perfil) return card(`<h1>Não consegui abrir sua conta</h1><p class="muted">Verifique a conexão e tente de novo.</p><div class="row"><button class="btn primary" data-act="reverificar">Tentar de novo</button><button class="btn" data-act="sair">Sair</button></div>`);
  const m = state.auth;
  const campo = (id, label, type, extra="") => `<label class="field"><span>${label}</span><input id="${id}" type="${type}" ${extra} required></label>`;
  if(m==="criar") return card(`<h1>Criar conta</h1><p class="muted">Depois de criar, confirme pelo link que chega no seu e-mail.</p>
    <form id="loginForm" class="form" data-modo="criar">${campo("lg-email","E-mail","email",'autocomplete="email" inputmode="email"')}${campo("lg-senha","Senha (mínimo 6 caracteres)","password",'autocomplete="new-password" minlength="6"')}
    <button class="btn primary lg-go" type="submit">Criar conta</button></form><button class="btn lg-link" data-act="authModo" data-m="entrar">Já tenho conta</button>`);
  if(m==="recuperar") return card(`<h1>Esqueci a senha</h1><p class="muted">Informe seu e-mail e enviaremos um link para criar uma senha nova.</p>
    <form id="loginForm" class="form" data-modo="recuperar">${campo("lg-email","E-mail","email",'autocomplete="email" inputmode="email"')}<button class="btn primary lg-go" type="submit">Enviar link</button></form>
    <button class="btn lg-link" data-act="authModo" data-m="entrar">Voltar</button>`);
  if(m==="nova-senha") return card(`<h1>Nova senha</h1><form id="loginForm" class="form" data-modo="nova-senha">${campo("lg-senha","Nova senha (mínimo 6 caracteres)","password",'autocomplete="new-password" minlength="6"')}<button class="btn primary lg-go" type="submit">Salvar senha</button></form>`);
  if(m==="enviado") return card(`<h1>Confira seu e-mail</h1><p class="muted">${esc(state.authInfo||"")}</p><button class="btn primary lg-go" data-act="authModo" data-m="entrar">Ir para o login</button>`);
  return card(`<h1>Entrar</h1>
    <form id="loginForm" class="form" data-modo="entrar">${campo("lg-email","E-mail","email",'autocomplete="email" inputmode="email"')}${campo("lg-senha","Senha","password",'autocomplete="current-password"')}
    <button class="btn primary lg-go" type="submit">Entrar</button></form>
    <div class="row" style="justify-content:space-between"><button class="btn lg-link" data-act="authModo" data-m="criar">Criar conta</button><button class="btn lg-link" data-act="authModo" data-m="recuperar">Esqueci a senha</button></div>`);
}
async function submitLogin(form){
  const modo = form.dataset.modo, err = $("#lg-err"), btn = form.querySelector('[type="submit"]');
  const email = ($("#lg-email")?.value||"").trim().toLowerCase(), senha = $("#lg-senha")?.value || "";
  btn.disabled = true; err.textContent = "";
  try{
    if(modo==="entrar"){ const {error} = await sb.auth.signInWithPassword({email, password:senha}); if(error) throw error; }
    else if(modo==="criar"){ const {data, error} = await sb.auth.signUp({email, password:senha, options:{emailRedirectTo: location.origin}}); if(error) throw error;
      if(!data.session){ state.auth = "enviado"; state.authInfo = `Enviamos um link de confirmação para ${email}. Abra o e-mail, toque no link e depois entre com seu e-mail e senha.`; render(); } }
    else if(modo==="recuperar"){ const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo: location.origin}); if(error) throw error; state.auth = "enviado"; state.authInfo = `Se existir uma conta com ${email}, enviamos um link para criar uma senha nova.`; render(); }
    else if(modo==="nova-senha"){ const {error} = await sb.auth.updateUser({password:senha}); if(error) throw error; state.auth = "entrar"; toast("Senha alterada."); if(session) await boot(); else render(); }
  }catch(e){ err.textContent = authMsg(e); btn.disabled = false; }
}
/* ---------- FUNCIONÁRIO ---------- */
function vWorker(){
  const me = state.me, ps = profs();
  if(!state.pub || !state.pub.cfg) return `<div class="pagehead"><div><span class="eyebrow">Acesso do funcionário</span><h1>Aguardando liberação</h1><p class="muted">Não consegui carregar a configuração. Verifique a conexão e toque em Atualizar.</p><button class="btn primary" data-act="reverificar">Atualizar</button><p></p></div></div>`;
  const mine = state.ap.filter(e=>e.profissional===me), list = mine.filter(e=>ym(e.data)===state.month).sort((a,b)=>(b.data+b.inicio).localeCompare(a.data+a.inicio));
  const c = sumCalc(list), byDay = {}; list.forEach(e=>(byDay[e.data] ||= []).push(e));
  return `<div class="pagehead"><div><span class="eyebrow">Olá, ${esc(me)}</span><h1>Minhas OS</h1><p class="muted">Lance cada OS com o horário de início e de término.</p></div>
    <div class="row">${monthNav()}<button class="btn" data-act="cronoNovo">▶ Iniciar OS agora</button><button class="btn primary" data-act="newDay">+ Lançar OS do dia</button></div></div>
  ${escalaHoje()}
  ${confHtml(conferencia(ymd(addDays(parseYmd(today()),-7)), today(), me), "Faltou lançar?", 5)}
  <p style="margin:0 0 12px"><button class="btn sm" data-act="nav" data-view="ajuda">📖 Como usar o app</button></p>
  <div class="summary"><span><b>${list.length}</b> OS</span><span><i class="dot d-n"></i>Normal <b>${fdec(c.n)} h</b></span><span><i class="dot d-50"></i>Extra ${pct50()} <b>${fdec(c.e50)} h</b></span><span><i class="dot d-100"></i>Extra ${pct100()} <b>${fdec(c.e100)} h</b></span><span>Total <b>${fdec(c.total)} h</b></span></div>
  ${list.length ? `<div class="list">${Object.keys(byDay).sort().reverse().map(d=>`<div class="dayhead"><span>${WD[parseYmd(d).getDay()]}, ${fdate(d)}</span><span class="mono">${fdec(sumCalc(byDay[d]).total)} h</span></div>${byDay[d].sort((a,b)=>a.inicio.localeCompare(b.inicio)).map(e=>apItem(e,false,overlaps(byDay[d]))).join("")}`).join("")}</div>`
    : `<div class="empty"><b>Nenhuma OS em ${ymLabel(state.month)}</b>Toque em “Lançar OS do dia” para registrar suas ordens de serviço.</div>`}
  <div style="margin-top:16px">${instalarHtml()}${lembretesHtml()}</div>
  <p class="muted" style="margin-top:16px">Você está lançando como <b>${esc(me)}</b>. <button class="btn sm" data-act="sair">Sair</button></p>`;
}
/* ---------- MAIS ---------- */
function vMais(){
  const card = (view, t, d, act) => `<button class="maiscard" data-act="${act||"nav"}" ${view?`data-view="${view}"`:""}><b>${t}</b><span class="muted">${d}</span></button>`;
  return `<div class="pagehead"><div><span class="eyebrow">Mais</span><h1>Ferramentas</h1></div></div>
  ${instalarHtml()}
  <div class="maisgrid">
    ${card("equipe","Equipe: acerto e pagamentos","Quanto pagar a cada técnico, vales, recibos")}
    ${card("equipe","Documentos e validades","ASO, NR-10, NR-35, integração, certidões")}
    ${card("equipamentos","Equipamentos e preventivas","Histórico por máquina e plano de preventivas")}
    ${card("ajuda","📖 Como usar","Passo a passo de cada parte do sistema")}
    ${card("escala","Escala da semana","Quem vai para qual unidade em cada dia")}
    ${card("atividade","Quem fez o quê","Tudo o que foi criado, alterado ou excluído, e por quem")}
    ${card("financeiro","Fechamentos e PDF do fiscal","Abril a setembro e os próximos: PDF e Excel no modelo da Brejeiro")}
    ${card("","Pacote do contador","Planilha do mês e comprovantes", "pacoteContador")}
    ${card("ajustes","Ajustes","Valores, jornada, contratantes, equipe, backup")}
  </div>`;
}
/* ---------- COMO USAR ---------- */
function vAjuda(){
  const T = (t, passos) => `<details class="panel ajuda"><summary><b>${t}</b></summary><ol>${passos.map(p=>`<li>${p}</li>`).join("")}</ol></details>`;
  const func = [
    T("Instalar o app no celular", ["<b>iPhone:</b> abra o endereço no Safari → Compartilhar (quadrado com seta) → <b>Adicionar à Tela de Início</b>.", "<b>Android:</b> no Chrome, toque nos ⋮ → <b>Instalar app</b> (ou use o botão Instalar app, quando aparecer).", "Abra sempre pelo ícone: fica em tela cheia e funciona sem internet."]),
    T("Iniciar uma OS na hora (cronômetro)", ["Toque em <b>▶ Iniciar OS agora</b>.", "Escolha a OS na lista (o serviço e a unidade se preenchem sozinhos) e toque em Iniciar.", "Ao terminar, toque em <b>Encerrar</b> na faixa do topo (toque duas vezes para confirmar).", "Esqueceu de encerrar? Encerre informando a hora real em que terminou."]),
    T("Lançar as OS do dia de uma vez", ["Toque em <b>+ Lançar OS do dia</b>.", "Confira a data, a empresa e a unidade de cima (vale para todas as linhas).", "Em cada linha: nº da OS, início, término e o serviço. Use <b>+ Linha</b> para mais OS.", "Fotos: toque em <b>Antes</b>, <b>Durante</b> ou <b>Depois</b> em cada linha.", "Trabalhou no horário do almoço? Marque “Trabalhei no almoço”.", "Toque em <b>Salvar</b>. Se sair sem salvar, o app guarda um rascunho."]),
    T("Fotos", ["Tire a foto pelo app: ela sai com data, hora, OS e unidade carimbadas.", "Marque se é <b>antes</b>, <b>durante</b> ou <b>depois</b> do serviço."]),
    T("Sem internet", ["Pode lançar normalmente: aparece “a enviar” no topo.", "Quando a internet voltar, tudo é enviado sozinho. Não saia da conta com itens a enviar."]),
    T("Emergência", ["Marque <b>Chamado de emergência</b> e informe quem acionou, a hora e o motivo.", "Isso aparece no relatório para o fiscal."]),
    T("Sua escala e lembretes", ["A escala da semana aparece em <b>Sua escala</b>.", "Ative os lembretes no celular para ser avisado quando faltar lançar OS."])
  ];
  const dono = state.worker ? [] : [
    T("Liberar quem criou conta", ["Quando alguém pede cadastro aparece uma <b>faixa vermelha</b> no Painel.", "Confira o nome e toque em <b>Aprovar como funcionário</b> (ou responsável, que vê tudo)."]),
    T("Fechar a medição (todo dia 20)", ["No dia 20 aparece <b>Fechar medição</b> em “Para fazer hoje”.", "Confira as pendências mostradas (dias sem lançamento, OS sem número, cronômetro aberto).", "Toque em Fechar: o PDF no modelo do fiscal da Brejeiro abre para conferir.", "Na prévia toque em <b>Enviar</b> (WhatsApp, e-mail) ou <b>Baixar</b>. Também há o Excel."]),
    T("Conferir a planilha que a Brejeiro devolve", ["Financeiro → no fechamento, toque em <b>Conferir planilha deles</b>.", "Escolha o Excel ou PDF que eles mandaram.", "O app mostra “Tudo confere” ou a OS e o valor que diverge."]),
    T("Pedir aprovação do cliente", ["No fechamento toque em <b>Pedir aprovação</b>: abre o WhatsApp do aprovador com o link.", "Ele aprova ou contesta OS por OS; a resposta aparece no fechamento."]),
    T("Receber e nota fiscal", ["Ao receber, toque em <b>Receber</b> no fechamento e informe valor e retenções.", "Em <b>Nota fiscal</b> está o texto pronto para a NFS-e (competência, pedido, código do serviço e ISS).", "A <b>Previsão de recebimentos</b> no Financeiro mostra o que entra em cada semana."]),
    T("Relatórios e PDFs", ["Relatórios → escolha o período → <b>Baixar PDF</b> ou <b>Excel</b>.", "“Fechamentos deste período” mostra os PDFs do fiscal de cada mês.", "Todo PDF abre numa prévia antes de enviar."]),
    T("Lista de OS e unidades da Brejeiro", ["Ajustes → <b>Empresas e unidades</b> → Brejeiro.", "Cole a lista de OS (uma por linha: número;serviço;unidade) e as unidades.", "Para outra empresa: <b>+ Nova empresa</b>."]),
    T("Valores, reajuste e adicional noturno", ["Ajustes → <b>Valores</b>: valor da hora por empresa, extra, domingo/feriado e adicional noturno.", "<b>Reajustar</b>: novo valor com data de início (sugere pelo IPCA) e carta em PDF."]),
    T("Equipe: escala, acerto e documentos", ["Mais → <b>Escala da semana</b>: unidade de cada um por dia.", "Mais → <b>Equipe</b>: quanto pagar a cada um, vales e recibo; documentos com validade (ASO, NR).", "Mais → <b>Quem fez o quê</b>: todas as alterações e quem fez."]),
    T("Backup", ["Ajustes → <b>Backup e lixeira</b> → Backup completo (dados + fotos). Faça toda semana e guarde no Drive.", "O servidor também faz uma cópia automática todo dia.", "Excluiu algo sem querer? Ajustes → Backup e lixeira → <b>Restaurar</b>."])
  ];
  return `<div class="pagehead"><div><span class="eyebrow">Ajuda</span><h1>Como usar</h1><p class="muted">Toque em um assunto para ver o passo a passo.</p></div><button class="btn" data-act="nav" data-view="${state.worker?"worker":"mais"}">‹ Voltar</button></div>
  ${state.worker?"":`<h2 style="margin:6px 0 8px">No campo (técnicos)</h2>`}${func.join("")}
  ${dono.length?`<h2 style="margin:16px 0 8px">Responsável</h2>${dono.join("")}`:""}
  <p class="muted" style="margin-top:14px">Versão do app: ${VERSAO}</p>`;
}
/* ---------- ESCALA da semana ---------- */
function semanaDe(d){ const t = parseYmd(d); return ymd(addDays(t, -((t.getDay()+6)%7))); }
function vEscala(){
  const ini = state.escIni ||= semanaDe(today()), dias = Array.from({length:7}, (_,i)=>ymd(addDays(parseYmd(ini), i))), E = state.cfg.escala || {}, ps = profs();
  const us = [...new Set([...unidsEmp(state.cfg.contratante||""), ...dimVals("unid")])];
  return `<div class="pagehead"><div><span class="eyebrow">Equipe</span><h1>Escala da semana</h1><p class="muted">Escolha a unidade de cada funcionário em cada dia. O funcionário vê a escala dele no app.</p></div><button class="btn" data-act="nav" data-view="mais">‹ Mais</button></div>
  <div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="escSem" data-d="-7">‹ Semana anterior</button><b>${fdate(dias[0])} a ${fdate(dias[6])}</b><button class="btn sm" data-act="escSem" data-d="7">Próxima ›</button></div>
  ${ps.length ? `<div class="esc-dias">${dias.map(d=>`<section class="panel esc-dia ${d===today()?"hoje":""}"><h3>${WD[parseYmd(d).getDay()]} ${fdate(d).slice(0,5)}</h3>${ps.map(n=>`<label class="field"><span>${esc(n)}</span><select data-esc-d="${d}" data-esc-p="${esc(n)}"><option value="">—</option>${[...new Set([...us, (E[d]||{})[n]].filter(Boolean))].map(u=>`<option ${(E[d]||{})[n]===u?"selected":""}>${esc(u)}</option>`).join("")}<option value="Folga" ${(E[d]||{})[n]==="Folga"?"selected":""}>Folga</option></select></label>`).join("")}</section>`).join("")}</div>
  <div class="row" style="margin-top:12px"><button class="btn primary" data-act="escSalvar">Salvar escala</button><button class="btn" data-act="escCopiar">Copiar da semana anterior</button></div>`
  : `<div class="empty"><b>Nenhum funcionário cadastrado</b>Cadastre em Ajustes → Empresas e unidades.</div>`}`;
}
function escalaHoje(){ const E = state.worker ? (state.pub?.escala||{}) : (state.cfg.escala||{}), d = today();
  if(state.worker){ const prox = Object.keys(E).filter(k=>k>=d).sort().slice(0,7); return prox.length ? `<section class="panel" style="margin-bottom:12px"><h3 style="margin:0 0 6px">Sua escala</h3>${prox.map(k=>`<div class="row" style="justify-content:space-between"><span>${WD[parseYmd(k).getDay()]} ${fdate(k).slice(0,5)}${k===d?" (hoje)":""}</span><b>${esc(E[k])}</b></div>`).join("")}</section>` : ""; }
  const h = E[d] || {}, it = Object.entries(h).filter(([,u])=>u); return it.length ? `<section class="panel" style="margin-bottom:12px"><h3 style="margin:0 0 6px">Escala de hoje</h3>${it.map(([n,u])=>`<div class="row" style="justify-content:space-between"><span>${esc(n)}</span><b>${esc(u)}</b></div>`).join("")}<button class="btn sm" data-act="nav" data-view="escala" style="margin-top:6px">Ver semana</button></section>` : ""; }
/* ---------- QUEM FEZ O QUÊ ---------- */
const ACAO_TXT = {insert:"criou", update:"alterou", delete:"excluiu", excluido:"excluiu", restaurado:"restaurou"};
function vAtividade(){
  const l = state.ativ, q = state.ativQ || "";
  if(!l){ sb.rpc("atividade_recente", {p_dias:30}).then(({data, error})=>{ state.ativ = error ? [] : (data||[]); if(error) toast("Não consegui carregar a atividade."); if(state.view==="atividade"){ state.rendered = null; render(); } }); }
  const pessoas = [...new Set((l||[]).map(x=>x.quem_nome).filter(Boolean))].sort(), vis = (l||[]).filter(x=>!q || x.quem_nome===q);
  const desc = x => { const d = x.depois || x.antes || {}; return x.tabela==="apontamentos" ? `OS ${d.os||"s/n"} · ${fdate(d.data||"")} ${d.inicio||""}–${d.fim||""}${d.profissional?` · ${d.profissional}`:""}` : x.tabela==="config" ? "Ajustes" : x.tabela==="fechamentos" ? `Fechamento ${d.numero||""}` : x.tabela==="recebimentos" ? `Recebimento ${brl(numIn(d.valor))}` : x.tabela==="orcamentos" ? `Orçamento ${d.numero||""} ${d.titulo||""}` : `${TAB_LABEL[x.tabela]||x.tabela}`; };
  return `<div class="pagehead"><div><span class="eyebrow">Segurança</span><h1>Quem fez o quê</h1><p class="muted">Últimos 30 dias: tudo o que foi criado, alterado ou excluído.</p></div><button class="btn" data-act="nav" data-view="mais">‹ Mais</button></div>
  <div class="panel" style="margin-bottom:10px"><label class="field"><span>Pessoa</span><select id="ativ-q"><option value="">Todas</option>${pessoas.map(n=>`<option ${q===n?"selected":""}>${esc(n)}</option>`).join("")}</select></label></div>
  ${!l ? `<div class="loading">Carregando…</div>` : vis.length ? `<div class="list">${vis.map(x=>`<div class="item" style="cursor:default"><span class="mono">${new Date(x.quando).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</span><span><b>${esc(x.quem_nome||"sistema")}</b> ${ACAO_TXT[x.acao]||esc(x.acao)}<br><small class="muted">${esc(desc(x))}</small></span><span></span></div>`).join("")}</div>` : `<div class="empty"><b>Nada registrado no período</b></div>`}`;
}
document.addEventListener("change", e=>{ if(e.target.id==="ativ-q"){ state.ativQ = e.target.value; state.rendered = null; render(); } });
/* ---------- PREVISÃO de recebimentos ---------- */
function previsaoHtml(){
  const hoje = today(), fim = ymd(addDays(parseYmd(hoje), 60)), itens = [];
  state.fech.forEach(f=>{ const sd = fechSaldo(f); if(sd>0.005) itens.push({d:fechVenc(f), v:sd, t:`${f.numero}${f.empresa?` · ${f.empresa}`:""}`}); });
  empresasCfg().forEach(emp=>{ const m = medicao(emp, 0); if(!m) return; const ab = state.ap.filter(e=>!e.andamento && !e.orcId && !lockedE(e) && chaveEmp(empOf(e))===chaveEmp(emp)), v = sumCalc(ab).valor;
    const pz = ficha(emp).prazo; if(v>0) itens.push({d:ymd(addDays(parseYmd(m[1]), pz==null||pz===""?30:+pz)), v, t:`Medição ${emp} em aberto (fecha ${fdate(m[1]).slice(0,5)})`, est:true}); });
  const orc = state.orc.filter(orcAberto).reduce((s,o)=>s+Math.max(0, orcTotals(o).total-orcRecebido(o.id)),0);
  const venc = itens.filter(x=>x.d<hoje), prox = itens.filter(x=>x.d>=hoje && x.d<=fim).sort((a,b)=>a.d.localeCompare(b.d));
  if(!itens.length && !orc) return "";
  const sem = {}; prox.forEach(x=>{ const k = semanaDe(x.d); (sem[k] ||= []).push(x); }); const max = Math.max(1, ...Object.values(sem).map(l=>l.reduce((s,x)=>s+x.v,0)));
  return `<section class="section"><header><h2>Previsão de recebimentos (60 dias)</h2><span class="mono muted">${brl(prox.reduce((s,x)=>s+x.v,0))}</span></header>
  ${venc.length?`<div class="warnbox">Vencido e ainda não recebido: <b>${brl(venc.reduce((s,x)=>s+x.v,0))}</b> (${venc.map(x=>esc(x.t)).join(", ")})</div>`:""}
  <div class="list">${Object.entries(sem).map(([k,l])=>{ const tot = l.reduce((s,x)=>s+x.v,0); return `<div class="item" style="cursor:default;display:block"><div class="row" style="justify-content:space-between"><b>Semana de ${fdate(k).slice(0,5)}</b><b class="mono">${brl(tot)}</b></div><div class="prevbar"><i style="width:${Math.round(100*tot/max)}%"></i></div>${l.map(x=>`<small class="muted">${fdate(x.d).slice(0,5)} · ${esc(x.t)} · ${brl(x.v)}${x.est?" (estimado)":""}</small>`).join("<br>")}</div>`; }).join("") || `<p class="muted">Nada previsto nos próximos 60 dias.</p>`}</div>
  ${orc>0.005?`<p class="muted" style="margin:6px 0 0">Orçamentos aprovados ainda a receber (sem data): <b>${brl(orc)}</b></p>`:""}</section>`;
}
/* ---------- CONFERÊNCIA com a planilha que a contratante devolve ---------- */
async function lerPlanilhaFiscal(file){
  const nums = a => a.map(x=>typeof x==="number" ? x : parseFloat(String(x).replace(/R\$|\s/g,"").replace(/\./g,"").replace(",","."))).filter(x=>isFinite(x));
  const linhas = [];
  if(/\.pdf$/i.test(file.name) || file.type==="application/pdf"){
    const lib = await pdfjs(), doc = await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    for(let n=1; n<=doc.numPages; n++){ const tc = await (await doc.getPage(n)).getTextContent(), rows = {};
      tc.items.forEach(it=>{ const y = Math.round(it.transform[5]/3); (rows[y] ||= []).push([it.transform[4], it.str]); });
      Object.keys(rows).sort((a,b)=>b-a).forEach(y=>linhas.push(rows[y].sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join(" ").replace(/\s+/g," ").trim())); }
    return linhas.map(l=>{ const m = l.match(/^(\d{5,})\b(.*)$/); if(!m) return null; const v = (m[2].match(/-?(?:R\$\s*)?-?[\d.]+,\d{2}/g)||[]).map(x=>x.replace(/R\$\s*/,"")); const n = nums(v); return n.length>=15 ? {os:m[1], n:n.slice(-15)} : null; }).filter(Boolean);
  }
  if(!window.XLSX) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
  const wb = window.XLSX.read(await file.arrayBuffer(), {type:"array"}), out = [];
  wb.SheetNames.forEach(sn=>window.XLSX.utils.sheet_to_json(wb.Sheets[sn], {header:1, raw:true}).forEach(r=>{ const os = String(r[0]??"").trim(); if(!/^\d{5,}$/.test(os)) return; const n = nums(r.slice(1).filter(x=>x!==""&&x!=null&&!/^[A-Za-zÀ-ú]/.test(String(x)))); if(n.length>=15) out.push({os, n:n.slice(-15)}); }));
  return out;
}
function conferirHtml(f, deles){
  const K = ["dt","dtv","dc","dcv","km","kmv","hn","vn","h50","v50","h100","v100","not","notv","total"], dl = new Map(), nos = new Map();
  deles.forEach(x=>{ const o = {}; K.forEach((k,i)=>o[k] = x.n[i]); const a = dl.get(x.os); if(a) K.forEach(k=>a[k]+=o[k]); else dl.set(x.os, o); });
  const cfg = state.cfg; if(f.snap && !f.itens){ state.cfg = {...cfg, ...f.snap.cfg}; holCache = {}; calcCache = new WeakMap(); }
  try{ linhasTerceiros(f).forEach(x=>{ const a = nos.get(x.os); if(a) K.forEach(k=>a[k]=(a[k]||0)+(+x[k]||0)); else nos.set(x.os, {...x}); }); } finally { state.cfg = cfg; holCache = {}; calcCache = new WeakMap(); }
  const oss = [...new Set([...nos.keys(), ...dl.keys()])], dif = [];
  oss.forEach(os=>{ const a = nos.get(os), b = dl.get(os); if(!a){ dif.push({os, t:"Só na planilha deles", d:b.total}); return; } if(!b){ dif.push({os, t:"Só no nosso fechamento", d:-(+a.total||0)}); return; }
    const h = ["hn","h50","h100","not"].filter(k=>Math.abs((+a[k]||0)-(+b[k]||0))>0.011).map(k=>`${{hn:"normais",h50:"extra 50%",h100:"extra 100%",not:"noturno"}[k]}: nós ${n2(a[k])} h, eles ${n2(b[k])} h`);
    if(h.length || Math.abs((+a.total||0)-(+b.total||0))>0.011) dif.push({os, t:h.join(" · ") || "valor diferente", d:(+b.total||0)-(+a.total||0)}); });
  const tn = [...nos.values()].reduce((s,x)=>s+(+x.total||0),0), td = [...dl.values()].reduce((s,x)=>s+x.total,0);
  return `<header><h2>Conferência · ${esc(f.numero)}</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <div class="summary"><span>Nosso total <b>${brl(tn)}</b></span><span>Planilha deles <b>${brl(td)}</b></span><span>Diferença <b style="color:${Math.abs(td-tn)>0.011?"var(--bad)":"var(--good)"}">${brl(td-tn)}</b></span><span><b>${dl.size}</b> OS na planilha</span></div>
  ${!dl.size ? `<div class="warnbox">Não encontrei linhas de OS no arquivo. Envie a planilha no modelo "Fechamento de terceiros" (Excel ou PDF).</div>` : dif.length ? `<div class="list">${dif.map(x=>`<div class="item" style="cursor:default"><span class="mono"><b>${esc(x.os)}</b></span><span>${esc(x.t)}</span><span class="mono" style="color:${x.d<0?"var(--bad)":"var(--good)"}">${x.d>0?"+":""}${brl(x.d)}</span></div>`).join("")}</div>` : `<div class="line"><span class="pill good">Tudo confere</span> Todas as OS batem em horas e valores.</div>`}
  <footer><span></span><button class="btn" data-act="closeModal">Fechar</button></footer>`;
}
/* ---------- EQUIPE: acerto e documentos ---------- */
const TIPOS_PAG = {vale:["Vale / adiantamento",-1], pagamento:["Pagamento",-1], bonus:["Bônus",1], desconto:["Desconto",-1]};
const TIPOS_DOC = ["ASO","NR-10","NR-11","NR-12","NR-33","NR-35","Integração na contratante","Ficha de EPI","CND Federal","CND FGTS","CND Trabalhista","CND Estadual","CND Municipal","Alvará","Seguro","Contrato","Outro"];
function acertoDe(nome, de, ate){
  const aps = state.ap.filter(e=>e.profissional===nome && e.data>=de && e.data<=ate && !e.andamento), c = sumCalc(aps), cu = Math.round(custoSum(aps)*100)/100;
  const pags = state.pag.filter(x=>x.profissional===nome && ((x.tipo==="pagamento" && x.ref) ? (x.ref.de===de && x.ref.ate===ate) : (x.data>=de && x.data<=ate)));
  const som = t => Math.round(pags.filter(x=>x.tipo===t).reduce((s,x)=>s+numIn(x.valor),0)*100)/100;
  const v = {vale:som("vale"), pago:som("pagamento"), bonus:som("bonus"), desconto:som("desconto")};
  return {aps, c, cu, pags, ...v, saldo:Math.round((cu + v.bonus - v.desconto - v.vale - v.pago)*100)/100};
}
function docStatus(x){ if(!x.validade) return ["", "sem validade"]; const d = diasEntre(today(), x.validade); return d<0 ? ["bad", `vencido há ${-d} dia${d<-1?"s":""}`] : d<=30 ? ["warn", `vence em ${d} dia${d!==1?"s":""}`] : ["good", `válido até ${fdate(x.validade)}`]; }
function vEquipe(){
  const q = state.eqp ||= {de:ym(today())+"-01", ate:today()}, ps = profs();
  const docs = [...state.docs].sort((a,b)=>(a.validade||"9999").localeCompare(b.validade||"9999"));
  return `<div class="pagehead"><div><span class="eyebrow">Equipe</span><h1>Acerto e documentos</h1><p class="muted">Quanto pagar a cada técnico no período, com vales e recibos. Só você vê esta tela.</p></div><button class="btn" data-act="nav" data-view="mais">‹ Mais</button></div>
  <div class="panel filtergrid"><label class="field"><span>De</span><input type="date" id="eq-de" value="${esc(q.de)}"></label><label class="field"><span>Até</span><input type="date" id="eq-ate" value="${esc(q.ate)}"></label>
    <div class="field" style="grid-column:1/-1"><span>Atalhos</span><div class="row"><button class="btn sm" data-act="eqPreset" data-p="sem">Esta semana</button><button class="btn sm" data-act="eqPreset" data-p="q1">1ª quinzena</button><button class="btn sm" data-act="eqPreset" data-p="q2">2ª quinzena</button><button class="btn sm" data-act="eqPreset" data-p="mes">Este mês</button><button class="btn sm" data-act="eqPreset" data-p="ant">Mês passado</button></div></div></div>
  ${!temCustos()?`<div class="banner"><span>Informe quanto você paga a cada funcionário (por hora ou salário) para o acerto calcular os valores.</span><button class="btn sm" data-act="nav" data-view="ajustes">Ajustes</button></div>`:""}
  <section class="section"><header><h2>Acerto de ${fdate(q.de)} a ${fdate(q.ate)}</h2><button class="btn sm primary" data-act="pagNovo">+ Vale / pagamento</button></header>
  ${ps.length?`<div class="fechlist">${ps.map(n=>{ const a = acertoDe(n, q.de, q.ate); return `<div class="fechcard"><div class="fc-top"><b>${esc(n)}</b><span class="pill ${a.saldo>0.005?"warn":"good"}">${a.saldo>0.005?`A pagar ${brl(a.saldo)}`:"Quitado"}</span></div>
    <div class="fc-vals"><span>Horas<b class="mono">${fdec(a.c.total)} h</b><small>normal ${fdec(a.c.n)} · 50% ${fdec(a.c.e50)} · 100% ${fdec(a.c.e100)}</small></span><span>Custo<b class="mono">${brl(a.cu)}</b><small>${a.aps.length} OS</small></span>
      ${a.bonus||a.desconto?`<span>Bônus / desc.<b class="mono">${brl(a.bonus-a.desconto)}</b></span>`:""}<span>Vales<b class="mono">${brl(a.vale)}</b></span><span>Pago<b class="mono">${brl(a.pago)}</b></span></div>
    ${a.pags.length?`<p class="muted" style="margin:0;font-size:.85rem">${a.pags.map(x=>`${fdate(x.data)} ${TIPOS_PAG[x.tipo]?.[0]||x.tipo} ${brl(numIn(x.valor))}`).join(" · ")}</p>`:""}
    <div class="row fc-acts">${a.saldo>0.005?`<button class="btn sm primary" data-act="pagNovo" data-p="${esc(n)}" data-t="pagamento" data-v="${a.saldo}">Pagar saldo</button>`:""}<button class="btn sm" data-act="pagNovo" data-p="${esc(n)}" data-t="vale">Vale</button><button class="btn sm" data-act="reciboPdf" data-p="${esc(n)}">Recibo / extrato (PDF)</button></div></div>`; }).join("")}</div>`:`<div class="empty"><b>Nenhum funcionário cadastrado</b>Cadastre em Ajustes → Funcionários.</div>`}
  ${state.pag.length?`<details class="fichabox" style="margin-top:10px"><summary>Todos os vales e pagamentos (${state.pag.length})</summary><div class="list">${[...state.pag].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,100).map(x=>`<button class="item" data-act="pagEditar" data-id="${esc(x.id)}"><span class="mono">${fdate(x.data)}</span><span><b>${esc(x.profissional)}</b> · ${TIPOS_PAG[x.tipo]?.[0]||esc(x.tipo)}${x.obs?`<br><small class="muted">${esc(x.obs)}</small>`:""}</span><span class="mono">${brl(numIn(x.valor))}</span></button>`).join("")}</div></details>`:""}
  </section>
  <section class="section" id="documentos"><header><h2>Documentos e validades</h2><button class="btn sm primary" data-act="docNovo">+ Documento</button></header>
  ${docs.length?`<div class="list">${docs.map(x=>{ const [cl, st] = docStatus(x); return `<button class="item" data-act="docEditar" data-id="${esc(x.id)}"><span><b>${esc(x.tipo||"")}</b><br><small class="muted">${esc(x.titular||"Empresa")}</small></span><span>${x.obs?`<small class="muted">${esc(x.obs)}</small>`:""}${x.arquivo?' <span class="pill">📎</span>':""}</span><span class="pill ${cl}">${st}</span></button>`; }).join("")}</div>`:`<div class="empty"><b>Nenhum documento</b>Cadastre ASO, NRs, integração e certidões com a validade: o sistema avisa 30 dias antes de vencer.</div>`}
  </section>`;
}
function pagForm(x){
  return `<header><h2>${x.id?"Editar":"Novo"} lançamento da equipe</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <form class="form" id="pagForm" data-id="${esc(x.id||"")}">
    <div class="grid2"><label class="field"><span>Funcionário</span><select id="pg-prof">${profs().map(n=>`<option ${x.profissional===n?"selected":""}>${esc(n)}</option>`).join("")}</select></label>
    <label class="field"><span>Tipo</span><select id="pg-tipo">${Object.entries(TIPOS_PAG).map(([k,[l]])=>`<option value="${k}" ${(x.tipo||"vale")===k?"selected":""}>${l}</option>`).join("")}</select></label>
    <label class="field"><span>Data</span><input type="date" id="pg-data" value="${esc(x.data||today())}"></label>
    <label class="field"><span>Valor (R$)</span><input id="pg-valor" inputmode="decimal" value="${x.valor!=null?String(Math.round(numIn(x.valor)*100)/100).replace(".",","):""}"></label></div>
    <label class="field"><span>Observação</span><input id="pg-obs" value="${esc(x.obs||"")}" placeholder="Ex.: PIX, adiantamento quinzena"></label>
    ${x.ref?`<p class="muted" style="margin:0">Referente ao período ${fdate(x.ref.de)} a ${fdate(x.ref.ate)}.</p>`:""}
    <footer>${x.id?`<button type="button" class="btn danger" data-act="pagExcluir" data-id="${esc(x.id)}">Excluir</button>`:"<span></span>"}<button class="btn primary" type="submit">Salvar</button></footer>
  </form>`;
}
function docForm(x){
  return `<header><h2>${x.id?"Editar":"Novo"} documento</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <form class="form" id="docForm" data-id="${esc(x.id||"")}">
    <div class="grid2"><label class="field"><span>Tipo</span><select id="dc-tipo">${TIPOS_DOC.map(t=>`<option ${x.tipo===t?"selected":""}>${t}</option>`).join("")}</select></label>
    <label class="field"><span>De quem</span><select id="dc-tit"><option value="Empresa">Empresa (${esc(state.cfg.empresa.nome)})</option>${profs().map(n=>`<option ${x.titular===n?"selected":""}>${esc(n)}</option>`).join("")}</select></label>
    <label class="field"><span>Emissão</span><input type="date" id="dc-emi" value="${esc(x.emissao||"")}"></label>
    <label class="field"><span>Validade</span><input type="date" id="dc-val" value="${esc(x.validade||"")}"></label></div>
    <label class="field"><span>Observação</span><input id="dc-obs" value="${esc(x.obs||"")}"></label>
    <div class="field"><span>Arquivo (PDF ou foto)</span><div class="row">${x.arquivo?`<button type="button" class="btn sm" data-act="docVer" data-path="${esc(x.arquivo)}">Abrir arquivo atual</button>`:""}<label class="btn sm" for="dc-arq">${x.arquivo?"Trocar arquivo":"+ Anexar arquivo"}</label><input type="file" id="dc-arq" accept="application/pdf,image/*" hidden><span class="muted" id="dc-arq-nome"></span></div></div>
    <footer>${x.id?`<button type="button" class="btn danger" data-act="docExcluir" data-id="${esc(x.id)}">Excluir</button>`:"<span></span>"}<button class="btn primary" type="submit">Salvar</button></footer>
  </form>`;
}
function prevStatus(q){
  return (q.plano||[]).map(pl=>{ const feitas = state.ap.filter(e=>e.equipId===q.id && e.prevId===pl.id && !e.andamento).map(e=>e.data).sort(), ult = feitas[feitas.length-1] || "";
    const prox = ult ? ymd(addDays(parseYmd(ult), +pl.cadaDias||30)) : today(), d = diasEntre(today(), prox);
    return {pl, ult, prox, d, nivel: d<0 ? "bad" : d<=7 ? "warn" : "good"}; });
}
function alertasEquipe(){
  if(state.worker) return [];
  const out = [];
  state.docs.forEach(x=>{ const [cl, st] = docStatus(x); if(cl==="bad" || cl==="warn") out.push({nivel:cl, txt:`${x.tipo} de ${x.titular||"Empresa"}: ${st}`, btn:`<button class="btn sm" data-act="docEditar" data-id="${esc(x.id)}">Ver</button>`}); });
  state.eq.filter(q=>!q.inativo).forEach(q=>prevStatus(q).forEach(s=>{ if(s.nivel!=="good") out.push({nivel:s.nivel, txt:`Preventiva ${q.tag}: ${s.pl.atividade} ${!s.ult?"nunca feita":s.d<0?`atrasada ${-s.d} dia(s)`:s.d===0?"vence hoje":`vence em ${s.d} dia(s)`}`, btn:`<button class="btn sm" data-act="eqVer" data-id="${esc(q.id)}">Ver</button>`}); }));
  return out;
}
function vEquipamentos(){
  const ls = [...state.eq].sort((a,b)=>(a.inativo?1:0)-(b.inativo?1:0) || (a.tag||"").localeCompare(b.tag||"")), qf = (state.eqQ||"").toLowerCase();
  const vis = ls.filter(q=>!qf || `${q.tag} ${q.nome} ${q.unidade} ${q.empresa}`.toLowerCase().includes(qf));
  return `<div class="pagehead"><div><span class="eyebrow">Equipamentos</span><h1>Equipamentos e preventivas</h1><p class="muted">Cadastre os equipamentos (TAG) e o plano de preventivas. Ao lançar uma OS, escolha o equipamento e, se for preventiva, qual atividade.</p></div><div class="row"><button class="btn" data-act="nav" data-view="mais">‹ Mais</button><button class="btn primary" data-act="eqNovo">+ Equipamento</button></div></div>
  ${ls.length>6?`<div class="panel" style="margin-bottom:10px"><label class="field"><span>Buscar</span><input id="eq-q" value="${esc(state.eqQ||"")}" placeholder="TAG, nome, unidade…"></label></div>`:""}
  ${vis.length?`<div class="list">${vis.map(q=>{ const st = prevStatus(q), ruim = st.filter(x=>x.nivel==="bad").length, perto = st.filter(x=>x.nivel==="warn").length, n = state.ap.filter(e=>e.equipId===q.id).length;
    return `<button class="item" data-act="eqVer" data-id="${esc(q.id)}"><span><b class="mono">${esc(q.tag||"")}</b>${q.inativo?' <span class="pill">inativo</span>':""}<br><small class="muted">${esc([q.unidade, q.empresa].filter(Boolean).join(" · "))}</small></span><span>${esc(q.nome||"")}<br><small class="muted">${n} OS · ${(q.plano||[]).length} preventiva(s)</small></span><span>${ruim?`<span class="pill bad">${ruim} atrasada(s)</span>`:perto?`<span class="pill warn">${perto} na semana</span>`:(q.plano||[]).length?'<span class="pill good">em dia</span>':""}</span></button>`; }).join("")}</div>`
  :`<div class="empty"><b>Nenhum equipamento</b>Ex.: EL-02 Elevador de canecas 02, unidade Uruaçu, preventiva "Lubrificação dos mancais" a cada 30 dias.</div>`}`;
}
function eqForm(q){
  const pl = q.plano && q.plano.length ? q.plano : [{id:uid(), atividade:"", cadaDias:30, horasPrev:""}]; state.eqPlano = clone(pl);
  return `<header><h2>${q.id?"Editar":"Novo"} equipamento</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <form class="form" id="eqForm" data-id="${esc(q.id||"")}">
    <div class="grid2"><label class="field"><span>TAG / código</span><input id="eqf-tag" value="${esc(q.tag||"")}" required placeholder="Ex.: EL-02"></label>
    <label class="field"><span>Nome</span><input id="eqf-nome" value="${esc(q.nome||"")}" placeholder="Ex.: Elevador de canecas 02"></label>
    <label class="field"><span>Empresa</span><input id="eqf-emp" list="emp-list" value="${esc(q.empresa||lastEmp())}"><datalist id="emp-list">${dimVals("emp").map(v=>`<option value="${esc(v)}">`).join("")}</datalist></label>
    <label class="field"><span>Unidade</span>${unidCampo('id="eqf-unid"', q.empresa||lastEmp(), q.unidade, "Selecione a unidade")}</label></div>
    <label class="field"><span>Observação (modelo, fabricante, laudo NR-12…)</span><input id="eqf-obs" value="${esc(q.obs||"")}"></label>
    <div class="field"><span>Plano de preventivas</span><div id="eqf-plano"></div><div><button type="button" class="btn sm" data-act="eqPlanoAdd">+ Atividade</button></div></div>
    ${q.id?`<label class="check"><input type="checkbox" id="eqf-inativo" ${q.inativo?"checked":""}> Inativo (não aparece mais nos lançamentos)</label>`:""}
    <footer>${q.id?`<button type="button" class="btn danger" data-act="eqExcluir" data-id="${esc(q.id)}">Excluir</button>`:"<span></span>"}<button class="btn primary" type="submit">Salvar</button></footer>
  </form>`;
}
function lerEqPlano(){ document.querySelectorAll("#eqf-plano .eqpl").forEach(el=>{ const p = state.eqPlano[+el.dataset.i]; if(!p) return; el.querySelectorAll("[data-pl]").forEach(i=>{ p[i.dataset.pl] = i.value; }); }); }
function renderEqPlano(){ const box = $("#eqf-plano"); if(!box) return;
  box.innerHTML = state.eqPlano.map((x,i)=>`<div class="grid3 eqpl" data-i="${i}"><label class="field"><span>Atividade</span><input data-pl="atividade" value="${esc(x.atividade||"")}" placeholder="Ex.: Lubrificação"></label><label class="field"><span>A cada (dias)</span><input data-pl="cadaDias" type="number" min="1" value="${esc(x.cadaDias||30)}"></label><label class="field"><span>Horas previstas</span><span class="timepair"><input data-pl="horasPrev" inputmode="decimal" value="${esc(x.horasPrev||"")}"><button type="button" class="iconbtn" data-act="eqPlanoDel" data-i="${i}" aria-label="Remover">✕</button></span></label></div>`).join(""); }
function eqDetalhe(q){
  const st = prevStatus(q), hs = state.ap.filter(e=>e.equipId===q.id).sort((a,b)=>(b.data+b.inicio).localeCompare(a.data+a.inicio)), t = sumCalc(hs);
  return `<header><h2>${esc(q.tag||"")} · ${esc(q.nome||"")}</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <p class="muted" style="margin:0 0 8px">${esc([q.unidade, q.empresa, q.obs].filter(Boolean).join(" · "))}</p>
  ${st.length?`<h3 style="margin:8px 0">Preventivas</h3><div class="list">${st.map(s=>`<div class="item" style="cursor:default"><span>${esc(s.pl.atividade||"")}<br><small class="muted">a cada ${s.pl.cadaDias} dias${s.pl.horasPrev?` · ${s.pl.horasPrev} h previstas`:""}</small></span><span><small>Última: ${s.ult?fdate(s.ult):"nunca"}<br>Próxima: ${fdate(s.prox)}</small></span><span><span class="pill ${s.nivel}">${s.d<0?`atrasada ${-s.d}d`:s.d===0?"hoje":`em ${s.d}d`}</span><br><button class="btn sm" data-act="eqLancar" data-id="${esc(q.id)}" data-p="${esc(s.pl.id)}">Lançar</button></span></div>`).join("")}</div>`:""}
  <h3 style="margin:12px 0 8px">Histórico (${hs.length} OS · ${fdec(t.total)} h)</h3>
  ${hs.length?`<div class="list">${hs.slice(0,60).map(e=>`<div class="item" style="cursor:default"><span class="mono">${fdate(e.data)}</span><span><b>OS ${esc(e.os||"s/n")}</b> ${esc(e.descricao||"")}${e.prevId?` <span class="pill info">preventiva</span>`:""}<br><small class="muted">${esc(e.profissional||"")} · ${esc(e.inicio)}–${esc(e.fim||"…")}${e.obs?` · ${esc(e.obs)}`:""}</small></span><span class="mono">${fdec(calc(e).total)} h</span></div>`).join("")}</div>`:`<p class="muted">Nenhuma OS lançada neste equipamento ainda.</p>`}
  <footer><button class="btn" data-act="eqEditar" data-id="${esc(q.id)}">Editar</button><button class="btn primary" data-act="eqLancar" data-id="${esc(q.id)}">Lançar OS neste equipamento</button></footer>`;
}
/* ---------- PAINEL ---------- */
function totalsReceber(){
  const prod = Math.round((state.fech.reduce((s,f)=>s+(+f.valor||0),0) + sumCalc(state.ap.filter(e=>!e.andamento && !lockedE(e))).valor)*100)/100;
  const recH = state.rec.filter(r=>r.origem==="horas" || r.origem==="fech").reduce((s,r)=>s+recBruto(r),0);
  const glosas = state.fech.reduce((s,f)=>s+fechGlosa(f),0), reemb = state.fech.reduce((s,f)=>s+(+f.reemb||0),0);
  const orcs = state.orc.filter(orcAberto);
  const orcTot = orcs.reduce((s,o)=>s+orcTotals(o).total,0);
  const recO = orcs.reduce((s,o)=>s+orcRecebido(o.id),0);
  return {horas:Math.max(0,prod+reemb-recH-glosas), orc:Math.max(0,orcTot-recO), prod, recH, orcTot, recO, glosas, reemb};
}
/* meses que vieram das planilhas aprovadas (fechamentos importados, sem lançamentos dia a dia) */
const compDe = f => f.competencia || (f.ate||"").slice(0,7);
const planilhasDoMes = m => state.fech.filter(f=>f.itens && compDe(f)===m && (!state.hf?.f?.emp || state.hf.f.emp===ALL || chaveEmp(f.empresa||"")===chaveEmp(state.hf.f.emp)));
function resumoPlan(fs){ const r = {os:0, n:0, e50:0, e100:0, not:0, total:0, valor:0, itens:[]};
  fs.forEach(f=>{ r.valor += +f.valor||0; (f.itens||[]).forEach(x=>{ r.os++; r.n += (+x.hn||0)*60; r.e50 += (+x.h50||0)*60; r.e100 += (+x.h100||0)*60; r.not += (+x.not||0)*60; r.itens.push({...x, fech:f}); }); }); // valor oficial do fechamento
  r.total = r.n + r.e50 + r.e100; r.valor = Math.round(r.valor*100)/100; return r; }
function planilhaTabela(r, titulo){
  if(!r.os) return "";
  const fs = [...new Set(r.itens.map(x=>x.fech))], hh = h => fdec((+h||0)*60);
  return `<section class="section"><header><h2>${titulo}</h2><span class="mono muted">${r.os} OS · ${fdec(r.total)} h · ${brl(r.valor)}</span></header>
  <p class="muted" style="margin:0 0 8px">Mês lançado pela planilha aprovada (${fs.map(f=>esc(f.numero)).join(", ")}): mostra o total de cada OS, sem os horários de cada dia.</p>
  <div class="tablewrap"><table class="cards-sm"><thead><tr><th>OS</th><th>Serviço</th><th class="r">Normal</th><th class="r">Extra 50%</th><th class="r">Extra 100%</th><th class="r">Noturno</th><th class="r">Valor</th></tr></thead>
  <tbody>${r.itens.map(x=>`<tr class="click" data-act="osHist" data-os="${esc(x.os)}"><td class="mono"><b>${esc(x.os||"s/n")}</b></td><td>${esc(x.desc||"")}</td><td class="r mono" data-l="Normal">${hh(x.hn)} h</td><td class="r mono" data-l="Extra 50%">${x.h50?hh(x.h50)+" h":""}</td><td class="r mono" data-l="Extra 100%">${x.h100?hh(x.h100)+" h":""}</td><td class="r mono" data-l="Noturno">${x.not?hh(x.not)+" h":""}</td><td class="r mono" data-l="Valor"><b>${brl(+x.total||0)}</b></td></tr>`).join("")}</tbody>
  <tfoot><tr><th colspan="2">Total</th><th class="r mono">${fdec(r.n)}</th><th class="r mono">${fdec(r.e50)}</th><th class="r mono">${fdec(r.e100)}</th><th class="r mono">${fdec(r.not)}</th><th class="r mono">${brl(r.valor)}</th></tr></tfoot></table></div></section>`;
}
function vPainel(){
  const t = totalsReceber();
  const mAp = state.ap.filter(e=>ym(e.data)===state.month);
  const mc = sumCalc(mAp), pl = resumoPlan(planilhasDoMes(state.month));
  const tdAp = state.ap.filter(e=>e.data===today()); const tc = sumCalc(tdAp);
  const abertos = state.orc.filter(o=>o.status==="enviado");
  const abertosV = abertos.reduce((s,o)=>s+orcTotals(o).total,0);
  const decididos = state.orc.filter(o=>["aprovado","concluido","recusado"].includes(o.status));
  const taxa = decididos.length ? Math.round(100*decididos.filter(o=>o.status!=="recusado").length/decididos.length) : null;
  const recent = [...state.ap].sort((a,b)=>(b.data+b.inicio).localeCompare(a.data+a.inicio)).slice(0,5);
  const gear = `<svg class="gear" viewBox="0 0 100 100" fill="#fff"><path d="M43 2h14l2 12 8 3 10-7 10 10-7 10 3 8 12 2v14l-12 2-3 8 7 10-10 10-10-7-8 3-2 12H43l-2-12-8-3-10 7-10-10 7-10-3-8-12-2V43l12-2 3-8-7-10 10-10 10 7 8-3zM50 32a18 18 0 1 0 0 36 18 18 0 1 0 0-36z"/></svg>`;
  return `${aprovacoesHtml()}${exampleBanner()}
  <div class="pagehead"><div><span class="eyebrow">${WD[new Date().getDay()]}, ${fdate(today())}</span><h1>Painel</h1></div><div class="row">${monthNav()}<button class="btn" data-act="cronoNovo">▶ Iniciar OS agora</button></div></div>
  <section class="hero">${gear}
    <div><div class="eyebrow">Total a receber</div><div class="big">${brl(t.horas+t.orc)}</div></div>
    <div class="split"><span>Horas trabalhadas <b>${brl(t.horas)}</b></span><span>Orçamentos aprovados <b>${brl(t.orc)}</b></span></div>
  </section>
  ${alertasHtml()}
  ${escalaHoje()}
  <div class="kpis">
    <div class="kpi"><span class="eyebrow">Hoje</span><span class="v">${fh(tc.total)}</span><span class="s">${tdAp.length} OS · ${brl(tc.valor)}</span></div>
    <div class="kpi"><span class="eyebrow">Em ${MESES[+state.month.slice(5)-1]}</span><span class="v">${fh(mc.total + pl.total)}</span><span class="s">${brl(mc.valor + pl.valor)}${pl.os ? ` · ${pl.os} OS da planilha aprovada${mAp.length?` + ${new Set(mAp.map(e=>e.data)).size} dia(s) lançados`:""}` : ` em ${new Set(mAp.map(e=>e.data)).size} dias`}</span></div>
    ${(()=>{ const ct = mAp.filter(e=>!e.orcId), fat = sumCalc(ct).valor + pl.valor, cu = custoSum(ct) + state.desp.filter(x=>ym(x.data)===state.month && !x.reembolsavel && !x.orcId).reduce((s,x)=>s+despValor(x),0);
      return temCustos() ? `<div class="kpi"><span class="eyebrow">Lucro em ${MESES[+state.month.slice(5)-1]}</span><span class="v" style="color:${fat-cu>=0?"var(--good)":"var(--bad)"}">${brl(fat-cu)}</span><span class="s">${brl(fat)} faturado − ${brl(cu)} de equipe e despesas${fat>0?` · margem ${Math.round(100*(fat-cu)/fat)}%`:""}</span></div>`
        : `<div class="kpi"><span class="eyebrow">Lucro do mês</span><span class="v">—</span><span class="s">Informe o custo de cada funcionário em <button class="btn sm" data-act="nav" data-view="ajustes" style="padding:1px 6px">Ajustes</button></span></div>`; })()}
    <div class="kpi"><span class="eyebrow">Orçamentos enviados</span><span class="v">${abertos.length}</span><span class="s">${brl(abertosV)} aguardando${taxa!=null?` · ${taxa}% aprovados`:""}</span></div>
  </div>
  ${pl.os && !mAp.length ? planilhaTabela(pl, `OS de ${ymLabel(state.month)}`) : `<section class="section"><header><h2>Valor por dia em ${ymLabel(state.month)}</h2>
    <div class="legend"><span><i class="dot d-n"></i>Normal</span><span><i class="dot d-50"></i>Extra ${pct50()}</span><span><i class="dot d-100"></i>Domingo/feriado ${pct100()}</span></div></header>
    <div class="panel"><div class="chartwrap" id="chart"></div></div></section>${pl.os ? planilhaTabela(pl, `OS da planilha de ${ymLabel(state.month)}`) : ""}`}
  ${confHtml(conferencia(ymd(addDays(parseYmd(today()),-14)), today()), "Conferência dos últimos 14 dias")}
  ${painelDims(mAp)}
  <div class="two">
    <section class="section"><header><h2>Últimos apontamentos</h2><button class="btn sm" data-act="nav" data-view="horas">Ver todos</button></header>
      ${recent.length?`<div class="list">${recent.map(e=>apItem(e,true)).join("")}</div>`:`<div class="empty"><b>Nenhuma OS apontada ainda</b>Toque em <b style="display:inline">Apontar</b> no topo para registrar a primeira ordem de serviço do dia.</div>`}</section>
    <section class="section"><header><h2>Orçamentos aguardando resposta</h2><button class="btn sm" data-act="newOrc">Novo orçamento</button></header>
      ${abertos.length?`<div class="list">${abertos.map(orcCard).join("")}</div>`:`<div class="empty"><b>Nada aguardando resposta</b>Orçamentos com status “Enviado” aparecem aqui.</div>`}</section>
  </div>`;
}
function painelDims(list){
  const avail = Object.keys(DIMS).filter(k=>new Set(list.map(DIMS[k].get).filter(Boolean)).size>0);
  if(!avail.length) return "";
  const k = avail.includes(state.pby) ? state.pby : avail[0];
  return `<section class="section"><header><h2>Horas de ${ymLabel(state.month)} por ${DIMS[k].label.toLowerCase()}</h2>
    <div class="filters" style="margin:0">${avail.map(x=>`<button class="chipbtn" data-act="pby" data-k="${x}" aria-pressed="${x===k}">${DIMS[x].label}</button>`).join("")}</div></header>
    ${dimTable(list, k, {lucro:true}) || `<div class="empty">Tudo em ${esc(DIMS[k].get(list[0])||DIMS[k].none)}.</div>`}</section>`;
}
function drawChart(){
  const box = $("#chart"); if(!box) return;
  const [y,m] = state.month.split("-").map(Number);
  const nd = new Date(y,m,0).getDate();
  const days = Array.from({length:nd},(_,i)=>{ const ds=`${state.month}-${pad(i+1)}`; const list=state.ap.filter(e=>e.data===ds); const c=sumCalc(list); return {ds, c, n:list.length, special: new Date(y,m-1,i+1).getDay()===0 || !!holidayName(ds)}; });
  const W = Math.max(300, box.clientWidth), H = 230, ml = 58, mr = 6, mt = 10, mb = 24;
  const pw = W-ml-mr, ph = H-mt-mb;
  const max = Math.max(...days.map(d=>d.c.vn+d.c.v50+d.c.v100), 0);
  const step = niceStep(max/4 || 100); const top = Math.max(step, Math.ceil(max/step)*step);
  const yv = v => mt + ph - v/top*ph;
  const band = pw/nd, bw = Math.max(3, Math.min(22, band*0.64));
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Valor por dia">`;
  days.forEach((d,i)=>{ if(d.special) s += `<rect x="${ml+i*band}" y="${mt}" width="${band}" height="${ph}" style="fill:var(--surface-2)"/>`; });
  for(let v=0; v<=top+1e-6; v+=step){ const yy=yv(v); s += `<line x1="${ml}" x2="${W-mr}" y1="${yy}" y2="${yy}" style="stroke:var(--line)" stroke-width="1" ${v?'stroke-dasharray="2 3"':""}/><text x="${ml-6}" y="${yy+3.5}" text-anchor="end">${v>=1000?(v/1000).toLocaleString("pt-BR")+" mil":v}</text>`; }
  const labs = new Set([1,5,10,15,20,25,nd]);
  days.forEach((d,i)=>{
    const x = ml+i*band+(band-bw)/2;
    if(labs.has(i+1)) s += `<text x="${ml+i*band+band/2}" y="${H-7}" text-anchor="middle">${i+1}</text>`;
    const segs = [["var(--s-n)",d.c.vn],["var(--s-50)",d.c.v50],["var(--s-100)",d.c.v100]].filter(z=>z[1]>0);
    let base = 0;
    segs.forEach((z,k)=>{
      const y0 = yv(base), y1 = yv(base+z[1]); const gap = k>0 ? 2 : 0; const h = Math.max(1, y0-y1-gap);
      const yt = y0-gap-h;
      if(k===segs.length-1){ const r=Math.min(4,bw/2,h); s += `<path d="M${x},${yt+h} V${yt+r} Q${x},${yt} ${x+r},${yt} H${x+bw-r} Q${x+bw},${yt} ${x+bw},${yt+r} V${yt+h} Z" style="fill:${z[0]}"/>`; }
      else s += `<rect x="${x}" y="${yt}" width="${bw}" height="${h}" style="fill:${z[0]}"/>`;
      base += z[1];
    });
    s += `<rect class="hit" data-i="${i}" x="${ml+i*band}" y="${mt}" width="${band}" height="${ph}" fill="transparent" style="cursor:pointer"/>`;
  });
  s += `</svg><div class="tip" hidden></div>`;
  box.innerHTML = s;
  const tip = box.querySelector(".tip");
  const show = ev=>{
    const h = ev.target.closest(".hit"); if(!h){ tip.hidden=true; return; }
    const d = days[+h.dataset.i]; const hol = holidayName(d.ds);
    tip.innerHTML = `<div class="h">${WD[parseYmd(d.ds).getDay()]}, ${fdate(d.ds)}</div>${hol?`<div class="muted">${esc(hol)}</div>`:""}
      <div><span><i class="dot d-n"></i> Normal ${fh(d.c.n)}</span><span class="mono">${brl(d.c.vn)}</span></div>
      <div><span><i class="dot d-50"></i> Extra ${pct50()} ${fh(d.c.e50)}</span><span class="mono">${brl(d.c.v50)}</span></div>
      <div><span><i class="dot d-100"></i> Extra ${pct100()} ${fh(d.c.e100)}</span><span class="mono">${brl(d.c.v100)}</span></div>
      <div style="border-top:1px solid var(--line);margin-top:4px;padding-top:4px"><b>${d.n} OS · ${fh(d.c.total)}</b><b class="mono">${brl(d.c.valor)}</b></div>`;
    tip.hidden = false;
    const r = box.getBoundingClientRect(); let x = ev.clientX - r.left + 12; if(x+190 > r.width) x = ev.clientX - r.left - 200; tip.style.left = Math.max(0,x)+"px"; tip.style.top = "6px";
  };
  box.querySelector("svg").addEventListener("pointermove", show);
  box.querySelector("svg").addEventListener("click", show);
  box.querySelector("svg").addEventListener("mouseleave", ()=>tip.hidden=true);
}
function niceStep(v){ const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v/p; return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p; }
let rz; window.addEventListener("resize", ()=>{ clearTimeout(rz); rz=setTimeout(()=>{ if(state.view==="painel") drawChart(); },150); });

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
    </div>
    ${profField}
    <label class="field"><span>Serviço executado</span><input id="f-desc" value="${esc(e.descricao||"")}" placeholder="Ex.: Troca de rolamento do elevador de canecas 02"></label>
    <div class="grid2">
      <label class="field"><span>Início</span><span class="timepair"><input type="time" id="f-ini" value="${esc(e.inicio||"")}" required><button type="button" class="btn sm" data-act="now" data-t="f-ini">Agora</button></span></label>
      <label class="field"><span>Término</span><span class="timepair"><input type="time" id="f-fim" value="${esc(e.fim||"")}" required><button type="button" class="btn sm" data-act="now" data-t="f-fim">Agora</button></span></label>
    </div>
    <div class="grid2">
      <label class="field"><span>Empresa</span><input id="f-emp" list="emp-list" value="${esc(e.empresa || lastEmp())}" placeholder="Ex.: Brejeiro"><datalist id="emp-list">${dimVals("emp").map(v=>`<option value="${esc(v)}">`).join("")}</datalist></label>
      <label class="field"><span>Unidade / local</span>${unidCampo('id="f-cli"', e.empresa || lastEmp(), e.cliente, "Selecione a unidade")}</label>
    </div>
    ${orcSelect("f-orc", e.orcId)}
    ${eqSelect('id="f-eq"', e.equipId, e.prevId)}
    ${state.worker?"":`<label class="field"><span>Cálculo da hora</span><select id="f-tipo">${Object.entries(TIPOS).map(([k,l])=>`<option value="${k}" ${ (e.tipo||"auto")===k?"selected":""}>${l}</option>`).join("")}</select></label>`}
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
    ${assets?`<div class="field"><span>Fotos do serviço</span><div class="thumbs" id="f-thumbs">${thumbs(state.apFotos, true)}</div><div class="row"><label class="btn sm" for="f-foto-antes">+ Antes</label><label class="btn sm" for="f-foto">+ Durante</label><label class="btn sm" for="f-foto-depois">+ Depois</label>
      <input type="file" id="f-foto-antes" data-tipo="antes" accept="image/*" multiple hidden><input type="file" id="f-foto" data-tipo="durante" accept="image/*" multiple hidden><input type="file" id="f-foto-depois" data-tipo="depois" accept="image/*" multiple hidden></div></div>`:""}
    <div id="f-prev" class="preview"></div>
    ${!isNew && !state.worker?`<details class="fichabox" id="f-hist" data-id="${esc(e.id)}"><summary>Histórico de alterações</summary><div class="muted" id="f-hist-box">Carregando…</div></details>`:""}
    <footer>${isNew?"<span></span>":`<button type="button" class="btn danger" data-act="delAp" data-id="${esc(e.id)}">Excluir</button>`}
      <span class="row">${isNew?"":`<button type="button" class="btn" data-act="dupAp">Duplicar</button>`}<button class="btn primary" type="submit">${isNew?"Salvar apontamento":"Salvar alterações"}</button></span></footer>
  </form>`;
}
const CAMPOS = [["data","Data",fdate],["os","OS"],["inicio","Início"],["fim","Término"],["descricao","Serviço"],["profissional","Funcionário"],["empresa","Empresa"],["cliente","Unidade"],["tipo","Cálculo",v=>TIPOS[v]||v],["emergencia","Emergência",v=>v?"sim":"não"],["obs","Obs."],["noAlmoco","Trabalhou no almoço",v=>v?"sim":"não"],["orcId","Orçamento",v=>v?orcNum(v):"—"],["excluido","Excluído",v=>v?"sim":"não"]];
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
const TAB_LABEL = {apontamentos:"OS", despesas:"Despesa", recebimentos:"Recebimento", fechamentos:"Fechamento", orcamentos:"Orçamento"};
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
  return {...old, ...eqv, id: id||undefined, data:$("#f-data").value, os:$("#f-os").value.trim(), descricao:$("#f-desc").value.trim(), inicio:$("#f-ini").value, fim:$("#f-fim").value, cliente:$("#f-cli").value.trim(), empresa:$("#f-emp").value.trim(), tipo: $("#f-tipo") ? $("#f-tipo").value : (old.tipo||"auto"), noAlmoco: $("#f-noalm") ? $("#f-noalm").checked : !!old.noAlmoco, emergencia:$("#f-emerg").checked, acion: $("#f-emerg").checked ? {por:$("#f-ac-por").value.trim(), as:$("#f-ac-as").value, meio:$("#f-ac-meio").value, motivo:$("#f-ac-mot").value.trim()} : undefined, obs:$("#f-obs").value.trim(), profissional: state.worker ? state.me : $("#f-prof1") ? $("#f-prof1").value : (selProfs()[0] || old.profissional || ""), orcId: $("#f-orc") ? $("#f-orc").value : (old.orcId||""), fotos:[...(state.apFotos||[])], fotoMeta: Object.fromEntries((state.apFotos||[]).map(id=>[id, (old.fotoMeta||{})[id] || state.fotoMetaNovo?.[id]]).filter(([,v])=>v))};
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
const blankRow = () => ({os:"", desc:"", ini:"", fim:"", cli:"", emerg:false, noAlm:false, ids:{}});
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
    <label class="field f-ini"><span>Início</span><input type="time" data-f="ini" value="${esc(r.ini)}"></label>
    <label class="field f-fim"><span>Término</span><input type="time" data-f="fim" value="${esc(r.fim)}"></label>
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
    ${assets?`<span class="fotos"><span class="muted" style="font-size:.8rem">Fotos:</span>${["antes","durante","depois"].map(tp=>`<label class="btn sm" for="d-foto-${i}-${tp}">${tp[0].toUpperCase()+tp.slice(1)}</label><input type="file" id="d-foto-${i}-${tp}" data-foto-row="${i}" data-tipo="${tp}" accept="image/*" multiple hidden>`).join("")}${(r.fotos||[]).length?`<span class="thumbs mini">${thumbs(r.fotos,false)}</span>`:""}</span>`:""}
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
    const c = calc({data:d.data, inicio:r.ini, fim:r.fim, noAlmoco:!!r.noAlm, empresa:d.emp, ...(d.orcId?{orcId:d.orcId}:{}), ...(state.worker?{}:rateFor(d.emp||state.cfg.contratante||"", d.data))});
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
      await save(col, {...base, id, ...eqSplit(r.eq), noAlmoco:!!r.noAlm, obs:(r.obs||"").trim(), ...(r.emerg?{acion:{por:(r.acPor||"").trim(), as:r.acAs||"", meio:r.acMeio||"", motivo:(r.acMot||"").trim()}}:{}), data:d.data, os:r.os.trim(), descricao:r.desc.trim(), inicio:r.ini, fim:r.fim, cliente:(r.cli||d.unid).trim(), empresa:(d.emp||"").trim(), emergencia:!!r.emerg, profissional:pr, fotos:r.fotos||[], fotoMeta:r.fotoMeta||{}, criadoEm:new Date().toISOString()});
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
const SRI = {"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js": "sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e", "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js": "sha384-SnzOobpRMLXZ52iJvZm/C0fYw0OQemTXzTjIsdsfMcrCtCEe9qgzxTd3RSklO5x2", "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js": "sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw", "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js": "sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG", "https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/lite.umd.js": "sha384-KRanV2NRwHPanp7iM6nlLQC5jPCTscSYMko30dLJHzNXJaUNtcucWv+SOi3jV3PE"};
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
    if(sub){ const {data} = await sb.from("push_inscricoes").select("endpoint").eq("endpoint", sub.endpoint).maybeSingle(); state.pushOn = !!data; } }catch(err){}
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
    <div class="grid2"><label class="field"><span>Nº da OS</span><input id="cr-os" list="os-list" inputmode="numeric" placeholder="Ex.: 2165557"></label>
    <label class="field"><span>Unidade</span>${unidCampo('id="cr-unid"', pre.emp||lastEmp(), pre.unid, "Selecione a unidade")}</label></div>
    <label class="field"><span>Serviço</span><input id="cr-desc" placeholder="Pode completar depois"></label>
    ${state.worker?"":`<label class="field"><span>Empresa</span><input id="cr-emp" list="emp-list" value="${esc(pre.emp||lastEmp())}"><datalist id="emp-list">${dimVals("emp").map(v=>`<option value="${esc(v)}">`).join("")}</datalist></label>`}
    ${ps.length && !state.worker?`<div class="field"><span>Quem está na OS</span><div class="filters" style="margin:0">${ps.map(n=>`<label class="chipcheck"><input type="checkbox" name="cr-prof" value="${esc(n)}" ${quem.includes(n)?"checked":""}><span>${esc(n)}</span></label>`).join("")}</div></div>`:""}
    <label class="check"><input type="checkbox" id="cr-emerg" ${pre.emerg?"checked":""}> Chamado de emergência</label>
    <div class="grid2 emergbox" id="cr-acion" ${pre.emerg?"":"hidden"}><label class="field"><span>Quem acionou</span><input id="cr-ac-por" list="acion-list"></label><label class="field"><span>Como</span><select id="cr-ac-meio"><option value="">—</option>${MEIOS.map(m=>`<option>${m}</option>`).join("")}</select></label><label class="field" style="grid-column:1/-1"><span>Motivo / equipamento</span><input id="cr-ac-mot"></label></div>
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
  const base = {...(state.worker ? {} : rateFor(emp, data)), data, inicio:agora, fim:"", andamento:true, tipo:"auto", os, descricao:$("#cr-desc").value.trim(), cliente:$("#cr-unid").value.trim(), empresa:emp, emergencia:em, criadoEm:new Date().toISOString(),
    ...(em?{acion:{por:$("#cr-ac-por").value.trim(), as:agora, meio:$("#cr-ac-meio").value, motivo:$("#cr-ac-mot").value.trim()}}:{})};
  const geo = await localizacao(); if(geo) base.geo = geo;
  try{
    const velhos = state.ap.filter(x=>x.andamento && x.data!==data && quem.includes(x.profissional||""));
    if(velhos.length){ const v = velhos[0]; toast(`A OS ${v.os||"s/n"} ficou aberta desde ${fdate(v.data).slice(0,5)} às ${v.inicio}. Encerre ela primeiro (faixa do topo) informando a hora real de término.`); return; }
    for(const pr of quem){ for(const r of state.ap.filter(x=>x.andamento && x.profissional===pr)) await encerrarOS(r, agora);
      await save("apontamentos", {...base, id: (state.crIds ||= {})[pr||"_"] ||= uid(), profissional:pr}); }
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
    <div class="form"><p class="muted" style="margin:0">Um PDF por funcionário. Toque em cada um para ver e enviar.</p>
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
  if(f.itens) return f.itens.map(x=>({...x, unid:x.unid||f.unidade||""}));
  const aps = (f.snap?.aps || fechRows(f.de, f.ate, f.empresa||"", f.profissional||"")).filter(e=>!e.andamento && !e.orcId).slice().sort((a,b)=>(a.data+a.inicio).localeCompare(b.data+b.inicio));
  const g = new Map();
  aps.forEach(e=>{ const k = `${(e.os||"").trim()||"s/n-"+e.id}|${e.cliente||""}`, c = calc(e);
    const o = g.get(k) || {os:(e.os||"").trim(), desc:"", unid:e.cliente||"", hn:0, vn:0, h50:0, v50:0, h100:0, v100:0, not:0, notv:0, total:0};
    if(!o.desc && e.descricao) o.desc = e.descricao;
    o.hn += c.n/60; o.vn += c.vn; o.h50 += c.e50/60; o.v50 += c.v50; o.h100 += c.e100/60; o.v100 += c.v100; o.not += c.not/60; o.notv += c.vnot; o.total += c.valor; g.set(k, o); });
  const r2 = v => Math.round(v*100)/100;
  return [...g.values()].map(o=>({...o, desc:(o.desc||"").toUpperCase(), hn:r2(o.hn), vn:r2(o.vn), h50:r2(o.h50), v50:r2(o.v50), h100:r2(o.h100), v100:r2(o.v100), not:r2(o.not), notv:r2(o.notv), total:r2(o.total)}));
}
async function fechTerceiros(f, fmt){
  const cfg = state.cfg;
  if(f.snap && !f.itens){ state.cfg = {...cfg, ...f.snap.cfg}; holCache = {}; calcCache = new WeakMap(); }
  let linhas; try{ linhas = linhasTerceiros(f); } finally { state.cfg = cfg; holCache = {}; calcCache = new WeakMap(); }
  if(!linhas.length){ toast("Esse fechamento não tem OS."); return; }
  const emp = f.empresa || state.cfg.contratante || "", F = ficha(emp), mes = (f.competencia || f.ate || "").slice(0,7);
  const cab = {nome: F.nomeFech || state.cfg.empresa.nome, codigo: F.codigo || "", compet: COMPET[+mes.slice(5,7)-1] || "", ano: mes.slice(0,4)};
  // uma folha por centro (unidade)
  const grupos = new Map(); linhas.forEach(l=>{ const c = centroDe(l.unid); const k = c.centro || c.cidade; if(!grupos.has(k)) grupos.set(k, {...c, linhas:[]}); grupos.get(k).linhas.push(l); });
  const nome = f.profissional ? fechNomeArq(f, `fechamento-${mes}-${f.numero}`) : `fechamento-terceiros-${slug(emp)}-${mes}`;
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
  const z = "0,00", body = g.linhas.map(l=>[l.os||"", l.cargo||"TERCEIRIZADO", l.desc||"", n2(l.dt), n2(l.dtv), n2(l.dc), n2(l.dcv), n2(l.km), n2(l.kmv), n2(l.hn), n2(l.vn), n2(l.h50), n2(l.v50), n2(l.h100), n2(l.v100), n2(l.not), n2(l.notv), n2(l.total)]);
  const H = (c, o={}) => ({content:c, ...o, styles:{halign:"center", valign:"middle", fontStyle:"bold"}});
  doc.autoTable({startY:f.profissional?39:36, margin:{left:L, right:8, bottom:8}, theme:"grid", tableWidth:R-L,
    head:[[H("ORDENS",{rowSpan:2}), H("CARGO",{rowSpan:2}), H("DESCRIÇÃO DO SERVIÇO",{rowSpan:2}), H("DIÁRIAS TRABALHADAS",{colSpan:2}), H("DIÁRIAS DE CUSTO",{colSpan:2}), H("KM RODADO",{colSpan:2}), H("HORAS NORMAIS",{colSpan:2}), H("HORAS EXTRAS 50%",{colSpan:2}), H("HORAS EXTRAS 100%",{colSpan:2}), H("ADICIONAL NOTURNO",{colSpan:2}), H("VALOR TOTAL DA ORDEM",{rowSpan:2})],
      ["Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$"].map(x=>H(x))],
    body, foot:[[{content:"TOTAIS", colSpan:3, styles:{halign:"left"}}, z, z, z, z, z, z, n2(t.hn), n2(t.vn), n2(t.h50), n2(t.v50), n2(t.h100), n2(t.v100), n2(t.not), n2(t.notv), n2(t.total)]],
    styles:{font:"helvetica", fontSize:g.linhas.length>32 ? 5.4 : 6, cellPadding:g.linhas.length>32 ? 0.45 : 0.8, textColor:0, lineColor:[150,150,150], lineWidth:0.1, overflow:"ellipsize"},
    headStyles:{fillColor:[235,235,235], textColor:0, fontSize:5.6, lineColor:[150,150,150], lineWidth:0.1, overflow:"linebreak"},
    footStyles:{fillColor:[235,235,235], textColor:0, fontStyle:"bold", halign:"right"},
    columnStyles:{0:{cellWidth:13, halign:"center"}, 1:{cellWidth:17}, 2:{cellWidth:60}, ...Object.fromEntries(Array.from({length:14},(_,i)=>[i+3, {halign:"right", cellWidth:(R-L-13-17-60-20)/14}])), 17:{halign:"right", cellWidth:20}}});
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
      ["ORDENS","CARGO","DESCRIÇÃO DO SERVIÇO","DIÁRIAS TRABALHADAS","","DIÁRIAS DE CUSTO","","KM RODADO","","HORAS NORMAIS","","HORAS EXTRAS 50%","","HORAS EXTRAS 100%","","ADICIONAL NOTURNO","","VALOR TOTAL DA ORDEM"],
      ["","","","Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$","Qtd","R$",""],
      ...g.linhas.map(l=>[l.os||"", l.cargo||"TERCEIRIZADO", l.desc||"", N(l.dt), N(l.dtv), N(l.dc), N(l.dcv), N(l.km), N(l.kmv), N(l.hn), N(l.vn), N(l.h50), N(l.v50), N(l.h100), N(l.v100), N(l.not), N(l.notv), N(l.total)]),
      ["TOTAIS","","",0,0,0,0,0,0,N(t.hn),N(t.vn),N(t.h50),N(t.v50),N(t.h100),N(t.v100),N(t.not),N(t.notv),N(t.total)], [],
      ["RESUMO GERAL","","","","","","","","","","","","VALOR TOTAL A PAGAR"], ["DIÁRIAS TRABALHADAS","",0,0,"","","","","","","","",N(t.total)], ["DIÁRIAS DE CUSTO","",0,0], ["KM RODADO","",0,0], ["HORAS NORMAIS","",N(t.hn),N(t.vn)], ["HORAS EXTRAS 50%","",N(t.h50),N(t.v50)], ["HORAS EXTRAS 100%","",N(t.h100),N(t.v100)], ["ADICIONAL NOTURNO","",N(t.not),N(t.notv)]];
    const ws = X.utils.aoa_to_sheet(aoa);
    ws["!merges"] = [[7,0,8,0],[7,1,8,1],[7,2,8,2],[7,3,7,4],[7,5,7,6],[7,7,7,8],[7,9,7,10],[7,11,7,12],[7,13,7,14],[7,15,7,16],[7,17,8,17]].map(([r1,c1,r2,c2])=>({s:{r:r1,c:c1},e:{r:r2,c:c2}}));
    ws["!cols"] = [{wch:10},{wch:14},{wch:44},...Array(14).fill({wch:9}),{wch:14}];
    for(let r=9; r<aoa.length; r++) for(let c=3; c<18; c++){ const cell = ws[X.utils.encode_cell({r,c})]; if(cell && typeof cell.v==="number") cell.z = "#,##0.00"; }
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
    <div class="row fc-acts">${f.itens?"":`<button class="btn sm" data-act="fechPdfBtn" data-id="${esc(f.id)}">PDF enviado</button>`}<button class="btn sm" data-act="terceirosPdf" data-id="${esc(f.id)}">Fechamento p/ fiscal (PDF)</button><button class="btn sm" data-act="terceirosXlsx" data-id="${esc(f.id)}">Excel</button><button class="btn sm" data-act="fechConferir" data-id="${esc(f.id)}">Conferir planilha deles</button>${fechAlterado(f)?`<button class="btn sm" data-act="fechPdfBtn" data-id="${esc(f.id)}" data-atual="1">PDF atual</button>`:""}
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
  <section class="section"><header><h2>Recebimentos registrados</h2><span class="muted">${brl(state.rec.filter(r=>ym(r.data||"")===ym(today())).reduce((s,r)=>s+numIn(r.valor),0))} recebido em ${ymLabel(ym(today()))}</span></header>
  ${recs.length?`<div class="tablewrap"><table><thead><tr><th>Data</th><th>Origem</th><th class="hs">Observação</th><th class="r">Valor</th><th></th></tr></thead>
  <tbody>${recs.map(r=>`<tr><td class="mono">${fdate(r.data)}</td><td>${r.origem==="fech"?`Fechamento ${esc(state.fech.find(f=>f.id===r.fechId)?.numero||"(reaberto)")}${r.empresa?` · ${esc(r.empresa)}`:""}`:r.origem==="horas"?`Horas · <span style="text-transform:capitalize">${ymLabel(r.competencia||"2000-01")}</span>${multiEmp?` · ${esc(recEmp(r))}`:""}`:`Orçamento ${esc(state.orc.find(o=>o.id===r.orcId)?.numero||"(excluído)")}`}${r.exemplo?' <span class="pill">Exemplo</span>':""}</td><td class="hs">${esc(r.obs||"")}</td><td class="r mono">${brl(numIn(r.valor))}</td><td><button class="btn sm danger" data-act="delRec" data-id="${esc(r.id)}">Excluir</button></td></tr>`).join("")}</tbody></table></div>`
  :`<div class="empty"><b>Nenhum recebimento registrado</b>Use “Registrar recebimento” quando a empresa ou o cliente pagar.</div>`}</section>`;
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
  if(e.target.id==="pagForm"){ e.preventDefault(); const id = e.target.dataset.id, old = state.pag.find(x=>x.id===id) || {};
    const x = {...old, id: id || (state.pgId ||= uid()), profissional:$("#pg-prof").value, tipo:$("#pg-tipo").value, data:$("#pg-data").value, valor:numIn($("#pg-valor").value), obs:$("#pg-obs").value.trim()};
    if(!id && x.tipo==="pagamento") x.ref = {...state.eqp};
    if(!x.profissional || !(x.valor>0) || !x.data){ toast("Informe funcionário, data e valor."); return; }
    try{ await save("pagamentos", x); state.pgId = null; state.modalDirty = false; closeModal(); render(); toast(`${TIPOS_PAG[x.tipo][0]} de ${brl(x.valor)} para ${x.profissional} salvo.`); }catch(err){ toast(writeErr(err)); } }
  if(e.target.id==="docForm"){ e.preventDefault(); const id = e.target.dataset.id, old = state.docs.find(x=>x.id===id) || {}, btn = e.target.querySelector("[type=submit]");
    const x = {...old, id: id || (state.dcId ||= uid()), tipo:$("#dc-tipo").value, titular:$("#dc-tit").value, emissao:$("#dc-emi").value, validade:$("#dc-val").value, obs:$("#dc-obs").value.trim()};
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

/* ---------- AJUSTES ---------- */
function vAjustes(){
  setTimeout(()=>{ carregarBackups(); carregarLixeira();
    sb.from("perfis").select("*").order("criado_em").then(({data})=>{ if(data && JSON.stringify(data)!==JSON.stringify(state.perfis)){ state.perfis = data; if(state.view==="ajustes" && !state.cfgDirty){ state.rendered = null; render(); } } }).catch(()=>{}); }, 0);
  const c = state.cfg, E = c.empresa; const y = new Date().getFullYear();
  const hol = Object.entries(holidays(y)).sort();
  return `<div class="pagehead"><div><span class="eyebrow">Ajustes</span><h1>Empresa, valores e jornada</h1><p class="muted">Valores novos valem para os próximos apontamentos. Os já lançados mantêm o valor da hora da época.</p><p class="muted" style="margin:0;font-size:.8rem">Versão do app: <b>${VERSAO}</b></p></div></div>
  ${state.mode==="local"?`<div class="banner">Os dados estão sendo salvos só neste navegador. Exporte um backup com frequência.</div>`:""}
  <div class="ajtabs" role="tablist">${[["valores","Valores"],["jornada","Jornada e feriados"],["contratantes","Empresas e unidades"],["empresa","Minha empresa"],["equipe","Equipe e acessos"],["dados","Backup e lixeira"]].map(([k,l])=>`<button type="button" class="chipbtn" role="tab" data-act="ajAba" data-k="${k}" aria-pressed="${(state.ajAba||"valores")===k}">${l}</button>`).join("")}</div>
  <form class="form" id="cfgForm">
    <div class="panel form" data-aba="valores"><h3>Valores da hora</h3>
      <div class="grid3"><label class="field"><span>Valor da hora normal, padrão (R$)</span><input id="c-vh" inputmode="decimal" value="${String(c.valorHora).replace(".",",")}"></label>
      <label class="field"><span>Extra dias úteis e sábado (%)</span><input id="c-p50" type="number" min="0" value="${c.extraPct}"></label>
      <label class="field"><span>Domingo e feriado (%)</span><input id="c-p100" type="number" min="0" value="${c.feriadoPct}"></label></div>
      <p class="muted" style="margin:0">Hora normal ${brl(c.valorHora)} · extra ${brl(c.valorHora*(1+c.extraPct/100))} · domingo/feriado ${brl(c.valorHora*(1+c.feriadoPct/100))}</p>
    </div>
    <div class="panel form" data-aba="jornada"><h3>Jornada normal</h3><p class="muted" style="margin:0">Fora desses horários a hora conta como extra. Deixe em branco o dia sem jornada.</p>
      <div class="tablewrap"><table><thead><tr><th>Dia</th><th>Entrada</th><th>Saída</th></tr></thead><tbody>
      ${[1,2,3,4,5,6].map(d=>`<tr><td>${WD[d]}</td><td><input type="time" id="j-ini-${d}" value="${esc(c.jornada[d]?.ini||"")}" style="border:1px solid var(--line);background:var(--bg);border-radius:6px;padding:4px 6px"></td><td><input type="time" id="j-fim-${d}" value="${esc(c.jornada[d]?.fim||"")}" style="border:1px solid var(--line);background:var(--bg);border-radius:6px;padding:4px 6px"></td></tr>`).join("")}
      <tr><td>Domingo</td><td colspan="2" class="muted">Sempre extra ${c.feriadoPct}%</td></tr></tbody></table></div>
      <label class="check"><input type="checkbox" id="c-carimbo" ${c.carimbo!==false?"checked":""}> Carimbar nas fotos o nº da OS, a unidade, a data e a hora em que a foto foi tirada</label>
      <label class="field" style="max-width:340px"><span>Tolerância (minutos)</span><input id="c-tol" type="number" min="0" max="30" value="${+c.tolerancia||0}"></label>
      <p class="muted" style="margin:0">Minutos antes da entrada ou depois da saída até esse limite contam como hora normal. A CLT admite até 5 minutos por marcação. Use 0 para contar tudo como extra.</p>
      <label class="check"><input type="checkbox" id="c-alm" ${c.almoco.ativo?"checked":""}> Não contar o horário de almoço</label>
      <div class="grid3"><label class="field"><span>Almoço início</span><input type="time" id="c-alm-ini" value="${esc(c.almoco.ini)}"></label><label class="field"><span>Almoço fim</span><input type="time" id="c-alm-fim" value="${esc(c.almoco.fim)}"></label></div>
    </div>
    <div class="panel form" data-aba="jornada"><h3>Feriados</h3><p class="muted" style="margin:0">Feriados nacionais já entram automaticamente. Inclua municipais e estaduais abaixo, um por linha, no formato dd/mm Nome (ou dd/mm/aaaa para um ano só).</p>
      <label class="check"><input type="checkbox" id="c-carn" ${c.feriados.carnaval?"checked":""}> Carnaval (segunda e terça) conta como feriado</label>
      <label class="check"><input type="checkbox" id="c-corp" ${c.feriados.corpus?"checked":""}> Corpus Christi conta como feriado</label>
      <label class="field"><span>Feriados locais</span><textarea id="c-fer" rows="3">${esc(c.feriados.extras)}</textarea></label>
      <details><summary class="muted" style="cursor:pointer">Ver feriados de ${y} (${hol.length})</summary><div class="tablewrap" style="margin-top:8px"><table><tbody>${hol.map(([d,n])=>`<tr><td class="mono">${fdate(d)}</td><td>${WDS[parseYmd(d).getDay()]}</td><td>${esc(n)}</td></tr>`).join("")}</tbody></table></div></details>
    </div>
    <div class="panel form" data-aba="contratantes"><h3>Funcionários, unidades e empresas</h3>
      <div class="grid2"><label class="field"><span>Funcionários (um por linha)</span><textarea id="c-profs" rows="4" placeholder="Ex.: Juliano de Oliveira">${esc(c.profissionais)}</textarea></label>
      <label class="field"><span>Unidades / locais (um por linha)</span><textarea id="c-unids" rows="4" placeholder="Ex.: Uruaçu">${esc(c.unidades)}</textarea></label></div>
      <label class="field"><span>Empresas contratantes (uma por linha; a primeira é a padrão)</span><textarea id="c-emps" rows="3" placeholder="Ex.: Brejeiro">${esc(empresasCfg().join("\n"))}</textarea></label>
      ${profs().length?`<details><summary class="muted" style="cursor:pointer">Renomear um funcionário sem perder o histórico e o acesso</summary>
        <div class="grid3" style="margin-top:8px"><label class="field"><span>Nome atual</span><select id="rn-old">${profs().map(n=>`<option>${esc(n)}</option>`).join("")}</select></label>
        <label class="field"><span>Novo nome</span><input id="rn-new" placeholder="Nome completo"></label>
        <button type="button" class="btn" data-act="renomearProf" style="align-self:end">Renomear</button></div></details>`:""}
      <p class="muted" style="margin:0">Funcionários, unidades e empresas aparecem como filtros e na opção “Separar por” em Horas, Relatórios e Painel. Ao apontar uma OS feita por mais de um funcionário, marque todos e o sistema cria um apontamento para cada.</p>
    </div>

    <div class="panel form" data-aba="valores"><h3>Custo da equipe e valor da hora por empresa</h3>
      <p class="muted" style="margin:0">O custo da equipe é usado só no Painel para mostrar o lucro. Nunca aparece nos relatórios enviados.</p>
      <div class="tablewrap"><table class="inputs"><thead><tr><th>Funcionário</th><th>Como você paga</th><th>Valor (R$)</th></tr></thead><tbody>
      ${profs().map(n=>{ const cu=(c.custos||{})[n]||{}; return `<tr data-cu="${esc(n)}"><td>${esc(n)}</td><td><select class="cu-t" aria-label="Forma de pagamento de ${esc(n)}"><option value="hora" ${cu.tipo!=="mes"?"selected":""}>Por hora</option><option value="mes" ${cu.tipo==="mes"?"selected":""}>Salário mensal</option></select></td><td><input class="cu-v" inputmode="decimal" aria-label="Valor pago a ${esc(n)}" value="${cu.valor!=null?String(cu.valor).replace(".",","):""}" placeholder="0,00"></td></tr>`; }).join("") || `<tr><td colspan="3" class="muted">Cadastre os funcionários acima e salve para preencher os custos.</td></tr>`}
      </tbody></table></div>
      <p class="muted" style="margin:0">Por hora: a hora extra do funcionário usa os mesmos adicionais (${c.extraPct}% e ${c.feriadoPct}%). Salário mensal: o custo da hora é o salário dividido por ${HORAS_MES} horas (padrão da CLT), com os mesmos adicionais nas extras.</p>
      <div class="tablewrap"><table class="inputs"><thead><tr><th>Empresa</th><th>Valor da hora (R$)</th><th>Extra (%)</th><th>Domingo e feriado (%)</th><th>Adicional noturno (%)</th></tr></thead><tbody>
      ${empresasCfg().map(n=>{ const t=(c.taxas||{})[n]||{}; return `<tr data-tx="${esc(n)}"><td>${esc(n)}</td><td><input class="tx-v" inputmode="decimal" aria-label="Valor da hora de ${esc(n)}" value="${t.valorHora!=null?String(t.valorHora).replace(".",","):""}" placeholder="${String(c.valorHora).replace(".",",")}"></td><td><input class="tx-p50" type="number" min="0" aria-label="Extra de ${esc(n)}" value="${t.extraPct??""}" placeholder="${c.extraPct}"></td><td><input class="tx-p100" type="number" min="0" aria-label="Domingo e feriado de ${esc(n)}" value="${t.feriadoPct??""}" placeholder="${c.feriadoPct}"></td><td><input class="tx-not" type="number" min="0" aria-label="Adicional noturno de ${esc(n)}" value="${t.noturnoPct??""}" placeholder="${c.noturnoPct||0}" title="Horas entre 22h e 5h: acréscimo sobre o valor da hora"></td></tr>`; }).join("") || `<tr><td colspan="5" class="muted">Cadastre as empresas acima e salve.</td></tr>`}
      </tbody></table></div>
      <div class="row">${empresasCfg().map(n=>`<button type="button" class="btn sm" data-act="reajuste" data-emp="${esc(n)}">Reajustar ${esc(n)}${(c.taxas||{})[n]?.desde?` (desde ${fdate(c.taxas[n].desde)})`:""}</button>`).join("")}</div>
      <p class="muted" style="margin:0">Em branco usa o valor padrão (${brl(c.valorHora)}, ${c.extraPct}% e ${c.feriadoPct}%). Valores novos valem para os próximos lançamentos; os já lançados mantêm o valor da época.</p>
    </div>
    <div class="panel form" data-aba="contratantes"><div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">Ficha das contratantes</h3><button type="button" class="btn sm" data-act="novaEmpresa">+ Nova empresa</button></div>
      <p class="muted" style="margin:0">Aparece no PDF (razão social, CNPJ e quem assina o visto) e define o período de medição e o prazo de pagamento.</p>
      ${empresasCfg().map(n=>{ const F=(c.contratantes||{})[n]||{}; return `<details class="fichabox" data-ct="${esc(n)}" ${empresasCfg().length===1?"open":""}><summary><b>${esc(n)}</b>${F.cnpj?` <span class="muted">· ${esc(F.cnpj)}</span>`:""}</summary>
        <div class="grid2" style="margin-top:8px">
          <label class="field"><span>Razão social</span><input class="ct-razao" value="${esc(F.razao||"")}" placeholder="${esc(n)}"></label>
          <label class="field"><span>CNPJ</span><input class="ct-cnpj" value="${esc(F.cnpj||"")}" inputmode="numeric" placeholder="00.000.000/0000-00"></label>
          <label class="field"><span>Código da GAAP nesta empresa (campo EMPRESA do fechamento)</span><input class="ct-cod" value="${esc(F.codigo||"")}" inputmode="numeric" placeholder="Ex.: 4505036"></label>
          <label class="field"><span>Nome no fechamento (NOME DA EMPRESA)</span><input class="ct-nomef" value="${esc(F.nomeFech||"")}" placeholder="Ex.: ALAN CARDOSO - GAAP"></label>
          <label class="field"><span>Quem aprova as horas (assina o visto)</span><input class="ct-apr" value="${esc(F.aprovador||"")}" placeholder="Nome"></label>
          <label class="field"><span>Cargo</span><input class="ct-cargo" value="${esc(F.cargo||"")}" placeholder="Ex.: Supervisor de manutenção"></label>
          <label class="field"><span>WhatsApp do aprovador</span><input class="ct-whats" value="${esc(F.whats||"")}" inputmode="tel" placeholder="(62) 9 0000-0000"></label>
          <label class="field"><span>E-mail do aprovador</span><input class="ct-email" value="${esc(F.email||"")}" inputmode="email"></label>
          <label class="field"><span>Dia de corte da medição (0 = mês fechado)</span><input class="ct-corte" type="number" min="0" max="28" value="${F.corte||0}"></label>
          <label class="field"><span>Prazo de pagamento (dias após o envio)</span><input class="ct-prazo" type="number" min="0" max="180" value="${F.prazo??30}"></label>
        </div>
        <label class="field" style="margin-top:8px"><span>Lista de OS abertas (cole a lista que a empresa manda: uma por linha, "número;serviço;unidade")</span><textarea class="ct-oslista" rows="4" placeholder="Ex.:&#10;2217864;BOMBA DO REATOR;1001 - ANÁPOLIS&#10;2217901;TROCAR ROLAMENTO ELEVADOR 5;1008 - URUAÇU">${esc(F.osLista||"")}</textarea></label>
        <label class="field" style="margin-top:8px"><span>Unidades desta empresa (uma por linha) — aparecem para escolher ao lançar</span><textarea class="ct-unids" rows="5" placeholder="Ex.:&#10;1001 - ANÁPOLIS&#10;1008 - URUAÇU">${esc(F.unidades||"")}</textarea></label>
        <label class="check"><input type="checkbox" class="ct-exos" ${F.exigirOS?"checked":""}> Exigir nº da OS em todo lançamento</label>
      </details>`; }).join("")}
    </div>
    <div class="panel form" data-aba="empresa"><h3>Dados da empresa (aparecem nos PDFs)</h3>
      <div class="grid2"><label class="field"><span>Nome</span><input id="e-nome" value="${esc(E.nome)}"></label><label class="field"><span>CNPJ</span><input id="e-cnpj" value="${esc(E.cnpj)}"></label>
      <label class="field"><span>E-mail</span><input id="e-email" value="${esc(E.email)}"></label><label class="field"><span>Telefone</span><input id="e-tel" value="${esc(E.telefone)}"></label>
      <label class="field"><span>Código do serviço na NF (LC 116)</span><input id="e-codserv" value="${esc(E.codServico||"14.01")}" placeholder="14.01"></label><label class="field"><span>Alíquota do ISS (%)</span><input id="e-iss" inputmode="decimal" value="${esc(E.issPct??"")}" placeholder="Ex.: 3"></label>
      <label class="field"><span>Cidade</span><input id="e-cid" value="${esc(E.cidade)}"></label><label class="field"><span>Responsável técnico (assinatura)</span><input id="e-resp" value="${esc(E.responsavel)}"></label></div>
      <label class="field"><span>Quem somos</span><textarea id="e-sobre" rows="5">${esc(E.sobre)}</textarea></label>
    </div>
    <div class="row cfg-salvar" data-aba="valores jornada contratantes empresa" style="justify-content:flex-end"><span class="muted cfg-aviso" id="cfg-aviso" hidden>Alterações não salvas</span><button class="btn primary" type="submit">Salvar ajustes</button></div>
  </form>
  <section class="section" id="equipe-acessos" data-aba="equipe"><header><h2>Equipe e celulares</h2></header>
    ${lembretesHtml()}
    <div class="panel form" id="acessos"><h3>Acessos</h3>
      <p class="muted" style="margin:0">Cada pessoa entra com o próprio e-mail e senha. Quem criar conta aparece aqui como “Aguardando”: escolha qual funcionário é e toque em Liberar. O funcionário só vê as próprias OS, sem valores.</p>
      <div class="tablewrap"><table class="inputs cards-sm"><thead><tr><th>E-mail</th><th>Situação</th><th>Acesso</th><th></th></tr></thead><tbody>
      ${state.perfis.map(p=>{ const eu = p.user_id===session?.user?.id; const st = {dono:['good','Responsável'],funcionario:['good','Liberado'],pendente:['warn','Aguardando'],bloqueado:['bad','Bloqueado']}[p.papel]||['','?'];
        return `<tr data-uid="${esc(p.user_id)}"><td>${esc(p.email)}${eu?' <b>(você)</b>':""}</td><td><span class="pill ${st[0]}">${st[1]}</span></td>
        <td>${eu ? "—" : `<div class="pf-box"><select class="pf-papel" aria-label="Tipo de acesso de ${esc(p.email)}"><option value="funcionario" ${p.papel!=="dono"?"selected":""}>Funcionário (só as próprias OS)</option><option value="dono" ${p.papel==="dono"?"selected":""}>Responsável (vê tudo)</option></select>
          <input class="pf-nome" list="pf-profs" value="${esc(p.nome||"")}" placeholder="Nome (ex.: Juliano de Oliveira)" aria-label="Nome de ${esc(p.email)}"></div>`}</td>
        <td>${eu ? "" : `<span class="row" style="flex-wrap:nowrap"><button type="button" class="btn sm primary" data-act="perfilLiberar" data-uid="${esc(p.user_id)}">${p.papel==="pendente"||p.papel==="bloqueado"?"Liberar":"Salvar"}</button>${p.papel!=="bloqueado"?`<button type="button" class="btn sm danger" data-act="perfilBloquear" data-uid="${esc(p.user_id)}">Bloquear</button>`:""}</span>`}</td></tr>`; }).join("") || `<tr><td colspan="4" class="muted">Ninguém além de você ainda.</td></tr>`}
      </tbody></table></div><datalist id="pf-profs">${profs().map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
      <p class="muted" style="margin:0">Para a equipe entrar: mande o endereço do sistema; cada um toca em “Criar conta” e aparece aqui para você liberar. Ao liberar, o e-mail da pessoa já fica confirmado (não precisa achar o e-mail do Supabase).</p>
    </div>
  </section>
  <section class="section" id="lixeira" data-aba="dados"><header><h2>Lixeira</h2></header>
    <div class="panel form"><p class="muted" style="margin:0">Tudo o que foi excluído nos últimos 90 dias, por você ou pelos funcionários. Toque em Restaurar para trazer de volta.</p><div id="lx-list" class="muted">Carregando…</div>
    <div class="row" id="lx-acts" hidden><button type="button" class="btn danger" data-act="lixoEsvaziar">Esvaziar lixeira</button><span class="muted" style="font-size:.85rem">Apaga de vez tudo o que está na lixeira e as fotos dessas OS. Não dá para desfazer.</span></div></div>
  </section>
  <section class="section" id="backup" data-aba="dados"><header><h2>Backup</h2></header>
    <div class="panel form"><h3>Cópia completa para guardar fora (recomendado toda semana)</h3>
      <p class="muted" style="margin:0">Baixa um arquivo .zip com todos os dados <b>e as fotos</b>. Guarde no iCloud Drive, Google Drive ou no computador. Se um dia perder o sistema, é com ele que tudo volta.</p>
      <p style="margin:0">${backupIdade()}</p>
      <div class="row"><button class="btn primary" data-act="backupZip">${state.cfg.fotosAte?"Baixar backup (dados + fotos novas)":"Baixar backup completo (.zip)"}</button>${state.cfg.fotosAte?`<button class="btn" data-act="backupZip" data-todas="1">Todas as fotos de novo</button>`:""}<button class="btn" data-act="exportJson">Só os dados (.json)</button></div>
      <p class="muted" style="margin:0" id="storage-uso"></p>
    </div>
    <div class="panel form"><h3>Cópias automáticas no servidor</h3>
      <p class="muted" style="margin:0">Todo dia às 03:00 o sistema guarda uma cópia dos dados (sem as fotos) e mantém os últimos 30 dias. Serve para desfazer um erro, por exemplo uma exclusão por engano.</p>
      <div id="bk-list" class="muted">Carregando cópias…</div>
      <div class="row"><button class="btn" data-act="backupAgora">Fazer uma cópia agora</button></div>
    </div>
    <div class="panel form"><h3>Restaurar</h3>
      <p class="muted" style="margin:0">Importe um backup (.zip ou .json). Registros com o mesmo código são substituídos; os demais continuam como estão.</p>
      <div class="row"><label class="btn" for="imp">Importar backup</label><input type="file" id="imp" accept="application/json,.json,application/zip,.zip" hidden></div>
    </div>
  </section>`;
}
function backupDados(){ return {sistema:"GAAP Gestão de Serviços", versao:2, exportadoEm:new Date().toISOString(), config:state.cfg, apontamentos:state.ap, orcamentos:state.orc, recebimentos:state.rec, fechamentos:state.fech, despesas:state.desp, pagamentos:state.pag, equipamentos:state.eq, documentos:state.docs, perfis:state.perfis||[]}; }
function backupIdade(){
  const b = state.cfg.backupBaixadoEm; if(!b) return `<span class="pill warn">Você ainda não baixou nenhuma cópia completa.</span>`;
  const dias = Math.floor((Date.now() - new Date(b).getTime())/86400000);
  return `<span class="pill ${dias>7?"warn":"good"}">Última cópia completa: ${new Date(b).toLocaleDateString("pt-BR")} (${dias===0?"hoje":dias===1?"ontem":`há ${dias} dias`})</span>`;
}
async function carregarBackups(){
  sb.rpc("uso_storage").then(({data})=>{ const el = $("#storage-uso"); if(!el || !data) return; const mb = (+data.bytes||0)/1048576, pct = Math.round(mb/10.24);
    el.innerHTML = `Fotos guardadas: <b>${data.arquivos||0}</b> · ${mb.toFixed(0)} MB de 1.024 MB do plano gratuito (${pct}%)${pct>=80?' <span class="pill warn">Quase cheio</span>':""}`; });
  const box = $("#bk-list"); if(!box) return;
  const {data, error} = await sb.rpc("listar_backups");
  if(!$("#bk-list")) return;
  if(error){ box.textContent = "Não consegui carregar as cópias automáticas."; return; }
  if(!data || !data.length){ box.textContent = "Nenhuma cópia ainda. A primeira é feita hoje de madrugada."; return; }
  box.classList.remove("muted");
  box.innerHTML = `<div class="bk-list">${data.map(b=>`<div class="bk-item"><span><b class="mono">${new Date(b.criado_em).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</b><small class="muted">${b.origem==="automatico"?"Automática":"Manual"} · ${b.registros} registro${b.registros===1?"":"s"}</small></span><button class="btn sm" data-act="backupBaixar" data-slot="${b.slot}">Baixar</button></div>`).join("")}</div>`;
}
async function importarDados(d, fotos){
  if(!d || !Array.isArray(d.apontamentos)) throw new Error("formato");
  // só entra o que não existe hoje; o que já existe fica como está (é mais novo ou igual)
  const plano = {}; let novos = 0, mantidos = 0, conflitos = 0;
  for(const col of COLS){
    const atuais = new Map(state[KEY[col]].map(x=>[x.id, x]));
    plano[col] = (d[col]||[]).filter(r=>{ if(!r || !r.id || !/^[A-Za-z0-9_-]{1,64}$/.test(r.id)) return false;
      if(atuais.has(r.id)){ mantidos++; return false; }
      if(col==="fechamentos" && fechConflict(r.de, r.ate, r.empresa||"", r.profissional||"")){ conflitos++; return false; }
      novos++; return true; });
  }
  if(!confirm(`Backup de ${d.exportadoEm?new Date(d.exportadoEm).toLocaleString("pt-BR"):"data desconhecida"}:\n• ${novos} registro(s) que não existem hoje serão restaurados\n• ${mantidos} que já existem ficam como estão (não voltam para a versão antiga)${conflitos?`\n• ${conflitos} fechamento(s) ignorado(s): o período já tem outro fechamento`:""}${fotos?`\n• ${fotos.length} foto(s)`:""}\nAntes, uma cópia do estado atual é guardada no servidor. Continuar?`)) return false;
  try{ await sb.rpc("fazer_backup", {p_origem:"pre-importacao"}); }catch(err){}
  let n = 0, nf = 0;
  for(const f of (fotos||[])){
    const {error} = await sb.storage.from("fotos").upload(f.path, f.blob, {contentType:f.type, upsert:true});
    if(!error) nf++; if(nf%10===0) toast(`Enviando fotos… ${nf} de ${fotos.length}`);
  }
  if(d.config){ const atual = clone(state.cfg); delete atual._v; await saveCfg(deepMerge(deepMerge(DEFAULT_CFG, d.config), atual)); }
  for(const col of ["fechamentos", ...COLS.filter(c=>c!=="fechamentos")]){ await saveMany(col, plano[col]); n += plano[col].length; toast(`Importando… ${n} de ${novos}`); }
  await loadOwner(); state.rendered = null; render();
  toast(`Backup importado: ${n} registro(s) restaurado(s), ${mantidos} mantido(s)${fotos?`, ${nf} foto(s)`:""}.`);
  return true;
}
const JSZIP = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
async function submitCfg(){
  const g = id => $("#"+id).value;
  const c = clone(state.cfg);
  c.valorHora = numIn(g("c-vh")) || 60; c.extraPct = +g("c-p50") || 0; c.feriadoPct = +g("c-p100") || 0;
  [1,2,3,4,5,6].forEach(d=>c.jornada[d] = {ini:g("j-ini-"+d), fim:g("j-fim-"+d)});
  c.almoco = {ativo:$("#c-alm").checked, ini:g("c-alm-ini"), fim:g("c-alm-fim")};
  c.tolerancia = Math.max(0, +g("c-tol") || 0); c.carimbo = !!$("#c-carimbo")?.checked;
  c.profissionais = lines(g("c-profs")).join("\n"); c.unidades = lines(g("c-unids")).join("\n");
  c.feriados = {carnaval:$("#c-carn").checked, corpus:$("#c-corp").checked, extras:g("c-fer")};
  c.empresa = {nome:g("e-nome"), cnpj:g("e-cnpj"), email:g("e-email"), telefone:g("e-tel"), cidade:g("e-cid"), responsavel:g("e-resp"), sobre:g("e-sobre"), codServico:g("e-codserv"), issPct:g("e-iss")};
  c.custos = {}; document.querySelectorAll("[data-cu]").forEach(tr=>{ const v = numIn(tr.querySelector(".cu-v").value); if(v>0) c.custos[tr.dataset.cu] = {tipo:tr.querySelector(".cu-t").value, valor:v}; });
  c.contratantes = {}; document.querySelectorAll("[data-ct]").forEach(el=>{ const q = k=>el.querySelector(k);
    c.contratantes[el.dataset.ct] = {razao:q(".ct-razao").value.trim(), cnpj:q(".ct-cnpj").value.trim(), aprovador:q(".ct-apr").value.trim(), cargo:q(".ct-cargo").value.trim(), whats:q(".ct-whats").value.trim(), email:q(".ct-email").value.trim(), corte:Math.min(28,Math.max(0,+q(".ct-corte").value||0)), prazo:Math.max(0,+q(".ct-prazo").value||0), exigirOS:q(".ct-exos").checked, unidades:lines(q(".ct-unids").value).join("\n"), codigo:q(".ct-cod").value.trim(), nomeFech:q(".ct-nomef").value.trim(), osLista:lines(q(".ct-oslista").value).join("\n")}; });
  const txAnt = c.taxas || {}; c.taxas = {}; document.querySelectorAll("[data-tx]").forEach(tr=>{ const q = k=>tr.querySelector(k).value.trim(), a = txAnt[tr.dataset.tx] || {}, t = {}; if(q(".tx-v")) t.valorHora = numIn(q(".tx-v")); if(q(".tx-p50")!=="") t.extraPct = +q(".tx-p50"); if(q(".tx-p100")!=="") t.feriadoPct = +q(".tx-p100"); if(q(".tx-not")!=="") t.noturnoPct = +q(".tx-not");
    if(a.desde){ t.desde = a.desde; t.historico = a.historico || []; } // a vigência do reajuste continua valendo
    if(Object.keys(t).length) c.taxas[tr.dataset.tx] = t; });
  const emps = lines(g("c-emps")), oldDef = state.cfg.contratante || "";
  c.empresas = emps.join("\n"); c.contratante = emps[0] || "";
  try{
    if(oldDef && c.contratante !== oldDef){ const {error} = await sb.rpc("aplicar_empresa_padrao", {p_emp:oldDef}); if(error) throw dbErr(error); await loadOwner(); }
    await saveCfg(c); state.cfgDirty = false; state.cfg = deepMerge(DEFAULT_CFG,c); holCache={}; calcCache = new WeakMap(); toast("Ajustes salvos"); state.rendered=null; render(); }
  catch(err){ toast(writeErr(err)); }
}
document.addEventListener("change", async e=>{
  if(e.target.id!=="imp" || !e.target.files[0]) return;
  const file = e.target.files[0];
  try{
    if(/\.zip$/i.test(file.name) || file.type==="application/zip"){
      if(!window.JSZip) await loadScript(JSZIP);
      const z = await JSZip.loadAsync(file), j = z.file("backup.json");
      if(!j) throw new Error("formato");
      const d = JSON.parse(await j.async("string")), fotos = [];
      for(const name of Object.keys(z.files).filter(n=>n.startsWith("fotos/") && !z.files[n].dir)){
        const path = name.slice(6), ext = path.split(".").pop().toLowerCase();
        fotos.push({path, blob: await z.file(name).async("blob"), type: ext==="png"?"image/png":ext==="webp"?"image/webp":ext==="gif"?"image/gif":"image/jpeg"});
      }
      await importarDados(d, fotos);
    } else await importarDados(JSON.parse(await file.text()));
  }catch(err){ toast(err && err.code==="db" ? writeErr(err) : "Arquivo inválido. Use um backup exportado por este sistema."); }
  e.target.value = "";
});

/* ---------- actions ---------- */
const A = {
  nav(b){ if(state.view==="ajustes" && state.cfgDirty && b.dataset.view!=="ajustes"){ if(!b.dataset.armed){ b.dataset.armed="1"; toast("Há alterações não salvas em Ajustes. Toque em Salvar ajustes, ou toque de novo para sair sem salvar."); setTimeout(()=>delete b.dataset.armed,4000); return; } state.cfgDirty=false; }
    if(state.view==="orcEdit" && state.orcDirty && b.dataset.view!=="orcEdit"){ if(!b.dataset.armed){ b.dataset.armed="1"; toast("Há alterações não salvas no orçamento. Toque de novo para sair sem salvar."); setTimeout(()=>delete b.dataset.armed,4000); return; } } state.orcDirty=false; state.view=b.dataset.view; state.rendered=null; render(); window.scrollTo(0,0); if(state.view!=="painel") voltar.empilhar("tela"); else voltar.desempilhar("tela"); },
  month(b){ state.month = shiftYm(state.month, +b.dataset.d); render(); },
  newDay(){ dayOpen(state.view==="horas" && ym(today())!==state.month ? state.month+"-01" : today()); },
  dayAdd(){ const d=state.day, last=d.rows[d.rows.length-1]; const r=blankRow(); r.ini = last&&last.fim ? nextStart(last.fim) : ""; d.rows.push(r); renderDayRows(); updateDay(); const os=document.querySelectorAll('#d-rows [data-f="os"]'); os[os.length-1]?.focus(); },
  dayDel(b){ const d=state.day, r=d.rows[+b.dataset.r]; if(r && (r.os||r.desc||r.fim) && !b.dataset.armed){ b.dataset.armed="1"; b.textContent="?"; b.title="Toque de novo para remover"; toast("Toque de novo no ✕ para remover esta OS."); setTimeout(()=>{ if(b.isConnected){ delete b.dataset.armed; b.textContent="✕"; } }, 4000); return; }
    d.rows.splice(+b.dataset.r,1); if(!d.rows.length) d.rows.push(blankRow()); renderDayRows(); updateDay(); },
  dayPreset(b){ $("#d-sp-ini").value=b.dataset.a; $("#d-sp-fim").value=b.dataset.b; },
  daySplit(){ const d=state.day, a=hm($("#d-sp-ini").value), b0=hm($("#d-sp-fim").value), n=Math.max(1,Math.min(12,parseInt($("#d-sp-n").value)||1));
    if(a==null||b0==null||a===b0){ toast("Informe o início e o fim do período."); return; }
    const b = b0<=a ? b0+1440 : b0, dur=b-a, t=x=>{ x%=1440; return `${pad(Math.floor(x/60))}:${pad(x%60)}`; };
    d.rows = d.rows.filter(r=>r.os||r.desc||r.fim);
    for(let k=0;k<n;k++){ const r=blankRow(); r.ini=t(a+Math.round(k*dur/n)); r.fim=t(a+Math.round((k+1)*dur/n)); d.rows.push(r); }
    d.rows.sort((x,y)=>(x.ini||"99").localeCompare(y.ini||"99"));
    renderDayRows(); updateDay();
    const nx = dayPresets(d.data).find(p=>hm(p[1])>=b0); if(nx){ $("#d-sp-ini").value=nx[1]; $("#d-sp-fim").value=nx[2]; }
    const first = d.rows.findIndex(r=>!r.os); document.querySelectorAll('#d-rows [data-f="os"]')[first]?.focus(); },
  newAp(){ const last = [...state.ap].filter(e=>e.data===today()).sort((a,b)=>b.fim.localeCompare(a.fim))[0]; openModal(apForm({data:today(), inicio:last?last.fim:"07:00", fim:"", cliente:last?last.cliente:""})); updateApPreview(); },
  editAp(b){ const e = state.ap.find(x=>x.id===b.dataset.id); if(!e) return; const lk = lockedE(e); if(lk){ toast(lockMsg(lk)); return; } openModal(apForm(e)); updateApPreview(); },
  dupAp(){ const e = readApForm(); delete e.id; delete e.exemplo; delete e.valorHora; delete e.extraPct; delete e.feriadoPct; e.data = today(); openModal(apForm(e)); updateApPreview(); },
  async delAp(b){ if(!b.dataset.armed){ b.dataset.armed="1"; b.textContent="Confirmar exclusão"; return; } const e = state.ap.find(x=>x.id===b.dataset.id); if(!e) return; const lk = lockedE(e); if(lk){ toast(lockMsg(lk)); return; } try{ await removeAp(e); closeModal(); toastAcao(`OS ${e.os||"s/n"} excluída.`, "Desfazer", async ()=>{ const r = {...e}; delete r.excluido; delete r._v; await save("apontamentos", r); toast("Exclusão desfeita."); }); }catch(err){ toast(writeErr(err)); } },
  fotoDel(b){ state.apFotos = (state.apFotos||[]).filter(x=>x!==b.dataset.id); const box=$("#f-thumbs"); if(box) box.innerHTML = thumbs(state.apFotos, true); },
  async fotoVer(b){ await assinarFotos([b.dataset.id]); const src = blobSrc(b.dataset.id);
    let v = $("#fotoview"); if(!v){ v = document.createElement("div"); v.id = "fotoview"; v.className = "modal fotoview"; document.body.appendChild(v); }
    voltar.empilhar("foto"); v.innerHTML = `<div class="sheet wide" role="dialog" aria-modal="true"><header><h2>Foto${fotoTipo(b.dataset.id)?` · ${fotoTipo(b.dataset.id)}`:""}</h2><button class="iconbtn" data-act="fotoVoltar" aria-label="Fechar">✕</button></header><img src="${esc(src)}" alt="Foto do serviço" style="width:100%;border-radius:8px"></div>`; v.hidden = false; },
  fotoVoltar(){ const v = $("#fotoview"); if(v && !v.hidden){ v.hidden = true; v.innerHTML = ""; voltar.desempilhar("foto"); } },
  now(b){ $("#"+b.dataset.t).value = nowHM(); updateApPreview(); },
  closeModal(){ tryCloseModal(); },
  repModo(b){ state.rep.modo = b.dataset.m; render(); },
  repPdf, repXlsx,
  repPreset(b){ const r=state.rep, t=today();
    if(b.dataset.p==="med" || b.dataset.p==="medAnt"){ const m = medicao(r.f.emp!==ALL?r.f.emp:"", b.dataset.p==="med"?0:-1); if(m){ [r.de, r.ate] = m; if(r.ate>t && b.dataset.p==="med") r.ate = t; } render(); return; }
    if(b.dataset.p==="mes"){ r.de=ym(t)+"-01"; r.ate=t; } else { const m=shiftYm(ym(t),-1); const [yy,mm]=m.split("-").map(Number); r.de=m+"-01"; r.ate=`${m}-${pad(new Date(yy,mm,0).getDate())}`; } render(); },
  repCopy(){ const rows=repRows(); if(!rows.length){ toast("Nenhum apontamento nesse período."); return; } copyText(repText()); },
  orcFilter(b){ state.orcFilter = b.dataset.f; render(); },
  pby(b){ state.pby = b.dataset.k; render(); },
  hmode(b){ state.hmode = b.dataset.m; render(); },
  fechAbrir(){ openModal(fechFormHtml()); updateFech(); },
  terceirosPdf(b){ const f = state.fech.find(x=>x.id===b.dataset.id); if(f) fechTerceiros(f, "pdf"); },
  terceirosXlsx(b){ const f = state.fech.find(x=>x.id===b.dataset.id); if(f) fechTerceiros(f, "xlsx"); },
  fechPdfBtn(b){ const f = state.fech.find(x=>x.id===b.dataset.id); if(f) fechPdf(f, !!b.dataset.atual); },
  newDesp(){ state.dpId = null; openModal(despForm({})); },
  editDesp(b){ const x = state.desp.find(d=>d.id===b.dataset.id); if(x){ state.dpId = null; openModal(despForm(x)); } },
  async delDesp(b){ if(!b.dataset.armed){ b.dataset.armed="1"; b.textContent="Confirmar exclusão"; return; } const lk = state.fech.find(f=>(f.despIds||[]).includes(b.dataset.id)); if(lk){ toast(`Essa despesa está no fechamento ${lk.numero}.`); return; } const x = state.desp.find(d=>d.id===b.dataset.id); try{ await removeDoc("despesas", b.dataset.id); closeModal(); toastAcao("Despesa excluída.", "Desfazer", async ()=>{ const y = {...x}; delete y._v; await save("despesas", y); toast("Exclusão desfeita."); }); }catch(err){ toast(writeErr(err)); } },
  irFechar(b){ state.view = "relatorios"; state.rep = {...state.rep, modo:"periodo", de:b.dataset.de, ate:b.dataset.ate || ymd(addDays(parseYmd(today()),-1))}; state.rendered = null; render(); setTimeout(()=>{ openModal(fechFormHtml()); updateFech(); }, 30); },
  async fechCobrar(b){
    const f = state.fech.find(x=>x.id===b.dataset.id); if(!f) return;
    const F = ficha(f.empresa||state.cfg.contratante||""), d = diasEntre(fechVenc(f), today()), w = (F.whats||"").replace(/\D/g,"");
    const msg = `Olá${F.aprovador?" "+F.aprovador.split(" ")[0]:""}, tudo bem?\nSegue a posição do fechamento *${f.numero}* (${fdate(f.de)} a ${fdate(f.ate)})${f.empresa?` - ${f.empresa}`:""}:\n• Valor: ${brl(fechDevido(f))}${fechRecebido(f)?`\n• Já recebido: ${brl(fechRecebido(f))}`:""}\n• Saldo: *${brl(fechSaldo(f))}*\n• Vencimento: ${fdate(fechVenc(f))}${d>0?` (vencido há ${d} dia${d>1?"s":""})`:""}${f.nf?.numero?`\n• Nota fiscal: ${f.nf.numero}`:""}\nPode me confirmar a previsão de pagamento?\nObrigado!\n${state.cfg.empresa.nome}`;
    window.open(`https://wa.me/${w?(w.length<=11?"55"+w:w):""}?text=${encodeURIComponent(msg)}`, "_blank");
    try{ await save("fechamentos", {...f, cobrancas:[...(f.cobrancas||[]), today()]}); }catch(err){}
  },
  fechNF(b){ const f = state.fech.find(x=>x.id===b.dataset.id); if(!f) return; const nf = f.nf||{};
    openModal(`<header><h2>Nota fiscal · ${esc(f.numero)}</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
    <form class="form" id="nfForm" data-id="${esc(f.id)}">
      <div class="grid2"><label class="field"><span>Nº da NF</span><input id="nf-num" value="${esc(nf.numero||"")}" inputmode="numeric"></label>
      <label class="field"><span>Data de emissão</span><input type="date" id="nf-data" value="${esc(nf.data||"")}"></label>
      <label class="field"><span>Situação</span><select id="nf-st">${[["emitir","A emitir"],["emitida","Emitida"],["cancelada","Cancelada"]].map(([k,l])=>`<option value="${k}" ${(nf.status||(nf.numero?"emitida":"emitir"))===k?"selected":""}>${l}</option>`).join("")}</select></label>
      <label class="field"><span>Vencimento do pagamento</span><input type="date" id="nf-venc" value="${esc(fechVenc(f))}"></label></div>
      <div class="field"><span>Texto para a nota (discriminação do serviço)</span><textarea id="nf-txt" rows="7" readonly>${esc(nfTexto(f))}</textarea></div>
      <footer><button type="button" class="btn" data-act="nfCopiar">Copiar texto</button><button class="btn primary" type="submit">Salvar</button></footer>
    </form>`); },
  nfCopiar(){ copyText($("#nf-txt").value); },
  fechGlosa(b){ const f = state.fech.find(x=>x.id===b.dataset.id); if(!f) return; const aps = (f.snap?.aps)||fechRows(f.de,f.ate,f.empresa||"",f.profissional||"");
    openModal(`<header><h2>Registrar glosa · ${esc(f.numero)}</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
    <form class="form" id="glosaForm" data-id="${esc(f.id)}">
      <p class="muted" style="margin:0">Use quando a empresa não aceitar parte do fechamento (OS recusada, horário contestado, acordo). O valor glosado sai do saldo a receber.</p>
      <label class="field"><span>OS glosada (opcional)</span><select id="gl-os"><option value="">— valor livre —</option>${aps.map(e=>`<option value="${esc(e.id)}" data-v="${calc(e).valor}">OS ${esc(e.os||"s/n")} · ${fdate(e.data)} ${esc(e.inicio)}–${esc(e.fim)} · ${brl(calc(e).valor)}</option>`).join("")}</select></label>
      <div class="grid2"><label class="field"><span>Valor glosado (R$)</span><input id="gl-v" inputmode="decimal" required></label>
      <label class="field"><span>Motivo</span><select id="gl-mot"><option>Sem nº de OS</option><option>Horário não reconhecido</option><option>OS duplicada</option><option>Fora do contrato</option><option>Acordo / desconto</option><option>Outro</option></select></label></div>
      <label class="field"><span>Observação</span><input id="gl-obs"></label>
      ${(f.glosas||[]).length?`<div class="list">${f.glosas.map((g,i)=>`<div class="item" style="cursor:default"><span>${fdate(g.data)}</span><span>${esc(g.motivo)}${g.os?` · OS ${esc(g.os)}`:""}${g.obs?`<br><small class="muted">${esc(g.obs)}</small>`:""}</span><span><b class="mono">${brl(numIn(g.valor))}</b> <button type="button" class="btn sm danger" data-act="glosaDel" data-id="${esc(f.id)}" data-i="${i}">✕</button></span></div>`).join("")}</div>`:""}
      <footer><span></span><button class="btn primary" type="submit">Registrar glosa</button></footer>
    </form>`); },
  async glosaDel(b){ const f = state.fech.find(x=>x.id===b.dataset.id); if(!f) return; const g = [...(f.glosas||[])]; g.splice(+b.dataset.i,1); try{ await save("fechamentos", {...f, glosas:g}); closeModal(); toast("Glosa removida"); }catch(err){ toast(writeErr(err)); } },
  async fechReabrir(b){ const f = state.fech.find(x=>x.id===b.dataset.id); if(!f) return; if(fechRecebido(f)>0){ toast("Esse fechamento tem recebimento registrado. Exclua o recebimento antes de reabrir."); return; } if(!b.dataset.armed){ b.dataset.armed="1"; b.textContent="Confirmar"; return; } try{ await removeDoc("fechamentos", f.id); toast(`Fechamento ${f.numero} reaberto. As OS podem ser alteradas de novo.`); }catch(err){ toast(writeErr(err)); } },
  osHist(b){ openModal(osHistHtml(b.dataset.os), "wide"); },
  osLancar(b){ const g = osGroups(state.ap.filter(e=>(e.os||"(sem nº)")===b.dataset.os))[0]; const l = g ? g.rows[g.rows.length-1] : {}; closeModal(); dayOpen(today(), {emp:empOf(l)||lastEmp(), orcId:l.orcId||"", row:{os:b.dataset.os==="(sem nº)"?"":b.dataset.os, desc:l.descricao||"", cli:l.cliente||""}}); },
  orcLancar(b){ const o = state.orc.find(x=>x.id===b.dataset.id); if(!o) return; dayOpen(today(), {orcId:o.id, emp:o.cliente?.nome||""}); },
  authModo(b){ state.auth = b.dataset.m; render(); },
  irAcessos(){ state.ajAba = "equipe"; state.view = "ajustes"; state.rendered = null; render(); setTimeout(()=>$("#acessos")?.scrollIntoView({behavior:"smooth"}), 50); },
  async perfilLiberar(b){ const tr = b.closest("tr, .aprovcard"), papel = b.dataset.papel || tr.querySelector(".pf-papel")?.value || "funcionario", nome = (tr.querySelector(".pf-nome")?.value || "").trim(), email = state.perfis.find(p=>p.user_id===b.dataset.uid)?.email || "";
    if(papel==="funcionario" && !nome){ toast("Escreva o nome do funcionário (como aparece nos relatórios)."); tr.querySelector(".pf-nome")?.focus(); return; }
    if(papel==="funcionario" && state.perfis.some(p=>p.user_id!==b.dataset.uid && p.papel==="funcionario" && p.nome===nome)){ toast(`${nome} já está ligado a outro e-mail.`); return; }
    if(papel==="dono" && !b.dataset.armed){ b.dataset.armed = "1"; b.textContent = "Confirmar"; toast(`${email} vai ver tudo: valores, financeiro e ajustes. Toque em Confirmar.`); return; }
    b.disabled = true;
    try{
      if(papel==="funcionario" && !profs().includes(nome)){ const c = clone(state.cfg); c.profissionais = [...profs(), nome].join("\n"); await saveCfg(c); state.cfg = deepMerge(DEFAULT_CFG, c); } // entra na lista de funcionários
      const {error} = await sb.rpc("liberar_acesso", {p_uid:b.dataset.uid, p_papel:papel, p_nome:nome}); if(error) throw dbErr(error);
      state.perfis = state.perfis.map(p=>p.user_id===b.dataset.uid ? {...p, papel, nome:nome||null} : p);
      toast(papel==="dono" ? `${email} agora é responsável e já pode entrar.` : `Acesso liberado para ${nome}. Já pode entrar.`); state.rendered=null; render(); if(state.view==="ajustes") $("#acessos")?.scrollIntoView();
    }catch(err){ b.disabled = false; toast(writeErr(err)); } },
  async perfilBloquear(b){ if(!b.dataset.armed){ b.dataset.armed="1"; b.textContent = b.closest(".aprovcard") ? "Confirmar recusa" : "Confirmar"; return; }
    const {error} = await sb.from("perfis").update({papel:"bloqueado"}).eq("user_id", b.dataset.uid); if(error){ toast(writeErr(dbErr(error))); return; }
    state.perfis = state.perfis.map(p=>p.user_id===b.dataset.uid ? {...p, papel:"bloqueado"} : p); toast(b.closest(".aprovcard") ? "Pedido de cadastro recusado." : "Acesso bloqueado."); state.rendered=null; render(); if(state.view==="ajustes") $("#acessos")?.scrollIntoView(); },
  async reverificar(){ if(session) await boot(); },
  async sair(b){
    const pend = outbox.lista.length + fotosPend.size;
    if(pend){ toast(`Há ${pend} item(ns) feitos sem internet ainda não enviados. Conecte-se e espere o envio antes de sair.`); sincronizar(); return; }
    if(b && !b.dataset.armed){ b.dataset.armed="1"; b.title="Toque de novo para sair"; toast("Toque de novo em Sair para confirmar."); setTimeout(()=>{ if(b) delete b.dataset.armed; }, 4000); return; }
    closeModal();
    try{ if(pushSuportado()){ const reg = await navigator.serviceWorker.getRegistration("/sw.js"); const sub = await reg?.pushManager.getSubscription(); if(sub){ await sb.from("push_inscricoes").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); } } }catch(err){}
    state.pushOn = false; rascunho.limpar(); try{ await idb.del(snap.chave(session.user.id)); }catch(e){} await sb.auth.signOut(); },
  newOrc(){ state.orcDraft = newOrcDraft(); state.orcDirty=false; state.view="orcEdit"; state.rendered=null; render(); window.scrollTo(0,0); },
  editOrc(b){ const o = state.orc.find(x=>x.id===b.dataset.id); if(!o) return; state.orcDraft = deepMerge(newOrcDraft(), clone(o)); state.orcDraft.itens = clone(o.itens||[]); state.orcDirty=false; state.view="orcEdit"; state.rendered=null; render(); window.scrollTo(0,0); },
  addItem(b){ const t=b.dataset.t; const o=state.orcDraft; o.itens.push(t==="mo"?{tipo:"mo",desc:"Mão de obra",un:"h",qtd:"",valor:String(state.cfg.valorHora)}:t==="mat"?{tipo:"mat",desc:"",un:"pç",qtd:"1",valor:""}:{tipo:"srv",desc:"",un:"vb",qtd:"1",valor:""}); $("#items").innerHTML=itemsHtml(o); $("#orcTotals").innerHTML=totalsHtml(o); state.orcDirty=true; const ins=$("#items").querySelectorAll('[data-f="desc"]'); ins[ins.length-1]?.focus(); },
  delItem(b){ const o=state.orcDraft; o.itens.splice(+b.dataset.i,1); $("#items").innerHTML=itemsHtml(o); $("#orcTotals").innerHTML=totalsHtml(o); state.orcDirty=true; },
  async saveOrc(){ if(await saveOrc()){ const h=document.querySelector(".pagehead .eyebrow"); if(h) h.textContent=`Orçamento Nº ${state.orcDraft.numero}`; } },
  async orcPdf(){ if(await saveOrc()) orcPdf(state.orcDraft); },
  dupOrc(){ const o = clone(state.orcDraft); delete o.id; delete o.numero; o.status="rascunho"; o.data=today(); o.titulo = o.titulo ? o.titulo+" (cópia)" : ""; state.orcDraft=o; state.orcDirty=true; state.rendered=null; render(); toast("Cópia criada. Salve para gerar um novo número."); },
  async delOrc(b){ if(!b.dataset.armed){ b.dataset.armed="1"; b.textContent="Confirmar exclusão"; return; } try{ await removeDoc("orcamentos", state.orcDraft.id); state.orcDirty=false; state.view="orcamentos"; state.rendered=null; render(); toast("Orçamento excluído"); }catch(err){ toast(writeErr(err)); } },
  newRec(b){ openModal(recForm({o:b.dataset.o, m:b.dataset.m, e:b.dataset.e, v:b.dataset.v?Math.round(+b.dataset.v*100)/100:"", id:b.dataset.id})); },
  async delRec(b){ if(!b.dataset.armed){ b.dataset.armed="1"; b.textContent="Confirmar"; return; } const x = state.rec.find(r=>r.id===b.dataset.id); try{ await removeDoc("recebimentos", b.dataset.id); toastAcao("Recebimento excluído.", "Desfazer", async ()=>{ const y = {...x}; delete y._v; await save("recebimentos", y); toast("Exclusão desfeita."); }); }catch(err){ toast(writeErr(err)); } },
  async clearExamples(b){ if(!b.dataset.armed){ b.dataset.armed="1"; b.textContent="Confirmar: apagar exemplos"; return; } b.disabled=true; try{ for(const r of state.ap.filter(x=>x.exemplo)) await removeAp(r); for(const col of COLS.slice(1)) for(const r of state[KEY[col]].filter(x=>x.exemplo)) await removeDoc(col, r.id); toast("Exemplos apagados. Pode começar a usar."); }catch(err){ toast(writeErr(err)); } },
  recarregar(){ location.reload(); },
  abrirMapa(b){ window.open(`https://www.google.com/maps?q=${encodeURIComponent(b.dataset.lat)},${encodeURIComponent(b.dataset.lng)}`, "_blank", "noopener"); },
  escSem(b){ state.escIni = ymd(addDays(parseYmd(state.escIni||semanaDe(today())), +b.dataset.d)); state.rendered = null; render(); },
  async escSalvar(b){ const c = clone(state.cfg); c.escala ||= {}; document.querySelectorAll("[data-esc-d]").forEach(s=>{ const d = s.dataset.escD, p = s.dataset.escP; c.escala[d] ||= {}; if(s.value) c.escala[d][p] = s.value; else delete c.escala[d][p]; if(!Object.keys(c.escala[d]).length) delete c.escala[d]; });
    const lim = ymd(addDays(parseYmd(today()), -60)); Object.keys(c.escala).forEach(d=>{ if(d<lim) delete c.escala[d]; }); // guarda só os últimos 2 meses
    b.disabled = true; try{ await saveCfg(c); state.cfg = deepMerge(DEFAULT_CFG, c); toast("Escala salva. Os funcionários já veem no app."); }catch(err){ toast(writeErr(err)); } finally { b.disabled = false; } },
  escCopiar(){ const E = state.cfg.escala || {}, ini = state.escIni||semanaDe(today()); document.querySelectorAll("[data-esc-d]").forEach(s=>{ const ant = ymd(addDays(parseYmd(s.dataset.escD), -7)), v = (E[ant]||{})[s.dataset.escP]; if(v){ if(![...s.options].some(o=>o.value===v)){ const o = document.createElement("option"); o.textContent = v; s.appendChild(o); } s.value = v; } }); toast("Copiado. Confira e toque em Salvar escala."); },
  fechConferir(b){ state.confId = b.dataset.id; const i = $("#conf-arq") || Object.assign(document.createElement("input"), {type:"file", id:"conf-arq", accept:".xlsx,.xls,.pdf,application/pdf", hidden:true}); if(!i.isConnected) document.body.appendChild(i); i.value = ""; i.click(); },
  ajAba(b){ state.ajAba = b.dataset.k; document.body.dataset.ajaba = state.ajAba; document.querySelectorAll('[data-act="ajAba"]').forEach(x=>x.setAttribute("aria-pressed", x===b)); window.scrollTo(0,0); },
  async lixoEsvaziar(b){ const n = (state.lixo||[]).length; if(!n) return;
    if(!b.dataset.armed){ b.dataset.armed = "1"; b.textContent = `Confirmar: apagar ${n} item(ns) de vez`; toast("Tudo o que está na lixeira será apagado para sempre. Toque de novo para confirmar."); setTimeout(()=>{ if(b.isConnected){ delete b.dataset.armed; b.textContent = "Esvaziar lixeira"; } }, 6000); return; }
    b.disabled = true;
    try{ const {data, error} = await sb.rpc("esvaziar_lixeira"); if(error){ if(/esvaziar_lixeira|function|PGRST202/i.test(error.message||"") || error.code==="PGRST202") throw {code:"db", message:"O botão ainda não foi ativado no banco. Peça para rodar a migração 017 (esvaziar lixeira)."}; throw dbErr(error); }
      // fotos que eram só dos itens apagados (não as que continuam em alguma OS ou despesa)
      const usadas = new Set([...state.ap, ...state.desp].flatMap(x=>x.fotos||[])), fotos = (data?.fotos||[]).filter(f=>f && !usadas.has(f));
      if(fotos.length) await sb.storage.from("fotos").remove(fotos).catch(()=>{});
      toast(`Lixeira esvaziada: ${data?.itens||0} item(ns)${fotos.length?` e ${fotos.length} foto(s)`:""} apagados de vez.`); carregarLixeira();
    }catch(err){ b.disabled = false; delete b.dataset.armed; b.textContent = "Esvaziar lixeira"; toast(writeErr(err)); } },
  irAcessos(){ state.ajAba = "equipe"; state.view = "ajustes"; state.rendered = null; render(); voltar.empilhar("tela"); setTimeout(()=>$("#acessos")?.scrollIntoView({block:"start"}), 50); },
  repTerceiros(){ const [de, ate] = repRange(), e = state.rep.f.emp, emp = (e && e!==ALL) ? e : (state.cfg.contratante || "");
    if(!fechRows(de, ate, emp).length){ toast(`Não há OS lançadas de ${fdate(de)} a ${fdate(ate)}${emp?` para ${emp}`:""}. Os meses que vieram das planilhas ficam em “Fechamentos deste período”, logo abaixo.`); return; }
    fechTerceiros({numero:"prévia", de, ate, empresa:emp, competencia:ate.slice(0,7)}, "pdf"); },
  novaEmpresa(){ if(state.cfgDirty){ toast("Salve os ajustes antes de criar uma empresa."); return; }
    openModal(`<header><h2>Nova empresa contratante</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
    <form class="form" id="empForm">
      <label class="field"><span>Nome da empresa</span><input id="ne-nome" required placeholder="Ex.: Caramuru"></label>
      <label class="field"><span>Unidades (uma por linha)</span><textarea id="ne-unids" rows="6" placeholder="Ex.:&#10;2001 - ITUMBIARA&#10;2002 - RIO VERDE"></textarea></label>
      <p class="muted" style="margin:0">Depois você completa razão social, CNPJ, aprovador e prazo em Ajustes → Ficha das contratantes.</p>
      <footer><span></span><button class="btn primary" type="submit">Criar empresa</button></footer></form>`); },
  async instalarApp(){ if(!pedidoInstalar) return; const p = pedidoInstalar; pedidoInstalar = null; try{ await p.prompt(); await p.userChoice; }catch(e){} state.rendered = null; render(); },
  sincronizar(){ if(!navigator.onLine){ toast("Sem internet. Os itens serão enviados sozinhos quando a conexão voltar."); return; } sincronizar(); },
  async fechAprov(b){ const f = state.fech.find(x=>x.id===b.dataset.id); if(!f) return;
    if(f.aprovacao){ const a = f.aprovacao, linhas = (f.snap?.aps||[]);
      openModal(`<header><h2>Aprovação · ${esc(f.numero)}</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
        <p>${a.aprovado?'<span class="pill good">Aprovado</span>':'<span class="pill bad">Contestado</span>'} por <b>${esc(a.nome||"")}</b>${a.cargo?` (${esc(a.cargo)})`:""} em ${new Date(a.em).toLocaleString("pt-BR")}</p>
        ${a.obs?`<p>${esc(a.obs)}</p>`:""}
        ${(a.contestadas||[]).length?`<div class="list">${a.contestadas.map(c=>{ const e = linhas.find(x=>x.id===c.id)||{}; return `<div class="item" style="cursor:default"><span class="mono">${fdate(e.data||"")}</span><span><b>OS ${esc(e.os||"s/n")}</b> ${esc(e.inicio||"")}–${esc(e.fim||"")} · ${esc(e.profissional||"")}<br><small>${esc(c.motivo||"sem motivo")}</small></span><span></span></div>`; }).join("")}</div>`:""}
        <footer><span></span><button class="btn" data-act="closeModal">Fechar</button></footer>`); return; }
    b.disabled = true;
    try{ const {data:token, error} = await sb.rpc("criar_aprovacao", {p_fech:f.id}); if(error) throw dbErr(error);
      const F = ficha(f.empresa||state.cfg.contratante||""), w = (F.whats||"").replace(/\D/g,""), link = `${location.origin}/aprovar#t=${token}`;
      const msg = `Olá${F.aprovador?" "+F.aprovador.split(" ")[0]:""}! Segue a medição *${f.numero}* (${fdate(f.de)} a ${fdate(f.ate)}) da ${state.cfg.empresa.nome} para conferência e aprovação. Pelo link você vê cada OS e pode aprovar ou contestar alguma:\n${link}\nObrigado!`;
      await save("fechamentos", {...f, aprovPedida:today()});
      window.open(`https://wa.me/${w?(w.length<=11?"55"+w:w):""}?text=${encodeURIComponent(msg)}`, "_blank");
      toast("Link de aprovação criado. Ele vale por 30 dias.");
    }catch(err){ toast(writeErr(err)); } finally { b.disabled = false; } },
  reajuste(b){ const emp = b.dataset.emp, T = rateFor(emp);
    openModal(`<header><h2>Reajuste · ${esc(emp)}</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
    <form class="form" id="reajForm" data-emp="${esc(emp)}">
      <p class="muted" style="margin:0">Valor atual: <b>${brl(T.valorHora)}</b> por hora. Os lançamentos com data anterior à vigência continuam com o valor antigo.</p>
      <p id="rj-ipca" class="muted" style="margin:0">Buscando o IPCA dos últimos 12 meses…</p>
      <div class="grid2"><label class="field"><span>Novo valor da hora (R$)</span><input id="rj-valor" inputmode="decimal" required></label>
      <label class="field"><span>Vale a partir de</span><input type="date" id="rj-desde" value="${today()}" required></label></div>
      <footer><button type="button" class="btn" data-act="cartaReajuste">Carta de reajuste (PDF)</button><button class="btn primary" type="submit">Aplicar reajuste</button></footer>
    </form>`);
    fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json").then(r=>r.json()).then(j=>{ const v = parseFloat(String(j?.[0]?.valor||"").replace(",",".")); if(!isFinite(v)) throw 0;
      state.ipca = {v, ref:j[0].data}; const sug = Math.round(T.valorHora*(1+v/100)*100)/100;
      const el = $("#rj-ipca"); if(el) el.innerHTML = `IPCA acumulado em 12 meses (até ${esc(j[0].data.slice(3))}): <b>${String(v).replace(".",",")}%</b> → sugerido <b>${brl(sug)}</b>`;
      const iv = $("#rj-valor"); if(iv && !iv.value) iv.value = String(sug).replace(".",","); })
      .catch(()=>{ const el = $("#rj-ipca"); if(el) el.textContent = "Não consegui buscar o IPCA agora. Informe o novo valor."; }); },
  cartaReajuste(){ const emp = $("#reajForm").dataset.emp, novo = numIn($("#rj-valor").value), desde = $("#rj-desde").value, T = rateFor(emp);
    if(!(novo>0) || !desde){ toast("Informe o novo valor e a data."); return; }
    const doc = pdfDoc(); if(!doc) return; const F = ficha(emp), E = state.cfg.empresa;
    let y = pdfHeader(doc, "COMUNICADO DE REAJUSTE", [`Emitido em ${fdate(today())}`]) + 6;
    doc.setFontSize(10.5); doc.setTextColor(...INK); doc.setFont("helvetica","normal");
    const pct = (novo/T.valorHora - 1)*100;
    const txt = [`À ${F.razao||emp}${F.cnpj?` - CNPJ ${F.cnpj}`:""}`, F.aprovador?`A/C: ${F.aprovador}${F.cargo?` - ${F.cargo}`:""}`:"", "",
      `Prezados,`, "",
      `Comunicamos o reajuste do valor da hora técnica dos serviços de manutenção mecânica industrial prestados pela ${E.nome}, conforme abaixo:`, "",
      `• Valor atual da hora: ${brl(T.valorHora)}`, `• Novo valor da hora: ${brl(novo)} (${pct>=0?"+":""}${pct.toFixed(2).replace(".",",")}%)`,
      `• Adicionais mantidos: ${T.extraPct}% para horas extras e ${T.feriadoPct}% para domingos e feriados`, `• Vigência: serviços executados a partir de ${fdate(desde)}`,
      state.ipca ? `• Referência: IPCA acumulado em 12 meses de ${String(state.ipca.v).replace(".",",")}% (Banco Central, ${state.ipca.ref.slice(3)})` : "", "",
      `Seguimos à disposição para quaisquer esclarecimentos e agradecemos a parceria.`].filter(x=>x!==null);
    txt.forEach(l=>{ doc.splitTextToSize(l, 182).forEach(t=>{ y = ensure(doc, y, 6); doc.text(t, 14, y); y += 5.6; }); });
    signature(doc, y+6, `${E.nome}${E.responsavel?" - "+E.responsavel:""}`, `${F.razao||emp} (ciente)`); pdfFooter(doc);
    offerFile(`reajuste-${slug(emp)}-${desde}.pdf`, doc.output("blob")); },
  pacoteContador(){ const m = ym(today()), ant = shiftYm(m,-1);
    openModal(`<header><h2>Pacote do contador</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
    <form class="form" id="contForm"><p class="muted" style="margin:0">Gera um .zip com uma planilha (notas e fechamentos, recebimentos com retenções, despesas e um resumo) e as fotos dos comprovantes. Envie direto pelo WhatsApp ou e-mail.</p>
      <label class="field"><span>Mês</span><input type="month" id="ct-mes" value="${ant}"></label>
      <footer><span></span><button class="btn primary" type="submit">Gerar pacote</button></footer></form>`); },
  eqPreset(b){ const q = state.eqp, t = parseYmd(today()), y = t.getFullYear(), m = t.getMonth();
    if(b.dataset.p==="sem"){ const ini = addDays(t, -((t.getDay()+6)%7)); q.de = ymd(ini); q.ate = ymd(addDays(ini, 6)); }
    else if(b.dataset.p==="q1"){ q.de = ymd(new Date(y,m,1)); q.ate = ymd(new Date(y,m,15)); }
    else if(b.dataset.p==="q2"){ q.de = ymd(new Date(y,m,16)); q.ate = ymd(new Date(y,m+1,0)); }
    else if(b.dataset.p==="mes"){ q.de = ymd(new Date(y,m,1)); q.ate = ymd(new Date(y,m+1,0)); }
    else { q.de = ymd(new Date(y,m-1,1)); q.ate = ymd(new Date(y,m,0)); }
    state.rendered = null; render(); },
  pagNovo(b){ const d = b.dataset||{}; openModal(pagForm({profissional:d.p||profs()[0], tipo:d.t||"vale", valor:d.v?+d.v:undefined, ref: d.t==="pagamento" ? {...state.eqp} : undefined})); },
  pagEditar(b){ const x = state.pag.find(y=>y.id===b.dataset.id); if(x) openModal(pagForm(x)); },
  async pagExcluir(b){ if(!b.dataset.armed){ b.dataset.armed="1"; b.textContent="Confirmar exclusão"; return; } const x = state.pag.find(y=>y.id===b.dataset.id); try{ await removeDoc("pagamentos", b.dataset.id); closeModal(); render(); toastAcao("Lançamento excluído.", "Desfazer", async ()=>{ const y = {...x}; delete y._v; await save("pagamentos", y); render(); }); }catch(err){ toast(writeErr(err)); } },
  reciboPdf(b){ const nome = b.dataset.p, q = state.eqp, a = acertoDe(nome, q.de, q.ate), doc = pdfDoc(); if(!doc) return;
    let y = pdfHeader(doc, "RECIBO / EXTRATO DE SERVIÇOS", [`${fdate(q.de)} a ${fdate(q.ate)}`, `Emitido em ${fdate(today())}`]);
    doc.setFontSize(10); doc.setTextColor(...INK); doc.text(`Funcionário: ${nome}`, 14, y); y += 6;
    doc.autoTable({startY:y, theme:"grid", margin:{left:14,right:14}, head:[["Data","OS","Início","Fim","Horas","50%","100%"]],
      body: a.aps.sort((x,z)=>(x.data+x.inicio).localeCompare(z.data+z.inicio)).map(e=>{ const c = calc(e); return [fdate(e.data), e.os||"-", e.inicio, e.fim, fdec(c.total), c.e50?fdec(c.e50):"", c.e100?fdec(c.e100):""]; }),
      foot:[["TOTAL","","","",fdec(a.c.total),fdec(a.c.e50),fdec(a.c.e100)]], styles:{fontSize:8.5,cellPadding:1.4,textColor:INK}, headStyles:{fillColor:GREEN,textColor:255}, footStyles:{fillColor:[255,240,150],textColor:INK}});
    y = doc.lastAutoTable.finalY + 6;
    doc.autoTable({startY:y, theme:"grid", margin:{left:14,right:100}, body:[["Valor dos serviços", brl(a.cu)], ...(a.bonus?[["Bônus", brl(a.bonus)]]:[]), ...(a.desconto?[["Descontos", "− "+brl(a.desconto)]]:[]), ["Vales / adiantamentos", "− "+brl(a.vale)], ["Pago neste período", "− "+brl(a.pago)], [{content:"Saldo a pagar",styles:{fontStyle:"bold"}}, {content:brl(a.saldo),styles:{fontStyle:"bold"}}]],
      styles:{fontSize:10,cellPadding:1.8,textColor:INK}, columnStyles:{1:{halign:"right"}}});
    y = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(9.5); doc.splitTextToSize(`Declaro ter recebido de ${state.cfg.empresa.nome} os valores acima referentes aos serviços prestados no período de ${fdate(q.de)} a ${fdate(q.ate)}.`, 182).forEach(l=>{ doc.text(l,14,y); y+=5; });
    signature(doc, y+4, state.cfg.empresa.nome, nome); pdfFooter(doc);
    offerFile(`recibo-${slug(nome)}-${q.de}_a_${q.ate}.pdf`, doc.output("blob")); },
  docNovo(){ state.docArq = null; openModal(docForm({})); },
  docEditar(b){ const x = state.docs.find(y=>y.id===b.dataset.id); if(x){ state.docArq = null; openModal(docForm(x)); } },
  async docVer(b){ const {data, error} = await sb.storage.from("documentos").createSignedUrl(b.dataset.path, 600); if(error || !data){ toast("Não consegui abrir o arquivo."); return; } window.open(data.signedUrl, "_blank"); },
  async docExcluir(b){ if(!b.dataset.armed){ b.dataset.armed="1"; b.textContent="Confirmar exclusão"; return; } try{ await removeDoc("documentos", b.dataset.id); closeModal(); render(); toast("Documento excluído (fica na lixeira)."); }catch(err){ toast(writeErr(err)); } },
  eqNovo(){ openModal(eqForm({})); renderEqPlano(); },
  eqEditar(b){ const q = state.eq.find(x=>x.id===b.dataset.id); if(q){ openModal(eqForm(q)); renderEqPlano(); } },
  eqVer(b){ const q = state.eq.find(x=>x.id===b.dataset.id); if(q) openModal(eqDetalhe(q), "wide"); },
  eqPlanoAdd(){ lerEqPlano(); state.eqPlano.push({id:uid(), atividade:"", cadaDias:30, horasPrev:""}); renderEqPlano(); },
  eqPlanoDel(b){ lerEqPlano(); state.eqPlano.splice(+b.dataset.i,1); renderEqPlano(); },
  async eqExcluir(b){ if(!b.dataset.armed){ b.dataset.armed="1"; b.textContent="Confirmar exclusão"; return; } try{ await removeDoc("equipamentos", b.dataset.id); closeModal(); render(); toast("Equipamento excluído (fica na lixeira)."); }catch(err){ toast(writeErr(err)); } },
  eqLancar(b){ const q = eqDe(b.dataset.id); if(!q) return; closeModal(); A.newAp(); setTimeout(()=>{ const s = $("#f-eq"); if(s){ s.value = `${q.id}|${b.dataset.p||""}`; } const em = $("#f-emp"); if(em && q.empresa && em.value!==q.empresa){ em.value = q.empresa; unidTrocarEmp(em.closest("form"), q.empresa); } const u = $("#f-cli"); if(u && !u.value) unidValor(u, q.unidade||""); }, 30); },
  dayDescartar(b){ const d = state.day, temDados = d && d.rows.some(r=>r.os||r.desc||r.fim);
    if(temDados && !b.dataset.armed){ b.dataset.armed="1"; b.textContent="Confirmar descarte"; setTimeout(()=>{ if(b.isConnected){ delete b.dataset.armed; b.textContent="Descartar"; } }, 4000); return; }
    const copia = d ? clone(d) : null; rascunho.limpar(); closeModal();
    if(temDados) toastAcao("Lançamento descartado.", "Desfazer", ()=>{ state.day = copia; openModal(dayForm(), "wide"); state.modalDirty = true; renderDayRows(); updateDay(); }); },
  async pushAtivar(b){
    b.disabled = true;
    try{
      const perm = await Notification.requestPermission();
      if(perm!=="granted"){ toast("Sem permissão para notificações."); state.rendered=null; render(); return; }
      const reg = await navigator.serviceWorker.register("/sw.js"); await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64u(window.GAAP_CONFIG.vapidPublica)});
      const {error} = await sb.from("push_inscricoes").upsert({endpoint:sub.endpoint, sub:sub.toJSON(), aparelho:navigator.userAgent.slice(0,140)});
      if(error) throw dbErr(error);
      state.pushOn = true; state.rendered = null; render(); toast("Lembretes ativados. Enviando um teste…");
      await sb.functions.invoke("lembretes", {body:{teste:true}});
    }catch(err){ toast(err && err.code==="db" ? writeErr(err) : "Não consegui ativar os lembretes neste aparelho."); }
    finally{ b.disabled = false; }
  },
  async pushTestar(b){ b.disabled = true; const {data, error} = await sb.functions.invoke("lembretes", {body:{teste:true}}); b.disabled = false; toast(error ? "Não consegui enviar o teste." : data?.enviados ? "Teste enviado. Deve chegar em instantes." : "Nenhum aparelho ativo encontrado. Toque em Desativar e ative de novo."); },
  async pushDesativar(){ try{ const reg = await navigator.serviceWorker.getRegistration("/sw.js") || await navigator.serviceWorker.ready; const sub = await reg?.pushManager.getSubscription(); if(sub){ await sb.from("push_inscricoes").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); } }catch(err){} state.pushOn = false; state.rendered = null; render(); toast("Lembretes desativados neste aparelho."); },
  cronoNovo(){ state.crIds = null; openModal(cronoForm()); setTimeout(()=>$("#cr-os")?.focus(), 50); },
  async cronoEncerrar(b){ const e = state.ap.find(x=>x.id===b.dataset.id); if(!e) return;
    if(!b.dataset.armed){ b.dataset.armed="1"; b.textContent="Confirmar"; setTimeout(()=>{ if(b.isConnected){ delete b.dataset.armed; b.textContent="Encerrar"; } }, 4000); return; }
    const lk = lockOf(e.data, empOf(e), e.profissional); if(lk){ toast(`Essa OS está num período já fechado (${lk.numero}). ${state.worker?"Peça ao responsável para ajustar.":"Reabra o fechamento para ajustar."}`); return; }
    if(e.data!==today()){ const j = state.cfg.jornada[parseYmd(e.data).getDay()]||{}; const fj = j.fim && hm(j.fim)>hm(e.inicio) ? j.fim : "";
      openModal(apForm({...e, fim:fj})); updateApPreview(); toast(`Cronômetro de ${fdate(e.data).slice(0,5)}: confira a hora real de término e salve.`); return; }
    b.disabled = true;
    try{ const n = await encerrarOS(e); render();
      toastAcao(`OS ${n.os||"s/n"} encerrada: ${n.inicio}–${n.fim} (${fh(calc(n).total)}).`, "Desfazer", async ()=>{ const x = state.ap.find(y=>y.id===n.id); if(x){ await save("apontamentos", {...x, fim:"", andamento:true}); render(); toast("Cronômetro voltou a contar."); } }); }
    catch(err){ b.disabled = false; toast(writeErr(err)); } },
  cronoTrocar(b){ const e = state.ap.find(x=>x.id===b.dataset.id); if(!e) return; const quem = state.ap.filter(x=>x.andamento && x.os===e.os && x.inicio===e.inicio && x.data===e.data).map(x=>x.profissional).filter(Boolean);
    state.crIds = null; openModal(cronoForm({troca:true, profs: quem.length?quem:(e.profissional?[e.profissional]:[]), unid:e.cliente, emp:e.empresa})); setTimeout(()=>$("#cr-os")?.focus(), 50); },
  async histVoltar(b){ const h = (state.hist||[])[+b.dataset.i], id = $("#f-hist")?.dataset.id; if(!h || !id) return;
    if(!b.dataset.armed){ b.dataset.armed="1"; b.textContent="Confirmar"; return; }
    const atual = state.ap.find(x=>x.id===id); if(!atual) return;
    const campos = CAMPOS.map(c=>c[0]).filter(k=>JSON.stringify(h.antes?.[k]??"")!==JSON.stringify(h.depois?.[k]??""));
    const mudouDepois = campos.filter(k=>JSON.stringify(atual[k]??"")!==JSON.stringify(h.depois?.[k]??""));
    const novo = {...atual}; campos.forEach(k=>{ if(h.antes?.[k]===undefined) delete novo[k]; else novo[k] = h.antes[k]; });
    const lk = lockedE(atual) || lockedE(novo); if(lk){ toast(lockMsg(lk)); return; }
    if(mudouDepois.length && !confirm(`Esses campos foram alterados de novo depois: ${mudouDepois.join(", ")}. Desfazer mesmo assim?`)) return;
    try{ await save("apontamentos", novo); closeModal(); toast(`Desfeito: ${campos.map(k=>(CAMPOS.find(c=>c[0]===k)||[k,k])[1]).join(", ")}.`); }catch(err){ toast(writeErr(err)); } },
  async lixoRestaurar(b){ const x = (state.lixo||[])[+b.dataset.i]; if(!x) return; b.disabled = true;
    const d = {...x.dados, id:x.registro_id}; delete d.excluido; delete d.excluidoEm; delete d.excluidoPor; delete d._v;
    if(x.tabela==="fechamentos"){ const cf = fechConflict(d.de, d.ate, d.empresa||"", d.profissional||""); if(cf){ b.disabled = false; toast(`Já existe o fechamento ${cf.numero} para esse período. Não dá para restaurar este.`); return; } }
    if(["apontamentos","despesas"].includes(x.tabela)){ const lk = lockOf(d.data, x.tabela==="apontamentos" ? empOf(d) : (d.empresa||state.cfg.contratante||""), x.tabela==="apontamentos" ? d.profissional : ""); if(lk){ b.disabled = false; toast(`Esse item é de um período já fechado (${lk.numero}). Reabra o fechamento para restaurar.`); return; } }
    if(x.tabela==="recebimentos" && d.fechId && !state.fech.some(f=>f.id===d.fechId) && !confirm("O fechamento deste recebimento não existe mais. Restaurar mesmo assim?")){ b.disabled = false; return; }
    try{ await save(x.tabela, d); await loadOwner(); toast(`${TAB_LABEL[x.tabela]||"Item"} restaurado.`); carregarLixeira(); }catch(err){ b.disabled = false; toast(writeErr(err)); } },
  async arqEnviar(){ const a = state.arquivo; if(!a) return; try{ await navigator.share({files:[a.file], title:a.filename}); closeModal(); }catch(err){ if(err && err.name==="AbortError") return; baixarBlob(a.blob, a.filename); closeModal(); } },
  arqBaixar(){ const a = state.arquivo; if(!a) return; baixarBlob(a.blob, a.filename); closeModal(); },
  repWhats(){ const rows=repRows(); if(!rows.length){ toast("Nenhum apontamento nesse período."); return; } const emp = oneOf(rows,"emp"), w = (ficha(emp).whats||"").replace(/\D/g,""); window.open(`https://wa.me/${w?(w.length<=11?"55"+w:w):""}?text=${encodeURIComponent(repText())}`, "_blank"); },
  async osPdf(b){ const os = b.dataset.os, rows = state.ap.filter(e=>(e.os||"(sem nº)")===os).sort((x,y)=>(x.data+x.inicio).localeCompare(y.data+y.inicio)); if(!rows.length) return;
    const saved = clone(state.rep); closeModal();
    state.rep = {...state.rep, fechArq:"", modo:"periodo", de:rows[0].data, ate:rows[rows.length-1].data, f:{prof:ALL,unid:ALL,emp:ALL}, by:"", vazios:false, os, fechNum:"", fotos:true};
    try{ await repPdf(); } finally { state.rep = saved; } },
  confAbrir(b){ const d = b.dataset, row = d.a ? {ini:d.a, fim:d.b} : {}; dayOpen(d.d, {row, profs: d.p ? [d.p] : undefined}); },
  async backupZip(b){
    b.disabled = true; const old = b.textContent;
    try{
      if(!window.JSZip){ b.textContent = "Preparando…"; await loadScript(JSZIP); }
      const dados = backupDados(), todas = b.dataset.todas==="1", desde = todas ? 0 : (state.cfg.fotosAte ? new Date(state.cfg.fotosAte).getTime() : 0);
      const tempo = id => { const n = id.split("/").pop().replace(/\.\w+$/,""); const t = parseInt(n.slice(0,-6), 36); return isFinite(t) ? t : Date.now(); };
      const ids = [...new Set([...state.ap, ...state.orc, ...state.desp].flatMap(x=>x.fotos||[]))].filter(id=>tempo(id) > desde);
      let n = 0, falhas = 0, parte = 1, tamanho = 0, zip = new JSZip(); const LIM = 150*1024*1024;
      zip.file("backup.json", JSON.stringify(dados, null, 1));
      const fechar = async (ultima)=>{ b.textContent = "Compactando…"; const blob = await zip.generateAsync({type:"blob", compression:"STORE"});
        await offerFile(`backup-gaap-${todas||!desde?"completo":"fotos-novas"}-${today()}${parte>1||!ultima?`-parte${parte}`:""}.zip`, blob);
        if(!ultima){ await new Promise(ok=>{ const t = setInterval(()=>{ if($("#modal").hidden){ clearInterval(t); ok(); } }, 400); }); parte++; zip = new JSZip(); tamanho = 0; } };
      for(let i=0; i<ids.length; i+=40) await assinarFotos(ids.slice(i, i+40));
      for(let i=0; i<ids.length; i+=4){
        const lote = ids.slice(i, i+4);
        const blobs = await Promise.all(lote.map(async id=>{ try{ const r = await fetch(assetUrls[id]); if(!r.ok) throw 0; return [id, await r.blob()]; }catch(err){ falhas++; return null; } }));
        for(const x of blobs.filter(Boolean)){ zip.file("fotos/"+x[0], x[1]); tamanho += x[1].size; n++; }
        b.textContent = `Fotos ${n} de ${ids.length}…`;
        if(tamanho > LIM && i+4 < ids.length) await fechar(false);
      }
      zip.file("LEIA-ME.txt", `Backup do GAAP Gestão de Serviços gerado em ${new Date().toLocaleString("pt-BR")}.\nPara restaurar: Ajustes > Backup > Importar backup e escolha este arquivo .zip.\nRegistros: ${COLS.reduce((s,c)=>s+(dados[c]||[]).length,0)} · Fotos: ${ids.length-falhas}${falhas?` (${falhas} não baixaram)`:""}`);
      await fechar(true);
      await sb.rpc("marcar_backup_baixado"); state.cfg.backupBaixadoEm = new Date().toISOString();
      if(!falhas){ const {error} = await sb.rpc("marcar_fotos_ate", {p_ate:new Date().toISOString()}); if(!error) state.cfg.fotosAte = new Date().toISOString(); }
      { const {data} = await sb.from("config").select("atualizado_em").eq("id","main").maybeSingle(); if(data && !state.cfgDirty) state.cfgV = data.atualizado_em; }
      toast(falhas ? `Backup gerado, mas ${falhas} foto(s) não baixaram.` : "Backup completo gerado. Guarde o arquivo fora do celular.");
      state.rendered = null; render(); $("#backup")?.scrollIntoView();
    }catch(err){ toast("Não consegui gerar o backup. Verifique a conexão e tente de novo."); }
    finally{ b.disabled = false; b.textContent = old; }
  },
  async backupAgora(b){ b.disabled = true; const {error} = await sb.rpc("fazer_backup", {p_origem:"manual"}); b.disabled = false; if(error){ toast(writeErr(dbErr(error))); return; } toast("Cópia feita no servidor."); carregarBackups(); },
  async backupBaixar(b){ const {data, error} = await sb.rpc("ler_backup", {p_slot:+b.dataset.slot}); if(error || !data){ toast("Não consegui baixar essa cópia."); return; } offerFile(`backup-gaap-servidor-${(data.exportadoEm||"").slice(0,10)}.json`, JSON.stringify(data, null, 1)); },
  irBackup(){ state.ajAba = "dados"; state.view = "ajustes"; state.rendered = null; render(); setTimeout(()=>$("#backup")?.scrollIntoView(), 50); },
  async renomearProf(b){
    const old = $("#rn-old")?.value || "", novo = ($("#rn-new")?.value || "").trim();
    if(!old || !novo){ toast("Escolha o funcionário e digite o novo nome."); return; }
    if(old===novo) return;
    if(profs().includes(novo)){ toast(`Já existe um funcionário chamado ${novo}.`); return; }
    if(!b.dataset.armed){ b.dataset.armed="1"; b.textContent=`Confirmar: ${old} → ${novo}`; return; }
    b.disabled = true;
    const {data, error} = await sb.rpc("renomear_profissional", {p_antigo:old, p_novo:novo});
    if(error){ b.disabled = false; toast(writeErr(dbErr(error))); return; }
    await loadOwner(); state.rendered = null; render(); toast(`${old} agora é ${novo} (${data||0} OS atualizadas).`);
  },
  exportJson(){ const d = backupDados(); offerFile(`backup-gaap-${today()}.json`, JSON.stringify(d,null,1)); }
};
document.addEventListener("click", e=>{ const b = e.target.closest("[data-act]"); if(!b) return; const f = A[b.dataset.act]; if(f){ if(b.tagName==="BUTTON" && b.type!=="submit") e.preventDefault(); f(b,e); } });

renderNav();
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("/sw.js").then(r=>{ try{ r.update(); }catch(e){} }).catch(()=>{});
  // saiu versão nova do app: recarrega sozinho (só se não houver nada sendo digitado)
  let jaTinha = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", ()=>{ if(!jaTinha){ jaTinha = true; return; } if(state.modalDirty || state.cfgDirty || state.orcDirty || $("#dayForm")){ toast("Saiu uma versão nova do app. Salve o que está fazendo e toque em Atualizar."); return; } location.reload(); });
  document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) navigator.serviceWorker.getRegistration().then(r=>r && r.update()).catch(()=>{}); });
}
initStore();
