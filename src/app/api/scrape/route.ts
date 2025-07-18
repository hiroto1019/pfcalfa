import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URLパラメータが必要です' },
        { status: 400 }
      );
    }

    // セキュリティチェック：許可されたドメインのみ
    const allowedDomains = [
      'www.slism.jp',
      'cookpad.com',
      'app.rakuten.co.jp',
      'recipe.rakuten.co.jp'
    ];

    const urlObj = new URL(url);
    if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return NextResponse.json(
        { error: '許可されていないドメインです' },
        { status: 403 }
      );
    }

    // 実際のスクレイピング処理
    // 注意: 本番環境では適切なスクレイピングライブラリを使用することを推奨
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`スクレイピングエラー: ${response.status}`);
    }

    const html = await response.text();

    // HTMLの解析（簡易版）
    // 実際の実装では、cheerioなどのライブラリを使用することを推奨
    const extractedData = extractDataFromHTML(html, urlObj.hostname);

    return NextResponse.json({
      success: true,
      data: extractedData,
      source: urlObj.hostname
    });

  } catch (error) {
    console.error('スクレイピングエラー:', error);
    return NextResponse.json(
      { error: 'スクレイピングに失敗しました' },
      { status: 500 }
    );
  }
}

// HTMLからデータを抽出する関数（簡易版）
function extractDataFromHTML(html: string, hostname: string): any[] {
  // 実際の実装では、cheerioなどのライブラリを使用してHTMLを解析
  // ここでは模擬データを返す
  
  if (hostname.includes('slism.jp')) {
    return [
      {
        name: '模擬食品（Slism）',
        calories: Math.floor(Math.random() * 200) + 50,
        protein: Math.floor(Math.random() * 20) + 1,
        fat: Math.floor(Math.random() * 15) + 1,
        carbs: Math.floor(Math.random() * 30) + 5,
        unit: '100g',
        source: 'Slism'
      }
    ];
  } else if (hostname.includes('cookpad.com')) {
    return [
      {
        name: '模擬料理（クックパッド）',
        calories: Math.floor(Math.random() * 250) + 80,
        protein: Math.floor(Math.random() * 18) + 2,
        fat: Math.floor(Math.random() * 12) + 1,
        carbs: Math.floor(Math.random() * 28) + 6,
        unit: '1人前',
        source: 'クックパッド'
      }
    ];
  } else if (hostname.includes('rakuten.co.jp')) {
    return [
      {
        name: '模擬レシピ（楽天）',
        calories: Math.floor(Math.random() * 300) + 100,
        protein: Math.floor(Math.random() * 15) + 2,
        fat: Math.floor(Math.random() * 10) + 1,
        carbs: Math.floor(Math.random() * 25) + 5,
        unit: '1人前',
        source: '楽天レシピ'
      }
    ];
  }

  return [];
} 