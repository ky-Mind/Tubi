// @ts-nocheck
/* tubi-gateway (Cloudflare Worker)
   GET /    → status singkat gateway (tanpa QR). Permintaan apa pun juga membangunkan Durable Object-nya.
   GET /qr  → halaman QR untuk menautkan WhatsApp, HANYA saat dev lokal (di production QR cukup lewat Dashboard Admin,
              supaya orang lain tidak bisa menautkan nomornya sendiri ke bot).
   Semua kerja ada di Durable Object "Gateway" (src/gateway.ts), satu instance bernama "utama". */
export { Gateway } from "./gateway.ts";

const HALAMAN_QR = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>QR Gateway Tubi</title><style>body{font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f4f1ea;color:#222}
main{text-align:center;padding:24px}img{width:300px;height:300px;background:#fff;padding:8px;border-radius:12px}.kode{font-size:40px;letter-spacing:6px;font-weight:800}
small{color:#666}</style></head><body><main><h2>Gateway WhatsApp Tubi (lokal)</h2><div id="isi">Memuat…</div>
<p><small>WhatsApp → Perangkat tertaut → Tautkan perangkat → scan</small></p></main>
<script>
const isi=document.getElementById("isi");
async function muat(){try{const s=await (await fetch("/qr.json")).json();
 if(s.state==="connected")isi.innerHTML="<p>✅ Terhubung sebagai <b>+"+s.me+"</b></p>";
 else if(s.state==="qr"&&s.qr)isi.innerHTML='<img src="'+s.qr+'" alt="QR">';
 else if(s.state==="pairing"&&s.pairingCode)isi.innerHTML='<div class="kode">'+s.pairingCode+"</div>";
 else isi.textContent="Status: "+s.state+(s.error?" — "+s.error:"")+" (menunggu QR…)";}catch(e){isi.textContent="Gateway tidak menjawab"}}
muat();setInterval(muat,3000);
</script></body></html>`;

export default {
  async fetch(req, env, ctx) {
    const { pathname } = new URL(req.url);
    const lokal = env.APP_ENV !== "production";
    if (pathname === "/qr" && lokal) return new Response(HALAMAN_QR, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    if (pathname === "/" || (pathname === "/qr.json" && lokal)) return ctx.exports.Gateway.getByName("utama").fetch(req);
    return new Response("Tidak ditemukan", { status: 404 });
  },
};
