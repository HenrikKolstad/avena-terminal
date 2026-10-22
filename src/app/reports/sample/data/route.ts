import { loadInstitutionalSample } from '@/lib/institutional-load';

export const revalidate = 3600;
export const maxDuration = 60;

export async function GET() {
  const data = await loadInstitutionalSample();
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
