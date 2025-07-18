import { NextRequest, NextResponse } from 'next/server';
import { searchFromSlism, searchFromRakuten, searchFromCookpad, searchFromFoodDB, searchFromRakutenMarket } from '@/lib/external-apis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'クエリパラメータ "q" が必要です' },
        { status: 400 }
      );
    }

    console.log(`デバッグ検索開始: "${query}"`);
    const startTime = Date.now();

    // 各サイトの検索結果を個別に取得
    const results: any = {
      query,
      timestamp: new Date().toISOString(),
      results: {}
    };

    // Slism検索
    try {
      console.log('Slism検索開始...');
      const slismStart = Date.now();
      const slismResults = await searchFromSlism(query);
      const slismTime = Date.now() - slismStart;
      results.results.slism = {
        success: true,
        count: slismResults.length,
        time: slismTime,
        data: slismResults
      };
      console.log(`Slism検索完了: ${slismResults.length}件 (${slismTime}ms)`);
    } catch (error) {
      console.error('Slism検索エラー:', error);
      results.results.slism = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        count: 0,
        time: 0,
        data: []
      };
    }

    // 楽天レシピ検索
    try {
      console.log('楽天レシピ検索開始...');
      const rakutenStart = Date.now();
      const rakutenResults = await searchFromRakuten(query);
      const rakutenTime = Date.now() - rakutenStart;
      results.results.rakuten = {
        success: true,
        count: rakutenResults.length,
        time: rakutenTime,
        data: rakutenResults
      };
      console.log(`楽天レシピ検索完了: ${rakutenResults.length}件 (${rakutenTime}ms)`);
    } catch (error) {
      console.error('楽天レシピ検索エラー:', error);
      results.results.rakuten = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        count: 0,
        time: 0,
        data: []
      };
    }

    // クックパッド検索
    try {
      console.log('クックパッド検索開始...');
      const cookpadStart = Date.now();
      const cookpadResults = await searchFromCookpad(query);
      const cookpadTime = Date.now() - cookpadStart;
      results.results.cookpad = {
        success: true,
        count: cookpadResults.length,
        time: cookpadTime,
        data: cookpadResults
      };
      console.log(`クックパッド検索完了: ${cookpadResults.length}件 (${cookpadTime}ms)`);
    } catch (error) {
      console.error('クックパッド検索エラー:', error);
      results.results.cookpad = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        count: 0,
        time: 0,
        data: []
      };
    }

    // FoodDB検索
    try {
      console.log('FoodDB検索開始...');
      const fooddbStart = Date.now();
      const fooddbResults = await searchFromFoodDB(query);
      const fooddbTime = Date.now() - fooddbStart;
      results.results.fooddb = {
        success: true,
        count: fooddbResults.length,
        time: fooddbTime,
        data: fooddbResults
      };
      console.log(`FoodDB検索完了: ${fooddbResults.length}件 (${fooddbTime}ms)`);
    } catch (error) {
      console.error('FoodDB検索エラー:', error);
      results.results.fooddb = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        count: 0,
        time: 0,
        data: []
      };
    }

    // 楽天市場検索
    try {
      console.log('楽天市場検索開始...');
      const marketStart = Date.now();
      const marketResults = await searchFromRakutenMarket(query);
      const marketTime = Date.now() - marketStart;
      results.results.rakutenMarket = {
        success: true,
        count: marketResults.length,
        time: marketTime,
        data: marketResults
      };
      console.log(`楽天市場検索完了: ${marketResults.length}件 (${marketTime}ms)`);
    } catch (error) {
      console.error('楽天市場検索エラー:', error);
      results.results.rakutenMarket = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        count: 0,
        time: 0,
        data: []
      };
    }

    const totalTime = Date.now() - startTime;
    results.totalTime = totalTime;

    // 総合結果
    const allResults = [
      ...(results.results.slism.data || []),
      ...(results.results.rakuten.data || []),
      ...(results.results.cookpad.data || []),
      ...(results.results.fooddb.data || []),
      ...(results.results.rakutenMarket.data || [])
    ];

    // 重複を除去
    const uniqueResults = allResults.filter((food, index, self) => 
      index === self.findIndex(f => f.name.toLowerCase() === food.name.toLowerCase())
    );

    results.summary = {
      totalResults: allResults.length,
      uniqueResults: uniqueResults.length,
      totalTime
    };

    console.log(`デバッグ検索完了: 総時間 ${totalTime}ms, 総結果 ${allResults.length}件, ユニーク ${uniqueResults.length}件`);

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('デバッグ検索エラー:', error);
    return NextResponse.json(
      { error: 'デバッグ検索に失敗しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 