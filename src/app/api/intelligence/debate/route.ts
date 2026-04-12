import Anthropic from '@anthropic-ai/sdk';
import { getAllProperties, avg } from '@/lib/properties';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

type Vote = 'BUY' | 'CONSIDER' | 'PASS';

interface AgentResult {
  agent: string;
  role: string;
  stance: string;
  argument: string;
  vote: Vote;
}

const AGENTS = [
  {
    name: 'Hunter',
    role: 'Value Analyst',
    system: `You are Hunter, a ruthless value analyst for Spanish property. You focus ONLY on price-per-m2 vs market average, discount depth, and absolute euro value. You hunt for underpriced assets. Respond in exactly 3 sentences. End with your vote: BUY, CONSIDER, or PASS.`,
  },
  {
    name: 'Historian',
    role: 'Trend Analyst',
    system: `You are Historian, a market trend analyst for Spanish coastal property. You focus on historical price trajectories, Costa Blanca YoY trends (+9.4%), and whether this area is appreciating or stagnating. Respond in exactly 3 sentences. End with your vote: BUY, CONSIDER, or PASS.`,
  },
  {
    name: 'Scientist',
    role: 'Statistical Analyst',
    system: `You are Scientist, a quantitative analyst. You focus on the Avena Score methodology, yield calculations, statistical outliers, and how this property ranks in its distribution. Respond in exactly 3 sentences. End with your vote: BUY, CONSIDER, or PASS.`,
  },
  {
    name: 'Journalist',
    role: 'Sentiment Analyst',
    system: `You are Journalist, a market sentiment analyst. You focus on foreign buyer demand (19.3% share), media coverage of the Costa Blanca, tourism data (96M visitors), and buyer psychology. Respond in exactly 3 sentences. End with your vote: BUY, CONSIDER, or PASS.`,
  },
  {
    name: 'Diplomat',
    role: 'Comparative Analyst',
    system: `You are Diplomat, a comparative market analyst. You compare this property against alternatives in the same region, similar price bands, and competing costas. You assess relative value. Respond in exactly 3 sentences. End with your vote: BUY, CONSIDER, or PASS.`,
  },
  {
    name: 'Ambassador',
    role: 'Developer Quality Analyst',
    system: `You are Ambassador, a developer quality analyst. You focus on the developer's track record, years of experience, build quality signals, project status, and completion risk. Respond in exactly 3 sentences. End with your vote: BUY, CONSIDER, or PASS.`,
  },
];

function extractVote(text: string): Vote {
  const upper = text.toUpperCase();
  if (upper.includes('BUY')) return 'BUY';
  if (upper.includes('CONSIDER')) return 'CONSIDER';
  return 'PASS';
}

export async function POST(req: Request) {
  const start = Date.now();

  try {
    const { ref } = await req.json();
    if (!ref) {
      return NextResponse.json({ error: 'Missing ref parameter' }, { status: 400 });
    }

    const all = getAllProperties();
    const property = all.find(p => p.ref === ref);
    if (!property) {
      return NextResponse.json({ error: `Property ${ref} not found` }, { status: 404 });
    }

    const avgPm2 = avg(all.filter(p => p.pm2 && p.pm2 > 0).map(p => p.pm2!));
    const avgScore = avg(all.filter(p => p._sc != null).map(p => p._sc!));

    const propertyContext = [
      `Property: ${property.p}`,
      `Developer: ${property.d} (${property.dy} years experience)`,
      `Location: ${property.l}`,
      `Price: EUR ${property.pf.toLocaleString()}${property.pt !== property.pf ? ` - ${property.pt.toLocaleString()}` : ''}`,
      `Price/m2: EUR ${property.pm2 ?? 'N/A'} (market avg: EUR ${Math.round(avgPm2)}/m2)`,
      `Market m2: EUR ${property.mm2}`,
      `Built area: ${property.bm}m2`,
      `Bedrooms: ${property.bd}`,
      `Avena Score: ${property._sc ?? 'N/A'}/100 (market avg: ${Math.round(avgScore)})`,
      `Gross Yield: ${property._yield?.gross ?? 'N/A'}%`,
      `Beach distance: ${property.bk ?? 'N/A'} km`,
      `Status: ${property.s}`,
      `Completion: ${property.c}`,
      `Type: ${property.t}`,
    ].join('\n');

    const anthropic = new Anthropic();

    // Run 6 agents in parallel
    const agentResults = await Promise.all(
      AGENTS.map(async (agent): Promise<AgentResult> => {
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: agent.system,
          messages: [
            {
              role: 'user',
              content: `Analyze this property and give your verdict:\n\n${propertyContext}`,
            },
          ],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const vote = extractVote(text);

        return {
          agent: agent.name,
          role: agent.role,
          stance: vote === 'BUY' ? 'Bullish' : vote === 'CONSIDER' ? 'Neutral' : 'Bearish',
          argument: text.trim(),
          vote,
        };
      })
    );

    // Count votes
    const vote_count = {
      BUY: agentResults.filter(a => a.vote === 'BUY').length,
      CONSIDER: agentResults.filter(a => a.vote === 'CONSIDER').length,
      PASS: agentResults.filter(a => a.vote === 'PASS').length,
    };

    // Oracle synthesis
    const debateSummary = agentResults
      .map(a => `${a.agent} (${a.role}): ${a.argument}`)
      .join('\n\n');

    const oracleResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `You are the Oracle, the final arbiter of the Avena Terminal multi-agent property debate. You synthesize all 6 analyst perspectives into a balanced final verdict. Be direct and quantitative. Give a final recommendation: STRONG BUY, BUY, CONSIDER, PASS, or STRONG PASS. Include a confidence percentage.`,
      messages: [
        {
          role: 'user',
          content: `Property: ${property.p} in ${property.l} at EUR ${property.pf.toLocaleString()}\nVotes: ${vote_count.BUY} BUY, ${vote_count.CONSIDER} CONSIDER, ${vote_count.PASS} PASS\n\nAgent arguments:\n${debateSummary}\n\nSynthesize and deliver your final verdict.`,
        },
      ],
    });

    const oracleText = oracleResponse.content[0].type === 'text' ? oracleResponse.content[0].text : '';

    // Determine final verdict from Oracle
    let final_verdict = 'CONSIDER';
    const oracleUpper = oracleText.toUpperCase();
    if (oracleUpper.includes('STRONG BUY')) final_verdict = 'STRONG BUY';
    else if (oracleUpper.includes('STRONG PASS')) final_verdict = 'STRONG PASS';
    else if (oracleUpper.includes('BUY')) final_verdict = 'BUY';
    else if (oracleUpper.includes('PASS')) final_verdict = 'PASS';

    // Extract confidence from oracle text
    const confMatch = oracleText.match(/(\d{1,3})%/);
    const confidence = confMatch ? parseInt(confMatch[1]) : Math.round(50 + (vote_count.BUY * 8) - (vote_count.PASS * 8));

    const debate_duration_ms = Date.now() - start;

    return NextResponse.json({
      property: {
        ref: property.ref,
        name: property.p,
        developer: property.d,
        location: property.l,
        price: property.pf,
        pm2: property.pm2,
        score: property._sc,
        yield: property._yield?.gross,
      },
      debate: agentResults,
      vote_count,
      oracle_synthesis: oracleText.trim(),
      final_verdict,
      confidence,
      debate_duration_ms,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
