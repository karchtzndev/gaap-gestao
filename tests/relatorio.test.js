// Relatório técnico (js/relatorio.js): entender o relato falado, escrever em português e sugerir recomendações.
const {test} = require("node:test");
const assert = require("node:assert/strict");
const {carregar} = require("./carregar");

const g = carregar(["base.js", "interface.js", "leitura-os.js", "relatorio.js"], {state:{}, crypto:require("crypto").webcrypto});
// os objetos vêm de outro contexto (vm): copia para comparar com deepEqual
const J = f => (...a) => JSON.parse(JSON.stringify(f(...a)));
const entender = J(g("entenderRelato")), texto = g("rtsTexto"), sugestoes = J(g("rtsSugestoes")), equip = g("rtsEquip"), limpa = g("rtsLimpaRelato"),
  de = g("rtsDe"), em = g("rtsEm"), codigo = g("rtsCodigo"), lista = g("rtsLista");
const vazio = {achados:[], pecas:[], causas:[], acoes:[], materiais:"", resultado:"", recs:[], relato:""};

test("relato falado do jeito do técnico vira itens marcados", ()=>{
  const r = entender("a bica estava entupida de farelo e a chapa de desgaste furada; troquei a chapa, soldei e testei, ficou funcionando");
  assert.deepEqual(r.achados, ["furo", "entupimento"]);
  assert.deepEqual(r.pecas, ["chapa de desgaste", "bica"]);
  assert.deepEqual(r.causas, ["acúmulo de material"]);
  assert.deepEqual(r.acoes, ["substituição", "reparo com solda", "teste de funcionamento"]);
  assert.equal(r.resultado, "liberado para operação");
});
test("negação: 'sem vazamento' e 'sem barulho' não marcam o defeito", ()=>{
  const r = entender("verifiquei o redutor, sem vazamento e sem barulho");
  assert.ok(!r.achados.includes("vazamento")); assert.ok(!r.achados.includes("ruído anormal"));
  assert.deepEqual(r.acoes, ["inspeção"]); assert.deepEqual(r.pecas, ["redutor"]);
});
test("'sem graxa' é falta de lubrificação (e não lubrificação feita)", ()=>{
  const r = entender("rolamento sem graxa fazendo barulho");
  assert.ok(r.achados.includes("falta de lubrificação")); assert.ok(r.achados.includes("ruído anormal"));
  assert.ok(r.causas.includes("falta de lubrificação")); assert.ok(!r.acoes.includes("lubrificação"));
});
test("o que ainda vai ser feito vira recomendação, não serviço executado", ()=>{
  const r = entender("o mancal está com folga, precisa trocar o mancal na próxima parada");
  assert.ok(!r.acoes.includes("substituição")); assert.deepEqual(r.planejadas, ["substituição"]);
  const s = sugestoes({...vazio, achados:r.achados, pecas:r.pecas, acoes:r.acoes}, r.planejadas);
  assert.equal(s[0], "Programar a substituição do mancal");
});
test("'não está funcionando' + 'aguardando peça'", ()=>{
  const r = entender("motor queimado, não está funcionando, aguardando peça");
  assert.equal(r.resultado, "aguardando peça"); assert.ok(!r.acoes.includes("teste de funcionamento"));
  assert.ok(r.achados.includes("componente queimado"));
});
test("texto do relatório em português correto", ()=>{
  const o = {os:"2218080", tracos:"22316", titulo:"VERIFICAR BICA 02 E 04 DO ARMAZÉM DE FARELO", unidade:"1001 - ANÁPOLIS"};
  const r = {...vazio, achados:["entupimento","furo"], pecas:["chapa de desgaste"], causas:["acúmulo de material"], acoes:["teste de funcionamento","reparo com solda","substituição","limpeza"],
    materiais:"1 chapa de aço 3/16\neletrodo 6013", resultado:"liberado para operação", recs:["Incluir a limpeza periódica da bica 02 e 04 na rotina de inspeção"]};
  assert.equal(texto(r, o), "Atendimento da OS 2218080 (ID TracOS #22316): VERIFICAR BICA 02 E 04 DO ARMAZÉM DE FARELO, 1001 - ANÁPOLIS. " +
    "Constatou-se entupimento e furo na chapa de desgaste. Causa provável: acúmulo de material. " +
    "Serviços executados: limpeza, substituição da chapa de desgaste, reparo com solda e teste de funcionamento. " +
    "Materiais utilizados: 1 chapa de aço 3/16; eletrodo 6013. Resultado: equipamento liberado para operação. " +
    "Recomendações: incluir a limpeza periódica da bica 02 e 04 na rotina de inspeção.");
});
test("cada serviço com a sua peça: 'troquei os rolamentos do motor, lubrifiquei o mancal'", ()=>{
  const r = entender("troquei os rolamentos do motor que estavam fazendo barulho, lubrifiquei o mancal e reapertei os parafusos e troquei duas canecas");
  assert.deepEqual(r.lig["substituição"], ["rolamento", "canecas"]); assert.deepEqual(r.lig["lubrificação"], ["mancal"]); assert.deepEqual(r.lig["reaperto"], ["parafusos"]);
  const t = texto({...vazio, ...r, recs:[]}, {os:"1"}, {cab:false, lig:r.lig});
  assert.match(t, /Serviços executados: substituição do rolamento e das canecas; lubrificação do mancal; e reaperto dos parafusos\./);
});
test("ação planejada leva só a peça daquela frase", ()=>{
  const r = entender("o redutor está com vazamento de óleo no retentor, precisa trocar o retentor, aguardando peça");
  assert.deepEqual(r.planObj["substituição"], ["vedação"]);
  assert.equal(sugestoes({...vazio, ...r}, r.planejadas, r.planObj)[0], "Programar a substituição da vedação");
});
test("inspeção sem anomalias", ()=>{
  const r = entender("tudo ok, sem anomalias no motor");
  assert.deepEqual(r.achados, ["sem anomalias"]);
  assert.equal(texto({...vazio, ...r, recs:[]}, {os:"1"}, {cab:false}), "Na inspeção não foram encontradas anomalias no motor.");
});
test("relato falado fica apresentável", ()=>{
  assert.equal(limpa("a bica tava entupida né, aí eu troquei pra nova"), "A bica estava entupida, eu troquei para nova.");
  assert.equal(limpa("o tipo de rolamento é 6205. tá rodando"), "O tipo de rolamento é 6205. Está rodando.");
  assert.equal(limpa("   "), "");
});
test("equipamento a partir do título do TracOS", ()=>{
  assert.equal(equip("VERIFICAR BICA 02 E 04 DO ARMAZÉM DE FARELO"), "bica 02 e 04 do armazém de farelo");
  assert.equal(equip("ADEQUAÇÃO DA ILUMINAÇÃO SILVANIA P/ GERADOR NOVO"), "iluminação silvania p/ gerador novo");
  assert.equal(equip("INSTALAR PURGADOR COMPRESSOR"), "purgador compressor");
});
test("artigos e contrações", ()=>{
  assert.equal(de("bica 02"), "da bica 02"); assert.equal(em("rolamento"), "no rolamento"); assert.equal(em("canecas"), "nas canecas");
  assert.equal(de("parafusos"), "dos parafusos"); assert.equal(em("fiação"), "na fiação"); assert.equal(de("elevador 4"), "do elevador 4"); assert.equal(em("válvula"), "na válvula");
  assert.equal(lista(["a","b","c"]), "a, b e c"); assert.equal(lista(["x"]), "x");
});
test("sugestões a partir do que foi marcado", ()=>{
  const s = sugestoes({...vazio, achados:["entupimento"], causas:["acúmulo de material"], acoes:["limpeza"], equip:"bica 02 do armazém de farelo"});
  assert.deepEqual(s, ["Incluir a limpeza periódica da bica 02 do armazém de farelo na rotina de inspeção"]);
  assert.deepEqual(sugestoes({...vazio, achados:["sem anomalias"]}), ["Manter a rotina de inspeção"]);
});
test("código de autenticidade: 12 caracteres sem letras confundíveis", ()=>{
  const cs = new Set(Array.from({length:200}, ()=>codigo()));
  assert.equal(cs.size, 200);
  for(const c of cs) assert.match(c, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
});
