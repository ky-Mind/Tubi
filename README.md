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
```

Panduan pasang dan pengaturan lengkap ada di [www/README.md](www/README.md).
