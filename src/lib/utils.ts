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
export function getIdealCalories(profile: any): number {
  if (!profile || !profile.birth_date || !profile.initial_weight_kg || !profile.height_cm || !profile.current_weight_kg) {
    return 2000; // デフォルト値
  }

  const bmr = calculateBMR(profile, profile.current_weight_kg);
  const tdee = calculateTDEE(bmr, profile.activity_level);

  // 目標体重と目標日から1日の調整カロリーを計算
  if (profile.target_weight_kg && profile.goal_target_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時間をリセットして日付のみで比較
    const goalDate = new Date(profile.goal_target_date);
    
    const timeDiff = goalDate.getTime() - today.getTime();
    const daysToGoal = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysToGoal > 0) {
      const weightDiffKg = profile.current_weight_kg - profile.target_weight_kg;
      const totalCalorieDiff = weightDiffKg * 7700;
      const dailyCalorieAdjustment = totalCalorieDiff / daysToGoal;
      
      return Math.round(tdee - dailyCalorieAdjustment);
    }
  }

  // フォールバック: 従来の計算方法
  if (profile.goal_type === 'diet') {
    return Math.round(tdee - 500);
  } else if (profile.goal_type === 'bulk-up') {
    return Math.round(tdee + 500);
  } else {
    return Math.round(tdee);
  }
}
