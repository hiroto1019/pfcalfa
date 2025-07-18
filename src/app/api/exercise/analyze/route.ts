import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 運動解析専用のGemini API呼び出し関数
async function callGeminiExerciseAPI(exerciseText: string, retryCount = 0): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini APIキーが設定されていません');
  }

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
- ベンチプレス: 100-200kcal（セット数と重量に応じて調整）
- スクワット: 150-250kcal
- デッドリフト: 200-300kcal
- プッシュアップ: 100-150kcal
- プランク: 50-100kcal

必ず運動内容から適切なカロリーを推定し、0kcalにならないよう設定してください。`;

  try {
    console.log(`運動解析Gemini API呼び出し開始: "${exerciseText}"`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: exercisePrompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 200,
            topP: 0.8,
            topK: 20,
            candidateCount: 1
          }
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);
    console.log('運動解析Gemini API応答ステータス:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('運動解析Gemini APIエラー詳細:', errorText);
      
      if (response.status === 503 && retryCount < 1) {
        const delay = 1000;
        console.log(`${delay}ms後にリトライします...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callGeminiExerciseAPI(exerciseText, retryCount + 1);
      }
      
      throw new Error(`運動解析Gemini API呼び出しに失敗しました: ${response.status}`);
    }

    const data = await response.json();
    console.log('運動解析Gemini API応答データ:', data);
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('運動解析Gemini APIから有効な応答が返されませんでした');
    }

    const content = data.candidates[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('運動解析Gemini APIからの応答が不正です');
    }

    console.log('運動解析Gemini API応答内容:', content);

    // JSONレスポンスを抽出
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('JSONレスポンスが見つかりません。内容:', content);
      throw new Error('運動解析Gemini APIからJSONレスポンスが返されませんでした');
    }

    const exerciseData = JSON.parse(jsonMatch[0]);
    console.log('運動解析結果:', exerciseData);
    
    // 必須フィールドの検証
    const requiredFields = ['exercise_name', 'calories_burned', 'duration_minutes', 'exercise_type', 'notes'];
    const missingFields = requiredFields.filter(field => !(field in exerciseData));
    
    if (missingFields.length > 0) {
      console.log('必須フィールドが不足:', missingFields);
      missingFields.forEach(field => {
        if (field === 'exercise_name') {
          exerciseData[field] = exerciseText;
        } else if (field === 'calories_burned') {
          exerciseData[field] = estimateCaloriesFromText(exerciseText);
        } else if (field === 'duration_minutes') {
          exerciseData[field] = 30;
        } else if (field === 'exercise_type') {
          exerciseData[field] = 'strength';
        } else if (field === 'notes') {
          exerciseData[field] = `AI解析: ${exerciseText}`;
        }
      });
    }
    
    return exerciseData;

  } catch (error: any) {
    console.error('運動解析Gemini API呼び出しエラー:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('運動解析がタイムアウトしました。再度お試しください。');
    }
    
    throw error;
  }
}

// 運動解析専用の関数（Gemini-2.0-flash使用）
async function analyzeExerciseText(exerciseText: string) {
  try {
    const result = await callGeminiExerciseAPI(exerciseText);
    
    // 結果を運動解析用に変換
    const exerciseResult = {
      exercise_name: result.exercise_name || exerciseText,
      calories_burned: result.calories_burned || 0,
      duration_minutes: result.duration_minutes || 30,
      exercise_type: result.exercise_type || 'strength',
      notes: result.notes || `AI解析: ${exerciseText}`
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
      exercise_type: 'strength',
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
    'プランク': 100, 'バーピー': 300,
    'ベンチプレス': 150, 'ベンチ': 150, 'プレス': 150,
    'デッドリフト': 250, 'デッド': 250,
    'プッシュアップ': 120, '腕立て伏せ': 120,
    'チンニング': 200, '懸垂': 200, 'プルアップ': 200,
    'ショルダープレス': 180, 'オーバーヘッドプレス': 180,
    'ラットプルダウン': 160, 'ラット': 160,
    'レッグプレス': 220, 'レッグ': 220,
    'カーフレイズ': 100, 'カーフ': 100,
    'サイドレイズ': 120, 'ラテラルレイズ': 120,
    'フロントレイズ': 120, 'フロント': 120,
    'リアレイズ': 120, 'リア': 120,
    'バーベルカール': 120, 'カール': 120,
    'トライセップス': 120, 'トライ': 120,
    'ディップス': 150, 'ディップ': 150
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

  // ベンチプレスの重量と回数に応じたカロリー計算
  if (lowerText.includes('ベンチプレス') || lowerText.includes('ベンチ') || lowerText.includes('プレス')) {
    const weightMatch = exerciseText.match(/(\d+)\s*(キロ|kg|kg)/);
    const repsMatch = exerciseText.match(/(\d+)\s*(回|rep)/);
    
    if (weightMatch && repsMatch) {
      const weight = parseInt(weightMatch[1]);
      const reps = parseInt(repsMatch[1]);
      
      // 重量と回数に応じたカロリー計算
      let calories = 0;
      if (weight >= 100) {
        calories = 15 + (weight - 100) * 0.2; // 100kg以上は重量に応じて増加
      } else if (weight >= 80) {
        calories = 12 + (weight - 80) * 0.15;
      } else if (weight >= 60) {
        calories = 10 + (weight - 60) * 0.1;
      } else {
        calories = 8 + weight * 0.05;
      }
      
      // 回数に応じて調整
      calories = calories * reps * 0.8; // 1回あたりのカロリー × 回数 × 効率
      
      return Math.round(Math.max(calories, 50)); // 最低50kcal
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