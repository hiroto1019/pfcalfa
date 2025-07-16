import { NextRequest, NextResponse } from 'next/server';

// 画像をリサイズする関数
async function resizeImage(file: File, maxWidth: number = 1024, maxHeight: number = 1024): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // アスペクト比を保ちながらリサイズ
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        } else {
          reject(new Error('画像のリサイズに失敗しました'));
        }
      }, file.type, 0.8); // 品質を80%に設定
    };
    
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    img.src = URL.createObjectURL(file);
  });
}

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

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { error: '画像ファイルが大きすぎます。10MB以下のファイルを選択してください。' },
        { status: 400 }
      );
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'サポートされていないファイル形式です。JPEG、PNG、WebP形式の画像を選択してください。' },
        { status: 400 }
      );
    }

    // 画像をBase64エンコード
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    // Grok APIに送信するプロンプト
    const prompt = `この画像に写っている食事の、食品名、総カロリー、PFCグラム数をJSON形式で返してください。
    形式: {"food_name": "食品名", "calories": カロリー数, "protein": タンパク質(g), "fat": 脂質(g), "carbs": 炭水化物(g)}`;

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

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: '画像解析がタイムアウトしました。画像サイズを小さくするか、再度お試しください。' },
          { status: 408 }
        );
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('画像解析エラー:', error);
    return NextResponse.json(
      { error: '画像解析に失敗しました。画像を確認して再度お試しください。' },
      { status: 500 }
    );
  }
} 