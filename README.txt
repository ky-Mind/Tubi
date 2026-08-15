TUBI — versi revisi Vercel/Firebase
====================================

File utama:
- index.html       -> UI + seluruh logic customer/admin + Firebase
- package.json     -> Vite build
- vercel.json      -> routing SPA agar deployment Vercel tidak error
- public/tubi-icon.png -> logo/icon Tubi (PNG valid)
- public/manifest.webmanifest -> icon/install PWA
- firestore.rules  -> keamanan Firestore

ALUR:
- Beranda: katalog, pencarian, kategori, favorit, keranjang.
- Akun: login Google, profil, pesanan, favorit.
- Pesanan: checkout customer dan status pesanan.
- Admin: hanya Hilmykia@gmail.com, kelola produk + foto + harga + kategori + pesanan.

FIREBASE:
1. Authentication -> Sign-in method -> Google -> Enable.
2. Authentication -> Settings -> Authorized domains -> tambahkan domain Vercel yang benar,
   misalnya tubi-opal.vercel.app (gunakan persis domain yang terlihat di browser).
3. Firestore Database harus aktif.
4. Firestore -> Rules -> publish firestore.rules.
5. Untuk login mobile, aplikasi menggunakan redirect; desktop menggunakan popup lalu fallback redirect.

CATATAN LOGO:
- Logo sebelumnya rusak karena file bernama .png ternyata berisi JPEG.
- Paket ini menggantinya dengan PNG yang benar dan manifest/icon diarahkan ke file tersebut.

DEPLOY:
npm install
npm run build

Di Vercel, framework preset Vite akan menjalankan build dan output dist secara otomatis.
Jangan ubah nama index.html.

PENTING:
Jika Vercel memberi error build, buka Deployment -> Build Logs. Jika login memberi
auth/unauthorized-domain, itu bukan error kode: domain Vercel harus ditambahkan ke Firebase
Authentication -> Authorized domains.
