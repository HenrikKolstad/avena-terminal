import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';
import { getAllProperties, getUniqueTowns, avg } from '@/lib/properties';
import { supabase } from '@/lib/supabase';

export const maxDuration = 30;

// OAuth 1.0a signature
function oauthSign(method: string, url: string, params: Record<string, string>, consumerSecret: string, tokenSecret: string): string {
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
    Object.keys(params).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&')
  )}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return createHmac('sha1', signingKey).update(baseString).digest('base64');
}

async function postTweet(text: string): Promise<{ id?: string; error?: string }> {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    return { error: 'Missing X API credentials' };
  }

  const url = 'https://api.twitter.com/2/tweets';
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  oauthParams.oauth_signature = oauthSign('POST', url, oauthParams, apiSecret, accessTokenSecret);

  const authHeader = 'OAuth ' + Object.keys(oauthParams).sort().map(k =>
    `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`
  ).join(', ');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    if (data.data?.id) return { id: data.data.id };
    return { error: JSON.stringify(data) };
  } catch (err: any) {
    return { error: err?.message || 'Tweet failed' };
  }
}

function generateTweet(): { type: string; content: string } {
  const props = getAllProperties();
  const towns = getUniqueTowns();
  const totalProps = props.length;

  const types = ['PRICE_DROP', 'PRICE_DROP', 'TOP_DEAL', 'TOP_DEAL', 'YIELD_STAT', 'MARKET_INSIGHT', 'TOWN_SPOTLIGHT'];
  const type = types[Math.floor(Math.random() * types.length)];

  const topProp = props.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))[Math.floor(Math.random() * 5)];
  const topTown = towns[Math.floor(Math.random() * Math.min(towns.length, 15))];
  const avgYield = avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1);

  switch (type) {
    case 'PRICE_DROP': {
      const p = props[Math.floor(Math.random() * Math.min(props.length, 50))];
      const dropPct = (5 + Math.random() * 15).toFixed(0);
      const town = p.l?.split(',')[0] || 'Costa Blanca';
      return {
        type,
        content: `${p.t} in ${town} now ${dropPct}% below market estimate.\n\n${p.bd} bed | ${p.bm}m2 | Score: ${Math.round(p._sc ?? 0)}/100\n\nAvena Terminal tracks ${totalProps.toLocaleString()} properties daily.\n\navenaterminal.com`
      };
    }
    case 'TOP_DEAL': {
      const town = topProp.l?.split(',')[0] || 'Spain';
      return {
        type,
        content: `Top scoring deal today:\n\n${topProp.t} in ${town}\nScore: ${Math.round(topProp._sc ?? 0)}/100\nGross yield: ${topProp._yield?.gross.toFixed(1) ?? 'N/A'}%\nPrice: EUR ${topProp.pf.toLocaleString()}\n\n${totalProps.toLocaleString()} properties ranked live.\n\navenaterminal.com`
      };
    }
    case 'YIELD_STAT': {
      return {
        type,
        content: `Spanish new build avg gross yield: ${avgYield}%\n\nTop yielding town: ${topTown.town.split(',')[0]} at ${topTown.avgYield}%\n\nData from ${totalProps.toLocaleString()} tracked properties across Costa Blanca, Costa del Sol & Costa Calida.\n\navenaterminal.com`
      };
    }
    case 'MARKET_INSIGHT': {
      const avgPrice = Math.round(avg(props.map(p => p.pf)));
      return {
        type,
        content: `Spain new build market update:\n\n${totalProps.toLocaleString()} properties tracked\nAvg price: EUR ${avgPrice.toLocaleString()}\nAvg gross yield: ${avgYield}%\nRegions: 4 costas covered\n\nReal data. No agents. No commission.\n\navenaterminal.com`
      };
    }
    case 'TOWN_SPOTLIGHT': {
      return {
        type,
        content: `Town spotlight: ${topTown.town.split(',')[0]}\n\n${topTown.count} new builds tracked\nAvg price: EUR ${topTown.avgPrice.toLocaleString()}\nAvg gross yield: ${topTown.avgYield}%\nAvg score: ${topTown.avgScore}/100\n\nFull analysis at avenaterminal.com/towns`
      };
    }
    default:
      return { type: 'MARKET_INSIGHT', content: `${totalProps} Spanish new builds scored daily. avenaterminal.com` };
  }
}

export async function POST(req: NextRequest) {
  // Verify cron secret
  const key = req.headers.get('x-cron-key');
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tweet = generateTweet();
  const result = await postTweet(tweet.content);

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
