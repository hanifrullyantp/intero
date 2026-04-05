import { Link } from "react-router-dom";
import { usePublicSettings } from "@/context/PublicSettingsContext";
import { GlobalStyles } from "@/components/GlobalStyles";

export default function PrivacyPage() {
  const { settings, loading } = usePublicSettings();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Memuat…</div>;
  }

  return (
    <div className="min-h-screen bg-white text-navy-900 font-sans">
      <GlobalStyles settings={settings} />
      <header className="border-b border-gray-100 px-6 py-4 flex justify-between items-center max-w-3xl mx-auto w-full">
        <Link to="/" className="font-black text-lg hover:text-gold-600">
          ← {settings.siteName}
        </Link>
      </header>
      <article
        className="max-w-3xl mx-auto px-6 py-12 [&_h1]:text-3xl [&_h1]:font-black [&_h1]:mb-4 [&_p]:text-gray-600 [&_p]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: settings.footer.privacyPageHtml }}
      />
    </div>
  );
}
