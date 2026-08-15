# Tubi — Final Rebuild

Paket ini dibuat dari proyek lama, tetapi disederhanakan menjadi aplikasi static/PWA agar lebih mudah dideploy ke Vercel.

## File utama
- `index.html` — seluruh UI, konfigurasi aplikasi, admin list, login, katalog, cart, checkout, profil, tema.
- `manifest.webmanifest` — nama aplikasi Tubi + instalasi PWA.
- `sw.js` — service worker/offline shell.
- `icon.svg`, `icon-192.svg`, `icon-512.svg` — ikon Tubi.

## Firebase
ZIP lama yang diberikan hanya berisi package.json, index.html, src/main.jsx, dan src/styles.css. Tidak ada Firebase config/API key di dalam ZIP lama tersebut, dan tidak ada dependency Firebase. Karena itu `index.html` menyediakan satu blok `TUBI_CONFIG` di bagian paling atas untuk menempelkan Web App Config Firebase yang benar.

Setelah config diisi, aktifkan:
1. Firebase Authentication > Google
2. Authorized domains untuk domain Vercel
3. Firestore Database
4. Storage jika ingin menambahkan backend penyimpanan foto yang lebih permanen.

Tanpa config Firebase, aplikasi tetap bisa dibuka dan diuji memakai localStorage, tetapi Google Login dan sinkronisasi antar perangkat belum aktif.

## Admin
Default admin:
`Hilmykia@gmail.com`

Tambahkan admin lain nanti pada:
`TUBI_CONFIG.admins`

## Vercel
Tidak membutuhkan `npm install` atau build command. Upload isi folder ini sebagai static site/repository dan gunakan `index.html` sebagai entry point.

## Catatan
API key Firebase Web bukan secret credential. Namun jangan memasukkan service-account private key atau password ke browser.
