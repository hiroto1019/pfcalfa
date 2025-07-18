import { NextRequest, NextResponse } from 'next/server';

// 栄養データの検証と補正関数（最適化版）
function validateAndCorrectNutritionData(data: any) {
  const corrected = { ...data };
  
  // 数値フィールドの検証と補正（一括処理）
  const numericFields = ['calories', 'protein', 'fat', 'carbs'];
  numericFields.forEach(field => {
    const value = corrected[field];
    corrected[field] = (typeof value === 'number' && !isNaN(value) && value >= 0) ? value : 0;
  });
  
  // 食品名の検証
  if (!corrected.food_name || typeof corrected.food_name !== 'string') {
    corrected.food_name = '食品（詳細不明）';
  }
  
  // 飲料の場合は最低限のカロリーを設定（最適化版）
  const drinkKeywords = ['ジュース', 'コーヒー', 'お茶', '牛乳', '水', 'お酒', 'ビール', 'ワイン', 'コーラ', 'ソーダ'];
  const isDrink = drinkKeywords.some(keyword => corrected.food_name.includes(keyword));
  
  if (isDrink && corrected.calories === 0) {
    const drinkCalories = {
      'ジュース': { calories: 100, carbs: 25 },
      'コーヒー': { calories: 5, carbs: 1 },
      '牛乳': { calories: 120, protein: 8, fat: 5, carbs: 12 },
      'お酒': { calories: 150, carbs: 10 },
      'ビール': { calories: 150, carbs: 10 }
    };
    
    for (const [keyword, values] of Object.entries(drinkCalories)) {
      if (corrected.food_name.includes(keyword)) {
        Object.assign(corrected, values);
        break;
      }
    }
  }
  
  // カロリーが0だが他の栄養素がある場合の補正
  if (corrected.calories === 0 && (corrected.protein > 0 || corrected.fat > 0 || corrected.carbs > 0)) {
    corrected.calories = corrected.protein * 4 + corrected.fat * 9 + corrected.carbs * 4;
  }
  
  return corrected;
}

// 画像前処理関数（サイズ最適化）
function optimizeImageSize(base64Image: string): string {
  // 画像サイズが大きすぎる場合は圧縮を検討
  const sizeInBytes = Math.ceil((base64Image.length * 3) / 4);
  if (sizeInBytes > 1 * 1024 * 1024) { // 1MB以上の場合
    console.log('画像サイズが大きいため、圧縮を推奨します');
  }
  return base64Image;
}

// 簡易キャッシュ（メモリ内）
const imageCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5分

// キャッシュクリーンアップ関数
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of imageCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      imageCache.delete(key);
    }
  }
}

// 定期的にキャッシュをクリーンアップ（5分ごと）
setInterval(cleanupCache, 5 * 60 * 1000);

// 高速なフォールバックレスポンス生成
function createFallbackResponse(content: string) {
  const fallbackResponse = {
    food_name: "解析できませんでした",
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0
  };
  
  // 内容から食品名を推測（最適化版）
  if (content.includes('食べ物') || content.includes('食事') || content.includes('料理')) {
    fallbackResponse.food_name = "食事（詳細不明）";
  } else if (content.includes('飲み物') || content.includes('ドリンク')) {
    fallbackResponse.food_name = "飲み物";
  } else {
    fallbackResponse.food_name = "食品（詳細不明）";
  }
  
  return fallbackResponse;
}

// Gemini API呼び出し関数（超高速化版 - 10秒以内対応）
async function callGeminiAPI(base64Image: string, imageType: string, retryCount = 0): Promise<any> {
  const maxRetries = 1; // 2回から1回にさらに削減
  const baseDelay = 200; // 0.5秒から0.2秒に削減

  // キャッシュチェック（最適化版）
  const cacheKey = `${base64Image.substring(0, 50)}_${imageType}`; // キャッシュキーを短縮
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('キャッシュから結果を取得');
    return cached.data;
  }

  // 画像前処理
  const optimizedImage = optimizeImageSize(base64Image);

  const prompt = `画像の食品を分析し、栄養成分をJSON形式で返してください。

【返答形式】
{
  "food_name": "食品名",
  "calories": 数値,
  "protein": 数値,
  "fat": 数値,
  "carbs": 数値
}

食品が写っていない場合は全て0を返してください。`;

  try {
    console.log(`Gemini API呼び出し開始 (試行 ${retryCount + 1}/${maxRetries + 1})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 15秒から8秒に短縮（10秒以内対応）

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
                { text: prompt },
                {
                  inlineData: {
                    mimeType: imageType,
                    data: optimizedImage
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1, // 精度を保つため少し上げる
            maxOutputTokens: 150, // 精度を保つため少し増やす
            topP: 0.8,
            topK: 20,
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

    // JSONレスポンスを抽出（最適化版）
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('JSONレスポンスが見つかりません。内容:', content);
      const fallbackResponse = createFallbackResponse(content);
      console.log('フォールバックレスポンスを使用:', fallbackResponse);
      return fallbackResponse;
    }

    try {
      const nutritionData = JSON.parse(jsonMatch[0]);
      console.log('解析結果:', nutritionData);
      
      // 必須フィールドの検証（最適化版）
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
      
      // キャッシュに保存
      imageCache.set(cacheKey, {
        data: correctedData,
        timestamp: Date.now()
      });
      
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
      console.log(`${delay}ms後にリトライします... (${retryCount + 1}/${maxRetries})`);
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

    // ファイルサイズチェック（2MB制限にさらに短縮）
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (imageFile.size > maxSize) {
      console.log('ファイルサイズ超過:', imageFile.size);
      return NextResponse.json(
        { error: '画像ファイルが大きすぎます。2MB以下のファイルを選択してください。' },
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
      // Gemini APIを呼び出し（超高速化版 - 10秒以内対応）
      const result = await callGeminiAPI(base64Image, imageFile.type);
      return NextResponse.json(result);
    } catch (apiError: any) {
      console.error('Gemini API最終エラー:', apiError);
      
      // 503エラーの場合は特別なメッセージを返す
      if (apiError.message.includes('503')) {
        return NextResponse.json(
          { 
            error: 'Gemini APIが一時的に過負荷状態です。手入力で登録するか、数分後に再度お試しください。',
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
      
      // タイムアウトエラーの場合
      if (apiError.message.includes('タイムアウト')) {
        return NextResponse.json(
          { 
            error: '画像解析がタイムアウトしました。手入力で登録するか、画像サイズを小さくして再度お試しください。',
            fallback: {
              food_name: "手入力で登録してください",
              calories: 0,
              protein: 0,
              fat: 0,
              carbs: 0
            }
          },
          { status: 408 }
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