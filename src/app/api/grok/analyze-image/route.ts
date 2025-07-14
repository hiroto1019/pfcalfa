import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: '画像ファイルが必要です' },
        { status: 400 }
      );
    }

    // 画像をBase64エンコード
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    // Grok APIに送信するプロンプト
    const prompt = `この画像に写っている食事の、食品名、総カロリー、PFCグラム数をJSON形式で返してください。
    形式: {"food_name": "食品名", "calories": カロリー数, "protein": タンパク質(g), "fat": 脂質(g), "carbs": 炭水化物(g)}
    
    画像データ: data:${imageFile.type};base64,${base64Image}`;

    // Gemini APIを呼び出し
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-001:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: imageFile.type,
                    data: base64Image
                  }
                }
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
    if (!jsonMatch) {
      throw new Error('JSONレスポンスが見つかりません');
    }

    const nutritionData = JSON.parse(jsonMatch[0]);

    return NextResponse.json(nutritionData);

  } catch (error) {
    console.error('画像解析エラー:', error);
    return NextResponse.json(
      { error: '画像解析に失敗しました' },
      { status: 500 }
    );
  }
} 