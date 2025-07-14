"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CalorieSummaryProps {
  idealCalories: number;
  consumedCalories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export function CalorieSummary({ idealCalories, consumedCalories, protein, fat, carbs }: CalorieSummaryProps) {
  const calorieProgress = idealCalories > 0 ? (consumedCalories / idealCalories) * 100 : 0;
  const progressColor = calorieProgress > 100 ? 'bg-red-500' : 'bg-green-500';
  
  const totalCaloriesFromPFC = protein * 4 + fat * 9 + carbs * 4;
  const proteinRatio = totalCaloriesFromPFC > 0 ? (protein * 4 / totalCaloriesFromPFC) * 100 : 0;
  const fatRatio = totalCaloriesFromPFC > 0 ? (fat * 9 / totalCaloriesFromPFC) * 100 : 0;
  const carbsRatio = totalCaloriesFromPFC > 0 ? (carbs * 4 / totalCaloriesFromPFC) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">カロリーサマリー</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* カロリー比較 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">今日の摂取</p>
            <p className="text-2xl font-bold text-blue-600">{Math.round(consumedCalories)}</p>
            <p className="text-xs text-gray-500">kcal</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">理想カロリー</p>
            <p className="text-2xl font-bold text-green-600">{Math.round(idealCalories)}</p>
            <p className="text-xs text-gray-400">kcal</p>
          </div>
        </div>

        {/* 進捗バー */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>進捗</span>
            <span>{Math.round(calorieProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${progressColor} transition-all duration-300`}
              style={{ width: `${Math.min(calorieProgress, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* PFC比率 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">PFC比率</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-purple-50 rounded">
              <p className="text-xs text-gray-600">P</p>
              <p className="font-semibold text-purple-600">{Math.round(proteinRatio)}%</p>
            </div>
            <div className="p-2 bg-yellow-50 rounded">
              <p className="text-xs text-gray-600">F</p>
              <p className="font-semibold text-yellow-600">{Math.round(fatRatio)}%</p>
            </div>
            <div className="p-2 bg-blue-50 rounded">
              <p className="text-xs text-gray-600">C</p>
              <p className="font-semibold text-blue-600">{Math.round(carbsRatio)}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 