// Página pública para o cliente conferir e aprovar (ou contestar) uma medição.
(function(){
  const $ = s => document.querySelector(s);
  const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fdate = d => d ? String(d).slice(0,10).split("-").reverse().join("/") : "";
  const brl = v => (Number(v)||0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
  const view = $("#view");
  const token = (new URLSearchParams(location.hash.slice(1))).get("t") || "";
  const C = window.GAAP_CONFIG || {};
  let sb, dados;

  function msg(t, sub){ view.innerHTML = `<section class="panel"><h2>${esc(t)}</h2>${sub?`<p class="muted">${esc(sub)}</p>`:""}</section>`; }

  async function iniciar(){
    if(!/^[A-Za-z0-9_-]{16,128}$/.test(token)) return msg("Link inválido", "Peça um novo link a quem enviou a medição.");
    try{
      sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {auth:{persistSession:false, autoRefreshToken:false}});
      const {data, error} = await sb.rpc("ler_aprovacao", {p_token: token});
      if(error) throw error;
      if(!data) return msg("Link vencido ou inválido", "Peça um novo link a quem enviou a medição.");
      dados = data; render();
    }catch(e){ msg("Não foi possível abrir a medição", "Confira a internet e tente de novo."); }
  }

  function render(){
    const d = dados, r = d.resposta;
    const linhas = (d.linhas||[]).map(x => `<tr data-id="${esc(x.id)}">
      <td>${fdate(x.data)}<br><span class="muted">${esc(x.inicio||"")}–${esc(x.fim||"")}</span></td>
      <td><b>${esc(x.os||"")}</b> ${esc(x.unidade||"")}<br><span class="muted">${esc(x.descricao||"")}</span>${x.profissional?`<br><span class="muted">${esc(x.profissional)}</span>`:""}</td>
      ${r?"":`<td><label class="row" style="gap:6px"><input type="checkbox" class="ct" aria-label="Contestar"> Contestar</label><input class="mot" placeholder="Motivo" hidden maxlength="300"></td>`}
    </tr>`).join("");
    view.innerHTML = `<section class="panel">
      <h2>Medição ${esc(d.numero||"")}</h2>
      <p>${esc(d.prestador||"")}${d.cnpj?` · CNPJ ${esc(d.cnpj)}`:""}</p>
      <p class="muted">${esc(d.empresa||"")} · ${fdate(d.de)} a ${fdate(d.ate)}</p>
      <p><b>${esc(String(d.horas||0).replace(".",","))} h</b> · <b>${brl(d.valor)}</b>${Number(d.reemb)?` + reembolsos ${brl(d.reemb)}`:""}</p>
    </section>
    ${r?`<section class="panel"><h3>${r.aprovado?"✅ Medição aprovada":"⚠️ Medição contestada"}</h3><p class="muted">por ${esc(r.nome||"")}${r.cargo?` (${esc(r.cargo)})`:""} em ${fdate(d.respondido_em)}</p>${r.obs?`<p>${esc(r.obs)}</p>`:""}${(r.contestadas||[]).length?`<p>${r.contestadas.length} OS contestada(s).</p>`:""}</section>`:""}
    <section class="panel"><h3>Serviços (${(d.linhas||[]).length})</h3>
      <div style="overflow-x:auto"><table class="cards-sm"><thead><tr><th>Data</th><th>OS / serviço</th>${r?"":"<th></th>"}</tr></thead><tbody>${linhas}</tbody></table></div>
    </section>
    ${r?"":`<section class="panel"><form id="resp" class="grid2">
      <label class="field"><span>Seu nome</span><input id="nome" required maxlength="80" autocomplete="name"></label>
      <label class="field"><span>Cargo</span><input id="cargo" maxlength="80"></label>
      <label class="field" style="grid-column:1/-1"><span>Observação (opcional)</span><textarea id="obs" maxlength="1000" rows="3"></textarea></label>
      <div class="row" style="grid-column:1/-1;gap:10px;flex-wrap:wrap">
        <button class="btn primary" type="submit" id="enviar">Aprovar medição</button>
        <span class="muted" id="info"></span>
      </div>
    </form></section>`}`;
    if(r) return;
    view.addEventListener("change", e => {
      if(!e.target.classList.contains("ct")) return;
      const mot = e.target.closest("td").querySelector(".mot"); mot.hidden = !e.target.checked; if(e.target.checked) mot.focus();
      const n = view.querySelectorAll(".ct:checked").length;
      $("#enviar").textContent = n ? `Enviar contestação (${n} OS)` : "Aprovar medição";
    });
    $("#resp").addEventListener("submit", enviar);
  }

  async function enviar(e){
    e.preventDefault();
    const contestadas = [...view.querySelectorAll(".ct:checked")].map(c => { const tr = c.closest("tr"); return {id: tr.dataset.id, motivo: tr.querySelector(".mot").value.trim()}; });
    if(contestadas.some(c => !c.motivo)) { $("#info").textContent = "Escreva o motivo de cada OS contestada."; return; }
    const nome = $("#nome").value.trim(); if(!nome) { $("#info").textContent = "Informe seu nome."; return; }
    const b = $("#enviar"); b.disabled = true; $("#info").textContent = "Enviando…";
    try{
      const {data, error} = await sb.rpc("responder_aprovacao", {p_token: token, p_resposta: {aprovado: contestadas.length ? "false" : "true", nome, cargo: $("#cargo").value.trim(), obs: $("#obs").value.trim(), contestadas}});
      if(error) throw error;
      if(!data){ msg("Esta medição já foi respondida ou o link venceu."); return; }
      const r2 = await sb.rpc("ler_aprovacao", {p_token: token}); dados = r2.data || dados; render();
    }catch(_){ b.disabled = false; $("#info").textContent = "Não foi possível enviar. Confira a internet e tente de novo."; }
  }

  iniciar();
})();
