import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 運動記録の取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = createClient();
    
    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    let query = supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // 日付指定がある場合はフィルタリング
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());
    }

    const { data: exercises, error } = await query;

    if (error) {
      console.error('運動記録取得エラー:', error);
      return NextResponse.json(
        { error: '運動記録の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: exercises,
      count: exercises?.length || 0
    });

  } catch (error) {
    console.error('運動記録APIエラー:', error);
    return NextResponse.json(
      { error: '運動記録の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 運動記録の作成
export async function POST(request: NextRequest) {
  try {
    console.log('運動記録作成API開始');
    
    const body = await request.json();
    console.log('リクエストボディ:', body);
    
    const { exercise_name, duration_minutes, calories_burned, exercise_type, notes } = body;

    // バリデーション
    if (!exercise_name || !duration_minutes || !calories_burned || !exercise_type) {
      console.log('バリデーションエラー:', { exercise_name, duration_minutes, calories_burned, exercise_type });
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('認証エラー:', authError);
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    console.log('ユーザーID:', user.id);

    // 運動記録を作成
    const insertData = {
      user_id: user.id,
      exercise_name,
      duration_minutes: parseInt(duration_minutes),
      calories_burned: parseInt(calories_burned),
      exercise_type,
      notes: notes || null
    };

    console.log('挿入データ:', insertData);

    const { data: exercise, error } = await supabase
      .from('exercise_logs')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('運動記録作成エラー:', error);
      return NextResponse.json(
        { error: `運動記録の作成に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('運動記録作成成功:', exercise);

    return NextResponse.json({
      success: true,
      data: exercise
    });

  } catch (error) {
    console.error('運動記録作成APIエラー:', error);
    return NextResponse.json(
      { error: '運動記録の作成に失敗しました' },
      { status: 500 }
    );
  }
}

// 運動記録の更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, exercise_name, duration_minutes, calories_burned, exercise_type, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: '運動記録IDが必要です' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 運動記録を更新
    const { data: exercise, error } = await supabase
      .from('exercise_logs')
      .update({
        exercise_name,
        duration_minutes,
        calories_burned,
        exercise_type,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('運動記録更新エラー:', error);
      return NextResponse.json(
        { error: '運動記録の更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: exercise
    });

  } catch (error) {
    console.error('運動記録更新APIエラー:', error);
    return NextResponse.json(
      { error: '運動記録の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// 運動記録の削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '運動記録IDが必要です' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 運動記録を削除
    const { error } = await supabase
      .from('exercise_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('運動記録削除エラー:', error);
      return NextResponse.json(
        { error: '運動記録の削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '運動記録を削除しました'
    });

  } catch (error) {
    console.error('運動記録削除APIエラー:', error);
    return NextResponse.json(
      { error: '運動記録の削除に失敗しました' },
      { status: 500 }
    );
  }
} 