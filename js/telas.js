"use strict";
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
  return `${chamadosHtml()}${pushConvite()}<div class="pagehead"><div><span class="eyebrow">Olá, ${esc(me)}</span><h1>Minhas OS</h1><p class="muted">Lance cada OS com o horário de início e de término.</p></div>
    <div class="row">${monthNav()}${papelNovaBtn()}<button class="btn" data-act="cronoNovo">▶ Iniciar OS agora</button><button class="btn primary" data-act="newDay">+ Lançar OS do dia</button></div></div>
  ${carteiraResumo()}
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
    ${card("carteira","📋 OS recebidas (carteira)","Papéis e telas do TracOS: recebidas, em execução, concluídas e medidas")}
    ${card("equipe","Equipe: acerto e pagamentos","Quanto pagar a cada técnico, vales, recibos")}
    ${card("equipe","Documentos e validades","ASO, NR-10, NR-35, integração, certidões")}
    ${state.cfg.preventivas?card("equipamentos","Equipamentos e preventivas","Histórico por máquina e plano de preventivas"):""}
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
    T("OS pelo papel do TracOS", ["Toque em <b>📷 Nova OS pelo papel</b> e fotografe o papel (ou a tela do TracOS).", "Confira os números e toque em <b>▶ Guardar e iniciar agora</b>: o cronômetro já começa com a OS certa.", "Em <b>Ver carteira</b> você vê as OS recebidas e marca <b>✓ Concluir</b> quando terminar."]),
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
    T("Fechamento por funcionário", ["Ao fechar o período, o app cria <b>um fechamento para cada funcionário</b> (nunca mistura dois).", "Cada PDF sai com o nome do funcionário e da empresa no início do arquivo.", "<b>Todos em um PDF</b> junta tudo num arquivo só, com uma capa de resumo.", "No fechamento, <b>Acerto do funcionário</b> abre quanto pagar a ele naquele período."]),
    T("Carteira de OS (papel ou tela do TracOS)", ["Toque em <b>📷 Nova OS pelo papel</b> (Painel ou Mais → OS recebidas) e fotografe o papel ou a tela do TracOS.", "Confira nº da OS, ID, título, unidade e vencimento e escolha: <b>▶ Guardar e iniciar agora</b>, <b>+ Guardar e lançar horas</b>, <b>📷 Guardar e fotografar o próximo</b> ou só guardar.", "Na carteira cada OS aparece como <b>Recebida → Em execução → Concluída → Medida</b> (quando entra no fechamento). As que vencem em até 3 dias ficam em destaque.", "Vários papéis de uma vez: <b>📚 Vários papéis / PDF</b> e escolha as fotos ou PDFs; o app lê todos e mostra a lista para conferir."]),
    T("Portal da Brejeiro e chamados de emergência", ["Ajustes → <b>Contratantes</b> → <b>🌐 Portal Brejeiro</b> → Ligar portal → <b>Enviar pelo WhatsApp</b>.", "Pelo link, a Brejeiro acompanha ao vivo as OS, as horas por unidade e as assinaturas (os valores podem ser escondidos).", "Lá ela também abre <b>chamado de emergência</b>: o celular de toda a equipe avisa na hora e aparece uma faixa vermelha no app.", "Toque em <b>▶ Atender agora</b>: o cronômetro começa como emergência e a Brejeiro vê no portal quem atendeu e em quanto tempo."]),
    T("Assinatura do responsável da unidade", ["Ao terminar a OS, toque em <b>✍ Assinatura</b> (na linha da OS ou ao editar).", "O responsável escreve o nome e assina com o dedo.", "A assinatura sai no PDF de fotos, no portal e nos indicadores."]),
    T("Indicadores do mês para a Brejeiro", ["Financeiro → no fechamento → <b>📊 Indicadores do mês (PDF)</b>.", "Mostra OS atendidas, horas por unidade, emergências e tempo de resposta, preventivas e % de OS assinadas. Mande junto com o fechamento para a gerência."]),
    T("Documentação para a Brejeiro (integração)", ["Mais → <b>Equipe</b> → Documentação exigida · Brejeiro: a lista oficial deles, da empresa e de cada funcionário.", "Toque em <b>+ incluir</b> em cada item e anexe o PDF ou a foto. FGTS e DARF são mensais: renove todo mês.", "Antes de começar um serviço (72 h antes), toque em <b>Montar pacote (.zip)</b>, marque quem vai e depois em <b>E-mail para a integração</b>; anexe o .zip no e-mail.", "Agende a integração de segurança com 24 h de antecedência (terças e quintas, 07h30)."]),
    T("Banco de horas", ["Ajustes → <b>Valores</b> → marque <b>extras viram folga</b> no funcionário.", "As extras dele passam a ir para o banco (não entram no acerto em dinheiro).", "Mais → Equipe → <b>Folga</b> (desconta horas) ou <b>Pagar horas do banco</b>."]),
    T("Lucro e documentos por funcionário", ["Mais → <b>Equipe</b> → escolha o período: aparece faturado, custo, lucro e margem de cada um.", "Na tabela de documentos, vermelho é vencido e amarelo vence em 30 dias. Toque em <b>+ incluir</b> para cadastrar."]),
    T("Relatório anual (contador)", ["Financeiro → fim da página → <b>Relatório anual</b>.", "Escolha o ano e baixe em <b>PDF</b> ou <b>Excel</b>: faturamento, recebimentos, ISS/INSS/IR retidos, despesas e pagamentos."]),
    T("Backup automático no Google Drive", ["Ajustes → <b>Dados</b> → Backup automático no Google Drive.", "Siga os 4 passos (de preferência no computador) e cole a URL que termina em /exec.", "Toque em <b>Enviar backup agora</b> para testar. Depois vai sozinho todo dia às 03:30 para a pasta “GAAP Backups”."]),
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
const TIPOS_PAG = {vale:["Vale / adiantamento",-1], pagamento:["Pagamento",-1], bonus:["Bônus",1], desconto:["Desconto",-1], folga:["Folga (usa o banco de horas)",0], bancoPago:["Horas do banco pagas",0]};
const HORAS_PAG = ["folga","bancoPago"];
const usaBanco = nome => !!((state.cfg.custos||{})[nome]||{}).banco;
// banco de horas: extras (50% e 100%) entram como crédito; folgas e horas pagas saem
function bancoHoras(nome){
  const desde = ((state.cfg.custos||{})[nome]||{}).bancoDesde || "";
  const cred = state.ap.filter(e=>e.profissional===nome && !e.andamento && !e.orcId && e.data>=desde).reduce((s,e)=>{ const c = calc(e); return s+c.e50+c.e100; },0);
  const deb = Math.round(state.pag.filter(x=>x.profissional===nome && HORAS_PAG.includes(x.tipo)).reduce((s,x)=>s+numIn(x.horas)*60,0));
  return {cred, deb, saldo:cred-deb, desde};
}
const DOCS_FUNC = ["ASO","NR-10","NR-12","NR-35"];
/* documentação exigida pela contratante (FORMSESMT 018 da Brejeiro). mensal = vale pela última competência */
const EXIG_BREJEIRO = {email:"integracao.anapolis@brejeiro.com.br", fones:"(62) 4014-8030 · (62) 99628-4586", antecedencia:72,
  empresa:[["Cartão CNPJ"],["Comprovante de endereço"],["Inscrição Estadual / Municipal"],["Contrato social (última alteração)"],["FGTS Digital (GFD + comprovante + CRF)",1],["DARF Previdenciário + comprovante + CND",1],["PGR"],["PCMSO"],["Seguro de vida (apólice + comprovante)"],["Contrato de prestação de serviço"]],
  funcionario:[["Ordem de Serviço de Segurança"],["Carteira de trabalho (registro)"],["ASO"],["Ficha de EPI"],["RG / CPF / CNH"],["NR-06"],["NR-10"],["NR-12"],["NR-33"],["NR-35"],["Integração na contratante"]]};
function exigencias(emp){ const F = ficha(emp); if(F.exigencias) return F.exigencias; return /brejeiro/i.test(emp||"") ? EXIG_BREJEIRO : null; }
const DOC_MENSAL = new Set([...EXIG_BREJEIRO.empresa, ...EXIG_BREJEIRO.funcionario].filter(x=>x[1]).map(x=>x[0]));
// documento mais recente daquele tipo e titular, com situação
function docAtual(tipo, titular){ const x = state.docs.filter(d=>d.tipo===tipo && (d.titular||"Empresa")===titular).sort((a,b)=>((b.validade||b.emissao||"")).localeCompare(a.validade||a.emissao||""))[0]; return x ? {x, st:docStatus(x)} : null; }
const TIPOS_DOC = [...EXIG_BREJEIRO.empresa.map(x=>x[0]), ...EXIG_BREJEIRO.funcionario.map(x=>x[0]), "ASO","NR-10","NR-11","NR-12","NR-33","NR-35","Integração na contratante","Ficha de EPI","CND Federal","CND FGTS","CND Trabalhista","CND Estadual","CND Municipal","Alvará","Seguro","Contrato","Outro"].filter((t,i,a)=>a.indexOf(t)===i);
function acertoDe(nome, de, ate){
  const aps = state.ap.filter(e=>e.profissional===nome && e.data>=de && e.data<=ate && !e.andamento), c = sumCalc(aps);
  // no banco de horas as extras não entram no acerto em dinheiro (viram folga ou são pagas depois)
  const cu = usaBanco(nome) ? Math.round(aps.reduce((s,e)=>s+custoHora(nome)/60*calc(e).n,0)*100)/100 : Math.round(custoSum(aps)*100)/100;
  const pags = state.pag.filter(x=>x.profissional===nome && ((x.tipo==="pagamento" && x.ref) ? (x.ref.de===de && x.ref.ate===ate) : (x.data>=de && x.data<=ate)));
  const som = t => Math.round(pags.filter(x=>x.tipo===t).reduce((s,x)=>s+numIn(x.valor),0)*100)/100;
  const v = {vale:som("vale"), pago:som("pagamento"), bonus:som("bonus"), desconto:som("desconto"), bancoPago:som("bancoPago")};
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
  ${ps.length?`<div class="fechlist">${ps.map(n=>{ const a = acertoDe(n, q.de, q.ate); const bh = usaBanco(n) ? bancoHoras(n) : null; return `<div class="fechcard" data-pcard="${esc(n)}"><div class="fc-top"><b>${esc(n)}</b><span class="pill ${a.saldo>0.005?"warn":"good"}">${a.saldo>0.005?`A pagar ${brl(a.saldo)}`:"Quitado"}</span></div>
    <div class="fc-vals"><span>Horas<b class="mono">${fdec(a.c.total)} h</b><small>normal ${fdec(a.c.n)} · 50% ${fdec(a.c.e50)} · 100% ${fdec(a.c.e100)}</small></span><span>Custo<b class="mono">${brl(a.cu)}</b><small>${a.aps.length} OS</small></span>
      ${a.bonus||a.desconto?`<span>Bônus / desc.<b class="mono">${brl(a.bonus-a.desconto)}</b></span>`:""}<span>Vales<b class="mono">${brl(a.vale)}</b></span><span>Pago<b class="mono">${brl(a.pago)}</b></span>${bh?`<span>Banco de horas<b class="mono" style="color:${bh.saldo<0?"var(--bad)":"inherit"}">${bh.saldo<0?"−":""}${fdec(Math.abs(bh.saldo))} h</b><small>+${fdec(bh.cred)} extras − ${fdec(bh.deb)} usadas</small></span>`:""}</div>
    ${a.pags.length?`<p class="muted" style="margin:0;font-size:.85rem">${a.pags.map(x=>`${fdate(x.data)} ${TIPOS_PAG[x.tipo]?.[0]||x.tipo} ${pagValTxt(x)}`).join(" · ")}</p>`:""}
    <div class="row fc-acts">${a.saldo>0.005?`<button class="btn sm primary" data-act="pagNovo" data-p="${esc(n)}" data-t="pagamento" data-v="${a.saldo}">Pagar saldo</button>`:""}<button class="btn sm" data-act="pagNovo" data-p="${esc(n)}" data-t="vale">Vale</button><button class="btn sm" data-act="reciboPdf" data-p="${esc(n)}">Recibo / extrato (PDF)</button>${bh?`<button class="btn sm" data-act="pagNovo" data-p="${esc(n)}" data-t="folga">Folga</button><button class="btn sm" data-act="pagNovo" data-p="${esc(n)}" data-t="bancoPago">Pagar horas do banco</button>`:""}</div></div>`; }).join("")}</div>`:`<div class="empty"><b>Nenhum funcionário cadastrado</b>Cadastre em Ajustes → Funcionários.</div>`}
  ${state.pag.length?`<details class="fichabox" style="margin-top:10px"><summary>Todos os vales e pagamentos (${state.pag.length})</summary><div class="list">${[...state.pag].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,100).map(x=>`<button class="item" data-act="pagEditar" data-id="${esc(x.id)}"><span class="mono">${fdate(x.data)}</span><span><b>${esc(x.profissional)}</b> · ${TIPOS_PAG[x.tipo]?.[0]||esc(x.tipo)}${x.obs?`<br><small class="muted">${esc(x.obs)}</small>`:""}</span><span class="mono">${pagValTxt(x)}</span></button>`).join("")}</div></details>`:""}
  </section>
  ${temCustos()?`<section class="section"><header><h2>Lucro por funcionário (${fdate(q.de)} a ${fdate(q.ate)})</h2></header>
  ${dimTable(state.ap.filter(e=>e.data>=q.de && e.data<=q.ate && !e.orcId && !e.andamento), "prof", {lucro:true}) || `<p class="muted">Precisa de lançamentos de pelo menos dois funcionários no período.</p>`}
  <p class="muted" style="margin:0">Faturado = valor cobrado da empresa pelas horas de cada um. Custo = o que você paga a ele (com as extras). Só você vê.</p></section>`:""}
  ${exigHtml(ps)}
  ${ps.length && !empresasCfg().some(exigencias)?`<section class="section"><header><h2>Documentos de cada funcionário</h2></header><div class="tablewrap"><table class="docmat"><thead><tr><th>Funcionário</th>${DOCS_FUNC.map(t=>`<th>${t}</th>`).join("")}</tr></thead>
  <tbody>${ps.map(n=>`<tr><td><b>${esc(n)}</b></td>${DOCS_FUNC.map(t=>{ const x = state.docs.filter(d=>d.titular===n && d.tipo===t).sort((a,b)=>(b.validade||"").localeCompare(a.validade||""))[0];
    if(!x) return `<td><button class="btn sm" data-act="docNovo" data-t="${t}" data-p="${esc(n)}">+ incluir</button></td>`; const [cl] = docStatus(x);
    return `<td><button class="pill ${cl||"info"}" style="border:0;cursor:pointer" data-act="docEditar" data-id="${esc(x.id)}">${x.validade?(cl==="bad"?"vencido ":"")+fdate(x.validade):"sem validade"}</button></td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
  <p class="muted" style="margin:0">Vermelho: vencido (a contratante pode barrar a entrada). Amarelo: vence em até 30 dias. Você recebe aviso no Painel e no celular.</p></section>`:""}
  <section class="section" id="documentos"><header><h2>Documentos e validades</h2><button class="btn sm primary" data-act="docNovo">+ Documento</button></header>
  ${docs.length?`<div class="list">${docs.map(x=>{ const [cl, st] = docStatus(x); return `<button class="item" data-act="docEditar" data-id="${esc(x.id)}"><span><b>${esc(x.tipo||"")}</b><br><small class="muted">${esc(x.titular||"Empresa")}</small></span><span>${x.obs?`<small class="muted">${esc(x.obs)}</small>`:""}${x.arquivo?' <span class="pill">📎</span>':""}</span><span class="pill ${cl}">${st}</span></button>`; }).join("")}</div>`:`<div class="empty"><b>Nenhum documento</b>Cadastre ASO, NRs, integração e certidões com a validade: o sistema avisa 30 dias antes de vencer.</div>`}
  </section>`;
}
const pagValTxt = x => x.tipo==="folga" ? `${fdec(numIn(x.horas)*60)} h` : x.tipo==="bancoPago" ? `${fdec(numIn(x.horas)*60)} h · ${brl(numIn(x.valor))}` : brl(numIn(x.valor));
const docCel = (tipo, tit) => { const a = docAtual(tipo, tit); if(!a) return `<button class="btn sm" data-act="docNovo" data-t="${esc(tipo)}" data-p="${esc(tit)}">+ incluir</button>`;
  const [cl] = a.st; return `<button class="pill ${cl||"info"}" style="border:0;cursor:pointer" data-act="docEditar" data-id="${esc(a.x.id)}">${a.x.validade?(cl==="bad"?"vencido ":"")+fdate(a.x.validade):"ok"}${a.x.arquivo?" 📎":""}</button>`; };
const docOk = (tipo, tit) => { const a = docAtual(tipo, tit); return !!a && a.st[0]!=="bad"; };
function exigHtml(ps){
  return empresasCfg().filter(exigencias).map(emp=>{ const E = exigencias(emp), fe = E.empresa.map(x=>x[0]), ff = E.funcionario.map(x=>x[0]);
    const okE = fe.filter(t=>docOk(t,"Empresa")).length, okF = ps.map(n=>ff.filter(t=>docOk(t,n)).length);
    return `<section class="section" id="exig-${slug(emp)}"><header><h2>Documentação exigida · ${esc(emp)}</h2><div class="row"><button class="btn sm primary" data-act="exigZip" data-emp="${esc(emp)}">Montar pacote (.zip)</button><button class="btn sm" data-act="exigEmail" data-emp="${esc(emp)}">E-mail para a integração</button><button class="btn sm" data-act="exigDeclaracao" data-emp="${esc(emp)}">Declaração de regularidade (PDF)</button></div></header>
    ${okE===fe.length && okF.every(v=>v===ff.length) && ps.length?`<div class="banner" style="border-color:var(--good)"><span>✅ <b>Documentação 100% em dia</b>: empresa e ${ps.length} funcionário(s). O selo sai na declaração dentro do pacote.</span></div>`:""}
    <p class="muted" style="margin:0 0 8px">Enviar para <b>${esc(E.email||"")}</b> com pelo menos <b>${E.antecedencia||72} h</b> de antecedência do início do serviço.${E.fones?` Dúvidas: ${esc(E.fones)}.`:""} FGTS e DARF valem só pela última competência: renove todo mês.</p>
    <h3 style="margin:6px 0">Da empresa <span class="pill ${okE===fe.length?"good":"warn"}">${okE}/${fe.length}</span></h3>
    <div class="list">${fe.map(t=>`<div class="item" style="cursor:default"><span>${esc(t)}${DOC_MENSAL.has(t)?' <small class="muted">(mensal)</small>':""}</span><span></span><span>${docCel(t,"Empresa")}</span></div>`).join("")}</div>
    ${ps.length?`<h3 style="margin:12px 0 6px">Dos funcionários</h3><div class="tablewrap"><table class="docmat"><thead><tr><th>Funcionário</th><th>Completo</th>${ff.map(t=>`<th>${esc(t)}</th>`).join("")}</tr></thead>
    <tbody>${ps.map((n,i)=>`<tr><td><b>${esc(n)}</b></td><td><span class="pill ${okF[i]===ff.length?"good":"warn"}">${okF[i]}/${ff.length}</span></td>${ff.map(t=>`<td>${docCel(t,n)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <p class="muted" style="margin:6px 0 0">A integração de segurança é obrigatória para todos: agende com 24 h de antecedência (terças e quintas, chegar entre 07h30 e 08h00 no Departamento de Segurança).</p>`:""}</section>`; }).join("");
}
async function declaracaoPdf(emp, quem){
  const E = exigencias(emp); if(!E) return null; const doc = pdfDoc(); if(!doc) return null;
  const itens = [...E.empresa.map(([t])=>[t,"Empresa"]), ...quem.flatMap(n=>E.funcionario.map(([t])=>[t,n]))];
  const linhas = itens.map(([t,n])=>{ const a = docAtual(t,n); const ok = !!a && a.st[0]!=="bad"; return {ok, row:[n, t, a ? (a.x.validade ? fdate(a.x.validade) : "sem validade") : "-", !a ? "FALTA" : a.st[0]==="bad" ? "VENCIDO" : a.st[0]==="warn" ? "VENCE EM BREVE" : "EM DIA"]}; });
  const tudo = linhas.every(l=>l.ok);
  let y = pdfHeader(doc, "DECLARAÇÃO DE REGULARIDADE", [`Documentação para ${emp}`, `Emitida em ${fdate(today())}`]);
  if(tudo){ const W = pw(doc); doc.setDrawColor(...GREEN); doc.setLineWidth(1.2); doc.roundedRect(W/2-55, y, 110, 22, 4, 4); doc.setTextColor(...GREEN); doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.text("DOCUMENTAÇÃO 100% EM DIA", W/2, y+10, {align:"center"}); doc.setFontSize(8.5); doc.setFont("helvetica","normal"); doc.text(`${quem.length} colaborador(es) · ${linhas.length} documentos conferidos`, W/2, y+17, {align:"center"}); y += 30; }
  else { doc.setTextColor(180,40,30); doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.text(`Pendências: ${linhas.filter(l=>!l.ok).length} documento(s)`, 14, y+4); y += 10; }
  doc.setTextColor(...INK); doc.setFont("helvetica","normal"); doc.setFontSize(9.5);
  doc.splitTextToSize(`${state.cfg.empresa.nome}${state.cfg.empresa.cnpj?`, CNPJ ${state.cfg.empresa.cnpj}`:""}, declara que a documentação abaixo, exigida pela ${emp} para a realização de serviços terceirizados, foi conferida nesta data, com a situação indicada.`, pw(doc)-28).forEach(l=>{ doc.text(l, 14, y); y += 5; });
  doc.autoTable({startY:y+2, theme:"grid", margin:{left:14, right:14}, head:[["De quem","Documento","Validade","Situação"]], body:linhas.map(l=>l.row), styles:{fontSize:8.5, cellPadding:1.4, textColor:INK}, headStyles:{fillColor:GREEN},
    didParseCell:d=>{ if(d.section==="body" && d.column.index===3){ const v = d.cell.raw; d.cell.styles.fontStyle = "bold"; d.cell.styles.textColor = v==="EM DIA" ? GREEN : v==="VENCE EM BREVE" ? [180,120,20] : [180,40,30]; } }});
  signature(doc, doc.lastAutoTable.finalY + 16, state.cfg.empresa.nome, ""); pdfFooter(doc);
  return {nome:`declaracao-regularidade-${slug(emp)}-${today()}.pdf`, blob:doc.output("blob"), tudo};
}
async function exigZip(emp, quem){
  const E = exigencias(emp); if(!E) return; if(!window.JSZip) await loadScript(JSZIP);
  const zip = new JSZip(), falta = [], itens = [...E.empresa.map(([t])=>[t,"Empresa"]), ...quem.flatMap(n=>E.funcionario.map(([t])=>[t,n]))];
  toast("Montando o pacote…");
  for(const [t, tit] of itens){ const a = docAtual(t, tit);
    if(!a || !a.x.arquivo || a.st[0]==="bad"){ falta.push(`${tit} - ${t}${a && a.st[0]==="bad"?" (vencido)":a && !a.x.arquivo?" (sem arquivo anexado)":""}`); continue; }
    const {data, error} = await sb.storage.from("documentos").download(a.x.arquivo); if(error || !data){ falta.push(`${tit} - ${t} (não consegui baixar)`); continue; }
    const ext = a.x.arquivo.split(".").pop(), pasta = tit==="Empresa" ? "1 - Empresa" : `2 - Funcionarios/${slug(tit)}`;
    zip.file(`${pasta}/${slug(t)}.${ext}`, data); }
  const dec = await declaracaoPdf(emp, quem); if(dec) zip.file(`0 - ${dec.nome}`, dec.blob);
  zip.file("LEIA-ME.txt", `Documentação ${state.cfg.empresa.nome} para ${emp}\r\nEnviar para: ${E.email}\r\nFuncionários: ${quem.join(", ")}\r\n\r\n${falta.length?`FALTANDO (${falta.length}):\r\n${falta.join("\r\n")}`:"Documentação completa."}\r\n`);
  const blob = await zip.generateAsync({type:"blob"});
  await offerFile(`documentacao-${slug(state.cfg.empresa.nome||"gaap")}-${slug(emp)}-${today()}.zip`, blob);
  if(falta.length) toast(`Pacote montado. Faltam ${falta.length} item(ns): veja o LEIA-ME dentro do zip.`);
}
function pagForm(x){
  return `<header><h2>${x.id?"Editar":"Novo"} lançamento da equipe</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <form class="form" id="pagForm" data-id="${esc(x.id||"")}">
    <div class="grid2"><label class="field"><span>Funcionário</span><select id="pg-prof">${profs().map(n=>`<option ${x.profissional===n?"selected":""}>${esc(n)}</option>`).join("")}</select></label>
    <label class="field"><span>Tipo</span><select id="pg-tipo">${Object.entries(TIPOS_PAG).map(([k,[l]])=>`<option value="${k}" ${(x.tipo||"vale")===k?"selected":""}>${l}</option>`).join("")}</select></label>
    <label class="field"><span>Data</span><input type="date" id="pg-data" value="${esc(x.data||today())}"></label>
    <label class="field"><span>Valor (R$)</span><input id="pg-valor" inputmode="decimal" value="${x.valor!=null?String(Math.round(numIn(x.valor)*100)/100).replace(".",","):""}"></label></div>
    <label class="field"><span>Horas (para folga ou horas do banco pagas)</span><input id="pg-horas" inputmode="decimal" value="${x.horas!=null?String(x.horas).replace(".",","):""}" placeholder="Ex.: 8"></label>
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
  if(state.cfg.preventivas) state.eq.filter(q=>!q.inativo).forEach(q=>prevStatus(q).forEach(s=>{ if(s.nivel!=="good") out.push({nivel:s.nivel, txt:`Preventiva ${q.tag}: ${s.pl.atividade} ${!s.ult?"nunca feita":s.d<0?`atrasada ${-s.d} dia(s)`:s.d===0?"vence hoje":`vence em ${s.d} dia(s)`}`, btn:`<button class="btn sm" data-act="eqVer" data-id="${esc(q.id)}">Ver</button>`}); }));
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
  return `${chamadosHtml()}${aprovacoesHtml()}${pushConvite()}${exampleBanner()}
  <div class="pagehead"><div><span class="eyebrow">${WD[new Date().getDay()]}, ${fdate(today())}</span><h1>Painel</h1></div><div class="row">${monthNav()}${papelNovaBtn()}<button class="btn" data-act="cronoNovo">▶ Iniciar OS agora</button></div></div>
  ${carteiraResumo()}
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

