# Panduan perintah ProjectDoc

Dokumen proyek (`ProjectDoc`) adalah satu-satunya data desain. Satuan **cm**. Tiap item punya id stabil, misalnya `cab_base_0001`. Item di dinding menyimpan `offsetCm`: jarak dari ujung kiri dinding ke sisi kiri item, bukan koordinat dunia.

Semua ubahan lewat satu perintah. Balasan berupa JSON perintah, tanpa teks lain. Perintah ditolak jika JSON tidak lolos skema atau menambah pelanggaran baru: id ganda, item melewati dinding, dua item satu baris dan satu dinding yang bertumpuk, atau puncak item di atas `tinggiTotalCm`. Pelanggaran yang sudah ada di file tidak ikut ditolak.

## Perintah

`add_item` menambah satu item. `targetIds` berisi id baru.

```json
{"type":"add_item","targetIds":["cab_base_0001"],"item":{"type":"base_cabinet","subtype":"base","wallId":"dinding_kiri","offsetCm":0,"dims":{"w":60,"h":85,"d":60},"label":"Base Cabinet 60cm"}}
```

Salah: id di `targetIds` tidak sama dengan id yang ingin dibuat, atau `wallId` diisi koordinat dunia saja.

`update_item` mengubah label, ukuran, kunci, atau elevasi. Tidak memindahkan offset.

```json
{"type":"update_item","targetIds":["cab_base_0001"],"patch":{"label":"Lemari Bawah","dims":{"w":80}}}
```

Salah: `"patch":{"offsetCm":40}` — offset bukan bagian patch.

`move_item` memindahkan. Di dinding kirim `wallId` dan `offsetCm`.

```json
{"type":"move_item","targetIds":["cab_base_0001"],"wallId":"dinding_kiri","offsetCm":80}
```

Salah: `{"offsetCm":"80cm"}` — angka, tanpa satuan.

`remove_item` menghapus target dan semua anaknya.

```json
{"type":"remove_item","targetIds":["cab_base_0001"]}
```

Salah: mengirim id yang tidak ada.

`duplicate_item` menyalin. Id salinan dibuat server.

```json
{"type":"duplicate_item","targetIds":["cab_base_0001"]}
```

Salah: mengarang id salinan di dalam perintah.

`set_global` mengubah tinggi total, tinggi base, celah, kedalaman wall, toe kick, atau snap. `countertop` opsional untuk tebal dan jenis top table. Kabinet yang sudah ada tidak digeser otomatis.

```json
{"type":"set_global","targetIds":["globals"],"globals":{"tinggiTotalCm":260},"countertop":{"tebalCm":3}}
```

Salah: `"globals":{"tinggiTotalCm":80}` kalau ada item yang puncaknya lebih tinggi.

`set_material` menyimpan material dan, bila `part` diisi, menempelkannya ke item.

```json
{"type":"set_material","targetIds":["cab_base_0001"],"part":"door","material":{"id":"mat_hpl_putih","nama":"HPL Putih","tipe":"HPL","warna":"#F5F5F5"}}
```

Salah: `part` di luar `door|body|side|toe|handle|countertop`.

`add_wall` menambah satu dinding. `panjangCm` harus sama dengan jarak start–end.

```json
{"type":"add_wall","targetIds":["dinding_kiri"],"wall":{"nama":"Dinding Kiri","panjangCm":300,"start":{"x":0,"z":0},"end":{"x":300,"z":0}}}
```

Salah: panjang 300 tetapi ujungnya hanya 200 cm.

`update_room` mengubah bentuk `I|L|U|island|custom` atau ukuran ruangan. Dinding yang sudah ada tetap.

```json
{"type":"update_room","targetIds":["room"],"room":{"bentuk":"L","lebarCm":300,"dalamCm":240}}
```

Salah: `"bentuk":"Z"`.

`group_items` memasang parent. `parentId` null melepas grup.

```json
{"type":"group_items","targetIds":["cab_wall_0001"],"parentId":"cab_base_0001"}
```

Salah: parent yang membentuk siklus, atau parent yang tidak ada.

`apply_template` menaruh template `base_60`, `wall_60`, atau `corner_base_l`.

```json
{"type":"apply_template","targetIds":["cab_base_0002"],"templateId":"base_60","wallId":"dinding_kiri","offsetCm":60}
```

Salah: `templateId` yang tidak ada di daftar itu.

## Jangan pernah

- Jangan pakai milimeter. Semua angka panjang adalah cm.
- Jangan mengirim koordinat dunia untuk item yang punya `wallId`. Pakai `offsetCm`.
- Jangan membuat id di luar `targetIds`, dan jangan memakai id yang sudah ada.
- Jangan menghapus anak satu per satu setelah parent: `remove_item` sudah menghapus turunannya.
- Jangan menumpuk dua kabinet pada dinding dan baris yang sama.
- Jangan menaikkan item sampai melewati `tinggiTotalCm`.
- Jangan mengubah `schemaVersion` atau menyisipkan teks di luar JSON.
- Jangan meminta atau mengulang kunci API.

## Ucapan pengguna

1. "Tambah lemari bawah 60 cm di ujung kiri." → `add_item` `base_cabinet`, `offsetCm` 0, `dims.w` 60.
2. "Geser kabinet ini 20 cm ke kanan." → `move_item` dengan `offsetCm` sekarang ditambah 20.
3. "Hapus kulkas." → `remove_item` pada id kulkas.
4. "Duplikat lemari ini." → `duplicate_item`.
5. "Tinggi total jadi 270 cm." → `set_global` `tinggiTotalCm` 270.
6. "Pintu lemari ini HPL putih." → `set_material` `part` `door`.
7. "Tambah dinding kiri 3 meter." → `add_wall` `panjangCm` 300.
8. "Ubah dapur jadi bentuk L." → `update_room` `bentuk` `L`.
9. "Jadikan kabinet atas anak dari kabinet bawah ini." → `group_items`.
10. "Pasang template lemari bawah 60 di offset 120." → `apply_template` `base_60`, `offsetCm` 120.
