import { NextRequest, NextResponse } from 'next/server';
import { mockVisaTypes } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get('destination') || '';

  let filtered = [...mockVisaTypes];

  if (destination) {
    filtered = filtered.filter((visa) =>
      visa.destination.toLowerCase().includes(destination.toLowerCase())
    );
  }

  const destinations = [...new Set(mockVisaTypes.map((v) => v.destination))];

  return NextResponse.json({
    visaTypes: filtered,
    destinations,
  });
}