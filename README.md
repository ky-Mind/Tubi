# Tubi v3 — static PWA

Versi ini dibuat sebagai aplikasi static single-page agar deployment Vercel tidak lagi bergantung pada build command Vite.

## Deploy ke Vercel
1. Upload/push seluruh isi folder ini ke repository `ky-Mind/Tubi`.
2. `vercel.json` memaksa build statis dan mencegah error `vite: command not found`.
3. Jika Project Settings Vercel masih menyimpan Build Command `vite build`, gunakan Build Command kosong/override `vercel.json` dan Framework `Other`.

## Firebase
- Konfigurasi Firebase yang sudah ada dipertahankan di `index.html`.
- Admin utama: `Hilmykia@gmail.com`.
- Admin tambahan bisa ditambahkan dari Dashboard Admin.
- Google login tetap memakai Firebase Authentication.

## Ikon & install
- Ikon utama: `tubi-icon.png`.
- PWA icons: `tubi-icon-192.png`, `tubi-icon-512.png`.
- `manifest.webmanifest` + `sw.js` disiapkan agar Tubi dapat dipasang ke layar utama pada browser yang mendukung.

## Catatan Firebase
Jika Google login di domain Vercel gagal dengan `auth/unauthorized-domain`, domain deployment Vercel tersebut tetap harus ditambahkan sekali di Firebase Authentication → Settings → Authorized domains. Itu adalah pengaturan akun Firebase, bukan sesuatu yang bisa dipaksa dari ZIP.

Semua UI utama tetap berada di `index.html`, sehingga perubahan tampilan/fitur kecil berikutnya bisa dilakukan di sana tanpa membongkar struktur aplikasi.


## Tubi v4 client revision
Static Vercel deployment. Firebase Authentication/Firestore remain configured in index.html. Firestore rules are in firestore.rules and must be published in Firebase Console if they have not been published yet.
