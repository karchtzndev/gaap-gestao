// Service worker do GAAP Gestão: notificações (lembretes) e funcionamento sem internet.
// - arquivos do app: abre na hora com a cópia guardada e busca a versão nova em segundo plano
//   (com internet fraca a rede não falha, só demora: esperar por ela deixava o app "só carregando")
// - bibliotecas principais ficam no próprio site (/vendor); as carregadas sob demanda (CDN, fontes) usam a cópia guardada
// - dados (Supabase) não passam por aqui: o app guarda os dados e a fila de envio no IndexedDB
const CACHE = "gaap-app-v32";
const SHELL = ["/", "/js/base.js", "/js/dados.js", "/js/interface.js", "/js/leitura-os.js", "/js/telas.js", "/js/lancamentos.js", "/js/relatorios.js", "/js/financeiro.js", "/js/ajustes.js", "/js/acoes.js", "/style.css", "/config.js", "/logo.js", "/logo.jpg", "/icon-192.png", "/badge-96.png", "/manifest.webmanifest",
  "/vendor/supabase-2.45.4.min.js", "/vendor/jspdf-2.5.1.umd.min.js", "/vendor/jspdf-autotable-3.8.2.min.js"];
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, CDN.test(u) ? { mode: "cors" } : { cache: "reload" })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("gaap-app-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (CDN.test(req.url)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(k => k.put(req, c)); } return res; })));
    return;
  }
  if (url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;
  const rede = fetch(req).then(res => {
    if (res.ok && res.type === "basic") { const c = res.clone(); caches.open(CACHE).then(k => k.put(req.mode === "navigate" && url.pathname === "/index.html" ? "/" : req, c)); }
    return res;
  });
  e.respondWith((async () => {
    const guardado = await caches.match(req, { ignoreSearch: true }) || (req.mode === "navigate" && (url.pathname === "/" || url.pathname === "/index.html") ? await caches.match("/") : null);
    if (guardado) { e.waitUntil(rede.catch(() => {})); return guardado; }
    try { return await rede; }
    catch (err) { const r = req.mode === "navigate" ? await caches.match("/") : null; if (r) return r; throw err; }
  })());
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "GAAP Gestão", {
    body: d.body || "", icon: "/icon-192.png", badge: "/badge-96.png", data: { url: d.url || "/" }, tag: d.tag || "gaap-lembrete"
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
