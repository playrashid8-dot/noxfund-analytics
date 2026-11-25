type P = { id: string };
const G = ({ id, a, b }: { id: string; a: string; b: string }) => (
  <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
);

export const Logo = () => (
  <svg viewBox="0 0 64 64" className="logo-svg" aria-hidden>
    <defs>
      <linearGradient id="lg-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f5d27a" /><stop offset=".55" stopColor="#e3b04f" /><stop offset="1" stopColor="#c8912e" /></linearGradient>
      <linearGradient id="lg-gold2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbe3a0" /><stop offset="1" stopColor="#b47d22" /></linearGradient>
    </defs>
    <path d="M8 56 L20 8 H31 L19 56 Z" fill="url(#lg-gold)" />
    <path d="M22 8 H33 L44 40 L42 56 Z" fill="url(#lg-gold2)" opacity=".9" />
    <path d="M45 8 H56 L44 56 H33 Z" fill="url(#lg-gold)" />
    <path d="M4 44 C 20 34, 40 30, 62 30 C 44 34, 26 40, 10 52 Z" fill="url(#lg-gold2)" opacity=".85" />
  </svg>
);

export const BnbIcon = () => (
  <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden>
    <path fill="#F3BA2F" d="M16 4l3.1 3.1-7.8 7.8-3.1-3.1L16 4zm4.7 4.7l3.1 3.1-12.5 12.5-3.1-3.1L20.7 8.7zM7.3 13.4l3.1 3.1-3.1 3.1-3.1-3.1 3.1-3.1zm17.4 0l3.1 3.1L16 28.4l-3.1-3.1 11.8-11.9z" />
  </svg>
);

export const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
    <path fill="currentColor" d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z" />
  </svg>
);

export const LinkIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
    <path fill="#e8c063" d="M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a3 3 0 1 1 4.2 4.2l-2 2a1 1 0 1 1-1.4-1.4l2-2a1 1 0 1 0-1.4-1.4L12 13.4a1 1 0 0 1-1.4 0Zm2.8-2.8a1 1 0 0 1 0 1.4l-3.5 3.5a3 3 0 1 1-4.2-4.2l2-2a1 1 0 1 1 1.4 1.4l-2 2a1 1 0 1 0 1.4 1.4l3.5-3.5a1 1 0 0 1 1.4 0Z" />
  </svg>
);

/* Card icons: 40px, gradient fills */
export const IconCoins = ({ id }: P) => (
  <svg viewBox="0 0 48 48" aria-hidden>
    <G id={id} a="#7fd0ff" b="#1f6bff" />
    {[34, 26, 18].map((y, i) => (
      <g key={i}><ellipse cx="24" cy={y + 4} rx="15" ry="5" fill={`url(#${id})`} opacity={0.55 + i * 0.15} /><ellipse cx="24" cy={y} rx="15" ry="5" fill={`url(#${id})`} /><ellipse cx="24" cy={y} rx="10" ry="2.6" fill="#0b1a44" opacity=".35" /></g>
    ))}
  </svg>
);
export const IconReturn = ({ id }: P) => (
  <svg viewBox="0 0 48 48" aria-hidden>
    <G id={id} a="#d9a6ff" b="#7b3cf0" />
    <path d="M24 6a18 18 0 0 1 17.3 13h-4.2A14 14 0 0 0 11 18l4 4H5V12l3.2 3.2A18 18 0 0 1 24 6Z" fill={`url(#${id})`} />
    <path d="M24 42A18 18 0 0 1 6.7 29h4.2A14 14 0 0 0 37 30l-4-4h10v10l-3.2-3.2A18 18 0 0 1 24 42Z" fill={`url(#${id})`} />
    <circle cx="24" cy="24" r="7.5" fill={`url(#${id})`} /><text x="24" y="27.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="#1c0d3d">$</text>
  </svg>
);
export const IconChart = ({ id }: P) => (
  <svg viewBox="0 0 48 48" aria-hidden>
    <G id={id} a="#ffe08a" b="#e08a12" />
    <rect x="7" y="30" width="7" height="12" rx="1.5" fill={`url(#${id})`} />
    <rect x="18" y="23" width="7" height="19" rx="1.5" fill={`url(#${id})`} />
    <rect x="29" y="16" width="7" height="26" rx="1.5" fill={`url(#${id})`} />
    <path d="M6 24 L18 14 L26 19 L39 7" stroke={`url(#${id})`} strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M33 6 H41 V14" stroke={`url(#${id})`} strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IconWallet = ({ id }: P) => (
  <svg viewBox="0 0 48 48" aria-hidden>
    <G id={id} a="#6ff7c0" b="#0fa36b" />
    <path d="M10 12h24a3 3 0 0 1 3 3v2H11a2 2 0 0 1 0-4" fill={`url(#${id})`} opacity=".7" />
    <rect x="6" y="15" width="36" height="25" rx="5" fill={`url(#${id})`} />
    <rect x="28" y="23" width="14" height="9" rx="3" fill="#06351f" opacity=".55" />
    <circle cx="33" cy="27.5" r="2" fill="#bfffe5" />
  </svg>
);
export const IconShield = ({ id }: P) => (
  <svg viewBox="0 0 48 48" aria-hidden>
    <G id={id} a="#7ff0ff" b="#1689e0" />
    <path d="M24 4 40 10v12c0 10.5-6.8 18.6-16 22-9.2-3.4-16-11.5-16-22V10L24 4Z" fill={`url(#${id})`} />
    <path d="M16 24.5 22 30l11-12" stroke="#062a44" strokeWidth="3.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IconPeople = ({ id }: P) => (
  <svg viewBox="0 0 48 48" aria-hidden>
    <G id={id} a="#c9a0ff" b="#6a2fe0" />
    <circle cx="13" cy="17" r="5" fill={`url(#${id})`} opacity=".75" /><path d="M3 36c0-6 4.5-10 10-10s10 4 10 10Z" fill={`url(#${id})`} opacity=".75" />
    <circle cx="35" cy="17" r="5" fill={`url(#${id})`} opacity=".75" /><path d="M25 36c0-6 4.5-10 10-10s10 4 10 10Z" fill={`url(#${id})`} opacity=".75" />
    <circle cx="24" cy="15" r="6.5" fill={`url(#${id})`} /><path d="M11 40c0-7.5 5.8-12.5 13-12.5S37 32.5 37 40Z" fill={`url(#${id})`} />
  </svg>
);
