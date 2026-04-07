import type { SiteSettings } from "@/types/site-settings";

export function GlobalStyles({ settings }: { settings: SiteSettings }) {
  const { navy, navyDeep, gold, goldLight, primary } = settings.brandColors;
  return (
    <style>{`
      :root {
        --navy-900: ${navy};
        --navy-950: ${navyDeep};
        --gold-500: ${gold};
        --brand-primary: ${primary};
      }
      html {
        font-family: var(--font-sans, "Montserrat", ui-sans-serif, system-ui, sans-serif);
      }
      .bg-navy-900 { background-color: ${navy}; }
      .bg-navy-950 { background-color: ${navyDeep}; }
      .text-navy-900 { color: ${navy}; }
      .text-navy-800 { color: #1e293b; }
      .bg-gold-50 { background-color: #fefce8; }
      .bg-gold-400 { background-color: ${goldLight}; }
      .bg-gold-500 { background-color: ${gold}; }
      .text-gold-400 { color: ${goldLight}; }
      .text-gold-500 { color: ${gold}; }
      .text-gold-600 { color: #d97706; }
      .border-gold-500 { border-color: ${gold}; }
      .from-gold-300 { --tw-gradient-from: #fcd34d; }
      .via-white { --tw-gradient-via: #fff; }
      .to-gold-300 { --tw-gradient-to: #fcd34d; }
      .pulse-animation {
        animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      @keyframes pulse-ring {
        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
        70% { box-shadow: 0 0 0 20px rgba(34, 197, 94, 0); }
        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
      }
      html { scroll-behavior: smooth; }
      ::-webkit-scrollbar { width: 10px; }
      ::-webkit-scrollbar-track { background: #f1f1f1; }
      ::-webkit-scrollbar-thumb { background: ${navy}; border-radius: 5px; }
      ::-webkit-scrollbar-thumb:hover { background: #1e293b; }
    `}</style>
  );
}
