# Tubi App

Versi Tubi yang sudah dibuat responsif dengan:
- Login Google dipindahkan ke halaman Profil.
- Halaman Beranda, Pesanan, Favorit, Profil, dan Dashboard Admin.
- Keranjang + checkout sederhana.
- Favorit produk.
- Dashboard admin untuk menambah produk, harga, kategori, rating, emoji fallback, dan **foto produk**.
- Foto produk disimpan ke Firebase Storage dan data produk ke Cloud Firestore.
- Admin ditentukan dari email `hilmykia@gmail.com`.

## 1. Install

```bash
npm install
npm run dev
```

## 2. Firebase Console

Pastikan:
1. Authentication → Sign-in method → Google → Enable.
2. Authentication → Settings → Authorized domains → tambahkan domain Vercel kamu.
3. Firestore sudah dibuat.
4. Storage sudah diaktifkan.
5. Rules Firestore dan Storage pada file `firestore.rules` dan `storage.rules` dipasang di Firebase Console.

## 3. Admin

Login memakai:

`hilmykia@gmail.com`

Akun Google lain otomatis menjadi pengguna biasa.

## 4. Catatan

Jangan menaruh service-account/private key Firebase di frontend. Konfigurasi web Firebase yang ada di `src/firebase.js` memang ditujukan untuk aplikasi web; keamanan sebenarnya dilakukan melalui Firebase Security Rules.

Jika Google login masih kembali ke halaman yang sama, cek **Authentication → Settings → Authorized domains** dan pastikan domain Vercel kamu sudah terdaftar. Versi ini menggunakan `signInWithPopup`, jadi tidak bergantung pada redirect callback.

## 5. Deploy Vercel

Push isi folder ini ke GitHub, lalu deploy sebagai Vite app di Vercel.

Build command:
`npm run build`

Output:
`dist`
