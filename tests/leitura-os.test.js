// Leitura do papel da OS do TracOS (js/leitura-os.js): texto como o OCR devolve, inclusive com os erros típicos.
const {test, beforeEach} = require("node:test");
const assert = require("node:assert/strict");
const {carregar} = require("./carregar");

const g = carregar(["base.js", "interface.js", "leitura-os.js"], {state:{}, chaveEmp:s=>String(s||"").toLowerCase()});
const state = g("state"), lerTracos = g("lerTracos"), conferirId = g("conferirId");
beforeEach(()=>{ state.ap = []; state.ord = []; state.cfg = g("clone(DEFAULT_CFG)"); });

const PAPEL = `Ordem de Serviço: #22320
Título
000002218120 - 000200185077 - TROCAR ROLAMENTO DO MOTOR DA BOMBA DO REATOR
Status: Em aberto  Prioridade: 3 - Média
Local Vinculado
1001_1011 - Armazém Farelo
Data de Vencimento: 06/11/2026
Categoria: 001 - Manutenção Corretiva`;

test("papel lido certo: ID, nº da OS, nota SAP, título, unidade e vencimento", ()=>{
  const r = lerTracos(PAPEL, {tamId:5});
  assert.equal(r.id, "22320"); assert.equal(r.os, "2218120"); assert.equal(r.nota, "200185077");
  assert.equal(r.titulo, "TROCAR ROLAMENTO DO MOTOR DA BOMBA DO REATOR");
  assert.equal(r.centro, "1001"); assert.equal(r.venc, "2026-11-06"); assert.equal(r.prior, "3-Média");
});
test("o '#' lido como '4' vira um dígito a mais e é descartado", ()=>{
  const r = lerTracos(PAPEL.replace("#22320", "422320"), {tamId:5});
  assert.equal(r.id, "22320");
});
test("o '_' do local lido como ponto ainda acha a unidade", ()=>{
  assert.equal(lerTracos(PAPEL.replace("1001_1011", "1001.1011"), {tamId:5}).centro, "1001");
});
test("título quebrado em duas linhas é juntado", ()=>{
  const t = PAPEL.replace("DO MOTOR DA BOMBA DO REATOR", "DO MOTOR\nDA BOMBA DO REATOR");
  assert.equal(lerTracos(t, {tamId:5}).titulo, "TROCAR ROLAMENTO DO MOTOR DA BOMBA DO REATOR");
});
test("nome do arquivo PDF do TracOS", ()=>{
  const r = g("lerNomeTracos")("22316_000002218080_-_000200186907_-_VERIFICAR_BICA_DO_SILO.pdf");
  assert.equal(r.id, "22316"); assert.equal(r.os, "2218080"); assert.equal(r.nota, "200186907"); assert.equal(r.titulo, "VERIFICAR BICA DO SILO");
});
test("ID duvidoso é completado pelo ID já salvo da mesma OS", ()=>{
  state.ap = [{os:"2218120", tracos:"22320", data:"2026-10-01"}];
  const r = conferirId({id:"2232", os:"2218120", conf:{id:0.6}});
  assert.equal(r.id, "22320"); assert.equal(r.aviso, undefined);
});
test("ID lido com certeza mas diferente do já salvo: avisa para conferir", ()=>{
  state.ap = [{os:"2218120", tracos:"22320", data:"2026-10-01"}];
  const r = conferirId({id:"22329", os:"2218120", conf:{id:0.9}});
  assert.equal(r.id, "22329"); assert.match(r.aviso, /diferente do ID já salvo/); assert.ok(r.conf.id < 0.8);
});
test("ID que já pertence a outra OS: avisa", ()=>{
  state.ap = [{os:"2217000", tracos:"22320", data:"2026-10-01"}];
  const r = conferirId({id:"22320", os:"2218120", conf:{id:0.9}});
  assert.match(r.aviso, /já foi usado na OS 2217000/);
});
test("OS nova sem histórico: não muda nada", ()=>{
  const r = conferirId({id:"22320", os:"2218120", conf:{id:0.9}});
  assert.equal(r.id, "22320"); assert.equal(r.aviso, undefined); assert.equal(r.conf.id, 0.9);
});
