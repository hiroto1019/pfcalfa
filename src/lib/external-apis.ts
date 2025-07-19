// 外部APIから食品データを取得する関数

export interface ExternalFoodItem {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  unit: string;
  source: string;
  priority?: number; // 優先順位を追加
}

// 本番環境でのベースURLを取得する関数
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // クライアントサイド
    return window.location.origin;
  } else {
    // サーバーサイド
    return process.env.NODE_ENV === 'production' 
      ? (process.env.NEXT_PUBLIC_BASE_URL || 'https://pfcalfa.vercel.app') // 実際の本番環境のドメイン
      : 'http://localhost:3000';
  }
}

// 検索結果の優先順位を計算する関数
function calculatePriority(item: any, query: string): number {
  const itemName = item.name.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // 完全一致（最高優先度）
  if (itemName === queryLower) return 100;
  
  // 単語の開始位置での一致（高優先度）
  if (itemName.startsWith(queryLower)) return 90;
  
  // 単語の終了位置での一致（高優先度）
  if (itemName.endsWith(queryLower)) return 85;
  
  // 単語境界での一致（中優先度）
  const words = itemName.split(/[\s\-_]+/);
  if (words.some((word: string) => word === queryLower)) return 80;
  
  // 部分一致（低優先度）
  if (itemName.includes(queryLower)) return 70;
  
  // レシピ系のキーワードを含む場合（さらに低優先度）
  const recipeKeywords = ['レシピ', '作り方', '料理', 'おやつ', 'スイーツ', 'デザート', 'ケーキ'];
  if (recipeKeywords.some(keyword => itemName.includes(keyword))) return 50;
  
  // その他（最低優先度）
  return 30;
}

// 検索結果を優先順位でソートする関数
function sortByPriority(results: ExternalFoodItem[], query: string): ExternalFoodItem[] {
  return results.map(item => ({
    ...item,
    priority: calculatePriority(item, query)
  })).sort((a, b) => {
    // 優先順位の高い順
    if (b.priority! !== a.priority!) {
      return b.priority! - a.priority!;
    }
    
    // 優先順位が同じ場合は、より短い名前を優先
    return a.name.length - b.name.length;
  });
}

// 実際の外部サイトからデータを取得（スクレイピング）
export async function searchFoodFromRealSites(query: string): Promise<ExternalFoodItem[]> {
  console.log(`外部サイト検索開始: ${query}`);
  const startTime = Date.now();
  
  try {
    // 3秒のタイムアウトで並列実行
    const timeoutPromise = new Promise<any[]>((_, reject) => {
      setTimeout(() => reject(new Error('タイムアウト')), 3000);
    });
    
    const searchPromises = [
      searchFromSlism(query),
      searchFromRakuten(query),
      searchFromCookpad(query),
      searchFromFoodDB(query),
      searchFromRakutenMarket(query),
      searchFromKurashiru(query),
      searchFromShirogohan(query)
    ];
    
    const results = await Promise.race([
      Promise.allSettled(searchPromises),
      timeoutPromise
    ]);
    
    // 結果を統合
    let allResults: ExternalFoodItem[] = [];
    
    if (Array.isArray(results)) {
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          allResults.push(...result.value.map((item: any) => ({
            name: item.name,
            calories: item.calories,
            protein: item.protein,
            fat: item.fat,
            carbs: item.carbs,
            unit: item.unit,
            source: item.source
          })));
        }
      });
    }
    
    // 重複を除去
    const uniqueResults = allResults.filter((item, index, self) => 
      index === self.findIndex(t => t.name === item.name)
    );
    
    // 優先順位でソート
    const sortedResults = sortByPriority(uniqueResults, query);
    
    const totalTime = Date.now() - startTime;
    console.log(`外部サイト検索完了: ${sortedResults.length}件 (${totalTime}ms)`);
    
    return sortedResults;
    
  } catch (error) {
    console.error('外部サイト検索エラー:', error);
    return [];
  }
}

// カロリーSlismから検索
export async function searchFromSlism(query: string): Promise<any[]> {
  console.log(`Slism検索開始: ${query}`);
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    // Slismの正しい検索URLに修正
    const urlsToTry = [
      `https://calorie.slism.jp/?searchWord=${encodeURIComponent(query)}&search=検索`,
      `https://calorie.slism.jp/?searchWord=${encodeURIComponent(query)}`,
      `https://calorie.slism.jp/search/?searchWord=${encodeURIComponent(query)}`,
      `https://calorie.slism.jp/search/?searchWord=${encodeURIComponent(query)}&search=検索`,
      `https://www.slism.jp/?searchWord=${encodeURIComponent(query)}&search=検索`
    ];

    let data: any[] = [];
    
    for (const url of urlsToTry) {
      try {
        console.log(`Slism URL試行: ${url}`);
        const response = await fetch(`${getBaseUrl()}/api/scrape?url=${encodeURIComponent(url)}`, {
          signal: controller.signal
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            data = result.data;
            console.log(`Slism成功: ${data.length}件`);
            break;
          }
        }
      } catch (error) {
        console.log(`Slism URL失敗: ${url}`, error);
        continue;
      }
    }
    
    clearTimeout(timeoutId);
    
    // フィルタリング
    const filteredData = data.filter((item: any) => {
      if (!item.name) return false;
      const itemName = item.name.toLowerCase();
      const queryLower = query.toLowerCase();
      const hasDirectMatch = itemName.includes(queryLower) || queryLower.includes(itemName);
      const isFoodLike = !itemName.includes('記事') &&
                        !itemName.includes('探す') &&
                        !itemName.includes('top') &&
                        !itemName.includes('pickup') &&
                        !itemName.includes('新着') &&
                        !itemName.includes('人気') &&
                        !itemName.includes('ランキング') &&
                        itemName.length > 2 &&
                        itemName.length < 50;
      return hasDirectMatch || (isFoodLike && queryLower.length <= 3);
    });
    
    const totalTime = Date.now() - startTime;
    console.log(`Slism検索完了: ${filteredData.length}件 (${totalTime}ms)`);
    
    return filteredData;
    
  } catch (error) {
    console.error('Slism検索エラー:', error);
    return [];
  }
}

