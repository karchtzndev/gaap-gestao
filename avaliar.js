"use strict";
// Página pública: o cliente dá de 1 a 5 estrelas e um comentário sobre o serviço (link enviado pelo WhatsApp).
(function(){
  const C = window.GAAP_CONFIG || {}, view = document.getElementById("view");
  const token = (location.hash.match(/t=([a-f0-9]+)/) || [])[1] || "";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rpc = async (fn, body) => { const r = await fetch(`${C.supabaseUrl}/rest/v1/rpc/${fn}`, {method:"POST", headers:{apikey:C.supabaseKey, Authorization:`Bearer ${C.supabaseKey}`, "Content-Type":"application/json"}, body:JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); };
  const card = h => { view.innerHTML = `<div class="card">${h}</div>`; };
  let nota = 0;
  function form(d){
    card(`<h2 style="margin:0 0 4px">Como foi o nosso serviço?</h2>
      <p class="muted" style="margin:0 0 14px">${esc(d.servico || "Serviço")}${d.cliente?` · ${esc(d.cliente)}`:""}</p>
      <div class="estrelas-voto" role="radiogroup" aria-label="Nota">${[1,2,3,4,5].map(n=>`<button type="button" data-n="${n}" aria-label="${n} estrela${n>1?"s":""}">★</button>`).join("")}</div>
      <label class="campo"><span>Comentário (opcional)</span><textarea id="av-c" rows="4" placeholder="O que achou do atendimento?"></textarea></label>
      <label class="campo"><span>Seu nome (opcional)</span><input id="av-n" placeholder="Ex.: Carlos, Cerealista Boa Safra"></label>
      <button class="btn-env" id="av-ok" disabled>Enviar avaliação</button>`);
    view.querySelectorAll("[data-n]").forEach(b=>b.addEventListener("click", ()=>{ nota = +b.dataset.n; view.querySelectorAll("[data-n]").forEach(x=>x.classList.toggle("on", +x.dataset.n <= nota)); document.getElementById("av-ok").disabled = false; }));
    document.getElementById("av-ok").addEventListener("click", async ev=>{ ev.target.disabled = true; ev.target.textContent = "Enviando…";
      try{ await rpc("responder_avaliacao", {p_token:token, p_nota:nota, p_comentario:document.getElementById("av-c").value, p_nome:document.getElementById("av-n").value});
        card(`<h2 style="margin:0 0 6px">Obrigado! 💙</h2><p class="muted" style="margin:0">Sua avaliação foi enviada para a ${esc(d.empresa || "GAAP Engenharia")}.</p>`); }
      catch(e){ ev.target.disabled = false; ev.target.textContent = "Enviar avaliação"; alert("Não consegui enviar. Confira a internet e tente de novo."); } });
  }
  (async ()=>{
    if(!token) return card(`<p>Link inválido.</p>`);
    try{ const d = await rpc("ler_avaliacao", {p_token:token}); if(!d) return card(`<p>Link inválido ou expirado.</p>`);
      if(d.respondida) return card(`<h2 style="margin:0 0 6px">Avaliação já enviada</h2><p class="muted" style="margin:0">Obrigado pelo retorno!</p>`);
      form(d); }
    catch(e){ card(`<p>Não consegui abrir. Confira a internet e tente de novo.</p>`); }
  })();
})();
