interface Props {
  onSignUp: () => void
  onLogIn:  () => void
}

// ─── Animations (injected once as a style tag) ────────────────────────────────
const KEYFRAMES = `
  @keyframes pulse-ring {
    0%   { transform: scale(0.85); opacity: 0.6; }
    70%  { transform: scale(1.25); opacity: 0;   }
    100% { transform: scale(0.85); opacity: 0;   }
  }
  @keyframes pulse-ring2 {
    0%   { transform: scale(0.85); opacity: 0.4; }
    70%  { transform: scale(1.5);  opacity: 0;   }
    100% { transform: scale(0.85); opacity: 0;   }
  }
  @keyframes globe-float {
    0%, 100% { transform: translateY(0px);   }
    50%       { transform: translateY(-10px); }
  }
  @keyframes pin-ping {
    0%,100% { transform: scale(1);   opacity: 1;   }
    50%     { transform: scale(2.2); opacity: 0;   }
  }
  @keyframes btn-glow {
    0%,100% { box-shadow: 0 0 0 0 rgba(29,78,216,0.5), 0 8px 32px rgba(29,78,216,0.45); }
    50%     { box-shadow: 0 0 0 8px rgba(29,78,216,0),  0 8px 32px rgba(29,78,216,0.45); }
  }
  @keyframes flight-dash {
    to { stroke-dashoffset: -320; }
  }
`

