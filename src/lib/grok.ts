export interface GrokNutritionResponse {
  food_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface GrokAdviceResponse {
  meal_advice: string;
  exercise_advice: string;
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

// AIアドバイスを取得（改善版）
export async function getAiAdvice(userProfile: UserProfile, dailyData?: any): Promise<GrokAdviceResponse> {
  try {
    const response = await fetch('/api/grok/advice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        userProfile,
        dailyData 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = errorData.error || 'AIアドバイスの取得に失敗しました';
      
      if (response.status === 503) {
        errorMessage = 'AIアドバイスサービスが一時的に過負荷状態です。しばらく時間をおいて再度お試しください。';
      } else if (response.status === 408) {
        errorMessage = 'AIアドバイスの取得がタイムアウトしました。再度お試しください。';
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error: any) {
    console.error('AIアドバイスエラー詳細:', error);
    
    // ネットワークエラーの場合
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。');
    }
    
    // その他のエラー
    throw error;
  }
} 