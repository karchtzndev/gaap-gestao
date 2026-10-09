"use strict";
/* ---------- AJUSTES ---------- */
function vAjustes(){
  setTimeout(()=>{ carregarBackups(); carregarLixeira(); carregarDrive();
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
      <div class="tablewrap"><table class="inputs"><thead><tr><th>Funcionário</th><th>Como você paga</th><th>Valor (R$)</th><th>Banco de horas</th></tr></thead><tbody>
      ${profs().map(n=>{ const cu=(c.custos||{})[n]||{}; return `<tr data-cu="${esc(n)}"><td>${esc(n)}</td><td><select class="cu-t" aria-label="Forma de pagamento de ${esc(n)}"><option value="hora" ${cu.tipo!=="mes"?"selected":""}>Por hora</option><option value="mes" ${cu.tipo==="mes"?"selected":""}>Salário mensal</option></select></td><td><input class="cu-v" inputmode="decimal" aria-label="Valor pago a ${esc(n)}" value="${cu.valor!=null?String(cu.valor).replace(".",","):""}" placeholder="0,00"></td><td><label class="check"><input type="checkbox" class="cu-b" ${cu.banco?"checked":""} aria-label="Banco de horas de ${esc(n)}"> extras viram folga</label></td></tr>`; }).join("") || `<tr><td colspan="4" class="muted">Cadastre os funcionários acima e salve para preencher os custos.</td></tr>`}
      </tbody></table></div>
      <p class="muted" style="margin:0">Por hora: a hora extra do funcionário usa os mesmos adicionais (${c.extraPct}% e ${c.feriadoPct}%). Salário mensal: o custo da hora é o salário dividido por ${HORAS_MES} horas (padrão da CLT), com os mesmos adicionais nas extras.</p>
      <div class="tablewrap"><table class="inputs"><thead><tr><th>Empresa</th><th>Valor da hora (R$)</th><th>Extra (%)</th><th>Domingo e feriado (%)</th><th>Adicional noturno (%)</th></tr></thead><tbody>
      ${empresasCfg().map(n=>{ const t=(c.taxas||{})[n]||{}; return `<tr data-tx="${esc(n)}"><td>${esc(n)}</td><td><input class="tx-v" inputmode="decimal" aria-label="Valor da hora de ${esc(n)}" value="${t.valorHora!=null?String(t.valorHora).replace(".",","):""}" placeholder="${String(c.valorHora).replace(".",",")}"></td><td><input class="tx-p50" type="number" min="0" aria-label="Extra de ${esc(n)}" value="${t.extraPct??""}" placeholder="${c.extraPct}"></td><td><input class="tx-p100" type="number" min="0" aria-label="Domingo e feriado de ${esc(n)}" value="${t.feriadoPct??""}" placeholder="${c.feriadoPct}"></td><td><input class="tx-not" type="number" min="0" aria-label="Adicional noturno de ${esc(n)}" value="${t.noturnoPct??""}" placeholder="${c.noturnoPct||0}" title="Horas entre 22h e 5h: acréscimo sobre o valor da hora"></td></tr>`; }).join("") || `<tr><td colspan="5" class="muted">Cadastre as empresas acima e salve.</td></tr>`}
      </tbody></table></div>
      <div class="row">${empresasCfg().map(n=>`<button type="button" class="btn sm" data-act="reajuste" data-emp="${esc(n)}">Reajustar ${esc(n)}${(c.taxas||{})[n]?.desde?` (desde ${fdate(c.taxas[n].desde)})`:""}</button>`).join("")}</div>
      <p class="muted" style="margin:0">Em branco usa o valor padrão (${brl(c.valorHora)}, ${c.extraPct}% e ${c.feriadoPct}%). Valores novos valem para os próximos lançamentos; os já lançados mantêm o valor da época.</p>
    </div>
    <div class="panel form" data-aba="contratantes"><div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">Ficha das contratantes</h3><span class="row">${empresasCfg().map(n=>`<button type="button" class="btn sm" data-act="portalAbrir" data-emp="${esc(n)}">🌐 Portal ${esc(n)}${ficha(n).portal?" (ligado)":""}</button>`).join("")}<button type="button" class="btn sm" data-act="novaEmpresa">+ Nova empresa</button></span></div>
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
    <div class="panel form" data-aba="empresa"><h3>Partes do sistema</h3>
      <label class="check"><input type="checkbox" id="c-prev" ${c.preventivas?"checked":""}> Mostrar equipamentos e preventivas (deixe desligado se a preventiva é feita pelo time interno da contratante)</label>
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
    <div class="panel form" id="drive"><h3>Backup automático no Google Drive</h3>
      <p class="muted" style="margin:0">Todo dia às 03:30 o servidor manda uma cópia dos dados para uma pasta “GAAP Backups” no <b>seu</b> Google Drive (guarda as últimas 60). Configura uma vez só, uns 5 minutos, de preferência no computador:</p>
      <ol class="muted" style="margin:0;padding-left:20px">
        <li>Entre em <b>script.google.com</b> com a sua conta Google e clique em <b>Novo projeto</b>.</li>
        <li>Apague o que estiver lá e cole este código: <button type="button" class="btn sm" data-act="driveCopiar">Copiar código</button></li>
        <li>Clique em <b>Implantar → Nova implantação</b>, tipo <b>App da Web</b>. Executar como: <b>Eu</b>. Quem pode acessar: <b>Qualquer pessoa</b>. Clique em Implantar e autorize com a sua conta (em “Avançado”, clique em “Acessar”).</li>
        <li>Copie a <b>URL do app da Web</b> (termina em /exec), cole abaixo e salve.</li></ol>
      <details><summary class="muted">Ver o código</summary><pre class="codebox" id="drv-code">${esc(driveScript())}</pre></details>
      <label class="field"><span>URL do app da Web</span><input id="drv-url" inputmode="url" placeholder="https://script.google.com/macros/s/…/exec"></label>
      <div id="drv-status" class="muted">Verificando…</div>
      <div class="row"><button type="button" class="btn primary" data-act="driveSalvar">Salvar</button><button type="button" class="btn" data-act="driveAgora">Enviar backup agora</button></div>
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
function backupDados(){ return {sistema:"GAAP Gestão de Serviços", versao:2, exportadoEm:new Date().toISOString(), config:state.cfg, apontamentos:state.ap, orcamentos:state.orc, recebimentos:state.rec, fechamentos:state.fech, despesas:state.desp, pagamentos:state.pag, equipamentos:state.eq, documentos:state.docs, ordens:state.ord, perfis:state.perfis||[]}; }
function backupIdade(){
  const b = state.cfg.backupBaixadoEm; if(!b) return `<span class="pill warn">Você ainda não baixou nenhuma cópia completa.</span>`;
  const dias = Math.floor((Date.now() - new Date(b).getTime())/86400000);
  return `<span class="pill ${dias>7?"warn":"good"}">Última cópia completa: ${new Date(b).toLocaleDateString("pt-BR")} (${dias===0?"hoje":dias===1?"ontem":`há ${dias} dias`})</span>`;
}
// chave que só o seu script conhece (fica na URL salva no servidor)
function driveChave(){ let k = state.cfg.driveChave; if(!k){ k = state.cfg.driveChave = Array.from(crypto.getRandomValues(new Uint8Array(18)), b=>b.toString(16).padStart(2,"0")).join(""); saveCfg(clone(state.cfg)).catch(()=>{}); } return k; }
function driveScript(){ return `// GAAP Gestão - backup automático no Google Drive
const CHAVE = "${state.cfg.driveChave || "(abra esta tela de novo para gerar a chave)"}";
const PASTA = "GAAP Backups", MANTER = 60;
function doPost(e) {
  const out = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
  if (!e || !e.parameter || e.parameter.k !== CHAVE) return out({ ok: false, erro: "chave errada" });
  const it = DriveApp.getFoldersByName(PASTA), pasta = it.hasNext() ? it.next() : DriveApp.createFolder(PASTA);
  const nome = String(e.parameter.nome || "gaap-backup.json").replace(/[^\\w.-]/g, "_");
  const arq = pasta.createFile(nome, e.postData.contents, "application/json");
  const todos = []; const fs = pasta.getFiles(); while (fs.hasNext()) todos.push(fs.next());
  todos.sort((a, b) => b.getDateCreated() - a.getDateCreated()).slice(MANTER).forEach(f => f.setTrashed(true));
  return out({ ok: true, arquivo: nome, tamanho: arq.getSize() });
}
function autorizar() { DriveApp.getRootFolder(); }`; }
async function carregarDrive(){ const box = $("#drv-status"); if(!box) return; driveChave(); const c = $("#drv-code"); if(c) c.textContent = driveScript();
  let data = null, error = null; try{ ({data, error} = (await sb.rpc("drive_status")) || {}); }catch(e){ error = e; } if(!$("#drv-status")) return;
  if(error || !data){ $("#drv-status").textContent = "Não consegui verificar agora."; return; }
  let u = null; try{ u = data.ultimo ? JSON.parse(data.ultimo) : null; }catch(e){}
  $("#drv-status").innerHTML = !data.configurado ? `<span class="pill warn">Ainda não ligado</span>` : `<span class="pill good">Ligado</span> ${u ? (u.ok ? `Último backup: ${new Date(u.em).toLocaleString("pt-BR")} (${esc(u.arquivo||"")})` : `<span class="pill bad">Falhou em ${new Date(u.em).toLocaleString("pt-BR")}: ${esc(u.erro||"")}</span>`) : "Nenhum backup enviado ainda."}`; }
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
  c.tolerancia = Math.max(0, +g("c-tol") || 0); c.carimbo = !!$("#c-carimbo")?.checked; c.preventivas = !!$("#c-prev")?.checked;
  c.profissionais = lines(g("c-profs")).join("\n"); c.unidades = lines(g("c-unids")).join("\n");
  c.feriados = {carnaval:$("#c-carn").checked, corpus:$("#c-corp").checked, extras:g("c-fer")};
  c.empresa = {nome:g("e-nome"), cnpj:g("e-cnpj"), email:g("e-email"), telefone:g("e-tel"), cidade:g("e-cid"), responsavel:g("e-resp"), sobre:g("e-sobre"), codServico:g("e-codserv"), issPct:g("e-iss")};
  const cuOld = c.custos || {}; c.custos = {}; document.querySelectorAll("[data-cu]").forEach(tr=>{ const v = numIn(tr.querySelector(".cu-v").value), bco = !!tr.querySelector(".cu-b")?.checked, o = cuOld[tr.dataset.cu] || {};
    if(v>0 || bco) c.custos[tr.dataset.cu] = {tipo:tr.querySelector(".cu-t").value, valor:v, ...(bco?{banco:true, bancoDesde:o.banco && o.bancoDesde ? o.bancoDesde : today()}:{})}; });
  c.contratantes = {}; document.querySelectorAll("[data-ct]").forEach(el=>{ const q = k=>el.querySelector(k);
    c.contratantes[el.dataset.ct] = {...((state.cfg.contratantes||{})[el.dataset.ct]||{}), razao:q(".ct-razao").value.trim(), cnpj:q(".ct-cnpj").value.trim(), aprovador:q(".ct-apr").value.trim(), cargo:q(".ct-cargo").value.trim(), whats:q(".ct-whats").value.trim(), email:q(".ct-email").value.trim(), corte:Math.min(28,Math.max(0,+q(".ct-corte").value||0)), prazo:Math.max(0,+q(".ct-prazo").value||0), exigirOS:q(".ct-exos").checked, unidades:lines(q(".ct-unids").value).join("\n"), codigo:q(".ct-cod").value.trim(), nomeFech:q(".ct-nomef").value.trim(), osLista:lines(q(".ct-oslista").value).join("\n")}; });
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

