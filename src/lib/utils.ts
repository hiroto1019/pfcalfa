import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getIdealCalories(
  profile: any, 
  goal: any,
  currentWeight: number, 
  todayActivityLevel: number
): number {
  // --- Start of Defensive Checks ---
  if (!profile || typeof currentWeight !== 'number' || typeof todayActivityLevel !== 'number') {
    return 0;
  }

  const birthDate = new Date(profile.birth_date);
  if (isNaN(birthDate.getTime()) || !profile.height_cm) {
    console.error("Invalid or missing profile data:", { birth_date: profile.birth_date, height: profile.height_cm });
    return 0; 
  }
  const age = new Date().getFullYear() - birthDate.getFullYear();
  
  const activityMultipliers = [1.2, 1.375, 1.55, 1.725, 1.9];
  if (todayActivityLevel < 1 || todayActivityLevel > activityMultipliers.length) {
      console.error("Invalid activity_level:", todayActivityLevel);
      todayActivityLevel = 1; // Fallback to sedentary
  }
  // --- End of Defensive Checks ---

  // 1. 体重維持カロリー（TDEE）を計算
  let bmr = 0;
  if (profile.gender === 'male') {
    bmr = 88.362 + (13.397 * currentWeight) + (4.799 * profile.height_cm) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * currentWeight) + (3.098 * profile.height_cm) - (4.330 * age);
  }
  
  if (isNaN(bmr)) {
      console.error("BMR is NaN. Inputs:", { currentWeight, height: profile.height_cm, age });
      return 0;
  }

  const tdee = bmr * activityMultipliers[todayActivityLevel - 1];

  // ★ カラム名修正: target_weight_kg, target_date
  if (!goal || !goal.target_date || typeof goal.target_weight_kg !== 'number') {
    return Math.round(tdee);
  }

  const goalDate = new Date(goal.target_date);
  if (isNaN(goalDate.getTime())) { 
    return Math.round(tdee);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const remainingDays = Math.max(1, (goalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const weightToChange = currentWeight - goal.target_weight_kg;
  const totalCalorieDifference = weightToChange * 7200;
  const dailyCalorieAdjustment = totalCalorieDifference / remainingDays;
  let targetCalories = tdee - dailyCalorieAdjustment;

  if (targetCalories < bmr) {
    targetCalories = bmr;
  }
  if (targetCalories > tdee + 1000) { 
    targetCalories = tdee + 1000;
  }
  
  if (isNaN(targetCalories)) {
      console.error("Final targetCalories is NaN. Defaulting to TDEE.");
      return Math.round(tdee);
  }

  return Math.round(targetCalories);
}
