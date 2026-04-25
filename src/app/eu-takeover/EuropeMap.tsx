/**
 * War-room map of Europe — countries colored by Avena coverage status.
 * Pure SVG, no map library. Each country is a simplified shape; pulsing
 * gold dots mark cities currently being scanned.
 *
 * Server-side render-safe. Status comes from the agents config.
 */

interface CountryStatus {
  name: string;
  flag: string;
  pct: number;
  active: boolean;
}

interface CityPing {
  city: string;
  x: number;          // SVG x in our 1000x600 viewBox
  y: number;          // SVG y
  intensity: number;  // 0..1 — drives ring size + glow
}

const CITY_PINGS: CityPing[] = [
  // Spain
  { city: 'Madrid',         x: 350, y: 360, intensity: 1.0 },
  { city: 'Barcelona',      x: 460, y: 320, intensity: 1.0 },
  { city: 'Valencia',       x: 395, y: 395, intensity: 1.0 },
  { city: 'Málaga',         x: 295, y: 470, intensity: 1.0 },
  { city: 'Alicante',       x: 405, y: 425, intensity: 1.0 },
  { city: 'Mallorca',       x: 490, y: 405, intensity: 0.9 },
  // Portugal
  { city: 'Lisbon',         x: 230, y: 410, intensity: 0.85 },
  { city: 'Porto',          x: 235, y: 360, intensity: 0.7 },
  { city: 'Faro',           x: 250, y: 460, intensity: 0.85 },
  // France
  { city: 'Paris',          x: 470, y: 220, intensity: 0.5 },
  { city: 'Nice',           x: 540, y: 320, intensity: 0.55 },
  // Italy
  { city: 'Milan',          x: 590, y: 290, intensity: 0.4 },
  { city: 'Rome',           x: 625, y: 380, intensity: 0.35 },
  // Greece
  { city: 'Athens',         x: 800, y: 430, intensity: 0.3 },
];

