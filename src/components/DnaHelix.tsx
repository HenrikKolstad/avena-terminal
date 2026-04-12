export default function DnaHelix({ size = 24 }: { size?: number }) {
  const h = size;
  const w = Math.round(size * 0.5);
  const id = `dna-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <svg width={w} height={h} viewBox="0 0 16 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="dna-icon">
      <style>{`
        .dna-icon {
          animation: dna-coil 3s ease-in-out infinite;
          transform-origin: center center;
        }
        @keyframes dna-coil {
          0% {
            transform: rotateY(0deg);
            filter: drop-shadow(0 0 1px #10b98130);
          }
          30% {
            transform: rotateY(180deg);
            filter: drop-shadow(0 0 3px #10b98160);
          }
          50% {
            transform: rotateY(360deg);
            filter: drop-shadow(0 0 4px #a78bfa50);
          }
          70% {
            transform: rotateY(180deg);
            filter: drop-shadow(0 0 3px #10b98160);
          }
          100% {
            transform: rotateY(0deg);
            filter: drop-shadow(0 0 1px #10b98130);
          }
        }
      `}</style>
      <g>
        {/* Left strand — teal to purple */}
        <path
          d="M2 0 C2 4, 14 4, 14 8 C14 12, 2 12, 2 16 C2 20, 14 20, 14 24 C14 28, 2 28, 2 32"
          stroke={`url(#${id}-s1)`} strokeWidth="1.6" strokeLinecap="round" fill="none"
        />
        {/* Right strand — purple to teal */}
        <path
          d="M14 0 C14 4, 2 4, 2 8 C2 12, 14 12, 14 16 C14 20, 2 20, 2 24 C2 28, 14 28, 14 32"
          stroke={`url(#${id}-s2)`} strokeWidth="1.6" strokeLinecap="round" fill="none"
        />
        {/* Base pair rungs */}
        <line x1="4" y1="2" x2="12" y2="2" stroke="#10b981" strokeWidth="0.7" opacity="0.3" />
        <line x1="3" y1="4" x2="13" y2="4" stroke="#10b981" strokeWidth="0.7" opacity="0.4" />
        <line x1="4" y1="6" x2="12" y2="6" stroke="#a78bfa" strokeWidth="0.7" opacity="0.35" />
        <line x1="3" y1="8" x2="13" y2="8" stroke="#a78bfa" strokeWidth="0.7" opacity="0.45" />
        <line x1="4" y1="10" x2="12" y2="10" stroke="#10b981" strokeWidth="0.7" opacity="0.35" />
        <line x1="3" y1="12" x2="13" y2="12" stroke="#10b981" strokeWidth="0.7" opacity="0.4" />
        <line x1="4" y1="14" x2="12" y2="14" stroke="#a78bfa" strokeWidth="0.7" opacity="0.3" />
        <line x1="3" y1="16" x2="13" y2="16" stroke="#a78bfa" strokeWidth="0.7" opacity="0.45" />
        <line x1="4" y1="18" x2="12" y2="18" stroke="#10b981" strokeWidth="0.7" opacity="0.3" />
        <line x1="3" y1="20" x2="13" y2="20" stroke="#10b981" strokeWidth="0.7" opacity="0.4" />
        <line x1="4" y1="22" x2="12" y2="22" stroke="#a78bfa" strokeWidth="0.7" opacity="0.35" />
        <line x1="3" y1="24" x2="13" y2="24" stroke="#a78bfa" strokeWidth="0.7" opacity="0.45" />
        <line x1="4" y1="26" x2="12" y2="26" stroke="#10b981" strokeWidth="0.7" opacity="0.35" />
        <line x1="3" y1="28" x2="13" y2="28" stroke="#10b981" strokeWidth="0.7" opacity="0.4" />
        <line x1="4" y1="30" x2="12" y2="30" stroke="#a78bfa" strokeWidth="0.7" opacity="0.3" />
        {/* Glow nodes at crossover points */}
        <circle cx="8" cy="4" r="1" fill="#10b981" opacity="0.5" />
        <circle cx="8" cy="12" r="1" fill="#a78bfa" opacity="0.5" />
        <circle cx="8" cy="20" r="1" fill="#10b981" opacity="0.5" />
        <circle cx="8" cy="28" r="1" fill="#a78bfa" opacity="0.5" />
      </g>
      <defs>
        <linearGradient id={`${id}-s1`} x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="35%" stopColor="#34d399" />
          <stop offset="65%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id={`${id}-s2`} x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="35%" stopColor="#c4b5fd" />
          <stop offset="65%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
    </svg>
  );
}
