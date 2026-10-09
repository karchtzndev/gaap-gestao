// Carrega os arquivos do app (scripts comuns do navegador) num contexto isolado do Node, com o mínimo do navegador simulado.
const fs = require("fs"), path = require("path"), vm = require("vm");
function carregar(arquivos, extras = {}){
  const el = {addEventListener(){}, querySelector(){ return null; }, querySelectorAll(){ return []; }, hidden:true, value:"", dataset:{}};
  const doc = {addEventListener(){}, querySelector(){ return el; }, querySelectorAll(){ return []; }, getElementById(){ return null; }, createElement(){ return {...el}; }, body:el, hidden:false};
  const ctx = vm.createContext({console, document:doc, window:{addEventListener(){}}, navigator:{}, history:{pushState(){}, replaceState(){}, state:null}, location:{hash:"", pathname:"/"}, MutationObserver:class{ observe(){} }, setTimeout, clearTimeout, setInterval(){}, ...extras});
  for(const a of arquivos) vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", a), "utf8"), ctx, {filename:a});
  // as constantes de nível superior (const/let) ficam no escopo global do contexto: lê com uma expressão
  return nome => vm.runInContext(nome, ctx);
}
module.exports = {carregar};
