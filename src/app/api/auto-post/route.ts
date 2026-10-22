import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';
import { getAllProperties, getUniqueTowns, avg } from '@/lib/properties';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export const maxDuration = 30;

// OAuth 1.0a signature
function oauthSign(method: string, url: string, params: Record<string, string>, consumerSecret: string, tokenSecret: string): string {
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
    Object.keys(params).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&')
  )}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return createHmac('sha1', signingKey).update(baseString).digest('base64');
}

function buildOAuth(method: string, url: string, extraParams?: Record<string, string>): string {
  const apiKey = process.env.X_API_KEY!;
  const apiSecret = process.env.X_API_SECRET!;
  const accessToken = process.env.X_ACCESS_TOKEN!;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET!;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
    ...extraParams,
  };

  oauthParams.oauth_signature = oauthSign(method, url, oauthParams, apiSecret, accessTokenSecret);

  return 'OAuth ' + Object.keys(oauthParams).sort().map(k =>
    `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`
  ).join(', ');
}

async function uploadImage(imageUrl: string): Promise<string | null> {
  try {
    // Download image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const imgBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(imgBuffer).toString('base64');

    // Upload to Twitter media endpoint (v1.1)
    const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
    const params: Record<string, string> = { media_data: base64 };

    const authHeader = buildOAuth('POST', uploadUrl, {});

    const formBody = new URLSearchParams(params).toString();
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    });

    const data = await res.json();
    return data.media_id_string || null;
  } catch {
    return null;
  }
}

