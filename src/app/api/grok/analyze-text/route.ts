import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'テキストが必要です' },
        { status: 400 }
      );
    }

    // Grok APIに送信するプロンプト
    const prompt = `以下の食事内容の栄養素を分析し、JSON形式で返してください。
    
    食事内容: ${text}
    
    形式: {"food_name": "食品名", "calories": カロリー数, "protein": タンパク質(g), "fat": 脂質(g), "carbs": 炭水化物(g)}
    
    食品名は入力された内容をそのまま使用し、栄養素は一般的な食品成分表に基づいて計算してください。`;

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

    // プロンプトを強化
    // 必ずJSON形式で返すよう指示
    // JSONレスポンスを抽出
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let nutritionData;
    if (!jsonMatch) {
      // JSONが見つからない場合はテキスト全体を返す
      nutritionData = { food_name: content, calories: '', protein: '', fat: '', carbs: '' };
    } else {
      nutritionData = JSON.parse(jsonMatch[0]);
    }
    return NextResponse.json(nutritionData);

  } catch (error) {
    console.error('テキスト解析エラー:', error);
    return NextResponse.json(
      { error: 'テキスト解析に失敗しました' },
      { status: 500 }
    );
  }
} 