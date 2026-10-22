// Distribuição das ordens importadas do TracOS (js/importar.js): fatias de tempo e repartição por dia.
const {test} = require("node:test");
const assert = require("node:assert/strict");
const {carregar} = require("./carregar");

const g = carregar(["base.js", "importar.js"], {state:{cfg:{}}});
const impFatiarDia = g("impFatiarDia"), impDistribuir = g("impDistribuir"), impNetMin = g("impNetMin");
// os objetos vêm de outro realm (vm); normaliza para o realm do teste antes de comparar
const nz = x => ({inicio:x.inicio, fim:x.fim, almIni:x.almIni, almFim:x.almFim});

const dia = {entrada:"07:00", almoco:"12:00", retorno:"13:00", saida:"16:00"}; // 9h brutas, 8h líquidas

test("tempo líquido do dia desconta o almoço", ()=>{
  assert.equal(impNetMin(dia), 480); // 8h
});

test("4 ordens no dia: 2h cada, pulando o almoço, a que cruza 12h leva almIni/almFim", ()=>{
  const f = impFatiarDia(dia, 4);
  assert.equal(f.length, 4);
  assert.deepEqual(nz(f[0]), {inicio:"07:00", fim:"09:00", almIni:"", almFim:""});
  assert.deepEqual(nz(f[1]), {inicio:"09:00", fim:"11:00", almIni:"", almFim:""});
  // a 3ª fatia começa 11:00 e precisa de 2h líquidas: cruza o almoço 12–13, termina 14:00
  assert.deepEqual(nz(f[2]), {inicio:"11:00", fim:"14:00", almIni:"12:00", almFim:"13:00"});
  assert.deepEqual(nz(f[3]), {inicio:"14:00", fim:"16:00", almIni:"", almFim:""});
});

test("sem almoço válido, divide a jornada inteira", ()=>{
  const f = impFatiarDia({entrada:"08:00", almoco:"", retorno:"", saida:"12:00"}, 2);
  assert.deepEqual([...f].map(nz), [{inicio:"08:00", fim:"10:00", almIni:"", almFim:""}, {inicio:"10:00", fim:"12:00", almIni:"", almFim:""}]);
});

test("distribui todas as ordens pelos dias e preserva os dados da ordem", ()=>{
  const ordens = Array.from({length:10}, (_,i)=>({os:String(2000+i), tracos:String(i), descricao:"OS "+i}));
  const dias = [{data:"2026-09-21",...dia}, {data:"2026-09-22",...dia}, {data:"2026-09-23",...dia}];
  const r = impDistribuir(ordens, dias);
  assert.equal(r.length, 10); // nenhuma ordem se perde
  assert.equal(new Set(r.map(x=>x.os)).size, 10); // todas presentes
  assert.ok(r.every(x=>x.data && x.inicio && x.fim)); // todas com dia e horário
});

test("dias com mais horas recebem mais ordens (proporcional)", ()=>{
  const curto = {entrada:"07:00", almoco:"", retorno:"", saida:"09:00"}; // 2h
  const longo = {entrada:"07:00", almoco:"", retorno:"", saida:"15:00"}; // 8h
  const ordens = Array.from({length:10}, (_,i)=>({os:String(i), descricao:"x"}));
  const r = impDistribuir(ordens, [{data:"2026-09-21",...curto}, {data:"2026-09-22",...longo}]);
  const n21 = r.filter(x=>x.data==="2026-09-21").length, n22 = r.filter(x=>x.data==="2026-09-22").length;
  assert.equal(n21+n22, 10);
  assert.ok(n22 > n21); // o dia de 8h leva mais que o de 2h
});
