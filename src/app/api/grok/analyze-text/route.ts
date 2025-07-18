import { NextRequest, NextResponse } from 'next/server';

// 栄養データの検証と補正関数（最適化版）
async function validateAndCorrectNutritionData(data: any, originalText: string) {
  const corrected = { ...data };
  
  // 数値フィールドの検証と補正（一括処理）
  const numericFields = ['calories', 'protein', 'fat', 'carbs'];
  numericFields.forEach(field => {
    const value = corrected[field];
    corrected[field] = (typeof value === 'number' && !isNaN(value) && value >= 0) ? value : 0;
  });
  
  // 食品名の検証
  if (!corrected.food_name || typeof corrected.food_name !== 'string') {
    corrected.food_name = originalText || '食品（詳細不明）';
  }
  
  // カロリーが0の場合、食品データベースから検索
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
      }
    } catch (error) {
      console.log('食品データベースの読み込みに失敗:', error);
    }
  }
  
  // カロリーが0だが他の栄養素がある場合の補正
  if (corrected.calories === 0 && (corrected.protein > 0 || corrected.fat > 0 || corrected.carbs > 0)) {
    corrected.calories = corrected.protein * 4 + corrected.fat * 9 + corrected.carbs * 4;
  }
  
  return corrected;
}

// 簡易キャッシュ（メモリ内）
const textCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5分

// キャッシュクリーンアップ関数
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of textCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      textCache.delete(key);
    }
  }
}

// 定期的にキャッシュをクリーンアップ（5分ごと）
setInterval(cleanupCache, 5 * 60 * 1000);

// 高速なフォールバックレスポンス生成
function createFallbackResponse(text: string) {
  return {
    food_name: text,
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0
  };
}

// Gemini API呼び出し関数（超高速化版 - 10秒以内対応）
async function callGeminiAPI(text: string, retryCount = 0): Promise<any> {
  const maxRetries = 1; // 2回から1回にさらに削減
  const baseDelay = 200; // 0.5秒から0.2秒に削減

  // キャッシュチェック（最適化版）
  const cacheKey = text.toLowerCase().trim().substring(0, 100); // キャッシュキーを短縮
  const cached = textCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('キャッシュから結果を取得');
    return cached.data;
  }

  const prompt = `食品: ${text}

栄養成分をJSON形式で返してください:
{"food_name": "食品名", "calories": 数値, "protein": 数値, "fat": 数値, "carbs": 数値}`;

  try {
    console.log(`Gemini API呼び出し開始 (試行 ${retryCount + 1}/${maxRetries + 1})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 12秒から6秒に短縮（10秒以内対応）

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
            temperature: 0.1, // 精度を保つため適度な設定
            maxOutputTokens: 120, // 詳細な解析のため
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
        return callGeminiAPI(text, retryCount + 1);
      }
      
      // その他のエラーまたは最大リトライ回数に達した場合
      if (geminiResponse.status === 400) {
        throw new Error('テキストの解析に失敗しました。食品名を確認してください。');
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
      const fallbackResponse = createFallbackResponse(text);
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
          nutritionData[field] = field === 'food_name' ? text : 0;
        });
      }
      
      // 解析結果の妥当性チェックと補正
      const correctedData = await validateAndCorrectNutritionData(nutritionData, text);
      console.log('補正後の解析結果:', correctedData);
      
      // キャッシュに保存
      textCache.set(cacheKey, {
        data: correctedData,
        timestamp: Date.now()
      });
      
      return correctedData;
    } catch (parseError) {
      console.log('JSONパースエラー:', parseError);
      console.log('パースしようとしたJSON:', jsonMatch[0]);
      
      // パースエラーの場合もフォールバック
      const fallbackResponse = createFallbackResponse(text);
      return fallbackResponse;
    }

  } catch (fetchError: any) {
    console.error('Gemini API呼び出しエラー:', fetchError);
    
    if (fetchError.name === 'AbortError') {
      throw new Error('テキスト解析がタイムアウトしました。再度お試しください。');
    }
    
    // 503エラーでリトライ回数が残っている場合は再帰呼び出し
    if (fetchError.message.includes('503') && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount);
      console.log(`${delay}ms後にリトライします... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGeminiAPI(text, retryCount + 1);
    }
    
    throw fetchError;
  }
}

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
    console.log('GEMINI_API_KEY設定確認:', process.env.GEMINI_API_KEY ? '設定済み' : '未設定');
    
    try {
      // Gemini APIを呼び出し（超高速化版 - 10秒以内対応）
      const result = await callGeminiAPI(text);
      return NextResponse.json(result);
    } catch (apiError: any) {
      console.error('Gemini API最終エラー:', apiError);
      
      // 503エラーの場合は特別なメッセージを返す
      if (apiError.message.includes('503')) {
        return NextResponse.json(
          { 
            error: 'Gemini APIが一時的に過負荷状態です。手入力で登録するか、数分後に再度お試しください。',
            errorType: 'overload',
            fallback: {
              food_name: text,
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
            error: 'テキスト解析がタイムアウトしました。手入力で登録するか、再度お試しください。',
            errorType: 'timeout',
            fallback: {
        food_name: text, 
        calories: 0, 
        protein: 0, 
        fat: 0, 
        carbs: 0 
            }
          },
          { status: 408 }
        );
      }
      
      // 400エラーの場合（不正な入力）
      if (apiError.message.includes('400') || apiError.message.includes('食品名を確認')) {
        return NextResponse.json(
          { 
            error: '入力されたテキストを解析できませんでした。食品名を確認してください。',
            errorType: 'invalid_input',
            fallback: {
          food_name: text, 
          calories: 0, 
          protein: 0, 
          fat: 0, 
          carbs: 0 
            }
          },
          { status: 400 }
        );
      }
      
      // その他のエラー
      return NextResponse.json(
        { 
          error: apiError.message,
          errorType: 'unknown',
          fallback: {
            food_name: text,
            calories: 0,
            protein: 0,
            fat: 0,
            carbs: 0
          }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('テキスト解析エラー:', error);
    return NextResponse.json(
      { 
        error: 'テキスト解析に失敗しました。再度お試しください。',
        errorType: 'system_error',
        fallback: {
          food_name: "手入力で登録してください",
          calories: 0,
          protein: 0,
          fat: 0,
          carbs: 0
        }
      },
      { status: 500 }
    );
  }
} 