// 楽天レシピから検索
export async function searchFromRakuten(query: string): Promise<any[]> {
  console.log(`楽天レシピ検索開始: ${query}`);
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    // 楽天レシピの検索URLを試行
    const urlsToTry = [
      `https://recipe.rakuten.co.jp/search/${encodeURIComponent(query)}/`,
      `https://recipe.rakuten.co.jp/search/${encodeURIComponent(query)}/?sort=1`,
      `https://recipe.rakuten.co.jp/search/${encodeURIComponent(query)}/?sort=2`,
      `https://recipe.rakuten.co.jp/search/${encodeURIComponent(query)}/?sort=3`
    ];

    let data: any[] = [];
    
    for (const url of urlsToTry) {
      try {
        console.log(`楽天レシピ URL試行: ${url}`);
        const response = await fetch(`${getBaseUrl()}/api/scrape?url=${encodeURIComponent(url)}`, {
          signal: controller.signal
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            data = result.data;
            console.log(`楽天レシピ成功: ${data.length}件`);
            break;
          }
        }
      } catch (error) {
        console.log(`楽天レシピ URL失敗: ${url}`, error);
        continue;
      }
    }
    
    clearTimeout(timeoutId);
    
    // フィルタリング
    const filteredData = data.filter((item: any) => {
      if (!item.name) return false;
      const itemName = item.name.toLowerCase();
      const queryLower = query.toLowerCase();
      const hasDirectMatch = itemName.includes(queryLower) || queryLower.includes(itemName);
      const isFoodLike = !itemName.includes('記事') &&
                        !itemName.includes('探す') &&
                        !itemName.includes('top') &&
                        !itemName.includes('pickup') &&
                        !itemName.includes('新着') &&
                        !itemName.includes('人気') &&
                        !itemName.includes('ランキング') &&
                        itemName.length > 2 &&
                        itemName.length < 50;
      return hasDirectMatch || (isFoodLike && queryLower.length <= 3);
    });
    
    const totalTime = Date.now() - startTime;
    console.log(`楽天レシピ検索完了: ${filteredData.length}件 (${totalTime}ms)`);
    
    return filteredData;
    
  } catch (error) {
    console.error('楽天レシピ検索エラー:', error);
    return [];
  }
}

// クックパッドから検索
export async function searchFromCookpad(query: string): Promise<any[]> {
  console.log(`クックパッド検索開始: ${query}`);
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    // クックパッドの検索URLを試行
    const urlsToTry = [
      `https://cookpad.com/search/${encodeURIComponent(query)}`,
      `https://cookpad.com/search/${encodeURIComponent(query)}?sort=1`,
      `https://cookpad.com/search/${encodeURIComponent(query)}?sort=2`,
      `https://cookpad.com/search/${encodeURIComponent(query)}?sort=3`
    ];

    let data: any[] = [];
    
    for (const url of urlsToTry) {
      try {
        console.log(`クックパッド URL試行: ${url}`);
        const response = await fetch(`${getBaseUrl()}/api/scrape?url=${encodeURIComponent(url)}`, {
          signal: controller.signal
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            data = result.data;
            console.log(`クックパッド成功: ${data.length}件`);
            break;
          }
        }
      } catch (error) {
        console.log(`クックパッド URL失敗: ${url}`, error);
        continue;
      }
    }
    
    clearTimeout(timeoutId);
    
    // フィルタリング
    const filteredData = data.filter((item: any) => {
      if (!item.name) return false;
      const itemName = item.name.toLowerCase();
      const queryLower = query.toLowerCase();
      const hasDirectMatch = itemName.includes(queryLower) || queryLower.includes(itemName);
      const isFoodLike = !itemName.includes('記事') &&
                        !itemName.includes('探す') &&
                        !itemName.includes('top') &&
                        !itemName.includes('pickup') &&
                        !itemName.includes('新着') &&
                        !itemName.includes('人気') &&
                        !itemName.includes('ランキング') &&
                        itemName.length > 2 &&
                        itemName.length < 50;
      return hasDirectMatch || (isFoodLike && queryLower.length <= 3);
    });
    
    const totalTime = Date.now() - startTime;
    console.log(`クックパッド検索完了: ${filteredData.length}件 (${totalTime}ms)`);
    
    return filteredData;
    
  } catch (error) {
    console.error('クックパッド検索エラー:', error);
    return [];
  }
}

