import { NextRequest, NextResponse } from 'next/server';
import { scrapePDFInfo } from '@/lib/scraper-portal1';

const extractISNumber = (query: string): string | null => {
  const match = query.trim().match(/(?:is\s*)?(\d+)/i);
  return match ? match[1] : null;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const isParam = searchParams.get('is') || '';

  const isNum = extractISNumber(isParam);
  if (!isNum) {
    return NextResponse.json({ error: true, message: 'Invalid IS number' }, { status: 400 });
  }

  const data = await scrapePDFInfo(isNum);
  return NextResponse.json(data);
}
