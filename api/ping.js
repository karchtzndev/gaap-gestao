// Chamado todo dia pelo Vercel Cron (vercel.json) para o banco gratuito do Supabase não pausar.
// Usa só a chave pública (anon), a mesma que já está no config.js.
const URL_SB = "https://pxuzidkfwbjscpkegsno.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dXppZGtmd2Jqc2Nwa2Vnc25vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMzE4ODcsImV4cCI6MjEwNjcwNzg4N30.TH4M5qNXD8IhADnf0FfKzFAIn-xlC6UkWCHSB6l4S40";

export default async function handler(req, res) {
  let ultimo = "";
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`${URL_SB}/rest/v1/rpc/ping`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: "{}" });
      ultimo = await r.text();
      if (r.ok && ultimo.includes("ok")) return res.status(200).json({ banco: "ativo", em: new Date().toISOString() });
    } catch (e) { ultimo = String(e); }
    await new Promise(ok => setTimeout(ok, 5000));
  }
  return res.status(502).json({ banco: "sem resposta", detalhe: ultimo.slice(0, 200) });
}
