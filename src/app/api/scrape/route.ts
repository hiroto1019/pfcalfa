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

// 料理名から推定カロリーを計算する関数
function estimateCaloriesFromTitle(title: string): number {
  const lowerTitle = title.toLowerCase();
  
  // 一般的な料理の推定カロリー
  const calorieEstimates: { [key: string]: number } = {
    'カレー': 600, 'ラーメン': 500, 'うどん': 300, 'そば': 280, 'パスタ': 400,
    'ピザ': 800, 'ハンバーグ': 400, 'とんかつ': 500, '唐揚げ': 350, '天ぷら': 400,
    '焼き魚': 200, '刺身': 150, 'サラダ': 100, '味噌汁': 80, 'スープ': 120,
    'シチュー': 350, 'グラタン': 500, 'ドリア': 600, 'オムライス': 450, 'チャーハン': 400,
    '親子丼': 500, '牛丼': 600, '天丼': 700, 'カツ丼': 800, 'うな丼': 600,
    '焼肉': 500, 'しゃぶしゃぶ': 400, 'すき焼き': 600, '鍋': 300, 'お好み焼き': 400,
    'たこ焼き': 200, '餃子': 250, '春巻き': 200, 'エビチリ': 300, '麻婆豆腐': 350,
    '回鍋肉': 400, '酢豚': 450, '青椒肉絲': 350, '八宝菜': 300, 'エビマヨ': 350,
    'チキンソテー': 300, 'ローストビーフ': 400, 'ステーキ': 500, 'サーロイン': 600,
    'ヒレ': 350, 'ロース': 450, 'もも': 400, 'ささみ': 200, 'むね': 250,
    '手羽先': 350, '手羽元': 400, 'さば': 250, 'さんま': 200, 'あじ': 180,
    'いわし': 200, 'まぐろ': 150, 'サーモン': 200, 'ぶり': 250, 'たい': 200,
    'かれい': 180, 'ひらめ': 180, 'すずき': 200, 'かます': 200, 'あなご': 250,
    'うなぎ': 300, 'たまご': 80, '卵': 80, '豆腐': 80, '納豆': 100, '味噌': 50,
    '醤油': 10, '塩': 0, '砂糖': 15, '油': 45, 'バター': 75, 'マーガリン': 75,
    'マヨネーズ': 65, 'ケチャップ': 20, 'ソース': 25, 'ドレッシング': 30,
    'ご飯': 250, '白米': 250, '玄米': 220, '雑穀米': 240, 'もち': 200,
    'パン': 150, '食パン': 150, 'フランスパン': 180, 'ベーグル': 200, 'クロワッサン': 250,
    'デニッシュ': 300, 'メロンパン': 350, 'あんパン': 250, 'クリームパン': 280,
    'ジャムパン': 220, 'チョコパン': 300, 'カレーパン': 350, 'コロッケパン': 400,
    'ピザトースト': 350, 'トースト': 150, 'サンドイッチ': 200, 'ハンバーガー': 400,
    'ホットドッグ': 350, 'タコス': 300, 'ブリトー': 400, 'ケバブ': 350,
    'ギョーザ': 250, 'シュウマイ': 200, '焼売': 200, '小籠包': 150, '肉まん': 250,
    'あんまん': 200, 'ピザまん': 300, 'カレーまん': 300
  };

  // タイトルに含まれる料理名を検索
  for (const [dish, calories] of Object.entries(calorieEstimates)) {
    if (lowerTitle.includes(dish)) {
      return calories;
    }
  }

  // デフォルトの推定カロリー
  return 300;
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

       // カロリーが見つからない場合は、タイトルから推定
       if (results.length === 0) {
         const titleSelectors = [
           '.recipe-title', '.title', 'h3', 'h4', '.recipe_name', '.name',
           '.recipe-title a', '.title a', 'h3 a', 'h4 a',
           '.recipe_name a', '.name a', 'a[href*="/recipe/"]'
         ];
         
         $(cookpadSelectors[0]).each((index, element) => {
           const $el = $(element);
           let title = '';
           for (const titleSelector of titleSelectors) {
             title = $el.find(titleSelector).text().trim();
             if (title) break;
           }
           
           if (title) {
             // 料理名から推定カロリーを計算
             const estimatedCalories = estimateCaloriesFromTitle(title);
             if (estimatedCalories > 0) {
               results.push({
                 name: title,
                 calories: estimatedCalories,
                 protein: Math.floor(estimatedCalories * 0.15),
                 fat: Math.floor(estimatedCalories * 0.25),
                 carbs: Math.floor(estimatedCalories * 0.6),
                 unit: '1人前',
                 source: 'クックパッド（推定）',
                 url: originalUrl
               });
             }
           }
         });
       }

         } else if (hostname.includes('rakuten.co.jp')) {
       // 楽天レシピの検索結果を解析（複数のセレクタを試行）
       const rakutenSelectors = [
         '.recipe-card',
         '.recipe-item',
         '.recipe-preview',
         '.search_result',
         '.recipe',
         '.recipe_list',
         '.recipe-list',
         '.recipe_list_item',
         '.recipe-list-item',
         '.recipe_card',
         '.recipe-card',
         '.recipe_item',
         '.recipe-item',
         '.recipe-preview-item'
       ];

       for (const selector of rakutenSelectors) {
         $(selector).each((index, element) => {
           const $el = $(element);
           
           // タイトルの取得（複数のセレクタを試行）
           const titleSelectors = [
             '.recipe-title', '.title', 'h3', 'h4', '.recipe_name', '.name',
             '.recipe-title a', '.title a', 'h3 a', 'h4 a',
             '.recipe_name a', '.name a', 'a[href*="/recipe/"]',
             '.recipe_title', '.recipe-title-text', '.recipe-name'
           ];
           let title = '';
           for (const titleSelector of titleSelectors) {
             title = $el.find(titleSelector).text().trim();
             if (title) break;
           }
           
           // カロリーの取得（複数のセレクタを試行）
           const calorieSelectors = [
             '.calorie', '.kcal', '.nutrition-info', '.energy', '.nutrition',
             '.recipe-calorie', '.recipe_kcal', '.recipe-kcal',
             '.nutrition-info', '.nutrition_info', '.recipe-nutrition',
             '.calorie-info', '.calorie_info', '.energy-info'
           ];
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

       // カロリーが見つからない場合は、タイトルから推定
       if (results.length === 0) {
         const titleSelectors = [
           '.recipe-title', '.title', 'h3', 'h4', '.recipe_name', '.name',
           '.recipe-title a', '.title a', 'h3 a', 'h4 a',
           '.recipe_name a', '.name a', 'a[href*="/recipe/"]'
         ];
         
         $(rakutenSelectors[0]).each((index, element) => {
           const $el = $(element);
           let title = '';
           for (const titleSelector of titleSelectors) {
             title = $el.find(titleSelector).text().trim();
             if (title) break;
           }
           
           if (title) {
             // 料理名から推定カロリーを計算（簡易版）
             const estimatedCalories = estimateCaloriesFromTitle(title);
             if (estimatedCalories > 0) {
               results.push({
                 name: title,
                 calories: estimatedCalories,
                 protein: Math.floor(estimatedCalories * 0.15),
                 fat: Math.floor(estimatedCalories * 0.25),
                 carbs: Math.floor(estimatedCalories * 0.6),
                 unit: '1人前',
                 source: '楽天レシピ（推定）',
                 url: originalUrl
               });
             }
           }
         });
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