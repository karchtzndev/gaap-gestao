// Cálculo de horas e valores (js/base.js) com a configuração padrão:
// jornada seg–sex 07:00–16:00, sáb 07:00–11:00; R$ 60/h; extra 50%; domingo/feriado 100%; tolerância 5 min.
const {test, beforeEach} = require("node:test");
const assert = require("node:assert/strict");
const {carregar} = require("./carregar");

const g = carregar(["base.js"], {state:{}, empOf:e=>e.empresa||"", chaveEmp:s=>String(s||"").toLowerCase()});
const state = g("state"), calc = g("calc"), clone = g("clone"), DEFAULT_CFG = g("DEFAULT_CFG");
const os = (data, inicio, fim, extra = {}) => ({id:Math.random().toString(36), data, inicio, fim, ...extra});
// devolve só os números que importam (o resultado do cálculo vem congelado)
const horas = r => ({n:r.n, e50:r.e50, e100:r.e100, total:r.total, valor:r.valor});

beforeEach(()=>{ state.cfg = clone(DEFAULT_CFG); state.ap = []; state.fech = []; g("holCache = {}"); });

test("dia útil dentro da jornada: tudo hora normal", ()=>{
  assert.deepEqual(horas(calc(os("2026-10-05", "07:00", "16:00"))), {n:540, e50:0, e100:0, total:540, valor:540});
});
test("depois da jornada vira extra 50%", ()=>{
  // 9h normais (R$ 540) + 2h extras a R$ 90/h (R$ 180)
  assert.deepEqual(horas(calc(os("2026-10-05", "07:00", "18:00"))), {n:540, e50:120, e100:0, total:660, valor:720});
});
test("domingo é extra 100%", ()=>{
  assert.deepEqual(horas(calc(os("2026-10-04", "08:00", "12:00"))), {n:0, e50:0, e100:240, total:240, valor:480});
});
test("feriado nacional (12/10) é extra 100%", ()=>{
  assert.deepEqual(horas(calc(os("2026-10-12", "07:00", "16:00"))), {n:0, e50:0, e100:540, total:540, valor:1080});
});
test("Sexta-feira Santa calculada pela Páscoa (03/04/2026)", ()=>{
  assert.equal(g("holidayName")("2026-04-03"), "Sexta-feira Santa");
  assert.equal(g("holidayName")("2026-04-02"), null);
});
test("feriado extra cadastrado em Ajustes", ()=>{
  state.cfg.feriados.extras = "15/08 Aniversário da cidade";
  assert.equal(g("holidayName")("2026-08-15"), "Aniversário da cidade");
  assert.equal(calc(os("2026-08-14", "07:00", "09:00")).e100, 0);
});
test("tolerância: 3 minutos antes da jornada contam como normal", ()=>{
  assert.deepEqual(horas(calc(os("2026-10-05", "06:57", "16:00"))), {n:543, e50:0, e100:0, total:543, valor:543});
});
test("além da tolerância: 10 minutos antes viram extra", ()=>{
  const r = calc(os("2026-10-05", "06:50", "16:00"));
  assert.equal(r.n, 540); assert.equal(r.e50, 10);
});
test("tipo forçado: hora normal mesmo fora da jornada", ()=>{
  assert.deepEqual(horas(calc(os("2026-10-05", "18:00", "20:00", {tipo:"normal"}))), {n:120, e50:0, e100:0, total:120, valor:120});
});
test("almoço exato informado na OS não conta", ()=>{
  const r = calc(os("2026-10-05", "07:00", "16:00", {almIni:"11:00", almFim:"12:00"}));
  assert.equal(r.n, 480); assert.equal(r.total, 480); assert.equal(r.valor, 480);
});
test("almoço padrão de Ajustes desconta; 'sem almoço' paga a hora do almoço como extra", ()=>{
  state.cfg.almoco = {ativo:true, ini:"11:00", fim:"12:00"};
  assert.deepEqual(horas(calc(os("2026-10-05", "07:00", "16:00"))), {n:480, e50:0, e100:0, total:480, valor:480});
  assert.deepEqual(horas(calc(os("2026-10-05", "07:00", "16:00", {noAlmoco:true}))), {n:480, e50:60, e100:0, total:540, valor:570});
});
test("virada da meia-noite com adicional noturno de 20%", ()=>{
  state.cfg.noturnoPct = 20;
  // 22:00–02:00 de segunda: 4h extras 50% (R$ 360) + adicional noturno 4h × R$ 60 × 20% (R$ 48)
  const r = calc(os("2026-10-05", "22:00", "02:00"));
  assert.equal(r.e50, 240); assert.equal(r.not, 240); assert.equal(r.valor, 408);
});
test("adicional noturno só a partir das 22h e até as 5h", ()=>{
  state.cfg.noturnoPct = 20;
  assert.equal(calc(os("2026-10-05", "20:00", "23:00")).not, 60);
  assert.equal(calc(os("2026-10-06", "04:00", "07:00")).not, 60);
});
test("sem adicional noturno configurado, não paga noturno", ()=>{
  const r = calc(os("2026-10-05", "22:00", "02:00"));
  assert.equal(r.not, 0); assert.equal(r.valor, 360);
});
test("taxa por contratante e taxa antiga antes da data de vigência", ()=>{
  state.cfg.taxas = {Brejeiro:{valorHora:80, desde:"2026-09-01", historico:[{ate:"2026-09-01", valorHora:70}]}};
  assert.equal(calc(os("2026-09-10", "07:00", "08:00", {empresa:"Brejeiro"})).valor, 80);
  assert.equal(calc(os("2026-08-14", "07:00", "08:00", {empresa:"Brejeiro"})).valor, 70);
  assert.equal(calc(os("2026-09-10", "07:00", "08:00", {empresa:"Outra"})).valor, 60);
});
test("OS ligada a orçamento não soma valor por hora", ()=>{
  const r = calc(os("2026-10-05", "07:00", "16:00", {orcId:"o1"}));
  assert.equal(r.total, 540); assert.equal(r.valor, 0);
});
test("OS sem horário de término não gera horas", ()=>{
  assert.equal(calc(os("2026-10-05", "07:00", "")).total, 0);
});
test("soma de várias OS", ()=>{
  const t = g("sumCalc")([os("2026-10-05", "07:00", "16:00"), os("2026-10-04", "08:00", "12:00")]);
  assert.equal(t.total, 780); assert.equal(t.valor, 1020);
});
test("conflito de horário do mesmo profissional", ()=>{
  const a = os("2026-10-05", "07:00", "10:00", {profissional:"Ana"}), b = os("2026-10-05", "09:30", "11:00", {profissional:"Ana"}), c = os("2026-10-05", "09:30", "11:00", {profissional:"Beto"});
  assert.deepEqual([...g("overlaps")([a, b, c])].sort(), [a.id, b.id].sort());
});
test("conferência do almoço digitado", ()=>{
  const almErro = g("almErro");
  assert.equal(almErro("07:00", "16:00", "", ""), "");
  assert.equal(almErro("07:00", "16:00", "11:00", "12:00"), "");
  assert.match(almErro("07:00", "16:00", "11:00", ""), /saída e a volta/);
  assert.match(almErro("07:00", "16:00", "17:00", "18:00"), /entre o início e o término/);
});
test("total do orçamento com desconto", ()=>{
  const t = g("orcTotals")({itens:[{qtd:"2", valor:"150,50"}, {qtd:"1", valor:"99"}], descontoPct:"10"});
  assert.equal(t.sub, 400); assert.equal(t.desc, 40); assert.equal(t.total, 360);
});
test("números digitados no formato brasileiro", ()=>{
  assert.equal(g("num")("1.234,56"), 1234.56);
  assert.equal(g("numIn")("12.5"), 12.5);
  assert.equal(g("numIn")("12,5"), 12.5);
  assert.equal(g("fh")(125), "2h05");
});
