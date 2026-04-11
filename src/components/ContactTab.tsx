'use client';

export default function ContactTab() {
  return (
    <div className="p-3 md:p-10 flex justify-center">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="relative bg-gradient-to-b from-[#18141f] to-[#0f0d15] border-2 border-[#10B981]/50 rounded-3xl overflow-hidden shadow-2xl shadow-[#10B981]/10">

          {/* Gold shimmer top bar */}
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, #10B981, #34d399, #10B981, transparent)' }} />

          {/* Top accent glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: '#10B981' }} />

          <div className="px-5 md:px-8 pt-8 md:pt-10 pb-6 md:pb-8 relative">
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <img src="/avatar.png" alt="Henrik" className="w-24 h-24 rounded-full object-cover shadow-xl shadow-[#10B981]/30 border-2 border-[#10B981]/30" />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-[#0f0d15] flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'linear-gradient(135deg, #10B981, #34d399)', color: '#0d1117' }}>
                  PRO
                </div>
              </div>
            </div>

            {/* Name & title */}
            <div className="text-center mb-8">
              <div className="font-serif text-3xl font-bold mb-1" style={{ background: 'linear-gradient(90deg, #10B981, #34d399, #10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Henrik
              </div>
              <div className="text-[11px] uppercase tracking-[4px] text-gray-500">Founder · Avena Terminal</div>
              <div className="mt-3 text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                Spain&apos;s new-build property intelligence platform. Helping investors find real value.
              </div>
            </div>

            {/* Contact links */}
            <div className="space-y-3 mb-8">
              <a href="mailto:Henrik@xaviaestate.com"
                className="flex items-center gap-4 rounded-2xl p-4 border border-[#10B981]/20 hover:border-[#10B981]/60 transition-all group"
                style={{ background: 'rgba(16,185,129,0.05)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #10B98122, #10B98144)', border: '1px solid rgba(16,185,129,0.4)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">Direct Email</div>
                  <div className="text-sm font-semibold truncate group-hover:text-white transition-colors" style={{ color: '#34d399' }}>Henrik@xaviaestate.com</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 group-hover:opacity-80 transition-opacity flex-shrink-0">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>

              <a href="https://www.xaviaestate.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-2xl p-4 border border-[#10B981]/20 hover:border-[#10B981]/60 transition-all group"
                style={{ background: 'rgba(16,185,129,0.05)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #10B98122, #10B98144)', border: '1px solid rgba(16,185,129,0.4)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">Partner Agency</div>
                  <div className="text-sm font-semibold truncate group-hover:text-white transition-colors" style={{ color: '#34d399' }}>www.xaviaestate.com</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 group-hover:opacity-80 transition-opacity flex-shrink-0">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
              <a href="https://x.com/0xw3btamer" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-2xl p-4 border border-[#10B981]/20 hover:border-[#10B981]/60 transition-all group"
                style={{ background: 'rgba(16,185,129,0.05)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #10B98122, #10B98144)', border: '1px solid rgba(16,185,129,0.4)' }}>
                  <span className="text-lg font-bold" style={{ color: '#10B981' }}>&Xopf;</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">Follow on X</div>
                  <div className="text-sm font-semibold truncate group-hover:text-white transition-colors" style={{ color: '#34d399' }}>@0xw3btamer</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 group-hover:opacity-80 transition-opacity flex-shrink-0">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </div>

            {/* Divider */}
            <div className="h-px w-full mb-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)' }} />

            {/* Footer note */}
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-[3px] text-gray-700 mb-2">Licensed Real Estate · Spain</div>
              <p className="text-[10px] text-gray-600 leading-relaxed">
                All property transactions are handled by Xavia Estate and their certified legal partners operating across Costa Blanca &amp; Costa Cálida.
              </p>
            </div>
          </div>

          {/* Gold shimmer bottom bar */}
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #10B981, transparent)' }} />
        </div>
      </div>
    </div>
  );
}
