"use client";

// 404 illustration: an astronaut drifting away from a small planet, with a
// snapped tether. Inline SVG rather than a file so it can use the theme
// tokens and animate — and so it stays crisp at any size.
//
// Everything is decorative: aria-hidden, and all motion is disabled under
// prefers-reduced-motion.

export default function LostInSpace() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <style>{`
        @keyframes lis-drift {
          0%, 100% { transform: translate(0, 0) rotate(-6deg); }
          50%      { transform: translate(10px, -14px) rotate(4deg); }
        }
        @keyframes lis-twinkle {
          0%, 100% { opacity: .25; }
          50%      { opacity: 1; }
        }
        @keyframes lis-orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .lis-astro   { animation: lis-drift 7s ease-in-out infinite; transform-origin: center; }
        .lis-star    { animation: lis-twinkle 3s ease-in-out infinite; }
        .lis-orbiter { animation: lis-orbit 18s linear infinite; transform-origin: 300px 330px; }
        @media (prefers-reduced-motion: reduce) {
          .lis-astro, .lis-star, .lis-orbiter { animation: none; }
        }
      `}</style>

      <svg viewBox="0 0 600 420" className="w-full">
        <defs>
          <radialGradient id="lis-space" cx="50%" cy="40%">
            <stop offset="0%" stopColor="rgb(var(--brand-500) / 0.10)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <linearGradient id="lis-planet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgb(var(--brand-500))" />
            <stop offset="1" stopColor="rgb(var(--brand-700))" />
          </linearGradient>
        </defs>

        <rect width="600" height="420" fill="url(#lis-space)" />

        {/* Starfield */}
        {[
          [60, 70, 2.5, 0], [140, 40, 1.8, 0.6], [250, 90, 2, 1.2],
          [420, 55, 2.4, 0.3], [520, 110, 1.6, 0.9], [90, 210, 2, 1.5],
          [560, 260, 2.2, 0.4], [40, 330, 1.8, 1.1], [480, 360, 2, 0.8],
          [330, 30, 1.5, 1.4], [200, 300, 1.7, 0.2], [545, 190, 1.4, 1.7],
        ].map(([cx, cy, r, delay], i) => (
          <circle
            key={i}
            className="lis-star"
            cx={cx}
            cy={cy}
            r={r}
            fill="rgb(var(--fg))"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}

        {/* Planet with an orbiting moon */}
        <circle cx="300" cy="330" r="74" fill="url(#lis-planet)" />
        <ellipse cx="278" cy="308" rx="16" ry="11" fill="#fff" opacity="0.18" />
        <ellipse cx="322" cy="348" rx="22" ry="13" fill="#000" opacity="0.12" />
        <ellipse
          cx="300" cy="330" rx="112" ry="30"
          fill="none" stroke="rgb(var(--fg-faint))" strokeOpacity="0.35" strokeWidth="1.5"
        />
        <g className="lis-orbiter">
          <circle cx="412" cy="330" r="7" fill="rgb(var(--fg-faint))" />
        </g>

        {/* Snapped tether */}
        <path
          d="M300 256 C 320 210, 360 190, 392 168"
          fill="none"
          stroke="rgb(var(--fg-faint))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="9 11"
        />

        {/* Astronaut */}
        <g className="lis-astro">
          <g transform="translate(392 128)">
            {/* backpack */}
            <rect x="-30" y="-6" width="20" height="34" rx="8" fill="rgb(var(--fg-faint))" />
            {/* limbs */}
            <rect x="-16" y="30" width="14" height="30" rx="7" fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="2" />
            <rect x="6" y="30" width="14" height="30" rx="7" fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="2" />
            <rect x="-38" y="4" width="30" height="13" rx="6.5" fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="2" transform="rotate(-24 -23 10)" />
            <rect x="18" y="4" width="30" height="13" rx="6.5" fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="2" transform="rotate(28 33 10)" />
            {/* body */}
            <rect x="-20" y="-4" width="40" height="40" rx="14" fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="2" />
            {/* helmet */}
            <circle cx="0" cy="-16" r="26" fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="2" />
            <path d="M-18 -20 a 18 18 0 0 1 36 0 a 18 18 0 0 1 -36 0" fill="rgb(var(--brand-700))" opacity="0.85" />
            <circle cx="-7" cy="-26" r="5" fill="#fff" opacity="0.55" />
            {/* chest light */}
            <circle cx="0" cy="12" r="4" fill="rgb(var(--brand-500))" />
          </g>
        </g>
      </svg>
    </div>
  );
}
