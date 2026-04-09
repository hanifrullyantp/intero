import { Link } from "react-router-dom";

const links = [
  { to: "/admin/global", label: "Global & merek — nama, warna, logo" },
  { to: "/admin/contact", label: "Kontak & sosial" },
  { to: "/admin/seo", label: "SEO, Facebook Pixel, Google Analytics" },
  { to: "/admin/toast", label: "Toast notifikasi kanan bawah" },
  { to: "/admin/faq", label: "FAQ accordion" },
  { to: "/admin/footer", label: "Footer & halaman privasi" },
  { to: "/admin/sections", label: "Konten landing — form & unggah (WordPress-style)" },
  { to: "/admin/sections-json", label: "Konten landing — JSON lanjutan" },
  { to: "/admin/leads", label: "CRM & leads (pipeline)" },
  { to: "/admin/crm-settings", label: "CRM — template WA & kategori" },
];

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-black mb-2">Panel admin</h1>
      <p className="text-gray-600 mb-8">
        Pilih menu di kiri atau langsung ke halaman berikut.
      </p>
      <ul className="space-y-2 max-w-xl">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-blue-700 font-medium hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
