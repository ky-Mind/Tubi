# Tubi v5.1 — static PWA

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


## REV2 → Production Fix Pack

Build ini tetap memakai project Firebase **tubi-app** yang sudah ada. Paket contoh lain tidak menjadi dependency dan tidak disalin ke source Tubi.

### Yang diperbaiki

- Foto profil dan foto produk tidak lagi disimpan sebagai base64 besar di Firestore. Foto dikompres lalu di-upload ke **Firebase Storage**, kemudian URL-nya disimpan di Firestore.
- Checkout tetap memakai koleksi `orders` yang sama sehingga customer dapat membuat pesanan dan admin dapat melihat/mengubah status.
- `firestore.rules` diperbarui untuk customer/admin, termasuk role admin yang tersimpan di dokumen user.
- `storage.rules` ditambahkan untuk mengamankan upload foto profil dan foto produk.
- Dashboard admin tetap khusus pengelolaan: **Tambah / Edit / Hapus**, tanpa tombol tambah ke keranjang.
- Dark mode diperketat untuk kartu statistik, panel admin, form, modal, input, teks sekunder, dan elemen lain yang sebelumnya masih putih/kurang kontras.
- Sidebar, modal keranjang, detail produk, login, dan checkout mengunci interaksi/scroll halaman belakang ketika sedang terbuka.
- Service worker diubah menjadi **network-first untuk HTML**, sehingga deployment baru dari GitHub → Vercel lebih cepat terlihat dan tidak tertahan oleh `index.html` lama.
- Tetap mempertahankan domain produksi. Tidak ada perubahan domain yang diperlukan.

### Setup Firebase yang wajib dilakukan sekali

Karena versi ini menggunakan Firebase Storage untuk foto, di Firebase Console project **tubi-app**:

1. Buka **Storage**.
2. Pilih **Get started** jika Storage belum dibuat.
3. Gunakan lokasi/bucket default yang ditawarkan Firebase.
4. Deploy Rules dari file `storage.rules` dan `firestore.rules`.

Jika memakai Firebase CLI:

```bash
firebase login
firebase use tubi-app
firebase deploy --only firestore:rules,storage
```

Tidak perlu menaruh service-account key di frontend.

### Jika checkout masih ditolak

Pesan `permission-denied` berarti Rules yang aktif di Firebase Console belum sama dengan `firestore.rules` di paket ini. Vercel hanya meng-host website; Vercel **tidak otomatis mengubah Firestore Rules**.

Setelah Rules dipasang, customer yang sudah login dapat membuat `orders/{orderId}`. Admin dapat membaca semua order dan mengubah status.

### Jika foto masih gagal

Pastikan Firebase Storage sudah diaktifkan. Setelah itu login ulang dan coba upload foto lagi. Foto produk disimpan di:

`products/<uid-admin>/<productId>-<timestamp>.jpg`

Foto profil disimpan di:

`users/<uid>/<profile>-<timestamp>.jpg`

### Update GitHub → Vercel tanpa mengganti domain

Hubungkan repository GitHub ke project Vercel dan jadikan branch produksi `main`. Setiap push/commit ke `main` akan membuat deployment produksi baru pada project yang sama. Domain produksi tetap melekat ke project Vercel tersebut.

Service worker versi ini juga memakai network-first untuk HTML dan memanggil `registration.update()` ketika aplikasi dibuka/dikembalikan ke foreground, sehingga perubahan `index.html` tidak tertahan cache lama.

**Catatan:** Firebase Rules dan Storage adalah bagian dari project Firebase, bukan bagian dari deployment Vercel. Jika hanya meng-upload ZIP ke GitHub/Vercel, rules Firebase tidak ikut terpasang otomatis.


## Firebase Spark $0
This REV4 build intentionally does **not** use Firebase Cloud Storage. Product/profile images are compressed in the browser and stored in Firestore as data URLs. Do not enable or deploy Storage rules for this build. Firestore remains required for products, profiles, admins, and orders.


## Final Blueprint build
This ZIP is the final Spark-compatible blueprint implementation. It keeps the static Vercel architecture, uses Firestore as the product source of truth, and adds customer/admin separation, order lifecycle, notifications, reporting, calculator, bug reports, FAQ, WhatsApp settings, printer fallback, reviews, availability, and PWA update handling.

### Firebase collections used
`users`, `admins`, `products`, `orders`, `notifications`, `bugReports`, `reviews`, `settings/store`.

### One-time Firebase action
Publish the included `firestore.rules` to project `tubi-app`. No Firebase Storage setup is required for this Spark image strategy.


### v5.2 stability patch
Fixes blank boot/update state, customer WhatsApp visibility, store-settings refresh, and customer cancellation binding. Static Vercel deployment remains dependency-free.


### v5.3 Navigation cleanup
Admin and customer support/settings areas are separated into dedicated pages. WhatsApp admin number input is normalized for Indonesian numbers and exposed to customers through the Account drawer and WhatsApp page.
