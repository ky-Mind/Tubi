import { S, startAuth, onChange, statusOf, STATUS_LABEL } from "./data.js";
import { go, path, setOnRoute, closeOverlay, live } from "./core.js";
import { $, toast, beep, ls, esc } from "./util.js";
import * as C from "./customer.js";
import * as A from "./admin.js";
import { openThread } from "./data.js";
import { toEnd } from "./chat.js";
import { applyTheme } from "./ui.js";
import { applySide } from "./palette.js";
import { initNotif, cekPesanan, cekChat, cekLaporan } from "./notif.js";
import { mulaiCekUpdate } from "./update.js";
import { mulaiOffline } from "./offline.js";
import "./pintasan.js";

// tema (auto / terang / gelap) & sidebar admin
applyTheme(); applySide(); mulaiOffline();

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
  document.body.dataset.page = views[base] ? base : "/";
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
onChange(k => {
  if (k === "auth") {
    mode = ""; initNotif();
    if (S.isAdmin && (path() === "/" || path() === "")) go("/admin", true); else route();
  }
  if (k === "orders") cekPesanan();
  if (k === "chats" || k === "chatMeta") cekChat();
  if (k === "bugs") cekLaporan();
  if (k === "msgs" || k === "chatMeta") setTimeout(toEnd, 0);
});
// Ketuk notifikasi sistem → buka halaman terkait
navigator.serviceWorker?.addEventListener("message", e => { if (e.data?.href) go(e.data.href); });

startAuth(route);
mulaiCekUpdate();
setTimeout(() => { if (!S.ready) $("#app").innerHTML = `<div class="boot"><img src="./tubi-icon.png" alt=""><b>Koneksi lambat…</b><button class="btn pri" onclick="location.reload()">Muat ulang</button></div>`; }, 9000);

// PWA: service worker network-first agar versi baru langsung terlihat
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(() => {});
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!sessionStorage.getItem("tubi-reloaded")) { sessionStorage.setItem("tubi-reloaded", "1"); location.reload(); } });
}
