// 包括的な食品データベース
export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  category: string;
  unit: string;
  description?: string;
}

// 食品カテゴリ
export const FOOD_CATEGORIES = {
  RICE: '主食',
  BREAD: 'パン',
  NOODLES: '麺類',
  MEAT: '肉類',
  FISH: '魚介類',
  EGG: '卵・乳製品',
  VEGETABLES: '野菜',
  FRUITS: '果物',
  DRINKS: '飲料',
  DESSERTS: 'デザート',
  SOUPS: 'スープ',
  SNACKS: 'お菓子',
  ALCOHOL: 'アルコール',
  CONDIMENTS: '調味料'
} as const;

// 包括的な食品データベース
export const FOOD_DATABASE: Record<string, FoodItem> = {
  // 主食
  'ご飯': { name: 'ご飯', calories: 250, protein: 5, fat: 0, carbs: 55, category: FOOD_CATEGORIES.RICE, unit: '1杯(150g)' },
  '白米': { name: '白米', calories: 250, protein: 5, fat: 0, carbs: 55, category: FOOD_CATEGORIES.RICE, unit: '1杯(150g)' },
  '玄米': { name: '玄米', calories: 220, protein: 6, fat: 2, carbs: 48, category: FOOD_CATEGORIES.RICE, unit: '1杯(150g)' },
  '雑穀米': { name: '雑穀米', calories: 240, protein: 6, fat: 1, carbs: 52, category: FOOD_CATEGORIES.RICE, unit: '1杯(150g)' },
  'お粥': { name: 'お粥', calories: 120, protein: 3, fat: 0, carbs: 26, category: FOOD_CATEGORIES.RICE, unit: '1杯(200g)' },
  'おにぎり': { name: 'おにぎり', calories: 200, protein: 4, fat: 1, carbs: 42, category: FOOD_CATEGORIES.RICE, unit: '1個' },
  'チャーハン': { name: 'チャーハン', calories: 400, protein: 12, fat: 15, carbs: 55, category: FOOD_CATEGORIES.RICE, unit: '1人前' },
  'カレーライス': { name: 'カレーライス', calories: 600, protein: 20, fat: 25, carbs: 80, category: FOOD_CATEGORIES.RICE, unit: '1人前' },
  '丼物': { name: '丼物', calories: 500, protein: 25, fat: 15, carbs: 65, category: FOOD_CATEGORIES.RICE, unit: '1人前' },

  // パン
  '食パン': { name: '食パン', calories: 150, protein: 5, fat: 2, carbs: 28, category: FOOD_CATEGORIES.BREAD, unit: '1枚(6枚切り)' },
  'フランスパン': { name: 'フランスパン', calories: 180, protein: 6, fat: 1, carbs: 35, category: FOOD_CATEGORIES.BREAD, unit: '1切れ(30g)' },
  'クロワッサン': { name: 'クロワッサン', calories: 250, protein: 5, fat: 12, carbs: 30, category: FOOD_CATEGORIES.BREAD, unit: '1個' },
  'ベーグル': { name: 'ベーグル', calories: 200, protein: 7, fat: 1, carbs: 40, category: FOOD_CATEGORIES.BREAD, unit: '1個' },
  'サンドイッチ': { name: 'サンドイッチ', calories: 300, protein: 15, fat: 8, carbs: 45, category: FOOD_CATEGORIES.BREAD, unit: '1個' },
  'トースト': { name: 'トースト', calories: 180, protein: 6, fat: 3, carbs: 32, category: FOOD_CATEGORIES.BREAD, unit: '1枚' },

  // 麺類
  'うどん': { name: 'うどん', calories: 200, protein: 6, fat: 1, carbs: 40, category: FOOD_CATEGORIES.NOODLES, unit: '1人前' },
  'そば': { name: 'そば', calories: 180, protein: 8, fat: 1, carbs: 35, category: FOOD_CATEGORIES.NOODLES, unit: '1人前' },
  'ラーメン': { name: 'ラーメン', calories: 450, protein: 15, fat: 18, carbs: 60, category: FOOD_CATEGORIES.NOODLES, unit: '1人前' },
  'パスタ': { name: 'パスタ', calories: 200, protein: 7, fat: 1, carbs: 40, category: FOOD_CATEGORIES.NOODLES, unit: '1人前' },
  'スパゲッティ': { name: 'スパゲッティ', calories: 200, protein: 7, fat: 1, carbs: 40, category: FOOD_CATEGORIES.NOODLES, unit: '1人前' },
  '焼きそば': { name: '焼きそば', calories: 350, protein: 12, fat: 12, carbs: 50, category: FOOD_CATEGORIES.NOODLES, unit: '1人前' },
  '冷やし中華': { name: '冷やし中華', calories: 300, protein: 10, fat: 8, carbs: 45, category: FOOD_CATEGORIES.NOODLES, unit: '1人前' },

  // 肉類
  '鶏肉': { name: '鶏肉', calories: 165, protein: 25, fat: 3, carbs: 0, category: FOOD_CATEGORIES.MEAT, unit: '100g' },
  '鶏胸肉': { name: '鶏胸肉', calories: 165, protein: 25, fat: 3, carbs: 0, category: FOOD_CATEGORIES.MEAT, unit: '100g' },
  '鶏もも肉': { name: '鶏もも肉', calories: 200, protein: 22, fat: 12, carbs: 0, category: FOOD_CATEGORIES.MEAT, unit: '100g' },
  '鶏ステーキ': { name: '鶏ステーキ', calories: 200, protein: 25, fat: 8, carbs: 0, category: FOOD_CATEGORIES.MEAT, unit: '100g' },
  '鶏のステーキ': { name: '鶏のステーキ', calories: 200, protein: 25, fat: 8, carbs: 0, category: FOOD_CATEGORIES.MEAT, unit: '100g' },
  '鶏肉ステーキ': { name: '鶏肉ステーキ', calories: 200, protein: 25, fat: 8, carbs: 0, category: FOOD_CATEGORIES.MEAT, unit: '100g' },
  '豚肉': { name: '豚肉', calories: 200, protein: 20, fat: 12, carbs: 0, category: FOOD_CATEGORIES.MEAT, unit: '100g' },
  '豚ロース': { name: '豚ロース', calories: 250, protein: 22, fat: 18, carbs: 0, category: FOOD_CATEGORIES.MEAT, unit: '100g' },
  '豚バラ': { name: '豚バラ', calories: 400, protein: 15, fat: 35, carbs: 0, category: FOOD_CATEGORIES.MEAT, unit: '100g' },
  '牛肉': { name: '牛肉', calories: 250, protein: 25, fat: 15, carbs: 0, category: FOOD_CATEGORIES.MEAT, unit: '100g' },
  '牛ロース': { name: '牛ロース', calories: 300, protein: 25, fat: 22, carbs: 0, category: FOOD_CATEGORIES.MEAT, unit: '100g' },
  '牛バラ': { name: '牛バラ', calories: 350, protein: 20, fat: 30, carbs: 0, category: FOOD_CATEGORIES.MEAT, unit: '100g' },
  'ハンバーグ': { name: 'ハンバーグ', calories: 350, protein: 25, fat: 20, carbs: 10, category: FOOD_CATEGORIES.MEAT, unit: '1個(150g)' },
  '唐揚げ': { name: '唐揚げ', calories: 300, protein: 20, fat: 18, carbs: 15, category: FOOD_CATEGORIES.MEAT, unit: '1人前' },
  'とんかつ': { name: 'とんかつ', calories: 450, protein: 25, fat: 25, carbs: 20, category: FOOD_CATEGORIES.MEAT, unit: '1枚' },

  // 魚介類
  '魚': { name: '魚', calories: 120, protein: 20, fat: 4, carbs: 0, category: FOOD_CATEGORIES.FISH, unit: '100g' },
  '鮭': { name: '鮭', calories: 140, protein: 22, fat: 6, carbs: 0, category: FOOD_CATEGORIES.FISH, unit: '100g' },
  'マグロ': { name: 'マグロ', calories: 110, protein: 24, fat: 1, carbs: 0, category: FOOD_CATEGORIES.FISH, unit: '100g' },
  'サバ': { name: 'サバ', calories: 200, protein: 20, fat: 12, carbs: 0, category: FOOD_CATEGORIES.FISH, unit: '100g' },
  'アジ': { name: 'アジ', calories: 130, protein: 20, fat: 5, carbs: 0, category: FOOD_CATEGORIES.FISH, unit: '100g' },
  'イワシ': { name: 'イワシ', calories: 180, protein: 20, fat: 10, carbs: 0, category: FOOD_CATEGORIES.FISH, unit: '100g' },
  'エビ': { name: 'エビ', calories: 100, protein: 20, fat: 1, carbs: 0, category: FOOD_CATEGORIES.FISH, unit: '100g' },
  'カニ': { name: 'カニ', calories: 90, protein: 18, fat: 1, carbs: 0, category: FOOD_CATEGORIES.FISH, unit: '100g' },
  '刺身': { name: '刺身', calories: 120, protein: 22, fat: 3, carbs: 0, category: FOOD_CATEGORIES.FISH, unit: '1人前' },
  '寿司': { name: '寿司', calories: 200, protein: 8, fat: 1, carbs: 40, category: FOOD_CATEGORIES.FISH, unit: '1貫' },

  // 卵・乳製品
  '卵': { name: '卵', calories: 80, protein: 7, fat: 6, carbs: 1, category: FOOD_CATEGORIES.EGG, unit: '1個(60g)' },
  '牛乳': { name: '牛乳', calories: 120, protein: 8, fat: 5, carbs: 12, category: FOOD_CATEGORIES.EGG, unit: '1杯(200ml)' },
  'ヨーグルト': { name: 'ヨーグルト', calories: 100, protein: 8, fat: 3, carbs: 12, category: FOOD_CATEGORIES.EGG, unit: '1個(100g)' },
  'チーズ': { name: 'チーズ', calories: 350, protein: 25, fat: 28, carbs: 2, category: FOOD_CATEGORIES.EGG, unit: '100g' },
  '豆腐': { name: '豆腐', calories: 80, protein: 8, fat: 5, carbs: 2, category: FOOD_CATEGORIES.EGG, unit: '1丁(300g)' },
  '納豆': { name: '納豆', calories: 100, protein: 10, fat: 5, carbs: 8, category: FOOD_CATEGORIES.EGG, unit: '1パック(50g)' },
  '麻婆豆腐': { name: '麻婆豆腐', calories: 350, protein: 20, fat: 18, carbs: 15, category: FOOD_CATEGORIES.EGG, unit: '1人前' },

  // 野菜
  'サラダ': { name: 'サラダ', calories: 80, protein: 3, fat: 2, carbs: 15, category: FOOD_CATEGORIES.VEGETABLES, unit: '1人前' },
  '野菜': { name: '野菜', calories: 50, protein: 2, fat: 0, carbs: 10, category: FOOD_CATEGORIES.VEGETABLES, unit: '100g' },
  'レタス': { name: 'レタス', calories: 15, protein: 1, fat: 0, carbs: 3, category: FOOD_CATEGORIES.VEGETABLES, unit: '100g' },
  'トマト': { name: 'トマト', calories: 20, protein: 1, fat: 0, carbs: 4, category: FOOD_CATEGORIES.VEGETABLES, unit: '100g' },
  'キュウリ': { name: 'キュウリ', calories: 15, protein: 1, fat: 0, carbs: 3, category: FOOD_CATEGORIES.VEGETABLES, unit: '100g' },
  'キャベツ': { name: 'キャベツ', calories: 25, protein: 1, fat: 0, carbs: 5, category: FOOD_CATEGORIES.VEGETABLES, unit: '100g' },
  'ブロッコリー': { name: 'ブロッコリー', calories: 35, protein: 3, fat: 0, carbs: 7, category: FOOD_CATEGORIES.VEGETABLES, unit: '100g' },
  'ニンジン': { name: 'ニンジン', calories: 40, protein: 1, fat: 0, carbs: 9, category: FOOD_CATEGORIES.VEGETABLES, unit: '100g' },
  '玉ねぎ': { name: '玉ねぎ', calories: 35, protein: 1, fat: 0, carbs: 8, category: FOOD_CATEGORIES.VEGETABLES, unit: '100g' },
  'ピーマン': { name: 'ピーマン', calories: 25, protein: 1, fat: 0, carbs: 5, category: FOOD_CATEGORIES.VEGETABLES, unit: '100g' },
  'ナス': { name: 'ナス', calories: 20, protein: 1, fat: 0, carbs: 4, category: FOOD_CATEGORIES.VEGETABLES, unit: '100g' },
  '白菜': { name: '白菜', calories: 15, protein: 1, fat: 0, carbs: 3, category: FOOD_CATEGORIES.VEGETABLES, unit: '100g' },

  // 果物
  'りんご': { name: 'りんご', calories: 60, protein: 0, fat: 0, carbs: 15, category: FOOD_CATEGORIES.FRUITS, unit: '1個(200g)' },
  'バナナ': { name: 'バナナ', calories: 90, protein: 1, fat: 0, carbs: 22, category: FOOD_CATEGORIES.FRUITS, unit: '1本(120g)' },
  'みかん': { name: 'みかん', calories: 40, protein: 1, fat: 0, carbs: 10, category: FOOD_CATEGORIES.FRUITS, unit: '1個(100g)' },
  'ぶどう': { name: 'ぶどう', calories: 60, protein: 1, fat: 0, carbs: 15, category: FOOD_CATEGORIES.FRUITS, unit: '100g' },
  'いちご': { name: 'いちご', calories: 35, protein: 1, fat: 0, carbs: 8, category: FOOD_CATEGORIES.FRUITS, unit: '100g' },
  'キウイ': { name: 'キウイ', calories: 50, protein: 1, fat: 0, carbs: 12, category: FOOD_CATEGORIES.FRUITS, unit: '1個(100g)' },
  'パイナップル': { name: 'パイナップル', calories: 50, protein: 1, fat: 0, carbs: 12, category: FOOD_CATEGORIES.FRUITS, unit: '100g' },
  'メロン': { name: 'メロン', calories: 40, protein: 1, fat: 0, carbs: 10, category: FOOD_CATEGORIES.FRUITS, unit: '100g' },

  // 飲料
  'ジュース': { name: 'ジュース', calories: 100, protein: 0, fat: 0, carbs: 25, category: FOOD_CATEGORIES.DRINKS, unit: '1杯(200ml)' },
  'コーヒー': { name: 'コーヒー', calories: 5, protein: 0, fat: 0, carbs: 1, category: FOOD_CATEGORIES.DRINKS, unit: '1杯(200ml)' },
  'お茶': { name: 'お茶', calories: 0, protein: 0, fat: 0, carbs: 0, category: FOOD_CATEGORIES.DRINKS, unit: '1杯(200ml)' },
  '緑茶': { name: '緑茶', calories: 0, protein: 0, fat: 0, carbs: 0, category: FOOD_CATEGORIES.DRINKS, unit: '1杯(200ml)' },
  '紅茶': { name: '紅茶', calories: 0, protein: 0, fat: 0, carbs: 0, category: FOOD_CATEGORIES.DRINKS, unit: '1杯(200ml)' },
  'コーラ': { name: 'コーラ', calories: 90, protein: 0, fat: 0, carbs: 22, category: FOOD_CATEGORIES.DRINKS, unit: '1缶(350ml)' },
  'オレンジジュース': { name: 'オレンジジュース', calories: 110, protein: 2, fat: 0, carbs: 26, category: FOOD_CATEGORIES.DRINKS, unit: '1杯(200ml)' },
  'トマトジュース': { name: 'トマトジュース', calories: 40, protein: 2, fat: 0, carbs: 8, category: FOOD_CATEGORIES.DRINKS, unit: '1杯(200ml)' },
  '豆乳': { name: '豆乳', calories: 80, protein: 7, fat: 4, carbs: 6, category: FOOD_CATEGORIES.DRINKS, unit: '1杯(200ml)' },

  // デザート
  'ケーキ': { name: 'ケーキ', calories: 300, protein: 5, fat: 15, carbs: 40, category: FOOD_CATEGORIES.DESSERTS, unit: '1切れ' },
  'アイス': { name: 'アイス', calories: 200, protein: 3, fat: 10, carbs: 25, category: FOOD_CATEGORIES.DESSERTS, unit: '1個' },
  'アイスクリーム': { name: 'アイスクリーム', calories: 200, protein: 3, fat: 10, carbs: 25, category: FOOD_CATEGORIES.DESSERTS, unit: '1個' },
  'ソフトクリーム': { name: 'ソフトクリーム', calories: 250, protein: 4, fat: 12, carbs: 35, category: FOOD_CATEGORIES.DESSERTS, unit: '1個' },
  'チョコレート': { name: 'チョコレート', calories: 250, protein: 3, fat: 15, carbs: 30, category: FOOD_CATEGORIES.DESSERTS, unit: '1枚(50g)' },
  'プリン': { name: 'プリン', calories: 150, protein: 4, fat: 5, carbs: 25, category: FOOD_CATEGORIES.DESSERTS, unit: '1個' },
  'シュークリーム': { name: 'シュークリーム', calories: 200, protein: 4, fat: 12, carbs: 20, category: FOOD_CATEGORIES.DESSERTS, unit: '1個' },
  'モンブラン': { name: 'モンブラン', calories: 350, protein: 6, fat: 18, carbs: 45, category: FOOD_CATEGORIES.DESSERTS, unit: '1個' },
  'ティラミス': { name: 'ティラミス', calories: 300, protein: 8, fat: 20, carbs: 30, category: FOOD_CATEGORIES.DESSERTS, unit: '1切れ' },
  'みたらし団子': { name: 'みたらし団子', calories: 150, protein: 3, fat: 1, carbs: 35, category: FOOD_CATEGORIES.DESSERTS, unit: '1串(3個)' },
  '団子': { name: '団子', calories: 120, protein: 2, fat: 0, carbs: 28, category: FOOD_CATEGORIES.DESSERTS, unit: '1串(3個)' },
  'あんみつ': { name: 'あんみつ', calories: 200, protein: 4, fat: 1, carbs: 45, category: FOOD_CATEGORIES.DESSERTS, unit: '1杯' },
  'わらびもち': { name: 'わらびもち', calories: 100, protein: 1, fat: 0, carbs: 25, category: FOOD_CATEGORIES.DESSERTS, unit: '1個' },

  // スープ
  'スープ': { name: 'スープ', calories: 150, protein: 8, fat: 5, carbs: 20, category: FOOD_CATEGORIES.SOUPS, unit: '1杯' },
  '味噌汁': { name: '味噌汁', calories: 100, protein: 5, fat: 3, carbs: 15, category: FOOD_CATEGORIES.SOUPS, unit: '1杯' },
  'コンソメスープ': { name: 'コンソメスープ', calories: 50, protein: 2, fat: 1, carbs: 8, category: FOOD_CATEGORIES.SOUPS, unit: '1杯' },
  'ポタージュ': { name: 'ポタージュ', calories: 200, protein: 6, fat: 10, carbs: 25, category: FOOD_CATEGORIES.SOUPS, unit: '1杯' },
  'クラムチャウダー': { name: 'クラムチャウダー', calories: 250, protein: 12, fat: 15, carbs: 20, category: FOOD_CATEGORIES.SOUPS, unit: '1杯' },

  // お菓子
  'ポテトチップス': { name: 'ポテトチップス', calories: 550, protein: 6, fat: 35, carbs: 55, category: FOOD_CATEGORIES.SNACKS, unit: '1袋(100g)' },
  'チョコレート菓子': { name: 'チョコレート菓子', calories: 300, protein: 4, fat: 18, carbs: 35, category: FOOD_CATEGORIES.SNACKS, unit: '1袋(50g)' },
  'クッキー': { name: 'クッキー', calories: 200, protein: 3, fat: 10, carbs: 25, category: FOOD_CATEGORIES.SNACKS, unit: '1枚' },
  'せんべい': { name: 'せんべい', calories: 150, protein: 3, fat: 2, carbs: 30, category: FOOD_CATEGORIES.SNACKS, unit: '1枚' },
  'あられ': { name: 'あられ', calories: 120, protein: 2, fat: 1, carbs: 25, category: FOOD_CATEGORIES.SNACKS, unit: '1袋(30g)' },
  'キャラメル': { name: 'キャラメル', calories: 180, protein: 1, fat: 5, carbs: 35, category: FOOD_CATEGORIES.SNACKS, unit: '1個(10g)' },

  // アルコール
  'お酒': { name: 'お酒', calories: 150, protein: 0, fat: 0, carbs: 10, category: FOOD_CATEGORIES.ALCOHOL, unit: '1杯(180ml)' },
  'ビール': { name: 'ビール', calories: 150, protein: 0, fat: 0, carbs: 10, category: FOOD_CATEGORIES.ALCOHOL, unit: '1杯(350ml)' },
  '日本酒': { name: '日本酒', calories: 180, protein: 0, fat: 0, carbs: 15, category: FOOD_CATEGORIES.ALCOHOL, unit: '1杯(180ml)' },
  'ワイン': { name: 'ワイン', calories: 120, protein: 0, fat: 0, carbs: 8, category: FOOD_CATEGORIES.ALCOHOL, unit: '1杯(120ml)' },
  'ウイスキー': { name: 'ウイスキー', calories: 100, protein: 0, fat: 0, carbs: 0, category: FOOD_CATEGORIES.ALCOHOL, unit: '1杯(30ml)' },
  '焼酎': { name: '焼酎', calories: 120, protein: 0, fat: 0, carbs: 0, category: FOOD_CATEGORIES.ALCOHOL, unit: '1杯(30ml)' },

  // 調味料
  'マヨネーズ': { name: 'マヨネーズ', calories: 700, protein: 1, fat: 75, carbs: 2, category: FOOD_CATEGORIES.CONDIMENTS, unit: '100g' },
  'ケチャップ': { name: 'ケチャップ', calories: 100, protein: 1, fat: 0, carbs: 25, category: FOOD_CATEGORIES.CONDIMENTS, unit: '100g' },
  'ソース': { name: 'ソース', calories: 120, protein: 1, fat: 0, carbs: 30, category: FOOD_CATEGORIES.CONDIMENTS, unit: '100g' },
  'ドレッシング': { name: 'ドレッシング', calories: 400, protein: 1, fat: 40, carbs: 8, category: FOOD_CATEGORIES.CONDIMENTS, unit: '100g' },
  '醤油': { name: '醤油', calories: 60, protein: 8, fat: 0, carbs: 8, category: FOOD_CATEGORIES.CONDIMENTS, unit: '100g' },
  '塩': { name: '塩', calories: 0, protein: 0, fat: 0, carbs: 0, category: FOOD_CATEGORIES.CONDIMENTS, unit: '100g' },
  '砂糖': { name: '砂糖', calories: 400, protein: 0, fat: 0, carbs: 100, category: FOOD_CATEGORIES.CONDIMENTS, unit: '100g' }
};

