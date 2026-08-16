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


## Client revision — v4.2
Perbaikan yang termasuk dalam revisi ini:
- Modal/drawer mengunci scroll dan interaksi halaman belakang.
- Dark mode contrast diperbaiki untuk modal, form, admin, drawer, dan navigasi.
- Foto produk lebih tahan terhadap path lama (`assets/...`, `public/...`) dan memiliki fallback berdasarkan produk.
- Pencarian diperluas dengan pencocokan rasa, sinonim, deskripsi, kategori, dan intent sederhana sehingga query natural seperti "makanan pedas gurih" menghasilkan beberapa kandidat terdekat.
- Checkout dan tampilan pesanan diperjelas; error Firestore dibuat lebih spesifik.
- Admin tetap mendukung tambah, upload foto, edit, hapus produk, serta pengelolaan order.
- Profil customer tetap mendukung nama, telepon, alamat, lokasi, foto profil, dan Google Maps.

### Penting untuk Firebase
`firestore.rules` pada ZIP ini harus dipublish/deploy ke project Firebase `tubi-app`. ZIP tidak dapat mengubah Rules yang sudah tersimpan di Firebase Console secara otomatis. Jika checkout masih mendapat `permission-denied`, publish file `firestore.rules` terlebih dahulu.


### v4.2 — Client polish
- Admin dashboard is a management surface: no cart/buy controls on the admin view.
- Product management is explicit CRUD with edit/delete, menu category, taste/attribute tags, availability, and image preview.
- Customer and admin share the same Firestore `products` and `orders` collections.
- Added a one-click admin catalog import when Firestore has no products, preventing the customer fallback catalog from appearing as an unexplained admin `0`.
- Product images use a common fallback resolver in customer cards, detail, cart, and admin preview.
- Search now understands both menu types and taste/attribute intent.
- Dark mode and the display-mode control were polished for contrast and clarity.
- Admin order status now includes `Siap` in addition to Menunggu/Diproses/Selesai/Dibatalkan.
