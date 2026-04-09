-- === Intero: FULL SETUP (schema + RLS + bucket + data default) ===
-- Tempel SELURUH file ini di Supabase → SQL Editor → Run

-- Intero CMS: jalankan di Supabase → SQL Editor (satu kali), atau: supabase db push
-- Setelah itu: buat user admin di Authentication, lalu User Metadata (raw): { "role": "admin" }

CREATE TABLE IF NOT EXISTS public.site_settings (
  id text PRIMARY KEY DEFAULT 'site',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text NOT NULL,
  city text NOT NULL,
  need_type text NOT NULL,
  size_estimate text,
  budget_range text,
  notes text,
  reference_path text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_public" ON public.site_settings;
CREATE POLICY "settings_select_public" ON public.site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "settings_insert_admin" ON public.site_settings;
CREATE POLICY "settings_insert_admin" ON public.site_settings
  FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "settings_update_admin" ON public.site_settings;
CREATE POLICY "settings_update_admin" ON public.site_settings
  FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "leads_insert_public" ON public.leads;
CREATE POLICY "leads_insert_public" ON public.leads
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "leads_select_admin" ON public.leads;
CREATE POLICY "leads_select_admin" ON public.leads
  FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "leads_delete_admin" ON public.leads;
CREATE POLICY "leads_delete_admin" ON public.leads
  FOR DELETE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

INSERT INTO storage.buckets (id, name, public)
VALUES ('site-uploads', 'site-uploads', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "site_uploads_select" ON storage.objects;
CREATE POLICY "site_uploads_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'site-uploads');

DROP POLICY IF EXISTS "site_uploads_insert_refs_anon" ON storage.objects;
CREATE POLICY "site_uploads_insert_refs_anon" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'site-uploads'
    AND name LIKE 'refs/%'
  );

DROP POLICY IF EXISTS "site_uploads_insert_admin" ON storage.objects;
CREATE POLICY "site_uploads_insert_admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'site-uploads'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "site_uploads_delete_admin" ON storage.objects;
CREATE POLICY "site_uploads_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'site-uploads'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );


-- --- Seed konten default ---

-- Otomatis dibuat oleh scripts/generate-supabase-seed.ts — jangan edit manual
INSERT INTO public.site_settings (id, data, updated_at)
VALUES (
  'site',
  $intero_site_seed${"version":1,"siteName":"Intero","domain":"","brandColors":{"primary":"#2563eb","navy":"#0f172a","navyDeep":"#020617","gold":"#f59e0b","goldLight":"#fbbf24"},"logoUrl":null,"faviconUrl":null,"fontFamily":"Montserrat","contact":{"whatsapp":"6281234567890","email":"hello@intero.id","address":"Jakarta, Indonesia","phoneDisplay":"+62 8xx xxxx xxxx","instagramHandle":"@intero_interior"},"socialLinks":[{"label":"Instagram","url":"https://instagram.com/intero_interior"}],"seo":{"metaTitle":"Intero - WOCENSA Waterproof Kitchen Set | Investasi Dapur 1x Untuk Selamanya","metaDescription":"Kitchen set waterproof anti rayap — konsultasi gratis, desain 3D, garansi. Intero / Wocensa.","ogImageUrl":null},"tracking":{"facebookPixelId":"","facebookPixelEnabled":false,"googleAnalyticsId":"","events":{"pageView":"PageView","lead":"Lead","contactClick":"Contact"}},"toast":{"enabled":true,"intervalMinSec":25,"intervalMaxSec":45,"names":["Budi","Sari","Hanif","Dewi","Andi","Rina"],"actionTemplates":["{{name}} {{action}} {{product}}"],"actions":["melakukan pemesanan","baru saja konsultasi untuk","mengamankan slot untuk"],"products":["kitchen set anti air","WOCENSA premium","kitchen set waterproof 3D"],"cities":["Jakarta","Tangerang","Bekasi","Depok","Bogor"],"audioUrl":null,"timezone":"Asia/Jakarta","activeHours":{"start":"09:00","end":"21:00"},"maxToastsPerSession":12,"muteDefault":false},"faq":[{"id":"1","question":"Apa bedanya WOCENSA dengan kitchen set kayu biasa?","answer":"WOCENSA memakai material tahan air dan anti rayap sehingga lebih awet di area basah dapur tanpa lapuk."},{"id":"2","question":"Apakah konsultasi dan desain 3D benar-benar gratis?","answer":"Ya, untuk pendaftar melalui website ini tim kami membantu estimasi dan gambar awal secara gratis sesuai promo berlaku."},{"id":"3","question":"Berapa lama proses pengerjaan?","answer":"Tergantung antrian dan luasan proyek; detail jadwal akan dijelaskan admin setelah survei/konsultasi."}],"footer":{"tagline":"Spesialis pembuatan kitchen set waterproof & anti rayap kualitas premium dengan material terbaik untuk investasi jangka panjang hunian Anda.","copyrightLine":"Intero / Wocensa. All rights reserved.","workingHours":"Senin–Sabtu 09:00–18:00 WIB","privacyUrl":"/privacy","termsUrl":"#","privacyPageHtml":"<h1>Kebijakan Privasi</h1><p>Kami menghormati data pribadi Anda. Informasi yang dikirim melalui formulir digunakan hanya untuk menghubungi Anda terkait layanan Intero.</p>","menuLinks":[{"label":"Beranda","href":"#"},{"label":"Solusi","href":"#solusi"},{"label":"Galeri Proyek","href":"#proyek"},{"label":"Promo & Bonus","href":"#bonus"}]},"navbar":{"links":[{"label":"Solusi","href":"#solusi"},{"label":"Proses","href":"#proses"},{"label":"Bonus","href":"#bonus"},{"label":"Proyek","href":"#proyek"}],"ctaLabel":"Konsultasi Gratis"},"leadForm":{"needTypes":["Kitchen set baru full","Renovasi / upgrade","Konsultasi desain dulu","Lainnya"],"budgetRanges":["Di bawah 25jt","25–50jt","50–100jt","Di atas 100jt","Belum tahu"],"dismissRedirectMessage":"Halo, saya dari website Intero. Mohon info lebih lanjut tentang kitchen set / WOCENSA."},"sections":{"hero":{"badge":"Landing Page Intero","titleLine1":"Waterproof","titleAccent":"Kitchen Set","subtitle":"1x buat, pakai selamanya","description":"Kitchen set tahan air = dapur bunda bebas rayap, warna awet, dan gak ribet bersihin.","primaryCta":"KONSULTASI WA","primaryCtaHref":"#harga","secondaryCta":"LIHAT KEUNGGULAN","secondaryCtaHref":"#solusi","youtubeUrl":null,"imageUrl":"https://images.unsplash.com/photo-1556912177-c54030639a6d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80","imageAlt":"Premium Kitchen Set","floatingBadgeTitle":"100% WATERPROOF","floatingBadgeSubtitle":"ANTI LAPUK & RAYAP","videoDisclaimer":"*testimoni asli pelanggan intero","features":[{"icon":"Droplets","text":"Anti Air 100%"},{"icon":"BugOff","text":"Anti Rayap"},{"icon":"Sparkles","text":"Gratis Desain 3D"},{"icon":"Award","text":"Material Premium"}]},"problem":{"eyebrow":"Reality Check","title":"Bayangkan…","intro":"Bunda sudah mengeluarkan puluhan juta rupiah untuk membuat kitchen set impian...","headingHtml":"Lalu akhirnya jadi sarang <br /><span class=\"text-red-600 text-6xl md:text-8xl block mt-2 underline decoration-wavy decoration-red-600/30\">RAYAP</span>","emoji":"😔","body":"Semua ini terjadi karena kitchen set standar tidak tahan air sehingga mudah lembab, mengundang rayap, dan membuat umur penggunaan tidak bertahan lama.","images":["https://images.unsplash.com/photo-1584622650111-993a426fbf0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80","https://images.unsplash.com/photo-1599619351208-3e6c839d782c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"]},"solution":{"id":"solusi","eyebrow":"The Ultimate Solution","title":"Investasi dapur terbaik dengan WOCENSA","quote":"\"Bukan cuma soal dapur, ini soal menjaga ketenangan pikiran Bunda setiap hari.\"","intro":"Kitchen set WOCENSA (Waterproof Kitchen Set) dibuat dari material anti air 100%, artinya:","imageUrl":"https://images.unsplash.com/photo-1556911220-e15b29be8c8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80","badgeText":"100% Terjamin","points":[{"title":"Bebas Lembab & Rayap","desc":"Tak ada lembab, rayap pun enggan mendekat meski di area cuci piring."},{"title":"100% Tahan Air","desc":"Tak lapuk meski terkena cipratan air setiap hari, bahkan jika terendam."},{"title":"Hemat Tenaga","desc":"Mudah dibersihkan karena tidak menyerap air dan minyak."},{"title":"Warna Abadi","desc":"Warna tetap utuh, tak berubah meski dipakai bertahun-tahun."}],"closingQuote":"\"Bayangkan: Bunda masak, cuci piring, atau beres-beres dapur tanpa was-was air netes. Bebas ngomel-ngomelin anak/suami yang suka numpahin air. Wocensa menjaga dapur bunda tetap rapi, kuat, dan elegan — bahkan saat dapur tetangga mulai keropos.\""},"taglineBig":{"line1":"Investasi 1x","line2":"Untuk Selamanya","ctaLabel":"Hubungi Admin Sekarang"},"steps":{"id":"proses","eyebrow":"Proses Kami","title":"Caranya Mudah, Ikuti 5 Step Ini","items":[{"title":"Klik & Hubungi Admin","desc":"Isi data antrian, admin Intero akan membantu memberikan estimasi harga dan spesifikasi yang dibutuhkan.","icon":"MessageCircle"},{"title":"Gambar 3D Arsitek","desc":"Wujudkan warna dan bentuk kitchen set sesuai keinginan Bunda secara GRATIS.","icon":"Layout"},{"title":"Fabrikasi Kitchen Set","desc":"Dikerjakan oleh tim profesional, mulai dari rangka ACP berkualitas hingga finishing yang estetik.","icon":"Hammer"},{"title":"Pengawasan Proyek","desc":"Memastikan pekerjaan sesuai gambar kerja oleh pengawas profesional, terbuka untuk masukan owner.","icon":"Eye"},{"title":"Garansi 1 Bulan","desc":"Bunda tetap tenang meskipun pekerjaan sudah selesai — karena kami tetap bertanggung jawab.","icon":"ShieldCheck"}],"bottomTitle":"Mudah Bukan? Pilih Dapur Estetik Idamanmu","bottomSubtitle":"Biar kami yang buatkan dan Anda fokus lakukan hal lain","bottomCta":"HUBUNGI ADMIN"},"bonus":{"id":"bonus","badge":"Exclusive Bonus","title":"Ini Bonus Yang Akan Bunda Dapatkan!","subtitle":"Jika melakukan pemesanan melalui halaman ini hari ini.","items":[{"title":"KONSULTASI ARSITEK + 3D RENDER","val":"Rp. 1.000.000","icon":"Layout"},{"title":"GRATIS KITCHEN SINK PREMIUM","val":"Rp. 3.000.000","icon":"Gift"},{"title":"GRATIS KOMPOR TANAM 3 TUNGKU","val":"Rp. 1.500.000","icon":"Zap"}],"footnote":"*Seluruh Bonus Diatas Jika Pemesanan > 35jt"},"urgency":{"titleHtml":"Jangan Sampai Menyesal <br /> Tidak Kebagian ya..","redBanner":"Hanya Untuk 10 Orang Tercepat Saja","slotsLine":"Tersisa","slotsNumber":"3","oldPrice":"Rp. 3.500.000","promoPrice":"Rp. 2.900.000","promoBadgeLabel":"Harga promo khusus","warnings":["⚠️ Pendaftaran ini terbatas HANYA UNTUK 10 ORANG SETIAP BULAN!","⚠️ Kami tidak menjamin harga tidak semakin naik karena harga bahan baku.","⚠️ Kami tidak menjamin bonus tetap ada di bulan depan."],"ctaLabel":"Ya, Saya Mau"},"guarantee":{"title":"JAMINAN HARGA TERMURAH","bodyHtml":"Kami menjamin harga kami adalah yang termurah dengan kualitas proses dan hasil yang sangat baik apalagi ditambah bonus langsung yang besar. <br /><span class=\"font-black text-navy-900\">Apabila ada yang bisa memberikan harga yang lebih murah dengan fasilitas, pelayanan, bonus, promo yang sama maka akan kami ganti selisihnya.</span>","footnote":"*S&K Berlaku"},"comparison":{"title":"Kenapa Wocensa Terasa Sangat Murah?","subtitle":"Mari bandingkan investasi Anda dalam jangka panjang","columns":[{"key":"kayu","label":"Kitchen Set Kayu"},{"key":"wocensa","label":"WOCENSA","highlight":true},{"key":"alum","label":"Aluminium Biasa"}],"rows":[{"name":"Harga / m²","values":{"kayu":"± 2,7 jt","wocensa":"Rp. 2.900.000","alum":"± 3,5 jt"}},{"name":"Ketahanan Air","values":{"kayu":"Rawan Lapuk","wocensa":"100% Waterproof","alum":"Tahan Air"}},{"name":"Anti Rayap","values":{"kayu":"Makanan Rayap","wocensa":"Anti Rayap 100%","alum":"Anti Rayap"}},{"name":"Desain Arsitek","values":{"kayu":"Ya","wocensa":"Ya (Gratis)","alum":"Tidak Ada"}},{"name":"Finishing","values":{"kayu":"Premium","wocensa":"Ultra Premium","alum":"Biasa (Kaku)"}},{"name":"Investasi Jangka Panjang","values":{"kayu":"Sangat Beresiko","wocensa":"Sangat Aman","alum":"Aman"}}],"cards":[{"icon":"X","title":"Kayu Multiplek","text":"Terlihat murah di awal, tapi berisiko biaya bongkar pasang ulang saat rayap menyerang.","color":"text-red-500"},{"icon":"HelpCircle","title":"Aluminium Murah","text":"Memang awet, tapi kurang estetik & terasa kaku seperti di perkantoran.","color":"text-amber-500"},{"icon":"Check","title":"WOCENSA","text":"Titik paling ideal: Awet + Estetik + Tanpa Bongkar Ulang Seumur Hidup.","color":"text-green-500"}]},"productDetails":{"eyebrow":"Product Insight","titleHtml":"Wocensa – Sekuat Baja, <br /><span class=\"text-gold-400 italic font-serif\">Semewah Kayu</span>","paragraphs":["Bayangkan kitchen set yang tampilannya mewah elegan seperti kayu multiplek, tapi tidak takut air, tidak lapuk, dan tidak disukai rayap.","Itulah <span class=\"text-white font-black\">WOCENSA</span>: pilihan cerdas bagi yang ingin dapur cantik tanpa drama keropos dan bongkar ulang.","Dibuat dengan bahan <span class=\"text-gold-400 font-bold\">Aluminium Composite</span>: material waterproof dan anti-rayap yang dirancang untuk tahan dalam segala cuaca dapur — dari uap, tumpahan air, hingga lembab.","Soal harga? Beda tipis dari kayu biasa, tapi puasnya terasa setiap tahun. Sementara dapur lain mulai keropos, WOCENSA tetap gagah, tetap anggun."],"quoteHtml":"\"Yang benar-benar berkelas adalah: <br />yang awet di dalam, indah di luar.\"","images":["https://images.unsplash.com/photo-1556912167-f556f1f39fdf?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80","https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80","https://images.unsplash.com/photo-1556912173-3bb406ef7e77?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80","https://images.unsplash.com/photo-1556911220-e15b29be8c8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"]},"gallery":{"id":"proyek","eyebrow":"Our Portfolio","title":"Project Selesai","projects":[{"title":"Modern Minimalist","area":"Jakarta Selatan","img":"https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80","videoUrl":null,"visible":true},{"title":"Elegant Grey","area":"Tangerang","img":"https://images.unsplash.com/photo-1556912177-c54030639a6d?auto=format&fit=crop&w=800&q=80","videoUrl":null,"visible":true},{"title":"Luxury White","area":"Bekasi","img":"https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=800&q=80","videoUrl":null,"visible":true},{"title":"Industrial Gold","area":"Depok","img":"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80","videoUrl":null,"visible":true},{"title":"Classic Wood Look","area":"Jakarta Pusat","img":"https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=800&q=80","videoUrl":null,"visible":true},{"title":"Compact Suite","area":"Bogor","img":"https://images.unsplash.com/photo-1556909190-7336338e55e5?auto=format&fit=crop&w=800&q=80","videoUrl":null,"visible":true}]},"whyNow":{"titleHtml":"Jangan Menyesal Tidak <br /> Menghubungi Sekarang","cards":[{"title":"Harga Bahan Naik","text":"Harga bahan baku Aluminium Composite terus meningkat, harga produksi akan semakin mahal bulan depan."},{"title":"Bonus Terbatas","text":"Katalog bonus (Kompor, Sink, Arsitek) hanya tersedia untuk pendaftar minggu ini."},{"title":"Antrian Panjang","text":"Semakin lama menunda, antrian pengerjaan akan semakin panjang. Amankan jadwal Bunda sekarang."}]},"finalCta":{"title":"Amankan Slot Anda Sekarang","subtitle":"Konsultasikan kebutuhan kitchen set waterproof Bunda bersama tim Intero sekarang juga sebelum slot habis.","ctaLabel":"CHAT WHATSAPP SEKARANG","perkLine":"Gratis konsultasi + estimasi + desain awal","slotsBadge":"Tersisa 3 slot bulan ini!"},"stickyCta":{"topLine":"Konsultasi Gratis","mainLine":"Chat Admin Sekarang"}}}$intero_site_seed$::jsonb,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  data = EXCLUDED.data,
  updated_at = now();
