// 外部食品データベースAPIとの連携
export interface ExternalFoodData {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  source: string;
  confidence: number;
}

// Chrome拡張機能の型定義
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        onMessage?: {
          addListener: (callback: (message: any, sender: any, sendResponse: any) => void) => void;
        };
        sendMessage?: (message: any) => void;
      };
    };
  }
}

// 楽天レシピAPIとの連携
export async function searchRakutenRecipe(foodName: string): Promise<ExternalFoodData | null> {
  try {
    const response = await fetch(
      `https://app.rakuten.co.jp/services/api/Recipe/CategoryRanking/20170426?applicationId=${process.env.RAKUTEN_APP_ID}&categoryId=33-33-33&format=json`
    );
    
    if (!response.ok) {
      console.log('楽天レシピAPI接続エラー');
      return null;
    }

    const data = await response.json();
    // 楽天レシピのデータを栄養成分に変換する処理
    // 実際の実装では、レシピの材料から栄養成分を計算する必要があります
    
    return null; // 実装例のためnullを返す
  } catch (error) {
    console.error('楽天レシピAPI エラー:', error);
    return null;
  }
}

// USDA Food Database APIとの連携
export async function searchUSDAFood(foodName: string): Promise<ExternalFoodData | null> {
  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${process.env.USDA_API_KEY}&query=${encodeURIComponent(foodName)}&pageSize=1`
    );
    
    if (!response.ok) {
      console.log('USDA API接続エラー');
      return null;
    }

    const data = await response.json();
    
    if (data.foods && data.foods.length > 0) {
      const food = data.foods[0];
      const nutrients = food.foodNutrients;
      
      // 栄養成分を抽出
      const calories = nutrients.find((n: any) => n.nutrientName === 'Energy')?.value || 0;
      const protein = nutrients.find((n: any) => n.nutrientName === 'Protein')?.value || 0;
      const fat = nutrients.find((n: any) => n.nutrientName === 'Total lipid (fat)')?.value || 0;
      const carbs = nutrients.find((n: any) => n.nutrientName === 'Carbohydrate, by difference')?.value || 0;
      
      return {
        name: food.description,
        calories: Math.round(calories),
        protein: Math.round(protein * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        source: 'USDA',
        confidence: 0.9
      };
    }
    
    return null;
  } catch (error) {
    console.error('USDA API エラー:', error);
    return null;
  }
}

// 複数のAPIから最適な結果を取得する関数
export async function searchMultipleAPIs(foodName: string): Promise<ExternalFoodData | null> {
  const results = await Promise.allSettled([
    searchUSDAFood(foodName),
    searchRakutenRecipe(foodName)
  ]);
  
  // 成功した結果から最適なものを選択
  const validResults = results
    .filter((result): result is PromiseFulfilledResult<ExternalFoodData | null> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value)
    .filter(Boolean) as ExternalFoodData[];
  
  if (validResults.length === 0) {
    return null;
  }
  
  // 信頼度が高いものを優先
  return validResults.sort((a, b) => b.confidence - a.confidence)[0];
}

// ブラウザ拡張機能との連携（Chrome Extension API）
export interface BrowserExtensionData {
  foodName: string;
  nutritionData: ExternalFoodData;
  timestamp: number;
}

// ブラウザ拡張機能からのデータを受信する関数
export function listenToBrowserExtension(callback: (data: BrowserExtensionData) => void) {
  if (typeof window !== 'undefined' && window.chrome?.runtime?.onMessage) {
    window.chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
      if (message.type === 'FOOD_DATA') {
        callback({
          foodName: message.foodName,
          nutritionData: message.nutritionData,
          timestamp: Date.now()
        });
      }
    });
  }
}

// ブラウザ拡張機能にデータを送信する関数
export function sendToBrowserExtension(data: any) {
  if (typeof window !== 'undefined' && window.chrome?.runtime?.sendMessage) {
    window.chrome.runtime.sendMessage({
      type: 'FOOD_DATA_REQUEST',
      data: data
    });
  }
}

// ローカルストレージに食品データをキャッシュする関数
export function cacheFoodData(foodName: string, nutritionData: ExternalFoodData) {
  if (typeof window !== 'undefined') {
    const cacheKey = `food_cache_${foodName}`;
    const cacheData = {
      ...nutritionData,
      cachedAt: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  }
}

// キャッシュから食品データを取得する関数
export function getCachedFoodData(foodName: string): ExternalFoodData | null {
  if (typeof window !== 'undefined') {
    const cacheKey = `food_cache_${foodName}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached);
      const cacheAge = Date.now() - data.cachedAt;
      
      // 24時間以内のキャッシュのみ有効
      if (cacheAge < 24 * 60 * 60 * 1000) {
        return data;
      } else {
        localStorage.removeItem(cacheKey);
      }
    }
  }
  
  return null;
}

// 食品データの統合関数
export async function getComprehensiveFoodData(foodName: string): Promise<ExternalFoodData | null> {
  // 1. まずキャッシュをチェック
  const cached = getCachedFoodData(foodName);
  if (cached) {
    return cached;
  }
  
  // 2. 内部データベースをチェック
  const { findFoodByName } = await import('./food-database');
  const internalData = findFoodByName(foodName);
  if (internalData) {
    const result: ExternalFoodData = {
      ...internalData,
      source: 'Internal Database',
      confidence: 0.8
    };
    cacheFoodData(foodName, result);
    return result;
  }
  
  // 3. 外部APIを検索
  const externalData = await searchMultipleAPIs(foodName);
  if (externalData) {
    cacheFoodData(foodName, externalData);
    return externalData;
  }
  
  return null;
} 