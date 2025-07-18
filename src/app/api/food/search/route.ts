import { NextRequest, NextResponse } from 'next/server';
import { findFoodByName, getFoodsByCategory, findFoodsByCalorieRange, findFoodsByNutrition } from '../../../../lib/food-database';
import { searchFoodFromMultipleSources } from '../../../../lib/external-apis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const minCalories = searchParams.get('minCalories');
    const maxCalories = searchParams.get('maxCalories');
    const minProtein = searchParams.get('minProtein');
    const maxFat = searchParams.get('maxFat');
    const maxCarbs = searchParams.get('maxCarbs');

    let results = [];

    // 検索クエリがある場合
    if (query) {
      // 1. まず内部データベースで検索
      const internalFood = findFoodByName(query);
      if (internalFood) {
        results.push(internalFood);
      }
      
      // 2. 常に外部APIからも検索（内部データベースの結果と併用）
      try {
        console.log(`外部API検索開始: ${query}`);
        const externalResults = await searchFoodFromMultipleSources(query);
        console.log(`外部API検索結果: ${externalResults.length}件`);
        
        // 外部APIの結果を内部データベースの形式に変換
        const convertedResults = externalResults.map(food => ({
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          fat: food.fat,
          carbs: food.carbs,
          category: '外部データ',
          unit: food.unit,
          source: food.source
        }));
        
        results.push(...convertedResults);
      } catch (error) {
        console.error('外部API検索エラー:', error);
        // 外部APIが失敗しても内部データベースの結果は返す
      }
    }
    // カテゴリ検索
    else if (category) {
      results = getFoodsByCategory(category);
    }
    // カロリー範囲検索
    else if (minCalories || maxCalories) {
      const min = minCalories ? parseInt(minCalories) : 0;
      const max = maxCalories ? parseInt(maxCalories) : 9999;
      results = findFoodsByCalorieRange(min, max);
    }
    // 栄養成分検索
    else if (minProtein || maxFat || maxCarbs) {
      const minP = minProtein ? parseFloat(minProtein) : undefined;
      const maxF = maxFat ? parseFloat(maxFat) : undefined;
      const maxC = maxCarbs ? parseFloat(maxCarbs) : undefined;
      results = findFoodsByNutrition(minP, maxF, maxC);
    }
    // デフォルト：人気の食品を返す
    else {
      const popularFoods = [
        'ご飯', 'パン', '鶏肉', '魚', '卵', '牛乳', 'サラダ', 'りんご'
      ];
      results = popularFoods
        .map(name => findFoodByName(name))
        .filter(Boolean);
    }

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length
    });

  } catch (error) {
    console.error('食品検索エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '食品検索に失敗しました' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { foodName } = await request.json();

    if (!foodName) {
      return NextResponse.json(
        { error: '食品名が必要です' },
        { status: 400 }
      );
    }

    const food = findFoodByName(foodName);

    if (!food) {
      return NextResponse.json(
        { 
          success: false,
          error: '食品が見つかりませんでした',
          suggestions: getSuggestions(foodName)
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: food
    });

  } catch (error) {
    console.error('食品詳細取得エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '食品詳細の取得に失敗しました' 
      },
      { status: 500 }
    );
  }
}

// 類似食品の提案
function getSuggestions(foodName: string) {
  const { FOOD_DATABASE } = require('../../../../lib/food-database');
  const suggestions = [];
  
  for (const [key, food] of Object.entries(FOOD_DATABASE)) {
    if (key.includes(foodName) || foodName.includes(key)) {
      suggestions.push(food);
      if (suggestions.length >= 5) break;
    }
  }
  
  return suggestions;
} 