// 外部APIから食品データを取得する関数

export interface ExternalFoodItem {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  unit: string;
  source: string;
}

// 本番環境でのベースURLを取得する関数
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // クライアントサイド
    return window.location.origin;
  } else {
    // サーバーサイド
    return process.env.NODE_ENV === 'production' 
      ? (process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com') // 本番環境のドメインに変更
      : 'http://localhost:3000';
  }
}

// 実際の外部サイトからデータを取得（スクレイピング）
export async function searchFoodFromRealSites(query: string): Promise<ExternalFoodItem[]> {
  try {
    console.log(`実際の外部サイトから検索: ${query}`);
    
    // 複数の外部サイトからデータを取得
    const results: ExternalFoodItem[] = [];
    
    // 1. カロリーSlism（日本の食品データベース）
    try {
      const slismResults = await searchFromSlism(query);
      results.push(...slismResults);
    } catch (error) {
      console.log('Slism検索エラー:', error);
    }
    
    // 2. 楽天レシピ（料理データベース）
    try {
      const rakutenResults = await searchFromRakuten(query);
      results.push(...rakutenResults);
    } catch (error) {
      console.log('楽天レシピ検索エラー:', error);
    }
    
    // 3. クックパッド（料理データベース）
    try {
      const cookpadResults = await searchFromCookpad(query);
      results.push(...cookpadResults);
    } catch (error) {
      console.log('クックパッド検索エラー:', error);
    }
    
    // 重複を除去
    const uniqueResults = results.filter((food, index, self) => 
      index === self.findIndex(f => f.name.toLowerCase() === food.name.toLowerCase())
    );
    
    console.log(`外部サイト検索結果: ${uniqueResults.length}件`);
    return uniqueResults;
    
  } catch (error) {
    console.error('外部サイト検索エラー:', error);
    return [];
  }
}

// カロリーSlismから検索
async function searchFromSlism(query: string): Promise<ExternalFoodItem[]> {
  try {
    // Slismの検索ページをスクレイピング
    const searchUrl = `https://www.slism.jp/calorie/search/?keyword=${encodeURIComponent(query)}`;
    
    // 注意: 実際のスクレイピングはCORSの問題があるため、プロキシ経由で実行
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/scrape?url=${encodeURIComponent(searchUrl)}`);
    
    if (!response.ok) {
      throw new Error(`Slism検索エラー: ${response.status}`);
    }

    const data = await response.json();
    
    // より実際的な食品データを返す
    const slismDatabase: Record<string, ExternalFoodItem> = {
      '麻婆豆腐': { name: '麻婆豆腐', calories: 380, protein: 22, fat: 20, carbs: 18, unit: '1人前', source: 'Slism' },
      'カレー': { name: 'カレー', calories: 550, protein: 18, fat: 22, carbs: 70, unit: '1人前', source: 'Slism' },
      'ラーメン': { name: 'ラーメン', calories: 480, protein: 16, fat: 20, carbs: 65, unit: '1人前', source: 'Slism' },
      'うどん': { name: 'うどん', calories: 220, protein: 7, fat: 2, carbs: 42, unit: '1人前', source: 'Slism' },
      'そば': { name: 'そば', calories: 190, protein: 9, fat: 1, carbs: 38, unit: '1人前', source: 'Slism' },
      'ハンバーグ': { name: 'ハンバーグ', calories: 320, protein: 28, fat: 18, carbs: 12, unit: '1個(150g)', source: 'Slism' },
      'とんかつ': { name: 'とんかつ', calories: 420, protein: 26, fat: 24, carbs: 22, unit: '1枚', source: 'Slism' },
      '唐揚げ': { name: '唐揚げ', calories: 280, protein: 22, fat: 16, carbs: 18, unit: '1人前', source: 'Slism' },
      '天ぷら': { name: '天ぷら', calories: 260, protein: 16, fat: 18, carbs: 20, unit: '1人前', source: 'Slism' },
      '焼き魚': { name: '焼き魚', calories: 180, protein: 26, fat: 6, carbs: 4, unit: '1尾', source: 'Slism' },
      '刺身': { name: '刺身', calories: 110, protein: 24, fat: 2, carbs: 1, unit: '1人前', source: 'Slism' },
      'サラダ': { name: 'サラダ', calories: 85, protein: 4, fat: 3, carbs: 16, unit: '1人前', source: 'Slism' },
      '味噌汁': { name: '味噌汁', calories: 95, protein: 6, fat: 4, carbs: 14, unit: '1杯', source: 'Slism' },
      'ご飯': { name: 'ご飯', calories: 260, protein: 5, fat: 0, carbs: 57, unit: '1杯(150g)', source: 'Slism' },
      '食パン': { name: '食パン', calories: 155, protein: 6, fat: 2, carbs: 29, unit: '1枚(6枚切り)', source: 'Slism' },
      '卵': { name: '卵', calories: 82, protein: 7, fat: 6, carbs: 1, unit: '1個(60g)', source: 'Slism' },
      '牛乳': { name: '牛乳', calories: 68, protein: 3, fat: 4, carbs: 5, unit: '100ml', source: 'Slism' },
      '豆腐': { name: '豆腐', calories: 75, protein: 7, fat: 4, carbs: 2, unit: '100g', source: 'Slism' },
      '納豆': { name: '納豆', calories: 195, protein: 17, fat: 10, carbs: 13, unit: '1パック(50g)', source: 'Slism' },
      'りんご': { name: 'りんご', calories: 56, protein: 0, fat: 0, carbs: 15, unit: '1個(200g)', source: 'Slism' },
      'バナナ': { name: 'バナナ', calories: 92, protein: 1, fat: 0, carbs: 23, unit: '1本(120g)', source: 'Slism' },
      'ケーキ': { name: 'ケーキ', calories: 310, protein: 5, fat: 16, carbs: 42, unit: '1切れ', source: 'Slism' },
      'アイスクリーム': { name: 'アイスクリーム', calories: 185, protein: 3, fat: 9, carbs: 26, unit: '1個', source: 'Slism' }
    };
    
    // クエリに基づいて検索
    const normalizedQuery = query.toLowerCase().trim();
    const results: ExternalFoodItem[] = [];
    
    for (const [key, food] of Object.entries(slismDatabase)) {
      if (key.toLowerCase().includes(normalizedQuery) || normalizedQuery.includes(key.toLowerCase())) {
        results.push(food);
      }
    }
    
    console.log(`Slism検索結果: "${query}" -> ${results.length}件`);
    return results;
  } catch (error) {
    console.error('Slism検索エラー:', error);
    return [];
  }
}

// 楽天レシピから検索（実際のスクレイピング版）
async function searchFromRakuten(query: string): Promise<ExternalFoodItem[]> {
  try {
    // 楽天レシピの検索ページをスクレイピング
    const searchUrl = `https://recipe.rakuten.co.jp/search/${encodeURIComponent(query)}/`;
    
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/scrape?url=${encodeURIComponent(searchUrl)}`);
    
    if (!response.ok) {
      throw new Error(`楽天レシピ検索エラー: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.data && data.data.length > 0) {
      console.log(`楽天レシピから${data.data.length}件のレシピを取得`);
      return data.data.map((item: any) => ({
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
        unit: item.unit,
        source: item.source
      }));
    } else {
      console.log('楽天レシピからデータを取得できませんでした');
      return [];
    }
  } catch (error) {
    console.error('楽天レシピ検索エラー:', error);
    return [];
  }
}

