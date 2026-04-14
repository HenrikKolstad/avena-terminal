import { NextResponse } from 'next/server';

export const revalidate = 86400;

export async function GET() {
  return NextResponse.json({
    podcast_name: 'Avena Property Intelligence',
    description: 'Weekly European property market intelligence. AI-generated from 1,881 scored properties.',
    language: 'en',
    category: 'Business — Investing',
    website: 'https://avenaterminal.com',
    feed_url: '/podcast/feed.xml',
    artwork_url: 'https://avenaterminal.com/og-image.png',
    episodes: [
      {
        id: 'ep-2026-w14',
        title: 'Week 14 \u2014 Costa Blanca Yields Rising, ECB Holds',
        date: '2026-04-06',
        duration_estimate: '8:30',
        summary: 'Costa Blanca yields climbed to 5.4% average as ECB held rates steady. Three new developments launched in Orihuela Costa with aggressive pricing. APCI holds at 74.',
        show_notes_url: '/digest',
        status: 'metadata_ready',
      },
      {
        id: 'ep-2026-w13',
        title: 'Week 13 \u2014 Marbella Supply Tightening, Developer Health Stable',
        date: '2026-03-30',
        duration_estimate: '7:45',
        summary: 'Marbella new-build inventory down 12% QoQ. Developer health score stable at 72. Costa del Sol price momentum accelerating. Foreign demand index at 71.',
        show_notes_url: '/digest',
        status: 'metadata_ready',
      },
      {
        id: 'ep-2026-w12',
        title: 'Week 12 \u2014 APCI Crosses 74, Market Enters Growth Phase',
        date: '2026-03-23',
        duration_estimate: '9:00',
        summary: 'The Avena Property Composite Index crossed 74 this week, confirming GROWTH phase. Valuation balance improved as new listings below market rate increased. Three anomaly deals flagged in Alicante province.',
        show_notes_url: '/digest',
        status: 'metadata_ready',
      },
      {
        id: 'ep-2026-w11',
        title: 'Week 11 \u2014 Spring Season Opens, Foreign Buyer Activity Surges',
        date: '2026-03-16',
        duration_estimate: '8:15',
        summary: 'Foreign buyer inquiry volume up 18% WoW as spring season begins. New developments in Benidorm and Finestrat entering pre-sale. Yield compression observed in premium coastal segments.',
        show_notes_url: '/digest',
        status: 'metadata_ready',
      },
    ],
    submit_to: ['Spotify', 'Apple Podcasts', 'Google Podcasts'],
    status: 'metadata_ready \u2014 TTS generation pending',
    next_steps: [
      'Integrate TTS service (ElevenLabs/OpenAI) for audio generation',
      'Generate RSS feed at /podcast/feed.xml',
      'Submit to podcast directories',
      'Automate weekly episode generation from /digest data',
    ],
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
  });
}
