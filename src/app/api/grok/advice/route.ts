import { NextRequest, NextResponse } from 'next/server';

// 簡易キャッシュ（メモリ内）
const adviceCache = new Map<string, any>();
const CACHE_TTL = 10 * 60 * 1000; // 10分に短縮（より頻繁に更新）

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

// 高速なフォールバックレスポンス生成（改善版）
function createFallbackResponse(userProfile?: any, dailyData?: any) {
  // ユーザーの目標に基づいた詳細なフォールバック
  let mealSummary = "バランスの良い食事で健康を維持しましょう。野菜とタンパク質を意識して。";
  let mealDetail = "バランスの良い食事で健康を維持しましょう。野菜、タンパク質、炭水化物をバランスよく摂取。朝食はしっかりと、昼食は適度に、夕食は軽めに。間食は果物やナッツを選び、水分補給も忘れずに。";
  let exerciseSummary = "適度な運動を取り入れてください。ウォーキングから始めてみましょう。";
  let exerciseDetail = "適度な運動を取り入れてください。ウォーキング、ジョギング、サイクリングなどの有酸素運動を30分程度。筋トレも週2回取り入れて、全身の筋肉をバランスよく鍛えましょう。";
  
  if (userProfile) {
    const targetCalories = calculateTargetCalories(userProfile);
    const calorieDiff = dailyData ? Math.round(targetCalories - (dailyData.total_calories || 0)) : 0;
    
    if (userProfile.goal_type === 'diet') {
      mealSummary = "ダイエット中は野菜を多めに、炭水化物を控えめにしましょう。低カロリー食材を活用して。";
      mealDetail = `ダイエット中は野菜を多めに、炭水化物を控えめにしましょう。朝食にサラダと卵、昼食は鶏胸肉と野菜、夕食は魚と野菜を中心に。間食はナッツやヨーグルトを選び、水分も十分に摂りましょう。${dailyData ? `今日の摂取カロリー: ${dailyData.total_calories || 0}kcal、目標との差: ${calorieDiff}kcal` : ''}1日の目標カロリーを意識して、食事の量と質をバランスよく調整してください。`;
      exerciseSummary = "ウォーキングや軽い筋トレで代謝を上げましょう。毎日30分の運動を習慣に。";
      exerciseDetail = "ウォーキングや軽い筋トレで代謝を上げましょう。毎日30分のウォーキング、週3回の筋トレ（スクワット、プッシュアップ、プランク）を習慣に。階段を使う、一駅分歩くなど、日常生活でも運動量を増やしましょう。有酸素運動で脂肪燃焼を促進し、筋トレで基礎代謝を維持することが重要です。";
    } else if (userProfile.goal_type === 'bulk-up') {
      mealSummary = "筋肉をつけるためにタンパク質を多めに摂りましょう。プロテインも活用して。";
      mealDetail = `筋肉をつけるためにタンパク質を多めに摂りましょう。朝食にプロテインシェイク、昼食は鶏胸肉や牛肉、夕食は魚や豆腐を中心に。間食にナッツやチーズ、運動後はプロテインを摂取。炭水化物も適度に摂ってエネルギーを確保しましょう。${dailyData ? `今日の摂取カロリー: ${dailyData.total_calories || 0}kcal、目標との差: ${calorieDiff}kcal` : ''}1日3食に加えて、運動前後の栄養補給も重要です。`;
      exerciseSummary = "筋トレを中心に、有酸素運動も取り入れましょう。週4回のトレーニングを目標に。";
      exerciseDetail = "筋トレを中心に、有酸素運動も取り入れましょう。週4回の筋トレ（胸、背中、脚、肩をローテーション）、各部位8-12回×3セット。有酸素運動は週2回30分程度。十分な休息と栄養補給で筋肉の成長をサポートしましょう。プログレッシブオーバーロードを意識して、徐々に負荷を上げていくことが重要です。";
    } else {
      mealSummary = "バランスの良い食事で健康を維持しましょう。多様な食材を取り入れて。";
      mealDetail = `バランスの良い食事で健康を維持しましょう。野菜、タンパク質、炭水化物をバランスよく摂取。朝食はしっかりと、昼食は適度に、夕食は軽めに。間食は果物やナッツを選び、水分補給も忘れずに。${dailyData ? `今日の摂取カロリー: ${dailyData.total_calories || 0}kcal、目標との差: ${calorieDiff}kcal` : ''}1日の栄養バランスを意識して、多様な食材を取り入れることが重要です。`;
      exerciseSummary = "週3回程度の運動で体力を維持しましょう。楽しめる運動を見つけて。";
      exerciseDetail = "週3回程度の運動で体力を維持しましょう。ウォーキング、ジョギング、サイクリングなどの有酸素運動を30分程度。筋トレも週2回取り入れて、全身の筋肉をバランスよく鍛えましょう。継続可能な運動習慣を作り、楽しみながら健康を維持することが大切です。";
    }

    // 食事の好みがある場合は考慮
    if (userProfile.food_preferences) {
      const dislikes = userProfile.food_preferences.dislikes || [];
      const allergies = userProfile.food_preferences.allergies || [];
      
      if (dislikes.length > 0 || allergies.length > 0) {
        mealDetail += "食事の好みやアレルギーを考慮したアドバイスです。";
      }
    }
  }
  
  return {
    meal_summary: mealSummary,
    meal_detail: mealDetail,
    exercise_summary: exerciseSummary,
    exercise_detail: exerciseDetail
  };
}

