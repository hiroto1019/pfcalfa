import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// BMR (基礎代謝量) の計算 (ハリス・ベネディクト方程式)
function calculateBMR(profile: any, currentWeight: number) {
  const age = new Date().getFullYear() - new Date(profile.birth_date).getFullYear();
  // 最新の体重記録がない場合は初期体重を使う
  const weight = currentWeight > 0 ? currentWeight : profile.initial_weight_kg;
  if (profile.gender === 'male') {
    // 男性: 88.362 + (13.397 × 体重kg) + (4.799 × 身長cm) - (5.677 × 年齢)
    return 88.362 + (13.397 * weight) + (4.799 * profile.height_cm) - (5.677 * age);
  } else {
    // 女性: 447.593 + (9.247 × 体重kg) + (3.098 × 身長cm) - (4.330 × 年齢)
    return 447.593 + (9.247 * weight) + (3.098 * profile.height_cm) - (4.330 * age);
  }
}

// TDEE (総消費カロリー) の計算
function calculateTDEE(bmr: number, activityLevel: number) {
  const activityMultipliers: { [key: number]: number } = {
    1: 1.2,    // ほとんど運動しない
    2: 1.375,  // 週に1-3日の軽い運動
    3: 1.55,   // 週に3-5日の中程度の運動
    4: 1.725,  // 週に6-7日の激しい運動
    5: 1.9     // 非常に激しい運動や肉体労働
  };
  const multiplier = activityMultipliers[activityLevel] || 1.2;
  return bmr * multiplier;
}

// 理想のカロリーを計算する
export function getIdealCalories(profile: any, currentWeight: number): number {
  if (!profile || !profile.birth_date || !profile.height_cm || !profile.activity_level) {
    return 2000; // 必須情報がなければデフォルト値を返す
  }

  // 最新の体重記録がない場合は初期体重を使う
  const weight = currentWeight > 0 ? currentWeight : profile.initial_weight_kg;
  if (!weight) return 2000;

  const bmr = calculateBMR(profile, weight);
  const tdee = calculateTDEE(bmr, profile.activity_level);

  // 目標が設定されていない、または目標体重がない場合はTDEEを維持カロリーとする
  if (!profile.goal_type || !profile.target_weight_kg || !profile.goal_target_date || profile.goal_type === 'maintain') {
    return Math.round(tdee);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // 今日の日付の始まり
  const goalDate = new Date(profile.goal_target_date);
  
  // 目標日が過去または今日の場合は計算しない
  if (goalDate <= today) {
    return Math.round(tdee);
  }

  const daysToGoal = (goalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  if (daysToGoal <= 0) {
    return Math.round(tdee);
  }

  // 1kgの増減に必要なカロリーは約7200kcal
  const totalCalorieDiff = (weight - profile.target_weight_kg) * 7200;
  const dailyCalorieAdjustment = totalCalorieDiff / daysToGoal;
  
  const idealCalories = tdee - dailyCalorieAdjustment;

  return Math.round(idealCalories);
}
