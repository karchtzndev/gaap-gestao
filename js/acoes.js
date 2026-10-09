"use strict";
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
      const usadas = new Set([...state.ap, ...state.desp].flatMap(x=>x.fotos||[]).concat(state.ord.map(o=>o.foto).filter(Boolean))), fotos = (data?.fotos||[]).filter(f=>f && !usadas.has(f));
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
  fechJuntos(b){ const f = state.fech.find(x=>x.id===b.dataset.id); if(f) fechJuntosPdf(fechIrmaos(f).length ? fechIrmaos(f) : [f]); },
  fechAcerto(b){ const f = state.fech.find(x=>x.id===b.dataset.id); if(!f) return; state.eqp = {de:f.de, ate:f.ate}; closeModal(); state.view = "equipe"; state.rendered = null; render(); setTimeout(()=>document.querySelector(`[data-pcard="${CSS.escape(f.profissional||"")}"]`)?.scrollIntoView({block:"center"}), 50); },
  anualPdf(){ anualRel("pdf"); }, anualXlsx(){ anualRel("xlsx"); },
  async driveSalvar(b){ const url = ($("#drv-url")?.value||"").trim(); if(url && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)){ toast("Cole a URL do App da Web (termina em /exec)."); return; }
    b.disabled = true; const {error} = await sb.rpc("drive_config", {p_url: url ? `${url}?k=${driveChave()}` : ""}); b.disabled = false; if(error){ toast(writeErr(dbErr(error))); return; } toast(url ? "Google Drive ligado. Backup todo dia às 03:30." : "Backup no Drive desligado."); carregarDrive(); },
  async driveAgora(b){ b.disabled = true; b.textContent = "Enviando…"; const {data, error} = await sb.functions.invoke("backup-drive", {body:{agora:true}}); b.disabled = false; b.textContent = "Enviar backup agora"; toast(error || !data?.ok ? `Não consegui enviar: ${data?.erro || "confira a URL e a autorização do script"}.` : `Backup salvo no Drive: ${data.arquivo}.`); carregarDrive(); },
  async driveCopiar(){ try{ await navigator.clipboard.writeText(driveScript()); toast("Código copiado. Cole no Apps Script."); }catch(e){ toast("Selecione o código e copie manualmente."); } },
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
  exigZip(b){ const emp = b.dataset.emp, ps = profs(); openModal(`<header><h2>Pacote de documentação · ${esc(emp)}</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
    <div class="form"><p class="muted" style="margin:0">Marque quem vai trabalhar. O pacote leva os documentos da empresa e os desses funcionários, separados em pastas, e um LEIA-ME com o que estiver faltando.</p>
    ${ps.map(n=>`<label class="check"><input type="checkbox" class="ex-p" value="${esc(n)}" checked> ${esc(n)}</label>`).join("")}
    <footer><button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="exigZipOk" data-emp="${esc(emp)}">Montar .zip</button></footer></div>`); },
  async exigZipOk(b){ const quem = [...document.querySelectorAll(".ex-p:checked")].map(i=>i.value), emp = b.dataset.emp; b.disabled = true; closeModal(); await exigZip(emp, quem); },
  exigEmail(b){ const emp = b.dataset.emp, E = exigencias(emp), ps = profs(), falta = [...E.empresa.map(([t])=>[t,"Empresa"]), ...ps.flatMap(n=>E.funcionario.map(([t])=>[t,n]))].filter(([t,n])=>!docOk(t,n));
    const corpo = `Bom dia,\n\nSegue em anexo a documentação da ${state.cfg.empresa.nome} (CNPJ ${state.cfg.empresa.cnpj||""}) para a realização de serviços terceirizados na ${emp}.${falta.length?"":" Toda a documentação está em dia, conforme a declaração de regularidade anexa."}\n\nColaboradores:\n${ps.map(n=>"- "+n).join("\n")}\n\nFicamos à disposição para agendar a integração de segurança.\n\nAtenciosamente,\n${state.cfg.empresa.nome}\n${state.cfg.empresa.telefone||""}`;
    if(falta.length && !confirm(`Ainda faltam ${falta.length} documento(s) (ex.: ${falta.slice(0,3).map(([t,n])=>`${n} - ${t}`).join("; ")}). Abrir o e-mail mesmo assim?`)) return;
    location.href = `mailto:${E.email}?subject=${encodeURIComponent(`Documentação para serviços terceirizados - ${state.cfg.empresa.nome}`)}&body=${encodeURIComponent(corpo)}`;
    toast("Anexe o .zip do pacote no e-mail."); },
  docNovo(b){ state.docArq = null; openModal(docForm({tipo:b?.dataset?.t, titular:b?.dataset?.p})); },
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
  assinar(b){ assinPad(b.dataset.row!=null ? +b.dataset.row : null); },
  assinLimpar(){ const cv = $("#as-cv"); if(!cv) return; const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0,0,cv.width,cv.height); state.assinTracos = 0; },
  assinFechar(){ $("#assinpad")?.remove(); },
  assinOk(){ assinConfirmar(); },
  portalAbrir(b){ portalModal(b.dataset.emp); },
  async portalLigar(b){ const emp = b.dataset.emp; b.disabled = true; try{ await portalSalvarFicha(emp, {portal:true}); await sb.rpc("criar_portal", {p_emp:emp}); await portalPublicar(); portalModal(emp); toast("Portal ligado."); }catch(err){ b.disabled = false; toast(writeErr(err)); } },
  async portalDesligar(b){ if(!b.dataset.armed){ b.dataset.armed = "1"; b.textContent = "Confirmar: desligar"; return; } const emp = b.dataset.emp; await sb.rpc("desligar_portal", {p_emp:emp}); await portalSalvarFicha(emp, {portal:false}); closeModal(); toast("Portal desligado: o link parou de funcionar."); },
  async portalTrocar(b){ if(!b.dataset.armed){ b.dataset.armed = "1"; b.textContent = "Confirmar: gerar novo link"; return; } const emp = b.dataset.emp; await sb.rpc("trocar_portal", {p_emp:emp}); await portalPublicar(); portalModal(emp); toast("Novo link gerado. Envie de novo para a contratante."); },
  async portalCopiar(){ const v = $("#pt-link")?.value; try{ await navigator.clipboard.writeText(v); toast("Link copiado."); }catch(e){ $("#pt-link")?.select(); } },
  portalZap(b){ const emp = b.dataset.emp, F = ficha(emp), v = $("#pt-link")?.value; const txt = `Olá! Este é o portal de serviços da ${state.cfg.empresa.nome} para a ${emp}.\n\nPor ele vocês acompanham ao vivo as ordens de serviço, as horas por unidade e as assinaturas, e podem abrir um *chamado de emergência*: a nossa equipe é avisada no celular na hora.\n\n${v}`;
    window.open(`https://wa.me/${(F.whats||"").replace(/\D/g,"") ? "55"+(F.whats||"").replace(/\D/g,"").replace(/^55/,"") : ""}?text=${encodeURIComponent(txt)}`, "_blank"); },
  chamadoAtender(b){ const c = (state.chamados||[]).find(x=>x.id===b.dataset.id); if(!c) return; const d = c.data||{}, cr = new Date(c.criado_em);
    state.chamadoAt = {id:c.id, as:hhmm(cr.getHours()*60+cr.getMinutes())}; state.crIds = null;
    openModal(cronoForm({emp:c.empresa, unid:d.unidade, emerg:true, desc:[d.equipamento, d.descricao].filter(Boolean).join(" - "), acPor:d.nome||"", acMeio:"Portal"}));
    const mot = $("#cr-ac-mot"); if(mot) mot.value = d.descricao||""; },
  async chamadoCancelar(b){ if(!b.dataset.armed){ b.dataset.armed = "1"; b.textContent = "Confirmar cancelamento"; return; } await sb.rpc("cancelar_chamado", {p_id:b.dataset.id}); await carregarChamados(); state.rendered = null; render(); },
  indicadoresPdf(b){ const f = state.fech.find(x=>x.id===b.dataset.id); if(f) indicadoresPdf(f); },
  exigDeclaracao(b){ declaracaoPdf(b.dataset.emp, profs()).then(r=>r && offerFile(r.nome, r.blob)); },
  papelFechar(){ $("#papelbox")?.remove(); state.papel = null; },
  papelUsar(){ papelAplicar(); },
  papelAcao(b){ const acao = b.dataset.acao;
    if(!soDig($("#pp-os")?.value)){ toast("Informe o nº da OS."); $("#pp-os")?.focus(); return; }
    if(acao==="proximo"){ // a câmera precisa abrir no mesmo toque (regra do iPhone)
      const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.setAttribute("capture", "environment"); inp.dataset.papel = "proximo"; inp.hidden = true; document.body.appendChild(inp); inp.click(); }
    papelAplicar(acao); },
  loteSalvar(b){ loteSalvar(b); },
  cartFiltro(b){ state.cartF = b.dataset.f; state.rendered = null; render(); },
  ordNova(){ openModal(ordForm({})); },
  ordEditar(b){ const o = state.ord.find(x=>x.id===b.dataset.id); if(o) openModal(ordForm(o)); },
  ordIniciar(b){ const o = state.ord.find(x=>x.id===b.dataset.id); if(o) ordIniciar(o); },
  ordLancar(b){ const o = state.ord.find(x=>x.id===b.dataset.id); if(o) ordLancar(o); },
  async ordConcluir(b){ const o = state.ord.find(x=>x.id===b.dataset.id); if(!o) return; const fim = b.dataset.v==="1";
    if(fim && ordStatus(o).and){ toast("Essa OS está com cronômetro aberto. Encerre antes de concluir."); return; }
    const x = {...o, concluida:fim}; delete x._naps; if(fim) x.concluidaEm = new Date().toISOString(); else { delete x.concluidaEm; delete x.concluidaPor; }
    try{ await save("ordens", x); toast(fim ? `OS ${o.os} concluída.` : `OS ${o.os} reaberta.`); state.rendered = null; render(); }catch(err){ toast(writeErr(err)); } },
  async ordExcluir(b){ if(!b.dataset.armed){ b.dataset.armed = "1"; b.textContent = "Confirmar exclusão"; return; } try{ await removeDoc("ordens", b.dataset.id); closeModal(); state.rendered = null; render(); toast("OS tirada da carteira (fica na lixeira)."); }catch(err){ toast(writeErr(err)); } },
  papelNum(b){ const el = $("#"+(state.papelCampo||"pp-os")); if(el){ el.value = b.dataset.n; state.papelCampo = state.papelCampo==="pp-os" ? "pp-tid" : "pp-os"; } },
  pushDepois(){ try{ localStorage.setItem("gaap-push-depois", today()); }catch(e){} state.rendered = null; render(); },
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
      const ids = [...new Set([...state.ap, ...state.orc, ...state.desp].flatMap(x=>x.fotos||[]).concat(state.ord.map(o=>o.foto).filter(Boolean)))].filter(id=>tempo(id) > desde);
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
