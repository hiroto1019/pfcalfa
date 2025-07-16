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

    console.log('テキスト解析開始:', text);

    // Grok APIに送信するプロンプト
    const prompt = `以下の食事内容の栄養素を分析し、JSON形式で返してください。
    
    食事内容: ${text}
    
    形式: {"food_name": "食品名", "calories": カロリー数, "protein": タンパク質(g), "fat": 脂質(g), "carbs": 炭水化物(g)}
    
    食品名は入力された内容をそのまま使用し、栄養素は一般的な食品成分表に基づいて計算してください。
    
    必ずJSON形式で返してください。`;

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
      console.error('Gemini APIステータス:', geminiResponse.status);
      throw new Error(`Gemini API呼び出しに失敗しました: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini APIレスポンス:', geminiData);

    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error('Gemini APIからの応答が不正:', geminiData);
      throw new Error('Gemini APIからの応答が不正です');
    }

    console.log('Gemini APIコンテンツ:', content);

    // JSONレスポンスを抽出
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let nutritionData;
    
    if (!jsonMatch) {
      console.warn('JSONが見つかりません。テキスト全体を使用:', content);
      // JSONが見つからない場合は安全なデフォルト値を返す
      nutritionData = { 
        food_name: text, 
        calories: 0, 
        protein: 0, 
        fat: 0, 
        carbs: 0 
      };
    } else {
      try {
        nutritionData = JSON.parse(jsonMatch[0]);
        console.log('解析された栄養データ:', nutritionData);
      } catch (parseError) {
        console.error('JSONパースエラー:', parseError);
        nutritionData = { 
          food_name: text, 
          calories: 0, 
          protein: 0, 
          fat: 0, 
          carbs: 0 
        };
      }
    }

    return NextResponse.json(nutritionData);

  } catch (error) {
    console.error('テキスト解析エラー:', error);
    return NextResponse.json(
      { 
        error: 'テキスト解析に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 