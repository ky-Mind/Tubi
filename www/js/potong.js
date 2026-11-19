// Alat potong foto seperti di galeri HP: kotak potong yang bisa digeser & ditarik sudutnya, pilihan rasio, putar 90°.
// potongFoto(src) → Promise<dataURL JPEG | null (batal)>. Dipakai di form produk admin.
import { svg } from "./util.js";

const RASIO = [["1", "Persegi"], ["0.75", "3:4"], ["1.333", "4:3"], ["0", "Bebas"]];
const MAKS = 1080;   // sisi terpanjang hasil potongan (px)

const muat = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("Foto gagal dibuka.")); i.src = src; });

async function putar(src, derajat) {
  const im = await muat(src), c = document.createElement("canvas"), tegak = derajat % 180 !== 0;
  c.width = tegak ? im.naturalHeight : im.naturalWidth; c.height = tegak ? im.naturalWidth : im.naturalHeight;
  const g = c.getContext("2d"); g.translate(c.width / 2, c.height / 2); g.rotate(derajat * Math.PI / 180);
  g.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight / 2);
  return c.toDataURL("image/jpeg", 0.95);
}

export function potongFoto(srcAwal) {
  return new Promise(async selesai => {
    const d = document.getElementById("dialog");
    let src = srcAwal, rasio = 1, box = null, im = null;
    d.innerHTML = `<div class="ptg" role="dialog" aria-modal="true" aria-label="Potong foto">
      <div class="ptg-head"><button type="button" class="ptg-tx" data-p="batal">Batal</button><b>Potong foto</b><button type="button" class="ptg-tx kuat" data-p="pakai">Pakai</button></div>
      <div class="ptg-area"><div class="ptg-wadah"><img alt="" draggable="false"><div class="ptg-box"><i class="ptg-grid"></i><span data-h="tl"></span><span data-h="tr"></span><span data-h="bl"></span><span data-h="br"></span></div></div></div>
      <div class="ptg-bawah"><div class="seg ptg-rasio">${RASIO.map(([v, l]) => `<button type="button" data-r="${v}" class="${v === "1" ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="ptg-putar"><button type="button" class="btn sm" data-p="kiri">${svg("back", 15)} Putar kiri</button><button type="button" class="btn sm" data-p="kanan">Putar kanan <span style="transform:scaleX(-1);display:inline-flex">${svg("back", 15)}</span></button></div>
      <p class="muted xs">Geser kotak untuk memilih bagian foto, tarik sudutnya untuk mengubah ukuran. Kartu menu memakai bentuk persegi.</p></div></div>`;
    d.hidden = false; requestAnimationFrame(() => d.classList.add("show"));
    const img = d.querySelector(".ptg-wadah img"), kotak = d.querySelector(".ptg-box"), wadah = d.querySelector(".ptg-wadah"), area = d.querySelector(".ptg-area");

    const gambarKotak = () => { kotak.style.cssText = `left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px`; };
    const kotakAwal = () => {
      const W = img.clientWidth, H = img.clientHeight;
      let w = W, h = rasio ? W / rasio : H; if (h > H) { h = H; w = rasio ? H * rasio : W; }
      if (!rasio) { w = W * 0.9; h = H * 0.9; }
      box = { x: (W - w) / 2, y: (H - h) / 2, w, h }; gambarKotak();
    };
    const tampil = async () => {
      im = await muat(src).catch(() => null); if (!im) { tutup(null); return; }
      img.src = src;
      const maxW = area.clientWidth - 8, maxH = area.clientHeight - 8, s = Math.min(maxW / im.naturalWidth, maxH / im.naturalHeight, 1.6);
      img.style.width = Math.round(im.naturalWidth * s) + "px"; img.style.height = Math.round(im.naturalHeight * s) + "px";
      requestAnimationFrame(kotakAwal);
    };
    const tutup = hasil => { d.onclick = null; d.classList.remove("show"); setTimeout(() => { d.hidden = true; d.innerHTML = ""; }, 180); selesai(hasil); };

    // Seret kotak / sudut
    let seret = null;
    wadah.addEventListener("pointerdown", e => {
      if (!box) return; const h = e.target.dataset?.h, r = wadah.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      if (!h && !(px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h)) return;
      e.preventDefault(); try { wadah.setPointerCapture(e.pointerId); } catch {}
      seret = { h: h || "geser", x0: e.clientX, y0: e.clientY, b: { ...box } };
    });
    wadah.addEventListener("pointermove", e => {
      if (!seret) return; const W = img.clientWidth, H = img.clientHeight, dx = e.clientX - seret.x0, dy = e.clientY - seret.y0, b = seret.b, MIN = 40;
      if (seret.h === "geser") { box.x = Math.min(W - b.w, Math.max(0, b.x + dx)); box.y = Math.min(H - b.h, Math.max(0, b.y + dy)); return gambarKotak(); }
      const kiri = seret.h.includes("l"), atas = seret.h.includes("t");
      // sudut seberang tetap diam
      const ax = kiri ? b.x + b.w : b.x, ay = atas ? b.y + b.h : b.y;
      let w = Math.max(MIN, kiri ? b.w - dx : b.w + dx), h = Math.max(MIN, atas ? b.h - dy : b.h + dy);
      if (rasio) { if (w / h > rasio) w = h * rasio; else h = w / rasio; }
      const maxW = kiri ? ax : W - ax, maxH = atas ? ay : H - ay;
      if (w > maxW) { w = maxW; if (rasio) h = w / rasio; }
      if (h > maxH) { h = maxH; if (rasio) w = h * rasio; }
      box = { x: kiri ? ax - w : ax, y: atas ? ay - h : ay, w, h }; gambarKotak();
    });
    const lepas = () => { seret = null; };
    wadah.addEventListener("pointerup", lepas); wadah.addEventListener("pointercancel", lepas);

    d.onclick = async e => {
      const r = e.target.closest("[data-r]"), p = e.target.closest("[data-p]")?.dataset.p;
      if (r) { rasio = +r.dataset.r; d.querySelectorAll(".ptg-rasio button").forEach(b => b.classList.toggle("on", b === r)); kotakAwal(); return; }
      if (p === "batal") return tutup(null);
      if (p === "kiri" || p === "kanan") { src = await putar(src, p === "kiri" ? -90 : 90); return tampil(); }
      if (p === "pakai") {
        const k = im.naturalWidth / img.clientWidth, sx = box.x * k, sy = box.y * k, sw = box.w * k, sh = box.h * k;
        const s = Math.min(1, MAKS / Math.max(sw, sh)), c = document.createElement("canvas");
        c.width = Math.round(sw * s); c.height = Math.round(sh * s);
        const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
        g.imageSmoothingQuality = "high"; g.drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
        tutup(c.toDataURL("image/jpeg", 0.9));
      }
    };
    tampil();
  });
}
