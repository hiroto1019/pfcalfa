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
export function getIdealCalories(profile: any, currentWeight: number | null): number {
  if (!profile || !currentWeight || !profile.birth_date || !profile.height_cm || !profile.activity_level || !profile.goal_type) {
    return 2000; // 必要な情報がなければデフォルト値
  }

  const bmr = calculateBMR(profile, currentWeight);
  const tdee = calculateTDEE(bmr, profile.activity_level);

  if (profile.goal_type === 'lose_weight') {
    return Math.round(tdee - 500);
  } else if (profile.goal_type === 'gain_muscle') {
    return Math.round(tdee + 500);
  } else { // maintain
    return Math.round(tdee);
  }
}
