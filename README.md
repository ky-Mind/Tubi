# Tubi — Max Rebuild

Ini adalah rebuild total dari ZIP lama. Versi ini sengaja memakai struktur yang jelas agar error seperti teks `$svg(...)`, ikon rusak, dan campuran dashboard customer/admin tidak muncul lagi.

## Isi
- `index.html` — shell UI
- `app.js` — seluruh interaksi aplikasi
- `firebase-config.js` — SATU tempat untuk Firebase Web App Config + daftar admin
- `assets/` — logo/icon Tubi PNG + SVG
- `manifest.webmanifest` — PWA install
- `sw.js` — offline shell
- `vercel.json` — konfigurasi static deployment
- `firestore.rules` — aturan database
- `storage.rules` — aturan foto

## Penting tentang API key
ZIP lama yang diberikan **tidak berisi Firebase Web App Config asli**. Isinya hanya placeholder `PASTE_FIREBASE_*`. Jadi saya tidak mengarang API key atau project ID baru. Tempel Web App Config Firebase yang benar ke `firebase-config.js`.

Firebase Web API key memang boleh berada di frontend; yang tidak boleh dimasukkan ke frontend adalah service-account private key.

## Admin
Sudah disiapkan:
`Hilmykia@gmail.com`

Tambahkan admin berikutnya di dua tempat:
1. `firebase-config.js` -> `admins`
2. `firestore.rules` dan `storage.rules` -> daftar email admin

## Firebase yang harus aktif
Authentication:
- Google provider aktif
- Authorized domains berisi domain Vercel yang dipakai

Firestore:
- buat database
- publish `firestore.rules`

Storage:
- buat Storage
- publish `storage.rules`

## Fitur rebuild
- Customer dan Admin dipisahkan berdasarkan email Google.
- `Hilmykia@gmail.com` masuk Dashboard Admin.
- Customer hanya melihat area customer.
- Admin dapat tambah/edit/hapus produk.
- Admin dapat upload foto produk.
- Pesanan customer masuk ke koleksi `orders` dan tampil di dashboard admin bila Firebase aktif.
- Konfirmasi pesanan menampilkan nama penerima + nomor telepon + alamat/catatan + titik GPS.
- Titik GPS dibuka lewat Google Maps.
- Status pesanan dapat diubah admin.
- Profil dapat diedit.
- Logout meminta konfirmasi.
- Dark/light mode memakai variabel tema yang konsisten.
- PWA install + ikon Tubi.
- Mobile, tablet, desktop responsive.
- Tanpa npm/build dependency; cocok untuk static deployment Vercel.

## Vercel
Tidak perlu `package.json`, Node server, atau folder `dist`.
Untuk deployment static:
- Framework Preset: Other
- Build Command: kosong
- Output Directory: `.`

Jika GitHub -> Vercel masih gagal, buka deployment yang merah dan lihat `Build Logs`. ZIP ini sendiri tidak membutuhkan proses build.

## Catatan sinkronisasi
Tanpa Firebase config, aplikasi tetap dapat diuji dengan localStorage di perangkat yang sama.
Untuk login Google, sinkronisasi produk, foto cloud, dan pesanan antar perangkat, Firebase config + rules harus benar.
