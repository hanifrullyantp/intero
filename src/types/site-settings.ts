/**
 * Shared site/CMS model — keep in sync with server seed & admin forms.
 */

export type StepIconName =
  | "MessageCircle"
  | "Layout"
  | "Hammer"
  | "Eye"
  | "ShieldCheck";

export interface SiteSettings {
  version: 1;
  siteName: string;
  domain: string;
  brandColors: {
    primary: string;
    navy: string;
    navyDeep: string;
    gold: string;
    goldLight: string;
  };
  logoUrl: string | null;
  faviconUrl: string | null;
  fontFamily: string | null;
  contact: {
    whatsapp: string;
    email: string;
    address: string;
    phoneDisplay: string;
    instagramHandle: string;
  };
  socialLinks: { label: string; url: string }[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogImageUrl: string | null;
  };
  tracking: {
    facebookPixelId: string;
    facebookPixelEnabled: boolean;
    googleAnalyticsId: string;
    events: { pageView: string; lead: string; contactClick: string };
  };
  toast: {
    enabled: boolean;
    intervalMinSec: number;
    intervalMaxSec: number;
    names: string[];
    actionTemplates: string[];
    actions: string[];
    products: string[];
    cities: string[];
    audioUrl: string | null;
    timezone: string;
    activeHours: { start: string; end: string };
    maxToastsPerSession: number;
    muteDefault: boolean;
  };
  faq: { id: string; question: string; answer: string }[];
  footer: {
    tagline: string;
    copyrightLine: string;
    workingHours: string;
    privacyUrl: string;
    termsUrl: string;
    privacyPageHtml: string;
    menuLinks: { label: string; href: string }[];
  };
  navbar: {
    links: { label: string; href: string }[];
    ctaLabel: string;
  };
  leadForm: {
    needTypes: string[];
    budgetRanges: string[];
  };
  sections: LandingSections;
}

export interface HeroFeature {
  icon: "Droplets" | "BugOff" | "Sparkles" | "Award";
  text: string;
}

export interface LandingSections {
  hero: {
    badge: string;
    titleLine1: string;
    titleAccent: string;
    subtitle: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    secondaryCtaHref: string;
    imageUrl: string;
    imageAlt: string;
    floatingBadgeTitle: string;
    floatingBadgeSubtitle: string;
    features: HeroFeature[];
  };
  problem: {
    eyebrow: string;
    title: string;
    intro: string;
    headingHtml: string;
    emoji: string;
    body: string;
    images: string[];
  };
  solution: {
    id: string;
    eyebrow: string;
    title: string;
    quote: string;
    intro: string;
    imageUrl: string;
    badgeText: string;
    points: { title: string; desc: string }[];
    closingQuote: string;
  };
  taglineBig: {
    line1: string;
    line2: string;
    ctaLabel: string;
  };
  steps: {
    id: string;
    eyebrow: string;
    title: string;
    items: { title: string; desc: string; icon: StepIconName }[];
    bottomTitle: string;
    bottomSubtitle: string;
    bottomCta: string;
  };
  bonus: {
    id: string;
    badge: string;
    title: string;
    subtitle: string;
    items: { title: string; val: string; icon: "Layout" | "Gift" | "Zap" }[];
    footnote: string;
  };
  urgency: {
    titleHtml: string;
    redBanner: string;
    slotsLine: string;
    slotsNumber: string;
    oldPrice: string;
    promoPrice: string;
    warnings: string[];
    ctaLabel: string;
  };
  guarantee: {
    title: string;
    bodyHtml: string;
    footnote: string;
  };
  comparison: {
    title: string;
    subtitle: string;
    columns: { key: string; label: string; highlight?: boolean }[];
    rows: { name: string; values: Record<string, string> }[];
    cards: { icon: "X" | "HelpCircle" | "Check"; title: string; text: string; color: string }[];
  };
  productDetails: {
    eyebrow: string;
    titleHtml: string;
    paragraphs: string[];
    quoteHtml: string;
    images: string[];
  };
  gallery: {
    id: string;
    eyebrow: string;
    title: string;
    projects: { title: string; area: string; img: string }[];
  };
  whyNow: {
    titleHtml: string;
    cards: { title: string; text: string }[];
  };
  finalCta: {
    title: string;
    subtitle: string;
    ctaLabel: string;
    perkLine: string;
    slotsBadge: string;
  };
  stickyCta: {
    topLine: string;
    mainLine: string;
  };
}

