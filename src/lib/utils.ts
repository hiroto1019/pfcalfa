import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// BMR (基礎代謝量) の計算 (ハリス・ベネディクト方程式)
function calculateBMR(profile: any, currentWeight: number) {
  const age = new Date().getFullYear() - new Date(profile.birth_date).getFullYear();
  if (profile.gender === 'male') {
    return 88.362 + (13.397 * currentWeight) + (4.799 * profile.height_cm) - (5.677 * age);
  } else {
    return 447.593 + (9.247 * currentWeight) + (3.098 * profile.height_cm) - (4.330 * age);
  }
}

// TDEE (総消費カロリー) の計算
function calculateTDEE(bmr: number, activityLevel: number) {
  const activityMultipliers: { [key: number]: number } = {
    1: 1.2,
    2: 1.375,
    3: 1.55,
    4: 1.725,
    5: 1.9
  };
  const multiplier = activityMultipliers[activityLevel];
  return bmr * (multiplier || 1.2);
}

// 理想のカロリーを計算する
export function getIdealCalories(
  profile: any, 
  currentWeight: number | null,
  activityLevel: number | null,
  goalWeight?: number | null,
  goalTargetDate?: string | null
): number {
  if (!profile || !currentWeight || !activityLevel || !profile.birth_date || !profile.height_cm || !profile.goal_type) {
    return 2000; // 必要な情報がなければデフォルト値
  }

  const bmr = calculateBMR(profile, currentWeight);
  const tdee = calculateTDEE(bmr, activityLevel);

  // 目標体重と目標日から1日のカロリー調整を計算
  if (profile.goal_type !== 'maintain' && goalWeight && goalTargetDate) {
    const targetDate = new Date(goalTargetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時間をリセットして日付のみで比較

    // 未来の日付でない場合はTDEEに基づく計算に戻る
    if (targetDate <= today) {
        if (profile.goal_type === 'lose_weight') {
            return Math.round(tdee - 500);
          } else if (profile.goal_type === 'gain_muscle') {
            return Math.round(tdee + 500);
          } else { // maintain
            return Math.round(tdee);
          }
    }

    const diffTime = Math.abs(targetDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 目標設定日が非常に近い場合（7日以内）は従来の計算ロジックを使用
    if (diffDays <= 7) {
      if (profile.goal_type === 'lose_weight') {
        return Math.round(tdee - 500);
      } else if (profile.goal_type === 'gain_muscle') {
        return Math.round(tdee + 500);
      } else { // maintain
        return Math.round(tdee);
      }
    }

    if (diffDays > 0) {
      const weightDiff = goalWeight - currentWeight;
      const totalCalorieDiff = weightDiff * 7200; // 脂肪1kg ≈ 7200 kcal
      const dailyCalorieAdjustment = totalCalorieDiff / diffDays;
      
      // カロリー調整を安全な範囲に制限
      const adjustedCalories = tdee + dailyCalorieAdjustment;
      
      // 最小カロリー制限（基礎代謝の80%以上）
      const minCalories = Math.round(bmr * 0.8);
      
      // 最大カロリー制限（TDEEの150%以下）
      const maxCalories = Math.round(tdee * 1.5);
      
      // 安全な範囲内に収める
      const safeCalories = Math.max(minCalories, Math.min(maxCalories, adjustedCalories));
      
      return Math.round(safeCalories);
    }
  }

  // 従来の計算ロジック
  if (profile.goal_type === 'lose_weight') {
    return Math.round(tdee - 500);
  } else if (profile.goal_type === 'gain_muscle') {
    return Math.round(tdee + 500);
  } else { // maintain
    return Math.round(tdee);
  }
}
