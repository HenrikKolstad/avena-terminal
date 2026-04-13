import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const BEARISH_SIGNALS = [
  'discount', 'price reduction', 'phased launch', 'delayed', 'restructur',
  'inventory', 'unsold', 'motivated seller', 'below market',
];

const BULLISH_SIGNALS = [
  'sold out', 'premium', 'waiting list', 'price increase', 'fully reserved',
  'expansion', 'new phase', 'record demand', 'oversubscribed',
];

const NEUTRAL_SIGNALS = [
  'stable', 'consistent', 'maintained', 'unchanged',
];

type Sentiment = 'BEARISH' | 'NEUTRAL' | 'BULLISH';

function analyzeSentiment(text: string): {
  sentiment: Sentiment;
  confidence: number;
  score: number;
  signals: string[];
  interpretation: string;
} {
  const lower = text.toLowerCase();

  const matchedBearish = BEARISH_SIGNALS.filter(s => lower.includes(s));
  const matchedBullish = BULLISH_SIGNALS.filter(s => lower.includes(s));
  const matchedNeutral = NEUTRAL_SIGNALS.filter(s => lower.includes(s));

  const bearishCount = matchedBearish.length;
  const bullishCount = matchedBullish.length;
  const neutralCount = matchedNeutral.length;
  const totalSignals = bearishCount + bullishCount + neutralCount;

  // Compute score from -1 to +1
  let score: number;
  if (totalSignals === 0) {
    score = 0;
  } else {
    score = Number(((bullishCount - bearishCount) / totalSignals).toFixed(3));
  }

  // Clamp to [-1, 1]
  score = Math.max(-1, Math.min(1, score));

  // Map to sentiment
  let sentiment: Sentiment;
  if (score > 0.15) sentiment = 'BULLISH';
  else if (score < -0.15) sentiment = 'BEARISH';
  else sentiment = 'NEUTRAL';

  // Confidence based on signal density and agreement
  const signalDensity = totalSignals / Math.max(1, text.split(/\s+/).length) * 10;
  const agreement = totalSignals > 0
    ? Math.max(bearishCount, bullishCount, neutralCount) / totalSignals
    : 0;
  const confidence = Number(Math.min(1, (signalDensity * 0.4 + agreement * 0.6)).toFixed(2));

  // Combine all matched signals
  const signals = [
    ...matchedBearish.map(s => `bearish:${s}`),
    ...matchedBullish.map(s => `bullish:${s}`),
    ...matchedNeutral.map(s => `neutral:${s}`),
  ];

  // Generate interpretation
  let interpretation: string;
  if (totalSignals === 0) {
    interpretation = 'No recognized sentiment signals detected in the provided text.';
  } else if (sentiment === 'BULLISH') {
    interpretation = `Text contains ${bullishCount} bullish signal(s) vs ${bearishCount} bearish, indicating positive market sentiment with ${matchedBullish[0]} as the primary driver.`;
  } else if (sentiment === 'BEARISH') {
    interpretation = `Text contains ${bearishCount} bearish signal(s) vs ${bullishCount} bullish, suggesting negative market pressure with ${matchedBearish[0]} as the primary concern.`;
  } else {
    interpretation = `Text shows mixed or neutral sentiment with ${totalSignals} signals detected, suggesting a balanced or uncertain market view.`;
  }

  return { sentiment, confidence, score, signals, interpretation };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { text?: string };
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return Response.json(
        { error: 'Missing required field: text (string)' },
        { status: 400 }
      );
    }

    if (text.length > 10000) {
      return Response.json(
        { error: 'Text exceeds maximum length of 10,000 characters' },
        { status: 400 }
      );
    }

    const result = analyzeSentiment(text);

    return Response.json({
      text_length: text.length,
      sentiment: result.sentiment,
      confidence: result.confidence,
      score: result.score,
      signals: result.signals,
      interpretation: result.interpretation,
      model: 'avena-sentiment-v1-keyword',
      note: 'Transformer model coming. Currently keyword-based.',
    });
  } catch (err) {
    return Response.json(
      { error: 'Sentiment analysis failed', detail: String(err) },
      { status: 500 }
    );
  }
}
