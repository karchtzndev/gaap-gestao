"use strict";
/* ---------- Relatório técnico da OS ----------
   O técnico conta o serviço do jeito dele (falando ou com toques) e o app escreve o relatório profissional:
   constatações, causa, serviços, materiais, resultado e recomendações, com fotos de antes/depois, assinatura
   do responsável e um código de autenticidade (QR) que a contratante confere em /verificar. Tudo no aparelho,
   sem custo e funcionando sem internet (o envio vai para a fila). */

// vocabulário: rótulo do botão + como reconhecer no relato (p = começo de palavra, t = palavra inteira, f = trecho)
const RTS_VOC = {
  achados: [
    {k:"sem anomalias", f:["sem anomalia","sem problema","sem defeito","nada de anormal","nenhuma anomalia","nenhum problema","nenhum defeito","tudo ok","tudo normal","tudo certo","em bom estado","em perfeito estado","funcionando normal","operando normal"], neg:false},
    {k:"desgaste", p:["desgast"], t:["gasto","gasta","gastos","gastas"]},
    {k:"furo", t:["furo","furos","furou","furada","furado","furadas","furados","furando"]},
    {k:"trinca", p:["trinc","rachad","rachou","rachadur","fissur"]},
    {k:"quebra", p:["quebr","rompi","rompeu","arrebent"]},
    {k:"entupimento", p:["entup","obstru","embuch","engasg"]},
    {k:"vazamento", p:["vazament","vazand","pingand","gotejand"], t:["vaza","vazou","vazava","vazavam"]},
    {k:"ruído anormal", p:["barulh","ruid","chiad","chiand","estalo","estaland","rangend","rangid","zunid","zumbid","batend"]},
    {k:"vibração excessiva", p:["vibr","trepid","balancand"]},
    {k:"aquecimento", p:["esquent","aquec","superaquec","quente","fervend"]},
    {k:"folga", p:["folg"], t:["jogo"]},
    {k:"desalinhamento", p:["desalinh","empen"], t:["torto","torta","tortos","tortas"]},
    {k:"corrosão", p:["corro","ferrug","enferruj","oxidad","oxidac"]},
    {k:"travamento", p:["travad","travou","travand","emperr","agarrand","agarrou"], t:["preso","presa","presos","presas"]},
    {k:"mau contato", f:["mau contato","mal contato","contato ruim","contato frouxo","contato oxidado"], neg:false},
    {k:"componente queimado", p:["queim"]},
    {k:"falta de lubrificação", f:["sem lubrific","sem graxa","sem oleo","falta de lubrific","falta de graxa","falta de oleo","falta lubrific","falta graxa","falta oleo","pouca graxa","pouco oleo","pouca lubrific","lubrificacao deficiente"], t:["ressecado","ressecada","ressecados","ressecadas"], neg:false},
    {k:"patinação", p:["patin"]},
    {k:"desarme", p:["desarm"]},
    {k:"fixação solta", p:["desapert","afrouxa"], t:["solto","solta","soltos","soltas","soltando","soltou","frouxo","frouxa","frouxos","frouxas"]},
  ],
  pecas: [
    {k:"rolamento", a:"o", p:["rolament"]},
    {k:"mancal", a:"o", p:["mancal","mancais"]},
    {k:"eixo", a:"o", t:["eixo","eixos"]},
    {k:"correia", a:"a", p:["correia"]},
    {k:"corrente", a:"a", t:["corrente","correntes"]},
    {k:"engrenagem", a:"a", p:["engrenag","pinhao","pinhoes"]},
    {k:"redutor", a:"o", p:["redutor","motoredutor","motorredutor"]},
    {k:"motor", a:"o", p:["motor"]},
    {k:"acoplamento", a:"o", p:["acoplament"]},
    {k:"polia", a:"a", p:["polia"]},
    {k:"chapa de desgaste", a:"a", t:["chapadedesgaste"]},
    {k:"chapa", a:"a", t:["chapa","chapas"], senao:"chapa de desgaste"},
    {k:"canecas", a:"as", p:["canec"]},
    {k:"rosca transportadora", a:"a", f:["rosca transportadora"], t:["rosca","roscas","roscasemfim"]},
    {k:"bica", a:"a", t:["bica","bicas"]},
    {k:"válvula", a:"a", p:["valvul"]},
    {k:"purgador", a:"o", p:["purgador"]},
    {k:"tubulação", a:"a", p:["tubula","tubo"]},
    {k:"mangueira", a:"a", p:["mangueir"]},
    {k:"vedação", a:"a", p:["vedac","vedant","retentor","gaxeta","oring"], f:["selo mecanico"]},
    {k:"parafusos", a:"os", p:["parafus","porca","chumbador"]},
    {k:"estrutura", a:"a", p:["estrutur","suporte"]},
    {k:"luminária", a:"a", p:["luminar","lampad","refletor"]},
    {k:"fiação", a:"a", p:["fiacao","cabeament"], t:["cabo","cabos","fio","fios"]},
    {k:"contator", a:"o", p:["contator","contatora"]},
    {k:"disjuntor", a:"o", p:["disjunt"]},
    {k:"sensor", a:"o", p:["sensor"], t:["fimdecurso"], f:["chave de nivel"]},
    {k:"inversor", a:"o", p:["inversor"]},
    {k:"bomba", a:"a", t:["bomba","bombas"]},
    {k:"compressor", a:"o", p:["compressor"]},
    {k:"filtro", a:"o", p:["filtro"]},
    {k:"cilindro", a:"o", p:["cilindro"]},
    {k:"relé", a:"o", p:["rele"]},
    {k:"reator", a:"o", p:["reator"]},
  ],
  causas: [
    {k:"desgaste natural", f:["desgaste natural","tempo de uso","muito tempo de uso","uso continuo","vida util","fim de vida"], t:["velho","velha","velhos","velhas","antigo","antiga","antigos","antigas"], neg:false},
    {k:"acúmulo de material", p:["acumul","incrust","residu","sujeir","poeir"], f:["cheia de","cheio de","entupida de","entupido de","tomada de","tomado de"]},
    {k:"falta de lubrificação", f:["sem lubrific","sem graxa","sem oleo","falta de lubrific","falta de graxa","falta de oleo","falta lubrific","falta graxa","falta oleo","pouca graxa","pouco oleo","pouca lubrific","lubrificacao deficiente"], neg:false},
    {k:"sobrecarga", p:["sobrecarg"], f:["excesso de carga","excesso de peso","carga excessiva","sobre carga"]},
    {k:"desalinhamento"},
    {k:"corrosão/umidade", p:["umid","molhad","infiltr","goteir"], f:["agua da chuva","entrada de agua"]},
    {k:"operação inadequada", f:["mau uso","mal uso","uso indevido","uso incorreto","operacao inadequada","operacao errada","erro de operacao","erro do operador"], neg:false},
    {k:"falha elétrica", f:["curto circuito","curto-circuito","em curto","deu curto","sobretensao","surto","oscilacao de energia","queda de energia","pico de energia","falta de fase","sobrecorrente"], neg:false},
    {k:"material inadequado", f:["material inadequado","material fraco","peca paralela","peca de baixa qualidade","peca errada"], neg:false},
    {k:"causa não identificada"},
  ],
  acoes: [
    {k:"inspeção", a:"a", p:["inspec","verific","verifiq","vistori","averigu","examin"], t:["analisei","analisamos","olhei","olhamos","conferi","conferimos"]},
    {k:"limpeza", a:"a", p:["limp"]},
    {k:"desobstrução", a:"a", p:["desentup","desobstru","desembuch","desengasg"]},
    {k:"desmontagem e montagem", a:"a", p:["desmont","remont"]},
    {k:"substituição", a:"a", p:["troc","troq","substitu"]},
    {k:"reparo com solda", a:"o", p:["sold"]},
    {k:"reparo", a:"o", p:["repar","consert","refiz","refeit","refazer","recuper"]},
    {k:"fabricação", a:"a", p:["fabric","fabriq"]},
    {k:"usinagem", a:"a", p:["usin"]},
    {k:"ajuste", a:"o", p:["ajust","regul"]},
    {k:"alinhamento", a:"o", p:["alinh"]},
    {k:"tensionamento", a:"o", p:["tension","estiquei","esticad","esticamos"]},
    {k:"balanceamento", a:"o", p:["balanceament","balancead","balancee","balancei"]},
    {k:"lubrificação", a:"a", p:["lubrific","lubrifiq","engrax"], t:["graxa"]},
    {k:"reaperto", a:"o", p:["reapert"], t:["apertei","apertamos","apertado","apertados","apertar"]},
    {k:"emenda", a:"a", p:["emend"]},
    {k:"pintura", a:"a", p:["pint"]},
    {k:"instalação", a:"a", p:["instal"]},
    {k:"adequação", a:"a", p:["adequ"]},
    {k:"teste de funcionamento", a:"o", p:["test"], f:["em funcionamento","funcionando","liguei","ligamos","dei partida","demos partida","rodando","em operacao","liberei","liberamos","liberado","liberada"]},
  ],
};
const RTS_RES = [
  {k:"liberado para operação", f:["liberad","liberei","liberamos","funcionando","operando normal","em operacao","ficou bom","ficou ok","ficou certo","resolvido","normalizado","normalizou"]},
  {k:"liberado com restrição", f:["paliativ","provisori","temporari","gambiarra","com restricao","emergencial"]},
  {k:"aguardando peça", f:["aguardando peca","aguardando a peca","esperando peca","esperando a peca","falta peca","falta a peca","falta de peca","sem peca","sem a peca","aguardando material","aguardando compra","comprar peca","comprar a peca","pedir peca","peca em falta"]},
  {k:"necessita nova intervenção", f:["precisa voltar","voltar amanha","retornar amanha","volta amanha","nova intervencao","programar retorno","continuar amanha","nao terminou","nao terminamos","nao conclui","nao concluido","falta terminar","ficou pendente"]},
];
const RTS_RES_TXT = {"liberado para operação":"equipamento liberado para operação", "liberado com restrição":"equipamento liberado com restrição", "aguardando peça":"serviço pendente, aguardando peça", "necessita nova intervenção":"necessita nova intervenção para concluir"};
// na tela aparecem os mais comuns + os marcados; "+ mais" mostra a lista inteira (o relatório continua de 30 segundos)
const RTS_COMUNS = {
  achados:["sem anomalias","desgaste","quebra","entupimento","vazamento","ruído anormal","aquecimento","folga"],
  pecas:["rolamento","correia","motor","redutor","chapa de desgaste","canecas","rosca transportadora","parafusos"],
  causas:null,
  acoes:["inspeção","limpeza","substituição","reparo com solda","ajuste","lubrificação","reaperto","teste de funcionamento"],
};
const RTS_GRUPOS = [["achados","O que foi encontrado"],["pecas","Peças / componentes"],["causas","Causa provável"],["acoes","O que foi feito"]];
const RTS_NEG = new Set(["sem","nao","nenhum","nenhuma","nem"]);
const RTS_FUT = new Set(["precisa","precisam","precisar","precisando","necessita","necessario","necessaria","recomendo","recomenda","recomendamos","recomendado","sugiro","sugerimos","deve","devera","deveria","devem","tem","temos","vai","vamos","programar","futuramente","proxima","proximo","futura"]);
const rtsNorm = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// entende o relato livre: devolve o que encontrou em cada grupo, o resultado e as ações que ainda vão ser feitas (viram recomendação)
function entenderRelato(txt){
  const t0 = " " + rtsNorm(txt).replace(/[,;.!?:\n]+/g, " | ").replace(/[^a-z0-9|]+/g, " ") + " ";
  const t1 = t0.replace(/ chapas? de (desgaste|sacrificio) /g, " chapadedesgaste ").replace(/ roscas? sem fim /g, " roscasemfim ").replace(/ fim de curso /g, " fimdecurso ").replace(/ o ring /g, " oring ");
  const toks = t1.split(" ").filter(Boolean), frase = " " + toks.join(" ") + " ";
  const trecho = (x, neg) => { let i = frase.indexOf(" " + x);
    while(i >= 0){ const antes = frase.slice(0, i).trim().split(" ").slice(-2); if(!neg || !antes.some(w=>RTS_NEG.has(w))) return true; i = frase.indexOf(" " + x, i + 1); }
    return false; };
  const achouTrecho = c => (c.f||[]).some(x=>trecho(x, c.neg!==false));
  const ocorrencias = c => toks.map((t,i)=>((c.p||[]).some(x=>t.startsWith(x)) || (c.t||[]).includes(t)) ? i : -1).filter(i=>i>=0);
  const antes = (i, n) => { const a = []; for(let d=1; d<=n && i-d>=0 && toks[i-d]!=="|"; d++) a.push(toks[i-d]); return a; };
  const negado = i => antes(i, 2).some(w=>RTS_NEG.has(w));
  const futuro = i => !/(ei|ou)$/.test(toks[i]) && antes(i, 3).some(w=>RTS_FUT.has(w));
  const pecaEm = j => { const c = RTS_VOC.pecas.find(c=>(c.p||[]).some(x=>toks[j].startsWith(x)) || (c.t||[]).includes(toks[j])); return !c ? "" : c.senao && out.pecas.includes(c.senao) ? c.senao : c.k; };
  // peças logo depois do verbo, na mesma frase ("precisa trocar o retentor" -> retentor); "do motor" depois de outra peça é só onde fica
  const DE = ["do","da","dos","das","de"];
  const ehAcao = j => RTS_VOC.acoes.some(c=>(c.p||[]).some(x=>toks[j].startsWith(x)) || (c.t||[]).includes(toks[j]));
  const objetos = i => { const ob = []; for(let j=i+1, n=0; j<toks.length && toks[j]!=="|" && n<8 && !ehAcao(j); j++, n++){ const k = pecaEm(j); if(!k) continue; if(ob.length && DE.includes(toks[j-1])) continue; if(!ob.includes(k)) ob.push(k); }
    if(!ob.length) for(let j=i-1, n=0; j>=0 && toks[j]!=="|" && n<6 && !ehAcao(j); j--, n++){ const k = pecaEm(j); if(k && !DE.includes(toks[j-1])){ ob.push(k); break; } } // "o rolamento foi trocado"
    return ob; };
  const out = {achados:[], pecas:[], causas:[], acoes:[], resultado:"", planejadas:[], planObj:{}, lig:{}};
  for(const g of ["achados","pecas","causas","acoes"]){
    for(const c of RTS_VOC[g]){
      if(c.senao && out[g].includes(c.senao)) continue;
      let ok = achouTrecho(c), plan = false;
      for(const i of ocorrencias(c)){
        if(ok && g!=="acoes") break;
        if(c.neg!==false && negado(i)) continue;
        if(g==="acoes" && futuro(i)){ plan = true; out.planObj[c.k] = [...new Set([...(out.planObj[c.k]||[]), ...objetos(i)])]; continue; }
        ok = true; if(g==="acoes") out.lig[c.k] = [...new Set([...(out.lig[c.k]||[]), ...objetos(i)])];
      }
      if(ok) out[g].push(c.k); else if(plan) out.planejadas.push(c.k);
    }
  }
  if(out.achados.length > 1) out.achados = out.achados.filter(k=>k!=="sem anomalias");
  for(const k of ["liberado com restrição","aguardando peça","necessita nova intervenção","liberado para operação"]){ const c = RTS_RES.find(x=>x.k===k); if(c.f.some(x=>trecho(x, true))){ out.resultado = k; break; } }
  return out;
}

