import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { usePublicSettings } from "@/context/PublicSettingsContext";
import { GlobalStyles } from "@/components/GlobalStyles";

export default function PricelistPage() {
  const { settings, loading } = usePublicSettings();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900 text-white font-sans">
        Memuat…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-navy-900 font-sans">
      <GlobalStyles settings={settings} />
      <header className="bg-navy-900 text-white border-b border-white/10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="font-black text-lg hover:text-gold-400 transition-colors">
            ← {settings.siteName}
          </Link>
          <span className="text-xs font-bold uppercase tracking-widest text-gold-400">Pricelist</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-black text-navy-900 mb-3">Indikasi investasi</h1>
        <p className="text-gray-600 leading-relaxed mb-10">
          Harga final mengikuti ukuran ruang, material finishing, dan aksesoris. Gunakan angka di
          bawah sebagai referensi; untuk penawaran pasti dan desain 3D, lanjut konsultasi dengan tim
          kami.
        </p>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-900 text-white text-left">
                <th className="px-4 py-3 font-bold">Paket</th>
                <th className="px-4 py-3 font-bold">Kisaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 font-medium">Kitchen set compact</td>
                <td className="px-4 py-3 text-gray-600">Sesuai survei</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Kitchen set standar + island</td>
                <td className="px-4 py-3 text-gray-600">Sesuai survei</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Full custom WOCENSA waterproof</td>
                <td className="px-4 py-3 text-gray-600">Estimasi via WA / form</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Promo, bonus, dan slot bulanan sama seperti di halaman utama — tidak dijamin tetap sama
          minggu depan.
        </p>

        <Link
          to="/#harga"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gold-500 text-navy-900 hover:bg-gold-400 shadow-lg px-8 py-3.5 text-sm sm:text-base font-bold uppercase tracking-wide transition-all active:scale-95"
        >
          <MessageCircle className="h-5 w-5 shrink-0" />
          Konsultasi &amp; estimasi WA
        </Link>
      </main>

    </div>
  );
}
