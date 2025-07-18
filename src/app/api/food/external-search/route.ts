import { NextRequest, NextResponse } from 'next/server';
import { searchFoodFromMultipleSources, testExternalAPIs, searchFoodFromRealSites } from '@/lib/external-apis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const test = searchParams.get('test');

    if (test === 'true') {
      // テストモード
      await testExternalAPIs();
      return NextResponse.json({
        success: true,
        message: '外部APIテストを実行しました。コンソールを確認してください。'
      });
    }

    if (!query) {
      return NextResponse.json(
        { 
          success: false, 
          error: '検索クエリが必要です' 
        },
        { status: 400 }
      );
    }

    console.log(`外部API検索開始: ${query}`);
    
    // 外部サイト検索を含む統合検索
    const results = await searchFoodFromMultipleSources(query);
    
    console.log(`外部API検索結果: ${results.length}件`);

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
      query: query
    });

  } catch (error) {
    console.error('外部API検索エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '外部API検索に失敗しました' 
      },
      { status: 500 }
    );
  }
} 