async function postTweet(text: string, mediaId?: string | null): Promise<{ id?: string; error?: string }> {
  if (!process.env.X_API_KEY || !process.env.X_API_SECRET || !process.env.X_ACCESS_TOKEN || !process.env.X_ACCESS_TOKEN_SECRET) {
    return { error: 'Missing X API credentials' };
  }

  const url = 'https://api.twitter.com/2/tweets';
  const authHeader = buildOAuth('POST', url);

  const body: any = { text };
  if (mediaId) {
    body.media = { media_ids: [mediaId] };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.data?.id) return { id: data.data.id };
    return { error: JSON.stringify(data) };
  } catch (err: any) {
    return { error: err?.message || 'Tweet failed' };
  }
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function generateTweet(): { type: string; content: string; imageUrl?: string } {
  const props = getAllProperties();
  const towns = getUniqueTowns();
  const total = props.length;

  // Pick different random properties each time
  const shuffled = [...props].sort(() => Math.random() - 0.5);
  const p = shuffled[0];
  const p2 = shuffled[1];
  const town = p.l?.split(',')[0] || 'Spain';
  const town2 = p2.l?.split(',')[0] || 'Spain';
  const t1 = pick(towns.slice(0, 20));
  const t2 = pick(towns.slice(0, 20));
  const score = Math.round(p._sc ?? 0);
  const yld = p._yield?.gross.toFixed(1) ?? 'N/A';
  const price = p.pf.toLocaleString();
  const link = p.ref ? `avenaterminal.com/property/${p.ref}` : 'avenaterminal.com';
  const uid = Math.random().toString(36).slice(2, 6);

  const avgYield = avg(props.filter(q => q._yield).map(q => q._yield!.gross)).toFixed(1);
  const avgPrice = Math.round(avg(props.map(q => q.pf))).toLocaleString();
  const cheapTown = towns.sort((a,b) => a.avgPrice - b.avgPrice)[0];

  const all: { type: string; content: string; imageUrl?: string }[] = [
    // === QUESTIONS ===
    { type: 'Q', content: `Would you buy a ${p.bd}-bed ${p.t.toLowerCase()} in ${town} for EUR ${price}?\n\nScore: ${score}/100\nGross yield: ${yld}%\n\nBe honest.\n\n${link}`, imageUrl: p.imgs?.[0] },
    { type: 'Q', content: `${town} or ${town2}?\n\nWhere would you put EUR 300k right now?` },
    { type: 'Q', content: `7% gross yield in a small town or 3.5% in Marbella?\n\nCash flow vs lifestyle. What's your pick?` },
    { type: 'Q', content: `Is ${town} undervalued or am I reading the data wrong?\n\n${t1.count} properties, EUR ${t1.avgPrice.toLocaleString()} avg, ${t1.avgYield}% gross yield.\n\n${link}`, imageUrl: p.imgs?.[0] },
    // === LINK ===
    { type: 'Q', content: `How do you evaluate if a Spanish property is a good deal?\n\nWe built an algorithm that scores them 0-100.\n\navenaterminal.com`, imageUrl: p.imgs?.[0] },

    // === OPINIONS (no link) ===
    { type: 'OP', content: `90% of property investment content online is agents selling.\n\nNobody shows you the actual data.\n\nThat's the problem we're solving.` },
    { type: 'OP', content: `Agents will never tell you a property is overpriced.\n\nThey get paid when you buy.\n\nData doesn't have that problem.` },
    { type: 'OP', content: `Costa del Sol is beautiful but the yields don't lie.\n\nCosta Blanca South beats it on pure ROI almost every time.` },
    { type: 'OP', content: `The best property deals in Spain aren't on Idealista.\n\nThey're buried in new build developer listings that nobody scores.\n\nUntil now.` },
    // === LINK ===
    { type: 'OP', content: `We track ${total.toLocaleString()} Spanish new builds daily.\n\nEvery one scored 0-100 by algorithm.\n\nNo agents. No commission. Just math.\n\navenaterminal.com` },

    // === DATA (no link) ===
    { type: 'DATA', content: `Spain new build snapshot:\n\nAvg price: EUR ${avgPrice}\nAvg gross yield: ${avgYield}%\nProperties tracked: ${total.toLocaleString()}\nRegions: 4 costas` },
    { type: 'DATA', content: `${t1.town.split(',')[0]} right now:\n\n${t1.count} new builds\nEUR ${t1.avgPrice.toLocaleString()} avg\n${t1.avgYield}% gross yield\nScore: ${t1.avgScore}/100` },
    { type: 'DATA', content: `Cheapest avg new build town in Spain right now: ${cheapTown?.town.split(',')[0]} at EUR ${cheapTown?.avgPrice.toLocaleString()}.\n\nIs cheap always good? Not always. Score: ${cheapTown?.avgScore}/100.` },
    { type: 'DATA', content: `${town}: ${p.bd}-bed ${p.t.toLowerCase()}\nEUR ${price}\n${p.bm}m² | Score: ${score}/100\n\nOne of ${total.toLocaleString()} we scan daily.` },
    // === LINK ===
    { type: 'DATA', content: `Today's terminal scan:\n\nHighest score: ${score}/100 in ${town}\nBest yield: ${t1.avgYield}% in ${t1.town.split(',')[0]}\nLowest entry: EUR ${cheapTown?.avgPrice.toLocaleString()} in ${cheapTown?.town.split(',')[0]}\n\navenaterminal.com`, imageUrl: p.imgs?.[0] },

    // === PROPERTY FEATURES ===
    { type: 'PROP', content: `${p.t} in ${town}\n${p.bd} bed | ${p.bm}m²\nEUR ${price}\n\nAlgorithm score: ${score}/100\nGross yield est: ${yld}%\n\n${link}`, imageUrl: p.imgs?.[0] },
    { type: 'PROP', content: `Found this today.\n\n${p.t} in ${town}\nEUR ${price} | ${p.bd} bed | ${p.bm}m²\nScore: ${score}/100\n\nThe algorithm likes it.\n\n${link}`, imageUrl: p.imgs?.[0] },
    { type: 'PROP', content: `${p2.t} in ${town2}\n${p2.bd} bed, ${p2.bm}m²\nEUR ${p2.pf.toLocaleString()}\nScore: ${Math.round(p2._sc ?? 0)}/100\n\nWould you look at this one?\n\n${p2.ref ? `avenaterminal.com/property/${p2.ref}` : 'avenaterminal.com'}`, imageUrl: p2.imgs?.[0] },
    { type: 'PROP', content: `This ${p.bd}-bed ${p.t.toLowerCase()} scored ${score}/100.\n\n${town}\nEUR ${price}\nGross yield: ${yld}%\n\nAbove or below what you'd expect?\n\n${link}`, imageUrl: p.imgs?.[0] },
    // === LINK ===
    { type: 'PROP', content: `This ${p.t.toLowerCase()} in ${town} just hit ${score}/100 on our scoring engine.\n\nEUR ${price} | ${p.bd} bed | ${yld}% gross yield\n\nFull breakdown:\navenaterminal.com/property/${p.ref || ''}`, imageUrl: p.imgs?.[0] },

    // === INSIGHTS (no link) ===
    { type: 'INS', content: `Something most people miss about Spanish property:\n\nNew builds have 10% VAT, not 6-10% transfer tax like resale.\n\nBut they also tend to appreciate faster in year 1-3.\n\nData > assumptions.` },
    { type: 'INS', content: `The gap between what developers ask and what properties are worth is wild in some Spanish towns.\n\nSome are 25% below market. Others are 10% above.\n\nYou need data to know which is which.` },
    { type: 'INS', content: `People ask me which Costa to invest in.\n\nMy answer: it depends on your goal.\n\nCash flow? → Costa Blanca South\nAppreciation? → Costa del Sol\nBalance? → Costa Blanca North\n\nThe data backs all three.` },
    { type: 'INS', content: `Spanish rental yields look amazing until you subtract:\n\n- 15-20% management\n- IBI tax\n- Community fees\n- Insurance\n- Vacancy\n\n7% gross ≈ 4.5% net.\n\nStill good. But know your real numbers.` },
    // === LINK ===
    { type: 'INS', content: `We score every new build in Spain using hedonic regression.\n\n5 factors: value, yield, location, quality, risk.\n\nWeighted. Calculated. No gut feeling.\n\navenaterminal.com/about/methodology` },

    // === CASUAL / HUMAN (no link) ===
    { type: 'CAS', content: `Just finished scanning ${total.toLocaleString()} Spanish properties.\n\nTime for coffee.` },
    { type: 'CAS', content: `Another day, another ${total.toLocaleString()} properties scored.\n\nThe terminal never sleeps.` },
    { type: 'CAS', content: `Someone asked me why I track Spanish property data every single day.\n\nBecause the market moves every single day.\n\nAnd most people don't notice until it's too late.` },
    { type: 'CAS', content: `Saturday morning.\n\nThe algorithm is already working.\n\n${total.toLocaleString()} properties. Scored. Ranked. Ready.` },
    // === LINK ===
    { type: 'CAS', content: `Built this terminal because I was tired of asking agents if something was a "good deal."\n\nNow the algorithm tells me.\n\navenaterminal.com` },

    // === COMPARISONS (no link) ===
    { type: 'CMP', content: `${t1.town.split(',')[0]} vs ${t2.town.split(',')[0]}:\n\nProperties: ${t1.count} vs ${t2.count}\nAvg price: EUR ${t1.avgPrice.toLocaleString()} vs EUR ${t2.avgPrice.toLocaleString()}\nGross yield: ${t1.avgYield}% vs ${t2.avgYield}%\n\nWho wins?` },
    { type: 'CMP', content: `Apartment or villa in Spain?\n\nApartments: higher yield, lower entry, easier to rent\nVillas: more appreciation, lifestyle premium, harder to manage\n\nThe data shows both can work.` },
    { type: 'CMP', content: `New build vs resale in Spain:\n\nNew build: 10% VAT, modern, warranty, developer finance\nResale: 6-10% ITP, negotiable, immediate, established area\n\nFor investment? New build wins on yield in most cases.` },
    { type: 'CMP', content: `Costa Blanca North vs South:\n\nNorth: premium, lifestyle, Javea/Moraira/Altea\nSouth: volume, yield, Torrevieja/Orihuela\n\nDifferent plays. Both valid.` },
    // === LINK ===
    { type: 'CMP', content: `We can compare any two Spanish towns side by side.\n\nPrice. Yield. Score. Properties. All from real data.\n\navenaterminal.com/compare` },

    // === MARKET COMMENTARY (no link) ===
    { type: 'MKT', content: `Northern Europeans are buying Spanish property faster than developers can build.\n\nNorway, Sweden, Netherlands, UK — all accelerating.\n\nSupply is not keeping up.` },
    { type: 'MKT', content: `Interest rates are finally dropping.\n\nSpanish mortgages for non-residents are getting cheaper.\n\nThis means more buyers. More competition. Move early.` },
    { type: 'MKT', content: `Key-ready properties in Spain are selling within weeks.\n\nOff-plan? 18-24 month wait.\n\nIf you want yield fast — key-ready is the play.` },
    { type: 'MKT', content: `Spanish property has appreciated 8-12% annually in Costa Blanca over the last 3 years.\n\nWill it continue? Nobody knows.\n\nBut the fundamentals haven't changed.` },
    // === LINK ===
    { type: 'MKT', content: `The Spanish new build market in one line:\n\nDemand up. Supply constrained. Yields strong.\n\nFull market data:\navenaterminal.com/stats` },

    // === BUILDER / FOUNDER (no link) ===
    { type: 'BLD', content: `I own 3 properties in Spain.\n\nI still check the terminal every morning before coffee.\n\nOld habits.` },
    { type: 'BLD', content: `People think PropTech is complicated.\n\nIt's not. It's just property + math.\n\nWe take ${total.toLocaleString()} listings and score them. That's it.` },
    { type: 'BLD', content: `Best thing about building a property terminal:\n\nYou find deals nobody else sees.\n\nWorst thing:\n\nYou want to buy all of them.` },
    { type: 'BLD', content: `Day 1 we tracked 200 properties.\n\nToday: ${total.toLocaleString()}.\n\nStill just getting started.` },
    // === LINK ===
    { type: 'BLD', content: `We built Spain's first property scoring engine.\n\n${total.toLocaleString()} new builds. Scored daily. Free to explore.\n\navenaterminal.com` },
  ];

  // Pick random tweet — guaranteed unique each time
  const tweet = pick(all);
  // Add invisible unique character to prevent duplicate filter
  tweet.content += `\n\u200B${uid}`;
  return tweet;
}

export async function POST(req: NextRequest) {
  // Verify cron secret
  const key = req.headers.get('x-cron-key');
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tweet = generateTweet();

  // Try to upload property image if available
  let mediaId: string | null = null;
  if (tweet.imageUrl) {
    mediaId = await uploadImage(tweet.imageUrl);
  }

  const result = await postTweet(tweet.content, mediaId);

  // Log to Supabase
  if (supabase) {
    try {
      await supabase.from('auto_posts').insert({
        post_type: tweet.type,
        content: tweet.content,
        posted_at: new Date().toISOString(),
        tweet_id: result.id || null,
      });
    } catch { /* silent */ }
  }

  if (result.error) {
    return NextResponse.json({ error: result.error, tweet: tweet.content }, { status: 500 });
  }

  return NextResponse.json({ success: true, tweet_id: result.id, type: tweet.type, content: tweet.content });
}