// 食品名から栄養成分を検索する関数（改善版）
export function findFoodByName(foodName: string): FoodItem | null {
  const normalizedName = foodName.toLowerCase().trim();
  
  // 完全一致を優先
  if (FOOD_DATABASE[foodName]) {
    return FOOD_DATABASE[foodName];
  }

  // 正規化した名前での完全一致
  if (FOOD_DATABASE[normalizedName]) {
    return FOOD_DATABASE[normalizedName];
  }

  // 部分一致で検索（改善版）
  const matches: Array<{ key: string; food: FoodItem; score: number }> = [];
  
  for (const [key, food] of Object.entries(FOOD_DATABASE)) {
    const normalizedKey = key.toLowerCase();
    
    // 完全一致
    if (normalizedName === normalizedKey) {
      return food;
    }
    
    // 前方一致
    if (normalizedName.startsWith(normalizedKey) || normalizedKey.startsWith(normalizedName)) {
      matches.push({ key, food, score: 10 });
      continue;
    }
    
    // 包含関係
    if (normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName)) {
      const score = Math.min(normalizedName.length, normalizedKey.length) / Math.max(normalizedName.length, normalizedKey.length) * 8;
      matches.push({ key, food, score });
      continue;
    }
    
    // 単語分割による検索
    const nameWords = normalizedName.split(/[\s・]+/);
    const keyWords = normalizedKey.split(/[\s・]+/);
    
    let wordMatchCount = 0;
    for (const nameWord of nameWords) {
      for (const keyWord of keyWords) {
        if (nameWord.includes(keyWord) || keyWord.includes(nameWord)) {
          wordMatchCount++;
        }
      }
    }
    
    if (wordMatchCount > 0) {
      const score = (wordMatchCount / Math.max(nameWords.length, keyWords.length)) * 6;
      matches.push({ key, food, score });
    }
  }
  
  // スコア順にソートして最適なマッチを返す
  if (matches.length > 0) {
    matches.sort((a, b) => b.score - a.score);
    console.log(`食品検索結果: "${foodName}" -> "${matches[0].food.name}" (スコア: ${matches[0].score})`);
    return matches[0].food;
  }

  // カテゴリ別の検索（フォールバック）
  for (const [key, food] of Object.entries(FOOD_DATABASE)) {
    if (food.category.toLowerCase().includes(normalizedName)) {
      console.log(`カテゴリ検索結果: "${foodName}" -> "${food.name}" (カテゴリ: ${food.category})`);
      return food;
    }
  }

  return null;
}

// カテゴリ別に食品を取得する関数
export function getFoodsByCategory(category: string): FoodItem[] {
  return Object.values(FOOD_DATABASE).filter(food => food.category === category);
}

// カロリー範囲で食品を検索する関数
export function findFoodsByCalorieRange(minCalories: number, maxCalories: number): FoodItem[] {
  return Object.values(FOOD_DATABASE).filter(food => 
    food.calories >= minCalories && food.calories <= maxCalories
  );
}

// 栄養成分から食品を検索する関数
export function findFoodsByNutrition(
  minProtein?: number,
  maxFat?: number,
  maxCarbs?: number
): FoodItem[] {
  return Object.values(FOOD_DATABASE).filter(food => {
    if (minProtein && food.protein < minProtein) return false;
    if (maxFat && food.fat > maxFat) return false;
    if (maxCarbs && food.carbs > maxCarbs) return false;
    return true;
  });
} 