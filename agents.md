# AGENTS.md: Aturan Proyek 3D Intero

Dokumen ini dibaca otomatis oleh Cursor dan agent AI lain. Ikuti semua aturan di bawah pada setiap tugas.

## Tentang produk

3D Intero (3d.intero.id) adalah aplikasi web 3D instan untuk desain furniture dan kitchen set, ditujukan menggantikan SketchUp, AutoCAD, dan Excel bagi tukang, kontraktor, dan desainer furniture custom di Indonesia. Prinsip utama: sesederhana mungkin; AI mengerjakan pekerjaan berat, user cukup bicara atau klik.

Mode aplikasi: **Simple** (chat AI, orbit/zoom, klik objek), **Advanced** (edit manual penuh), **Produksi** (cut list, nesting, RAB).

## Aturan wajib

### Bahasa dan satuan
- Bahasa UI: Indonesia. Nama variabel, fungsi, dan komentar kode: Inggris.
- Satuan internal: **cm** dan derajat. Ikuti konvensi sumbu yang sudah ada di kode; jangan diubah.
- Teks yang ditampilkan ke user selalu menyebut satuan (cm atau m).

### Arsitektur
- **Single source of truth:** satu dokumen JSON bernama `ProjectDoc`. UI, 3D, produksi, dan AI membaca dan menulis hanya lewat **Command**. Dilarang mengubah state proyek langsung dari komponen UI.
- **AI memutuskan apa, kode memutuskan angka.** AI tidak pernah menulis koordinat, mesh, atau angka turunan (harga, luas, jumlah lembar). AI hanya mengeluarkan Command JSON; engine deterministik yang menghitung.
- Setiap Command divalidasi dengan **Zod** sebelum dieksekusi. Jika gagal, tolak seluruhnya dengan pesan jelas berbahasa Indonesia. Jangan pernah mengeksekusi sebagian.
- Setelah setiap Command, jalankan validator invariants (tidak ada tabrakan, item tidak melebihi panjang dinding, tinggi tidak melampaui batas global, id unik).
- Semua perubahan harus bisa di-undo/redo dari command log.
- Angka di mode Produksi harus berasal dari `ProjectDoc`, bukan dihitung ulang secara terpisah.
- ID item stabil dan ringkas, contoh: `cab_base_0001`.

### AI dan API
- Provider model: OpenRouter. Model gratis untuk perintah mudah, model berbayar untuk perintah sulit.
- **Jangan hardcode API key atau nama model.** Baca dari env atau konfigurasi database. API key tidak boleh sampai ke bundle klien.
- Model gratis belum tentu mendukung structured output. Selalu gunakan: instruksi "JSON only", parser toleran, auto-repair satu kali, validasi Zod.
- Router tingkat kesulitan: T0 lokal (tanpa LLM), T1 mudah (model gratis), T2 sedang, T3 sulit (model terkuat). Jika output gagal validasi dua kali, naikkan satu tier (maksimal 2 eskalasi).
- Untuk T1/T2 kirim ringkasan dan item terkait saja, bukan seluruh `ProjectDoc`.
- Konteks klik: objek yang dipilih user otomatis menjadi konteks (ID dikirim ke AI). Jika perintah ambigu, AI bertanya dan menyorot kandidat di viewport, bukan menebak.

### Cara bekerja
- **Jangan rewrite besar.** Lakukan perubahan inkremental di balik feature flag. Jangan hapus fitur yang sudah berjalan.
- Setiap logika matematika baru wajib punya unit test (pakai test runner yang sudah ada di proyek; jika belum ada, usulkan vitest).
- Sebelum menulis kode: tulis rencana singkat dan daftar file yang akan disentuh. Tanya paling banyak 5 pertanyaan, hanya jika benar-benar ambigu.
- Ubah hanya file yang sudah kamu daftarkan di rencana. Jika perlu menyentuh file lain, sebutkan alasannya dulu.
- Jangan berasumsi stack atau struktur. Baca kode lebih dulu; tulis "tidak ditemukan" bila memang tidak ada.

### Format akhir setiap tugas
Akhiri dengan empat bagian ini:
1. Ringkasan perubahan
2. Daftar file yang diubah
3. Cara menguji (perintah test dan langkah manual)
4. Risiko tersisa

## Dokumen rujukan (jika ada di repo)
- `docs/CODEMAP.md`: peta kode dan stack nyata
- `docs/AI_GUIDE.md`: panduan skema dan Command untuk model AI
- `docs/AUDIT.md`: temuan audit UI/UX dan matematika
- `docs/RENDER_PLAN.md`: rencana render realistis AI