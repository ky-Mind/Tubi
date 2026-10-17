// Peta (Leaflet + OpenStreetMap, dimuat lokal dari /vendor). Pemilih titik, pencarian alamat, pembalik alamat.
import { esc, toast } from "./util.js";

let lp;
export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  return lp || (lp = new Promise((res, rej) => {
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "./vendor/leaflet/leaflet.css"; document.head.appendChild(l);
    const s = document.createElement("script"); s.src = "./vendor/leaflet/leaflet.js";
    s.onload = () => { window.L.Icon.Default.imagePath = "./vendor/leaflet/images/"; res(window.L); };
    s.onerror = () => { lp = null; rej(new Error("Peta gagal dimuat. Periksa koneksi internet.")); };
    document.head.appendChild(s);
  }));
}
const DEFAULT = [-6.9175, 107.6191];
export async function reverse(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=id&lat=${lat}&lon=${lng}`);
    const j = await r.json(); return j.display_name || "";
  } catch { return ""; }
}
export async function search(q) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=id&accept-language=id&q=${encodeURIComponent(q)}`);
  return (await r.json()).map(x => ({ name: x.display_name, lat: +x.lat, lng: +x.lon }));
}
export const gps = onProgress => new Promise((res, rej) => {
  if (!navigator.geolocation) return rej(new Error("Browser ini tidak mendukung lokasi."));
  let best = null, id = null, done = false, t;
  const stop = () => { done = true; clearTimeout(t); try { navigator.geolocation.clearWatch(id); } catch {} };
  const finish = () => { if (done) return; stop(); best ? res(best) : rej(new Error("Lokasi belum ditemukan. Coba lagi di tempat terbuka.")); };
  t = setTimeout(finish, 15000);   // kumpulkan bacaan terbaik hingga 15 detik, berhenti dini bila sudah ±15 m
  id = navigator.geolocation.watchPosition(p => {
    const c = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), accuracy: p.coords.accuracy };
    if (!best || c.accuracy < best.accuracy) { best = c; onProgress?.(best); }
    if (best.accuracy <= 15) finish();
  }, e => { if (done) return; if (!best) { stop(); rej(new Error(e.code === 1 ? "Izin lokasi ditolak. Aktifkan lokasi untuk situs ini di pengaturan browser." : "Lokasi belum ditemukan. Coba lagi di tempat terbuka.")); } }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
});

// Pemilih titik: pin bisa diseret / peta diklik. onChange({lat,lng,accuracy}) dipanggil tiap perubahan.
export async function picker(el, start, onChange) {
  const L = await loadLeaflet(); el.innerHTML = "";
  const c = start?.lat ? [start.lat, start.lng] : DEFAULT, map = L.map(el, { zoomControl: true, attributionControl: true }).setView(c, start?.lat ? 17 : 13);
  const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
  const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Tiles © Esri" });
  L.control.layers({ "Peta": osm, "Satelit": sat }, null, { position: "topright", collapsed: true }).addTo(map);
  const mk = L.marker(c, { draggable: true }).addTo(map); let circle = null, placed = !!start?.lat;
  const emit = (acc, manual) => { const p = mk.getLatLng(); placed = true; onChange({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6), accuracy: acc, ...(manual ? { manual: true } : {}) }); };
  const set = (lat, lng, acc, zoom, manual = false) => { mk.setLatLng([lat, lng]); circle?.remove(); circle = acc ? L.circle([lat, lng], { radius: acc, color: "#e11d2e", weight: 1, fillOpacity: .08 }).addTo(map) : null; map.setView([lat, lng], zoom || Math.max(map.getZoom(), 17)); emit(acc, manual); };
  mk.on("dragend", () => { circle?.remove(); circle = null; emit(0, true); });
  map.on("click", e => { mk.setLatLng(e.latlng); circle?.remove(); circle = null; emit(0, true); });
  setTimeout(() => map.invalidateSize(), 250);
  return { set, map, isPlaced: () => placed };
}
export async function viewer(el, loc) {
  const L = await loadLeaflet(); el.innerHTML = "";
  const map = L.map(el).setView([loc.lat, loc.lng], 17);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
  L.marker([loc.lat, loc.lng]).addTo(map); if (loc.accuracy > 15) L.circle([loc.lat, loc.lng], { radius: loc.accuracy, color: "#e11d2e", weight: 1, fillOpacity: .08 }).addTo(map);
  setTimeout(() => map.invalidateSize(), 250); return map;
}
export const mapsDir = o => o?.location?.lat ? `https://www.google.com/maps/dir/?api=1&destination=${o.location.lat},${o.location.lng}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(o?.address || "")}`;
export const mapsView = o => o?.location?.lat ? `https://www.google.com/maps/search/?api=1&query=${o.location.lat},${o.location.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o?.address || "")}`;

