import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// 栄養データの検証と補正関数（改善版）
async function validateAndCorrectNutritionData(data: any) {
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
  
  // カロリーが0の場合、食品名から推定を試行（改善版）
  if (corrected.calories === 0) {
    try {
      const { findFoodByName } = await import('../../../../lib/food-database');
      const foodData = findFoodByName(corrected.food_name);
      if (foodData) {
        Object.assign(corrected, {
          calories: foodData.calories,
          protein: foodData.protein,
          fat: foodData.fat,
          carbs: foodData.carbs
        });
        console.log(`食品データベースから検索: ${foodData.name} -> ${foodData.calories}kcal`);
      } else {
        // 食品データベースにない場合、食品名から推定
        const lowerFoodName = corrected.food_name.toLowerCase();
        
        // 鶏ステーキの特別処理
        if (lowerFoodName.includes('鶏') && lowerFoodName.includes('ステーキ')) {
          Object.assign(corrected, {
            calories: 200,
            protein: 25,
            fat: 8,
            carbs: 0
          });
          console.log('鶏ステーキとして推定: 200kcal');
        }
        // みたらし団子の特別処理
        else if (lowerFoodName.includes('みたらし') && lowerFoodName.includes('団子')) {
          Object.assign(corrected, {
            calories: 150,
            protein: 3,
            fat: 1,
            carbs: 35
          });
          console.log('みたらし団子として推定: 150kcal');
        }
        // ソフトクリームの特別処理
        else if (lowerFoodName.includes('ソフト') && (lowerFoodName.includes('クリーム') || lowerFoodName.includes('アイス'))) {
          Object.assign(corrected, {
            calories: 250,
            protein: 4,
            fat: 12,
            carbs: 35
          });
          console.log('ソフトクリームとして推定: 250kcal');
        }
        // 一般的な食品の推定
        else if (lowerFoodName.includes('鶏') || lowerFoodName.includes('チキン')) {
          Object.assign(corrected, {
            calories: 165,
            protein: 25,
            fat: 3,
            carbs: 0
          });
          console.log('鶏肉として推定: 165kcal');
        }
        else if (lowerFoodName.includes('豚') || lowerFoodName.includes('ポーク')) {
          Object.assign(corrected, {
            calories: 200,
            protein: 20,
            fat: 12,
            carbs: 0
          });
          console.log('豚肉として推定: 200kcal');
        }
        else if (lowerFoodName.includes('牛') || lowerFoodName.includes('ビーフ')) {
          Object.assign(corrected, {
            calories: 250,
            protein: 25,
            fat: 15,
            carbs: 0
          });
          console.log('牛肉として推定: 250kcal');
        }
        else if (lowerFoodName.includes('ご飯') || lowerFoodName.includes('白米') || lowerFoodName.includes('米')) {
          Object.assign(corrected, {
            calories: 250,
            protein: 5,
            fat: 0,
            carbs: 55
          });
          console.log('ご飯として推定: 250kcal');
        }
        else if (lowerFoodName.includes('パン') || lowerFoodName.includes('ブレッド')) {
          Object.assign(corrected, {
            calories: 150,
            protein: 5,
            fat: 2,
            carbs: 28
          });
          console.log('パンとして推定: 150kcal');
        }
        else {
          // それでも見つからない場合、一般的な食事として推定
          corrected.calories = 200;
          corrected.protein = 10;
          corrected.fat = 5;
          corrected.carbs = 25;
          console.log('一般的な食事としてカロリーを推定: 200kcal');
        }
      }
    } catch (error) {
      console.log('食品データベースの読み込みに失敗:', error);
      // エラーの場合も一般的な食事として推定
      corrected.calories = 200;
    corrected.protein = 10;
    corrected.fat = 5;
    corrected.carbs = 25;
      console.log('エラー時の一般的な食事としてカロリーを推定: 200kcal');
    }
  }
  
  // カロリーが0だが他の栄養素がある場合の補正
  if (corrected.calories === 0 && (corrected.protein > 0 || corrected.fat > 0 || corrected.carbs > 0)) {
    corrected.calories = corrected.protein * 4 + corrected.fat * 9 + corrected.carbs * 4;
    console.log('栄養素からカロリーを計算:', corrected.calories);
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

// 画像リサイズ関数（最適化版）
async function resizeImage(imageBuffer: Buffer, maxWidth: number = 1024, maxHeight: number = 1024, quality: number = 80): Promise<Buffer> {
  const startTime = Date.now();
  
  try {
    console.log('画像リサイズ開始');
    
    // リサイズ処理のタイムアウト設定（3秒）
    const resizePromise = performResize(imageBuffer, maxWidth, maxHeight, quality);
    const timeoutPromise = new Promise<Buffer>((_, reject) => {
      setTimeout(() => reject(new Error('リサイズ処理がタイムアウトしました')), 3000);
    });
    
    const resizedBuffer = await Promise.race([resizePromise, timeoutPromise]);
    
    const endTime = Date.now();
    console.log(`リサイズ完了, 処理時間: ${endTime - startTime}ms, 新しいサイズ: ${resizedBuffer.length} bytes`);
    
    return resizedBuffer;
  } catch (error) {
    console.error('画像リサイズエラー:', error);
    // エラーの場合は元の画像を返す
    return imageBuffer;
  }
}

// 実際のリサイズ処理を行う関数
async function performResize(imageBuffer: Buffer, maxWidth: number, maxHeight: number, quality: number): Promise<Buffer> {
  // 元画像のメタデータを取得
  const metadata = await sharp(imageBuffer).metadata();
  console.log('元画像サイズ:', metadata.width, 'x', metadata.height, '形式:', metadata.format);

  // リサイズが必要かチェック
  if (metadata.width && metadata.height) {
    const needsResize = metadata.width > maxWidth || metadata.height > maxHeight;
    
    if (!needsResize) {
      console.log('リサイズ不要 - 既に適切なサイズです');
      return imageBuffer;
    }
    
    // アスペクト比を保ってリサイズ
    const resizedBuffer = await sharp(imageBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality })
      .toBuffer();
    
    return resizedBuffer;
  }
  
  return imageBuffer;
}

// キャッシュを無効化して最新の画像を常に解析
// const imageCache = new Map<string, any>();
// const CACHE_TTL = 5 * 60 * 1000; // 5分

// キャッシュクリーンアップ関数
// function cleanupCache() {
//   const now = Date.now();
//   for (const [key, value] of imageCache.entries()) {
//     if (now - value.timestamp > CACHE_TTL) {
//       imageCache.delete(key);
//     }
//   }
// }

// 定期的にキャッシュをクリーンアップ（5分ごと）
// setInterval(cleanupCache, 5 * 60 * 1000);

// 高速なフォールバックレスポンス生成（改善版）
function createFallbackResponse(content: string) {
  const fallbackResponse = {
    food_name: "食事（詳細不明）",
    calories: 200, // 一般的な食事の推定カロリー
    protein: 10,
    fat: 5,
    carbs: 25
  };
  
  // 内容から食品名とカロリーを推測（改善版）
  const lowerContent = content.toLowerCase();
  
  // 肉類
  if (lowerContent.includes('鶏') || lowerContent.includes('チキン')) {
    if (lowerContent.includes('ステーキ')) {
      fallbackResponse.food_name = "鶏ステーキ";
      fallbackResponse.calories = 200;
      fallbackResponse.protein = 25;
      fallbackResponse.fat = 8;
      fallbackResponse.carbs = 0;
    } else {
      fallbackResponse.food_name = "鶏肉";
      fallbackResponse.calories = 165;
      fallbackResponse.protein = 25;
      fallbackResponse.fat = 3;
      fallbackResponse.carbs = 0;
    }
  } else if (lowerContent.includes('豚') || lowerContent.includes('ポーク')) {
    fallbackResponse.food_name = "豚肉";
    fallbackResponse.calories = 200;
    fallbackResponse.protein = 20;
    fallbackResponse.fat = 12;
    fallbackResponse.carbs = 0;
  } else if (lowerContent.includes('牛') || lowerContent.includes('ビーフ')) {
    fallbackResponse.food_name = "牛肉";
    fallbackResponse.calories = 250;
    fallbackResponse.protein = 25;
    fallbackResponse.fat = 15;
    fallbackResponse.carbs = 0;
  }
  // 主食
  else if (lowerContent.includes('ご飯') || lowerContent.includes('白米') || lowerContent.includes('米')) {
    fallbackResponse.food_name = "ご飯";
    fallbackResponse.calories = 250;
    fallbackResponse.protein = 5;
    fallbackResponse.fat = 0;
    fallbackResponse.carbs = 55;
  } else if (lowerContent.includes('パン') || lowerContent.includes('ブレッド')) {
    fallbackResponse.food_name = "パン";
    fallbackResponse.calories = 150;
    fallbackResponse.protein = 5;
    fallbackResponse.fat = 2;
    fallbackResponse.carbs = 28;
  }
  // デザート
  else if (lowerContent.includes('団子') || lowerContent.includes('だんご')) {
    if (lowerContent.includes('みたらし')) {
      fallbackResponse.food_name = "みたらし団子";
      fallbackResponse.calories = 150;
      fallbackResponse.protein = 3;
      fallbackResponse.fat = 1;
      fallbackResponse.carbs = 35;
    } else {
      fallbackResponse.food_name = "団子";
      fallbackResponse.calories = 120;
      fallbackResponse.protein = 2;
      fallbackResponse.fat = 0;
      fallbackResponse.carbs = 28;
    }
  } else if (lowerContent.includes('アイス') || lowerContent.includes('アイスクリーム')) {
    if (lowerContent.includes('ソフト')) {
      fallbackResponse.food_name = "ソフトクリーム";
      fallbackResponse.calories = 250;
      fallbackResponse.protein = 4;
      fallbackResponse.fat = 12;
      fallbackResponse.carbs = 35;
    } else {
      fallbackResponse.food_name = "アイスクリーム";
      fallbackResponse.calories = 200;
      fallbackResponse.protein = 3;
      fallbackResponse.fat = 10;
    fallbackResponse.carbs = 25;
    }
  } else if (lowerContent.includes('ケーキ')) {
    fallbackResponse.food_name = "ケーキ";
    fallbackResponse.calories = 300;
    fallbackResponse.protein = 5;
    fallbackResponse.fat = 15;
    fallbackResponse.carbs = 40;
  }
  // 野菜・サラダ
  else if (lowerContent.includes('サラダ') || lowerContent.includes('野菜')) {
    fallbackResponse.food_name = "サラダ";
    fallbackResponse.calories = 80;
    fallbackResponse.protein = 3;
    fallbackResponse.fat = 2;
    fallbackResponse.carbs = 15;
  }
  // 飲み物
  else if (lowerContent.includes('飲み物') || lowerContent.includes('ドリンク') || lowerContent.includes('ジュース')) {
    fallbackResponse.food_name = "飲み物";
    fallbackResponse.calories = 100;
    fallbackResponse.protein = 0;
    fallbackResponse.fat = 0;
    fallbackResponse.carbs = 25;
  }
  // スープ
  else if (lowerContent.includes('スープ') || lowerContent.includes('汁')) {
    fallbackResponse.food_name = "スープ";
    fallbackResponse.calories = 150;
    fallbackResponse.protein = 8;
    fallbackResponse.fat = 5;
    fallbackResponse.carbs = 20;
  }
  // 食べ物・食事
  else if (lowerContent.includes('食べ物') || lowerContent.includes('食事') || lowerContent.includes('料理') || lowerContent.includes('食品')) {
    fallbackResponse.food_name = "食事（詳細不明）";
    fallbackResponse.calories = 250;
  }
  
  return fallbackResponse;
}

// Gemini API呼び出し関数（超高速化版 - 10秒以内対応）
async function callGeminiAPI(base64Image: string, imageType: string, retryCount = 0): Promise<any> {
  const maxRetries = 1; // 2回から1回にさらに削減
  const baseDelay = 200; // 0.5秒から0.2秒に削減

  // キャッシュを無効化して最新の画像を常に解析
  // const cacheKey = `${base64Image.substring(0, 50)}_${imageType}`; // キャッシュキーを短縮
  // const cached = imageCache.get(cacheKey);
  // if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
  //   console.log('キャッシュから結果を取得');
  //   return cached.data;
  // }

  // 画像前処理
  const optimizedImage = optimizeImageSize(base64Image);

  const prompt = `画像に写っている食品を詳細に分析し、栄養成分をJSON形式で返してください。

【重要】
- 画像に食品が写っている場合は、必ずカロリーを含む栄養成分を推定してください
- 一般的な食品のカロリーを参考にして、適切な数値を設定してください
- 食品が写っていない場合のみ、全て0を返してください
- 複数の食品が写っている場合は、主要な食品を1つ選んで分析してください

【返答形式】
{
  "food_name": "食品名（日本語）",
  "calories": 数値（1食分の推定カロリー）,
  "protein": 数値（グラム）,
  "fat": 数値（グラム）,
  "carbs": 数値（グラム）
}

【参考カロリー例】
- 白米1杯: 約250kcal
- パン1枚: 約150kcal
- 卵1個: 約80kcal
- 鶏胸肉100g: 約165kcal
- 鶏ステーキ100g: 約200kcal
- サラダ: 約50-100kcal
- スープ: 約100-200kcal
- デザート: 約200-400kcal
- みたらし団子: 約150kcal
- ソフトクリーム: 約200-300kcal
- アイスクリーム: 約200-300kcal

【食品認識のポイント】
- 調理方法（焼く、揚げる、蒸すなど）を考慮してカロリーを調整
- サイズや量を考慮して適切なカロリーを設定
- 一般的な食品の標準的なカロリーを参考にする

必ず食品が写っている場合は、0kcalにならないよう適切な数値を設定してください。`;

  try {
    console.log(`Gemini API呼び出し開始 (試行 ${retryCount + 1}/${maxRetries + 1})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 15秒から8秒に短縮（10秒以内対応）

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
            temperature: 0.1, // 精度を保つため適度な設定
            maxOutputTokens: 150, // 詳細な解析のため
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
        const correctedData = await validateAndCorrectNutritionData(nutritionData);
        console.log('補正後の解析結果:', correctedData);
        
      // キャッシュを無効化
      // imageCache.set(cacheKey, {
      //   data: correctedData,
      //   timestamp: Date.now()
      // });
      
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
  const apiStartTime = Date.now();
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

    // ファイルサイズチェック（リサイズ機能により10MBまで許可）
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

    console.log('画像リサイズ処理開始');
    // 画像をBufferに変換
    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    
    // 画像を自動リサイズ（最大1024x1024、品質80%）
    const resizedBuffer = await resizeImage(imageBuffer, 1024, 1024, 80);
    
    console.log('Base64エンコード開始');
    // リサイズされた画像をBase64エンコード
    const base64Image = resizedBuffer.toString('base64');
    console.log('Base64エンコード完了, サイズ:', base64Image.length);

    console.log('GEMINI_API_KEY設定確認:', process.env.GEMINI_API_KEY ? '設定済み' : '未設定');
    
    try {
      // Gemini APIを呼び出し（超高速化版 - 10秒以内対応）
      const result = await callGeminiAPI(base64Image, imageFile.type);
      
      const apiEndTime = Date.now();
      console.log(`画像解析API完了, 総処理時間: ${apiEndTime - apiStartTime}ms`);
      
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