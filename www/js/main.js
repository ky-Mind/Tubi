import { S, startAuth, onChange, statusOf, STATUS_LABEL } from "./data.js";
import { go, path, setOnRoute, closeOverlay, live } from "./core.js";
import { $, toast, beep, ls, esc } from "./util.js";
import * as C from "./customer.js";
import * as A from "./admin.js";
import { openThread } from "./data.js";
import { toEnd } from "./chat.js";
import { applyTheme } from "./ui.js";
import { applySide } from "./palette.js";

// tema (auto / terang / gelap) & sidebar admin
applyTheme(); applySide();

let mode = "";
function route() {
  if (!S.ready) return;
  let p = path();
  if (p.startsWith("/admin") && !S.isAdmin) { if (S.user) { toast("Halaman ini khusus admin.", "err"); } return go("/", true); }
  const want = p.startsWith("/admin") ? "a" : "c";
  const app = $("#app");
  if (mode !== want) {
    mode = want; document.body.classList.toggle("admin", want === "a");
    app.innerHTML = want === "a" ? A.shell() : C.shell();
  }
  closeOverlay();
  const views = {
    "/": C.home, "/orders": C.orders, "/chat": C.chat, "/account": C.account, "/checkout": C.checkout,
    "/admin": A.dashboard, "/admin/orders": A.orders, "/admin/chat": A.chat, "/admin/products": A.products,
    "/admin/reports": A.reports, "/admin/settings": A.settings, "/admin/more": A.more
  };
  const base = p.startsWith("/pay/") ? "/pay" : p.startsWith("/admin/settings") ? "/admin/settings" : p;
  views["/pay"] = C.pay;
  const v = views[base] || views["/"];
  if (S.openChat && p !== "/admin/chat") openThread(null);
  $("#view").innerHTML = v();
  document.title = (A.TITLES[base] ? A.TITLES[base] + " · " : "") + "Tubi";
  window.scrollTo(0, 0);
  import("./data.js").then(d => d.emit("route"));
  if (p === "/chat" && S.user) C.afterChat();
  if (p === "/checkout") C.afterCheckout();
}
setOnRoute(route);

// ---- notifikasi realtime ----
const prev = new Map(); let seen = null, unreadPrev = 0;
onChange(k => {
  if (k === "auth") {
    prev.clear(); seen = null; unreadPrev = 0; mode = "";
    if (S.isAdmin && (path() === "/" || path() === "")) go("/admin", true); else route();
  }
  if (k === "orders") {
    if (S.isAdmin) {
      const ids = new Set(S.orders.map(o => o.id));
      if (seen) S.orders.filter(o => !seen.has(o.id) && statusOf(o.status) === "menunggu").forEach(o => { beep(); toast(`🔔 Pesanan baru dari ${o.customerName || "pelanggan"}`); });
      seen = ids;
    } else {
      S.orders.forEach(o => { const s = statusOf(o.status), was = prev.get(o.id); if (was && was !== s) toast(`Pesanan #${o.id.slice(0, 6).toUpperCase()}: ${STATUS_LABEL[s]}`); prev.set(o.id, s); });
    }
  }
  if (k === "chats" && S.isAdmin) { const n = S.chats.reduce((a, c) => a + (+c.unreadAdmin || 0), 0); if (n > unreadPrev && path() !== "/admin/chat") { beep(); toast("💬 Pesan baru dari pelanggan"); } unreadPrev = n; }
  if (k === "msgs" || k === "chatMeta") setTimeout(toEnd, 0);
});

startAuth(route);
setTimeout(() => { if (!S.ready) $("#app").innerHTML = `<div class="boot"><img src="./tubi-icon.png" alt=""><b>Koneksi lambat…</b><button class="btn pri" onclick="location.reload()">Muat ulang</button></div>`; }, 9000);

// PWA: service worker network-first agar versi baru langsung terlihat
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(() => {});
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!sessionStorage.getItem("tubi-reloaded")) { sessionStorage.setItem("tubi-reloaded", "1"); location.reload(); } });
}