// 目標カロリー計算関数（分離）
function calculateTargetCalories(userProfile: any): number {
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
    targetCalories = tdee - 500;
  } else if (userProfile.goal_type === 'bulk-up') {
    targetCalories = tdee + 300;
  }
  
  return targetCalories;
}

// Gemini API呼び出し関数（高精度版）
async function callGeminiAPI(prompt: string, retryCount = 0): Promise<any> {
  const maxRetries = 1; // 1回のみ（高速化）
  const baseDelay = 200; // 0.3秒から0.2秒に削減

  try {
    console.log(`Gemini API呼び出し開始 (試行 ${retryCount + 1}/${maxRetries + 1})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 6秒から5秒に短縮

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
            temperature: 0.3, // 0.2から0.3に戻す（要約文の多様性を確保）
            maxOutputTokens: 700, // 600から700に増加（要約文の品質向上）
            topP: 0.8, // 0.7から0.8に戻す
            topK: 25, // 20から25に戻す
            candidateCount: 1
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
        const delay = baseDelay * Math.pow(2, retryCount); // 指数バックオフ: 0.2秒
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
      // 内容から部分的な情報を抽出してフォールバックを改善
      const fallbackResponse = createFallbackResponse();
      console.log('フォールバックレスポンスを使用:', fallbackResponse);
      return fallbackResponse;
    }

    try {
      const adviceData = JSON.parse(jsonMatch[0]);
      console.log('解析結果:', adviceData);
      
      // 必須フィールドの検証と文字数チェック（改善版）
      const requiredFields = ['meal_summary', 'meal_detail', 'exercise_summary', 'exercise_detail'];
      const missingFields = requiredFields.filter(field => !(field in adviceData));
      
      if (missingFields.length > 0) {
        console.log('必須フィールドが不足:', missingFields);
        // 不足しているフィールドにデフォルト値を設定
        missingFields.forEach(field => {
          if (field === 'meal_summary') {
            adviceData[field] = "今日も健康的な食事を心がけましょう。野菜とタンパク質を意識して。";
          } else if (field === 'meal_detail') {
            adviceData[field] = "今日も健康的な食事を心がけましょう。野菜、タンパク質、炭水化物をバランスよく摂取。朝食はしっかりと、昼食は適度に、夕食は軽めに。間食は果物やナッツを選び、水分補給も忘れずに。";
          } else if (field === 'exercise_summary') {
            adviceData[field] = "適度な運動を取り入れてください。ウォーキングから始めてみましょう。";
          } else if (field === 'exercise_detail') {
            adviceData[field] = "適度な運動を取り入れてください。ウォーキング、ジョギング、サイクリングなどの有酸素運動を30分程度。筋トレも週2回取り入れて、全身の筋肉をバランスよく鍛えましょう。";
          }
        });
      }
      
      // 文字数チェックと修正（改善版）
      if (adviceData.meal_summary && adviceData.meal_summary.length < 40) {
        console.log('食事要約が短すぎます。修正します。');
        adviceData.meal_summary = adviceData.meal_summary + "具体的な食材や調理法を意識して、栄養バランスを整えましょう。";
      }
      
      if (adviceData.exercise_summary && adviceData.exercise_summary.length < 40) {
        console.log('運動要約が短すぎます。修正します。');
        adviceData.exercise_summary = adviceData.exercise_summary + "継続可能な運動習慣を作り、楽しみながら健康を維持しましょう。";
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
    const targetCalories = calculateTargetCalories(userProfile);
    const calorieRange = dailyData ? Math.floor((dailyData.total_calories || 0) / 100) * 100 : 0;
    const proteinRange = dailyData ? Math.floor((dailyData.total_protein || 0) / 10) * 10 : 0;
    const cacheKey = `${userProfile.username}_${userProfile.goal_type}_${userProfile.activity_level}_${calorieRange}_${proteinRange}_${Math.round(targetCalories / 100) * 100}`;
    
    const cached = adviceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('キャッシュからアドバイスを取得');
      return NextResponse.json(cached.data);
    }

    // 食事の好み情報を取得
    const dislikes = userProfile.food_preferences?.dislikes || [];
    const allergies = userProfile.food_preferences?.allergies || [];
    const foodPreferencesText = dislikes.length > 0 || allergies.length > 0 
      ? `参考情報: ユーザーの食事制限(${dislikes.join(', ') || 'なし'}), アレルギー(${allergies.join(', ') || 'なし'})` 
      : '';

    // より効率的で具体的なアドバイスを生成するプロンプト（高精度版）
    const prompt = `ユーザー情報に基づき、具体的で実践的な食事と運動のアドバイスを日本語で生成してください。

以下のJSON形式で出力してください：
{
  "meal_summary": "食事アドバイスの要約（必ず40-60文字で、具体的で多様な表現を使用）",
  "meal_detail": "食事アドバイスの詳細（100-300文字程度、具体的で実行しやすい内容）",
  "exercise_summary": "運動アドバイスの要約（必ず40-60文字で、具体的で多様な表現を使用）",
  "exercise_detail": "運動アドバイスの詳細（100-300文字程度、具体的で実行しやすい内容）"
}

ユーザー情報: ${userProfile.username}, ${userProfile.gender}, ${userProfile.height_cm}cm, ${userProfile.initial_weight_kg}kg→${userProfile.target_weight_kg}kg, 目標:${userProfile.goal_type}, 目標カロリー:${Math.round(targetCalories)}kcal
${foodPreferencesText ? `${foodPreferencesText}` : ''}
${dailyData ? `今日の摂取: ${dailyData.total_calories || 0}kcal (目標との差: ${Math.round(targetCalories - (dailyData.total_calories || 0))}kcal), タンパク質:${Math.round(dailyData.total_protein || 0)}g, 脂質:${Math.round(dailyData.total_fat || 0)}g, 炭水化物:${Math.round(dailyData.total_carbs || 0)}g` : ''}

アドバイスのポイント:
- 食事: 具体的な食材やメニューを提案し、栄養バランスを考慮する。今日の摂取量がある場合は、不足している栄養素を補うアドバイスを含める
- 運動: 具体的な運動種目、時間、頻度を提案する。ユーザーの目標に合わせた運動強度を提案する
- 食事の好みがある場合は、それらを自然に考慮した提案をする（言及しない）
- ユーザーの目標に合わせた実践的なアドバイスを提供する
- 要約は必ず40-60文字で、毎回異なる表現を使用し、具体的で魅力的な内容にする
- 詳細は100-300文字程度で、具体的で実行しやすい内容にする
- 今日の摂取データがある場合は、それを踏まえた具体的なアドバイスを提供する
- 内容が少ない場合は短めでも構わないが、最低100文字は確保する
- 数値は小数点以下を四捨五入して整数で表示する`;

    console.log('GEMINI_API_KEY設定確認:', process.env.GEMINI_API_KEY ? '設定済み' : '未設定');
    
    try {
      // Gemini APIを呼び出し（高精度版）
      const result = await callGeminiAPI(prompt);
      
      // キャッシュに保存
      adviceCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return NextResponse.json(result);
    } catch (apiError: any) {
      console.error('Gemini API最終エラー:', apiError);

      // エラーが発生した場合はフォールバックレスポンスを使用
      const fallbackResponse = createFallbackResponse(userProfile, dailyData);
      
      // キャッシュに保存（フォールバックでもキャッシュする）
      adviceCache.set(cacheKey, {
        data: fallbackResponse,
        timestamp: Date.now()
      });
      
      // 503エラーの場合は特別なメッセージを返す
      if (apiError.message.includes('503')) {
        return NextResponse.json(
          { 
            error: 'Gemini APIが一時的に過負荷状態です。フォールバックアドバイスを表示します。',
            fallback: fallbackResponse
          },
          { status: 503 }
        );
      }
      
      // その他のエラーでもフォールバックレスポンスを返す
      return NextResponse.json(
        { 
          error: 'AIアドバイスの生成に失敗しました。フォールバックアドバイスを表示します。',
          fallback: fallbackResponse
        },
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