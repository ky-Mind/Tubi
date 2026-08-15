# Tubi — versi revisi

Struktur sengaja dibuat ringkas:
- `index.html` — seluruh UI, Firebase, login Google, customer, admin, katalog, pesanan, tema, lokasi, dan install PWA.
- `firestore.rules` — keamanan Firebase Firestore.
- `manifest.webmanifest` — konfigurasi install sebagai aplikasi.
- `tubi-icon.png` — logo/app icon.

## Firebase wajib
1. Authentication → Sign-in method → aktifkan Google.
2. Authentication → Settings → Authorized domains → tambahkan domain Vercel yang dipakai.
3. Firestore → Rules → tempel isi `firestore.rules` lalu Publish.
4. Pastikan proyek Firebase yang dipakai adalah `tubi-app`.

## Admin
Admin utama: `Hilmykia@gmail.com`.
Admin tambahan bisa ditambahkan dari Dashboard Admin tanpa mengubah kode.

## Vercel
Tidak membutuhkan `vercel.json` atau build command. Deploy sebagai static site dengan `index.html` sebagai entry point. Jika deployment GitHub masih Failed, buka Vercel → Deployments → deployment yang gagal → Build Logs; error di sana yang menentukan penyebabnya.

## Perubahan berikutnya
Fokus perubahan aplikasi ada di `index.html`. Jika menambah file logo/icon, update juga `tubi-icon.png` dan manifest.
