import { NextRequest, NextResponse } from 'next/server';
import { getIdealCalories } from '@/lib/utils';

// 簡易キャッシュ（メモリ内）
const adviceCache = new Map<string, any>();
const CACHE_TTL = 10 * 60 * 1000; // 10分

// キャッシュクリーンアップ関数
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of adviceCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      adviceCache.delete(key);
    }
  }
}
setInterval(cleanupCache, 10 * 60 * 1000);



// Gemini API呼び出し関数
async function callGeminiAPI(prompt: string, retryCount = 0): Promise<any> {
  const maxRetries = 2;
  const baseDelay = 300;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3, maxOutputTokens: 600, topP: 0.8, topK: 25, candidateCount: 1
          }
        }),
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    if (!geminiResponse.ok) {
      if (geminiResponse.status === 503 && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callGeminiAPI(prompt, retryCount + 1);
      }
      throw new Error(`Gemini API呼び出しに失敗: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Gemini APIからの応答が不正です');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSONレスポンスが見つかりません');

    return JSON.parse(jsonMatch[0]);
  } catch (error: any) {
    console.error('Gemini API呼び出しエラー:', error);
    if (error.name === 'AbortError') throw new Error('AIアドバイスの生成がタイムアウトしました。');
    throw error;
  }
}

// フォールバックレスポンス生成関数（カロリー表記なし）
function createFallbackResponse() {
  return {
    meal_detail: "基本的な食事として、朝は卵と野菜、昼は鶏胸肉とご飯、夜は魚と味噌汁を心がけましょう。間食にはナッツやヨーグルトがおすすめです。水分を十分に摂り、よく噛んで食べることで健康的な食生活をサポートします。",
    exercise_detail: "毎日の30分のウォーキングを基本に、週2回の筋トレ（スクワット、プランクなど）を取り入れましょう。運動前後のストレッチを忘れず、無理のない範囲で継続することが最も大切です。"
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userProfile, dailyData } = body;

    if (!userProfile) {
      return NextResponse.json({ error: 'ユーザープロファイルが必要です' }, { status: 400 });
    }

    const targetCalories = getIdealCalories(userProfile, userProfile.initial_weight_kg, userProfile.activity_level);
    const actualCalories = dailyData?.total_calories || 0;
    const exerciseCalories = dailyData?.total_exercise_calories || 0;

    // デバッグログ追加
    console.log('AIアドバイス計算デバッグ:', {
      targetCalories: Math.round(targetCalories),
      actualCalories,
      exerciseCalories,
      calorieDiff: Math.round(actualCalories - targetCalories), // 正しい計算: 純カロリー - 理想カロリー
      userProfile: {
        username: userProfile.username,
        goal_type: userProfile.goal_type,
        birth_date: userProfile.birth_date,
        gender: userProfile.gender,
        height_cm: userProfile.height_cm,
        initial_weight_kg: userProfile.initial_weight_kg,
        activity_level: userProfile.activity_level
      }
    });

    // キャッシュキーを生成
    const calorieRange = Math.floor(actualCalories / 100) * 100;
    const cacheKey = `${userProfile.username}_${userProfile.goal_type}_${calorieRange}`;
    
    const cached = adviceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('キャッシュからアドバイスを取得');
      // キャッシュから詳細アドバイスのみを返す（要約文はUI側で生成）
      return NextResponse.json(cached.data);
    }

    const foodPreferencesText = (userProfile.food_preferences?.dislikes?.length || userProfile.food_preferences?.allergies?.length)
      ? `内部参考: 避けるべき食材(${userProfile.food_preferences.dislikes.join(', ') || 'なし'}), アレルギー食材(${userProfile.food_preferences.allergies.join(', ') || 'なし'})`
      : '';

    // AIへのプロンプトからは要約文の生成依頼を削除
    const calorieDiff = Math.round(actualCalories - targetCalories); // 正しい計算: 純カロリー - 理想カロリー
    const prompt = `あなたは、ユーザーの健康目標達成をサポートする、非常に優秀で誠実なAI栄養士兼パーソナルトレーナーです。

## 絶対的ルール
- **絶対に数値を捏造しない。** 提供されたユーザーデータ（特に今日の摂取カロリーと目標カロリー）を唯一の事実として使用する。
- **目標との差を最優先する。** アドバイスの全ては「目標カロリーに対して、現在の摂取カロリーがどういう状況か」という分析から始めること。
- **食事の好みは提案から除外するだけ。** 「〇〇は嫌いなようなので」といった言及は一切しない。

## ユーザーデータ
- ユーザー名: ${userProfile.username}さん
- 健康目標: ${userProfile.goal_type === 'diet' ? 'ダイエット' : userProfile.goal_type === 'bulk-up' ? '筋肉増強' : '健康維持'}
- **今日の摂取カロリー: ${actualCalories}kcal**
- **今日の運動消費カロリー: ${exerciseCalories}kcal**
- **目標カロリー: ${Math.round(targetCalories)}kcal**
- **目標までの差: ${calorieDiff}kcal**
${foodPreferencesText}

## あなたのタスク
上記のユーザーデータに基づき、具体的で実践的な「詳細アドバイス」のみを生成してください。
- **分析:** 「今日の摂取カロリー」と「目標カロリー」の差 (${calorieDiff}kcal) を明確に認識する。
- **アドバイス生成:** 分析結果に基づき、今日の残りの時間で何をすべきか、具体的な食事や運動を提案する。
  - **重要:** 詳細アドバイス内では**絶対にカロリー数値を言及しない**。要約文のカロリー表記を参照する。
  - **運動アドバイス:** 今日の運動消費カロリー (${exerciseCalories}kcal) を考慮して、適切な運動提案を行う。
  - **例:** 目標まで残りわずかなら「夕食は軽めに」、大幅に不足していれば「タンパク質中心の食事を」、超過していれば「軽い運動で消費を」のように、状況に応じた具体的な言葉を選ぶ。

## 出力形式
以下のJSON形式で、自然な日本語で出力してください。要約は不要です。
{
  "meal_detail": "食事アドバイスの詳細（150-200文字）",
  "exercise_detail": "運動アドバイスの詳細（150-200文字）"
}`;
    
    try {
      const result = await callGeminiAPI(prompt);
      
      const finalResponse = {
        meal_detail: result.meal_detail,
        exercise_detail: result.exercise_detail
      };

      adviceCache.set(cacheKey, { data: finalResponse, timestamp: Date.now() });
      return NextResponse.json(finalResponse);

    } catch (apiError: any) {
      const fallbackResponse = createFallbackResponse();
      adviceCache.set(cacheKey, { data: fallbackResponse, timestamp: Date.now() });
      return NextResponse.json(fallbackResponse, { status: 500 });
    }

  } catch (error) {
    console.error('AIアドバイスAPIエラー:', error);
    return NextResponse.json({ error: 'AIアドバイスの取得に失敗しました。' }, { status: 500 });
  }
} 