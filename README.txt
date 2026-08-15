TUBI — versi baru
=================

Struktur dibuat sengaja ringkas:
- index.html        -> seluruh UI, logic, Firebase config, admin/customer flow
- package.json      -> Vite
- public/tubi-icon.png -> ikon/logo aplikasi
- public/manifest.webmanifest -> metadata install/PWA
- firestore.rules   -> aturan keamanan Firestore

ADMIN
-----
Akun admin dikunci ke:
Hilmykia@gmail.com

Google login tetap dipakai untuk customer lain. Customer otomatis masuk sebagai customer.

FIREBASE YANG WAJIB DI CEK
--------------------------
1. Firebase Console -> Authentication -> Sign-in method -> Google -> Enable.
2. Authentication -> Settings -> Authorized domains:
   tambahkan domain Vercel kamu, misalnya:
   tubiopal.versal.app
   (tambahkan domain Vercel yang benar jika berbeda).
3. Firestore Database sudah dibuat di asia-southeast2.
4. Buka Firestore -> Rules lalu tempel isi firestore.rules dan Publish.

PRODUK & PESANAN
----------------
- Admin bisa tambah/edit/hapus produk.
- Admin bisa upload foto produk; foto diperkecil otomatis lalu disimpan di Firestore.
- Customer bisa favorit, keranjang, checkout.
- Pesanan customer masuk real-time ke Dashboard Admin.
- Admin bisa mengubah status: baru / diproses / selesai / dibatalkan.

PENTING
-------
Versi ini tidak memakai Firebase Storage sehingga konfigurasi lebih sederhana.
Foto dikompres ke JPEG sebelum masuk Firestore. Untuk foto sangat besar/berjumlah sangat banyak,
lebih baik nanti dipindah ke Storage.

DEPLOY
------
npm install
npm run build

Folder hasil build: dist/
Deploy dist/ ke Vercel.

Kalau nanti mau mengubah tampilan, alur, produk default, atau konfigurasi Firebase,
file utama yang disentuh adalah index.html. Ikon dan manifest tidak perlu diubah kecuali ingin
mengganti logo aplikasi.