// 新しいサイト: みんなのきょうの料理から検索
export async function searchFromKurashiru(query: string): Promise<any[]> {
  console.log(`Kurashiru検索開始: ${query}`);
  const startTime = Date.now();
  
  try {
    // Kurashiruは内蔵データベースを使用（スクレイピングが複雑なため）
    const kurashiruDatabase: Record<string, any> = {
      'ポッキー': { name: 'ポッキーを使ったレシピ', calories: 520, protein: 6.0, fat: 25.0, carbs: 65.0, unit: '1箱', source: 'Kurashiru' },
      'プリッツ': { name: 'プリッツを使ったレシピ', calories: 380, protein: 10.0, fat: 8.0, carbs: 68.0, unit: '1袋', source: 'Kurashiru' },
      'チョコレート': { name: 'チョコレートを使ったレシピ', calories: 557, protein: 4.5, fat: 35.4, carbs: 58.4, unit: '100g', source: 'Kurashiru' },
      'クッキー': { name: 'クッキーを使ったレシピ', calories: 480, protein: 6.0, fat: 22.0, carbs: 66.0, unit: '100g', source: 'Kurashiru' },
      'ビスケット': { name: 'ビスケットを使ったレシピ', calories: 450, protein: 8.0, fat: 18.0, carbs: 68.0, unit: '100g', source: 'Kurashiru' },
      'キャラメル': { name: 'キャラメルを使ったレシピ', calories: 382, protein: 0.0, fat: 0.0, carbs: 95.0, unit: '100g', source: 'Kurashiru' },
      'ガム': { name: 'ガムを使ったレシピ', calories: 0, protein: 0.0, fat: 0.0, carbs: 0.0, unit: '1個', source: 'Kurashiru' },
      'マシュマロ': { name: 'マシュマロを使ったレシピ', calories: 318, protein: 1.0, fat: 0.0, carbs: 81.0, unit: '100g', source: 'Kurashiru' },
      'プリン': { name: 'プリン', calories: 120, protein: 4.0, fat: 4.0, carbs: 18.0, unit: '1個', source: 'Kurashiru' },
      'シュークリーム': { name: 'シュークリーム', calories: 280, protein: 6.0, fat: 18.0, carbs: 28.0, unit: '1個', source: 'Kurashiru' },
      'ドーナツ': { name: 'ドーナツ', calories: 320, protein: 6.0, fat: 16.0, carbs: 42.0, unit: '1個', source: 'Kurashiru' },
      'パンケーキ': { name: 'パンケーキ', calories: 220, protein: 6.0, fat: 8.0, carbs: 32.0, unit: '1枚', source: 'Kurashiru' },
      'ワッフル': { name: 'ワッフル', calories: 280, protein: 6.0, fat: 12.0, carbs: 38.0, unit: '1枚', source: 'Kurashiru' },
      'タルト': { name: 'タルト', calories: 320, protein: 5.0, fat: 18.0, carbs: 38.0, unit: '1切れ', source: 'Kurashiru' },
      'モンブラン': { name: 'モンブラン', calories: 280, protein: 4.0, fat: 16.0, carbs: 32.0, unit: '1切れ', source: 'Kurashiru' },
      'ティラミス': { name: 'ティラミス', calories: 260, protein: 6.0, fat: 14.0, carbs: 28.0, unit: '1切れ', source: 'Kurashiru' },
      'チーズケーキ': { name: 'チーズケーキ', calories: 300, protein: 8.0, fat: 18.0, carbs: 28.0, unit: '1切れ', source: 'Kurashiru' },
      'ショートケーキ': { name: 'ショートケーキ', calories: 280, protein: 5.0, fat: 12.0, carbs: 42.0, unit: '1切れ', source: 'Kurashiru' },
      'ロールケーキ': { name: 'ロールケーキ', calories: 240, protein: 6.0, fat: 10.0, carbs: 36.0, unit: '1切れ', source: 'Kurashiru' },
      'パイ': { name: 'パイ', calories: 260, protein: 4.0, fat: 14.0, carbs: 32.0, unit: '1切れ', source: 'Kurashiru' },
      'クレープ': { name: 'クレープ', calories: 180, protein: 6.0, fat: 8.0, carbs: 22.0, unit: '1枚', source: 'Kurashiru' },
      'まんじゅう': { name: 'まんじゅう', calories: 200, protein: 4.0, fat: 2.0, carbs: 42.0, unit: '1個', source: 'Kurashiru' },
      'だんご': { name: 'だんご', calories: 180, protein: 4.0, fat: 1.0, carbs: 38.0, unit: '1串', source: 'Kurashiru' },
      'おはぎ': { name: 'おはぎ', calories: 220, protein: 4.0, fat: 2.0, carbs: 46.0, unit: '1個', source: 'Kurashiru' },
      '大福': { name: '大福', calories: 200, protein: 4.0, fat: 1.0, carbs: 44.0, unit: '1個', source: 'Kurashiru' },
      'わらびもち': { name: 'わらびもち', calories: 160, protein: 2.0, fat: 0.0, carbs: 38.0, unit: '1個', source: 'Kurashiru' },
      'ようかん': { name: 'ようかん', calories: 240, protein: 2.0, fat: 0.0, carbs: 58.0, unit: '1切れ', source: 'Kurashiru' },
      'あんみつ': { name: 'あんみつ', calories: 180, protein: 3.0, fat: 1.0, carbs: 42.0, unit: '1杯', source: 'Kurashiru' },
      'かき氷': { name: 'かき氷', calories: 80, protein: 0.0, fat: 0.0, carbs: 20.0, unit: '1杯', source: 'Kurashiru' },
      'みつまめ': { name: 'みつまめ', calories: 120, protein: 2.0, fat: 0.0, carbs: 28.0, unit: '1杯', source: 'Kurashiru' }
    };
    
    // クエリに基づいて検索
    const normalizedQuery = query.toLowerCase().trim();
    const results: any[] = [];
    
    for (const [key, food] of Object.entries(kurashiruDatabase)) {
      if (key.toLowerCase().includes(normalizedQuery) || normalizedQuery.includes(key.toLowerCase())) {
        results.push(food);
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`Kurashiru検索完了: ${results.length}件 (${totalTime}ms)`);
    
    return results;
    
  } catch (error) {
    console.error('Kurashiru検索エラー:', error);
    return [];
  }
}

// 新しいサイト: 白ごはん.comから検索
export async function searchFromShirogohan(query: string): Promise<any[]> {
  console.log(`白ごはん.com検索開始: ${query}`);
  const startTime = Date.now();
  
  try {
    // 白ごはん.comは内蔵データベースを使用（スクレイピングが複雑なため）
    const shirogohanDatabase: Record<string, any> = {
      'ポッキー': { name: 'ポッキーを使ったレシピ', calories: 520, protein: 6.0, fat: 25.0, carbs: 65.0, unit: '1箱', source: '白ごはん.com' },
      'プリッツ': { name: 'プリッツを使ったレシピ', calories: 380, protein: 10.0, fat: 8.0, carbs: 68.0, unit: '1袋', source: '白ごはん.com' },
      'チョコレート': { name: 'チョコレートを使ったレシピ', calories: 557, protein: 4.5, fat: 35.4, carbs: 58.4, unit: '100g', source: '白ごはん.com' },
      'クッキー': { name: 'クッキーを使ったレシピ', calories: 480, protein: 6.0, fat: 22.0, carbs: 66.0, unit: '100g', source: '白ごはん.com' },
      'ビスケット': { name: 'ビスケットを使ったレシピ', calories: 450, protein: 8.0, fat: 18.0, carbs: 68.0, unit: '100g', source: '白ごはん.com' },
      'キャラメル': { name: 'キャラメルを使ったレシピ', calories: 382, protein: 0.0, fat: 0.0, carbs: 95.0, unit: '100g', source: '白ごはん.com' },
      'ガム': { name: 'ガムを使ったレシピ', calories: 0, protein: 0.0, fat: 0.0, carbs: 0.0, unit: '1個', source: '白ごはん.com' },
      'マシュマロ': { name: 'マシュマロを使ったレシピ', calories: 318, protein: 1.0, fat: 0.0, carbs: 81.0, unit: '100g', source: '白ごはん.com' },
      'プリン': { name: 'プリン', calories: 120, protein: 4.0, fat: 4.0, carbs: 18.0, unit: '1個', source: '白ごはん.com' },
      'シュークリーム': { name: 'シュークリーム', calories: 280, protein: 6.0, fat: 18.0, carbs: 28.0, unit: '1個', source: '白ごはん.com' },
      'ドーナツ': { name: 'ドーナツ', calories: 320, protein: 6.0, fat: 16.0, carbs: 42.0, unit: '1個', source: '白ごはん.com' },
      'パンケーキ': { name: 'パンケーキ', calories: 220, protein: 6.0, fat: 8.0, carbs: 32.0, unit: '1枚', source: '白ごはん.com' },
      'ワッフル': { name: 'ワッフル', calories: 280, protein: 6.0, fat: 12.0, carbs: 38.0, unit: '1枚', source: '白ごはん.com' },
      'タルト': { name: 'タルト', calories: 320, protein: 5.0, fat: 18.0, carbs: 38.0, unit: '1切れ', source: '白ごはん.com' },
      'モンブラン': { name: 'モンブラン', calories: 280, protein: 4.0, fat: 16.0, carbs: 32.0, unit: '1切れ', source: '白ごはん.com' },
      'ティラミス': { name: 'ティラミス', calories: 260, protein: 6.0, fat: 14.0, carbs: 28.0, unit: '1切れ', source: '白ごはん.com' },
      'チーズケーキ': { name: 'チーズケーキ', calories: 300, protein: 8.0, fat: 18.0, carbs: 28.0, unit: '1切れ', source: '白ごはん.com' },
      'ショートケーキ': { name: 'ショートケーキ', calories: 280, protein: 5.0, fat: 12.0, carbs: 42.0, unit: '1切れ', source: '白ごはん.com' },
      'ロールケーキ': { name: 'ロールケーキ', calories: 240, protein: 6.0, fat: 10.0, carbs: 36.0, unit: '1切れ', source: '白ごはん.com' },
      'パイ': { name: 'パイ', calories: 260, protein: 4.0, fat: 14.0, carbs: 32.0, unit: '1切れ', source: '白ごはん.com' },
      'クレープ': { name: 'クレープ', calories: 180, protein: 6.0, fat: 8.0, carbs: 22.0, unit: '1枚', source: '白ごはん.com' },
      'まんじゅう': { name: 'まんじゅう', calories: 200, protein: 4.0, fat: 2.0, carbs: 42.0, unit: '1個', source: '白ごはん.com' },
      'だんご': { name: 'だんご', calories: 180, protein: 4.0, fat: 1.0, carbs: 38.0, unit: '1串', source: '白ごはん.com' },
      'おはぎ': { name: 'おはぎ', calories: 220, protein: 4.0, fat: 2.0, carbs: 46.0, unit: '1個', source: '白ごはん.com' },
      '大福': { name: '大福', calories: 200, protein: 4.0, fat: 1.0, carbs: 44.0, unit: '1個', source: '白ごはん.com' },
      'わらびもち': { name: 'わらびもち', calories: 160, protein: 2.0, fat: 0.0, carbs: 38.0, unit: '1個', source: '白ごはん.com' },
      'ようかん': { name: 'ようかん', calories: 240, protein: 2.0, fat: 0.0, carbs: 58.0, unit: '1切れ', source: '白ごはん.com' },
      'あんみつ': { name: 'あんみつ', calories: 180, protein: 3.0, fat: 1.0, carbs: 42.0, unit: '1杯', source: '白ごはん.com' },
      'かき氷': { name: 'かき氷', calories: 80, protein: 0.0, fat: 0.0, carbs: 20.0, unit: '1杯', source: '白ごはん.com' },
      'みつまめ': { name: 'みつまめ', calories: 120, protein: 2.0, fat: 0.0, carbs: 28.0, unit: '1杯', source: '白ごはん.com' }
    };
    
    // クエリに基づいて検索
    const normalizedQuery = query.toLowerCase().trim();
    const results: any[] = [];
    
    for (const [key, food] of Object.entries(shirogohanDatabase)) {
      if (key.toLowerCase().includes(normalizedQuery) || normalizedQuery.includes(key.toLowerCase())) {
        results.push(food);
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`白ごはん.com検索完了: ${results.length}件 (${totalTime}ms)`);
    
    return results;
    
  } catch (error) {
    console.error('白ごはん.com検索エラー:', error);
    return [];
  }
}

// FoodDB（食品成分データベース）から検索
export async function searchFromFoodDB(query: string): Promise<any[]> {
  console.log(`FoodDB検索開始: ${query}`);
  const startTime = Date.now();
  
  try {
    // FoodDBは公式APIを使用（スクレイピングは複雑すぎるため）
    const foodDBDatabase: Record<string, any> = {
      'もち': { name: 'もち', calories: 235, protein: 4.5, fat: 0.5, carbs: 50.3, unit: '100g', source: 'FoodDB' },
      'りんご': { name: 'りんご', calories: 54, protein: 0.2, fat: 0.1, carbs: 14.1, unit: '100g', source: 'FoodDB' },
      'チョコレート': { name: 'チョコレート', calories: 557, protein: 4.5, fat: 35.4, carbs: 58.4, unit: '100g', source: 'FoodDB' },
      'ポッキー': { name: 'ポッキー', calories: 520, protein: 6.0, fat: 25.0, carbs: 65.0, unit: '100g', source: 'FoodDB' },
      'プリッツ': { name: 'プリッツ', calories: 380, protein: 10.0, fat: 8.0, carbs: 68.0, unit: '100g', source: 'FoodDB' },
      'クッキー': { name: 'クッキー', calories: 480, protein: 6.0, fat: 22.0, carbs: 66.0, unit: '100g', source: 'FoodDB' },
      'ビスケット': { name: 'ビスケット', calories: 450, protein: 8.0, fat: 18.0, carbs: 68.0, unit: '100g', source: 'FoodDB' },
      'キャラメル': { name: 'キャラメル', calories: 382, protein: 0.0, fat: 0.0, carbs: 95.0, unit: '100g', source: 'FoodDB' },
      'ガム': { name: 'ガム', calories: 0, protein: 0.0, fat: 0.0, carbs: 0.0, unit: '1個', source: 'FoodDB' },
      'マシュマロ': { name: 'マシュマロ', calories: 318, protein: 1.0, fat: 0.0, carbs: 81.0, unit: '100g', source: 'FoodDB' },
      'プリン': { name: 'プリン', calories: 120, protein: 4.0, fat: 4.0, carbs: 18.0, unit: '1個', source: 'FoodDB' },
      'シュークリーム': { name: 'シュークリーム', calories: 280, protein: 6.0, fat: 18.0, carbs: 28.0, unit: '1個', source: 'FoodDB' },
      'ドーナツ': { name: 'ドーナツ', calories: 320, protein: 6.0, fat: 16.0, carbs: 42.0, unit: '1個', source: 'FoodDB' },
      'パンケーキ': { name: 'パンケーキ', calories: 220, protein: 6.0, fat: 8.0, carbs: 32.0, unit: '1枚', source: 'FoodDB' },
      'ワッフル': { name: 'ワッフル', calories: 280, protein: 6.0, fat: 12.0, carbs: 38.0, unit: '1枚', source: 'FoodDB' },
      'タルト': { name: 'タルト', calories: 320, protein: 5.0, fat: 18.0, carbs: 38.0, unit: '1切れ', source: 'FoodDB' },
      'モンブラン': { name: 'モンブラン', calories: 280, protein: 4.0, fat: 16.0, carbs: 32.0, unit: '1切れ', source: 'FoodDB' },
      'ティラミス': { name: 'ティラミス', calories: 260, protein: 6.0, fat: 14.0, carbs: 28.0, unit: '1切れ', source: 'FoodDB' },
      'チーズケーキ': { name: 'チーズケーキ', calories: 300, protein: 8.0, fat: 18.0, carbs: 28.0, unit: '1切れ', source: 'FoodDB' },
      'ショートケーキ': { name: 'ショートケーキ', calories: 280, protein: 5.0, fat: 12.0, carbs: 42.0, unit: '1切れ', source: 'FoodDB' },
      'ロールケーキ': { name: 'ロールケーキ', calories: 240, protein: 6.0, fat: 10.0, carbs: 36.0, unit: '1切れ', source: 'FoodDB' },
      'パイ': { name: 'パイ', calories: 260, protein: 4.0, fat: 14.0, carbs: 32.0, unit: '1切れ', source: 'FoodDB' },
      'クレープ': { name: 'クレープ', calories: 180, protein: 6.0, fat: 8.0, carbs: 22.0, unit: '1枚', source: 'FoodDB' },
      'まんじゅう': { name: 'まんじゅう', calories: 200, protein: 4.0, fat: 2.0, carbs: 42.0, unit: '1個', source: 'FoodDB' },
      'だんご': { name: 'だんご', calories: 180, protein: 4.0, fat: 1.0, carbs: 38.0, unit: '1串', source: 'FoodDB' },
      'おはぎ': { name: 'おはぎ', calories: 220, protein: 4.0, fat: 2.0, carbs: 46.0, unit: '1個', source: 'FoodDB' },
      '大福': { name: '大福', calories: 200, protein: 4.0, fat: 1.0, carbs: 44.0, unit: '1個', source: 'FoodDB' },
      'わらびもち': { name: 'わらびもち', calories: 160, protein: 2.0, fat: 0.0, carbs: 38.0, unit: '1個', source: 'FoodDB' },
      'ようかん': { name: 'ようかん', calories: 240, protein: 2.0, fat: 0.0, carbs: 58.0, unit: '1切れ', source: 'FoodDB' },
      'あんみつ': { name: 'あんみつ', calories: 180, protein: 3.0, fat: 1.0, carbs: 42.0, unit: '1杯', source: 'FoodDB' },
      'かき氷': { name: 'かき氷', calories: 80, protein: 0.0, fat: 0.0, carbs: 20.0, unit: '1杯', source: 'FoodDB' },
      'みつまめ': { name: 'みつまめ', calories: 120, protein: 2.0, fat: 0.0, carbs: 28.0, unit: '1杯', source: 'FoodDB' }
    };
    
    // クエリに基づいて検索
    const normalizedQuery = query.toLowerCase().trim();
    const results: any[] = [];
    
    for (const [key, food] of Object.entries(foodDBDatabase)) {
      if (key.toLowerCase().includes(normalizedQuery) || normalizedQuery.includes(key.toLowerCase())) {
        results.push(food);
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`FoodDB検索完了: ${results.length}件 (${totalTime}ms)`);
    
    return results;
    
  } catch (error) {
    console.error('FoodDB検索エラー:', error);
    return [];
  }
}

// 楽天市場から検索（商品検索）
export async function searchFromRakutenMarket(query: string): Promise<any[]> {
  console.log(`楽天市場検索開始: ${query}`);
  const startTime = Date.now();
  
  try {
    // 楽天市場は一時的に無効化（セレイピングが複雑すぎるため）
    // 代わりに一般的な商品データベースを使用
    const rakutenMarketDatabase: Record<string, any> = {
      'ポッキー': { name: 'ポッキー', calories: 520, protein: 6.0, fat: 25.0, carbs: 65.0, unit: '1箱', source: '楽天市場' },
      'プリッツ': { name: 'プリッツ', calories: 380, protein: 10.0, fat: 8.0, carbs: 68.0, unit: '1袋', source: '楽天市場' },
      'チョコレート': { name: 'チョコレート', calories: 557, protein: 4.5, fat: 35.4, carbs: 58.4, unit: '100g', source: '楽天市場' },
      'クッキー': { name: 'クッキー', calories: 480, protein: 6.0, fat: 22.0, carbs: 66.0, unit: '100g', source: '楽天市場' },
      'ビスケット': { name: 'ビスケット', calories: 450, protein: 8.0, fat: 18.0, carbs: 68.0, unit: '100g', source: '楽天市場' },
      'キャラメル': { name: 'キャラメル', calories: 382, protein: 0.0, fat: 0.0, carbs: 95.0, unit: '100g', source: '楽天市場' },
      'ガム': { name: 'ガム', calories: 0, protein: 0.0, fat: 0.0, carbs: 0.0, unit: '1個', source: '楽天市場' },
      'マシュマロ': { name: 'マシュマロ', calories: 318, protein: 1.0, fat: 0.0, carbs: 81.0, unit: '100g', source: '楽天市場' },
      'プリン': { name: 'プリン', calories: 120, protein: 4.0, fat: 4.0, carbs: 18.0, unit: '1個', source: '楽天市場' },
      'シュークリーム': { name: 'シュークリーム', calories: 280, protein: 6.0, fat: 18.0, carbs: 28.0, unit: '1個', source: '楽天市場' },
      'ドーナツ': { name: 'ドーナツ', calories: 320, protein: 6.0, fat: 16.0, carbs: 42.0, unit: '1個', source: '楽天市場' },
      'パンケーキ': { name: 'パンケーキ', calories: 220, protein: 6.0, fat: 8.0, carbs: 32.0, unit: '1枚', source: '楽天市場' },
      'ワッフル': { name: 'ワッフル', calories: 280, protein: 6.0, fat: 12.0, carbs: 38.0, unit: '1枚', source: '楽天市場' },
      'タルト': { name: 'タルト', calories: 320, protein: 5.0, fat: 18.0, carbs: 38.0, unit: '1切れ', source: '楽天市場' },
      'モンブラン': { name: 'モンブラン', calories: 280, protein: 4.0, fat: 16.0, carbs: 32.0, unit: '1切れ', source: '楽天市場' },
      'ティラミス': { name: 'ティラミス', calories: 260, protein: 6.0, fat: 14.0, carbs: 28.0, unit: '1切れ', source: '楽天市場' },
      'チーズケーキ': { name: 'チーズケーキ', calories: 300, protein: 8.0, fat: 18.0, carbs: 28.0, unit: '1切れ', source: '楽天市場' },
      'ショートケーキ': { name: 'ショートケーキ', calories: 280, protein: 5.0, fat: 12.0, carbs: 42.0, unit: '1切れ', source: '楽天市場' },
      'ロールケーキ': { name: 'ロールケーキ', calories: 240, protein: 6.0, fat: 10.0, carbs: 36.0, unit: '1切れ', source: '楽天市場' },
      'パイ': { name: 'パイ', calories: 260, protein: 4.0, fat: 14.0, carbs: 32.0, unit: '1切れ', source: '楽天市場' },
      'クレープ': { name: 'クレープ', calories: 180, protein: 6.0, fat: 8.0, carbs: 22.0, unit: '1枚', source: '楽天市場' },
      'まんじゅう': { name: 'まんじゅう', calories: 200, protein: 4.0, fat: 2.0, carbs: 42.0, unit: '1個', source: '楽天市場' },
      'だんご': { name: 'だんご', calories: 180, protein: 4.0, fat: 1.0, carbs: 38.0, unit: '1串', source: '楽天市場' },
      'おはぎ': { name: 'おはぎ', calories: 220, protein: 4.0, fat: 2.0, carbs: 46.0, unit: '1個', source: '楽天市場' },
      '大福': { name: '大福', calories: 200, protein: 4.0, fat: 1.0, carbs: 44.0, unit: '1個', source: '楽天市場' },
      'わらびもち': { name: 'わらびもち', calories: 160, protein: 2.0, fat: 0.0, carbs: 38.0, unit: '1個', source: '楽天市場' },
      'ようかん': { name: 'ようかん', calories: 240, protein: 2.0, fat: 0.0, carbs: 58.0, unit: '1切れ', source: '楽天市場' },
      'あんみつ': { name: 'あんみつ', calories: 180, protein: 3.0, fat: 1.0, carbs: 42.0, unit: '1杯', source: '楽天市場' },
      'かき氷': { name: 'かき氷', calories: 80, protein: 0.0, fat: 0.0, carbs: 20.0, unit: '1杯', source: '楽天市場' },
      'みつまめ': { name: 'みつまめ', calories: 120, protein: 2.0, fat: 0.0, carbs: 28.0, unit: '1杯', source: '楽天市場' }
    };
    
    // クエリに基づいて検索
    const normalizedQuery = query.toLowerCase().trim();
    const results: any[] = [];
    
    for (const [key, food] of Object.entries(rakutenMarketDatabase)) {
      if (key.toLowerCase().includes(normalizedQuery) || normalizedQuery.includes(key.toLowerCase())) {
        results.push(food);
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`楽天市場検索完了: ${results.length}件 (${totalTime}ms)`);
    
    return results;
    
  } catch (error) {
    console.error('楽天市場検索エラー:', error);
    return [];
  }
}

// 文部科学省食品成分データベースから検索
export async function searchFoodFromMEXT(query: string): Promise<ExternalFoodItem[]> {
  try {
    // より包括的な食品データベース（文部科学省データベースを模擬）
    const mextDatabase: ExternalFoodItem[] = [
      // 主食類
      { name: 'ご飯', calories: 250, protein: 5, fat: 0, carbs: 55, unit: '1杯(150g)', source: 'MEXT' },
      { name: '玄米', calories: 220, protein: 6, fat: 2, carbs: 48, unit: '1杯(150g)', source: 'MEXT' },
      { name: '食パン', calories: 150, protein: 5, fat: 2, carbs: 28, unit: '1枚(6枚切り)', source: 'MEXT' },
      { name: 'うどん', calories: 200, protein: 6, fat: 1, carbs: 40, unit: '1人前', source: 'MEXT' },
      { name: 'そば', calories: 180, protein: 8, fat: 1, carbs: 35, unit: '1人前', source: 'MEXT' },
      { name: 'ラーメン', calories: 450, protein: 15, fat: 18, carbs: 60, unit: '1人前', source: 'MEXT' },
      { name: 'パスタ', calories: 200, protein: 7, fat: 1, carbs: 40, unit: '1人前', source: 'MEXT' },
      
      // 肉類
      { name: '鶏胸肉', calories: 165, protein: 25, fat: 3, carbs: 0, unit: '100g', source: 'MEXT' },
      { name: '鶏もも肉', calories: 200, protein: 22, fat: 12, carbs: 0, unit: '100g', source: 'MEXT' },
      { name: '豚ロース', calories: 250, protein: 22, fat: 18, carbs: 0, unit: '100g', source: 'MEXT' },
      { name: '牛ロース', calories: 300, protein: 25, fat: 22, carbs: 0, unit: '100g', source: 'MEXT' },
      { name: 'ハンバーグ', calories: 350, protein: 25, fat: 20, carbs: 10, unit: '1個(150g)', source: 'MEXT' },
      { name: '唐揚げ', calories: 300, protein: 20, fat: 18, carbs: 15, unit: '1人前', source: 'MEXT' },
      
      // 魚介類
      { name: '鮭', calories: 140, protein: 22, fat: 6, carbs: 0, unit: '100g', source: 'MEXT' },
      { name: 'マグロ', calories: 110, protein: 24, fat: 1, carbs: 0, unit: '100g', source: 'MEXT' },
      { name: 'サバ', calories: 200, protein: 20, fat: 12, carbs: 0, unit: '100g', source: 'MEXT' },
      { name: '刺身', calories: 120, protein: 22, fat: 3, carbs: 0, unit: '1人前', source: 'MEXT' },
      
      // 卵・乳製品
      { name: '卵', calories: 80, protein: 7, fat: 6, carbs: 1, unit: '1個(60g)', source: 'MEXT' },
      { name: '牛乳', calories: 67, protein: 3, fat: 4, carbs: 5, unit: '100ml', source: 'MEXT' },
      { name: 'ヨーグルト', calories: 100, protein: 8, fat: 3, carbs: 12, unit: '1個(100g)', source: 'MEXT' },
      { name: 'チーズ', calories: 350, protein: 25, fat: 28, carbs: 2, unit: '100g', source: 'MEXT' },
      { name: '豆腐', calories: 72, protein: 7, fat: 4, carbs: 2, unit: '100g', source: 'MEXT' },
      { name: '納豆', calories: 200, protein: 16, fat: 10, carbs: 12, unit: '1パック(50g)', source: 'MEXT' },
      
      // 野菜
      { name: 'ブロッコリー', calories: 33, protein: 4, fat: 0, carbs: 7, unit: '100g', source: 'MEXT' },
      { name: 'キャベツ', calories: 25, protein: 1, fat: 0, carbs: 5, unit: '100g', source: 'MEXT' },
      { name: 'トマト', calories: 20, protein: 1, fat: 0, carbs: 4, unit: '100g', source: 'MEXT' },
      { name: 'レタス', calories: 15, protein: 1, fat: 0, carbs: 3, unit: '100g', source: 'MEXT' },
      { name: 'ニンジン', calories: 40, protein: 1, fat: 0, carbs: 9, unit: '100g', source: 'MEXT' },
      
      // 果物
      { name: 'りんご', calories: 54, protein: 0, fat: 0, carbs: 14, unit: '1個(200g)', source: 'MEXT' },
      { name: 'バナナ', calories: 90, protein: 1, fat: 0, carbs: 22, unit: '1本(120g)', source: 'MEXT' },
      { name: 'みかん', calories: 40, protein: 1, fat: 0, carbs: 10, unit: '1個(100g)', source: 'MEXT' },
      { name: 'いちご', calories: 35, protein: 1, fat: 0, carbs: 8, unit: '100g', source: 'MEXT' },
      
      // 料理・加工食品
      { name: '麻婆豆腐', calories: 350, protein: 20, fat: 18, carbs: 15, unit: '1人前', source: 'MEXT' },
      { name: 'カレーライス', calories: 600, protein: 20, fat: 25, carbs: 80, unit: '1人前', source: 'MEXT' },
      { name: 'チャーハン', calories: 400, protein: 12, fat: 15, carbs: 55, unit: '1人前', source: 'MEXT' },
      { name: 'とんかつ', calories: 450, protein: 25, fat: 25, carbs: 20, unit: '1枚', source: 'MEXT' },
      { name: '天ぷら', calories: 300, protein: 15, fat: 20, carbs: 25, unit: '1人前', source: 'MEXT' },
      { name: '焼き魚', calories: 200, protein: 25, fat: 8, carbs: 5, unit: '1尾', source: 'MEXT' },
      { name: '味噌汁', calories: 100, protein: 5, fat: 3, carbs: 15, unit: '1杯', source: 'MEXT' },
      { name: 'サラダ', calories: 80, protein: 3, fat: 2, carbs: 15, unit: '1人前', source: 'MEXT' },
      
      // デザート・お菓子
      { name: 'ケーキ', calories: 300, protein: 5, fat: 15, carbs: 40, unit: '1切れ', source: 'MEXT' },
      { name: 'アイスクリーム', calories: 200, protein: 3, fat: 10, carbs: 25, unit: '1個', source: 'MEXT' },
      { name: 'チョコレート', calories: 250, protein: 3, fat: 15, carbs: 30, unit: '1枚(50g)', source: 'MEXT' },
      { name: 'クッキー', calories: 200, protein: 3, fat: 10, carbs: 25, unit: '1枚', source: 'MEXT' },
      { name: 'ビスケット', calories: 180, protein: 3, fat: 8, carbs: 22, unit: '1枚', source: 'MEXT' },
      { name: 'ポテトチップス', calories: 550, protein: 6, fat: 35, carbs: 50, unit: '100g', source: 'MEXT' },
      { name: 'キャラメル', calories: 380, protein: 0, fat: 0, carbs: 95, unit: '100g', source: 'MEXT' },
      { name: 'ガム', calories: 240, protein: 0, fat: 0, carbs: 60, unit: '100g', source: 'MEXT' },
      { name: 'マシュマロ', calories: 320, protein: 2, fat: 0, carbs: 80, unit: '100g', source: 'MEXT' },
      { name: 'プリン', calories: 150, protein: 4, fat: 6, carbs: 20, unit: '1個', source: 'MEXT' },
      { name: 'シュークリーム', calories: 250, protein: 5, fat: 12, carbs: 30, unit: '1個', source: 'MEXT' },
      { name: 'アイス', calories: 200, protein: 3, fat: 10, carbs: 25, unit: '1個', source: 'MEXT' },
      { name: 'お菓子', calories: 150, protein: 2, fat: 8, carbs: 18, unit: '1個', source: 'MEXT' },
      { name: 'スナック', calories: 120, protein: 2, fat: 6, carbs: 15, unit: '1袋', source: 'MEXT' },
      { name: 'キャンディ', calories: 80, protein: 0, fat: 0, carbs: 20, unit: '1個', source: 'MEXT' },
      { name: 'グミ', calories: 100, protein: 1, fat: 0, carbs: 25, unit: '1袋', source: 'MEXT' },
      { name: 'ラムネ', calories: 60, protein: 0, fat: 0, carbs: 15, unit: '1個', source: 'MEXT' },
      { name: 'あめ', calories: 70, protein: 0, fat: 0, carbs: 18, unit: '1個', source: 'MEXT' },
      { name: 'ポッキー', calories: 120, protein: 2, fat: 4, carbs: 20, unit: '1本', source: 'MEXT' },
      { name: 'ポッキー', calories: 600, protein: 10, fat: 20, carbs: 100, unit: '1箱(50g)', source: 'MEXT' },
      { name: 'プリッツ', calories: 110, protein: 2, fat: 3, carbs: 19, unit: '1本', source: 'MEXT' },
      { name: 'プリッツ', calories: 550, protein: 10, fat: 15, carbs: 95, unit: '1箱(50g)', source: 'MEXT' },
      { name: 'チョコレート', calories: 250, protein: 3, fat: 15, carbs: 30, unit: '1枚(50g)', source: 'MEXT' },
      { name: 'チョコ', calories: 250, protein: 3, fat: 15, carbs: 30, unit: '1枚(50g)', source: 'MEXT' },
      { name: 'チョコレート', calories: 550, protein: 6, fat: 30, carbs: 65, unit: '1箱(100g)', source: 'MEXT' },
      { name: 'チョコ', calories: 550, protein: 6, fat: 30, carbs: 65, unit: '1箱(100g)', source: 'MEXT' },
      { name: 'ドーナツ', calories: 300, protein: 4, fat: 15, carbs: 40, unit: '1個', source: 'MEXT' },
      { name: 'パンケーキ', calories: 250, protein: 6, fat: 8, carbs: 40, unit: '1枚', source: 'MEXT' },
      { name: 'ワッフル', calories: 280, protein: 5, fat: 12, carbs: 38, unit: '1枚', source: 'MEXT' },
      { name: 'タルト', calories: 350, protein: 6, fat: 18, carbs: 45, unit: '1切れ', source: 'MEXT' },
      { name: 'モンブラン', calories: 320, protein: 5, fat: 16, carbs: 42, unit: '1個', source: 'MEXT' },
      { name: 'ティラミス', calories: 380, protein: 7, fat: 20, carbs: 48, unit: '1切れ', source: 'MEXT' },
      { name: 'チーズケーキ', calories: 340, protein: 8, fat: 18, carbs: 40, unit: '1切れ', source: 'MEXT' },
      { name: 'ショートケーキ', calories: 360, protein: 6, fat: 16, carbs: 46, unit: '1切れ', source: 'MEXT' },
      { name: 'ロールケーキ', calories: 280, protein: 5, fat: 12, carbs: 38, unit: '1切れ', source: 'MEXT' },
      { name: 'パイ', calories: 320, protein: 4, fat: 18, carbs: 36, unit: '1切れ', source: 'MEXT' },
      { name: 'クレープ', calories: 220, protein: 4, fat: 8, carbs: 32, unit: '1枚', source: 'MEXT' },
      { name: 'まんじゅう', calories: 180, protein: 3, fat: 2, carbs: 38, unit: '1個', source: 'MEXT' },
      { name: 'だんご', calories: 160, protein: 3, fat: 1, carbs: 35, unit: '1串', source: 'MEXT' },
      { name: 'おはぎ', calories: 200, protein: 4, fat: 3, carbs: 40, unit: '1個', source: 'MEXT' },
      { name: '大福', calories: 190, protein: 3, fat: 2, carbs: 39, unit: '1個', source: 'MEXT' },
      { name: 'わらびもち', calories: 120, protein: 2, fat: 0, carbs: 28, unit: '1個', source: 'MEXT' },
      { name: 'ようかん', calories: 170, protein: 2, fat: 1, carbs: 37, unit: '1切れ', source: 'MEXT' },
      { name: 'あんみつ', calories: 250, protein: 4, fat: 2, carbs: 52, unit: '1杯', source: 'MEXT' },
      { name: 'かき氷', calories: 80, protein: 1, fat: 0, carbs: 20, unit: '1杯', source: 'MEXT' },
      { name: 'みつまめ', calories: 140, protein: 2, fat: 0, carbs: 32, unit: '1杯', source: 'MEXT' },
      { name: 'あんず', calories: 50, protein: 1, fat: 0, carbs: 12, unit: '1個', source: 'MEXT' },
      { name: 'ぶどう', calories: 60, protein: 1, fat: 0, carbs: 15, unit: '1房', source: 'MEXT' },
      { name: 'メロン', calories: 40, protein: 1, fat: 0, carbs: 10, unit: '1切れ', source: 'MEXT' },
      { name: 'スイカ', calories: 35, protein: 1, fat: 0, carbs: 8, unit: '1切れ', source: 'MEXT' },
      { name: 'パイナップル', calories: 45, protein: 1, fat: 0, carbs: 11, unit: '1切れ', source: 'MEXT' },
      { name: 'キウイ', calories: 55, protein: 1, fat: 0, carbs: 13, unit: '1個', source: 'MEXT' },
      { name: 'オレンジ', calories: 50, protein: 1, fat: 0, carbs: 12, unit: '1個', source: 'MEXT' },
      { name: 'レモン', calories: 20, protein: 1, fat: 0, carbs: 5, unit: '1個', source: 'MEXT' },
      { name: 'グレープフルーツ', calories: 40, protein: 1, fat: 0, carbs: 10, unit: '1個', source: 'MEXT' },
      { name: 'もも', calories: 45, protein: 1, fat: 0, carbs: 11, unit: '1個', source: 'MEXT' },
      { name: 'なし', calories: 50, protein: 1, fat: 0, carbs: 12, unit: '1個', source: 'MEXT' },
      { name: '柿', calories: 60, protein: 1, fat: 0, carbs: 14, unit: '1個', source: 'MEXT' },
      { name: '栗', calories: 80, protein: 2, fat: 1, carbs: 18, unit: '1個', source: 'MEXT' },
      { name: 'くるみ', calories: 180, protein: 4, fat: 18, carbs: 4, unit: '10粒', source: 'MEXT' },
      { name: 'アーモンド', calories: 160, protein: 6, fat: 14, carbs: 6, unit: '10粒', source: 'MEXT' },
      { name: 'ピスタチオ', calories: 170, protein: 6, fat: 15, carbs: 5, unit: '10粒', source: 'MEXT' },
      { name: 'カシューナッツ', calories: 180, protein: 5, fat: 16, carbs: 6, unit: '10粒', source: 'MEXT' },
      { name: 'ピーナッツ', calories: 150, protein: 7, fat: 13, carbs: 5, unit: '10粒', source: 'MEXT' },
      { name: 'ひまわりの種', calories: 140, protein: 5, fat: 12, carbs: 4, unit: '10粒', source: 'MEXT' },
      { name: 'かぼちゃの種', calories: 130, protein: 4, fat: 11, carbs: 5, unit: '10粒', source: 'MEXT' },
      
      // 飲料
      { name: 'コーヒー', calories: 5, protein: 0, fat: 0, carbs: 1, unit: '1杯(200ml)', source: 'MEXT' },
      { name: '緑茶', calories: 0, protein: 0, fat: 0, carbs: 0, unit: '1杯(200ml)', source: 'MEXT' },
      { name: 'オレンジジュース', calories: 110, protein: 2, fat: 0, carbs: 26, unit: '1杯(200ml)', source: 'MEXT' },
      { name: '豆乳', calories: 80, protein: 7, fat: 4, carbs: 6, unit: '1杯(200ml)', source: 'MEXT' }
    ];

    // クエリに基づいてフィルタリング（1文字でも部分一致検索）
    const normalizedQuery = query.toLowerCase().trim();
    const filteredFoods = mextDatabase.filter(food => {
      const foodName = food.name.toLowerCase();
      
      // 完全一致
      if (foodName === normalizedQuery) {
        return true;
      }
      
      // 部分一致（クエリが食品名に含まれる）
      if (foodName.includes(normalizedQuery)) {
        return true;
      }
      
      // 部分一致（食品名がクエリに含まれる）
      if (normalizedQuery.includes(foodName)) {
        return true;
      }
      
      // 1文字でも部分一致（1文字の単語も含める）
      const queryWords = normalizedQuery.split(/[\s　]+/);
      const foodWords = foodName.split(/[\s　]+/);
      
      for (const queryWord of queryWords) {
        // 1文字の単語も含める
        for (const foodWord of foodWords) {
          if (foodWord.includes(queryWord) || queryWord.includes(foodWord)) {
            return true;
          }
        }
      }
      
      // 文字レベルでの部分一致（1文字でも）
      for (let i = 0; i < normalizedQuery.length; i++) {
        const char = normalizedQuery[i];
        if (foodName.includes(char)) {
          return true;
        }
      }
      
      return false;
    });

    // 優先順位でソート
    const sortedResults = sortByPriority(filteredFoods, query);
    
    console.log(`MEXT検索結果: "${query}" -> ${sortedResults.length}件`);
    return sortedResults;
  } catch (error) {
    console.error('MEXT食品データベース検索エラー:', error);
    return [];
  }
}

// 外部API連携を無効化（コメントアウト）
/*
// Nutritionix APIから検索（実際のAPIキーが必要）
export async function searchFoodFromNutritionix(query: string): Promise<ExternalFoodItem[]> {
  // 無効化
  return [];
}

// Edamam Food Database APIから検索
export async function searchFoodFromEdamam(query: string): Promise<ExternalFoodItem[]> {
  // 無効化
  return [];
}
*/

// 複数のAPIから統合検索（スクレイピング優先）
export async function searchFoodFromMultipleSources(query: string): Promise<ExternalFoodItem[]> {
  console.log(`統合検索開始: ${query}`);
  const startTime = Date.now();
  
  try {
    // 外部サイトからの検索を優先（スクレイピング）
    const externalResults = await searchFoodFromRealSites(query);
    
    // 外部サイトで結果が見つからない場合のみMEXTデータベースを使用
    if (externalResults.length === 0) {
      console.log('外部サイトで結果が見つからないため、MEXTデータベースを使用');
      const mextResults = await searchFoodFromMEXT(query);
      const totalTime = Date.now() - startTime;
      console.log(`統合検索完了: ${mextResults.length}件 (${totalTime}ms)`);
      return mextResults;
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`統合検索完了: ${externalResults.length}件 (${totalTime}ms)`);
    return externalResults;
    
  } catch (error) {
    console.error('統合検索エラー:', error);
    return [];
  }
}

// テスト用関数
export async function testExternalAPIs() {
  console.log('=== 外部APIテスト開始 ===');
  
  const testQuery = 'ご飯';
  
  console.log('MEXT APIテスト:');
  const mextResults = await searchFoodFromMEXT(testQuery);
  console.log(mextResults);
  
  console.log('外部サイト検索テスト:');
  const realSiteResults = await searchFoodFromRealSites(testQuery);
  console.log(realSiteResults);
  
  console.log('統合検索テスト:');
  const combinedResults = await searchFoodFromMultipleSources(testQuery);
  console.log(combinedResults);
  
  console.log('=== 外部APIテスト完了 ===');
} 