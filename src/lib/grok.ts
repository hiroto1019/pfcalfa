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

// 画像から栄養素を解析
export async function analyzeImageNutrition(imageFile: File): Promise<GrokNutritionResponse> {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await fetch('/api/grok/analyze-image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || `画像解析に失敗しました (${response.status})`;
    throw new Error(errorMessage);
  }

  return response.json();
}

// テキストから栄養素を解析
export async function analyzeTextNutrition(text: string): Promise<GrokNutritionResponse> {
  const response = await fetch('/api/grok/analyze-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || `テキスト解析に失敗しました (${response.status})`;
    throw new Error(errorMessage);
  }

  return response.json();
}

// AIアドバイスを取得
export async function getAiAdvice(userProfile: UserProfile, dailyData?: any): Promise<GrokAdviceResponse> {
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
    throw new Error('AIアドバイスの取得に失敗しました');
  }

  return response.json();
} 