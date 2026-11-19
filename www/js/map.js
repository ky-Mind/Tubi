// Peta (Leaflet + OpenStreetMap, dimuat lokal dari /vendor). Pemilih titik, pencarian alamat, pembalik alamat.
import { esc, toast, svg } from "./util.js";

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
// Alamat ringkas gaya Indonesia: Jalan No., RT/kampung, kelurahan, kecamatan, kota, kode pos.
const rapiAlamat = j => {
  const a = j?.address || {}, uniq = [];
  const jalan = a.road ? a.road + (a.house_number ? " No. " + a.house_number : "") : a.house_number ? "No. " + a.house_number : "";
  [j?.name || a.amenity || a.shop || a.building || a.house_name, jalan, a.neighbourhood || a.hamlet || a.residential, a.village || a.suburb || a.quarter, a.city_district || a.district || a.municipality, a.city || a.town || a.county || a.regency, a.state, a.postcode]
    .forEach(x => { x = String(x || "").trim(); if (x && !uniq.includes(x)) uniq.push(x); });
  return uniq.length >= 3 ? uniq.join(", ") : (j?.display_name || uniq.join(", "));
};
export async function reverse(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=id&lat=${lat}&lon=${lng}`);
    return rapiAlamat(await r.json());
  } catch { return ""; }
}
// Pencarian diprioritaskan di sekitar area peta yang sedang terlihat (hasil terdekat muncul duluan).
export async function search(q, near) {
  const vb = near ? `&viewbox=${near.getWest()},${near.getNorth()},${near.getEast()},${near.getSouth()}` : "";
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=id&accept-language=id${vb}&q=${encodeURIComponent(q)}`);
  return (await r.json()).map(x => ({ name: rapiAlamat(x), lat: +x.lat, lng: +x.lon }));
}
export const gps = onProgress => new Promise((res, rej) => {
  if (!navigator.geolocation) return rej(new Error("Browser ini tidak mendukung lokasi."));
  let best = null, id = null, done = false, t;
  const stop = () => { done = true; clearTimeout(t); try { navigator.geolocation.clearWatch(id); } catch {} };
  const finish = () => { if (done) return; stop(); best ? res(best) : rej(new Error("Lokasi belum ditemukan. Coba lagi di tempat terbuka.")); };
  t = setTimeout(finish, 20000);   // kumpulkan bacaan terbaik hingga 20 detik, berhenti dini bila sudah ±15 m
  id = navigator.geolocation.watchPosition(p => {
    const c = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), accuracy: p.coords.accuracy };
    if (!best || c.accuracy < best.accuracy) { best = c; onProgress?.(best); }
    if (best.accuracy <= 15) finish();
  }, e => { if (done) return; if (!best) { stop(); rej(new Error(e.code === 1 ? "Izin lokasi ditolak. Aktifkan lokasi untuk situs ini di pengaturan browser." : "Lokasi belum ditemukan. Coba lagi di tempat terbuka.")); } }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
});

// Pemilih titik gaya aplikasi ojek: pin tetap di tengah, peta yang digeser. Lebih presisi daripada menyeret pin kecil.
// onChange({lat,lng,accuracy,manual}) dipanggil tiap kali peta berhenti bergerak.
export async function picker(el, start, onChange) {
  const L = await loadLeaflet(); el.innerHTML = "";
  const c = start?.lat ? [start.lat, start.lng] : DEFAULT, map = L.map(el, { zoomControl: true, attributionControl: true }).setView(c, start?.lat ? 18 : 13);
  const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
  const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Tiles © Esri" });
  L.control.layers({ "Peta": osm, "Satelit": sat }, null, { position: "topright", collapsed: true }).addTo(map);
  const pin = document.createElement("div"); pin.className = "pin-c"; pin.innerHTML = "<b></b><i></i>"; el.appendChild(pin);
  let circle = null, placed = !!start?.lat, acc = start?.accuracy || 0, manual = !!start?.manual, auto = false;
  const emit = () => { const p = map.getCenter(); placed = true; el.classList.add("placed"); onChange({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6), accuracy: acc, ...(manual ? { manual: true } : {}) }); };
  if (placed) el.classList.add("placed");
  map.on("movestart", () => { if (!auto) el.classList.add("moving"); });
  map.on("moveend", () => {
    el.classList.remove("moving");
    if (auto) { auto = false; return emit(); }
    acc = 0; manual = true; circle?.remove(); circle = null; emit();   // digeser tangan = titik manual
  });
  map.on("click", e => map.setView(e.latlng, map.getZoom(), { animate: false }));
  const set = (lat, lng, a, zoom, isManual = false) => {
    acc = a || 0; manual = isManual; circle?.remove();
    circle = a ? L.circle([lat, lng], { radius: a, color: "#178a95", weight: 1, fillOpacity: .1, interactive: false }).addTo(map) : null;
    auto = true; map.setView([lat, lng], zoom || Math.max(map.getZoom(), 17), { animate: false });
    setTimeout(() => { if (auto) { auto = false; emit(); } }, 450);   // bila posisi tidak berubah, moveend tidak muncul
  };
  setTimeout(() => map.invalidateSize(), 250);
  return { set, map, isPlaced: () => placed };
}
export async function viewer(el, loc) {
  const L = await loadLeaflet(); el.innerHTML = "";
  const map = L.map(el).setView([loc.lat, loc.lng], 17);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
  L.marker([loc.lat, loc.lng]).addTo(map); if (loc.accuracy > 15) L.circle([loc.lat, loc.lng], { radius: loc.accuracy, color: "#c8232c", weight: 1, fillOpacity: .08 }).addTo(map);
  setTimeout(() => map.invalidateSize(), 250); return map;
}
export const mapsDir = o => o?.location?.lat ? `https://www.google.com/maps/dir/?api=1&destination=${o.location.lat},${o.location.lng}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(o?.address || "")}`;
export const mapsView = o => o?.location?.lat ? `https://www.google.com/maps/search/?api=1&query=${o.location.lat},${o.location.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o?.address || "")}`;

