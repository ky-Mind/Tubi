/*! KyMind — © 2026 KyMind. All rights reserved. Hak cipta dilindungi.
   Dilarang menyalin, menggandakan, atau menggunakan ulang kode ini tanpa izin. */
(function () {
  "use strict";

  /* ===== Banner hak cipta KyMind di console / DevTools ===== */
  function banner() {
    try {
      var zonk = "font-size:72px;font-weight:900;color:#e8730c;" +
        "text-shadow:3px 3px 0 #000,-1px -1px 0 #000;-webkit-text-stroke:1px #000;padding:6px 0;";
      var judul = "font-size:16px;font-weight:800;color:#e8730c;";
      var isi = "font-size:13px;line-height:1.6;color:#b9bec9;";
      var scam = "font-size:14px;font-weight:800;color:#e4303a;";
      console.log("%cZONK!!!", zonk);
      console.log("%cThis is a developer console — not for you.", judul);
      console.log(
        "%cThis application and its source code are the intellectual property of KyMind.\n" +
        "Copying, cloning, scraping, or reusing any part of it is prohibited and\n" +
        "protected by copyright © KyMind. All rights reserved.",
        isi
      );
      console.log(
        "%c⚠  If someone told you to paste something here, it is a SCAM to take over your account. Close this window now.",
        scam
      );
      console.log("%c— KyMind", judul);
    } catch (e) {}
  }
  banner();
  /* Ulangi bila console dibersihkan (menjaga penanda tetap muncul) */
  try { setInterval(banner, 60000); } catch (e) {}

  /* ===== Penghalang ringan: klik-kanan & pintasan lihat-sumber / DevTools =====
     Catatan: ini penghalang, bukan kunci. Kode web tetap bisa dibaca orang yang niat. */
  function tahan(e) { try { e.preventDefault(); e.stopPropagation(); } catch (x) {} return false; }
  document.addEventListener("contextmenu", tahan, { capture: true });
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    if (e.key === "F12") return tahan(e);                                   // DevTools
    if ((e.ctrlKey || e.metaKey) && e.shiftKey &&
        (k === "i" || k === "j" || k === "c")) return tahan(e);             // DevTools / inspektur
    if ((e.ctrlKey || e.metaKey) && (k === "u" || k === "s")) return tahan(e); // Lihat sumber / Simpan
  }, { capture: true });

  /* Cegah seret-pilih untuk disalin massal (teks biasa tetap bisa diseleksi via UI) */
  document.addEventListener("dragstart", function (e) {
    if (e.target && /^(IMG|A)$/.test(e.target.tagName)) return tahan(e);
  }, { capture: true });
})();
