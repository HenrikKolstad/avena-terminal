import { NextResponse } from 'next/server';

/**
 * Self-serve PRO checkout (€49/€79) was retired 2026-10-22.
 * Access is by request: henrik@avenaterminal.com · https://avenaterminal.com/access
 */
const GONE = {
  error: 'Self-serve checkout has been retired. Access is by request.',
  contact: 'henrik@avenaterminal.com',
  access: 'https://avenaterminal.com/access',
};

export async function POST() {
  return NextResponse.json(GONE, { status: 410 });
}

export async function GET() {
  return NextResponse.json(GONE, { status: 410 });
}