// ─── Globe SVG ────────────────────────────────────────────────────────────────
function Globe() {
  return (
    <svg viewBox="0 0 320 320" width="300" height="300" aria-hidden="true"
      style={{ animation: 'globe-float 5s ease-in-out infinite', filter: 'drop-shadow(0 8px 32px rgba(14,165,233,0.5))' }}>
      <defs>
        {/* 3-D sphere gradient — highlight top-left */}
        <radialGradient id="wSphere" cx="36%" cy="32%" r="65%">
          <stop offset="0%"   stopColor="#E0F7FF" />
          <stop offset="30%"  stopColor="#7DD3FC" />
          <stop offset="65%"  stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#0369A1" />
        </radialGradient>

        {/* Ocean shimmer */}
        <radialGradient id="wOcean" cx="40%" cy="38%" r="58%">
          <stop offset="0%"   stopColor="#BAE6FD" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#0284C7" stopOpacity="0"    />
        </radialGradient>

        {/* Pin glow */}
        <radialGradient id="wPinGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"   />
        </radialGradient>

        {/* Flight path fade */}
        <linearGradient id="wPath1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0"   />
          <stop offset="50%"  stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"   />
        </linearGradient>
        <linearGradient id="wPath2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0"   />
          <stop offset="50%"  stopColor="#BAE6FD" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"   />
        </linearGradient>

        {/* Clip to circle */}
        <clipPath id="wClip">
          <circle cx="160" cy="160" r="118" />
        </clipPath>
      </defs>

      {/* ── Sphere base ────────────────────────────────────────────────────── */}
      <circle cx="160" cy="160" r="118" fill="url(#wSphere)" />
      <circle cx="160" cy="160" r="118" fill="url(#wOcean)"  />

      {/* ── Grid lines (clipped) ───────────────────────────────────────────── */}
      <g clipPath="url(#wClip)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none">
        {/* Latitudes */}
        <ellipse cx="160" cy="160" rx="118" ry="35"  />
        <ellipse cx="160" cy="160" rx="118" ry="72"  />
        <ellipse cx="160" cy="133" rx="118" ry="27"  />
        <ellipse cx="160" cy="187" rx="118" ry="27"  />
        {/* Longitudes */}
        <ellipse cx="160" cy="160" rx="35"  ry="118" />
        <ellipse cx="160" cy="160" rx="75"  ry="118" />
        <line x1="160" y1="42" x2="160" y2="278" />
      </g>

      {/* ── Continent blobs (clipped) ─────────────────────────────────────── */}
      <g clipPath="url(#wClip)" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.30)" strokeWidth="0.8">
        {/* North America */}
        <path d="M90,100 C92,88 108,80 122,85 C136,90 140,100 135,115 C130,130 118,138 106,133 C94,128 88,112 90,100Z" />
        {/* Europe */}
        <path d="M156,92 C162,85 174,83 181,88 C188,93 189,103 183,110 C177,117 165,118 158,112 C151,106 150,99 156,92Z" />
        {/* Africa */}
        <path d="M162,118 C168,113 178,112 184,118 C190,124 191,142 187,155 C183,168 174,174 166,170 C158,166 155,152 155,138 C155,124 156,123 162,118Z" />
        {/* Asia */}
        <path d="M186,88 C195,82 215,80 225,88 C235,96 236,110 228,120 C220,130 204,133 192,126 C180,119 177,106 186,88Z" />
        {/* South America */}
        <path d="M108,148 C114,142 124,140 130,147 C136,154 136,168 130,178 C124,188 112,192 105,185 C98,178 98,162 102,154 C104,150 106,150 108,148Z" />
        {/* Australia */}
        <path d="M218,162 C225,156 237,155 242,163 C247,171 244,183 236,188 C228,193 218,191 214,184 C210,177 211,168 218,162Z" />
      </g>

      {/* ── Sphere rim shadow ──────────────────────────────────────────────── */}
      <circle cx="160" cy="160" r="118" fill="none"
        stroke="rgba(2,132,199,0.6)" strokeWidth="2.5" />
      <circle cx="160" cy="160" r="118" fill="none"
        stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

      {/* ── Flight arcs ────────────────────────────────────────────────────── */}
      {/* Arc 1: North America → Europe */}
      <path d="M110,118 Q140,78 178,100" fill="none" stroke="url(#wPath1)"
        strokeWidth="1.8" strokeLinecap="round"
        strokeDasharray="60 260"
        style={{ animation: 'flight-dash 3.5s linear infinite' }} />
      {/* Arc 2: Europe → Asia */}
      <path d="M178,98 Q205,72 222,94" fill="none" stroke="url(#wPath1)"
        strokeWidth="1.8" strokeLinecap="round"
        strokeDasharray="50 260"
        style={{ animation: 'flight-dash 4s linear infinite 0.8s' }} />
      {/* Arc 3: Africa → Australia */}
      <path d="M174,148 Q205,140 226,166" fill="none" stroke="url(#wPath2)"
        strokeWidth="1.6" strokeLinecap="round"
        strokeDasharray="45 260"
        style={{ animation: 'flight-dash 4.5s linear infinite 1.4s' }} />
      {/* Arc 4: S.America → Africa */}
      <path d="M116,162 Q138,128 166,136" fill="none" stroke="url(#wPath2)"
        strokeWidth="1.5" strokeLinecap="round"
        strokeDasharray="40 260"
        style={{ animation: 'flight-dash 5s linear infinite 0.3s' }} />

      {/* ── Location pins ─────────────────────────────────────────────────── */}
      {/* New York */}
      <g transform="translate(108,115)">
        <circle r="8" fill="rgba(255,255,255,0.15)"
          style={{ animation: 'pin-ping 2.2s ease-out infinite' }} />
        <circle r="4" fill="white" opacity="0.9" />
        <circle r="2" fill="#0EA5E9" />
      </g>
      {/* London */}
      <g transform="translate(175,96)">
        <circle r="7" fill="rgba(255,255,255,0.15)"
          style={{ animation: 'pin-ping 2.8s ease-out infinite 0.6s' }} />
        <circle r="3.5" fill="white" opacity="0.9" />
        <circle r="1.8" fill="#0EA5E9" />
      </g>
      {/* Dubai */}
      <g transform="translate(212,120)">
        <circle r="7" fill="rgba(255,255,255,0.15)"
          style={{ animation: 'pin-ping 2.5s ease-out infinite 1.1s' }} />
        <circle r="3.5" fill="white" opacity="0.9" />
        <circle r="1.8" fill="#38BDF8" />
      </g>
      {/* Sydney */}
      <g transform="translate(228,168)">
        <circle r="6" fill="rgba(255,255,255,0.15)"
          style={{ animation: 'pin-ping 3s ease-out infinite 0.3s' }} />
        <circle r="3" fill="white" opacity="0.9" />
        <circle r="1.5" fill="#0EA5E9" />
      </g>
      {/* São Paulo */}
      <g transform="translate(117,166)">
        <circle r="6" fill="rgba(255,255,255,0.15)"
          style={{ animation: 'pin-ping 2.6s ease-out infinite 1.7s' }} />
        <circle r="3" fill="white" opacity="0.9" />
        <circle r="1.5" fill="#38BDF8" />
      </g>

      {/* ── Specular highlight ────────────────────────────────────────────── */}
      <ellipse cx="130" cy="115" rx="36" ry="24"
        fill="rgba(255,255,255,0.12)" style={{ transform: 'rotate(-20deg)', transformOrigin: '130px 115px' }} />
    </svg>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WelcomeScreen({ onSignUp, onLogIn }: Props) {
  return (
    <div className="relative min-h-screen flex flex-col items-center overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse 130% 90% at 50% 60%, #0EA5E9 0%, #1D4ED8 45%, #1E3A8A 100%)',
      }}>

      {/* Inject keyframe animations */}
      <style>{KEYFRAMES}</style>

      {/* ── Ambient background glow circles ──────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '30%', left: '50%',
          width: '480px', height: '480px',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(125,211,252,0.20) 0%, rgba(14,165,233,0.10) 50%, transparent 70%)',
          animation: 'pulse-ring2 4s ease-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '30%', left: '50%',
          width: '360px', height: '360px',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(186,230,253,0.25) 0%, rgba(14,165,233,0.12) 50%, transparent 70%)',
          animation: 'pulse-ring 3.2s ease-out infinite 0.6s',
        }} />
      </div>

      {/* ── Top stars / particles ─────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {[
          [12,8],[88,5],[25,15],[70,12],[50,4],[35,22],[80,18],[60,8],[15,28],[90,25],
          [42,6],[65,20],[20,35],[78,30],[55,16],
        ].map(([x,y], i) => (
          <div key={i} style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`,
            width: i % 3 === 0 ? '3px' : '2px',
            height: i % 3 === 0 ? '3px' : '2px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.7)',
            animation: `pin-ping ${2.5 + (i % 4) * 0.4}s ease-out infinite ${(i % 5) * 0.3}s`,
          }} />
        ))}
      </div>

      {/* ── Header / Logo ────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full text-center pt-14 pb-2 px-6">
        <div className="flex items-center justify-center gap-2 mb-1">
          {/* Globe icon mark */}
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.6}>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 3a15 15 0 010 18M3 12h18" />
            <path strokeLinecap="round" d="M5.6 7.5a14 14 0 0112.8 0M5.6 16.5a14 14 0 0012.8 0" />
          </svg>
          <span className="text-3xl font-black tracking-tight text-white">
            Mate
          </span>
        </div>
        <p className="text-sm font-medium" style={{ color: 'rgba(186,230,253,0.90)', letterSpacing: '0.06em' }}>
          YOUR WORLD. YOUR CREW.
        </p>
      </div>

      {/* ── Globe illustration ────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-4">
        <Globe />
      </div>

      {/* ── Tagline ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 text-center px-8 mb-8">
        <h2 className="text-2xl font-bold text-white leading-snug mb-1" style={{ letterSpacing: '-0.01em' }}>
          Travel is better together
        </h2>
        <p className="text-sm" style={{ color: 'rgba(186,230,253,0.80)' }}>
          Find travel companions, share moments,<br />and make memories worldwide.
        </p>
      </div>

      {/* ── CTA Buttons ───────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-sm px-6 pb-12 flex flex-col gap-3">

        {/* Get Started — primary with glow pulse */}
        <button
          type="button"
          onClick={onSignUp}
          className="w-full py-4 rounded-full text-base font-bold text-white tracking-wide focus:outline-none transition-transform active:scale-[0.97]"
          style={{
            background:  'linear-gradient(135deg, #2563EB 0%, #1D4ED8 60%, #1E40AF 100%)',
            animation:   'btn-glow 2.5s ease-in-out infinite',
          }}
        >
          Get Started
        </button>

        {/* Log In — glassmorphism */}
        <button
          type="button"
          onClick={onLogIn}
          className="w-full py-4 rounded-full text-base font-bold focus:outline-none transition-transform active:scale-[0.97]"
          style={{
            background:       'rgba(255,255,255,0.15)',
            backdropFilter:   'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border:           '1.5px solid rgba(255,255,255,0.30)',
            color:            'white',
          }}
        >
          Log In
        </button>
      </div>

    </div>
  )
}
