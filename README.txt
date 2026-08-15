TUBI — paket static Vercel + Firebase

FILE:
- index.html — seluruh UI dan logic aplikasi.
- firestore.rules — aturan keamanan Firestore.
- tubi-icon.png — ikon/logo aplikasi.
- manifest.webmanifest — ikon/install PWA.

KE DEPAN:
Mayoritas perubahan UI/fitur cukup dilakukan di index.html. Admin tambahan juga dapat
ditambahkan dari Dashboard Admin tanpa mengubah kode.

ADMIN UTAMA:
Hilmykia@gmail.com.

SETUP FIREBASE:
1. Authentication → Sign-in method → Google → Enable.
2. Authentication → Settings → Authorized domains → tambahkan domain Vercel yang benar,
   misalnya tubi-opal.vercel.app.
3. Firestore Database → aktif.
4. Firestore → Rules → publish isi firestore.rules.

DEPLOY:
Ini static site. Tidak perlu npm install/build. Upload isi ZIP ke Vercel sebagai project
static. Tidak ada vercel.json rewrite, supaya asset tidak salah diarahkan ke index.html.

LOGIN:
Google popup dipakai terlebih dahulu dan otomatis fallback ke redirect bila popup tidak tersedia.
Jika muncul auth/unauthorized-domain, domain Vercel harus ditambahkan ke Authorized domains.

ADMIN:
Email Hilmykia@gmail.com otomatis menjadi admin. Dari Dashboard Admin, admin utama dapat
menambahkan email admin lain. Admin baru tinggal login dengan akun Google tersebut.

FOTO:
Foto produk dan foto profil dikompres di browser sebelum disimpan ke Firestore agar lebih ringan.
