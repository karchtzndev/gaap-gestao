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
// almoço exato da OS (saída e volta), em minutos contados a partir do dia da OS
function almocoMin(e, s0){ let a = hm(e.almIni), b = hm(e.almFim); if(a==null || b==null || a===b) return null; if(s0!=null && a<s0) a += 1440; if(b<=a) b += 1440; return [a, b]; }
function almErro(ini, fim, ai, af){
  if(!ai && !af) return ""; if(!ai || !af) return "informe a saída e a volta do almoço (ou deixe as duas em branco)";
  const s0 = hm(ini); let f = hm(fim); if(f<=s0) f += 1440; const a = almocoMin({almIni:ai, almFim:af}, s0);
  if(!a) return "saída e volta do almoço iguais"; if(a[0]<=s0 || a[1]>=f) return `o almoço (${ai}–${af}) precisa ficar entre o início e o término`; return ""; }
const almTxt = e => e.almIni && e.almFim ? `Almoço ${e.almIni}–${e.almFim}` : "";
function calcRaw(e){
  const cfg = state.cfg;
  const r = {n:0,e50:0,e100:0,total:0,valor:0,vn:0,v50:0,v100:0,not:0,vnot:0};
  const s0 = hm(e.inicio), f0 = hm(e.fim);
  if(!e.data || s0==null || f0==null) return r;
  let f = f0; if(f <= s0) f += 1440;
  const base = parseYmd(e.data), days = {};
  const aIni = hm(cfg.almoco.ini), aFim = hm(cfg.almoco.fim), al = almocoMin(e, s0);
  let early = 0, late = 0;
  for(let t=s0; t<f; t++){
    const dn = Math.floor(t/1440), mod = t%1440;
    let info = days[dn];
    if(!info){ const dt=addDays(base,dn), wd=dt.getDay(), j=cfg.jornada[wd]||{}; info = days[dn] = {special: wd===0 || !!holidayName(ymd(dt)), ji:hm(j.ini), jf:hm(j.fim)}; }
    if(al && t>=al[0] && t<al[1]) continue; // almoço informado na OS: horário exato, não conta
    const almoco = !al && cfg.almoco.ativo && aIni!=null && aFim!=null && mod>=aIni && mod<aFim;
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
const VERSAO = "2026.10.09-2";
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
const MEIOS = ["Ligação","WhatsApp","Portal","Presencial","Rádio","Outro"];
function emergTxt(e){ if(!e.emergencia) return ""; const a = e.acion||{};
  return ["EMERGÊNCIA", a.por?`acionado por ${a.por}`:"", a.as?`às ${a.as}`:"", a.meio?`via ${a.meio}`:"", a.motivo?`(${a.motivo})`:""].filter(Boolean).join(" "); }
// quem assinou a OS (responsável da unidade)
function assinOS(e){ const m = Object.values(e.fotoMeta||{}).find(x=>x && x.tipo==="assinatura"); return m ? (m.nome || "responsável") : ""; }
function descRep(e){ const q = e.equipId && eqDe(e.equipId), pl = q && e.prevId && (q.plano||[]).find(x=>x.id===e.prevId);
  return [e.descricao||"", e.tracos?`ID TracOS ${e.tracos}`:"", almTxt(e), assinOS(e)?`Assinado por ${assinOS(e)}`:"", q?`Equip. ${q.tag||""}${pl?` (preventiva: ${pl.atividade})`:""}`:"", emergTxt(e), e.obs?`Obs.: ${e.obs}`:""].filter(Boolean).join(" · "); }
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

