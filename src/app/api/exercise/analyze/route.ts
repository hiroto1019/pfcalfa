import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeTextNutrition } from '@/lib/grok';

// 運動解析専用の関数（Gemini-2.0-flash使用）
async function analyzeExerciseText(exerciseText: string) {
  const exercisePrompt = `
以下の運動内容から詳細な消費カロリーを推定してください。
運動内容: ${exerciseText}

以下の形式でJSONで回答してください：
{
  "exercise_name": "運動名",
  "calories_burned": 消費カロリー（数値のみ、運動強度と時間を考慮した正確な値）,
  "duration_minutes": 運動時間（分、推定値）,
  "exercise_type": "運動タイプ（cardio/strength/flexibility/balance）",
  "notes": "補足説明"
}

注意事項：
- 消費カロリーは運動の種類、強度、時間を総合的に考慮して正確に推定してください
- 体重60-70kgの成人を基準とします
- 運動時間が明記されていない場合は、一般的な運動時間を推定してください
- 運動名は簡潔で分かりやすい名前にしてください
- 数値は整数で回答してください
- 150kcalの固定値は避けて、運動内容に応じた適切な値を算出してください

運動別の参考消費カロリー（30分あたり）：
- ウォーキング: 120-180kcal
- ランニング: 300-450kcal
- サイクリング: 200-350kcal
- 水泳: 250-400kcal
- 筋力トレーニング: 150-250kcal
- ヨガ: 100-200kcal
- ダンス: 200-300kcal
- テニス: 250-350kcal
- バスケットボール: 300-450kcal
- サッカー: 350-500kcal
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
    
    // エラーの場合のフォールバック（より適切な推定）
    const fallbackResult = {
      exercise_name: exerciseText,
      calories_burned: estimateCaloriesFromText(exerciseText),
      duration_minutes: 30,
      exercise_type: 'cardio',
      notes: `AI解析失敗、手動推定: ${exerciseText}`
    };
    
    console.log('フォールバック結果を使用:', fallbackResult);
    return fallbackResult;
  }
}

// テキストから消費カロリーを推定する関数
function estimateCaloriesFromText(exerciseText: string): number {
  const lowerText = exerciseText.toLowerCase();
  
  // 運動別の推定カロリー（30分あたり）
  const exerciseCalories: { [key: string]: number } = {
    'ランニング': 350, 'ジョギング': 300, 'マラソン': 400,
    'ウォーキング': 150, '散歩': 120, '歩く': 150,
    'サイクリング': 250, '自転車': 250, 'バイク': 250,
    '水泳': 300, 'プール': 300, 'スイミング': 300,
    '筋トレ': 200, '筋力': 200, 'ウェイト': 200, 'ダンベル': 200,
    'ヨガ': 150, 'ピラティス': 150, 'ストレッチ': 100,
    'ダンス': 250, 'ダンサー': 250,
    'テニス': 300, 'バドミントン': 250, '卓球': 200,
    'バスケ': 350, 'バスケット': 350, 'サッカー': 400, 'フットボール': 400,
    '野球': 250, 'ソフトボール': 200,
    'ゴルフ': 200, 'ボウリング': 150,
    'スキー': 300, 'スノーボード': 350,
    'サーフィン': 250, 'ボルダリング': 300, 'クライミング': 300,
    'ボクシング': 400, 'キックボクシング': 450, '空手': 350,
    '柔道': 350, '剣道': 300, '合気道': 250,
    'エアロビ': 300, 'ズンバ': 350, 'ヒップホップ': 300,
    'バレエ': 200, 'ジャズダンス': 250,
    'ランニングマシン': 350, 'トレッドミル': 350,
    'エリプティカル': 300, 'クロストレーナー': 300,
    'ローイング': 350, '漕ぐ': 350,
    'ステップ': 250, 'ステッパー': 250,
    '腹筋': 150, '腕立て': 150, 'スクワット': 200,
    'プランク': 100, 'バーピー': 300
  };

  // 運動時間の推定
  let duration = 30;
  const timeMatch = exerciseText.match(/(\d+)\s*(分|時間|h|min)/);
  if (timeMatch) {
    const time = parseInt(timeMatch[1]);
    if (timeMatch[2] === '時間' || timeMatch[2] === 'h') {
      duration = time * 60;
    } else {
      duration = time;
    }
  }

  // 運動名からカロリーを推定
  for (const [exercise, baseCalories] of Object.entries(exerciseCalories)) {
    if (lowerText.includes(exercise)) {
      // 時間に応じてカロリーを調整
      return Math.round((baseCalories * duration) / 30);
    }
  }

  // デフォルトの推定カロリー
  return Math.round((200 * duration) / 30);
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

    // 解析結果のみを返す（データベースには保存しない）
    return NextResponse.json({
      success: true,
      data: {
        exercise_name: analysisResult.exercise_name,
        calories_burned: analysisResult.calories_burned,
        duration_minutes: analysisResult.duration_minutes,
        exercise_type: analysisResult.exercise_type,
        notes: analysisResult.notes
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