import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = createClient();
    
    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    let mealsQuery = supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // 検索クエリがある場合はフィルタリング
    if (query) {
      mealsQuery = mealsQuery.ilike('food_name', `%${query}%`);
    }

    const { data: meals, error } = await mealsQuery;

    if (error) {
      console.error('食事履歴取得エラー:', error);
      return NextResponse.json(
        { error: '食事履歴の取得に失敗しました' },
        { status: 500 }
      );
    }

    // 重複を除去して最新のものを返す
    const uniqueMeals = meals?.filter((meal, index, self) => 
      index === self.findIndex(m => m.food_name.toLowerCase() === meal.food_name.toLowerCase())
    ) || [];

    return NextResponse.json({
      success: true,
      data: uniqueMeals,
      count: uniqueMeals.length
    });

  } catch (error) {
    console.error('食事履歴APIエラー:', error);
    return NextResponse.json(
      { error: '食事履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
} 