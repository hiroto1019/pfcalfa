import { NextRequest, NextResponse } from 'next/server';

// 栄養データの検証と補正関数
function validateAndCorrectNutritionData(data: any) {
  const corrected = { ...data };
  
  // 数値フィールドの検証と補正
  const numericFields = ['calories', 'protein', 'fat', 'carbs'];
  numericFields.forEach(field => {
    if (typeof corrected[field] !== 'number' || isNaN(corrected[field])) {
      corrected[field] = 0;
    }
    // 負の値を0に修正
    if (corrected[field] < 0) {
      corrected[field] = 0;
    }
  });
  
  // 食品名の検証
  if (!corrected.food_name || typeof corrected.food_name !== 'string') {
    corrected.food_name = '食品（詳細不明）';
  }
  
  // 飲料の場合は最低限のカロリーを設定
  const drinkKeywords = ['ジュース', 'コーヒー', 'お茶', '牛乳', '水', 'お酒', 'ビール', 'ワイン', 'コーラ', 'ソーダ'];
  const isDrink = drinkKeywords.some(keyword => corrected.food_name.includes(keyword));
  
  if (isDrink && corrected.calories === 0) {
    // 飲料の一般的なカロリーを設定
    if (corrected.food_name.includes('ジュース')) {
      corrected.calories = 100;
      corrected.carbs = 25;
    } else if (corrected.food_name.includes('コーヒー')) {
      corrected.calories = 5;
      corrected.carbs = 1;
    } else if (corrected.food_name.includes('牛乳')) {
      corrected.calories = 120;
      corrected.protein = 8;
      corrected.fat = 5;
      corrected.carbs = 12;
    } else if (corrected.food_name.includes('お酒') || corrected.food_name.includes('ビール')) {
      corrected.calories = 150;
      corrected.carbs = 10;
    }
  }
  
  // カロリーが0だが他の栄養素がある場合の補正
  if (corrected.calories === 0 && (corrected.protein > 0 || corrected.fat > 0 || corrected.carbs > 0)) {
    corrected.calories = corrected.protein * 4 + corrected.fat * 9 + corrected.carbs * 4;
  }
  
  return corrected;
}

// Gemini API呼び出し関数（リトライ機能付き）
async function callGeminiAPI(base64Image: string, imageType: string, retryCount = 0): Promise<any> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1秒

  const prompt = `あなたは栄養士の専門家です。この画像に写っている食品・飲料を詳細に分析し、正確な栄養成分を推定してください。

【分析の指示】
1. 画像に写っている食品・飲料を特定してください
2. 量（グラム数、ml数）を推定してください
3. 標準的な栄養成分表に基づいて、以下の栄養素を計算してください：
   - カロリー（kcal）
   - タンパク質（g）
   - 脂質（g）
   - 炭水化物（g）

【重要な注意事項】
- ジュース、コーヒー、お茶などの飲料も必ずカロリーを計算してください
- 砂糖入り飲料は炭水化物として計算してください
- 牛乳はタンパク質、脂質、炭水化物すべてを含みます
- お酒はアルコール分もカロリーとして計算してください
- 調味料（ソース、ドレッシングなど）も含めて計算してください
- 量が不明な場合は、一般的な一人前の量を想定してください

【返答形式】
必ず以下のJSON形式のみで返してください。説明文は一切含めないでください：

{
  "food_name": "具体的な食品名（例：オレンジジュース 200ml）",
  "calories": 数値のみ（例：90）,
  "protein": 数値のみ（例：1.5）,
  "fat": 数値のみ（例：0.2）,
  "carbs": 数値のみ（例：20.5）
}

【食品が写っていない場合】
画像に食品・飲料が写っていない場合は以下を返してください：
{
  "food_name": "食事が写っていません",
  "calories": 0,
  "protein": 0,
  "fat": 0,
  "carbs": 0
}`;

  try {
    console.log(`Gemini API呼び出し開始 (試行 ${retryCount + 1}/${maxRetries + 1})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

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
                    mimeType: imageType,
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
      
      // 503エラー（過負荷）の場合はリトライ
      if (geminiResponse.status === 503 && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // 指数バックオフ
        console.log(`${delay}ms後にリトライします...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callGeminiAPI(base64Image, imageType, retryCount + 1);
      }
      
      // その他のエラーまたは最大リトライ回数に達した場合
      if (geminiResponse.status === 400) {
        throw new Error('画像の解析に失敗しました。画像が鮮明でないか、食事が写っていない可能性があります。');
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
      return fallbackResponse;
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
      
      // 解析結果の妥当性チェックと補正
      const correctedData = validateAndCorrectNutritionData(nutritionData);
      console.log('補正後の解析結果:', correctedData);
      
      return correctedData;
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
      
      return fallbackResponse;
    }

  } catch (fetchError: any) {
    console.error('Gemini API呼び出しエラー:', fetchError);
    
    if (fetchError.name === 'AbortError') {
      throw new Error('画像解析がタイムアウトしました。画像サイズを小さくするか、再度お試しください。');
    }
    
    // 503エラーでリトライ回数が残っている場合は再帰呼び出し
    if (fetchError.message.includes('503') && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount);
      console.log(`${delay}ms後にリトライします...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGeminiAPI(base64Image, imageType, retryCount + 1);
    }
    
    throw fetchError;
  }
}

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

    console.log('GEMINI_API_KEY設定確認:', process.env.GEMINI_API_KEY ? '設定済み' : '未設定');
    
    try {
      // Gemini APIを呼び出し（リトライ機能付き）
      const result = await callGeminiAPI(base64Image, imageFile.type);
      return NextResponse.json(result);
    } catch (apiError: any) {
      console.error('Gemini API最終エラー:', apiError);
      
      // 503エラーの場合は特別なメッセージを返す
      if (apiError.message.includes('503')) {
        return NextResponse.json(
          { 
            error: 'Gemini APIが一時的に過負荷状態です。しばらく時間をおいて再度お試しください。',
            fallback: {
              food_name: "手入力で登録してください",
              calories: 0,
              protein: 0,
              fat: 0,
              carbs: 0
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
    console.error('画像解析エラー詳細:', error);
    return NextResponse.json(
      { error: '画像解析に失敗しました。画像を確認して再度お試しください。' },
      { status: 500 }
    );
  }
} 