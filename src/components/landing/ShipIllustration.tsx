export function ShipIllustration() {
  return (
    <div className="relative w-full h-full animate-float" style={{ aspectRatio: "16/10" }}>
      {/* Glow beneath ship */}
      <div
        className="absolute bottom-[15%] left-[10%] right-[10%] h-[30%] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(53,214,192,0.18) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
        aria-hidden="true"
      />

      <svg
        viewBox="0 0 820 520"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-label="Battleship illustration"
        role="img"
      >
        <defs>
          <linearGradient id="hullGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a4a6b" />
            <stop offset="100%" stopColor="#0f1f33" />
          </linearGradient>
          <linearGradient id="deckGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a5a7a" />
            <stop offset="100%" stopColor="#1a3048" />
          </linearGradient>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(53,214,192,0.15)" />
            <stop offset="100%" stopColor="rgba(6,20,26,0)" />
          </linearGradient>
          <linearGradient id="glowLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(99,80,220,0)" />
            <stop offset="40%" stopColor="rgba(99,80,220,0.9)" />
            <stop offset="70%" stopColor="rgba(53,214,192,0.7)" />
            <stop offset="100%" stopColor="rgba(53,214,192,0)" />
          </linearGradient>
          <filter id="shipGlow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="hullClip">
            <path d="M80 320 L680 280 L760 300 L790 340 L760 380 L120 390 Z" />
          </clipPath>
        </defs>

        {/* ── Ocean surface ── */}
        <ellipse cx="430" cy="400" rx="380" ry="40" fill="url(#waterGrad)" opacity="0.6" />

        {/* Water ripples */}
        {[0, 1, 2].map((i) => (
          <ellipse
            key={i}
            cx={320 + i * 80}
            cy={408 + i * 6}
            rx={60 + i * 30}
            ry={4}
            stroke="rgba(53,214,192,0.12)"
            strokeWidth="1"
            fill="none"
          />
        ))}

        {/* ── Hull ── */}
        <path
          d="M90 335 L680 285 L770 305 L800 348 L770 378 L110 386 Z"
          fill="url(#hullGrad)"
          stroke="rgba(53,214,192,0.2)"
          strokeWidth="1"
        />

        {/* Hull bottom shadow */}
        <path
          d="M110 386 L770 378 L790 395 L90 398 Z"
          fill="#060e18"
          opacity="0.8"
        />

        {/* Waterline glow */}
        <path
          d="M100 380 Q450 370 780 376"
          stroke="url(#glowLine)"
          strokeWidth="2.5"
          fill="none"
          filter="url(#softGlow)"
          opacity="0.8"
        />

        {/* ── Main deck ── */}
        <rect x="130" y="278" width="600" height="62" rx="4" fill="url(#deckGrad)" />
        <rect x="135" y="278" width="590" height="8" rx="2" fill="rgba(255,255,255,0.06)" />

        {/* Deck details — railing */}
        {Array.from({ length: 28 }, (_, i) => (
          <rect
            key={i}
            x={140 + i * 21}
            y={270}
            width="2"
            height="14"
            rx="1"
            fill="rgba(150,200,220,0.35)"
          />
        ))}
        <line x1="138" y1="270" x2="726" y2="270" stroke="rgba(150,200,220,0.4)" strokeWidth="1.5" />

        {/* ── Superstructure ── */}
        {/* Main bridge block */}
        <rect x="380" y="198" width="180" height="82" rx="5" fill="#1e3a52" stroke="rgba(53,214,192,0.15)" strokeWidth="1" />
        <rect x="385" y="203" width="170" height="20" rx="3" fill="#264860" />

        {/* Bridge windows */}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={392 + i * 32}
            y={207}
            width="18"
            height="12"
            rx="2"
            fill="rgba(53,214,192,0.25)"
            stroke="rgba(53,214,192,0.4)"
            strokeWidth="0.5"
          />
        ))}

        {/* Secondary structure */}
        <rect x="440" y="155" width="100" height="46" rx="4" fill="#1a3248" stroke="rgba(53,214,192,0.12)" strokeWidth="1" />
        <rect x="445" y="160" width="90" height="14" rx="3" fill="#22405a" />

        {/* Top structure */}
        <rect x="468" y="118" width="56" height="40" rx="3" fill="#162c42" />
        <rect x="472" y="122" width="48" height="12" rx="2" fill="#1e3a52" />

        {/* Mast */}
        <line x1="496" y1="60" x2="496" y2="120" stroke="#2a4a6a" strokeWidth="4" strokeLinecap="round" />
        <line x1="466" y1="80" x2="526" y2="80" stroke="#2a4a6a" strokeWidth="2" strokeLinecap="round" />
        <line x1="476" y1="95" x2="516" y2="95" stroke="#2a4a6a" strokeWidth="1.5" strokeLinecap="round" />

        {/* Radar dish */}
        <circle cx="496" cy="58" r="10" fill="none" stroke="rgba(53,214,192,0.5)" strokeWidth="1.5" />
        <line x1="496" y1="48" x2="496" y2="68" stroke="rgba(53,214,192,0.5)" strokeWidth="1" />
        <line x1="486" y1="58" x2="506" y2="58" stroke="rgba(53,214,192,0.5)" strokeWidth="1" />

        {/* ── Gun turrets ── */}
        {/* Front turret */}
        <TurretGroup cx={220} cy={278} angle={-15} />
        {/* Mid turret */}
        <TurretGroup cx={340} cy={278} angle={-8} />
        {/* Rear turret */}
        <TurretGroup cx={620} cy={278} angle={5} />

        {/* ── Funnels ── */}
        <rect x="550" y="228" width="32" height="55" rx="4" fill="#182e42" stroke="rgba(53,214,192,0.1)" strokeWidth="1" />
        <rect x="555" y="224" width="22" height="8" rx="2" fill="#1e3a52" />
        {/* Smoke wisps */}
        <path d="M558 222 Q554 210 560 200 Q566 190 562 178" stroke="rgba(200,220,230,0.12)" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M566 220 Q574 208 570 196 Q566 184 572 172" stroke="rgba(200,220,230,0.09)" strokeWidth="4" fill="none" strokeLinecap="round" />

        {/* ── Signal lights ── */}
        <circle cx="730" cy="300" r="4" fill="rgba(53,214,192,0.9)" filter="url(#shipGlow)" />
        <circle cx="110" cy="320" r="3" fill="rgba(99,80,220,0.8)" filter="url(#shipGlow)" />

        {/* ── Bow wave ── */}
        <path
          d="M790 355 Q820 345 840 360 Q820 365 800 368 Z"
          fill="rgba(53,214,192,0.12)"
        />
        <path
          d="M785 360 Q830 348 860 365"
          stroke="rgba(53,214,192,0.2)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function TurretGroup({ cx, cy, angle }: { cx: number; cy: number; angle: number }) {
  return (
    <g transform={`translate(${cx},${cy})`}>
      {/* Base */}
      <ellipse cx="0" cy="0" rx="28" ry="14" fill="#1a3850" stroke="rgba(53,214,192,0.15)" strokeWidth="1" />
      {/* Turret body */}
      <rect x="-20" y="-18" width="40" height="20" rx="6" fill="#22465e" stroke="rgba(53,214,192,0.2)" strokeWidth="1" />
      {/* Guns */}
      <g transform={`rotate(${angle})`}>
        <rect x="-3" y="-34" width="5" height="24" rx="2" fill="#2a566e" />
        <rect x="8" y="-32" width="5" height="22" rx="2" fill="#2a566e" />
        <rect x="-14" y="-30" width="5" height="20" rx="2" fill="#2a566e" />
      </g>
    </g>
  );
}
