import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || 'ポッキー';
  const site = searchParams.get('site') || 'all';

  const testUrls = {
    // カロリーSlism
    slism: [
      `https://calorie.slism.jp/?searchWord=${encodeURIComponent(query)}&search=検索`,
      `https://calorie.slism.jp/?searchWord=${encodeURIComponent(query)}`,
      `https://calorie.slism.jp/search/?searchWord=${encodeURIComponent(query)}`,
      `https://calorie.slism.jp/search/?searchWord=${encodeURIComponent(query)}&search=検索`,
      `https://www.slism.jp/?searchWord=${encodeURIComponent(query)}&search=検索`
    ],
    
    // 楽天レシピ
    rakuten: [
      `https://recipe.rakuten.co.jp/search/${encodeURIComponent(query)}/`,
      `https://recipe.rakuten.co.jp/search/${encodeURIComponent(query)}/?sort=1`,
      `https://recipe.rakuten.co.jp/search/${encodeURIComponent(query)}/?sort=2`,
      `https://recipe.rakuten.co.jp/search/${encodeURIComponent(query)}/?sort=3`
    ],
    
    // クックパッド
    cookpad: [
      `https://cookpad.com/search/${encodeURIComponent(query)}`,
      `https://cookpad.com/search/${encodeURIComponent(query)}?sort=1`,
      `https://cookpad.com/search/${encodeURIComponent(query)}?sort=2`,
      `https://cookpad.com/search/${encodeURIComponent(query)}?sort=3`
    ],
    
    // FoodDB
    fooddb: [
      `https://fooddb.mext.go.jp/search.pl?ITEM_NAME=${encodeURIComponent(query)}`,
      `https://fooddb.mext.go.jp/search.pl?ITEM_NAME=${encodeURIComponent(query)}&sort=1`,
      `https://fooddb.mext.go.jp/search.pl?ITEM_NAME=${encodeURIComponent(query)}&sort=2`
    ],
    
    // 楽天市場
    rakutenMarket: [
      `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(query)}/`,
      `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(query)}/?sort=1`,
      `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(query)}/?sort=2`
    ],
    
    // Kurashiru（みんなのきょうの料理）
    kurashiru: [
      `https://www.kurashiru.com/search?q=${encodeURIComponent(query)}`,
      `https://www.kurashiru.com/search?q=${encodeURIComponent(query)}&sort=1`,
      `https://www.kurashiru.com/search?q=${encodeURIComponent(query)}&sort=2`
    ],
    
    // 白ごはん.com
    shirogohan: [
      `https://www.sirogohan.com/search?q=${encodeURIComponent(query)}`,
      `https://www.sirogohan.com/search?q=${encodeURIComponent(query)}&sort=1`,
      `https://www.sirogohan.com/search?q=${encodeURIComponent(query)}&sort=2`
    ]
  };

  // 特定のサイトのURLのみを返す
  if (site !== 'all' && testUrls[site as keyof typeof testUrls]) {
    return NextResponse.json({
      query,
      site,
      urls: testUrls[site as keyof typeof testUrls]
    });
  }

  // 全サイトのURLを返す
  return NextResponse.json({
    query,
    site: 'all',
    urls: testUrls,
    totalSites: Object.keys(testUrls).length,
    totalUrls: Object.values(testUrls).flat().length
  });
} 