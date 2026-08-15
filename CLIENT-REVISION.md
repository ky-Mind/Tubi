# Tubi v4 — Client Revision

Perubahan utama:
- Kategori katalog diganti menjadi kategori berbasis rasa/karakter: Pedas, Manis, Gurih, Sambal, Creamy, Segar.
- Smart search: pencarian mencocokkan nama, deskripsi, kategori, dan tag rasa lalu mengurutkan hasil berdasarkan kemiripan.
- Form admin produk mendukung tag rasa/pencarian selain nama, harga, kategori, rating, deskripsi, dan foto.
- CRUD produk tetap tersinkron melalui Firestore.
- Foto produk memakai fallback yang aman jika asset tidak tersedia.
- Dark mode dipoles untuk menjaga kontras teks, placeholder, card, kategori, dan form.
- Responsive layout dipertahankan untuk mobile, tablet, dan desktop.
- Google login dan admin utama tetap Hilmykia@gmail.com.
- Firestore rules mempertahankan pemisahan akses customer/admin.
- Deployment Vercel tetap static sehingga tidak membutuhkan proses Vite saat deployment.

Catatan:
Smart search di versi ini berjalan lokal di browser dan tidak membutuhkan API AI berbayar. Ini sengaja dibuat stabil terlebih dahulu. Integrasi model AI eksternal bisa ditambahkan kemudian tanpa mengubah alur katalog.