// Widget pemilih lokasi lengkap (dipakai di checkout & profil)
export const pickerHtml = id => `<div class="locbox" id="${id}"><div class="loc-q"><input type="search" data-enter="locsearch" placeholder="Cari jalan, gedung, atau patokan…" id="${id}-q"><button type="button" class="btn sm" data-act="locsearch">${"Cari"}</button></div>
  <div id="${id}-res" class="loc-res"></div><div class="locmap" id="${id}-map"><div class="muted sm" style="padding:20px;text-align:center">Memuat peta…</div></div>
  <button type="button" class="btn alt full" data-act="locgps">${svg("pin", 18)} Pakai lokasi saya saat ini (GPS)</button>
  <div class="sm muted" id="${id}-st">Geser peta sampai pin merah tepat di rumah / pintu masuk.</div></div>`;

// ---- Pengendali widget (satu pemilih aktif dalam satu waktu) ----
import { actions } from "./core.js";
import { $ } from "./util.js";
let cur = null, t = null, results = [];
export async function mountLocation(id, start, onPick) {
  cur = null;
  try {
    const st = $(`#${id}-st`); let pk;
    pk = await picker($(`#${id}-map`), start, loc => {
      if (st) {
        const low = loc.accuracy > 50 && !loc.manual;
        st.className = "sm " + (low ? "loc-warn" : "loc-ok");
        st.textContent = loc.manual ? "Titik ditandai manual. Pastikan pin tepat di rumah / pintu masuk."
          : low ? `GPS kurang akurat (±${Math.round(loc.accuracy)} m). Geser peta sampai pin tepat di rumahmu, atau nyalakan Wi‑Fi lalu tekan GPS lagi.`
          : `Titik GPS terpasang (±${Math.round(loc.accuracy || 0)} m). Geser peta bila kurang tepat.`;
      }
      onPick(loc, null); clearTimeout(t); t = setTimeout(async () => { const a = await reverse(loc.lat, loc.lng); if (a) onPick(loc, a); }, 700);
    });
    cur = { id, pk };
    if (start?.lat && st) { st.className = "sm loc-ok"; st.textContent = "Titik tersimpan. Geser peta bila kurang tepat."; }
    // Belum ada titik & izin lokasi sudah pernah diberikan: langsung cari posisi GPS tanpa perlu menekan tombol.
    if (!start?.lat && navigator.permissions) navigator.permissions.query({ name: "geolocation" }).then(p => { if (p.state === "granted" && cur?.id === id && !pk.isPlaced()) actions.locgps().catch(() => {}); }).catch(() => {});
  } catch (e) { const m = $(`#${id}-map`); if (m) m.innerHTML = `<div class="alert">${esc(e.message)}</div>`; }
}
actions.locgps = async () => {
  if (!cur) return; const me = cur, st = $(`#${me.id}-st`); if (st) { st.className = "sm muted"; st.textContent = "Mencari sinyal GPS… tunggu beberapa detik agar akurat."; }
  $(`#${me.id}-map`)?.classList.add("seeking");
  try {
    const g = await gps(b => { if (cur === me) { me.pk.set(b.lat, b.lng, b.accuracy, 18); if (st) st.textContent = `Memperbaiki akurasi… ±${Math.round(b.accuracy)} m`; } });
    if (cur === me) me.pk.set(g.lat, g.lng, g.accuracy, 18);
  } finally { $(`#${me.id}-map`)?.classList.remove("seeking"); }
};
actions.locsearch = async () => {
  if (!cur) return; const q = $(`#${cur.id}-q`).value.trim(); if (q.length < 3) return toast("Ketik minimal 3 huruf.", "err");
  const box = $(`#${cur.id}-res`); box.innerHTML = `<div class="muted sm">Mencari…</div>`;
  try { results = await search(q, cur.pk.map.getBounds()); } catch { results = []; box.innerHTML = `<div class="alert">Pencarian gagal. Periksa koneksi.</div>`; return; }
  box.innerHTML = results.length ? results.map((r, i) => `<button type="button" class="loc-item" data-act="locpick" data-i="${i}"><svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg> ${esc(r.name)}</button>`).join("") : `<div class="muted sm">Tidak ditemukan. Coba kata lain atau tandai langsung di peta.</div>`;
};
actions.locpick = el => { const r = results[+el.dataset.i]; if (!r || !cur) return; cur.pk.set(r.lat, r.lng, 0, 18, true); $(`#${cur.id}-res`).innerHTML = ""; };
