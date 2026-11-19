# Tubi

Aplikasi pesan jajanan (roti kukus, topokki, cilok, dan lainnya) dari HP. Pelanggan dan admin terhubung realtime.

Live: https://tubi-opal.vercel.app

## Fitur

- Pelanggan: menu dan pencarian, keranjang, titik lokasi di peta, bayar COD atau transfer/QRIS, chat dengan admin, rating produk
- Admin: dashboard pesanan, kelola produk, chat, laporan, ongkir dan voucher, cetak struk lewat printer Bluetooth

## Teknologi

HTML, CSS, JavaScript tanpa bundler, Firebase (Firestore + Auth), peta Leaflet/OpenStreetMap, dan Capacitor untuk versi Android.

## Struktur

```
www/        aplikasi web (dideploy ke Vercel)
android/    proyek Android (Capacitor)
gateway/    bot WhatsApp (Cloudflare Worker + Durable Object)
```

Panduan pasang dan pengaturan lengkap ada di [www/README.md](www/README.md).

## Gateway WhatsApp

Satu nomor WhatsApp yang mengirim kabar pesanan baru dan chat ke admin, serta kabar status pesanan ke pelanggan. Gateway berjalan sebagai Cloudflare Worker dengan satu Durable Object, jadi tidak butuh komputer yang menyala terus.

- Koneksi WhatsApp memakai Baileys. Sesi login disimpan di penyimpanan Durable Object.
- Firestore dibaca lewat REST dengan akun layanan Firebase (rahasia `FIREBASE_SA`).
- Alarm berdetak tiap 30 detik: menjaga koneksi, membaca perintah dari dashboard (`waGateway/command`), mencari pesanan dan chat baru, lalu menulis status ke `waGateway/status`.
- Pesanan baru dikenali dari `createdAt`, perubahan status dari `updatedAt` (diisi aplikasi saat status diubah).

Jalankan di komputer:

```
cd gateway
npm install
npm run dev
```

Simpan kunci akun layanan sebagai satu baris JSON di `gateway/.dev.vars` (tidak ikut Git):

```
FIREBASE_SA='{"type":"service_account",...}'
```

Lalu buka http://localhost:8790/qr untuk memindai QR (halaman ini hanya ada saat lokal; di production QR tampil di Dashboard Admin → Pengaturan → WhatsApp Bot).

Deploy: `npm run deploy` (perintah `cf`), dengan rahasia `FIREBASE_SA` diisi di Cloudflare.
