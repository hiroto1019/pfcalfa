import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getIdealCalories(profile: any, currentWeight: number, todayActivityLevel: number): number {
  // 年齢計算
  const age = new Date().getFullYear() - new Date(profile.birth_date).getFullYear();
  let bmr = 0;
  if (profile.gender === 'male') {
    bmr = 88.362 + (13.397 * currentWeight) + (4.799 * profile.height_cm) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * currentWeight) + (3.098 * profile.height_cm) - (4.330 * age);
  }
  const activityMultipliers = [1.2, 1.375, 1.55, 1.725, 1.9];
  const tdee = bmr * activityMultipliers[todayActivityLevel - 1];
  let targetCalories = tdee;
  if (profile.goal_type === 'diet') {
    targetCalories = tdee - 500;
  } else if (profile.goal_type === 'bulk-up') {
    targetCalories = tdee + 300;
  }
  // PFC比率で分配し、合計値を返す（PFCグラフと完全一致）
  const targetProtein = (targetCalories * 0.25) / 4;
  const targetFat = (targetCalories * 0.25) / 9;
  const targetCarbs = (targetCalories * 0.5) / 4;
  const idealPKcal = targetProtein * 4;
  const idealFKcal = targetFat * 9;
  const idealCKcal = targetCarbs * 4;
  const idealSum = idealPKcal + idealFKcal + idealCKcal;
  if (idealSum === 0) return 0;
  // PFC比率で分配し、端数調整して合計値を返す
  const pRatio = idealPKcal / idealSum;
  const fRatio = idealFKcal / idealSum;
  const cRatio = idealCKcal / idealSum;
  const rawProtein = targetCalories * pRatio;
  const rawFat = targetCalories * fRatio;
  const roundedProtein = Math.round(rawProtein);
  const roundedFat = Math.round(rawFat);
  let roundedCarbs = Math.round(targetCalories - roundedProtein - roundedFat);
  if (roundedCarbs < 0) roundedCarbs = 0;
  if (roundedCarbs > targetCalories) roundedCarbs = targetCalories;
  return roundedProtein + roundedFat + roundedCarbs;
}