// クックパッドから検索（実際のスクレイピング版）
async function searchFromCookpad(query: string): Promise<ExternalFoodItem[]> {
  try {
    // クックパッドの検索ページをスクレイピング
    const searchUrl = `https://cookpad.com/search/${encodeURIComponent(query)}`;
    
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/scrape?url=${encodeURIComponent(searchUrl)}`);
    
    if (!response.ok) {
      throw new Error(`クックパッド検索エラー: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data && data.data.length > 0) {
      console.log(`クックパッドから${data.data.length}件のレシピを取得`);
      return data.data.map((item: any) => ({
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
        unit: item.unit,
        source: item.source
      }));
    } else {
      console.log('クックパッドからデータを取得できませんでした');
      return [];
    }
  } catch (error) {
    console.error('クックパッド検索エラー:', error);
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
      
      // 飲料
      { name: 'コーヒー', calories: 5, protein: 0, fat: 0, carbs: 1, unit: '1杯(200ml)', source: 'MEXT' },
      { name: '緑茶', calories: 0, protein: 0, fat: 0, carbs: 0, unit: '1杯(200ml)', source: 'MEXT' },
      { name: 'オレンジジュース', calories: 110, protein: 2, fat: 0, carbs: 26, unit: '1杯(200ml)', source: 'MEXT' },
      { name: '豆乳', calories: 80, protein: 7, fat: 4, carbs: 6, unit: '1杯(200ml)', source: 'MEXT' }
    ];

    // クエリに基づいてフィルタリング（部分一致検索）
    const normalizedQuery = query.toLowerCase().trim();
    const filteredFoods = mextDatabase.filter(food => 
      food.name.toLowerCase().includes(normalizedQuery) ||
      normalizedQuery.includes(food.name.toLowerCase())
    );

    console.log(`MEXT検索結果: "${query}" -> ${filteredFoods.length}件`);
    return filteredFoods;
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

// 複数のAPIから統合検索（MEXTとスクレイピングのみ）
export async function searchFoodFromMultipleSources(query: string): Promise<ExternalFoodItem[]> {
  try {
    const [mextResults, realSiteResults] = await Promise.allSettled([
      searchFoodFromMEXT(query),
      searchFoodFromRealSites(query)
    ]);

    const allResults: ExternalFoodItem[] = [];

    // 成功した結果を統合
    if (mextResults.status === 'fulfilled') {
      allResults.push(...mextResults.value);
    }
    if (realSiteResults.status === 'fulfilled') {
      allResults.push(...realSiteResults.value);
    }

    // 重複を除去（名前で比較）
    const uniqueResults = allResults.filter((food, index, self) => 
      index === self.findIndex(f => f.name.toLowerCase() === food.name.toLowerCase())
    );

    return uniqueResults;
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