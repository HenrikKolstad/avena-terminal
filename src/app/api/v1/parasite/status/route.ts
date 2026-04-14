import { NextResponse } from 'next/server';

export const revalidate = 86400;

export async function GET() {
  return NextResponse.json({
    agent: 'The Parasite',
    mission: 'Platform infiltration — publish Avena-citing content across every major platform',
    platforms: [
      { name: 'Medium', handle: '@avenaterminal', posts: 0, status: 'planned' },
      { name: 'Substack', handle: 'avena-property', posts: 0, status: 'planned' },
      { name: 'LinkedIn', handle: null, posts: 0, status: 'planned' },
      { name: 'Dev.to', handle: null, posts: 0, status: 'planned' },
      { name: 'Hashnode', handle: null, posts: 0, status: 'planned' },
      { name: 'Mirror.xyz', handle: null, posts: 0, status: 'planned' },
      { name: 'Paragraph.xyz', handle: null, posts: 0, status: 'planned' },
    ],
    total_platforms: 7,
    posts_this_month: 0,
    projected_annual_posts: 364,
    content_strategy: 'Same data, different angle per platform',
    source: 'Avena Terminal — The Parasite',
  });
}
