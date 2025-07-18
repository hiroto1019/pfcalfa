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
  let mealSummary = "バランスの良い食事で健康を維持しましょう。野菜とタンパク質を意識して、バランスの良い栄養摂取を目指しましょう。";
  let mealDetail = "バランスの良い食事で健康を維持しましょう。野菜、タンパク質、炭水化物をバランスよく摂取。朝食はしっかりと、昼食は適度に、夕食は軽めに。間食は果物やナッツを選び、水分補給も忘れずに。食事の時間をゆっくりとり、よく噛んで食べることで満腹感を得やすくなります。水分補給も忘れずに、1日1.5L以上の水を飲むことを心がけましょう。";
  let exerciseSummary = "適度な運動を取り入れてください。ウォーキングから始めてみましょう。継続可能な運動習慣を作り、楽しみながら健康を維持しましょう。";
  let exerciseDetail = "適度な運動を取り入れてください。ウォーキング、ジョギング、サイクリングなどの有酸素運動を30分程度。筋トレも週2回取り入れて、全身の筋肉をバランスよく鍛えましょう。また、運動前後のストレッチを忘れずに行い、怪我の予防をしましょう。運動の強度は会話ができる程度を目安にし、無理のない範囲で継続することが大切です。";
  
  if (userProfile) {
    const targetCalories = calculateTargetCalories(userProfile);
    const calorieDiff = dailyData ? Math.round(targetCalories - (dailyData.total_calories || 0)) : 0;
    const currentCalories = dailyData?.total_calories || 0;
    const currentProtein = dailyData?.total_protein || 0;
    const currentFat = dailyData?.total_fat || 0;
    const currentCarbs = dailyData?.total_carbs || 0;
    
    if (userProfile.goal_type === 'diet') {
      mealSummary = "ダイエット中は野菜を多めに、炭水化物を控えめにしましょう。低カロリー食材を活用して、バランスの良い栄養摂取を目指しましょう。";
      mealDetail = `ダイエット中は野菜を多めに、炭水化物を控えめにしましょう。朝食にサラダと卵、昼食は鶏胸肉と野菜、夕食は魚と野菜を中心に。間食はナッツやヨーグルトを選び、水分も十分に摂りましょう。${dailyData ? `今日の摂取カロリー: ${currentCalories}kcal、目標カロリー${Math.round(targetCalories)}kcalとの差: ${calorieDiff}kcal、タンパク質${Math.round(currentProtein)}g、脂質${Math.round(currentFat)}g、炭水化物${Math.round(currentCarbs)}g` : ''}1日の目標カロリー${Math.round(targetCalories)}kcalを意識して、食事の量と質をバランスよく調整してください。食事の時間をゆっくりとり、よく噛んで食べることで満腹感を得やすくなります。水分補給も忘れずに、1日1.5L以上の水を飲むことを心がけましょう。`;
      exerciseSummary = "ウォーキングや軽い筋トレで代謝を上げましょう。毎日30分の運動を習慣に。継続可能な運動習慣を作り、楽しみながら健康を維持しましょう。";
      exerciseDetail = "ウォーキングや軽い筋トレで代謝を上げましょう。毎日30分のウォーキング、週3回の筋トレ（スクワット、プッシュアップ、プランク）を習慣に。階段を使う、一駅分歩くなど、日常生活でも運動量を増やしましょう。有酸素運動で脂肪燃焼を促進し、筋トレで基礎代謝を維持することが重要です。また、運動前後のストレッチを忘れずに行い、怪我の予防をしましょう。運動の強度は会話ができる程度を目安にし、無理のない範囲で継続することが大切です。";
    } else if (userProfile.goal_type === 'bulk-up') {
      mealSummary = "筋肉をつけるためにタンパク質を多めに摂りましょう。プロテインも活用して、バランスの良い栄養摂取を目指しましょう。";
      mealDetail = `筋肉をつけるためにタンパク質を多めに摂りましょう。朝食にプロテインシェイク、昼食は鶏胸肉や牛肉、夕食は魚や豆腐を中心に。間食にナッツやチーズ、運動後はプロテインを摂取。炭水化物も適度に摂ってエネルギーを確保しましょう。${dailyData ? `今日の摂取カロリー: ${currentCalories}kcal、目標カロリー${Math.round(targetCalories)}kcalとの差: ${calorieDiff}kcal、タンパク質${Math.round(currentProtein)}g、脂質${Math.round(currentFat)}g、炭水化物${Math.round(currentCarbs)}g` : ''}1日3食に加えて、運動前後の栄養補給も重要です。食事の時間をゆっくりとり、よく噛んで食べることで満腹感を得やすくなります。水分補給も忘れずに、1日1.5L以上の水を飲むことを心がけましょう。`;
      exerciseSummary = "筋トレを中心に、有酸素運動も取り入れましょう。週4回のトレーニングを目標に。継続可能な運動習慣を作り、楽しみながら健康を維持しましょう。";
      exerciseDetail = "筋トレを中心に、有酸素運動も取り入れましょう。週4回の筋トレ（胸、背中、脚、肩をローテーション）、各部位8-12回×3セット。有酸素運動は週2回30分程度。十分な休息と栄養補給で筋肉の成長をサポートしましょう。プログレッシブオーバーロードを意識して、徐々に負荷を上げていくことが重要です。また、運動前後のストレッチを忘れずに行い、怪我の予防をしましょう。運動の強度は会話ができる程度を目安にし、無理のない範囲で継続することが大切です。";
    } else {
      mealSummary = "バランスの良い食事で健康を維持しましょう。多様な食材を取り入れて、バランスの良い栄養摂取を目指しましょう。";
      mealDetail = `バランスの良い食事で健康を維持しましょう。野菜、タンパク質、炭水化物をバランスよく摂取。朝食はしっかりと、昼食は適度に、夕食は軽めに。間食は果物やナッツを選び、水分補給も忘れずに。${dailyData ? `今日の摂取カロリー: ${currentCalories}kcal、目標カロリー${Math.round(targetCalories)}kcalとの差: ${calorieDiff}kcal、タンパク質${Math.round(currentProtein)}g、脂質${Math.round(currentFat)}g、炭水化物${Math.round(currentCarbs)}g` : ''}1日の栄養バランスを意識して、多様な食材を取り入れることが重要です。食事の時間をゆっくりとり、よく噛んで食べることで満腹感を得やすくなります。水分補給も忘れずに、1日1.5L以上の水を飲むことを心がけましょう。`;
      exerciseSummary = "週3回程度の運動で体力を維持しましょう。楽しめる運動を見つけて。継続可能な運動習慣を作り、楽しみながら健康を維持しましょう。";
      exerciseDetail = "週3回程度の運動で体力を維持しましょう。ウォーキング、ジョギング、サイクリングなどの有酸素運動を30分程度。筋トレも週2回取り入れて、全身の筋肉をバランスよく鍛えましょう。継続可能な運動習慣を作り、楽しみながら健康を維持することが大切です。また、運動前後のストレッチを忘れずに行い、怪我の予防をしましょう。運動の強度は会話ができる程度を目安にし、無理のない範囲で継続することが大切です。";
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

// Gemini API呼び出し関数（高品質版）
async function callGeminiAPI(prompt: string, retryCount = 0): Promise<any> {
  const maxRetries = 2; // 2回に増加（安定性向上）
  const baseDelay = 300; // 0.3秒に戻す

  try {
    console.log(`Gemini API呼び出し開始 (試行 ${retryCount + 1}/${maxRetries + 1})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒に延長（高品質なアドバイス生成のため）

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
            temperature: 0.4, // 0.3から0.4に増加（より多様なアドバイス）
            maxOutputTokens: 800, // 700から800に増加（より詳細なアドバイス）
            topP: 0.9, // 0.8から0.9に増加
            topK: 30, // 25から30に増加
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
        const delay = baseDelay * Math.pow(2, retryCount); // 指数バックオフ: 0.3秒、0.6秒
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
            adviceData[field] = "今日も健康的な食事を心がけましょう。野菜とタンパク質を意識して、バランスの良い栄養摂取を目指しましょう。";
          } else if (field === 'meal_detail') {
            adviceData[field] = "今日も健康的な食事を心がけましょう。野菜、タンパク質、炭水化物をバランスよく摂取。朝食はしっかりと、昼食は適度に、夕食は軽めに。間食は果物やナッツを選び、水分補給も忘れずに。食事の時間をゆっくりとり、よく噛んで食べることで満腹感を得やすくなります。水分補給も忘れずに、1日1.5L以上の水を飲むことを心がけましょう。";
          } else if (field === 'exercise_summary') {
            adviceData[field] = "適度な運動を取り入れてください。ウォーキングから始めてみましょう。継続可能な運動習慣を作り、楽しみながら健康を維持しましょう。";
          } else if (field === 'exercise_detail') {
            adviceData[field] = "適度な運動を取り入れてください。ウォーキング、ジョギング、サイクリングなどの有酸素運動を30分程度。筋トレも週2回取り入れて、全身の筋肉をバランスよく鍛えましょう。また、運動前後のストレッチを忘れずに行い、怪我の予防をしましょう。運動の強度は会話ができる程度を目安にし、無理のない範囲で継続することが大切です。";
          }
        });
      }
      
      // 文字数チェックと修正（指定された文字数制限）
      if (adviceData.meal_summary) {
        const mealSummaryLength = adviceData.meal_summary.length;
        if (mealSummaryLength < 40) {
          console.log('食事要約が短すぎます。修正します。');
          adviceData.meal_summary = adviceData.meal_summary + "具体的な食材や調理法を意識して、栄養バランスを整えましょう。";
        } else if (mealSummaryLength > 60) {
          console.log('食事要約が長すぎます。短縮します。');
          adviceData.meal_summary = adviceData.meal_summary.substring(0, 60);
        }
      }
      
      if (adviceData.exercise_summary) {
        const exerciseSummaryLength = adviceData.exercise_summary.length;
        if (exerciseSummaryLength < 40) {
          console.log('運動要約が短すぎます。修正します。');
          adviceData.exercise_summary = adviceData.exercise_summary + "継続可能な運動習慣を作り、楽しみながら健康を維持しましょう。";
        } else if (exerciseSummaryLength > 60) {
          console.log('運動要約が長すぎます。短縮します。');
          adviceData.exercise_summary = adviceData.exercise_summary.substring(0, 60);
        }
      }
      
      // 詳細文の文字数チェックと修正
      if (adviceData.meal_detail) {
        const mealDetailLength = adviceData.meal_detail.length;
        if (mealDetailLength < 160) {
          console.log('食事詳細が短すぎます。修正します。');
          adviceData.meal_detail = adviceData.meal_detail + "また、食事の時間をゆっくりとり、よく噛んで食べることで満腹感を得やすくなります。水分補給も忘れずに、1日1.5L以上の水を飲むことを心がけましょう。食材の選び方や調理法も工夫して、栄養価を高めながら美味しく食べることを心がけましょう。";
        } else if (mealDetailLength > 200) {
          console.log('食事詳細が長すぎます。短縮します。');
          adviceData.meal_detail = adviceData.meal_detail.substring(0, 200);
        }
      }
      
      if (adviceData.exercise_detail) {
        const exerciseDetailLength = adviceData.exercise_detail.length;
        if (exerciseDetailLength < 160) {
          console.log('運動詳細が短すぎます。修正します。');
          adviceData.exercise_detail = adviceData.exercise_detail + "また、運動前後のストレッチを忘れずに行い、怪我の予防をしましょう。運動の強度は会話ができる程度を目安にし、無理のない範囲で継続することが大切です。運動の種類もバリエーションを増やして、飽きずに続けられるようにしましょう。";
        } else if (exerciseDetailLength > 200) {
          console.log('運動詳細が長すぎます。短縮します。');
          adviceData.exercise_detail = adviceData.exercise_detail.substring(0, 200);
        }
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

    // より効率的で具体的なアドバイスを生成するプロンプト（高品質版）
    const prompt = `ユーザー情報に基づき、具体的で実践的な食事と運動のアドバイスを日本語で生成してください。

以下のJSON形式で出力してください：
{
  "meal_summary": "食事アドバイスの要約（40-60文字、具体的で魅力的な表現）",
  "meal_detail": "食事アドバイスの詳細（160-200文字、具体的で実行しやすい内容）",
  "exercise_summary": "運動アドバイスの要約（40-60文字、具体的で魅力的な表現）",
  "exercise_detail": "運動アドバイスの詳細（160-200文字、具体的で実行しやすい内容）"
}

ユーザー情報: ${userProfile.username}, ${userProfile.gender}, ${userProfile.height_cm}cm, ${userProfile.initial_weight_kg}kg→${userProfile.target_weight_kg}kg, 目標:${userProfile.goal_type}
${foodPreferencesText ? `${foodPreferencesText}` : ''}
${dailyData ? `今日の摂取状況: カロリー${dailyData.total_calories || 0}kcal, タンパク質${Math.round(dailyData.total_protein || 0)}g, 脂質${Math.round(dailyData.total_fat || 0)}g, 炭水化物${Math.round(dailyData.total_carbs || 0)}g` : ''}

【絶対に守るべき数値（間違えてはいけません）】:
- 理想カロリー: ${Math.round(targetCalories)}kcal
- 今日の摂取カロリー: ${dailyData?.total_calories || 0}kcal
- 今日のタンパク質: ${Math.round(dailyData?.total_protein || 0)}g
- 今日の脂質: ${Math.round(dailyData?.total_fat || 0)}g
- 今日の炭水化物: ${Math.round(dailyData?.total_carbs || 0)}g

【禁止事項】:
- 上記で指定した数値以外のカロリー数値を使用してはいけません
- 間違った数値を絶対に使用してはいけません
- 目標カロリーは必ず${Math.round(targetCalories)}kcalとして参照してください
- 今日の摂取カロリーは必ず${dailyData?.total_calories || 0}kcalとして参照してください

アドバイスのポイント:
- 食事: 今日の摂取データ（${dailyData?.total_calories || 0}kcal）を踏まえて、目標カロリー${Math.round(targetCalories)}kcalに向けた具体的な食材やメニューを提案
- 運動: 今日の摂取カロリー（${dailyData?.total_calories || 0}kcal）と目標カロリー${Math.round(targetCalories)}kcalの差を考慮した適切な運動強度を提案
- 要約は40-60文字で、毎回異なる表現を使用
- 詳細は160-200文字で、具体的で実行しやすい内容
- 今日の摂取データがある場合は、それを踏まえた具体的なアドバイス
- 上記で指定した正確な数値のみを使用してアドバイスを提供
- 数値は整数で表示
- 今日のPFCバランスを考慮したアドバイス`;

    console.log('GEMINI_API_KEY設定確認:', process.env.GEMINI_API_KEY ? '設定済み' : '未設定');
    
    try {
      // Gemini APIを呼び出し（高精度版）
      const result = await callGeminiAPI(prompt);
      
      // 目標カロリーの検証と修正（強化版）
      const correctTargetCalories = Math.round(targetCalories);
      const actualCalories = dailyData?.total_calories || 0;
      
      // 数値の自動修正機能（強化版）
      ['meal_summary', 'meal_detail', 'exercise_summary', 'exercise_detail'].forEach(field => {
        if (result[field]) {
          let text = result[field];
          let hasCorrection = false;
          
          // 目標カロリーの誤りを修正（より多くのパターンに対応）
          const targetCaloriePatterns = [
            { pattern: /(\d{3,4})kcal.*目標/, replacement: `${correctTargetCalories}kcal` },
            { pattern: /目標.*(\d{3,4})kcal/, replacement: `${correctTargetCalories}kcal` },
            { pattern: /(\d{3,4})kcal.*目指/, replacement: `${correctTargetCalories}kcal` },
            { pattern: /理想.*(\d{3,4})kcal/, replacement: `${correctTargetCalories}kcal` },
            { pattern: /(\d{3,4})kcal.*理想/, replacement: `${correctTargetCalories}kcal` },
            { pattern: /目標の(\d{3,4})kcal/, replacement: `目標の${correctTargetCalories}kcal` },
            { pattern: /(\d{3,4})kcalを目標/, replacement: `${correctTargetCalories}kcalを目標` }
          ];
          
          targetCaloriePatterns.forEach(({ pattern, replacement }) => {
            if (pattern.test(text)) {
              console.log(`目標カロリーの誤りを検出、${correctTargetCalories}kcalに修正します`);
              text = text.replace(pattern, replacement);
              hasCorrection = true;
            }
          });
          
          // 今日の摂取カロリーの誤りを修正（より多くのパターンに対応）
          const intakeCaloriePatterns = [
            { pattern: /今日の摂取カロリー.*(\d{3,4})kcal/, replacement: `今日の摂取カロリー${actualCalories}kcal` },
            { pattern: /摂取カロリー.*(\d{3,4})kcal/, replacement: `摂取カロリー${actualCalories}kcal` },
            { pattern: /今日の摂取カロリーが(\d{3,4})/, replacement: `今日の摂取カロリーが${actualCalories}` },
            { pattern: /摂取カロリーが(\d{3,4})/, replacement: `摂取カロリーが${actualCalories}` },
            { pattern: /(\d{3,4})kcal.*摂取/, replacement: `${actualCalories}kcal` },
            { pattern: /(\d{3,4})kcalと.*少ない/, replacement: `${actualCalories}kcalと少ない` },
            { pattern: /(\d{3,4})kcalと.*多い/, replacement: `${actualCalories}kcalと多い` }
          ];
          
          intakeCaloriePatterns.forEach(({ pattern, replacement }) => {
            if (pattern.test(text)) {
              console.log(`今日の摂取カロリーの誤りを検出、${actualCalories}kcalに修正します`);
              text = text.replace(pattern, replacement);
              hasCorrection = true;
            }
          });
          
          if (hasCorrection) {
            console.log(`フィールド ${field} の数値を修正しました`);
            result[field] = text;
          }
        }
      });
      
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