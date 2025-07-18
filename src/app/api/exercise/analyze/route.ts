import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeTextNutrition } from '@/lib/grok';

// 運動解析専用の関数
async function analyzeExerciseText(exerciseText: string) {
  const exercisePrompt = `
以下の運動内容から消費カロリーを推定してください。
運動内容: ${exerciseText}

以下の形式でJSONで回答してください：
{
  "exercise_name": "運動名",
  "calories_burned": 消費カロリー（数値のみ）,
  "duration_minutes": 運動時間（分、推定値）,
  "exercise_type": "運動タイプ（有酸素/筋力/柔軟性など）",
  "notes": "補足説明"
}

注意事項：
- 消費カロリーは一般的な成人（体重60-70kg）を基準に推定してください
- 運動時間が明記されていない場合は、一般的な運動時間を推定してください
- 運動名は簡潔で分かりやすい名前にしてください
- 数値は整数で回答してください
`;

  try {
    const result = await analyzeTextNutrition(exercisePrompt);
    
    // 結果を運動解析用に変換
    const exerciseResult = {
      exercise_name: result.food_name || exerciseText,
      calories_burned: result.calories || 0,
      duration_minutes: result.protein || 30, // 一時的にproteinフィールドを使用
      exercise_type: result.fat ? 'cardio' : 'strength', // 一時的にfatフィールドを使用
      notes: `AI解析: ${exerciseText}`
    };
    
    console.log('運動解析結果:', exerciseResult);
    return exerciseResult;
  } catch (error) {
    console.error('運動解析エラー:', error);
    
    // エラーの場合のフォールバック
    const fallbackResult = {
      exercise_name: exerciseText,
      calories_burned: 150,
      duration_minutes: 30,
      exercise_type: 'cardio',
      notes: `AI解析失敗、手動推定: ${exerciseText}`
    };
    
    console.log('フォールバック結果を使用:', fallbackResult);
    return fallbackResult;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { exerciseText } = await request.json();

    if (!exerciseText || typeof exerciseText !== 'string') {
      return NextResponse.json(
        { error: '運動内容のテキストが必要です' },
        { status: 400 }
      );
    }

    // Supabaseクライアントの初期化
    const supabase = createClient();

    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 運動内容を解析
    const analysisResult = await analyzeExerciseText(exerciseText);

    if (!analysisResult) {
      return NextResponse.json(
        { error: '運動内容の解析に失敗しました' },
        { status: 400 }
      );
    }

    // 解析結果を運動記録として保存
    const { data: exerciseRecord, error: insertError } = await supabase
      .from('exercise_logs')
      .insert({
        user_id: user.id,
        exercise_name: analysisResult.exercise_name,
        duration_minutes: analysisResult.duration_minutes,
        calories_burned: analysisResult.calories_burned,
        exercise_type: analysisResult.exercise_type,
        notes: analysisResult.notes
      })
      .select()
      .single();

    if (insertError) {
      console.error('運動記録保存エラー:', insertError);
      return NextResponse.json(
        { error: '運動記録の保存に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        exercise_name: exerciseRecord.exercise_name,
        calories_burned: exerciseRecord.calories_burned,
        duration_minutes: exerciseRecord.duration_minutes,
        exercise_type: exerciseRecord.exercise_type,
        notes: exerciseRecord.notes
      }
    });

  } catch (error) {
    console.error('運動解析エラー:', error);
    return NextResponse.json(
      { error: '運動解析に失敗しました' },
      { status: 500 }
    );
  }
} 