export function EuropeMap({ countries }: { countries: CountryStatus[] }) {
  const fillFor = (pct: number, active: boolean) => {
    if (!active) return 'rgba(201, 192, 182, 0.06)';
    if (pct >= 80) return 'rgba(245, 166, 35, 0.32)';
    if (pct >= 30) return 'rgba(245, 181, 85, 0.22)';
    return 'rgba(224, 122, 31, 0.16)';
  };
  const strokeFor = (pct: number, active: boolean) => {
    if (!active) return 'rgba(201, 192, 182, 0.18)';
    if (pct >= 80) return 'rgba(245, 166, 35, 0.85)';
    if (pct >= 30) return 'rgba(245, 181, 85, 0.65)';
    return 'rgba(224, 122, 31, 0.55)';
  };

  // Lookup by country name
  const get = (name: string) => countries.find((c) => c.name === name);
  const ES = get('Spain');
  const PT = get('Portugal');
  const FR = get('France');
  const IT = get('Italy');
  const GR = get('Greece');

  return (
    <div className="relative rounded-sm border overflow-hidden" style={{ background: '#100E0C', borderColor: 'hsl(var(--av-border-strong))' }}>
      <svg viewBox="0 0 1000 600" className="w-full h-auto" role="img" aria-label="Avena EU Takeover — coverage map">
        <defs>
          <radialGradient id="ping-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F5A623" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#F5A623" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
          </radialGradient>
          <pattern id="grid-bg" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(245,166,35,0.04)" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Background */}
        <rect width="1000" height="600" fill="#100E0C" />
        <rect width="1000" height="600" fill="url(#grid-bg)" />

        {/* Latitude/longitude reference lines */}
        <g stroke="rgba(245,166,35,0.06)" strokeWidth="0.5" strokeDasharray="2 4">
          <line x1="0" y1="200" x2="1000" y2="200" />
          <line x1="0" y1="400" x2="1000" y2="400" />
          <line x1="300" y1="0" x2="300" y2="600" />
          <line x1="600" y1="0" x2="600" y2="600" />
        </g>

        {/* PORTUGAL — west coast strip */}
        {PT && (
          <path
            d="M 215,340 L 220,330 L 232,328 L 240,335 L 250,355 L 258,380 L 262,410 L 260,440 L 252,468 L 238,478 L 222,475 L 215,460 L 210,430 L 208,395 L 210,365 Z"
            fill={fillFor(PT.pct, PT.active)}
            stroke={strokeFor(PT.pct, PT.active)}
            strokeWidth="1.2"
          />
        )}

        {/* SPAIN — main peninsula */}
        {ES && (
          <path
            d="M 262,330 L 290,310 L 330,300 L 380,295 L 430,300 L 470,310 L 478,330 L 480,360 L 470,395 L 450,425 L 415,450 L 370,470 L 320,478 L 280,470 L 262,455 L 258,420 L 262,380 L 262,350 Z"
            fill={fillFor(ES.pct, ES.active)}
            stroke={strokeFor(ES.pct, ES.active)}
            strokeWidth="1.4"
          />
        )}
        {/* Balearics */}
        {ES && (
          <>
            <ellipse cx="488" cy="402" rx="14" ry="7" fill={fillFor(ES.pct, ES.active)} stroke={strokeFor(ES.pct, ES.active)} strokeWidth="1" />
            <ellipse cx="513" cy="408" rx="8" ry="4" fill={fillFor(ES.pct, ES.active)} stroke={strokeFor(ES.pct, ES.active)} strokeWidth="1" />
          </>
        )}

        {/* FRANCE */}
        {FR && (
          <path
            d="M 430,180 L 470,170 L 510,180 L 540,210 L 555,250 L 558,290 L 545,320 L 510,330 L 475,328 L 445,310 L 430,275 L 430,235 Z"
            fill={fillFor(FR.pct, FR.active)}
            stroke={strokeFor(FR.pct, FR.active)}
            strokeWidth="1.2"
          />
        )}

        {/* ITALY — boot shape */}
        {IT && (
          <path
            d="M 558,250 L 590,265 L 615,290 L 625,330 L 635,365 L 660,395 L 685,420 L 678,440 L 655,440 L 632,420 L 615,395 L 595,360 L 575,320 L 565,280 Z"
            fill={fillFor(IT.pct, IT.active)}
            stroke={strokeFor(IT.pct, IT.active)}
            strokeWidth="1.2"
          />
        )}
        {/* Sicily */}
        {IT && (
          <path d="M 635,455 L 670,460 L 685,455 L 680,470 L 650,475 L 635,468 Z"
            fill={fillFor(IT.pct, IT.active)} stroke={strokeFor(IT.pct, IT.active)} strokeWidth="1" />
        )}

        {/* GREECE */}
        {GR && (
          <path
            d="M 760,380 L 800,375 L 825,395 L 830,425 L 815,445 L 790,442 L 770,435 L 760,420 Z"
            fill={fillFor(GR.pct, GR.active)}
            stroke={strokeFor(GR.pct, GR.active)}
            strokeWidth="1.1"
          />
        )}

        {/* Cyprus */}
        <ellipse cx="900" cy="475" rx="13" ry="6" fill="rgba(201,192,182,0.06)" stroke="rgba(201,192,182,0.18)" strokeWidth="1" />

        {/* Northern outline shapes (UK, Germany, Nordics — out of scope, faint) */}
        <g fill="rgba(201,192,182,0.04)" stroke="rgba(201,192,182,0.10)" strokeWidth="1">
          <path d="M 380,140 L 420,130 L 425,170 L 410,200 L 380,200 L 370,170 Z" /> {/* UK */}
          <path d="M 540,140 L 590,135 L 605,180 L 580,210 L 545,200 Z" /> {/* Germany */}
          <path d="M 590,60 L 640,55 L 670,90 L 660,135 L 630,150 L 605,140 L 590,110 Z" /> {/* Scandinavia */}
        </g>

        {/* City pings */}
        {CITY_PINGS.map((p) => {
          const r = 4 + p.intensity * 4;
          const glowR = 18 + p.intensity * 22;
          return (
            <g key={p.city} className="war-ping" style={{ animationDelay: `${(p.x % 7) * 0.4}s` }}>
              <circle cx={p.x} cy={p.y} r={glowR} fill="url(#ping-glow)" opacity={0.75 * p.intensity} />
              <circle cx={p.x} cy={p.y} r={r} fill="#F5A623" stroke="#FFFFFF" strokeWidth="0.5" />
            </g>
          );
        })}

        {/* Caption labels */}
        <g fill="rgba(245,166,35,0.85)" fontFamily="ui-monospace, monospace" fontSize="10" letterSpacing="2">
          <text x="350" y="495" textAnchor="middle">SPAIN · 100%</text>
          <text x="232" y="498" textAnchor="middle">PT · {PT?.pct ?? 0}%</text>
          <text x="500" y="345" textAnchor="middle">FR · {FR?.pct ?? 0}%</text>
          <text x="630" y="475" textAnchor="middle">IT · {IT?.pct ?? 0}%</text>
          <text x="795" y="465" textAnchor="middle">GR · {GR?.pct ?? 0}%</text>
        </g>
      </svg>

      {/* Legend bar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.3em]">
        <span className="text-primary flex items-center gap-2">
          <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
          Live ingestion theatre
        </span>
        <span className="text-muted-foreground hidden sm:inline">5 countries active · 14 agents · roadmap to 14 markets</span>
      </div>
    </div>
  );
}
