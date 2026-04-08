'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Property } from '@/lib/types';

type MapFilter = 'all' | 'deals' | 'yield' | 'luxury';

function scoreToColor(score: number): string {
  if (score >= 80) return '#34d399'; // emerald
  if (score >= 60) return '#f59e0b'; // amber
  return '#f87171'; // red
}

function priceToRadius(price: number): number {
  if (price >= 1_000_000) return 14;
  if (price >= 500_000) return 11;
  if (price >= 300_000) return 8;
  if (price >= 150_000) return 6;
  return 5;
}

function FitBounds({ properties }: { properties: Property[] }) {
  const map = useMap();
  useEffect(() => {
    const withCoords = properties.filter(p => p.lat && p.lng);
    if (withCoords.length > 0) {
      const lats = withCoords.map(p => p.lat!);
      const lngs = withCoords.map(p => p.lng!);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lats) - 0.05, Math.min(...lngs) - 0.05],
        [Math.max(...lats) + 0.05, Math.max(...lngs) + 0.05],
      ];
      map.fitBounds(bounds, { maxZoom: 12 });
    }
  }, [map, properties]);
  return null;
}

export default function MapView({
  properties,
  onPreview,
  isPaid,
  headerH = 280,
}: {
  properties: Property[];
  onPreview: (ref: string) => void;
  isPaid: boolean;
  headerH?: number;
}) {
  const [mapFilter, setMapFilter] = useState<MapFilter>('all');

  const filtered = properties.filter(p => {
    if (!p.lat || !p.lng) return false;
    if (mapFilter === 'deals') return (p._sc || 0) >= 70;
    if (mapFilter === 'yield') return !!(p._yield && p._yield.gross >= 5);
    if (mapFilter === 'luxury') return p.pf >= 1_000_000;
    return true;
  });

  const formatPrice = (n: number) =>
    n >= 1_000_000
      ? `€${(n / 1_000_000).toFixed(1)}M`
      : `€${Math.round(n / 1000)}k`;

  return (
    <div className="flex flex-col min-h-[400px] md:min-h-[500px]" style={{ height: `calc(100vh - ${headerH}px)` }}>
      {/* Map controls */}
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3 px-3 md:px-4 py-2 bg-[#111118] border-b border-[#2a2a30]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] uppercase tracking-widest text-gray-500">Show:</span>
          {([
            ['all', 'All'],
            ['deals', 'Top 70+'],
            ['yield', 'Yield 5%+'],
            ['luxury', '€1M+'],
          ] as [MapFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMapFilter(key)}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-all min-h-[32px] ${
                mapFilter === key
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'border-[#2a2a30] text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="text-[10px] text-gray-600 ml-1">{filtered.length} shown</span>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-2 text-[9px] text-gray-500 md:border-l md:border-[#2a2a30] md:pl-3 md:ml-auto">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />80+</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />60+</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />&lt;60</span>
          <span className="text-gray-600">size=price</span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={[38.3, -0.5]}
          zoom={9}
          style={{ height: '100%', width: '100%', background: '#0a0a0f' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds properties={filtered} />
          {filtered.map((p, i) => {
            const score = p._sc || 0;
            const color = scoreToColor(score);
            const radius = priceToRadius(p.pf);
            const key = p.ref || p.p + i;

            return (
              <CircleMarker
                key={key}
                center={[p.lat!, p.lng!]}
                radius={radius}
                pathOptions={{
                  fillColor: color,
                  color: color,
                  fillOpacity: 0.75,
                  weight: 1.5,
                  opacity: 0.9,
                }}
              >
                <Popup>
                  <div style={{ minWidth: '180px', fontFamily: 'system-ui, sans-serif' }}>
                    <div style={{ fontWeight: 700, color: '#d97706', marginBottom: '4px', fontSize: '13px' }}>{p.p}</div>
                    <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '6px' }}>{p.l}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{formatPrice(p.pf)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: color }}>{score}</div>
                      </div>
                      {p.bk !== null && (
                        <div>
                          <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Beach</div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#60a5fa' }}>{p.bk}km</div>
                        </div>
                      )}
                      {p._yield && (
                        <div>
                          <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Yield</div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#34d399' }}>{p._yield.gross}%</div>
                        </div>
                      )}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{
                        display: 'inline-block', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                        background: score >= 80 ? 'rgba(52,211,153,0.15)' : score >= 60 ? 'rgba(245,158,11,0.15)' : 'rgba(248,113,113,0.15)',
                        color: color,
                        border: `1px solid ${color}40`
                      }}>
                        {score >= 80 ? 'TOP DEAL' : score >= 60 ? 'GOOD' : 'WATCH'}
                      </span>
                    </div>
                    {isPaid ? (
                      <button
                        onClick={() => onPreview(p.ref || p.p)}
                        style={{
                          width: '100%', padding: '6px', background: 'linear-gradient(135deg, #b45309, #d97706)',
                          color: '#000', fontWeight: 700, fontSize: '11px', border: 'none', borderRadius: '6px', cursor: 'pointer'
                        }}
                      >
                        View Full Details →
                      </button>
                    ) : (
                      <div style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>Subscribe to view details</div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
