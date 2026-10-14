// Página pública da proposta: o cliente confere, escolhe a opção (quando houver duas) e aprova com nome e assinatura.
(function(){
  "use strict";
  const $ = s => document.querySelector(s);
  const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fdate = d => d ? String(d).slice(0,10).split("-").reverse().join("/") : "";
  const brl = v => (Number(v)||0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
  const num = v => String(v).replace(".", ",");
  const lista = t => String(t||"").split("\n").map(x=>x.trim()).filter(Boolean);
  const view = $("#view");
  const token = (new URLSearchParams(location.hash.slice(1))).get("t") || "";
  const C = window.GAAP_CONFIG || {};
  let sb, dados, assinou = false;

  function msg(t, sub){ view.innerHTML = `<div class="card"><h2>${esc(t)}</h2>${sub?`<p class="muted">${esc(sub)}</p>`:""}</div>`; }

  async function iniciar(){
    if(!/^[A-Za-z0-9_-]{16,128}$/.test(token)) return msg("Link inválido", "Peça um novo link a quem enviou a proposta.");
    try{
      sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {auth:{persistSession:false, autoRefreshToken:false}});
      const {data, error} = await sb.rpc("ler_orcamento", {p_token: token});
      if(error) throw error;
      if(!data) return msg("Link vencido ou inválido", "Peça um novo link a quem enviou a proposta.");
      dados = data; render();
    }catch(e){ msg("Não foi possível abrir a proposta", "Confira a internet e tente de novo."); }
  }

  const foneZap = t => { const d = String(t||"").replace(/\D/g, ""); return !d ? "" : d.length>=12 && d.startsWith("55") ? d : "55" + d; };

  function render(){
    const P = dados.proposta || {}, E = dados.empresa || {}, r = dados.resposta, op = P.opcoes;
    $("#emp-nome").textContent = E.nome || "GAAP ENGENHARIA";
    $("#emp-sub").textContent = [E.cnpj ? "CNPJ " + E.cnpj : "", E.cidade].filter(Boolean).join(" · ") || "Montagem e manutenção mecânica industrial";
    document.title = `Proposta ${P.numero||""} · ${E.nome||"GAAP Engenharia"}`;
    const itens = (P.itens||[]).filter(i=>!i.cliente), doCliente = (P.itens||[]).filter(i=>i.cliente);
    const inc = lista(P.incluso), nao = lista(P.naoIncluso);
    const cond = [["Pagamento", P.pagamento], ["Sinal na aprovação", P.sinalPct ? `${num(P.sinalPct)}%${op ? " do valor da opção escolhida" : ` = ${brl(P.total*P.sinalPct/100)}`}` : ""], ["Prazo", P.prazo], ["Validade", P.validade ? `até ${fdate(P.validade)}` : ""], ["Garantia", P.garantia], ["Segurança", P.seguranca], ["Observações", P.obs]].filter(x=>x[1]);
    const zap = foneZap(E.telefone);
    view.innerHTML = `
    <div class="card">
      <span class="eyebrow">Proposta nº ${esc(P.numero)} · ${fdate(P.data)}</span>
      <h1 style="margin-top:6px">${esc(P.titulo || "Proposta de orçamento")}</h1>
      <p class="muted" style="margin-top:6px">Para <b>${esc(P.cliente?.nome||"")}</b>${P.cliente?.cidade?` · ${esc(P.cliente.cidade)}`:""}</p>
    </div>
    ${P.escopo ? `<div class="card"><h2>O que será feito</h2><p style="white-space:pre-line">${esc(P.escopo)}</p></div>` : ""}
    <div class="card"><h2>Valores</h2>
      <table class="it"><tbody>${itens.map(i=>`<tr><td>${esc(i.desc)}${op && i.tipo==="mat" ? ` <span class="tag">só na opção A</span>` : ""}<br><span class="muted">${num(i.qtd)} ${esc(i.un||"")} × ${brl(i.valor)}</span></td><td class="r">${brl(i.total)}</td></tr>`).join("")}</tbody></table>
      ${P.desconto ? `<p class="muted" style="text-align:right;margin-top:8px">Subtotal ${brl(P.subtotal)} · desconto ${brl(P.desconto)}</p>` : ""}
      ${op ? `<div class="opcoes" id="opcoes">
          <label class="opcao"><input type="radio" name="op" value="A" ${r?.opcao==="B"?"":"checked"} ${r?"disabled":""}><span><b style="font-size:1rem;margin:0">Opção A</b><br><span class="muted">Com todo o material fornecido pela ${esc(E.nome||"empresa")}</span></span><b>${brl(op.A)}</b></label>
          <label class="opcao"><input type="radio" name="op" value="B" ${r?.opcao==="B"?"checked":""} ${r?"disabled":""}><span><b style="font-size:1rem;margin:0">Opção B</b><br><span class="muted">O material fica por sua conta</span></span><b>${brl(op.B)}</b></label>
        </div>`
        : `<div class="total"><span>Valor total</span><b>${brl(P.total)}</b></div>`}
      ${doCliente.length ? `<h3 style="margin-top:16px;font-size:.95rem">Material por sua conta <span class="muted" style="font-weight:400">(não incluído no valor)</span></h3><ul class="lst">${doCliente.map(i=>`<li>${esc(i.desc)} — ${num(i.qtd)} ${esc(i.un||"")}</li>`).join("")}</ul>` : ""}
    </div>
    ${inc.length || nao.length ? `<div class="card cols">${inc.length?`<div class="ok"><h3 style="font-size:.95rem;margin-bottom:6px">✓ Está incluso</h3><ul class="lst">${inc.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:""}${nao.length?`<div class="nao"><h3 style="font-size:.95rem;margin-bottom:6px">✕ Não está incluso</h3><ul class="lst">${nao.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:""}</div>` : ""}
    ${cond.length ? `<div class="card"><h2>Condições</h2>${cond.map(([a,b])=>`<div class="linha"><span class="q">${esc(a)}</span><span class="v">${esc(b)}</span></div>`).join("")}</div>` : ""}
    ${P.pix ? `<div class="card"><h2>Pix do sinal</h2><div class="pix"><div class="qr" id="pixqr" aria-label="QR code Pix"></div><div style="flex:1;min-width:200px">
        <p>${op ? `Sinal de ${num(P.sinalPct)}% do valor da opção escolhida. Informe o valor ao pagar.` : `Sinal de ${num(P.sinalPct)}%: <b>${brl(P.total*P.sinalPct/100)}</b>`}</p>
        <p class="muted" style="font-size:.88rem;margin-top:6px">Abra o app do banco → Pix → Ler QR code, ou use o “copia e cola”.</p>
        <button class="btn sm" type="button" id="pixcopiar" style="margin-top:10px">Copiar código Pix</button></div></div></div>` : ""}
    ${r ? `<div class="res ${r.aprovado?"sim":"nao"}"><h2>${r.aprovado?"✅ Proposta aprovada":"Proposta recusada"}</h2><p>por <b>${esc(r.nome||"")}</b> em ${fdate(dados.respondido_em)}${r.opcao?` · opção ${esc(r.opcao)}`:""}</p>${r.obs?`<p style="margin-top:6px">“${esc(r.obs)}”</p>`:""}${r.aprovado?`<p style="margin-top:6px">Obrigado! A ${esc(E.nome||"empresa")} vai entrar em contato para combinar o início do serviço.</p>`:""}</div>`
      : `<div class="card"><h2>Aprovar a proposta</h2>
        <form id="resp" novalidate>
          <label class="f">Seu nome<input id="nome" autocomplete="name" maxlength="80" required></label>
          <label class="f">CPF ou CNPJ <span class="muted" style="font-weight:400">(opcional)</span><input id="doc" inputmode="numeric" maxlength="30"></label>
          <label class="f">Observação <span class="muted" style="font-weight:400">(opcional)</span><textarea id="obs" maxlength="1000"></textarea></label>
          <div class="f"><span>Assine com o dedo</span><canvas class="assin" id="assin"></canvas><button type="button" class="btn sm" id="limpar" style="justify-self:start">Limpar assinatura</button></div>
          <div class="acoes"><button class="btn prim" type="submit" id="aprovar">✅ Aprovar proposta</button><button class="btn" type="button" id="recusar">Recusar</button></div>
          <p class="aviso" id="info" role="status"></p>
        </form></div>`}
    ${zap ? `<div class="acoes"><a class="btn wa" href="https://wa.me/${zap}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre a proposta nº ${P.numero||""}.`)}" target="_blank" rel="noopener">💬 Tirar dúvidas no WhatsApp</a></div>` : ""}
    <p class="muted" style="text-align:center;font-size:.8rem;margin-top:18px">${esc(E.nome||"")}${E.cnpj?` · CNPJ ${esc(E.cnpj)}`:""}${E.telefone?` · ${esc(E.telefone)}`:""}${E.email?` · ${esc(E.email)}`:""}</p>`;
    if(P.pix){
      try{ const q = window.qrcode(0, "M"); q.addData(P.pix); q.make(); $("#pixqr").innerHTML = q.createSvgTag({cellSize:4, margin:0, scalable:true}); }catch(e){}
      $("#pixcopiar").addEventListener("click", async () => { try{ await navigator.clipboard.writeText(P.pix); $("#pixcopiar").textContent = "Código copiado ✓"; }catch(e){ prompt("Copie o código Pix:", P.pix); } });
    }
    if(!r) prepararForm();
  }

  function prepararForm(){
    const cv = $("#assin"), ctx = cv.getContext("2d");
    const ajustar = () => { const k = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; cv.width = w*k; cv.height = h*k; ctx.setTransform(k,0,0,k,0,0); ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#0b1520"; assinou = false; };
    ajustar();
    let desenhando = false;
    const pos = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    cv.addEventListener("pointerdown", e => { desenhando = true; cv.setPointerCapture(e.pointerId); const [x,y] = pos(e); ctx.beginPath(); ctx.moveTo(x,y); });
    cv.addEventListener("pointermove", e => { if(!desenhando) return; const [x,y] = pos(e); ctx.lineTo(x,y); ctx.stroke(); assinou = true; });
    ["pointerup","pointercancel","pointerleave"].forEach(t => cv.addEventListener(t, () => { desenhando = false; }));
    $("#limpar").addEventListener("click", () => { ctx.clearRect(0,0,cv.width,cv.height); assinou = false; });
    $("#resp").addEventListener("submit", e => { e.preventDefault(); responder(true); });
    $("#recusar").addEventListener("click", () => responder(false));
  }

  // assinatura em PNG pequeno (cabe no limite do servidor)
  function assinaturaPng(){
    if(!assinou) return "";
    const cv = $("#assin"), out = document.createElement("canvas"); out.width = 600; out.height = 160;
    const c = out.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0,0,600,160);
    const k = Math.min(600/cv.width, 160/cv.height); c.drawImage(cv, (600-cv.width*k)/2, (160-cv.height*k)/2, cv.width*k, cv.height*k);
    return out.toDataURL("image/png");
  }

  async function responder(aprovado){
    const info = $("#info"), nome = $("#nome").value.trim();
    if(!nome){ info.textContent = "Escreva seu nome."; $("#nome").focus(); return; }
    if(aprovado && !assinou){ info.textContent = "Assine no quadro acima para aprovar."; return; }
    if(!aprovado && !$("#obs").value.trim()){ info.textContent = "Conte rapidamente o motivo no campo Observação (ajuda a melhorar a proposta)."; $("#obs").focus(); return; }
    const opcao = document.querySelector('input[name="op"]:checked')?.value || "";
    document.querySelectorAll("#resp button").forEach(b => b.disabled = true); info.textContent = "Enviando…";
    try{
      const {data, error} = await sb.rpc("responder_orcamento", {p_token: token, p_resposta: {aprovado: aprovado ? "true" : "false", opcao, nome, documento: $("#doc").value.trim(), obs: $("#obs").value.trim(), assinatura: aprovado ? assinaturaPng() : ""}});
      if(error) throw error;
      if(!data){ msg("Esta proposta já foi respondida ou o link venceu."); return; }
      const r2 = await sb.rpc("ler_orcamento", {p_token: token}); dados = r2.data || dados; render(); window.scrollTo(0, document.body.scrollHeight);
    }catch(_){ document.querySelectorAll("#resp button").forEach(b => b.disabled = false); info.textContent = "Não foi possível enviar. Confira a internet e tente de novo."; }
  }

  iniciar();
})();
