import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    return NextResponse.json({
      success: true,
      message: 'テストAPIが正常に動作しています',
      query: query || 'クエリなし',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL
    });

  } catch (error) {
    console.error('テストAPIエラー:', error);
    return NextResponse.json(
      { error: 'テストAPIに失敗しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 