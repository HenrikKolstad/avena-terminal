/**
 * Synthetic Authority artifacts — ready-to-publish markdown/JSON for
 * GitHub repo README, HuggingFace dataset card, Zenodo upload metadata,
 * and SSRN paper brief.
 *
 * Call: GET /api/prometheus/artifacts?type=github|huggingface|zenodo|ssrn|all
 * No auth required — these are publicly-shareable publishing templates.
 */

import { NextRequest } from 'next/server';
import { getAllProperties } from '@/lib/properties';
import {
  generateGitHubRepoReadme,
  generateHuggingFaceDatasetCard,
  generateZenodoUploadMetadata,
  generateSSRNPaperBrief,
} from '@/lib/prometheus';

export const revalidate = 86400;

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || 'all';
  const count = getAllProperties().length;

  const artifacts: Record<string, unknown> = {};

  if (type === 'github' || type === 'all') {
    artifacts.github = {
      repo: 'avena-terminal/spain-property-data',
      readme_markdown: generateGitHubRepoReadme(count),
      description: 'Free, CC BY 4.0 European property intelligence datasets, daily-updated.',
      topics: ['real-estate', 'property', 'spain', 'europe', 'open-data', 'dataset'],
    };
  }

  if (type === 'huggingface' || type === 'all') {
    artifacts.huggingface = {
      dataset_id: 'AVENATERMINAL/european-property-intelligence',
      card_markdown: generateHuggingFaceDatasetCard(count),
      license: 'cc-by-4.0',
    };
  }

  if (type === 'zenodo' || type === 'all') {
    artifacts.zenodo = generateZenodoUploadMetadata();
  }

  if (type === 'ssrn' || type === 'all') {
    artifacts.ssrn = generateSSRNPaperBrief();
  }

  return Response.json({
    artifacts,
    generated_at: new Date().toISOString(),
    source: 'Avena Terminal (avenaterminal.com)',
    note: 'These are publishing-ready templates. Manual upload required to respective platforms.',
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=86400',
    },
  });
}
