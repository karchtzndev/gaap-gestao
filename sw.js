// Service worker do GAAP Gestão: notificações (lembretes) e funcionamento sem internet ou com internet ruim.
// - arquivos do app: abrem sempre da cópia do aparelho (na hora, com ou sem internet; com internet fraca a rede não
//   falha, só demora: esperar por ela deixava o app "só carregando"); a versão nova é baixada em segundo plano e só
//   entra quando chega inteira (nunca mistura arquivo novo com velho); depois o app avisa
// - outras páginas do site: cópia do aparelho na hora e atualiza em segundo plano
// - bibliotecas carregadas sob demanda (CDN, fontes): usam a cópia guardada (versões fixas)
// - dados (Supabase) não passam por aqui: o app guarda os dados e a fila de envio no IndexedDB
const CACHE = "gaap-app-v35";
const FONTES = "https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap";
const SHELL = ["/app", "/", "/redir.js", "/js/base.js", "/js/dados.js", "/js/interface.js", "/js/leitura-os.js", "/js/telas.js", "/js/lancamentos.js", "/js/relatorios.js", "/js/financeiro.js", "/js/ajustes.js", "/js/relatorio.js", "/js/acoes.js", "/style.css", "/config.js", "/logo.js", "/logo.jpg", "/icon-192.png", "/badge-96.png", "/manifest.webmanifest",
  "/vendor/supabase-2.45.4.min.js", "/vendor/jspdf-2.5.1.umd.min.js", "/vendor/jspdf-autotable-3.8.2.min.js", "/vendor/qrcode-generator-1.4.4.js"];
const LOCAIS = new Set(SHELL);
// notificações são sempre para a equipe: "/" (página dos clientes), "/#…" e "/?…" viram o app
const appUrl = u => !u ? "/app" : (u === "/" || u.startsWith("/#") || u.startsWith("/?")) ? "/app" + u.slice(1) : u;
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
// /app.html e /app são a mesma página (endereço limpo da Vercel); /index.html é "/"
const chaveDe = (req, url) => req.mode === "navigate" ? (url.pathname.replace(/\.html$/, "").replace(/\/index$/, "/") || "/") : req;
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all([...SHELL, FONTES].map(u => c.add(new Request(u, CDN.test(u) ? { mode: "cors" } : { cache: "reload" })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("gaap-app-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
// baixa a versão mais nova de todos os arquivos do app; só grava se TODOS chegarem (internet ruim não deixa versão misturada)
let atualizando = null, ultimaAtualizacao = 0;
function atualizarApp(){
  if (atualizando || Date.now() - ultimaAtualizacao < 60000) return atualizando || Promise.resolve();
  return atualizando = (async () => {
    try {
      const resps = await Promise.all(SHELL.map(u => fetch(u, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(u); return r; })));
      const c = await caches.open(CACHE); let mudou = false;
      for (const [i, r] of resps.entries()) {
        const velho = await c.match(SHELL[i]);
        if (!velho || mudou) continue;
        const e1 = r.headers.get("etag"), e0 = velho.headers.get("etag"); // com etiqueta de versão compara só ela; sem, compara o conteúdo
        mudou = e1 && e0 ? e1 !== e0 : (await r.clone().text()) !== (await velho.text());
      }
      await Promise.all(resps.map((r, i) => c.put(SHELL[i], r)));
      ultimaAtualizacao = Date.now();
      if (mudou) (await self.clients.matchAll({ type: "window" })).forEach(w => w.postMessage({ tipo: "nova-versao" }));
    } catch (err) { /* internet ruim: tenta de novo na próxima vez que abrir */ }
    finally { atualizando = null; }
  })();
}
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (CDN.test(req.url)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(k => k.put(req, c)); } return res; })));
    return;
  }
  if (url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;
  const chave = chaveDe(req, url), doApp = LOCAIS.has(typeof chave === "string" ? chave : url.pathname);
  e.respondWith((async () => {
    const guardada = await caches.match(chave, { ignoreSearch: req.mode === "navigate" });
    const daRede = () => fetch(req).then(res => { if (res.ok && res.type === "basic") { const c = res.clone(); caches.open(CACHE).then(k => k.put(chave, c)); } return res; });
    if (req.mode === "navigate" && (chave === "/app" || chave === "/")) e.waitUntil(atualizarApp());
    if (guardada) {
      if (!doApp) e.waitUntil(daRede().catch(() => {})); // outras páginas: atualiza para a próxima vez
      return guardada;
    }
    try { return await daRede(); }
    catch (err) { const r = req.mode === "navigate" ? await caches.match("/app") : null; if (r) return r; throw err; }
  })());
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "GAAP Gestão", {
    body: d.body || "", icon: "/icon-192.png", badge: "/badge-96.png", data: { url: appUrl(d.url) }, tag: d.tag || "gaap-lembrete"
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = appUrl(e.notification.data && e.notification.data.url);
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
