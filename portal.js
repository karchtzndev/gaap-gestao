// Portal da contratante: acompanha a medição ao vivo (retrato publicado pelo app) e abre chamados de emergência.
(function(){
  const $ = s => document.querySelector(s);
  const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fdate = d => d ? String(d).slice(0,10).split("-").reverse().join("/") : "";
  const brl = v => (Number(v)||0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
  const hh = v => (Number(v)||0).toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2});
  const quando = t => t ? new Date(t).toLocaleString("pt-BR", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"}) : "";
  const minEntre = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
  const durTxt = m => m < 60 ? `${m} min` : `${Math.floor(m/60)}h${String(m%60).padStart(2,"0")}`;
  const view = $("#view");
  const token = (new URLSearchParams(location.hash.slice(1))).get("t") || "";
  const C = window.GAAP_CONFIG || {};
  let sb, d, form = false, enviado = null, filtro = "";

  function msg(t, sub){ view.innerHTML = `<section class="panel"><h2>${esc(t)}</h2>${sub?`<p class="muted">${esc(sub)}</p>`:""}</section>`; }

  async function carregar(primeira){
    try{
      const {data, error} = await sb.rpc("ler_portal", {p_token: token});
      if(error) throw error;
      if(!data) return msg("Link desativado ou inválido", "Peça um novo link ao prestador de serviço.");
      d = data; if(!form) render();
    }catch(e){ if(primeira) msg("Não foi possível abrir o portal", "Confira a internet e tente de novo."); }
  }

  function chamadoHtml(c){
    const st = c.status==="aberto" ? `<span class="pill bad">Aguardando técnico · há ${durTxt(minEntre(c.criado_em, new Date()))}</span>`
      : c.status==="atendido" ? `<span class="pill good">Atendido em ${durTxt(minEntre(c.criado_em, c.atendido_em))}${c.atendido_por?` · ${esc(c.atendido_por)}`:""}${c.os?` · OS ${esc(c.os)}`:""}</span>` : `<span class="pill">Cancelado</span>`;
    return `<div class="item" style="cursor:default"><span class="mono">${quando(c.criado_em)}</span><span><b>${esc(c.unidade||"")}</b>${c.equipamento?` · ${esc(c.equipamento)}`:""}<br><small class="muted">${esc(c.descricao||"")}${c.nome?` — ${esc(c.nome)}`:""}</small></span><span>${st}</span></div>`;
  }

  function render(){
    const s = d.snap || {}, t = s.tot || {}, abertos = (d.chamados||[]).filter(c=>c.status==="aberto"), atend = (d.chamados||[]).filter(c=>c.status==="atendido");
    const tm = atend.length ? Math.round(atend.reduce((x,c)=>x+minEntre(c.criado_em, c.atendido_em),0)/atend.length) : null;
    const os = (s.os||[]).filter(o=>!filtro || o.unid===filtro);
    view.innerHTML = `<section class="panel portal-top">
      <div><span class="eyebrow">Portal de serviços</span><h1 style="margin:2px 0">${esc(d.empresa)}</h1>
      <p class="muted" style="margin:0">Prestador: <b>${esc(d.prestador||"")}</b>${d.cnpj?` · CNPJ ${esc(d.cnpj)}`:""}${d.telefone?` · ${esc(d.telefone)}`:""}</p></div>
      <button class="btn danger big" id="pt-novo" style="background:#c62828;border-color:#c62828;color:#fff">🚨 Abrir chamado de emergência</button></section>
    ${enviado?`<section class="panel" style="border-color:var(--good)"><h3 style="margin:0">✅ Chamado enviado</h3><p style="margin:4px 0 0">A equipe foi avisada no celular agora. Protocolo <b class="mono">${esc(enviado.slice(0,8).toUpperCase())}</b>. Acompanhe o atendimento logo abaixo.</p></section>`:""}
    ${(d.chamados||[]).length?`<section class="panel"><h3 style="margin:0 0 8px">Chamados de emergência${abertos.length?` <span class="pill bad">${abertos.length} aberto(s)</span>`:""}${tm!=null?` <span class="pill info">tempo médio de resposta ${durTxt(tm)}</span>`:""}</h3><div class="list">${d.chamados.slice(0,15).map(chamadoHtml).join("")}</div></section>`:""}
    ${s.de?`<section class="panel"><h3 style="margin:0">Medição atual · ${fdate(s.de)} a ${fdate(s.ate)}</h3><p class="muted" style="margin:2px 0 10px">Atualizado em ${quando(d.snap_em)}</p>
      <div class="kpis">
        <div class="kpi"><span class="eyebrow">OS atendidas</span><span class="v">${t.os||0}</span></div>
        <div class="kpi"><span class="eyebrow">Horas</span><span class="v">${hh(t.total)}</span><span class="s">normais ${hh(t.n)} · extras ${hh((t.e50||0)+(t.e100||0))}</span></div>
        ${s.valores?`<div class="kpi"><span class="eyebrow">Valor parcial</span><span class="v">${brl(t.valor)}</span></div>`:""}
        <div class="kpi"><span class="eyebrow">Emergências</span><span class="v">${t.emerg||0}</span><span class="s">${t.assin||0} OS assinadas pela unidade</span></div>
      </div></section>
    ${(s.unidades||[]).length?`<section class="panel"><h3 style="margin:0 0 8px">Por unidade</h3><div class="tablewrap"><table><thead><tr><th>Unidade</th><th class="r">OS</th><th class="r">Horas</th>${s.valores?'<th class="r">Valor</th>':""}</tr></thead><tbody>${s.unidades.map(u=>`<tr class="click" data-u="${esc(u.unid)}"><td>${esc(u.unid||"(sem unidade)")}</td><td class="r mono">${u.os}</td><td class="r mono">${hh(u.total)}</td>${s.valores?`<td class="r mono">${brl(u.valor)}</td>`:""}</tr>`).join("")}</tbody></table></div></section>`:""}
    <section class="panel"><div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">Ordens de serviço${filtro?` · ${esc(filtro)}`:""}</h3>${filtro?`<button class="btn sm" id="pt-todas">Ver todas as unidades</button>`:""}</div>
      ${os.length?`<div class="tablewrap" style="margin-top:8px"><table class="cards-sm"><thead><tr><th>Data</th><th>OS</th><th>Serviço</th><th>Técnico</th><th>Horário</th><th class="r">Horas</th></tr></thead><tbody>${os.map(o=>`<tr><td class="mono">${fdate(o.data)}</td><td class="mono"><b>${esc(o.os||"s/n")}</b>${o.tracos?`<br><small class="muted">TracOS ${esc(o.tracos)}</small>`:""}${o.emerg?' <span class="pill warn">emergência</span>':""}</td><td>${esc(o.desc||"")}<br><small class="muted">${esc(o.unid||"")}${o.equip?` · ${esc(o.equip)}`:""}${o.assin?` · ✍ assinado por ${esc(o.assin)}`:""}</small></td><td data-l="Técnico">${esc(o.prof||"")}</td><td class="mono" data-l="Horário">${o.andamento?`${esc(o.ini)}–… <span class="pill info">em andamento</span>`:`${esc(o.ini)}–${esc(o.fim)}`}${o.alm?`<br><small class="muted">almoço ${esc(o.alm)}</small>`:""}</td><td class="r mono" data-l="Horas">${o.andamento?"":hh(o.horas)}</td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">Nenhuma OS neste período ainda.</p>`}
    </section>
    ${(s.fechs||[]).length?`<section class="panel"><h3 style="margin:0 0 8px">Medições anteriores</h3><div class="list">${s.fechs.map(f=>`<div class="item" style="cursor:default"><span class="mono"><b>${esc(f.numero)}</b></span><span>${fdate(f.de)} a ${fdate(f.ate)}${f.prof?` · ${esc(f.prof)}`:""}<br><small class="muted">${hh(f.horas)} h${s.valores?` · ${brl(f.valor)}`:""}</small></span><span class="pill ${f.pago?"good":"info"}">${f.pago?"Pago":"Enviado"}</span></div>`).join("")}</div></section>`:""}`
    :`<section class="panel"><p class="muted" style="margin:0">A medição deste período ainda não foi publicada.</p></section>`}
    <p class="muted" style="text-align:center;font-size:.8rem">Página só de leitura, atualizada automaticamente.</p>`;
  }

  function formHtml(){
    const us = String(d.unidades||"").split("\n").map(x=>x.trim()).filter(Boolean);
    let nome = "", fone = ""; try{ nome = localStorage.getItem("pt-nome")||""; fone = localStorage.getItem("pt-fone")||""; }catch(e){}
    view.innerHTML = `<section class="panel"><h2 style="margin-top:0">🚨 Chamado de emergência</h2><p class="muted">A equipe da ${esc(d.prestador||"")} recebe o aviso no celular na hora.</p>
      <form class="form" id="pt-form">
        <label class="field"><span>Unidade</span>${us.length?`<select id="pt-unid" required><option value="">Selecione…</option>${us.map(u=>`<option>${esc(u)}</option>`).join("")}</select>`:`<input id="pt-unid" required maxlength="120">`}</label>
        <label class="field"><span>Equipamento / TAG (se souber)</span><input id="pt-eq" maxlength="120" placeholder="Ex.: Elevador de canecas 02"></label>
        <label class="field"><span>O que aconteceu?</span><textarea id="pt-desc" required maxlength="1000" rows="4" placeholder="Descreva o problema"></textarea></label>
        <label class="check"><input type="checkbox" id="pt-parada"> A máquina / linha está parada</label>
        <div class="grid2"><label class="field"><span>Seu nome</span><input id="pt-nome" required maxlength="80" value="${esc(nome)}"></label>
        <label class="field"><span>Telefone / WhatsApp</span><input id="pt-fone" inputmode="tel" maxlength="30" value="${esc(fone)}"></label></div>
        <footer><button type="button" class="btn" id="pt-cancel">Voltar</button><button class="btn danger" type="submit" id="pt-env">Enviar chamado</button></footer>
      </form></section>`;
  }

  document.addEventListener("click", e=>{
    if(e.target.closest("#pt-novo")){ form = true; enviado = null; formHtml(); window.scrollTo(0,0); }
    if(e.target.closest("#pt-cancel")){ form = false; render(); }
    if(e.target.closest("#pt-todas")){ filtro = ""; render(); }
    const tr = e.target.closest("tr[data-u]"); if(tr){ filtro = tr.dataset.u; render(); }
  });
  document.addEventListener("submit", async e=>{
    if(e.target.id!=="pt-form") return; e.preventDefault();
    const b = $("#pt-env"); b.disabled = true; b.textContent = "Enviando…";
    const dados = {unidade:$("#pt-unid").value, equipamento:$("#pt-eq").value, descricao:$("#pt-desc").value, parada:$("#pt-parada").checked ? "true" : "", nome:$("#pt-nome").value, fone:$("#pt-fone").value};
    try{ localStorage.setItem("pt-nome", dados.nome); localStorage.setItem("pt-fone", dados.fone); }catch(err){}
    const {data, error} = await sb.rpc("abrir_chamado", {p_token: token, p_dados: dados});
    if(error){ b.disabled = false; b.textContent = "Enviar chamado"; alert(/MUITOS/.test(error.message) ? "Muitos chamados na última hora. Ligue para o prestador." : "Não consegui enviar. Confira a internet e tente de novo."); return; }
    enviado = data; form = false; await carregar(); render(); window.scrollTo(0,0);
  });

  if(!/^[A-Za-z0-9_-]{16,128}$/.test(token)) return msg("Link inválido", "Peça um novo link ao prestador de serviço.");
  sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {auth:{persistSession:false, autoRefreshToken:false}});
  carregar(true);
  setInterval(()=>{ if(!document.hidden) carregar(); }, 60000);
})();