/* ---------- português: artigos, listas e frases ---------- */
const RTS_ART_EQ = {bica:"a",elevador:"o",rosca:"a",correia:"a",transportador:"o",compressor:"o",motor:"o",bomba:"a",silo:"o",moega:"a",secador:"o",peneira:"a",ventilador:"o",exaustor:"o",valvula:"a",tubulacao:"a",iluminacao:"a",painel:"o",quadro:"o",caldeira:"a",esteira:"a",filtro:"o",ciclone:"o",balanca:"a",portao:"o",telhado:"o",estrutura:"a",galpao:"o",armazem:"o",purgador:"o",redutor:"o",misturador:"o",moinho:"o",extrusora:"a",prensa:"a",maquina:"a",linha:"a",sistema:"o",rede:"a",tanque:"o",reservatorio:"o",torre:"a",camara:"a",porta:"a",plataforma:"a",escada:"a",cobertura:"a",calha:"a",tremonha:"a",fita:"a",caixa:"a",cabine:"a",guincho:"o",talha:"a",ponte:"a",empilhadeira:"a",gerador:"o",subestacao:"a",chiller:"o",condensador:"o",evaporador:"o",trocador:"o",separador:"o",classificador:"o",descascador:"o",polidor:"o",envase:"o",envasadora:"a",empacotadora:"a",seladora:"a",dosador:"o",alimentador:"o",picador:"o",triturador:"o",tombador:"o"};
const RTS_PECA_ART = Object.fromEntries(RTS_VOC.pecas.map(c=>[c.k, c.a]));
function rtsArtigo(nome){
  const w = rtsNorm(String(nome||"").trim().split(/\s+/)[0]).replace(/[^a-z]/g, "");
  if(!w) return "o";
  if(RTS_PECA_ART[nome]) return RTS_PECA_ART[nome];
  if(RTS_ART_EQ[w]) return RTS_ART_EQ[w];
  if(w.endsWith("s") && RTS_ART_EQ[w.replace(/(es|s)$/, "")]) return RTS_ART_EQ[w.replace(/(es|s)$/, "")] + "s";
  if(/as$/.test(w)) return "as"; if(/(os|es)$/.test(w)) return "os";
  return /(a|ção|cao|gem|dade)$/.test(w) ? "a" : "o";
}
const RTS_EM = {o:"no", a:"na", os:"nos", as:"nas"}, RTS_DE = {o:"do", a:"da", os:"dos", as:"das"};
const rtsEm = nome => `${RTS_EM[rtsArtigo(nome)]} ${nome}`, rtsDe = nome => `${RTS_DE[rtsArtigo(nome)]} ${nome}`;
function rtsLista(xs){ xs = xs.filter(Boolean); if(xs.length < 2) return xs[0] || ""; const ponto = xs.some(x=>/ e /.test(x)); return xs.slice(0,-1).join(ponto ? "; " : ", ") + (ponto ? "; e " : " e ") + xs[xs.length-1]; }
const rtsLinhas = s => String(s||"").split(/\n|;/).map(x=>x.trim()).filter(Boolean);
const rtsMinus = s => /^[A-ZÀ-Ú]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
const rtsMaius = s => s.charAt(0).toUpperCase() + s.slice(1);
// "VERIFICAR BICA 02 E 04 DO ARMAZÉM DE FARELO" -> "bica 02 e 04 do armazém de farelo"
const RTS_VERBOS = new Set(["verificar","verificacao","inspecionar","inspecao","trocar","troca","substituir","substituicao","instalar","instalacao","adequar","adequacao","reparar","reparo","consertar","conserto","corrigir","correcao","ajustar","ajuste","regular","regulagem","limpar","limpeza","fabricar","fabricacao","montar","montagem","desmontar","desmontagem","revisar","revisao","realizar","executar","efetuar","fazer","manutencao","atender","atendimento","avaliar","avaliacao","analisar","analise","soldar","solda","alinhar","alinhamento","lubrificar","lubrificacao","desobstruir","desentupir","reformar","reforma","melhoria","melhorar","modificar","modificacao","retirar","remover","recolocar","reinstalar","corretiva","preventiva","urgente","servico","servicos"]);
const RTS_LIGA = new Set(["de","da","do","das","dos","em","na","no","nas","nos","e","o","a","os","as","p","para"]);
function rtsEquip(titulo){
  const ws = String(titulo||"").trim().split(/\s+/).filter(Boolean); let i = 0;
  while(i < ws.length-1 && (RTS_VERBOS.has(rtsNorm(ws[i]).replace(/[^a-z]/g, "")) || RTS_LIGA.has(rtsNorm(ws[i]).replace(/[^a-z]/g, "")))) i++;
  return ws.slice(i).map(w=>/\d/.test(w) ? w : w.toLowerCase()).join(" ");
}
function rtsLimpaRelato(t){
  let s = " " + String(t||"").replace(/\s+/g, " ").trim() + " ";
  if(!s.trim()) return "";
  s = s.replace(/ tipo assim /gi, " ").replace(/ (né|aí|daí)(?=[ ,.;!?])/gi, " ");
  const troca = {"tava":"estava","tavam":"estavam","tá":"está","ta":"está","tô":"estou","to":"estou","pra":"para","pro":"para o","pros":"para os","vamo":"vamos"};
  s = s.split(" ").map(w=>{ const m = w.match(/^([^\wÀ-ú]*)([\wÀ-ú]+)([^\wÀ-ú]*)$/); if(!m) return w; const r = troca[m[2].toLowerCase()]; return r ? m[1] + r + m[3] : w; }).join(" ");
  s = s.replace(/\s+/g, " ").replace(/\s+([,.;!?])/g, "$1").trim();
  s = s.replace(/(^|[.!?]\s+)([a-zà-ú])/g, (x, a, b)=>a + b.toUpperCase());
  return /[.!?]$/.test(s) ? s : s + ".";
}
// ações em ordem, com as peças ligadas à ação principal ("substituição da chapa de desgaste e do rolamento")
const RTS_PRINCIPAL = ["substituição","reparo com solda","reparo","fabricação","instalação","usinagem","emenda","ajuste","alinhamento","tensionamento","balanceamento","lubrificação","reaperto","pintura","desmontagem e montagem","limpeza","inspeção"];
function rtsAcoesFrase(r, lig = {}){
  const ordem = RTS_VOC.acoes.map(c=>c.k), acs = [...r.acoes].sort((a,b)=>(ordem.indexOf(a)<0?90:ordem.indexOf(a)) - (ordem.indexOf(b)<0?90:ordem.indexOf(b)));
  const teste = acs.indexOf("teste de funcionamento"); if(teste >= 0){ acs.splice(teste, 1); acs.push("teste de funcionamento"); }
  const prin = RTS_PRINCIPAL.find(k=>acs.includes(k));
  const algumaLig = acs.some(k=>(lig[k]||[]).some(p=>r.pecas.includes(p)));
  return rtsLista(acs.map(k=>{ const ob = algumaLig ? (lig[k]||[]).filter(p=>r.pecas.includes(p)) : (k===prin && r.pecas.length===1 ? r.pecas : []);
    return ob.length ? `${k} ${rtsLista(ob.map(rtsDe))}` : k; }));
}
function rtsTexto(r, o, op = {}){
  const P = [], ach = r.achados.filter(x=>x!=="sem anomalias"), loc = r.pecas.length ? " " + rtsLista(r.pecas.map(rtsEm)) : "";
  if(op.cab !== false) P.push(`Atendimento da OS ${o.os}${o.tracos?` (ID TracOS #${o.tracos})`:""}${o.titulo?`: ${o.titulo}`:""}${o.unidade?`, ${o.unidade}`:""}.`);
  if(ach.length) P.push(`Constatou-se ${rtsLista(ach)}${loc}.`);
  else if(r.achados.includes("sem anomalias")) P.push(`Na inspeção não foram encontradas anomalias${loc}.`);
  else if(r.pecas.length) P.push(`Componentes envolvidos: ${rtsLista(r.pecas)}.`);
  if(r.causas.length) P.push(`Causa provável: ${rtsLista(r.causas)}.`);
  const ac = rtsAcoesFrase(r, op.lig || {}); if(ac) P.push(`Serviços executados: ${ac}.`);
  const mats = rtsLinhas(r.materiais); if(mats.length) P.push(`Materiais utilizados: ${mats.join("; ")}.`);
  if(r.resultado) P.push(`Resultado: ${RTS_RES_TXT[r.resultado] || rtsMinus(r.resultado)}.`);
  if(r.recs.length) P.push(`Recomendações: ${r.recs.map(rtsMinus).join("; ")}.`);
  const rel = op.relato !== false && r.incluirRelato !== false ? rtsLimpaRelato(r.relato) : "";
  if(rel) P.push(`Relato do técnico: ${rel}`);
  return P.join(" ").replace(/\.\.+/g, ".").replace(/\s+/g, " ").trim();
}
// recomendações sugeridas a partir do que foi marcado (o técnico confirma com um toque)
function rtsSugestoes(r, planejadas = [], planObj = {}){
  const S = [], tem = (g, k) => (r[g]||[]).includes(k), pe = r.pecas || [], eq = r.equip ? rtsDe(r.equip) : "do equipamento";
  const ACAO = Object.fromEntries(RTS_VOC.acoes.map(c=>[c.k, c.a]));
  planejadas.forEach(k=>{ const ob = (planObj[k]||[]).length ? planObj[k] : pe.length===1 ? pe : []; S.push(`Programar ${ACAO[k]==="o"?"o":"a"} ${k}${ob.length ? " " + rtsLista(ob.map(rtsDe)) : ""}`); });
  const reparou = ["reparo com solda","reparo","fabricação","emenda"].some(k=>tem("acoes", k));
  if((tem("achados","desgaste") || tem("achados","trinca") || tem("achados","furo")) && !tem("acoes","substituição") && !planejadas.includes("substituição"))
    S.push(reparou ? "Acompanhar o reparo nas próximas inspeções" : `Programar a substituição ${pe.length===1 ? rtsDe(pe[0]) : "dos componentes desgastados"}`);
  if(tem("acoes","substituição") && (tem("causas","desgaste natural") || tem("achados","desgaste"))) S.push(`Inspecionar ${pe.length===1 ? `${rtsArtigo(pe[0])} ${pe[0]}` : "os componentes substituídos"} a cada 30 dias para acompanhar o desgaste`);
  if(tem("causas","acúmulo de material") || tem("achados","entupimento")) S.push(`Incluir a limpeza periódica ${eq} na rotina de inspeção`);
  if(tem("causas","falta de lubrificação") || tem("achados","falta de lubrificação")) S.push("Revisar a rotina de lubrificação (frequência e tipo de lubrificante)");
  if(tem("achados","desalinhamento") || tem("achados","vibração excessiva") || tem("achados","patinação") || tem("causas","desalinhamento")) S.push("Monitorar vibração e temperatura e conferir o alinhamento após 30 dias de operação");
  if(tem("causas","corrosão/umidade") || tem("achados","corrosão")) S.push("Avaliar tratamento anticorrosivo e proteção contra umidade");
  if(tem("causas","sobrecarga")) S.push("Verificar a carga de trabalho do equipamento e o ajuste das proteções do motor");
  if(tem("causas","operação inadequada")) S.push("Orientar a equipe de operação sobre o uso correto do equipamento");
  if(tem("causas","falha elétrica") || tem("achados","componente queimado") || tem("achados","mau contato") || tem("achados","desarme")) S.push("Revisar a instalação elétrica (aperto de bornes, proteções e aterramento)");
  if(tem("achados","quebra")) S.push("Avaliar melhoria do componente (material ou projeto) para evitar nova quebra");
  if(tem("achados","fixação solta")) S.push("Incluir o reaperto das fixações na rotina de inspeção");
  if(tem("achados","vazamento")) S.push("Acompanhar a vedação nos próximos dias de operação");
  if(r.resultado==="aguardando peça") S.push("Concluir o serviço assim que a peça chegar");
  if(r.resultado==="liberado com restrição") S.push("Programar a correção definitiva");
  if(r.resultado==="necessita nova intervenção") S.push("Programar o retorno da equipe para concluir o serviço");
  if(!S.length && tem("achados","sem anomalias")) S.push("Manter a rotina de inspeção");
  return [...new Set(S)].slice(0, 6);
}
// código de autenticidade: 12 caracteres sem letras confundíveis (60 bits)
function rtsCodigo(){ const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", b = new Uint8Array(12); crypto.getRandomValues(b); const s = [...b].map(x=>A[x % 32]).join(""); return `${s.slice(0,4)}-${s.slice(4,8)}-${s.slice(8)}`; }
const rtsUrl = c => `${location.origin}/verificar#c=${c}`;

/* ---------- dados da OS para o relatório ---------- */
function rtsDaOrdem(o){
  const k = soDig(o.os), aps = state.ap.filter(e=>soDig(e.os)===k && !e.orcId && (!o.empresa || chaveEmp(empOf(e))===chaveEmp(o.empresa))).sort((a,b)=>(a.data+a.inicio).localeCompare(b.data+b.inicio));
  const feitas = aps.filter(e=>!e.andamento), min = feitas.reduce((s,e)=>s+calc(e).total, 0);
  const fotos = aps.flatMap(e=>(e.fotos||[]).map(id=>({id, tipo:((e.fotoMeta||{})[id]||{}).tipo||"durante"}))).filter(f=>f.tipo!=="assinatura");
  const assin = aps.flatMap(e=>Object.entries(e.fotoMeta||{}).filter(([,m])=>m && m.tipo==="assinatura").map(([id, m])=>({foto:id, nome:m.nome||"", em:m.em||""}))).pop() || null;
  return {aps:feitas, min, dias:new Set(feitas.map(e=>e.data)).size, tecnicos:[...new Set(feitas.map(e=>e.profissional).filter(Boolean))], fotos, assin};
}
const rtsMeuId = () => session?.user?.id || "";
const rtsPodeEditar = o => !o.relatorio || !state.worker || o.relatorio.porId===rtsMeuId();
// a OS do histórico ainda não está na carteira: entra agora (com o que se sabe dela)
async function rtsOrdemDaOS(os){
  const g = osGroups(state.ap.filter(e=>(e.os||"(sem nº)")===os))[0], emp = g?.rows?.[0] ? empOf(g.rows[0]) : (state.cfg.contratante||"");
  const ja = ordemDe(os, emp); if(ja) return ja;
  return guardarNaCarteira({os, titulo:g?.desc||"", unidade:g?.rows?.find(e=>e.cliente)?.cliente||"", empresa:emp, tracos:g?.rows?.find(e=>e.tracos)?.tracos||""});
}

/* ---------- tela do relatório ---------- */
function rtsAbrir(o, op = {}){
  const r = o.relatorio || {}, base = rtsDaOrdem(o), novo = !o.relatorio;
  const sel = {}, off = {}, extras = {};
  RTS_GRUPOS.forEach(([g])=>{ const conhecidos = new Set(RTS_VOC[g].map(c=>c.k)); sel[g] = new Set(r[g]||[]); off[g] = new Set(); extras[g] = (r[g]||[]).filter(k=>!conhecidos.has(k)); });
  const fotosSalvas = new Map((r.fotos||[]).map(f=>[f.id, f]));
  const todas = [...(r.fotos||[]), ...base.fotos.filter(f=>!fotosSalvas.has(f.id))];
  state.rts = {oid:o.id, os:o.os, emp:o.empresa||"", unid:o.unidade||"", leitura:!rtsPodeEditar(o), novo, concluiu:!!op.concluiu,
    sel, off, extras, auto:{achados:[], pecas:[], causas:[], acoes:[], resultado:"", planejadas:[], planObj:{}, lig:{}},
    resultado:r.resultado||"", resManual:!!r.resultado, recsOn:new Set(r.recs||[]), recsOff:new Set(), recsExtra:(r.recs||[]).slice(),
    fotos:todas.map((f, i)=>({id:f.id, tipo:f.tipo||"durante", on: r.fotos ? fotosSalvas.has(f.id) : (f.tipo!=="durante" || i < 6)})),
    assin:r.assin || null, codigo:r.codigo || "", texto:r.texto||"", textoManual:!!r.textoManual, incluirRelato:r.incluirRelato!==false};
  openModal(state.rts.leitura ? rtsVerHtml(o) : rtsFormHtml(o, r), "wide");
  if(!state.rts.leitura){
    if(r.relato) rtsEntender(true);
    if(!novo){ const x = state.rts; RTS_GRUPOS.forEach(([g])=>x.auto[g].forEach(k=>{ if(!(r[g]||[]).includes(k)) x.off[g].add(k); }));
      rtsAtual().sug.forEach(sg=>{ if(!(r.recs||[]).includes(sg)) x.recsOff.add(sg); }); }
    rtsPintar(); }
}
function rtsFormHtml(o, r){
  const fala = !!(window.SpeechRecognition || window.webkitSpeechRecognition), x = state.rts;
  const grupo = (g, l) => `<div class="field rtsgrupo"><span>${l}</span><div class="rtschips" id="rts-ch-${g}"></div></div>`;
  return `<header><h2>Relatório técnico · OS ${esc(o.os)}</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <form id="rtsForm" class="form rtsform">
    ${x.concluiu?`<div class="banner"><span>✅ <b>OS concluída.</b> Agora o relatório técnico: fale ou toque nos itens, em 30 segundos.</span></div>`:""}
    <p style="margin:0"><b>${esc(o.titulo||"")}</b><br><span class="muted">${esc([o.unidade, o.tracos?`ID TracOS #${o.tracos}`:"", o.empresa].filter(Boolean).join(" · "))}</span></p>
    ${x.codigo?`<div class="rtscod">${rtsQRSvg(rtsUrl(x.codigo), 96)}<div><span class="muted" style="font-size:.85rem">Código de autenticidade (QR no PDF)</span><br><b class="mono">${esc(x.codigo)}</b><div class="row" style="margin-top:6px"><button type="button" class="btn sm" data-act="rtsLink" data-id="${esc(o.id)}">🔗 Enviar link</button><button type="button" class="btn sm" data-act="rtsPdf" data-id="${esc(o.id)}">📄 PDF salvo</button></div></div></div>`:""}
    <label class="field"><span>Equipamento / local</span><input id="rts-equip" maxlength="200" value="${esc(r.equip ?? rtsEquip(o.titulo))}" placeholder="Ex.: bica 02 do armazém de farelo"></label>
    <div class="field"><span>Conte o que foi feito <small class="muted">(fale do seu jeito: o app marca os itens abaixo sozinho)</small></span>
      <textarea id="rts-relato" rows="3" maxlength="3000" placeholder="Ex.: a bica estava entupida de farelo e a chapa de desgaste furada; troquei a chapa, soldei e testei, ficou funcionando.">${esc(r.relato||"")}</textarea>
      <div class="row" style="justify-content:space-between;align-items:center">${fala?`<button type="button" class="btn sm" data-act="rtsFalar" id="rts-mic">🎤 Falar</button>`:`<span class="muted" style="font-size:.85rem">🎤 Dica: toque no microfone do teclado para ditar.</span>`}<label class="check" style="font-size:.85rem"><input type="checkbox" id="rts-increl" ${x.incluirRelato?"checked":""}> Incluir este relato no relatório</label></div></div>
    ${RTS_GRUPOS.map(([g, l])=>grupo(g, l)).join("")}
    <label class="field"><span>Materiais usados <small class="muted">(um por linha)</small></span><textarea id="rts-mat" rows="2" maxlength="1500" placeholder="Ex.: 2 rolamentos 6205-2RS&#10;1 chapa de aço 3/16">${esc(r.materiais||"")}</textarea></label>
    <div class="field rtsgrupo"><span>Resultado</span><div class="rtschips" id="rts-ch-res"></div></div>
    <div class="field rtsgrupo"><span>Recomendações para a contratante <small class="muted">(sugeridas pelo que você marcou)</small></span><div class="rtschips" id="rts-ch-recs"></div></div>
    <div class="field"><span>Fotos do relatório <small class="muted">(toque para tirar ou incluir)</small></span><div class="rtsfotos" id="rts-fotos"></div>
      <div class="row"><label class="btn sm">📷 Foto ANTES<input type="file" accept="image/*" capture="environment" data-rtsnova="antes" hidden></label><label class="btn sm">📷 Foto DEPOIS<input type="file" accept="image/*" capture="environment" data-rtsnova="depois" hidden></label></div></div>
    <div class="field"><span>Assinatura do responsável da unidade</span><div id="rts-assin"></div></div>
    <div class="field"><span>Como vai ficar o relatório</span><div class="rtsprev" id="rts-prev"></div>
      <div class="row"><button type="button" class="btn sm" data-act="rtsEditarTexto" id="rts-edbtn">✏️ Ajustar o texto</button></div>
      <textarea id="rts-texto" rows="6" maxlength="6000" hidden></textarea></div>
    <footer><button type="button" class="btn" data-act="closeModal">${x.concluiu?"Agora não":"Cancelar"}</button><span class="row" style="gap:8px"><button type="submit" class="btn" data-pdf="0">Salvar</button><button type="submit" class="btn primary" data-pdf="1">Salvar e gerar PDF</button></span></footer>
  </form>`;
}
function rtsVerHtml(o){
  const r = o.relatorio || {};
  return `<header><h2>Relatório técnico · OS ${esc(o.os)}</h2><button class="iconbtn" data-act="closeModal" aria-label="Fechar">✕</button></header>
  <p class="muted" style="margin:0 0 8px">Feito por <b>${esc(r.por||"")}</b>${r.em?` em ${esc(fdate(String(r.em).slice(0,10)))}`:""}. Só quem escreveu ou o responsável pode alterar.</p>
  <div class="rtsprev">${esc(r.texto||"")}</div>
  <footer><span></span><span class="row" style="gap:8px"><button class="btn" data-act="rtsLink" data-id="${esc(o.id)}">🔗 Enviar link</button><button class="btn primary" data-act="rtsPdf" data-id="${esc(o.id)}">📄 PDF</button></span></footer>`;
}
// seleção efetiva de um grupo: (o que o relato encontrou + o que foi tocado) - o que foi desmarcado
// "a bica estava entupida" num relatório da própria bica: a bica é o equipamento, não uma peça
const RTS_EQUIP_PECA = new Set(["bica","rosca transportadora","bomba","compressor","filtro","cilindro","válvula","purgador","luminária"]);
function rtsAutoPecas(x){ const eq = rtsNorm($("#rts-equip")?.value || "").split(/\s+/)[0]; return x.auto.pecas.filter(k=>!(RTS_EQUIP_PECA.has(k) && eq && rtsNorm(k).split(" ")[0]===eq)); }
function rtsSel(g){ const x = state.rts, ordem = RTS_VOC[g].map(c=>c.k).concat(x.extras[g]); const auto = g==="pecas" ? rtsAutoPecas(x) : x.auto[g]; const s = new Set([...auto, ...x.sel[g]].filter(k=>!x.off[g].has(k))); return ordem.filter(k=>s.has(k)); }
function rtsResultado(){ const x = state.rts; return x.resManual ? x.resultado : (x.auto.resultado || (rtsSel("acoes").length ? "liberado para operação" : "")); }
function rtsAtual(){
  const x = state.rts, v = id => ($("#"+id)?.value || "").trim();
  const r = {achados:rtsSel("achados"), pecas:rtsSel("pecas"), causas:rtsSel("causas"), acoes:rtsSel("acoes"), materiais:v("rts-mat"), resultado:rtsResultado(), equip:v("rts-equip"), relato:v("rts-relato"), incluirRelato:!!$("#rts-increl")?.checked, recs:[]};
  const sug = rtsSugestoes(r, x.auto.planejadas, x.auto.planObj), todas = [...new Set([...sug, ...x.recsExtra])];
  r.recs = todas.filter(s=>x.recsOn.has(s) || (!x.recsOff.has(s) && sug.indexOf(s) > -1 && sug.indexOf(s) < 3));
  return {r, sug:todas};
}
function rtsEntender(sem){ const x = state.rts; if(!x) return; x.auto = entenderRelato($("#rts-relato")?.value || ""); if(!sem) rtsPintar(); }
function rtsPintar(){
  const x = state.rts; if(!x || x.leitura) return;
  const chip = (g, k, on) => `<button type="button" class="chipbtn" data-act="rtsChip" data-g="${g}" data-k="${esc(k)}" aria-pressed="${on}">${esc(k)}</button>`;
  RTS_GRUPOS.forEach(([g])=>{ const el = $("#rts-ch-"+g); if(!el) return; const on = new Set(rtsSel(g)), todos = RTS_VOC[g].map(c=>c.k).concat(x.extras[g]);
    const comuns = RTS_COMUNS[g], aberto = !comuns || (x.abertos||{})[g], vis = aberto ? todos : todos.filter(k=>on.has(k) || comuns.includes(k) || x.extras[g].includes(k)), falta = todos.length - vis.length;
    el.innerHTML = vis.map(k=>chip(g, k, on.has(k))).join("") + (falta ? `<button type="button" class="chipbtn rtsmais" data-act="rtsVerTodos" data-g="${g}">+ mais ${falta}</button>` : "") + `<button type="button" class="chipbtn rtsmais" data-act="rtsMais" data-g="${g}">✏️ outro</button>`; });
  const res = rtsResultado(), er = $("#rts-ch-res"); if(er) er.innerHTML = RTS_RES.map(c=>`<button type="button" class="chipbtn" data-act="rtsRes" data-k="${esc(c.k)}" aria-pressed="${res===c.k}">${esc(c.k)}</button>`).join("");
  const {r, sug} = rtsAtual(), rec = $("#rts-ch-recs");
  if(rec) rec.innerHTML = (sug.length ? sug.map(s=>`<button type="button" class="chipbtn rtsrec" data-act="rtsRec" data-k="${esc(s)}" aria-pressed="${r.recs.includes(s)}">${esc(s)}</button>`).join("") : `<span class="muted" style="font-size:.85rem">Marque o que foi encontrado para receber sugestões.</span>`) + `<button type="button" class="chipbtn rtsmais" data-act="rtsRecMais">+ outra</button>`;
  rtsPintarFotos(); rtsPintarAssin();
  const o = state.ord.find(y=>y.id===x.oid) || {os:x.os}, prev = $("#rts-prev"), tx = $("#rts-texto");
  const texto = x.textoManual && tx && tx.value.trim() ? tx.value.trim() : rtsTexto(r, o, {lig:x.auto.lig});
  if(prev) prev.textContent = texto;
  if(tx && !x.textoManual) tx.value = texto;
}
function rtsPintarFotos(){
  const x = state.rts, el = $("#rts-fotos"); if(!el) return;
  el.innerHTML = x.fotos.length ? x.fotos.map(f=>`<label class="rtsfoto${f.on?" on":""}"><input type="checkbox" data-rtsfoto="${esc(f.id)}" ${f.on?"checked":""}><img src="${esc(blobSrc(f.id))}" data-fid="${esc(f.id)}" alt="Foto ${esc(f.tipo)}" loading="lazy"><i>${esc(TIPO_FOTO[f.tipo]||"DURANTE")}</i></label>`).join("")
    : `<span class="muted" style="font-size:.85rem">Nenhuma foto desta OS ainda.</span>`;
}
function rtsPintarAssin(){
  const x = state.rts, el = $("#rts-assin"); if(!el) return;
  el.innerHTML = x.assin ? `<div class="row" style="align-items:center"><img class="rtsassin" src="${esc(blobSrc(x.assin.foto))}" data-fid="${esc(x.assin.foto)}" alt="Assinatura"><span><b>${esc(x.assin.nome)}</b><br><button type="button" class="btn sm" data-act="rtsAssinar">Assinar de novo</button></span></div>`
    : `<button type="button" class="btn sm" data-act="rtsAssinar">✍ Colher assinatura</button> <span class="muted" style="font-size:.85rem">O responsável assina com o dedo, confirmando o serviço.</span>`;
}
let rtsT = 0;
document.addEventListener("keydown", e=>{ if(e.key==="Enter" && e.target.matches?.("#rtsForm input")) e.preventDefault(); });
document.addEventListener("input", e=>{
  if(!state.rts || !e.target.closest?.("#rtsForm")) return;
  state.modalDirty = true;
  if(e.target.id==="rts-relato"){ clearTimeout(rtsT); rtsT = setTimeout(()=>rtsEntender(), 250); }
  else if(e.target.id==="rts-texto"){ state.rts.textoManual = true; const p = $("#rts-prev"); if(p) p.textContent = e.target.value; }
  else if(["rts-equip","rts-mat"].includes(e.target.id)){ clearTimeout(rtsT); rtsT = setTimeout(rtsPintar, 200); }
});
document.addEventListener("change", async e=>{
  const t = e.target; if(!state.rts) return;
  if(t.id==="rts-increl"){ state.modalDirty = true; rtsPintar(); return; }
  if(t.dataset?.rtsfoto){ const f = state.rts.fotos.find(y=>y.id===t.dataset.rtsfoto); if(f){ f.on = t.checked; t.closest(".rtsfoto")?.classList.toggle("on", t.checked); state.modalDirty = true; } return; }
  if(t.dataset?.rtsnova && t.files?.length){
    const tipo = t.dataset.rtsnova, ids = await uploadPhotos([...t.files], {tipo, os:state.rts.os, unid:state.rts.unid}); t.value = "";
    if(!state.rts) return;
    ids.forEach(id=>state.rts.fotos.push({id, tipo, on:true})); state.modalDirty = true; rtsPintarFotos();
  }
});
document.addEventListener("submit", async e=>{
  if(e.target.id!=="rtsForm") return; e.preventDefault();
  const pdf = e.submitter?.dataset?.pdf==="1"; e.target.querySelectorAll("button[type=submit]").forEach(b=>b.disabled = true);
  try{ const o = await rtsSalvar(); if(o){ state.modalDirty = false; closeModal(); state.rendered = null; render(); rtsDepoisDeSalvar(o, pdf); } }
  finally{ e.target.querySelectorAll?.("button[type=submit]").forEach(b=>b.disabled = false); }
});
async function rtsSalvar(tentativa = 0){
  const x = state.rts; if(!x) return null;
  const o = state.ord.find(y=>y.id===x.oid); if(!o){ toast("Essa OS não está mais na carteira."); return null; }
  const {r} = rtsAtual(), base = rtsDaOrdem(o), tx = $("#rts-texto");
  if(!r.achados.length && !r.acoes.length && !r.relato){ toast("Conte o que foi feito ou marque pelo menos um item."); $("#rts-relato")?.focus(); return null; }
  const rel = {...r, texto: x.textoManual && tx?.value.trim() ? tx.value.trim() : rtsTexto(r, o, {lig:x.auto.lig}), corpo:rtsTexto(r, o, {cab:false, relato:false, lig:x.auto.lig}), textoManual:x.textoManual,
    fotos:x.fotos.filter(f=>f.on).slice(0, 12).map(f=>({id:f.id, tipo:f.tipo})), ...(x.assin?{assin:x.assin}:{}),
    codigo:x.codigo || o.relatorio?.codigo || rtsCodigo(), em:new Date().toISOString(),
    por: state.worker ? state.me : (o.relatorio?.por || perfil?.nome || state.cfg.empresa?.responsavel || nomeDoEmail(session?.user?.email)), porId: o.relatorio?.porId && !state.worker ? o.relatorio.porId : rtsMeuId(),
    horas:{min:Math.round(base.min), dias:base.dias, tecnicos:base.tecnicos}};
  if(!rel.recs.length) delete rel.recs;
  const novo = {...o, relatorio:{...rel, recs:rel.recs||[]}}; delete novo._naps;
  try{ await save("ordens", novo); x.codigo = rel.codigo; return state.ord.find(y=>y.id===o.id) || novo; }
  catch(err){ if(err && err.conflito && tentativa < 1) return rtsSalvar(tentativa + 1); toast(writeErr(err)); return null; }
}
function rtsDepoisDeSalvar(o, pdf){
  if(pdf){ rtsPdf(o); return; }
  toastAcao(`Relatório da OS ${o.os} salvo.`, "📄 PDF", ()=>rtsPdf(state.ord.find(y=>y.id===o.id) || o));
}
function rtsFalar(btn){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition, ta = $("#rts-relato");
  if(!SR || !ta){ toast("Toque no microfone do teclado para ditar."); ta?.focus(); return; }
  if(state.rtsRec){ try{ state.rtsRec.stop(); }catch(err){} return; }
  const rec = new SR(), base = ta.value.trim(); let final = "";
  rec.lang = "pt-BR"; rec.interimResults = true; rec.continuous = true;
  rec.onresult = ev => { let parcial = ""; for(let i=ev.resultIndex; i<ev.results.length; i++){ const t = ev.results[i][0].transcript; if(ev.results[i].isFinal) final += t + " "; else parcial += t; }
    ta.value = ((base ? base + " " : "") + final + parcial).replace(/\s+/g, " ").trim(); state.modalDirty = true; clearTimeout(rtsT); rtsT = setTimeout(()=>rtsEntender(), 250); };
  rec.onerror = ev => { if(ev.error==="not-allowed" || ev.error==="service-not-allowed") toast("Permita o microfone, ou use o microfone do teclado."); else if(ev.error==="network") toast("O ditado precisa de internet. Use o microfone do teclado."); };
  rec.onend = () => { state.rtsRec = null; if(btn.isConnected){ btn.textContent = "🎤 Falar"; btn.classList.remove("gravando"); } rtsEntender(); };
  try{ rec.start(); state.rtsRec = rec; btn.textContent = "⏹ Parar"; btn.classList.add("gravando"); }catch(err){ toast("Não consegui abrir o microfone. Use o do teclado."); }
}

/* ---------- PDF do relatório (com QR de autenticidade) ---------- */
function rtsQR(texto){ if(!window.qrcode) return null; const q = window.qrcode(0, "M"); q.addData(texto); q.make(); return q; }
function rtsQRPdf(doc, texto, x, y, tam){
  const q = rtsQR(texto); if(!q) return false;
  const n = q.getModuleCount(), c = tam / n;
  doc.setFillColor(255,255,255); doc.rect(x-1.2, y-1.2, tam+2.4, tam+2.4, "F"); doc.setFillColor(0,0,0);
  for(let i=0; i<n; i++){ let j = 0; while(j < n){ if(!q.isDark(i, j)){ j++; continue; } let k = j; while(k < n && q.isDark(i, k)) k++; doc.rect(x + j*c, y + i*c, (k-j)*c + 0.02, c + 0.02, "F"); j = k; } }
  return true;
}
function rtsQRSvg(texto, px = 132){
  const q = rtsQR(texto); if(!q) return ""; const n = q.getModuleCount(); let d = "";
  for(let i=0; i<n; i++) for(let j=0; j<n; j++) if(q.isDark(i, j)) d += `M${j+2} ${i+2}h1v1h-1z`;
  return `<svg class="rtsqr" viewBox="0 0 ${n+4} ${n+4}" width="${px}" height="${px}" role="img" aria-label="QR de autenticidade"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
async function rtsPdf(o){
  const r = o?.relatorio; if(!r){ toast("Essa OS ainda não tem relatório técnico."); return; }
  const doc = pdfDoc(false); if(!doc) return;
  toast("Gerando o PDF do relatório…");
  const W = pw(doc), R = W-14, base = rtsDaOrdem(o), url = rtsUrl(r.codigo), qs = 27, F = ficha(o.empresa||state.cfg.contratante||"");
  let y = pdfHeader(doc, "RELATÓRIO TÉCNICO", [`OS ${o.os}${o.tracos?` · ID TracOS #${o.tracos}`:""}`, `Emitido em ${fdate(today())}`]);
  if(rtsQRPdf(doc, url, R-qs, y, qs)){ doc.setFont("helvetica","normal"); doc.setFontSize(6.6); doc.setTextColor(...GREY); doc.text("Confira a autenticidade:", R-qs/2, y+qs+3.6, {align:"center"}); doc.setFont("helvetica","bold"); doc.setTextColor(...INK); doc.text(r.codigo, R-qs/2, y+qs+7, {align:"center"}); }
  // o funcionário só tem os próprios lançamentos: vale o total guardado pelo responsável, quando for maior
  const parcial = state.worker && (r.horas?.min || 0) > base.min, horas = parcial ? r.horas.min : base.min, dias = parcial ? Math.max(base.dias, r.horas?.dias || 0) : base.dias;
  const tecs = parcial ? [...new Set([...(r.horas?.tecnicos || []), ...base.tecnicos])] : base.tecnicos;
  const info = [["Cliente", F.razao || o.empresa || ""], ["Unidade", o.unidade || ""], ["Ordem de serviço", `${o.os}${o.tracos?`  ·  ID TracOS #${o.tracos}`:""}${o.nota?`  ·  Nota ${o.nota}`:""}`], ["Serviço solicitado", o.titulo || ""], ["Equipamento / local", r.equip || ""],
    ["Recebida em", o.recebidaEm ? fdate(String(o.recebidaEm).slice(0,10)) : ""], ["Concluída em", o.concluidaEm ? fdate(String(o.concluidaEm).slice(0,10)) : ""], ["Equipe", tecs.join(", ")], ["Horas trabalhadas", horas ? `${fdec(horas)} h em ${dias} dia${dias>1?"s":""}` : ""], ["Relatório por", r.por || ""]].filter(l=>l[1]);
  doc.autoTable({startY:y-1, margin:{left:14, right:14+qs+7}, theme:"plain", body:info, styles:{fontSize:9, cellPadding:1.05, textColor:INK, overflow:"linebreak"}, columnStyles:{0:{fontStyle:"bold", cellWidth:36, textColor:GREY}}});
  y = Math.max(doc.lastAutoTable.finalY, y + qs + 9) + 5;
  const titulo = t => { y = ensure(doc, y, 14); doc.setFont("helvetica","bold"); doc.setFontSize(10.8); doc.setTextColor(...NAVY); doc.text(t, 14, y); doc.setDrawColor(...GREEN); doc.setLineWidth(0.4); doc.line(14, y+1.6, 14+doc.getTextWidth(t), y+1.6); y += 6.5; };
  const paragrafo = (t, estilo = "normal") => { doc.setFont("helvetica", estilo); doc.setFontSize(9.6); doc.setTextColor(...INK); doc.splitTextToSize(t, W-28).forEach(l=>{ y = ensure(doc, y, 5); doc.text(l, 14, y); y += 4.7; }); y += 2.5; };
  const desc = r.textoManual ? r.texto : (r.corpo || rtsTexto(r, o, {cab:false, relato:false}));
  if(desc){ titulo("Descrição do serviço"); paragrafo(desc); }
  const tec = [["Constatações", rtsMaius(rtsLista(r.achados||[]))], ["Peças / componentes", rtsMaius(rtsLista(r.pecas||[]))], ["Causa provável", rtsMaius(rtsLista(r.causas||[]))], ["Serviços executados", rtsMaius(rtsLista(r.acoes||[]))], ["Materiais utilizados", rtsLinhas(r.materiais).join("\n")], ["Resultado", r.resultado ? rtsMaius(RTS_RES_TXT[r.resultado] || r.resultado) : ""]].filter(l=>l[1]);
  if(tec.length){ titulo("Ficha técnica"); doc.autoTable({startY:y-2, margin:{left:14, right:14}, theme:"grid", body:tec, styles:{fontSize:9, cellPadding:1.8, textColor:INK, lineColor:[205,212,201], lineWidth:0.2}, columnStyles:{0:{fontStyle:"bold", cellWidth:44, fillColor:[244,247,243]}}}); y = doc.lastAutoTable.finalY + 7; }
  if((r.recs||[]).length){ titulo("Recomendações"); r.recs.forEach((s, i)=>{ doc.setFont("helvetica","normal"); doc.setFontSize(9.6); doc.setTextColor(...INK); const ls = doc.splitTextToSize(`${i+1}. ${rtsMaius(s)}.`.replace(/\.\.$/, "."), W-30); ls.forEach((l, j)=>{ y = ensure(doc, y, 5); doc.text(l, j ? 19 : 15, y); y += 4.7; }); y += 0.8; }); y += 2; }
  const rel = r.incluirRelato !== false && !r.textoManual ? rtsLimpaRelato(r.relato) : "";
  if(rel){ titulo("Relato do técnico"); paragrafo(`“${rel}”`, "italic"); }
  if(base.aps.length && !parcial){ titulo("Registro de horas");
    doc.autoTable({startY:y-2, margin:{left:14, right:14}, theme:"grid", head:[["Data","Técnico","Início","Fim","Horas"]],
      body:base.aps.map(e=>[fdate(e.data), e.profissional||"-", e.inicio||"", e.fim||"", fdec(calc(e).total)]), foot:[[{content:"Total", colSpan:4}, fdec(base.min)]],
      styles:{fontSize:8.6, cellPadding:1.4, textColor:INK, lineColor:[205,212,201], lineWidth:0.2}, headStyles:{fillColor:GREEN, textColor:255}, footStyles:{fillColor:[244,247,243], textColor:INK, fontStyle:"bold", halign:"right"},
      columnStyles:{0:{cellWidth:24}, 2:{cellWidth:18, halign:"center"}, 3:{cellWidth:18, halign:"center"}, 4:{cellWidth:20, halign:"right"}}});
    y = doc.lastAutoTable.finalY + 7; }
  const fotos = (r.fotos||[]).length ? r.fotos : base.fotos.filter(f=>f.tipo!=="durante").slice(0, 6);
  if(fotos.length){
    const ims = []; for(const f of fotos){ const im = await imgData(f.id); if(im) ims.push({...f, im}); }
    if(ims.length){ const gap = 6, bw = (W-28-gap)/2, bh = bw*0.72; let col = 0;
      y = ensure(doc, y, bh + 24); titulo("Registro fotográfico");
      for(const f of ims){
        if(col===0){ y = ensure(doc, y, bh + 9); }
        const x = 14 + col*(bw+gap), k = Math.min(bw/f.im.w, bh/f.im.h), w = f.im.w*k, h = f.im.h*k;
        doc.setDrawColor(205,212,201); doc.setLineWidth(0.2); doc.rect(x, y, bw, bh);
        try{ doc.addImage(f.im.url, f.im.fmt, x+(bw-w)/2, y+(bh-h)/2, w, h); }catch(err){}
        doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...(f.tipo==="depois"?GREEN:f.tipo==="antes"?[180,83,9]:GREY)); doc.text(TIPO_FOTO[f.tipo] || "DURANTE O SERVIÇO", x, y+bh+4);
        col++; if(col===2){ col = 0; y += bh + 9; }
      }
      if(col) y += bh + 9;
    }
  }
  const assin = r.assin || base.assin;
  y = ensure(doc, y, 44); y += 4;
  const mid = W/2, L1 = [14, mid-8], L2 = [mid+8, R];
  if(assin){ const im = await imgData(assin.foto); if(im){ const bw = L2[1]-L2[0], bh = 22, k = Math.min(bw/im.w, bh/im.h); try{ doc.addImage(im.url, im.fmt, L2[0]+(bw-im.w*k)/2, y, im.w*k, im.h*k); }catch(err){} } }
  y += 24; doc.setDrawColor(...GREY); doc.setLineWidth(0.3); doc.line(L1[0], y, L1[1], y); doc.line(L2[0], y, L2[1], y);
  doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize(`${state.cfg.empresa?.nome||""}${r.por?` - ${r.por}`:""}`, L1[1]-L1[0]), (L1[0]+L1[1])/2, y+4.5, {align:"center"});
  doc.text(doc.splitTextToSize(assin ? `${assin.nome}${assin.em?` · ${fdate(String(assin.em).slice(0,10))}`:""}` : `Responsável ${o.empresa||"contratante"}`, L2[1]-L2[0]), (L2[0]+L2[1])/2, y+4.5, {align:"center"});
  pdfFooter(doc);
  const n = doc.getNumberOfPages(); for(let i=1; i<=n; i++){ doc.setPage(i); doc.setFontSize(7); doc.setTextColor(...GREY); doc.setFont("helvetica","normal"); doc.text(`Autenticidade: ${url.replace(/^https?:\/\//, "")}`, W/2, ph(doc)-4, {align:"center"}); }
  const nome = `Relatorio tecnico OS ${o.os}${o.titulo?` - ${o.titulo}`:""}`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w .-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);
  await offerFile(`${nome}.pdf`, doc.output("blob"));
}
function rtsLinkTexto(o){ const r = o.relatorio || {}; return `Relatório técnico da OS ${o.os}${o.titulo?` (${o.titulo})`:""}${r.resultado?`: ${RTS_RES_TXT[r.resultado]||r.resultado}`:""}.\nConfira o relatório completo, com fotos e o código de autenticidade:\n${rtsUrl(r.codigo)}`; }

// fotos e assinaturas citadas em relatórios (não podem ser apagadas na limpeza e entram no backup completo)
const rtsFotosUsadas = () => state.ord.flatMap(o=>o.relatorio ? [...(o.relatorio.fotos||[]).map(f=>f.id), o.relatorio.assin?.foto].filter(Boolean) : []);
/* ---------- botões e novidade ---------- */
function rtsBotao(o, st){
  if(o.relatorio) return `<button class="btn sm" data-act="rtsAbrir" data-id="${esc(o.id)}">📄 Relatório</button>`;
  return st==="recebida" ? "" : `<button class="btn sm${o.concluida?" primary":""}" data-act="rtsAbrir" data-id="${esc(o.id)}">📝 Relatório técnico</button>`;
}
function rtsNovidade(){
  let visto = ""; try{ visto = localStorage.getItem("gaap-novo-rts")||""; }catch(err){}
  if(visto) return "";
  return `<div class="banner rtsnovo"><span>✨ <b>Novo: relatório técnico em 30 segundos.</b> Ao concluir uma OS, fale o que foi feito: o app escreve o relatório com fotos, assinatura e QR de autenticidade para a ${esc(state.cfg.contratante||"contratante")}.</span><div class="row"><button class="btn sm primary" data-act="nav" data-view="carteira">Ver a carteira</button><button class="btn sm" data-act="rtsNovidadeOk">Entendi</button></div></div>`;
}
const RTS_ACOES = {
  rtsAbrir(b){ const o = state.ord.find(x=>x.id===b.dataset.id); if(o) rtsAbrir(o); },
  async rtsDaOS(b){ try{ const o = await rtsOrdemDaOS(b.dataset.os); if(o){ closeModal(); rtsAbrir(o); } }catch(err){ toast(writeErr(err)); } },
  rtsChip(b){ const x = state.rts; if(!x) return; const g = b.dataset.g, k = b.dataset.k, on = rtsSel(g).includes(k);
    if(on){ x.sel[g].delete(k); x.off[g].add(k); } else { x.off[g].delete(k); x.sel[g].add(k); } state.modalDirty = true; rtsPintar(); },
  rtsVerTodos(b){ const x = state.rts; if(!x) return; (x.abertos ||= {})[b.dataset.g] = true; rtsPintar(); },
  rtsMais(b){ const x = state.rts; if(!x) return; const g = b.dataset.g, v = (prompt("Escreva o item:") || "").trim().slice(0, 60); if(!v) return;
    if(!RTS_VOC[g].some(c=>c.k===v) && !x.extras[g].includes(v)) x.extras[g].push(v); x.off[g].delete(v); x.sel[g].add(v); state.modalDirty = true; rtsPintar(); },
  rtsRes(b){ const x = state.rts; if(!x) return; const k = b.dataset.k; x.resultado = rtsResultado()===k ? "" : k; x.resManual = true; state.modalDirty = true; rtsPintar(); },
  rtsRec(b){ const x = state.rts; if(!x) return; const k = b.dataset.k, on = b.getAttribute("aria-pressed")==="true";
    if(on){ x.recsOn.delete(k); x.recsOff.add(k); } else { x.recsOff.delete(k); x.recsOn.add(k); } state.modalDirty = true; rtsPintar(); },
  rtsRecMais(){ const x = state.rts; if(!x) return; const v = (prompt("Escreva a recomendação:") || "").trim().slice(0, 300); if(!v) return; x.recsExtra.push(v); x.recsOn.add(v); state.modalDirty = true; rtsPintar(); },
  rtsFalar(b){ rtsFalar(b); },
  rtsAssinar(){ assinPad("rts"); },
  rtsEditarTexto(b){ const t = $("#rts-texto"); if(!t) return; t.hidden = !t.hidden; b.textContent = t.hidden ? "✏️ Ajustar o texto" : "↺ Voltar ao texto automático";
    if(t.hidden){ state.rts.textoManual = false; rtsPintar(); } else t.focus(); },
  async rtsPdf(b){ const o = state.ord.find(x=>x.id===b.dataset.id); if(o) await rtsPdf(o); },
  rtsLink(b){ const o = state.ord.find(x=>x.id===b.dataset.id); if(!o?.relatorio) return; const w = (ficha(o.empresa||state.cfg.contratante||"").whats||"").replace(/\D/g, "");
    window.open(`https://wa.me/${w ? (w.length<=11 ? "55"+w : w) : ""}?text=${encodeURIComponent(rtsLinkTexto(o))}`, "_blank"); },
  rtsNovidadeOk(){ try{ localStorage.setItem("gaap-novo-rts", "1"); }catch(err){} state.rendered = null; render(); },
};
