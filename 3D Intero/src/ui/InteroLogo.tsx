/** Symmetric isometric cube mark (matches app icon). */
export default function InteroLogo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden>
      <defs>
        <linearGradient id="intero-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4CBE93" />
          <stop offset="1" stopColor="#0F6B46" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#intero-logo-g)" />
      <path d="M256 118 L378 186 L256 254 L134 186 Z" fill="#FFFFFF" />
      <path d="M134 186 L256 254 L256 394 L134 326 Z" fill="#E8F5EF" />
      <path d="M378 186 L256 254 L256 394 L378 326 Z" fill="#CFEBDD" />
      <line x1="256" y1="254" x2="256" y2="394" stroke="#0F6B46" strokeWidth="6" />
    </svg>
  );
}
