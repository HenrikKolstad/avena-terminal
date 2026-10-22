import { NextResponse } from 'next/server';

/**
 * Self-serve API-plan checkout was retired 2026-10-22 (0 subscribers at the
 * time). API access beyond the free tier is by request.
 * Paid keys are issued server-side (admin token) after a yes.
 */
const GONE = {
  error: 'Self-serve API checkout has been retired. Access is by request.',
  contact: 'henrik@avenaterminal.com',
  access: 'https://avenaterminal.com/access',
};

export async function POST() {
  return NextResponse.json(GONE, { status: 410 });
}

export async function GET() {
  return NextResponse.json(GONE, { status: 410 });
}