// Widget pemilih lokasi lengkap (dipakai di checkout & profil)
export const pickerHtml = id => `<div class="locbox" id="${id}"><div class="row wrap"><button type="button" class="btn sm" data-act="locgps">📍 Lokasi saya</button><div class="sp row" style="min-width:200px"><input type="search" data-enter="locsearch" placeholder="Cari alamat / nama tempat…" id="${id}-q"><button type="button" class="btn sm" data-act="locsearch">Cari</button></div></div>
  <div id="${id}-res" class="loc-res"></div><div class="locmap" id="${id}-map"><div class="muted sm" style="padding:20px;text-align:center">Memuat peta…</div></div>
  <div class="sm muted" id="${id}-st">Geser pin atau ketuk peta untuk menandai titik pengantaran.</div></div>`;

// ---- Pengendali widget (satu pemilih aktif dalam satu waktu) ----
import { actions } from "./core.js";
import { $ } from "./util.js";
let cur = null, t = null, results = [];
export async function mountLocation(id, start, onPick) {
  cur = null;
  try {
    const st = $(`#${id}-st`); let pk;
    pk = await picker($(`#${id}-map`), start, loc => {
      if (st) { const low = loc.accuracy > 100 && !loc.manual; st.className = "sm " + (low ? "loc-warn" : "muted"); st.textContent = loc.manual ? "✓ Titik ditandai manual — pastikan pin tepat di rumah / pintu masuk." : `${low ? "⚠ Akurasi rendah" : "✓ Titik terpasang"} (±${Math.round(loc.accuracy || 0)} m)${low ? " — geser pin ke posisi rumah, atau aktifkan GPS / Wi‑Fi dan coba lagi." : " — geser pin bila kurang tepat."}`; }
      onPick(loc, null); clearTimeout(t); t = setTimeout(async () => { const a = await reverse(loc.lat, loc.lng); if (a) onPick(loc, a); }, 700);
    });
    cur = { id, pk }; if (start?.lat && st) st.textContent = "✓ Titik tersimpan — geser pin bila kurang tepat.";
  } catch (e) { const m = $(`#${id}-map`); if (m) m.innerHTML = `<div class="alert">${esc(e.message)}</div>`; }
}
actions.locgps = async () => {
  if (!cur) return; const st = $(`#${cur.id}-st`); if (st) { st.className = "sm muted"; st.textContent = "Mencari sinyal GPS… tunggu beberapa detik agar akurat."; }
  const g = await gps(b => { cur?.pk.set(b.lat, b.lng, b.accuracy, 18); if (st) st.textContent = `Memperbaiki akurasi… ±${Math.round(b.accuracy)} m`; }); cur.pk.set(g.lat, g.lng, g.accuracy, 18);
};
actions.locsearch = async () => {
  if (!cur) return; const q = $(`#${cur.id}-q`).value.trim(); if (q.length < 3) return toast("Ketik minimal 3 huruf.", "err");
  const box = $(`#${cur.id}-res`); box.innerHTML = `<div class="muted sm">Mencari…</div>`;
  try { results = await search(q); } catch { results = []; box.innerHTML = `<div class="alert">Pencarian gagal. Periksa koneksi.</div>`; return; }
  box.innerHTML = results.length ? results.map((r, i) => `<button type="button" class="loc-item" data-act="locpick" data-i="${i}">📍 ${esc(r.name)}</button>`).join("") : `<div class="muted sm">Tidak ditemukan. Coba kata lain atau tandai langsung di peta.</div>`;
};
actions.locpick = el => { const r = results[+el.dataset.i]; if (!r || !cur) return; cur.pk.set(r.lat, r.lng, 0, 18, true); $(`#${cur.id}-res`).innerHTML = ""; };
