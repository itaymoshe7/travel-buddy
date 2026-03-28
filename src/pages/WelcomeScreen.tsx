interface Props {
  onSignUp: () => void
  onLogIn:  () => void
}

// ─── Inline SVG Globe Illustration ───────────────────────────────────────────
function GlobeIllustration() {
  return (
    <svg
      viewBox="0 0 280 280"
      width="260"
      height="260"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Globe base: radial gradient for 3-D sphere feel */}
        <radialGradient id="globeGrad" cx="38%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#e0f7fa" />
          <stop offset="45%"  stopColor="#80deea" />
          <stop offset="100%" stopColor="#546e7a" />
        </radialGradient>

        {/* Soft outer glow ring */}
        <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="60%"  stopColor="#b2ebf2" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#b2ebf2" stopOpacity="0" />
        </radialGradient>

        {/* Vapor trail fade */}
        <linearGradient id="trailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="white" stopOpacity="0" />
          <stop offset="60%"  stopColor="white" stopOpacity="0.7" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Clip to sphere */}
        <clipPath id="sphereClip">
          <circle cx="140" cy="140" r="90" />
        </clipPath>
      </defs>

      {/* Outer glow halo */}
      <circle cx="140" cy="140" r="118" fill="url(#glowGrad)" />

      {/* Globe sphere */}
      <circle cx="140" cy="140" r="90" fill="url(#globeGrad)" />

      {/* Latitude lines clipped to sphere */}
      <g clipPath="url(#sphereClip)" fill="none" stroke="white" strokeOpacity="0.18" strokeWidth="1">
        <ellipse cx="140" cy="140" rx="90" ry="22" />
        <ellipse cx="140" cy="140" rx="90" ry="50" />
        <ellipse cx="140" cy="140" rx="90" ry="76" />
        <ellipse cx="140" cy="140" rx="90" ry="90" />
      </g>

      {/* Longitude lines */}
      <g clipPath="url(#sphereClip)" fill="none" stroke="white" strokeOpacity="0.18" strokeWidth="1">
        <line x1="140" y1="50" x2="140" y2="230" />
        <ellipse cx="140" cy="140" rx="45" ry="90" />
        <ellipse cx="140" cy="140" rx="72" ry="90" />
      </g>

      {/* Stylised continent blobs (dark teal) */}
      <g clipPath="url(#sphereClip)" fill="#00838f" opacity="0.55">
        {/* "Americas" blob */}
        <ellipse cx="108" cy="128" rx="18" ry="26" transform="rotate(-15 108 128)" />
        <ellipse cx="115" cy="162" rx="12" ry="18" transform="rotate(-10 115 162)" />
        {/* "Europe / Africa" blob */}
        <ellipse cx="152" cy="118" rx="14" ry="20" transform="rotate(10 152 118)" />
        <ellipse cx="158" cy="152" rx="10" ry="22" transform="rotate(5 158 152)" />
        {/* "Asia" blob */}
        <ellipse cx="178" cy="120" rx="20" ry="14" transform="rotate(-8 178 120)" />
      </g>

      {/* Specular highlight (top-left shine) */}
      <ellipse
        cx="115" cy="108"
        rx="28" ry="18"
        fill="white" opacity="0.18"
        transform="rotate(-30 115 108)"
      />

      {/* ── Vapor trail (curved arc around the globe) ── */}
      <path
        d="M 80 76 Q 170 38 230 110"
        fill="none"
        stroke="url(#trailGrad)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* ── Airplane ── */}
      {/*  Positioned at the end of the trail arc ~(222, 103) rotated 40° */}
      <g transform="translate(222,100) rotate(38)">
        {/* Fuselage */}
        <rect x="-9" y="-2.5" width="18" height="5" rx="2.5" fill="white" />
        {/* Wings */}
        <polygon points="0,-2 8,0 0,7" fill="white" opacity="0.9" />
        <polygon points="0,-2 -8,0 0,7" fill="white" opacity="0.9" />
        {/* Tail fin */}
        <polygon points="-9,-2 -13,-6 -6,-2" fill="white" opacity="0.8" />
      </g>

      {/* ── Location pins (3 floating pins) ── */}
      {/* Pin 1 — top right */}
      <g transform="translate(196,72)">
        <circle cx="0" cy="-6" r="7" fill="#e53935" />
        <circle cx="0" cy="-6" r="3.5" fill="white" opacity="0.7" />
        <polygon points="-4,0 4,0 0,9" fill="#e53935" />
      </g>

      {/* Pin 2 — left */}
      <g transform="translate(72,148)">
        <circle cx="0" cy="-6" r="6" fill="#c62828" />
        <circle cx="0" cy="-6" r="3" fill="white" opacity="0.7" />
        <polygon points="-3.5,0 3.5,0 0,8" fill="#c62828" />
      </g>

      {/* Pin 3 — bottom center */}
      <g transform="translate(158,208)">
        <circle cx="0" cy="-6" r="6" fill="#e53935" />
        <circle cx="0" cy="-6" r="3" fill="white" opacity="0.7" />
        <polygon points="-3.5,0 3.5,0 0,8" fill="#e53935" />
      </g>

      {/* Thin border ring */}
      <circle cx="140" cy="140" r="90" fill="none" stroke="#b2ebf2" strokeWidth="1.5" opacity="0.6" />
    </svg>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function WelcomeScreen({ onSignUp, onLogIn }: Props) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-6 py-12 text-center overflow-hidden"
      style={{
        background: 'linear-gradient(170deg, #E0F7FA 0%, #F3E5F5 55%, #FCE4EC 100%)',
      }}
    >
      {/* Top spacer */}
      <div />

      {/* Central content */}
      <div className="flex flex-col items-center">
        {/* Globe illustration */}
        <div className="mb-6 drop-shadow-xl">
          <GlobeIllustration />
        </div>

        {/* App name */}
        <h1
          className="text-4xl font-bold tracking-tight mb-3"
          style={{ color: '#1E293B' }}
        >
          TravelBuddy
        </h1>

        {/* Tagline */}
        <p className="text-sm text-slate-500 max-w-[220px] leading-relaxed">
          Your local connection for every journey.
        </p>
      </div>

      {/* Buttons */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        {/* Get Started — solid primary */}
        <button
          type="button"
          onClick={onSignUp}
          className="w-full py-4 rounded-full bg-primary text-white text-sm font-bold tracking-wide shadow-2xl hover:bg-blue-700 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Get Started
        </button>

        {/* Log In — frosted glass */}
        <button
          type="button"
          onClick={onLogIn}
          className="w-full py-4 rounded-full text-sm font-bold tracking-wide shadow-2xl border border-white/60 hover:bg-white/70 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          style={{
            backgroundColor: 'rgba(255,255,255,0.50)',
            color: '#2563EB',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          Log In
        </button>
      </div>
    </div>
  )
}