/** Validasi JSON dari DB Supabase / API */
export function normalizeSiteSettings(raw: unknown): SiteSettings {
  const s = raw as Partial<SiteSettings> | null;
  if (
    s &&
    s.version === 1 &&
    s.sections &&
    typeof s.sections === "object" &&
    s.sections.hero
  ) {
    return s as SiteSettings;
  }
  return getDefaultSiteSettings();
}

export function getDefaultSiteSettings(): SiteSettings {
  return {
    version: 1,
    siteName: "Intero",
    domain: "",
    brandColors: {
      primary: "#2563eb",
      navy: "#0f172a",
      navyDeep: "#020617",
      gold: "#f59e0b",
      goldLight: "#fbbf24",
    },
    logoUrl: null,
    faviconUrl: null,
    fontFamily: null,
    contact: {
      whatsapp: "6281234567890",
      email: "hello@intero.id",
      address: "Jakarta, Indonesia",
      phoneDisplay: "+62 8xx xxxx xxxx",
      instagramHandle: "@intero_interior",
    },
    socialLinks: [
      { label: "Instagram", url: "https://instagram.com/intero_interior" },
    ],
    seo: {
      metaTitle:
        "Intero - WOCENSA Waterproof Kitchen Set | Investasi Dapur 1x Untuk Selamanya",
      metaDescription:
        "Kitchen set waterproof anti rayap — konsultasi gratis, desain 3D, garansi. Intero / Wocensa.",
      ogImageUrl: null,
    },
    tracking: {
      facebookPixelId: "",
      facebookPixelEnabled: false,
      googleAnalyticsId: "",
      events: { pageView: "PageView", lead: "Lead", contactClick: "Contact" },
    },
    toast: {
      enabled: true,
      intervalMinSec: 25,
      intervalMaxSec: 45,
      names: ["Budi", "Sari", "Hanif", "Dewi", "Andi", "Rina"],
      actionTemplates: ["{{name}} {{action}} {{product}}"],
      actions: [
        "melakukan pemesanan",
        "baru saja konsultasi untuk",
        "mengamankan slot untuk",
      ],
      products: [
        "kitchen set anti air",
        "WOCENSA premium",
        "kitchen set waterproof 3D",
      ],
      cities: ["Jakarta", "Tangerang", "Bekasi", "Depok", "Bogor"],
      audioUrl: null,
      timezone: "Asia/Jakarta",
      activeHours: { start: "09:00", end: "21:00" },
      maxToastsPerSession: 12,
      muteDefault: false,
    },
    faq: [
      {
        id: "1",
        question: "Apa bedanya WOCENSA dengan kitchen set kayu biasa?",
        answer:
          "WOCENSA memakai material tahan air dan anti rayap sehingga lebih awet di area basah dapur tanpa lapuk.",
      },
      {
        id: "2",
        question: "Apakah konsultasi dan desain 3D benar-benar gratis?",
        answer:
          "Ya, untuk pendaftar melalui website ini tim kami membantu estimasi dan gambar awal secara gratis sesuai promo berlaku.",
      },
      {
        id: "3",
        question: "Berapa lama proses pengerjaan?",
        answer:
          "Tergantung antrian dan luasan proyek; detail jadwal akan dijelaskan admin setelah survei/konsultasi.",
      },
    ],
    footer: {
      tagline:
        "Spesialis pembuatan kitchen set waterproof & anti rayap kualitas premium dengan material terbaik untuk investasi jangka panjang hunian Anda.",
      copyrightLine: "Intero / Wocensa. All rights reserved.",
      workingHours: "Senin–Sabtu 09:00–18:00 WIB",
      privacyUrl: "/privacy",
      termsUrl: "#",
      privacyPageHtml:
        "<h1>Kebijakan Privasi</h1><p>Kami menghormati data pribadi Anda. Informasi yang dikirim melalui formulir digunakan hanya untuk menghubungi Anda terkait layanan Intero.</p>",
      menuLinks: [
        { label: "Beranda", href: "#" },
        { label: "Solusi", href: "#solusi" },
        { label: "Galeri Proyek", href: "#proyek" },
        { label: "Promo & Bonus", href: "#bonus" },
      ],
    },
    navbar: {
      links: [
        { label: "Solusi", href: "#solusi" },
        { label: "Proses", href: "#proses" },
        { label: "Bonus", href: "#bonus" },
        { label: "Proyek", href: "#proyek" },
      ],
      ctaLabel: "Konsultasi Gratis",
    },
    leadForm: {
      needTypes: [
        "Kitchen set baru full",
        "Renovasi / upgrade",
        "Konsultasi desain dulu",
        "Lainnya",
      ],
      budgetRanges: [
        "Di bawah 25jt",
        "25–50jt",
        "50–100jt",
        "Di atas 100jt",
        "Belum tahu",
      ],
    },
    sections: {
      hero: {
        badge: "Landing Page Intero",
        titleLine1: "Waterproof",
        titleAccent: "Kitchen Set",
        subtitle: "1x buat, pakai selamanya",
        description:
          "Kitchen set tahan air = dapur bunda bebas rayap, warna awet, dan gak ribet bersihin.",
        primaryCta: "KONSULTASI WA",
        secondaryCta: "LIHAT KEUNGGULAN",
        secondaryCtaHref: "#solusi",
        imageUrl:
          "https://images.unsplash.com/photo-1556912177-c54030639a6d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        imageAlt: "Premium Kitchen Set",
        floatingBadgeTitle: "100% WATERPROOF",
        floatingBadgeSubtitle: "ANTI LAPUK & RAYAP",
        features: [
          { icon: "Droplets", text: "Anti Air 100%" },
          { icon: "BugOff", text: "Anti Rayap" },
          { icon: "Sparkles", text: "Gratis Desain 3D" },
          { icon: "Award", text: "Material Premium" },
        ],
      },
      problem: {
        eyebrow: "Reality Check",
        title: "Bayangkan…",
        intro:
          "Bunda sudah mengeluarkan puluhan juta rupiah untuk membuat kitchen set impian...",
        headingHtml:
          'Lalu akhirnya jadi sarang <br /><span class="text-red-600 text-6xl md:text-8xl block mt-2 underline decoration-wavy decoration-red-600/30">RAYAP</span>',
        emoji: "😔",
        body: "Semua ini terjadi karena kitchen set standar tidak tahan air sehingga mudah lembab, mengundang rayap, dan membuat umur penggunaan tidak bertahan lama.",
        images: [
          "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
          "https://images.unsplash.com/photo-1599619351208-3e6c839d782c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
        ],
      },
      solution: {
        id: "solusi",
        eyebrow: "The Ultimate Solution",
        title: "Investasi dapur terbaik dengan WOCENSA",
        quote:
          '"Bukan cuma soal dapur, ini soal menjaga ketenangan pikiran Bunda setiap hari."',
        intro:
          "Kitchen set WOCENSA (Waterproof Kitchen Set) dibuat dari material anti air 100%, artinya:",
        imageUrl:
          "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        badgeText: "100% Terjamin",
        points: [
          {
            title: "Bebas Lembab & Rayap",
            desc: "Tak ada lembab, rayap pun enggan mendekat meski di area cuci piring.",
          },
          {
            title: "100% Tahan Air",
            desc: "Tak lapuk meski terkena cipratan air setiap hari, bahkan jika terendam.",
          },
          {
            title: "Hemat Tenaga",
            desc: "Mudah dibersihkan karena tidak menyerap air dan minyak.",
          },
          {
            title: "Warna Abadi",
            desc: "Warna tetap utuh, tak berubah meski dipakai bertahun-tahun.",
          },
        ],
        closingQuote:
          '"Bayangkan: Bunda masak, cuci piring, atau beres-beres dapur tanpa was-was air netes. Bebas ngomel-ngomelin anak/suami yang suka numpahin air. Wocensa menjaga dapur bunda tetap rapi, kuat, dan elegan — bahkan saat dapur tetangga mulai keropos."',
      },
      taglineBig: {
        line1: "Investasi 1x",
        line2: "Untuk Selamanya",
        ctaLabel: "Hubungi Admin Sekarang",
      },
      steps: {
        id: "proses",
        eyebrow: "Proses Kami",
        title: "Caranya Mudah, Ikuti 5 Step Ini",
        items: [
          {
            title: "Klik & Hubungi Admin",
            desc: "Isi data antrian, admin Intero akan membantu memberikan estimasi harga dan spesifikasi yang dibutuhkan.",
            icon: "MessageCircle",
          },
          {
            title: "Gambar 3D Arsitek",
            desc: "Wujudkan warna dan bentuk kitchen set sesuai keinginan Bunda secara GRATIS.",
            icon: "Layout",
          },
          {
            title: "Fabrikasi Kitchen Set",
            desc: "Dikerjakan oleh tim profesional, mulai dari rangka ACP berkualitas hingga finishing yang estetik.",
            icon: "Hammer",
          },
          {
            title: "Pengawasan Proyek",
            desc: "Memastikan pekerjaan sesuai gambar kerja oleh pengawas profesional, terbuka untuk masukan owner.",
            icon: "Eye",
          },
          {
            title: "Garansi 1 Bulan",
            desc: "Bunda tetap tenang meskipun pekerjaan sudah selesai — karena kami tetap bertanggung jawab.",
            icon: "ShieldCheck",
          },
        ],
        bottomTitle: "Mudah Bukan? Pilih Dapur Estetik Idamanmu",
        bottomSubtitle: "Biar kami yang buatkan dan Anda fokus lakukan hal lain",
        bottomCta: "HUBUNGI ADMIN",
      },
      bonus: {
        id: "bonus",
        badge: "Exclusive Bonus",
        title: "Ini Bonus Yang Akan Bunda Dapatkan!",
        subtitle: "Jika melakukan pemesanan melalui halaman ini hari ini.",
        items: [
          {
            title: "KONSULTASI ARSITEK + 3D RENDER",
            val: "Rp. 1.000.000",
            icon: "Layout",
          },
          {
            title: "GRATIS KITCHEN SINK PREMIUM",
            val: "Rp. 3.000.000",
            icon: "Gift",
          },
          {
            title: "GRATIS KOMPOR TANAM 3 TUNGKU",
            val: "Rp. 1.500.000",
            icon: "Zap",
          },
        ],
        footnote: "*Seluruh Bonus Diatas Jika Pemesanan > 35jt",
      },
      urgency: {
        titleHtml:
          "Jangan Sampai Menyesal <br /> Tidak Kebagian ya..",
        redBanner: "Hanya Untuk 10 Orang Tercepat Saja",
        slotsLine: "Tersisa",
        slotsNumber: "3",
        oldPrice: "Rp 3.800.000/m",
        promoPrice: "3,5 jt/m",
        warnings: [
          "⚠️ Pendaftaran ini terbatas HANYA UNTUK 10 ORANG SETIAP BULAN!",
          "⚠️ Kami tidak menjamin harga tidak semakin naik karena harga bahan baku.",
          "⚠️ Kami tidak menjamin bonus tetap ada di bulan depan.",
        ],
        ctaLabel: "KLAIM PROMO SEKARANG",
      },
      guarantee: {
        title: "JAMINAN HARGA TERMURAH",
        bodyHtml:
          'Kami menjamin harga kami adalah yang termurah dengan kualitas proses dan hasil yang sangat baik apalagi ditambah bonus langsung yang besar. <br /><span class="font-black text-navy-900">Apabila ada yang bisa memberikan harga yang lebih murah dengan fasilitas, pelayanan, bonus, promo yang sama maka akan kami ganti selisihnya.</span>',
        footnote: "*S&K Berlaku",
      },
      comparison: {
        title: "Kenapa Wocensa Terasa Sangat Murah?",
        subtitle: "Mari bandingkan investasi Anda dalam jangka panjang",
        columns: [
          { key: "kayu", label: "Kitchen Set Kayu" },
          { key: "wocensa", label: "WOCENSA", highlight: true },
          { key: "alum", label: "Aluminium Biasa" },
        ],
        rows: [
          {
            name: "Harga / m²",
            values: { kayu: "± 2,7 jt", wocensa: "± 3,5 jt", alum: "± 3,5 jt" },
          },
          {
            name: "Ketahanan Air",
            values: {
              kayu: "Rawan Lapuk",
              wocensa: "100% Waterproof",
              alum: "Tahan Air",
            },
          },
          {
            name: "Anti Rayap",
            values: {
              kayu: "Makanan Rayap",
              wocensa: "Anti Rayap 100%",
              alum: "Anti Rayap",
            },
          },
          {
            name: "Desain Arsitek",
            values: { kayu: "Ya", wocensa: "Ya (Gratis)", alum: "Tidak Ada" },
          },
          {
            name: "Finishing",
            values: {
              kayu: "Premium",
              wocensa: "Ultra Premium",
              alum: "Biasa (Kaku)",
            },
          },
          {
            name: "Investasi Jangka Panjang",
            values: {
              kayu: "Sangat Beresiko",
              wocensa: "Sangat Aman",
              alum: "Aman",
            },
          },
        ],
        cards: [
          {
            icon: "X",
            title: "Kayu Multiplek",
            text: "Terlihat murah di awal, tapi berisiko biaya bongkar pasang ulang saat rayap menyerang.",
            color: "text-red-500",
          },
          {
            icon: "HelpCircle",
            title: "Aluminium Murah",
            text: "Memang awet, tapi kurang estetik & terasa kaku seperti di perkantoran.",
            color: "text-amber-500",
          },
          {
            icon: "Check",
            title: "WOCENSA",
            text: "Titik paling ideal: Awet + Estetik + Tanpa Bongkar Ulang Seumur Hidup.",
            color: "text-green-500",
          },
        ],
      },
      productDetails: {
        eyebrow: "Product Insight",
        titleHtml:
          'Wocensa – Sekuat Baja, <br /><span class="text-gold-400 italic font-serif">Semewah Kayu</span>',
        paragraphs: [
          "Bayangkan kitchen set yang tampilannya mewah elegan seperti kayu multiplek, tapi tidak takut air, tidak lapuk, dan tidak disukai rayap.",
          'Itulah <span class="text-white font-black">WOCENSA</span>: pilihan cerdas bagi yang ingin dapur cantik tanpa drama keropos dan bongkar ulang.',
          'Dibuat dengan bahan <span class="text-gold-400 font-bold">Aluminium Composite</span>: material waterproof dan anti-rayap yang dirancang untuk tahan dalam segala cuaca dapur — dari uap, tumpahan air, hingga lembab.',
          "Soal harga? Beda tipis dari kayu biasa, tapi puasnya terasa setiap tahun. Sementara dapur lain mulai keropos, WOCENSA tetap gagah, tetap anggun.",
        ],
        quoteHtml:
          '"Yang benar-benar berkelas adalah: <br />yang awet di dalam, indah di luar."',
        images: [
          "https://images.unsplash.com/photo-1556912167-f556f1f39fdf?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
          "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
          "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
          "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
        ],
      },
      gallery: {
        id: "proyek",
        eyebrow: "Our Portfolio",
        title: "Project Selesai",
        projects: [
          {
            title: "Modern Minimalist",
            area: "Jakarta Selatan",
            img: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80",
          },
          {
            title: "Elegant Grey",
            area: "Tangerang",
            img: "https://images.unsplash.com/photo-1556912177-c54030639a6d?auto=format&fit=crop&w=800&q=80",
          },
          {
            title: "Luxury White",
            area: "Bekasi",
            img: "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=800&q=80",
          },
          {
            title: "Industrial Gold",
            area: "Depok",
            img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
          },
          {
            title: "Classic Wood Look",
            area: "Jakarta Pusat",
            img: "https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=800&q=80",
          },
          {
            title: "Compact Suite",
            area: "Bogor",
            img: "https://images.unsplash.com/photo-1556909190-7336338e55e5?auto=format&fit=crop&w=800&q=80",
          },
        ],
      },
      whyNow: {
        titleHtml: "Jangan Menyesal Tidak <br /> Menghubungi Sekarang",
        cards: [
          {
            title: "Harga Bahan Naik",
            text: "Harga bahan baku Aluminium Composite terus meningkat, harga produksi akan semakin mahal bulan depan.",
          },
          {
            title: "Bonus Terbatas",
            text: "Katalog bonus (Kompor, Sink, Arsitek) hanya tersedia untuk pendaftar minggu ini.",
          },
          {
            title: "Antrian Panjang",
            text: "Semakin lama menunda, antrian pengerjaan akan semakin panjang. Amankan jadwal Bunda sekarang.",
          },
        ],
      },
      finalCta: {
        title: "Amankan Slot Anda Sekarang",
        subtitle:
          "Konsultasikan kebutuhan kitchen set waterproof Bunda bersama tim Intero sekarang juga sebelum slot habis.",
        ctaLabel: "CHAT WHATSAPP SEKARANG",
        perkLine: "Gratis konsultasi + estimasi + desain awal",
        slotsBadge: "Tersisa 3 slot bulan ini!",
      },
      stickyCta: {
        topLine: "Konsultasi Gratis",
        mainLine: "Chat Admin Sekarang",
      },
    },
  };
}
