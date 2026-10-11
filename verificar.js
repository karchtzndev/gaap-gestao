// Verificação pública do relatório técnico: quem escaneia o QR do PDF (ou digita o código) confere o documento
// direto na base do prestador. Mostra o relatório, as fotos e a assinatura; não mostra valores.
(function(){
  const $ = s => document.querySelector(s);
  const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fdate = d => d ? String(d).slice(0,10).split("-").reverse().join("/") : "";
  const maius = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  const lista = xs => { xs = (xs||[]).filter(Boolean); return xs.length < 2 ? (xs[0]||"") : xs.slice(0,-1).join(", ") + " e " + xs[xs.length-1]; };
  const RES = {"liberado para operação":"Equipamento liberado para operação", "liberado com restrição":"Equipamento liberado com restrição", "aguardando peça":"Serviço pendente, aguardando peça", "necessita nova intervenção":"Necessita nova intervenção para concluir"};
  const TIPO = {antes:"Antes", durante:"Durante o serviço", depois:"Depois"};
  const view = $("#view"), C = window.GAAP_CONFIG || {};
  const codigo = () => decodeURIComponent((new URLSearchParams(location.hash.slice(1))).get("c") || "").trim().toUpperCase();
  let sb;

  function form(msg){
    view.innerHTML = `<section class="panel"><span class="eyebrow">Verificação de documento</span><h1 style="margin:2px 0 8px">Relatório técnico</h1>
      ${msg?`<p style="margin:0 0 10px">${msg}</p>`:""}
      <form id="vf" class="row" style="flex-wrap:nowrap"><input id="vc" placeholder="XXXX-XXXX-XXXX" maxlength="14" autocapitalize="characters" autocomplete="off" aria-label="Código de autenticidade" style="flex:1;min-width:0"><button class="btn primary">Conferir</button></form>
      <p class="muted" style="margin:8px 0 0;font-size:.85rem">O código fica embaixo do QR, no PDF do relatório.</p></section>`;
    $("#vf").addEventListener("submit", e=>{ e.preventDefault(); const v = $("#vc").value.toUpperCase().replace(/[^A-Z0-9]/g, ""); location.hash = "c=" + (v.length===12 ? `${v.slice(0,4)}-${v.slice(4,8)}-${v.slice(8)}` : v); });
  }

  async function carregar(){
    const c = codigo();
    if(!c) return form("");
    if(!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)) return form("Código inválido. Confira os 12 caracteres.");
    view.innerHTML = `<div class="loading">Conferindo o documento…</div>`;
    let d = null;
    try{ const {data, error} = await sb.rpc("verificar_relatorio", {p_codigo:c}); if(error) throw error; d = data; }
    catch(e){ view.innerHTML = `<section class="panel"><h2 style="margin:0">Não foi possível conferir agora</h2><p class="muted">Confira a internet e tente de novo.</p><button class="btn" id="vt">Tentar de novo</button></section>`; $("#vt").addEventListener("click", carregar); return; }
    if(!d) return form(`❌ O código <b class="mono">${esc(c)}</b> não foi encontrado. Confira se digitou certo. Se estiver certo, o documento não foi emitido por este sistema.`);
    render(d);
    try{ const {data} = await sb.functions.invoke("rts-fotos", {body:{codigo:c}}); if(data) fotos(data); }catch(e){}
  }

  function render(d){
    const h = d.horas || {}, horas = h.min ? `${(h.min/60).toFixed(2).replace(".", ",")} h${h.dias?` em ${h.dias} dia${h.dias>1?"s":""}`:""}` : "";
    const dados = [["Cliente", d.cliente], ["Unidade", d.unidade], ["Ordem de serviço", `${d.os||""}${d.tracos?` · ID TracOS #${d.tracos}`:""}`], ["Serviço solicitado", d.titulo], ["Equipamento / local", d.equip],
      ["Recebida em", fdate(d.recebida_em)], ["Concluída em", fdate(d.concluida_em)], ["Equipe", lista(h.tecnicos)], ["Horas trabalhadas", horas], ["Relatório por", d.por]].filter(x=>x[1]);
    const ficha = [["Constatações", maius(lista(d.achados))], ["Peças / componentes", maius(lista(d.pecas))], ["Causa provável", maius(lista(d.causas))],
      ["Serviços executados", maius(lista(d.acoes))], ["Materiais utilizados", String(d.materiais||"").split(/\n|;/).map(x=>x.trim()).filter(Boolean).join("; ")], ["Resultado", RES[d.resultado] || maius(d.resultado||"")]].filter(x=>x[1]);
    view.innerHTML = `<section class="panel verif-ok"><div class="verif-selo" aria-hidden="true">✓</div>
        <div><span class="eyebrow">Documento autêntico</span><h1 style="margin:2px 0 4px">Relatório técnico · OS ${esc(d.os||"")}</h1>
        <p class="muted" style="margin:0">Emitido por <b>${esc(d.prestador||"")}</b>${d.cnpj?` · CNPJ ${esc(d.cnpj)}`:""}${d.em?` em ${esc(fdate(d.em))}`:""}. Código <b class="mono">${esc(d.codigo||"")}</b>.</p></div></section>
      <section class="panel"><dl class="verif-dados">${dados.map(([a,b])=>`<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join("")}</dl></section>
      ${d.texto?`<section class="panel"><h3 style="margin:0 0 6px">Descrição do serviço</h3><p style="margin:0;line-height:1.55">${esc(d.texto)}</p></section>`:""}
      ${ficha.length?`<section class="panel"><h3 style="margin:0 0 6px">Ficha técnica</h3><dl class="verif-dados">${ficha.map(([a,b])=>`<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join("")}</dl></section>`:""}
      ${(d.recs||[]).length?`<section class="panel"><h3 style="margin:0 0 6px">Recomendações</h3><ol style="margin:0;padding-left:20px">${d.recs.map(r=>`<li>${esc(maius(r))}</li>`).join("")}</ol></section>`:""}
      <section class="panel" id="vfotos-box" hidden><h3 style="margin:0 0 8px">Registro fotográfico</h3><div class="verif-fotos" id="vfotos"></div></section>
      <section class="panel" id="vassin-box" hidden><h3 style="margin:0 0 8px">Assinatura do responsável</h3><div id="vassin"></div></section>
      <p class="muted" style="text-align:center;font-size:.8rem;margin:4px 0 16px">Esta página vem direto da base de dados do prestador. Se o PDF que você recebeu tiver informações diferentes destas, ele foi alterado.</p>`;
    document.title = `Relatório técnico · OS ${d.os||""}`;
  }

  function fotos(f){
    const box = $("#vfotos-box"), el = $("#vfotos");
    if(box && el && (f.fotos||[]).length){ el.innerHTML = f.fotos.map(x=>`<figure><a href="${esc(x.url)}" target="_blank" rel="noopener"><img src="${esc(x.url)}" alt="Foto ${esc(TIPO[x.tipo]||"")}" loading="lazy"></a><figcaption class="t-${esc(x.tipo)}">${esc(TIPO[x.tipo]||"")}</figcaption></figure>`).join(""); box.hidden = false; }
    const ab = $("#vassin-box"), a = $("#vassin");
    if(ab && a && f.assin){ a.innerHTML = `<img src="${esc(f.assin.url)}" alt="Assinatura" style="max-width:320px;width:100%;background:#fff;border-radius:8px;border:1px solid var(--line)"><p style="margin:6px 0 0"><b>${esc(f.assin.nome||"")}</b>${f.assin.em?` · ${esc(fdate(f.assin.em))}`:""}</p>`; ab.hidden = false; }
  }

  if(!window.supabase?.createClient || !C.supabaseUrl){ view.innerHTML = `<section class="panel"><h2 style="margin:0">Não foi possível abrir agora</h2><p class="muted">Confira a internet e recarregue a página.</p></section>`; return; }
  sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {auth:{persistSession:false, autoRefreshToken:false}});
  window.addEventListener("hashchange", carregar);
  carregar();
})();
