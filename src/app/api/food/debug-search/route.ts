import { NextRequest, NextResponse } from 'next/server';
import { searchFoodFromMultipleSources } from '@/lib/external-apis';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || 'ポッキー';
  const debug = searchParams.get('debug') === 'true';
  const showPriority = searchParams.get('priority') === 'true';

  try {
    console.log(`デバッグ検索開始: ${query}`);
    const startTime = Date.now();

    // 統合検索を実行
    const results = await searchFoodFromMultipleSources(query);
    
    const totalTime = Date.now() - startTime;

    // 優先順位情報を含めるかどうか
    const responseData = showPriority 
      ? results.map(item => ({
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          fat: item.fat,
          carbs: item.carbs,
          unit: item.unit,
          source: item.source,
          priority: item.priority
        }))
      : results.map(item => ({
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          fat: item.fat,
          carbs: item.carbs,
          unit: item.unit,
          source: item.source
        }));

    const response = {
      success: true,
      query,
      results: results.length,
      totalTime: `${totalTime}ms`,
      data: responseData,
      timestamp: new Date().toISOString(),
      priorityInfo: showPriority ? {
        top5: results.slice(0, 5).map(item => ({
          name: item.name,
          priority: item.priority,
          source: item.source
        }))
      } : undefined
    };

    if (debug) {
      console.log('デバッグ検索結果:', JSON.stringify(response, null, 2));
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('デバッグ検索エラー:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'デバッグ検索に失敗しました', 
        details: error instanceof Error ? error.message : 'Unknown error',
        query,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 