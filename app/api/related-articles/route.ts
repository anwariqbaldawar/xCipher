import { NextRequest, NextResponse } from 'next/server';
import { getPublishedSearchIndex } from '@/lib/cached-queries';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') || '').trim().toLocaleLowerCase();
  if (query.length < 2) return NextResponse.json({ results: [] }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const { entries } = await getPublishedSearchIndex();
    const results = entries.filter(article => `${article.title} ${article.slug} ${article.categoryName || ''}`.toLocaleLowerCase().includes(query))
      .slice(0, 12).map(article => ({ slug: article.slug, title: article.title, category: article.categoryName, image: article.image || article.img }));
    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ results: [], error: 'search_unavailable' }, { status: 503 });
  }
}
