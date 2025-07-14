import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('API受信body:', body);
    const { userProfile, dailyData } = body;

    if (!userProfile) {
      return NextResponse.json(
        { error: 'ユーザープロファイルが必要です' },
        { status: 400 }
      );
    }

    // 目標カロリーを計算（簡易版）
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

    // プロンプトを強化
    const prompt = `以下のユーザープロフィールと目標に基づき、今日1日の食事と運動に関するアドバイスを日本語で簡潔に100文字以内で、必ず以下のJSON形式で出力してください。\n\n形式: {\"meal_advice\": \"食事アドバイス\", \"exercise_advice\": \"運動アドバイス\"}\n\nユーザー情報:\n- 名前: ${userProfile.username}\n- 性別: ${userProfile.gender}\n- 身長: ${userProfile.height_cm}cm\n- 現在の体重: ${userProfile.initial_weight_kg}kg\n- 目標体重: ${userProfile.target_weight_kg}kg\n- 活動レベル: ${userProfile.activity_level}\n- 目標: ${userProfile.goal_type}\n- 目標カロリー: ${Math.round(targetCalories)}kcal\n- 嫌いな食べ物: ${userProfile.food_preferences?.dislikes?.join(', ') || 'なし'}\n- アレルギー: ${userProfile.food_preferences?.allergies?.join(', ') || 'なし'}\n${dailyData ? `\n今日の摂取状況:\n- カロリー: ${dailyData.total_calories || 0}kcal\n- タンパク質: ${dailyData.total_protein || 0}g\n- 脂質: ${dailyData.total_fat || 0}g\n- 炭水化物: ${dailyData.total_carbs || 0}g` : ''}`;

    // Gemini APIを呼び出し
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
          ]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini APIエラー詳細:', errorText);
      throw new Error('Gemini API呼び出しに失敗しました');
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('Gemini APIからの応答が不正です');
    }

    // JSONレスポンスを抽出
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let adviceData;
    if (!jsonMatch) {
      // JSONが見つからない場合はテキスト全体を返す
      adviceData = { meal_advice: content, exercise_advice: '' };
    } else {
      adviceData = JSON.parse(jsonMatch[0]);
    }
    return NextResponse.json(adviceData);

  } catch (error) {
    console.error('AIアドバイスエラー:', error);
    console.error('GROK_API_KEY存在:', !!process.env.GROK_API_KEY);
    return NextResponse.json(
      { error: 'AIアドバイスの取得に失敗しました' },
      { status: 500 }
    );
  }
} 