import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// BMR (基礎代謝量) の計算 (ハリス・ベネディクト方程式)
function calculateBMR(profile: any) {
  const age = new Date().getFullYear() - new Date(profile.birth_date).getFullYear();
  if (profile.gender === 'male') {
    return 88.362 + (13.397 * profile.initial_weight_kg) + (4.799 * profile.height_cm) - (5.677 * age);
  } else {
    return 447.593 + (9.247 * profile.initial_weight_kg) + (3.098 * profile.height_cm) - (4.330 * age);
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
  if (!profile || !profile.birth_date || !profile.initial_weight_kg || !profile.height_cm) {
    return 2000; // デフォルト値
  }

  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(bmr, profile.activity_level);

  if (profile.goal_type === 'diet') {
    return Math.round(tdee - 500);
  } else if (profile.goal_type === 'bulk-up') {
    return Math.round(tdee + 500);
  } else {
    return Math.round(tdee);
  }
}
