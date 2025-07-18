export interface GrokNutritionResponse {
  food_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface GrokAdviceResponse {
  meal_summary: string;
  meal_detail: string;
  exercise_summary: string;
  exercise_detail: string;
}

export interface UserProfile {
  username: string;
  gender: string;
  birth_date: string;
  height_cm: number;
  initial_weight_kg: number;
  target_weight_kg: number;
  activity_level: number;
  goal_type: string;
  food_preferences?: {
    dislikes: string[];
    allergies: string[];
  };
}

// 画像から栄養素を解析（改善版）
export async function analyzeImageNutrition(imageFile: File): Promise<GrokNutritionResponse> {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  try {
  const response = await fetch('/api/grok/analyze-image', {
    method: 'POST',
    body: formData,
  });

    const data = await response.json();

  if (!response.ok) {
      // フォールバックデータがある場合は使用
      if (data.fallback) {
        console.log('フォールバックデータを使用:', data.fallback);
        return data.fallback;
      }
      
      // エラーメッセージを詳細に
      let errorMessage = data.error || `画像解析に失敗しました (${response.status})`;
      
      if (response.status === 503) {
        errorMessage = 'Gemini APIが一時的に過負荷状態です。手入力で登録するか、数分後に再度お試しください。';
      } else if (response.status === 408) {
        errorMessage = '画像解析がタイムアウトしました。手入力で登録するか、画像サイズを小さくして再度お試しください。';
      } else if (response.status === 400) {
        errorMessage = '画像ファイルが不正です。画像を確認して再度お試しください。';
      }
      
    throw new Error(errorMessage);
  }

    return data;
  } catch (error: any) {
    console.error('画像解析エラー詳細:', error);
    
    // ネットワークエラーの場合
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。');
    }
    
    // その他のエラー
    throw error;
  }
}

// テキストから栄養素を解析（改善版）
export async function analyzeTextNutrition(text: string): Promise<GrokNutritionResponse> {
  try {
  const response = await fetch('/api/grok/analyze-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

    const data = await response.json();

  if (!response.ok) {
      // フォールバックデータがある場合は使用
      if (data.fallback) {
        console.log('フォールバックデータを使用:', data.fallback);
        return data.fallback;
      }
      
      // エラーメッセージを詳細に
      let errorMessage = data.error || `テキスト解析に失敗しました (${response.status})`;
      
      if (response.status === 503) {
        errorMessage = 'Gemini APIが一時的に過負荷状態です。手入力で登録するか、数分後に再度お試しください。';
      } else if (response.status === 408) {
        errorMessage = 'テキスト解析がタイムアウトしました。手入力で登録するか、再度お試しください。';
      } else if (response.status === 400) {
        errorMessage = '入力されたテキストを解析できませんでした。食品名を確認してください。';
      }
      
    throw new Error(errorMessage);
  }

    return data;
  } catch (error: any) {
    console.error('テキスト解析エラー詳細:', error);
    
    // ネットワークエラーの場合
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。');
    }
    
    // その他のエラー
    throw error;
  }
}

// AIアドバイスを取得（高品質版）
export async function getAiAdvice(userProfile: UserProfile, dailyData?: any): Promise<GrokAdviceResponse> {
  try {
    // 8秒タイムアウトに延長（高品質なアドバイス生成のため）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('/api/grok/advice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        userProfile,
        dailyData 
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // フォールバックデータがある場合は使用
      if (errorData.fallback) {
        console.log('フォールバックデータを使用:', errorData.fallback);
        return errorData.fallback;
      }
      
      let errorMessage = errorData.error || 'AIアドバイスの取得に失敗しました';
      
      if (response.status === 503) {
        errorMessage = 'AIアドバイスサービスが一時的に過負荷状態です。フォールバックアドバイスを表示します。';
      } else if (response.status === 408) {
        errorMessage = 'AIアドバイスの取得がタイムアウトしました。再度お試しください。';
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // レスポンスデータの検証
    if (!data || typeof data !== 'object') {
      throw new Error('AIアドバイスの応答データが不正です');
    }
    
    // 必須フィールドの確認
    const requiredFields = ['meal_summary', 'meal_detail', 'exercise_summary', 'exercise_detail'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      console.warn('AIアドバイスに不足フィールドがあります:', missingFields);
      // 不足フィールドにデフォルト値を設定
      missingFields.forEach(field => {
        if (field === 'meal_summary') {
          data[field] = "今日も健康的な食事を心がけましょう。野菜とタンパク質を意識して。";
        } else if (field === 'meal_detail') {
          data[field] = "今日も健康的な食事を心がけましょう。野菜、タンパク質、炭水化物をバランスよく摂取。朝食はしっかりと、昼食は適度に、夕食は軽めに。間食は果物やナッツを選び、水分補給も忘れずに。";
        } else if (field === 'exercise_summary') {
          data[field] = "適度な運動を取り入れてください。ウォーキングから始めてみましょう。";
        } else if (field === 'exercise_detail') {
          data[field] = "適度な運動を取り入れてください。ウォーキング、ジョギング、サイクリングなどの有酸素運動を30分程度。筋トレも週2回取り入れて、全身の筋肉をバランスよく鍛えましょう。";
        }
      });
    }

    return data;
  } catch (error: any) {
    console.error('AIアドバイスエラー詳細:', error);
    
    // タイムアウトエラーの場合
    if (error.name === 'AbortError') {
      throw new Error('AIアドバイスの取得がタイムアウトしました。再度お試しください。');
    }
    
    // ネットワークエラーの場合
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。');
    }
    
    // その他のエラー
    throw error;
  }
} 