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
      'calorie.slism.jp',
      'cookpad.com',
      'app.rakuten.co.jp',
      'recipe.rakuten.co.jp',
      'search.rakuten.co.jp',
      'fooddb.mext.go.jp',
      'www.mext.go.jp'
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
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト（楽天市場対応）

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
      console.log('クックパッドのスクレイピング開始');
      
      // クックパッドの新しい構造に対応
      $('.recipe-preview, .recipe-card, .recipe-item, .search_result, [class*="recipe"]').each((index, element) => {
        const $el = $(element);
        
        // タイトルの取得（より具体的なセレクタ）
        const titleSelectors = [
          '.recipe-title', '.title', 'h3', 'h4', '.recipe_name', '.name',
          '.recipe-title a', '.title a', 'h3 a', 'h4 a',
          '.recipe_name a', '.name a', 'a[href*="/recipe/"]',
          '.recipe-title-text', '.recipe-name', '.recipe-name-text',
          'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
        ];
        
        let title = '';
        for (const titleSelector of titleSelectors) {
          title = $el.find(titleSelector).first().text().trim();
          if (title && title.length > 2 && title.length < 100 && 
              !title.includes('絞り込む') && !title.includes('検索') && 
              !title.includes('新着') && !title.includes('人気')) break;
        }
        
        // カロリーの取得（より包括的なセレクタ）
        const calorieSelectors = [
          '.calorie', '.kcal', '.nutrition', '.recipe-info .calorie', '.energy',
          '.recipe-calorie', '.recipe_kcal', '.recipe-kcal',
          '.nutrition-info', '.nutrition_info', '.recipe-nutrition',
          '.calorie-info', '.calorie_info', '.energy-info',
          '[class*="calorie"]', '[class*="kcal"]', '[class*="nutrition"]',
          '[class*="energy"]', 'span', 'div'
        ];
        
        let caloriesText = '';
        for (const calorieSelector of calorieSelectors) {
          caloriesText = $el.find(calorieSelector).text().trim();
          if (caloriesText && caloriesText.match(/\d+/)) break;
        }
        
        if (title && caloriesText) {
          // カロリー数値を抽出（より柔軟な正規表現）
          const calorieMatch = caloriesText.match(/(\d+)/);
          const calories = calorieMatch ? parseInt(calorieMatch[1]) : 0;
          
          if (calories > 0 && calories < 2000) { // 妥当な範囲のカロリーのみ
            // 重複チェック
            const existingIndex = results.findIndex(r => r.name === title);
            if (existingIndex === -1) {
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
        }
      });

      // カロリーが見つからない場合は、タイトルから推定
      if (results.length === 0) {
        console.log('カロリー情報が見つからないため、タイトルから推定を開始');
        
        $('.recipe-preview, .recipe-card, .recipe-item, .search_result, [class*="recipe"]').each((index, element) => {
          const $el = $(element);
          
          const titleSelectors = [
            '.recipe-title', '.title', 'h3', 'h4', '.recipe_name', '.name',
            '.recipe-title a', '.title a', 'h3 a', 'h4 a',
            '.recipe_name a', '.name a', 'a[href*="/recipe/"]',
            '.recipe-title-text', '.recipe-name', '.recipe-name-text',
            'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
          ];
          
          let title = '';
          for (const titleSelector of titleSelectors) {
            title = $el.find(titleSelector).first().text().trim();
            if (title && title.length > 2 && title.length < 100 && 
                !title.includes('絞り込む') && !title.includes('検索') && 
                !title.includes('新着') && !title.includes('人気')) break;
          }
          
          if (title) {
            // 料理名から推定カロリーを計算
            const estimatedCalories = estimateCaloriesFromTitle(title);
            if (estimatedCalories > 0) {
              // 重複チェック
              const existingIndex = results.findIndex(r => r.name === title);
              if (existingIndex === -1) {
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
          }
        });
      }

    } else if (hostname.includes('recipe.rakuten.co.jp')) {
      console.log('楽天レシピのスクレイピング開始');
      
      // 楽天レシピの検索結果を解析（より柔軟なアプローチ）
      $('[class*="recipe"]').each((index, element) => {
        const $el = $(element);
        
        // タイトルの取得（より包括的なセレクタ）
        const titleSelectors = [
          '.recipe-title', '.title', 'h3', 'h4', '.recipe_name', '.name',
          '.recipe-title a', '.title a', 'h3 a', 'h4 a',
          '.recipe_name a', '.name a', 'a[href*="/recipe/"]',
          '.recipe_title', '.recipe-title-text', '.recipe-name',
          'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
        ];
        
        let title = '';
        for (const titleSelector of titleSelectors) {
          title = $el.find(titleSelector).first().text().trim();
          if (title && title.length > 2 && title.length < 100) break;
        }
        
        // カロリーの取得（より包括的なセレクタ）
        const calorieSelectors = [
          '.calorie', '.kcal', '.nutrition-info', '.energy', '.nutrition',
          '.recipe-calorie', '.recipe_kcal', '.recipe-kcal',
          '.nutrition-info', '.nutrition_info', '.recipe-nutrition',
          '.calorie-info', '.calorie_info', '.energy-info',
          '[class*="calorie"]', '[class*="kcal"]', '[class*="nutrition"]',
          '[class*="energy"]', 'span', 'div'
        ];
        
        let caloriesText = '';
        for (const calorieSelector of calorieSelectors) {
          caloriesText = $el.find(calorieSelector).text().trim();
          if (caloriesText && caloriesText.match(/\d+/)) break;
        }
        
        if (title && caloriesText) {
          const calorieMatch = caloriesText.match(/(\d+)/);
          const calories = calorieMatch ? parseInt(calorieMatch[1]) : 0;
          
          if (calories > 0 && calories < 2000) { // 妥当な範囲のカロリーのみ
            // 重複チェック
            const existingIndex = results.findIndex(r => r.name === title);
            if (existingIndex === -1) {
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
        }
      });

      // カロリーが見つからない場合は、タイトルから推定
      if (results.length === 0) {
        console.log('カロリー情報が見つからないため、タイトルから推定を開始');
        
        $('[class*="recipe"]').each((index, element) => {
          const $el = $(element);
          
          const titleSelectors = [
            '.recipe-title', '.title', 'h3', 'h4', '.recipe_name', '.name',
            '.recipe-title a', '.title a', 'h3 a', 'h4 a',
            '.recipe_name a', '.name a', 'a[href*="/recipe/"]',
            '.recipe_title', '.recipe-title-text', '.recipe-name',
            'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
          ];
          
          let title = '';
          for (const titleSelector of titleSelectors) {
            title = $el.find(titleSelector).first().text().trim();
            if (title && title.length > 2 && title.length < 100) break;
          }
          
          if (title) {
            // 料理名から推定カロリーを計算（簡易版）
            const estimatedCalories = estimateCaloriesFromTitle(title);
            if (estimatedCalories > 0) {
              // 重複チェック
              const existingIndex = results.findIndex(r => r.name === title);
              if (existingIndex === -1) {
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
          }
        });
      }

    } else if (hostname.includes('slism.jp')) {
      console.log('Slismのスクレイピング開始');
      
      // Slismの新しい構造に対応
      $('.food-item, .calorie-item, .search-result, .result-item, [class*="food"], [class*="calorie"]').each((index, element) => {
        const $el = $(element);
        const title = $el.find('.food-name, .name, h3, h4, .title, a').text().trim();
        const caloriesText = $el.find('.calorie, .kcal, .energy, [class*="calorie"], [class*="kcal"]').text().trim();
        
        if (title && title.length > 2 && title.length < 100) {
          let calories = 0;
          if (caloriesText) {
            const calorieMatch = caloriesText.match(/(\d+)/);
            calories = calorieMatch ? parseInt(calorieMatch[1]) : 0;
          }
          
          if (calories === 0) {
            // カロリーが見つからない場合は推定
            calories = estimateCaloriesFromTitle(title);
          }
          
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
      
      // より包括的な検索
      if (results.length === 0) {
        $('a, h1, h2, h3, h4, h5, h6, .title, .name').each((index, element) => {
          const $el = $(element);
          const title = $el.text().trim();
          
          if (title && title.length > 2 && title.length < 100) {
            const hasFoodKeywords = /(ポッキー|プリッツ|チョコレート|クッキー|ビスケット|キャラメル|ガム|マシュマロ|プリン|シュークリーム|ドーナツ|パンケーキ|ワッフル|タルト|モンブラン|ティラミス|チーズケーキ|ショートケーキ|ロールケーキ|パイ|クレープ|まんじゅう|だんご|おはぎ|大福|わらびもち|ようかん|あんみつ|かき氷|みつまめ)/.test(title);
            
            if (hasFoodKeywords) {
              const estimatedCalories = estimateCaloriesFromTitle(title);
              if (estimatedCalories > 0) {
                results.push({
                  name: title,
                  calories: estimatedCalories,
                  protein: Math.floor(estimatedCalories * 0.15),
                  fat: Math.floor(estimatedCalories * 0.25),
                  carbs: Math.floor(estimatedCalories * 0.6),
                  unit: '100g',
                  source: 'Slism（推定）',
                  url: originalUrl
                });
              }
            }
          }
        });
      }
      
    } else if (hostname.includes('fooddb.mext.go.jp') || hostname.includes('mext.go.jp')) {
      // FoodDB（文部科学省食品成分データベース）の解析
      console.log('FoodDBのスクレイピング開始');
      
      // テーブル形式のデータを解析
      $('table tr').each((index, element) => {
        const $el = $(element);
        const cells = $el.find('td');
        
        if (cells.length >= 3) {
          const title = $(cells[0]).text().trim();
          const caloriesText = $(cells[1]).text().trim();
          
          if (title && caloriesText) {
            const calorieMatch = caloriesText.match(/(\d+)/);
            const calories = calorieMatch ? parseInt(calorieMatch[1]) : 0;
            
            if (calories > 0 && calories < 2000) {
              results.push({
                name: title,
                calories: calories,
                protein: Math.floor(calories * 0.15),
                fat: Math.floor(calories * 0.25),
                carbs: Math.floor(calories * 0.6),
                unit: '100g',
                source: 'FoodDB',
                url: originalUrl
              });
            }
          }
        }
      });
      
      // リスト形式のデータも解析
      $('li, .item, .food-item').each((index, element) => {
        const $el = $(element);
        const title = $el.text().trim();
        
        if (title && title.length > 2 && title.length < 100) {
          const estimatedCalories = estimateCaloriesFromTitle(title);
          if (estimatedCalories > 0) {
            results.push({
              name: title,
              calories: estimatedCalories,
              protein: Math.floor(estimatedCalories * 0.15),
              fat: Math.floor(estimatedCalories * 0.25),
              carbs: Math.floor(estimatedCalories * 0.6),
              unit: '100g',
              source: 'FoodDB（推定）',
              url: originalUrl
            });
          }
        }
      });
      
      // より包括的な検索：すべてのテキスト要素を確認
      if (results.length === 0) {
        console.log('FoodDB包括的検索を試行中...');
        $('a, h1, h2, h3, h4, h5, h6, .title, .name, span, div').each((index, element) => {
          const $el = $(element);
          const title = $el.text().trim();
          
          // 食品らしい名前かチェック
          if (title && title.length > 2 && title.length < 100 && $el.children().length === 0) {
            const hasFoodKeywords = /(もち|りんご|チョコレート|ポッキー|プリッツ|クッキー|ビスケット|キャラメル|ガム|マシュマロ|プリン|シュークリーム|ドーナツ|パンケーキ|ワッフル|タルト|モンブラン|ティラミス|チーズケーキ|ショートケーキ|ロールケーキ|パイ|クレープ|まんじゅう|だんご|おはぎ|大福|わらびもち|ようかん|あんみつ|かき氷|みつまめ|穀類|野菜類|果実類|魚介類|肉類|乳類|卵類|豆類|藻類|きのこ類|調味料|香辛料|飲料|酒類|菓子類|嗜好飲料|調理加工食品)/.test(title);
            
            if (hasFoodKeywords) {
              const estimatedCalories = estimateCaloriesFromTitle(title);
              if (estimatedCalories > 0) {
                results.push({
                  name: title,
                  calories: estimatedCalories,
                  protein: Math.floor(estimatedCalories * 0.15),
                  fat: Math.floor(estimatedCalories * 0.25),
                  carbs: Math.floor(estimatedCalories * 0.6),
                  unit: '100g',
                  source: 'FoodDB（包括的検索）',
                  url: originalUrl
                });
              }
            }
          }
        });
      }
      
    } else if (hostname.includes('search.rakuten.co.jp')) {
      // 楽天市場の商品検索結果を解析
      console.log('楽天市場のスクレイピング開始');
      
      // 商品カードを解析
      $('[class*="item"], [class*="product"], [class*="goods"], .item, .product, .goods, .search-result-item, .product-item').each((index, element) => {
        const $el = $(element);
        
        // 商品名の取得
        const titleSelectors = [
          '.item-name', '.product-name', '.goods-name', '.title',
          'h3', 'h4', 'a[href*="/item/"]', '.name', '.product-title',
          '.item-title', '.goods-title', '.search-result-item-title'
        ];
        
        let title = '';
        for (const titleSelector of titleSelectors) {
          title = $el.find(titleSelector).text().trim();
          if (title && title.length > 2 && title.length < 100) break;
        }
        
        if (title) {
          // 商品名から推定カロリーを計算
          const estimatedCalories = estimateCaloriesFromTitle(title);
          if (estimatedCalories > 0) {
            results.push({
              name: title,
              calories: estimatedCalories,
              protein: Math.floor(estimatedCalories * 0.15),
              fat: Math.floor(estimatedCalories * 0.25),
              carbs: Math.floor(estimatedCalories * 0.6),
              unit: '1個',
              source: '楽天市場',
              url: originalUrl
            });
          }
        }
      });
      
      // リンクからも商品名を抽出
      $('a[href*="/item/"]').each((index, element) => {
        const $el = $(element);
        const title = $el.text().trim();
        
        if (title && title.length > 2 && title.length < 100) {
          const estimatedCalories = estimateCaloriesFromTitle(title);
          if (estimatedCalories > 0) {
            results.push({
              name: title,
              calories: estimatedCalories,
              protein: Math.floor(estimatedCalories * 0.15),
              fat: Math.floor(estimatedCalories * 0.25),
              carbs: Math.floor(estimatedCalories * 0.6),
              unit: '1個',
              source: '楽天市場（リンク）',
              url: originalUrl
            });
          }
        }
      });
      
      // より包括的な商品名検索
      console.log('楽天市場包括的検索を試行中...');
      $('a, h1, h2, h3, h4, h5, h6, .title, .name, .product-name, .item-name, .search-result-item-title').each((index, element) => {
        const $el = $(element);
        const title = $el.text().trim();
        
        // 食品関連のキーワードを含む商品名を検索
        if (title && title.length > 2 && title.length < 100) {
          const hasFoodKeywords = /(ポッキー|プリッツ|チョコレート|クッキー|ビスケット|キャラメル|ガム|マシュマロ|プリン|シュークリーム|ドーナツ|パンケーキ|ワッフル|タルト|モンブラン|ティラミス|チーズケーキ|ショートケーキ|ロールケーキ|パイ|クレープ|まんじゅう|だんご|おはぎ|大福|わらびもち|ようかん|あんみつ|かき氷|みつまめ|お菓子|スナック|チョコ|アイス|ケーキ|パン|飲料|ジュース|コーラ|お茶|コーヒー|紅茶)/.test(title);
          
          if (hasFoodKeywords) {
            const estimatedCalories = estimateCaloriesFromTitle(title);
            if (estimatedCalories > 0) {
              results.push({
                name: title,
                calories: estimatedCalories,
                protein: Math.floor(estimatedCalories * 0.15),
                fat: Math.floor(estimatedCalories * 0.25),
                carbs: Math.floor(estimatedCalories * 0.6),
                unit: '1個',
                source: '楽天市場（キーワード検索）',
                url: originalUrl
              });
            }
          }
        }
      });
      
      // さらに包括的な検索：すべてのテキスト要素を確認
      if (results.length === 0) {
        console.log('楽天市場さらに包括的検索を試行中...');
        $('*').each((index, element) => {
          const $el = $(element);
          const title = $el.text().trim();
          
          // 子要素がない場合のみ処理（重複を避ける）
          if (title && title.length > 2 && title.length < 100 && $el.children().length === 0) {
            const hasFoodKeywords = /(ポッキー|プリッツ|チョコレート|クッキー|ビスケット|キャラメル|ガム|マシュマロ|プリン|シュークリーム|ドーナツ|パンケーキ|ワッフル|タルト|モンブラン|ティラミス|チーズケーキ|ショートケーキ|ロールケーキ|パイ|クレープ|まんじゅう|だんご|おはぎ|大福|わらびもち|ようかん|あんみつ|かき氷|みつまめ)/.test(title);
            
            if (hasFoodKeywords) {
              const estimatedCalories = estimateCaloriesFromTitle(title);
              if (estimatedCalories > 0) {
                results.push({
                  name: title,
                  calories: estimatedCalories,
                  protein: Math.floor(estimatedCalories * 0.15),
                  fat: Math.floor(estimatedCalories * 0.25),
                  carbs: Math.floor(estimatedCalories * 0.6),
                  unit: '1個',
                  source: '楽天市場（包括的検索）',
                  url: originalUrl
                });
              }
            }
          }
        });
      }
    }

    console.log(`抽出されたデータ: ${results.length}件`);
    
    // 結果が0件の場合は、ページの構造をログ出力してデバッグ
    if (results.length === 0) {
      console.log('データが見つかりませんでした。ページ構造を確認:');
      console.log('利用可能なクラス:', $('[class]').map((i, el) => $(el).attr('class')).get().slice(0, 20));
      console.log('ページタイトル:', $('title').text());
      console.log('h1タグ:', $('h1').text());
      console.log('h2タグ:', $('h2').text());
      console.log('h3タグ:', $('h3').text());
      
      // クックパッドの場合の詳細デバッグ
      if (hostname.includes('cookpad.com')) {
        console.log('クックパッド固有の要素:');
        console.log('.recipe-preview:', $('.recipe-preview').length);
        console.log('.recipe-card:', $('.recipe-card').length);
        console.log('.recipe-item:', $('.recipe-item').length);
        console.log('.search_result:', $('.search_result').length);
        console.log('.recipe:', $('.recipe').length);
        console.log('.recipe-title:', $('.recipe-title').length);
        console.log('.title:', $('.title').length);
        console.log('.calorie:', $('.calorie').length);
        console.log('.kcal:', $('.kcal').length);
        console.log('[class*="recipe"]:', $('[class*="recipe"]').length);
        
        // 1文字でもヒットするように、より包括的な検索を試行
        console.log('包括的検索を試行中...');
        
        // レシピリンクから検索
        $('a[href*="/recipe/"]').each((index, element) => {
          const $el = $(element);
          const title = $el.text().trim();
          if (title && title.length > 2 && title.length < 100 && 
              !title.includes('絞り込む') && !title.includes('検索') && 
              !title.includes('新着') && !title.includes('人気')) {
            const estimatedCalories = estimateCaloriesFromTitle(title);
            if (estimatedCalories > 0) {
              results.push({
                name: title,
                calories: estimatedCalories,
                protein: Math.floor(estimatedCalories * 0.15),
                fat: Math.floor(estimatedCalories * 0.25),
                carbs: Math.floor(estimatedCalories * 0.6),
                unit: '1人前',
                source: 'クックパッド（包括的検索）',
                url: originalUrl
              });
            }
          }
        });
        
        // より包括的な検索：すべてのリンクとテキストを確認
        console.log('より包括的な検索を試行中...');
        $('a, h1, h2, h3, h4, h5, h6, .title, .name, .recipe-title, .recipe-name, .recipe_title').each((index, element) => {
          const $el = $(element);
          const title = $el.text().trim();
          
          // 料理らしい名前かチェック（より包括的なキーワード）
          if (title && title.length > 2 && title.length < 100 && 
              !title.includes('絞り込む') && !title.includes('検索') && 
              !title.includes('新着') && !title.includes('人気')) {
            const hasFoodKeywords = /(料理|レシピ|カレー|ラーメン|パスタ|サラダ|スープ|ケーキ|パン|ご飯|うどん|そば|ハンバーグ|唐揚げ|天ぷら|焼き魚|刺身|味噌汁|豆腐|納豆|卵|牛乳|チーズ|りんご|バナナ|いちご|チョコ|アイス|お菓子|スナック|ポッキー|プリッツ|チョコレート|クッキー|ビスケット|キャラメル|ガム|マシュマロ|プリン|シュークリーム|ドーナツ|パンケーキ|ワッフル|タルト|モンブラン|ティラミス|チーズケーキ|ショートケーキ|ロールケーキ|パイ|クレープ|まんじゅう|だんご|おはぎ|大福|わらびもち|ようかん|あんみつ|かき氷|みつまめ)/.test(title);
            
            if (hasFoodKeywords) {
              const estimatedCalories = estimateCaloriesFromTitle(title);
              if (estimatedCalories > 0) {
                results.push({
                  name: title,
                  calories: estimatedCalories,
                  protein: Math.floor(estimatedCalories * 0.15),
                  fat: Math.floor(estimatedCalories * 0.25),
                  carbs: Math.floor(estimatedCalories * 0.6),
                  unit: '1人前',
                  source: 'クックパッド（キーワード検索）',
                  url: originalUrl
                });
              }
            }
          }
        });
      }
      
      // 楽天レシピの場合の詳細デバッグ
      if (hostname.includes('rakuten.co.jp')) {
        console.log('楽天レシピ固有の要素:');
        console.log('.recipe-card:', $('.recipe-card').length);
        console.log('.recipe-item:', $('.recipe-item').length);
        console.log('.recipe-preview:', $('.recipe-preview').length);
        console.log('.search_result:', $('.search_result').length);
        console.log('.recipe:', $('.recipe').length);
        console.log('.recipe-title:', $('.recipe-title').length);
        console.log('.title:', $('.title').length);
        console.log('.calorie:', $('.calorie').length);
        console.log('.kcal:', $('.kcal').length);
        console.log('[class*="recipe"]:', $('[class*="recipe"]').length);
        
        // 1文字でもヒットするように、より包括的な検索を試行
        console.log('包括的検索を試行中...');
        $('a[href*="/recipe/"]').each((index, element) => {
          const $el = $(element);
          const title = $el.text().trim();
          if (title && title.length > 2 && title.length < 100) {
            const estimatedCalories = estimateCaloriesFromTitle(title);
            if (estimatedCalories > 0) {
              results.push({
                name: title,
                calories: estimatedCalories,
                protein: Math.floor(estimatedCalories * 0.15),
                fat: Math.floor(estimatedCalories * 0.25),
                carbs: Math.floor(estimatedCalories * 0.6),
                unit: '1人前',
                source: '楽天レシピ（包括的検索）',
                url: originalUrl
              });
            }
          }
        });
      }
    }

    return results;

  } catch (error) {
    console.error('HTML解析エラー:', error);
    return [];
  }
} 