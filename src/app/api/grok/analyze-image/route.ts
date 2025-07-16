import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('画像解析API開始');
    
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      console.log('画像ファイルが見つかりません');
      return NextResponse.json(
        { error: '画像ファイルが必要です' },
        { status: 400 }
      );
    }

    console.log('画像ファイル情報:', {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type
    });

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      console.log('ファイルサイズ超過:', imageFile.size);
      return NextResponse.json(
        { error: '画像ファイルが大きすぎます。10MB以下のファイルを選択してください。' },
        { status: 400 }
      );
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      console.log('サポートされていないファイル形式:', imageFile.type);
      return NextResponse.json(
        { error: 'サポートされていないファイル形式です。JPEG、PNG、WebP形式の画像を選択してください。' },
        { status: 400 }
      );
    }

    console.log('Base64エンコード開始');
    // 画像をBase64エンコード
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    console.log('Base64エンコード完了, サイズ:', base64Image.length);

    // Grok APIに送信するプロンプト
    const prompt = `この画像に写っている食事を分析して、以下のJSON形式で返してください。必ずJSONのみを返し、他の説明は含めないでください。

{
  "food_name": "食品名",
  "calories": カロリー数,
  "protein": タンパク質のグラム数,
  "fat": 脂質のグラム数,
  "carbs": 炭水化物のグラム数
}

画像に食事が写っていない場合は、以下のJSONを返してください：
{
  "food_name": "食事が写っていません",
  "calories": 0,
  "protein": 0,
  "fat": 0,
  "carbs": 0
}`;

    console.log('Gemini API呼び出し開始');
    console.log('GEMINI_API_KEY設定確認:', process.env.GEMINI_API_KEY ? '設定済み' : '未設定');
    
    // Gemini APIを呼び出し（タイムアウト設定付き）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

    try {
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
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);
      console.log('Gemini API応答ステータス:', geminiResponse.status);

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini APIエラー詳細:', errorText);
        
        // エラーの詳細をログに出力
        if (geminiResponse.status === 400) {
          return NextResponse.json(
            { error: '画像の解析に失敗しました。画像が鮮明でないか、食事が写っていない可能性があります。' },
            { status: 400 }
          );
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

      // JSONレスポンスを抽出
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('JSONレスポンスが見つかりません。内容:', content);
        
        // フォールバック: 手動でJSONを構築
        const fallbackResponse = {
          food_name: "解析できませんでした",
          calories: 0,
          protein: 0,
          fat: 0,
          carbs: 0
        };
        
        // 内容から食品名を推測
        if (content.includes('食べ物') || content.includes('食事') || content.includes('料理')) {
          fallbackResponse.food_name = "食事（詳細不明）";
        } else if (content.includes('飲み物') || content.includes('ドリンク')) {
          fallbackResponse.food_name = "飲み物";
        } else {
          fallbackResponse.food_name = "食品（詳細不明）";
        }
        
        console.log('フォールバックレスポンスを使用:', fallbackResponse);
        return NextResponse.json(fallbackResponse);
      }

      try {
        const nutritionData = JSON.parse(jsonMatch[0]);
        console.log('解析結果:', nutritionData);
        
        // 必須フィールドの検証
        const requiredFields = ['food_name', 'calories', 'protein', 'fat', 'carbs'];
        const missingFields = requiredFields.filter(field => !(field in nutritionData));
        
        if (missingFields.length > 0) {
          console.log('必須フィールドが不足:', missingFields);
          // 不足しているフィールドにデフォルト値を設定
          missingFields.forEach(field => {
            nutritionData[field] = field === 'food_name' ? '食品（詳細不明）' : 0;
          });
        }
        
        return NextResponse.json(nutritionData);
      } catch (parseError) {
        console.log('JSONパースエラー:', parseError);
        console.log('パースしようとしたJSON:', jsonMatch[0]);
        
        // パースエラーの場合もフォールバック
        const fallbackResponse = {
          food_name: "解析できませんでした",
          calories: 0,
          protein: 0,
          fat: 0,
          carbs: 0
        };
        
        return NextResponse.json(fallbackResponse);
      }

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error('Gemini API呼び出しエラー:', fetchError);
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: '画像解析がタイムアウトしました。画像サイズを小さくするか、再度お試しください。' },
          { status: 408 }
        );
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('画像解析エラー詳細:', error);
    return NextResponse.json(
      { error: '画像解析に失敗しました。画像を確認して再度お試しください。' },
      { status: 500 }
    );
  }
} 