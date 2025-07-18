import { NextRequest, NextResponse } from 'next/server';

// 簡易キャッシュ（メモリ内）
const adviceCache = new Map<string, any>();
const CACHE_TTL = 10 * 60 * 1000; // 10分（アドバイスは少し長めにキャッシュ）

// キャッシュクリーンアップ関数
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of adviceCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      adviceCache.delete(key);
    }
  }
}

// 定期的にキャッシュをクリーンアップ（10分ごと）
setInterval(cleanupCache, 10 * 60 * 1000);

// 高速なフォールバックレスポンス生成
function createFallbackResponse() {
  return {
    meal_advice: "今日も健康的な食事を心がけましょう。",
    exercise_advice: "適度な運動を取り入れてください。"
  };
}

// Gemini API呼び出し関数（超高速化版）
async function callGeminiAPI(prompt: string, retryCount = 0): Promise<any> {
  const maxRetries = 2; // 3回から2回にさらに削減
  const baseDelay = 500; // 1秒から0.5秒に削減

  try {
    console.log(`Gemini API呼び出し開始 (試行 ${retryCount + 1}/${maxRetries + 1})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 20秒から12秒に短縮

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2, // 適度な温度で創造性を保ちつつ一貫性を向上
            maxOutputTokens: 200, // 出力トークンを制限して高速化
            topP: 0.7,
            topK: 20,
            candidateCount: 1 // 候補数を1に制限
          }
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);
    console.log('Gemini API応答ステータス:', geminiResponse.status);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini APIエラー詳細:', errorText);
      
      // 503エラー（過負荷）の場合はリトライ
      if (geminiResponse.status === 503 && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // 指数バックオフ: 0.5秒、1秒
        console.log(`${delay}ms後にリトライします... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callGeminiAPI(prompt, retryCount + 1);
      }
      
      // その他のエラーまたは最大リトライ回数に達した場合
      if (geminiResponse.status === 400) {
        throw new Error('AIアドバイスの生成に失敗しました。');
      }
      
      throw new Error(`Gemini API呼び出しに失敗しました: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini API応答データ:', geminiData);
    
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      console.log('Gemini APIからcandidatesが返されませんでした:', geminiData);
      throw new Error('Gemini APIから有効な応答が返されませんでした');
    }
    
    const content = geminiData.candidates[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.log('Gemini APIからの応答が不正:', geminiData);
      throw new Error('Gemini APIからの応答が不正です');
    }

    console.log('Gemini API応答内容:', content);

    // JSONレスポンスを抽出（最適化版）
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('JSONレスポンスが見つかりません。内容:', content);
      const fallbackResponse = createFallbackResponse();
      console.log('フォールバックレスポンスを使用:', fallbackResponse);
      return fallbackResponse;
    }

    try {
      const adviceData = JSON.parse(jsonMatch[0]);
      console.log('解析結果:', adviceData);
      
      // 必須フィールドの検証（最適化版）
      const requiredFields = ['meal_advice', 'exercise_advice'];
      const missingFields = requiredFields.filter(field => !(field in adviceData));
      
      if (missingFields.length > 0) {
        console.log('必須フィールドが不足:', missingFields);
        // 不足しているフィールドにデフォルト値を設定
        missingFields.forEach(field => {
          if (field === 'meal_advice') {
            adviceData[field] = "今日も健康的な食事を心がけましょう。";
          } else if (field === 'exercise_advice') {
            adviceData[field] = "適度な運動を取り入れてください。";
          }
        });
      }
      
      console.log('最終的なアドバイスデータ:', adviceData);
      return adviceData;
    } catch (parseError) {
      console.log('JSONパースエラー:', parseError);
      console.log('パースしようとしたJSON:', jsonMatch[0]);
      
      // パースエラーの場合もフォールバック
      const fallbackResponse = createFallbackResponse();
      return fallbackResponse;
    }

  } catch (fetchError: any) {
    console.error('Gemini API呼び出しエラー:', fetchError);
    
    if (fetchError.name === 'AbortError') {
      throw new Error('AIアドバイスの生成がタイムアウトしました。再度お試しください。');
    }
    
    // 503エラーでリトライ回数が残っている場合は再帰呼び出し
    if (fetchError.message.includes('503') && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount);
      console.log(`${delay}ms後にリトライします... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGeminiAPI(prompt, retryCount + 1);
    }
    
    throw fetchError;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('AIアドバイスAPI受信body:', body);
    const { userProfile, dailyData } = body;

    if (!userProfile) {
      return NextResponse.json(
        { error: 'ユーザープロファイルが必要です' },
        { status: 400 }
      );
    }

    console.log('AIアドバイス処理開始:', { userProfile, dailyData });

    // キャッシュキーを生成（最適化版）
    const cacheKey = `${userProfile.id}_${userProfile.goal_type}_${userProfile.activity_level}_${dailyData ? Math.round(dailyData.total_calories / 100) * 100 : 'no_data'}`;
    const cached = adviceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('キャッシュからアドバイスを取得');
      return NextResponse.json(cached.data);
    }

    // 目標カロリーを計算（最適化版）
    const age = new Date().getFullYear() - new Date(userProfile.birth_date).getFullYear();
    let bmr = 0;
    
    if (userProfile.gender === 'male') {
      bmr = 88.362 + (13.397 * userProfile.initial_weight_kg) + (4.799 * userProfile.height_cm) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * userProfile.initial_weight_kg) + (3.098 * userProfile.height_cm) - (4.330 * age);
    }

    const activityMultipliers = [1.2, 1.375, 1.55, 1.725, 1.9];
    const tdee = bmr * activityMultipliers[userProfile.activity_level - 1];

    let targetCalories = tdee;
    if (userProfile.goal_type === 'diet') {
      targetCalories = tdee - 500; // 500kcal減
    } else if (userProfile.goal_type === 'bulk-up') {
      targetCalories = tdee + 300; // 300kcal増
    }

    // プロンプトを最適化（超短縮版）
    const prompt = `ユーザー情報に基づき、食事と運動のアドバイスを日本語で100文字以内で、以下のJSON形式で出力してください。

{\"meal_advice\": \"食事アドバイス\", \"exercise_advice\": \"運動アドバイス\"}

ユーザー: ${userProfile.username}, ${userProfile.gender}, ${userProfile.height_cm}cm, ${userProfile.initial_weight_kg}kg→${userProfile.target_weight_kg}kg, 目標:${userProfile.goal_type}, カロリー:${Math.round(targetCalories)}kcal
${dailyData ? `今日の摂取: ${dailyData.total_calories || 0}kcal` : ''}`;

    console.log('GEMINI_API_KEY設定確認:', process.env.GEMINI_API_KEY ? '設定済み' : '未設定');
    
    try {
      // Gemini APIを呼び出し（超高速化版）
      const result = await callGeminiAPI(prompt);
      
      // キャッシュに保存
      adviceCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return NextResponse.json(result);
    } catch (apiError: any) {
      console.error('Gemini API最終エラー:', apiError);
      
      // 503エラーの場合は特別なメッセージを返す
      if (apiError.message.includes('503')) {
        return NextResponse.json(
          { 
            error: 'Gemini APIが一時的に過負荷状態です。しばらく時間をおいて再度お試しください。',
            fallback: {
              meal_advice: "今日も健康的な食事を心がけましょう。",
              exercise_advice: "適度な運動を取り入れてください。"
            }
          },
          { status: 503 }
        );
      }
      
      // その他のエラー
      return NextResponse.json(
        { error: apiError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('AIアドバイスエラー:', error);
    console.error('GEMINI_API_KEY存在:', !!process.env.GEMINI_API_KEY);
    return NextResponse.json(
      { error: 'AIアドバイスの取得に失敗しました。再度お試しください。' },
      { status: 500 }
    );
  }
} 