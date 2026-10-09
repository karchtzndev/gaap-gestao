"use strict";
/* ---------- dados (Supabase) ---------- */
const COLS = ["apontamentos","orcamentos","recebimentos","fechamentos","despesas","pagamentos","equipamentos","documentos","ordens"];
const KEY = {apontamentos:"ap",orcamentos:"orc",recebimentos:"rec",fechamentos:"fech",despesas:"desp",pagamentos:"pag",equipamentos:"eq",documentos:"docs",ordens:"ord"};
const state = {
  ready:false, cfg:clone(DEFAULT_CFG), ap:[], orc:[], rec:[], fech:[], desp:[], pag:[], eq:[], docs:[], ord:[], perfis:[], worker:false, me:"", pub:null, hmode:"dia", osQ:"",
  view:"painel", month:ym(today()), orcFilter:"todos", orcDraft:null, auth:"entrar",
  rep:{modo:"dia", dia:today(), de:ym(today())+"-01", ate:today(), valores:true, f:{prof:"__all",unid:"__all",emp:"__all"}, by:"", vazios:true, fmt:"dec"},
  hf:{f:{prof:"__all",unid:"__all",emp:"__all"}, by:""}, pby:"prof"
};
// sem a biblioteca do Supabase ou sem o config.js (sem internet e sem cópia guardada): avisa em vez de ficar em branco
if(!window.supabase?.createClient || !window.GAAP_CONFIG?.supabaseUrl){
  const v = document.getElementById("view");
  if(v){ v.innerHTML = '<div class="loading">Não foi possível abrir o sistema agora. Confira a internet e <button class="btn primary sm" type="button">tente de novo</button></div>'; v.querySelector("button").addEventListener("click", ()=>location.reload()); }
  throw new Error("Supabase indisponível (biblioteca ou config.js não carregou)");
}
// internet fraca: a requisição não falha, fica pendurada. Cada chamada tem um prazo (fotos têm mais tempo)
function fetchComPrazo(url, init = {}){
  const u = String(url?.url || url), ms = /\/storage\/v1\//.test(u) ? 90000 : /\/auth\/v1\//.test(u) ? 10000 : /\/functions\/v1\//.test(u) ? 45000 : 20000;
  const ctl = new AbortController(), t = setTimeout(()=>ctl.abort(new Error("timeout: internet lenta")), ms);
  if(init.signal){ if(init.signal.aborted) ctl.abort(init.signal.reason); else init.signal.addEventListener("abort", ()=>ctl.abort(init.signal.reason), {once:true}); }
  return fetch(url, {...init, signal:ctl.signal}).finally(()=>clearTimeout(t));
}
const comPrazo = (p, ms) => Promise.race([p, new Promise((_, rej)=>setTimeout(()=>rej(new Error("timeout: internet lenta")), ms))]);
const sb = window.supabase.createClient(window.GAAP_CONFIG.supabaseUrl, window.GAAP_CONFIG.supabaseKey, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}, global:{fetch:fetchComPrazo}});
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
const setList = (k, list) => { state[k] = list; if(k==="ap") mmCache.ref = null; try{ snap.agendar(); }catch(e){} try{ portalAgendar(); }catch(e){} };
function upsertLocal(k, row){ setList(k, [...state[k].filter(x=>x.id!==row.id), row]); }
async function save(col, obj){
  const id = obj.id || uid(), versao = obj._v || null; const data = semV(obj); delete data._pend;
  data.atualizadoEm = new Date().toISOString(); state.gen = (state.gen||0) + 1;
  if(precisaFila(col, id, data)) return filaSalvar(col, id, data, versao);
  try{ return await saveNet(col, id, data, versao); }
  catch(e){ if(e && e.rede){ state.offline = true; return filaSalvar(col, id, data, versao); } throw e; }
}
// envio de um registro ao servidor; erro de conexão vem marcado com {rede:true}
async function saveNet(col, id, data, versao){
  if(state.worker && col==="ordens"){
    const {data:ret, error} = await sb.rpc("func_salvar_ordem", {p_id:id, p_data:{...data, ...(versao?{_v:versao}:{})}});
    if(error){ if(ehRede(error)) throw {rede:true}; const e = dbErr(error); if(e.conflito) await recarregarDoc(col, id).catch(()=>{}); throw e; }
    const [, v] = String(ret||id).split("|"); const old = state.ord.find(x=>x.id===id) || {};
    // o servidor só completa campos vazios de uma OS que já existe: espelha isso aqui até a próxima leitura
    const row = old.id ? {...old} : {...data, recebidaPor:state.me}; if(old.id) Object.entries(data).forEach(([k, val])=>{ if(old[k]==null || old[k]==="") row[k] = val; });
    if(data.concluida===true){ row.concluida = true; row.concluidaEm ||= new Date().toISOString(); } else if(data.concluida===false){ delete row.concluida; delete row.concluidaEm; delete row.concluidaPor; }
    Object.assign(row, {id, ...(v?{_v:v}:{})});
    upsertLocal("ord", row); scheduleRender(); return id;
  }
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
  if(outbox.tem(col, id) || state.offline || state.atualizando){ await outbox.por({op:"del", col, id}); }
  else try{ await removeNet(col, id); }catch(e){ if(e && e.rede) await outbox.por({op:"del", col, id}); else throw e; }
  setList(KEY[col], state[KEY[col]].filter(x=>x.id!==id)); scheduleRender();
}
async function removeNet(col, id){
  const {error} = state.worker ? await sb.rpc("func_excluir_os", {p_id:id}) : await sb.from(col).delete().eq("id", id);
  if(error){ if(ehRede(error)) throw {rede:true}; throw dbErr(error); }
}
/* ---------- sem internet: fila de envio, fotos guardadas e cópia dos dados no aparelho ---------- */
const ehRede = err => !navigator.onLine || err?.name==="AbortError" || /failed to fetch|fetch failed|networkerror|network request|load failed|internet|timed? ?out|abort|ERR_/i.test(String(err?.message || err?.error || err || ""));
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
  if(state.offline || state.atualizando || outbox.tem(col, id)) return true; // abrindo com internet fraca: não espera, vai para a fila
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
  t.hidden = !n && !state.offline && !state.atualizando;
  t.className = "synctag" + (state.offline ? " off" : "");
  t.textContent = state.atualizando && !n ? "Atualizando…" : state.offline ? (n ? `Sem internet · ${n} a enviar` : "Sem internet") : outbox.rodando ? `Enviando ${n}…` : `${n} a enviar ⟳`;
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
  try{ const {data} = await comPrazo(sb.auth.getSession(), 10000); if(!data.session) return false; session = data.session; state.sessaoLocal = false; return true; }catch(e){ return false; }
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
  const [pc, os, ord] = await Promise.all([sb.rpc("pub_config"), sb.rpc("minhas_os"), sb.rpc("minhas_ordens")]);
  if(pc.error) throw pc.error; if(os.error) throw os.error;
  if(g!==state.gen) return false;
  state.pub = pc.data || {}; state.cfg = deepMerge(DEFAULT_CFG, state.pub.cfg || {}); holCache = {}; calcCache = new WeakMap();
  setList("ap", (os.data||[]).map(r=>({id:r.id, ...r.data})));
  if(!ord.error) setList("ord", (ord.data||[]).map(r=>({id:r.id, ...r.data, _v:r.atualizado_em})));
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
  const local = await snap.ler(session.user.id);
  if(local && local.perfil){ snap.aplicar(local); reaplicarFila(); state.ready = true; state.atualizando = true; render(); syncTag(); }
  try{
    if(state.sessaoLocal) throw {rede:true};
    const {data, error} = await sb.from("perfis").select("*").eq("user_id", session.user.id).maybeSingle();
    if(error) throw error;
    perfil = data;
    state.worker = perfil?.papel==="funcionario"; state.me = state.worker ? (perfil.nome||"") : "";
    if(state.worker) state.view = "worker"; else if(state.view==="worker") state.view = "painel";
    if(outbox.lista.length || fotosPend.size) await sincronizar();
    await carregar(); state.offline = false;
    pushEstado().catch(()=>{}); setTimeout(()=>{ carregarChamados(); portalAgendar(); }, 1500);
  }catch(err){
    const rede = (err && err.rede) || ehRede(err);
    if(rede && local && local.perfil){ state.offline = true; reaplicarFila(); toast("Internet fraca ou sem internet: usando os dados deste aparelho. O que você lançar é enviado sozinho quando a conexão melhorar."); }
    else if(!local) toast(rede ? "Sem internet e ainda não há dados guardados neste aparelho. Abra o app uma vez com internet." : "Não consegui carregar os dados. Verifique a conexão e recarregue a página.");
  }
  state.atualizando = false; state.ready = true; render(); syncTag(); snap.agendar();
}
// itens ainda na fila aparecem na tela mesmo depois de recarregar os dados
function reaplicarFila(){ outbox.lista.forEach(it=>{ const k = KEY[it.col]; if(!k) return; if(it.op==="del") setList(k, state[k].filter(x=>x.id!==it.id)); else upsertLocal(k, {...it.data, id:it.id, _pend:true, ...(it.versao?{_v:it.versao}:{})}); }); }
async function initStore(){
  let r = null; try{ r = await comPrazo(sb.auth.getSession(), navigator.onLine ? 3000 : 1000); }catch(e){} session = r?.data?.session || null;
  if(!session){ const s = sessaoGuardada(); if(s){ session = s; state.sessaoLocal = true; } } // internet ruim ou acesso vencido: abre com o que está no aparelho
  sb.auth.onAuthStateChange((ev, s)=>{
    if(!s && state.sessaoLocal && ev!=="SIGNED_OUT") return; // a renovação ainda não passou: continua com o login do aparelho
    if(s && state.sessaoLocal){ session = s; state.sessaoLocal = false; setTimeout(atualizar, 500); return; } // a internet voltou e o acesso foi renovado
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
  if(state.sessaoLocal && !(await reconectar())) return;
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
    if(state.offline || state.atualizando || !navigator.onLine) error = {message:"offline"}; else try{ ({error} = await sb.storage.from("fotos").upload(path, blob, {contentType:type, upsert:false})); }catch(e){ error = e; }
    if(error && (state.offline || state.atualizando || ehRede(error) || error.message==="offline")){ // guarda no aparelho e envia depois
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
