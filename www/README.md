<div align="center">

<img src="www/tubi-icon-192.png" width="96" alt="Tubi" />

# Tubi

**Pesan makanan favorit — pelanggan & admin terhubung realtime.**

![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth-ffca28?logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Deploy-Vercel%20(statis)-000?logo=vercel)
![No build](https://img.shields.io/badge/Build-tanpa%20bundler-e11d2e)
![Responsive](https://img.shields.io/badge/Tampilan-HP%20%26%20Desktop-16a34a)

</div>

---

## ✨ Fitur

| 🛍️ Pelanggan | 🧑‍🍳 Admin |
|---|---|
| Menu dengan pencarian, kategori otomatis, favorit | Dashboard, pesanan, produk, chat, laporan, pengaturan |
| Keranjang dengan foto produk, hapus item, **Beli sekarang** | Ubah status pesanan → pelanggan langsung tahu |
| **Titik lokasi di peta** (GPS, cari alamat, geser pin) | **Navigasi Google Maps** & peta titik pelanggan |
| Bayar **COD** atau **Transfer / QRIS** + unggah bukti | Tandai lunas, lihat bukti bayar |
| Chat dengan admin, **hapus pesan** (untuk saya / semua) | Balas chat, notifikasi bunyi |
| Rating & komentar produk | Balas / hapus ulasan |
| Tema Otomatis / Terang / Gelap (juga sebelum login) | Edit tampilan beranda, pembayaran, ongkir, voucher |
| Hapus akun sendiri | Printer Bluetooth, ekspor CSV, palet perintah `Ctrl+K` |

## 🗂️ Struktur

```
index.html            cangkang halaman
css/app.css           desain (HP & desktop)
js/
  firebase.js         konfigurasi Firebase + admin utama
  data.js             state, langganan realtime, login, peran admin
  core.js             router, region "live", overlay, event delegation
  customer.js         semua tampilan pelanggan
  admin.js            semua tampilan admin
  chat.js             chat bersama + hapus pesan
  map.js              peta Leaflet/OpenStreetMap, pemilih titik
  printer.js          cetak struk Bluetooth (ESC/POS)
  palette.js          Ctrl+K & Ctrl+B
  ui.js               dialog konfirmasi, tema, pemilih foto
  main.js             boot, routing, notifikasi realtime
vendor/leaflet/       pustaka peta (lokal, tanpa CDN)
sw.js                 service worker (network-first)
firestore.rules       aturan keamanan  ← WAJIB dipublish
```

## 🚀 Pasang

1. **Publish rules** — Firebase Console → `tubi-app` → Firestore Database → **Rules** → tempel isi `firestore.rules` → **Publish**.
2. **Authorized domains** — Authentication → Settings → tambahkan `tubi-opal.vercel.app`.
3. **Deploy** — push isi folder ini ke GitHub (terhubung ke Vercel). Folder `tubi-wa-gateway` **jangan** ikut ke repo.
4. Login `hilmykia@gmail.com` → otomatis ke dashboard. **Produk → Buat katalog awal** bila kosong.
5. **Pengaturan → Cek sistem** untuk menguji semua koneksi.

## 👤 Admin

- **Admin utama** = `hilmykia@gmail.com` (tertulis di `js/firebase.js` dan `firestore.rules`).
- Hanya admin utama yang bisa **menambah/menghapus admin** (Pengaturan → Admin & penerima notifikasi). Admin lain hanya melihat daftar.
- Admin tambahan punya **nama + nomor WhatsApp**; bot mengirim notifikasi ke semua nomor (butuh *update gateway*, lihat di bawah).
- Menghapus admin **langsung mencabut akses**, termasuk saat dashboard masih terbuka maupun setelah refresh.

## ⚙️ Pengaturan (admin) — berkelompok

Di **HP** halaman Pengaturan berupa daftar menu (ketuk satu kelompok untuk membukanya, tombol `‹` untuk kembali). Di **desktop** daftar itu menjadi sub-menu di kiri.

| Kelompok | Isi |
|---|---|
| Toko & biaya | Buka/tutup toko, kontak, jam, ongkir, pajak, voucher |
| Tampilan beranda | Judul, teks, label, dan gambar banner |
| Pembayaran | COD, rekening / e-wallet (dengan tautan pembayaran), QRIS |
| Admin | Admin tambahan + nomor WhatsApp penerima notifikasi |
| WhatsApp Bot | QR, status, notifikasi otomatis |
| Printer Bluetooth | Hubungkan sekali, lalu cetak berulang |
| Sistem & laporan | Cek sistem, laporan masalah pelanggan |

## 🖼️ Foto produk

Produk → Edit → **Tampilan foto di menu**: pilih **Isi bingkai** (ketuk/geser pratinjau untuk menentukan bagian foto yang tampil) atau **Tampil utuh** (seluruh foto terlihat, tidak dipotong). Pratinjau sama persis dengan kartu menu. Tombol **Foto semua tampil utuh** menerapkannya ke semua produk sekaligus.

## 📍 Lokasi & peta

Saat checkout pelanggan bisa **Lokasi saya** (GPS), **mencari alamat/tempat**, atau **menggeser pin / mengetuk peta**; tombol lapisan di pojok peta mengganti ke **citra satelit** supaya pin tepat di rumah. GPS dikumpulkan sampai ±15 m (maks. 15 detik) dan akurasinya ditampilkan. Titik yang ditandai manual diberi label *“ditandai manual”* di sisi admin; GPS yang melebar (>100 m) diberi peringatan agar admin mengecek peta / menghubungi pelanggan.
> Komputer/laptop biasanya tidak punya GPS sehingga lokasinya bisa meleset jauh — geser pin secara manual.

## 💳 Pembayaran

Pengaturan → **Pembayaran**: aktifkan COD, tambahkan **rekening / e-wallet** (nama, nomor + atas nama, dan **tautan pembayaran** opsional, mis. link DANA), dan unggah **QRIS**. Di checkout pelanggan memilih salah satu; setelah menekan *Buat pesanan* ia langsung diarahkan ke **halaman pembayaran** berisi nominal, rekening/nomor (bisa disalin), tombol **Buka halaman pembayaran**, QRIS, dan unggah bukti. Admin melihat metode yang dipilih, menandai **lunas**, dan diberi peringatan bila memproses pesanan transfer yang belum lunas.

## 🖨️ Printer Bluetooth

Pengaturan → **Printer Bluetooth → Hubungkan printer** → pilih printer → **Tes cetak**. Setelah itu tombol *Cetak via printer Bluetooth* muncul di setiap struk.

- Berjalan di **Chrome/Edge** (Android & desktop) lewat HTTPS. Tidak didukung Safari/iOS dan Firefox.
- Mendukung printer thermal **BLE** ESC/POS (58/80 mm). Printer Bluetooth *klasik* (SPP) tidak bisa disambung langsung oleh browser — pakai aplikasi pencetak Android (mis. RawBT) lalu **Cetak lewat browser**.
- Koneksi harus diulang setelah halaman dimuat ulang. Kompatibilitas tiap merek belum bisa saya uji — jika printer tidak terdeteksi, kabari tipe printernya.

## 💬 WhatsApp (Baileys)

**Bot** = nomor WhatsApp yang dihubungkan ke program kecil `tubi-wa-gateway` di komputer/server Anda. Folder itu **jangan dihapus**. QR muncul di Dashboard/Pengaturan saat gateway berjalan (`npm start`). Tubi tetap berfungsi penuh tanpa bot.

**Update gateway (opsional, disarankan):** ganti **hanya** `server.js` di folder `tubi-wa-gateway` dengan `tubi-wa-gateway-update.zip` → `npm start` ulang. Sesi WhatsApp tidak hilang. Hasilnya: notifikasi ke semua admin, tautan peta, dan info pembayaran di pesan pesanan baru.

Tombol *Restart / Putuskan / Kirim tes* **tidak mengirim perintah** bila gateway sedang offline — dashboard akan memberi tahu.

## ⌨️ Pintasan admin

| Tombol | Fungsi |
|---|---|
| `Ctrl` + `K` | Palet perintah: cari halaman, aksi, produk, pesanan |
| `Ctrl` + `B` | Sembunyikan / tampilkan sidebar |
| `Esc` | Tutup jendela |

## 🧯 Troubleshooting

| Gejala | Solusi |
|---|---|
| Banner merah "Firestore menolak akses" | Rules belum dipublish (langkah 1) |
| QR WhatsApp tidak muncul | Gateway belum jalan, rules belum dipublish, atau `serviceAccount.json` bukan project `tubi-app` → **Cek sistem** |
| Login Google "unauthorized domain" | Langkah 2 |
| Tampilan lama masih muncul | Muat ulang keras (Ctrl+Shift+R) sekali |
| Peta kosong / abu-abu | Periksa internet (ubin peta dari OpenStreetMap) & izin lokasi browser |
| Vercel `500 FUNCTION_INVOCATION_FAILED` | Folder gateway ikut ter-deploy; hapus dari repo Vercel |

## 🔐 Keamanan

`firestore.rules` v9 membatasi kolom yang boleh ditulis tiap koleksi, mencegah pelanggan mengubah status/pembayaran orang lain, dan hanya mengizinkan admin utama mengelola daftar admin. **Jangan commit `serviceAccount.json`.**

## 🆕 Perubahan v11

Pengaturan berkelompok (hub di HP) · editor tampilan foto produk (isi bingkai / utuh / titik fokus) · halaman pembayaran dengan rekening, e-wallet + tautan, dan QRIS · GPS lebih akurat + citra satelit + penanda titik manual · tips pintasan hanya di desktop.

## 🆕 Perubahan v9

Peran admin dirombak (admin utama + admin tambahan berizin, pencabutan instan) · dialog konfirmasi bawaan app (tidak lagi diblok browser) · peta titik lokasi · pembayaran COD/Transfer/QRIS · keranjang dengan foto & hapus · Beli sekarang · kategori bebas · editor hero · hapus pesan chat · hapus akun · printer Bluetooth · laporan lebih lengkap + CSV · palet perintah & sidebar tersembunyi · pengaturan tema untuk tamu · tombol & jarak antarmuka dirapikan.
