import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

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

    console.log(`スクレイピング開始: ${url}`);

    // 実際のスクレイピング処理
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`スクレイピングエラー: ${response.status}`);
    }

    const html = await response.text();
    console.log(`HTML取得完了: ${html.length}文字`);

    // HTMLの解析
    const extractedData = extractDataFromHTML(html, urlObj.hostname, url);

    return NextResponse.json({
      success: true,
      data: extractedData,
      source: urlObj.hostname,
      url: url
    });

  } catch (error) {
    console.error('スクレイピングエラー:', error);
    return NextResponse.json(
      { error: 'スクレイピングに失敗しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// HTMLからデータを抽出する関数（実際の実装）
function extractDataFromHTML(html: string, hostname: string, originalUrl: string): any[] {
  const $ = cheerio.load(html);
  const results: any[] = [];

  try {
         if (hostname.includes('cookpad.com')) {
       // クックパッドのレシピ検索結果を解析（複数のセレクタを試行）
       const cookpadSelectors = [
         '.recipe-preview',
         '.recipe-card',
         '.recipe-item',
         '.search_result',
         '.recipe'
       ];

       for (const selector of cookpadSelectors) {
         $(selector).each((index, element) => {
           const $el = $(element);
           
           // タイトルの取得（複数のセレクタを試行）
           const titleSelectors = ['.recipe-title', '.title', 'h3', 'h4', '.recipe_name', '.name'];
           let title = '';
           for (const titleSelector of titleSelectors) {
             title = $el.find(titleSelector).text().trim();
             if (title) break;
           }
           
           // カロリーの取得（複数のセレクタを試行）
           const calorieSelectors = ['.calorie', '.kcal', '.nutrition', '.recipe-info .calorie', '.energy'];
           let caloriesText = '';
           for (const calorieSelector of calorieSelectors) {
             caloriesText = $el.find(calorieSelector).text().trim();
             if (caloriesText) break;
           }
           
           if (title && caloriesText) {
             // カロリー数値を抽出（より柔軟な正規表現）
             const calorieMatch = caloriesText.match(/(\d+)/);
             const calories = calorieMatch ? parseInt(calorieMatch[1]) : 0;
             
             if (calories > 0 && calories < 2000) { // 妥当な範囲のカロリーのみ
               results.push({
                 name: title,
                 calories: calories,
                 protein: Math.floor(calories * 0.15), // 推定値
                 fat: Math.floor(calories * 0.25), // 推定値
                 carbs: Math.floor(calories * 0.6), // 推定値
                 unit: '1人前',
                 source: 'クックパッド',
                 url: originalUrl
               });
             }
           }
         });
         
         if (results.length > 0) break; // 結果が見つかったら終了
       }

         } else if (hostname.includes('rakuten.co.jp')) {
       // 楽天レシピの検索結果を解析（複数のセレクタを試行）
       const rakutenSelectors = [
         '.recipe-card',
         '.recipe-item',
         '.recipe-preview',
         '.search_result',
         '.recipe'
       ];

       for (const selector of rakutenSelectors) {
         $(selector).each((index, element) => {
           const $el = $(element);
           
           // タイトルの取得（複数のセレクタを試行）
           const titleSelectors = ['.recipe-title', '.title', 'h3', 'h4', '.recipe_name', '.name'];
           let title = '';
           for (const titleSelector of titleSelectors) {
             title = $el.find(titleSelector).text().trim();
             if (title) break;
           }
           
           // カロリーの取得（複数のセレクタを試行）
           const calorieSelectors = ['.calorie', '.kcal', '.nutrition-info', '.energy', '.nutrition'];
           let caloriesText = '';
           for (const calorieSelector of calorieSelectors) {
             caloriesText = $el.find(calorieSelector).text().trim();
             if (caloriesText) break;
           }
           
           if (title && caloriesText) {
             const calorieMatch = caloriesText.match(/(\d+)/);
             const calories = calorieMatch ? parseInt(calorieMatch[1]) : 0;
             
             if (calories > 0 && calories < 2000) { // 妥当な範囲のカロリーのみ
               results.push({
                 name: title,
                 calories: calories,
                 protein: Math.floor(calories * 0.15),
                 fat: Math.floor(calories * 0.25),
                 carbs: Math.floor(calories * 0.6),
                 unit: '1人前',
                 source: '楽天レシピ',
                 url: originalUrl
               });
             }
           }
         });
         
         if (results.length > 0) break; // 結果が見つかったら終了
       }

    } else if (hostname.includes('slism.jp')) {
      // Slismのカロリー検索結果を解析
      $('.food-item, .calorie-item').each((index, element) => {
        const $el = $(element);
        const title = $el.find('.food-name, .name, h3').text().trim();
        const caloriesText = $el.find('.calorie, .kcal').text().trim();
        
        if (title && caloriesText) {
          const calorieMatch = caloriesText.match(/(\d+)/);
          const calories = calorieMatch ? parseInt(calorieMatch[1]) : 0;
          
          if (calories > 0) {
            results.push({
              name: title,
              calories: calories,
              protein: Math.floor(calories * 0.15),
              fat: Math.floor(calories * 0.25),
              carbs: Math.floor(calories * 0.6),
              unit: '100g',
              source: 'Slism',
              url: originalUrl
            });
          }
        }
      });
    }

    console.log(`抽出されたデータ: ${results.length}件`);
    
    // 結果が0件の場合は、ページの構造をログ出力してデバッグ
    if (results.length === 0) {
      console.log('データが見つかりませんでした。ページ構造を確認:');
      console.log('利用可能なクラス:', $('[class]').map((i, el) => $(el).attr('class')).get().slice(0, 10));
    }

    return results;

  } catch (error) {
    console.error('HTML解析エラー:', error);
    return [];
  }
} 