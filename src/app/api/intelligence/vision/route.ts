import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

interface VisionRequest {
  ref: string;
  imageUrl: string;
}

interface VisionAnalysis {
  finish_quality: number;
  natural_light: number;
  space_perception: number;
  view_quality: number;
  overall_impression: number;
  detected_features: string[];
  red_flags: string[];
  quality_tier: string;
  investor_appeal: number;
  confidence: number;
}

const VISION_PROMPT = `You are a property investment analyst evaluating a real estate listing image.

Analyze this property image and return a JSON object with these exact fields:
- finish_quality (1-10): Quality of finishes, materials, fixtures
- natural_light (1-10): Amount and quality of natural light
- space_perception (1-10): How spacious the property feels
- view_quality (1-10): Quality of views from windows/terrace (1 if not visible)
- overall_impression (1-10): General appeal and desirability
- detected_features (string[]): List of notable features visible (e.g. "marble countertops", "infinity pool", "sea view", "underfloor heating")
- red_flags (string[]): Any concerns (e.g. "small windows", "no outdoor space", "dated kitchen", "poor lighting")
- quality_tier (string): One of "LUXURY", "PREMIUM", "STANDARD", "BUDGET", "UNKNOWN"
- investor_appeal (1-10): How attractive this would be for rental investment
- confidence (0-100): Your confidence in this assessment

Return ONLY valid JSON, no markdown fences or extra text.`;

function calculateVisionScore(analysis: VisionAnalysis): number {
  const weighted =
    analysis.finish_quality * 0.25 +
    analysis.natural_light * 0.15 +
    analysis.space_perception * 0.15 +
    analysis.view_quality * 0.20 +
    analysis.overall_impression * 0.25;

  // Scale from 1-10 range to 0-100
  return Math.round((weighted - 1) * (100 / 9));
}

export async function POST(request: Request) {
  try {
    const body: VisionRequest = await request.json();

    if (!body.ref || !body.imageUrl) {
      return Response.json(
        { error: 'Missing required fields: ref, imageUrl' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: body.imageUrl },
            },
            {
              type: 'text',
              text: VISION_PROMPT,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'No text response from vision model' }, { status: 500 });
    }

    const analysis: VisionAnalysis = JSON.parse(textBlock.text);
    const vision_score = calculateVisionScore(analysis);

    // Store in Supabase
    if (supabase) {
      await supabase.from('vision_scores').upsert(
        {
          ref: body.ref,
          image_url: body.imageUrl,
          vision_score,
          finish_quality: analysis.finish_quality,
          natural_light: analysis.natural_light,
          space_perception: analysis.space_perception,
          view_quality: analysis.view_quality,
          overall_impression: analysis.overall_impression,
          detected_features: analysis.detected_features,
          red_flags: analysis.red_flags,
          quality_tier: analysis.quality_tier,
          investor_appeal: analysis.investor_appeal,
          confidence: analysis.confidence,
          scored_at: new Date().toISOString(),
        },
        { onConflict: 'ref' }
      );
    }

    return Response.json({
      ref: body.ref,
      vision_score,
      analysis,
      scored_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Vision scoring failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
