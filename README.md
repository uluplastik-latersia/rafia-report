# 📦 STOK RAFIA UPL - Progressive Web App (PWA)

## 📖 Ringkasan Proyek
**STOK RAFIA UPL** adalah sistem pencatatan produksi (inbound), manajemen inventaris, dan penjualan (outbound) tali rafia yang dirancang khusus untuk operasional pabrik. Aplikasi ini dibangun sebagai *Progressive Web App* (PWA) agar ringan, dapat diakses via peramban HP layaknya aplikasi *native*, dan ramah bagi pengguna awam. 

## 🛠 Spesifikasi Teknologi
- **Frontend/Backend:** Next.js / Vite + React (Deploy via Vercel)
- **Database:** Turso (libSQL/SQLite Edge Database)
- **Fokus Arsitektur:** Konsumsi *runtime* yang sangat rendah (*free-tier friendly*) dengan memaksimalkan tabel statis untuk perhitungan global.

## 👥 Aktor & Pengguna
1. **Admin / Penimbang:** Mengoperasikan aplikasi, membuka/menutup shift, input data produksi, waste, dan mencatat pengeluaran barang (sales).
2. **Operator Mesin:** 24 karyawan yang terbagi dalam 2 shift (12 orang/shift). 7 orang per shift bertugas sebagai penanggung jawab mesin (Mesin 1-7). Data mereka menjadi referensi kode pada *roll* rafia.

## ⚙️ Fitur & Alur Bisnis (Business Flow)

### A. Manajemen Produksi (Inbound)
1. **Sistem Sesi Terbuka (Shift System):**
   - Mendeteksi jam secara otomatis saat sesi dibuka. Sesi 1 (07:00 - 19:00) dan Sesi 2 (19:00 - 07:00).
   - Selama sesi terbuka, Admin dapat mencicil input data.
2. **Pencatatan Hasil Mesin:**
   - Input: Berat *roll* (kg) dan Pemilihan Nama Operator (via Dropdown/List).
   - Auto-Generate Kode Roll: Format `[3 Huruf Random]-[Berat]-[Kode Operator]` (Contoh: `YSX-68.9-RA`).
   - Fitur koreksi: Admin dapat mengedit/menghapus *roll* jika terjadi *typo* sebelum sesi ditutup.
3. **Pencatatan Barang Gagal (Waste):**
   - **Per Mesin:** Afalan (kg) dan Prongkalan (kg) diinput secara terpisah.
   - **Global (Satu Shift):** Sapuan (kg) diinput sebagai total keseluruhan mesin.
4. **Pencatatan Bahan Baku:**
   - Input jumlah karung "Sablon A" (sistem otomatis mengalikan dengan 25.25 kg).
   - Input sisa stok "PP Hijau Muda" (kg).
5. **Penutupan Sesi & Laporan:**
   - Sistem mengakumulasi semua data, memperbarui Stok Global dan HR bulanan.
   - Sistem membuat teks Laporan WhatsApp secara otomatis untuk langsung disalin (Format telah disesuaikan dengan standar *company*).

### B. Manajemen Penjualan (Outbound / Stock Out)
1. **Pencarian & Penambahan ke List:**
   - Admin mencari *roll* yang akan dijual menggunakan fitur *Search* (berdasarkan Kode Roll, Nama Operator, atau Berat).
   - *Roll* ditambahkan ke *Cart/List* penjualan.
2. **Pencatatan Detail Surat Jalan:**
   - Input metadata: Nama PIC, Nama Pembeli, Nopol Kendaraan, Tanggal, dan Jam Keluar.
3. **Logika Pemotongan Stok:**
   - Setelah *submit*, status *roll* berubah menjadi `SOLD` dan otomatis mengurangi angka *Stok Rafia Global*.
4. **Fitur Edit Penjualan:**
   - Riwayat penjualan dapat diedit. Jika ada *roll* yang dibatalkan atau salah *input*, *roll* tersebut otomatis kembali ke status `IN_STOCK` di gudang.

### C. Logika Sistem & Perhitungan
- **Stok Rafia:** `[Stok Sebelumnya] + [Total Hasil Shift] - [Total Penjualan]`
- **Persentase Penyusutan Afalan:** `(Afalan + Prongkalan + Sapuan) / (Total Hasil Rafia Shift + Total Waste) x 100%`
- **HR (Hasil Rafia):** Akumulasi bulanan produksi (bisa di-reset ke 0 saat tutup/buka buku setiap bulannya).