# Progress 3D Intero

Ingatan jangka panjang. Perbarui setiap langkah selesai.
Status: `belum` | `sedang` | `selesai` | `menunggu persetujuan` | `dilewati`.

| # | Langkah | Status |
| --- | --- | --- |
| 1 | Audit & peta kode (`docs/CODEMAP.md`) | selesai |
| 2 | ProjectDoc + Command engine | selesai |
| 3 | AI Gateway + router tingkat kesulitan | belum |
| 4 | Popup chat awal + wizard + suara | belum |
| 5 | Klik komponen jadi konteks AI | belum |
| 6 | Audit UI/UX & matematika (hanya laporan) | belum |
| 7 | Mode Simple vs Advanced [GERBANG] | belum |
| 8 | Mode Produksi [GERBANG] | belum |
| 9 | Super Admin | belum |
| 10 | Rencana render realistis AI | belum |
| 11 | Mobile UX redesign | sedang |

Catatan langkah 11: Tahap 1 selesai di `docs/MOBILE_AUDIT.md` (18 temuan, tanpa ubah kode). Tahap 2 spesifikasi di `docs/MOBILE_SPEC.md`, menunggu `setuju` sebelum implementasi. UI lama tetap sampai flag `mobile_ux_v2`.

Catatan langkah 1: aplikasi yang cocok dengan screenshot adalah `3d-intero-app/` (deploy default `3d.intero.id`). Ada pohon kedua `3D Intero/` yang tidak ikut `npm run build`. Detail di `docs/CODEMAP.md`.

Catatan langkah 2: skema, perintah, invariant, undo command log, autosave ProjectDoc, scene dari dokumen, `docs/AI_GUIDE.md`, dan panel Struktur Proyek. 22 tes lulus. Flag `projectdoc_v1` tetap mati; nyalakan dengan `localStorage.setItem('projectdoc_v1','1')`. Asumsi: satuan cm, rumus editor hidup, diff share tidak disentuh. Pelanggaran yang sudah ada di file tidak memblokir perintah berikutnya; pelanggaran baru tetap ditolak.
