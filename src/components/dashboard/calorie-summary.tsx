"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface Meal {
  id: string;
  user_id: string;
  food_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  is_corrected_by_user: boolean;
  created_at: string;
}

interface CalorieSummaryData {
  actualCalories: number;
  proteinRatio: number;
  fatRatio: number;
  carbsRatio: number;
}

interface CalorieSummaryProps {
  idealCalories: number;
}

export function CalorieSummary({ idealCalories }: CalorieSummaryProps) {
  const [data, setData] = useState<Omit<CalorieSummaryData, 'idealCalories'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadCalorieData();
  }, [idealCalories]); // idealCaloriesが変更されたら再読み込み

  // フォーカス時に再読み込み
  useEffect(() => {
    window.addEventListener('focus', loadCalorieData);
    return () => {
      window.removeEventListener('focus', loadCalorieData);
    };
  }, []);

  // 食事記録イベントをリッスン
  useEffect(() => {
    const handleMealRecorded = () => {
      console.log('カロリーサマリー - 食事記録イベントを受信');
      // 少し遅延させてからデータを再読み込み（DB更新を待つ）
      setTimeout(() => {
        loadCalorieData();
      }, 500);
    };

    window.addEventListener('mealRecorded', handleMealRecorded);
    return () => {
      window.removeEventListener('mealRecorded', handleMealRecorded);
    };
  }, []);

  const loadCalorieData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 日付取得方法を統一（get-jst-date関数を使用せず、クライアント側でJSTを計算）
      const now = new Date();
      const jstOffset = 9 * 60; // JSTはUTC+9
      const jstDate = new Date(now.getTime() + jstOffset * 60000);
      const todayDate = jstDate.toISOString().split('T')[0];

      console.log('=== カロリーサマリー - データ読み込み開始 ===');
      console.log('今日の日付:', todayDate);
      console.log('ユーザーID:', user.id);

      const { data: dailySummary, error: dailySummaryError } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayDate)
        .single();

      if (dailySummaryError) {
        console.error('daily_summaries取得エラー:', dailySummaryError);
        console.error('エラー詳細:', {
          message: dailySummaryError.message,
          details: dailySummaryError.details,
          hint: dailySummaryError.hint
        });
      }

      console.log('カロリーサマリー - daily_summary:', dailySummary);

      // 今日のmealsテーブルも確認（日付範囲を広げて確認）
      const { data: todayMeals, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', todayDate + 'T00:00:00+09:00')
        .lte('created_at', todayDate + 'T23:59:59+09:00');

      if (mealsError) {
        console.error('meals取得エラー:', mealsError);
      }

      console.log('カロリーサマリー - 今日のmeals:', todayMeals);

      // もしdaily_summaryがnullでmealsがある場合、手動でdaily_summaryを作成
      if (!dailySummary && todayMeals && todayMeals.length > 0) {
        console.log('daily_summaryが存在しないため、手動で作成します');
        
        const typedTodayMeals = todayMeals as Meal[];
        const totalCalories = typedTodayMeals.reduce((sum: number, meal: Meal) => sum + meal.calories, 0);
        const totalProtein = typedTodayMeals.reduce((sum: number, meal: Meal) => sum + meal.protein, 0);
        const totalFat = typedTodayMeals.reduce((sum: number, meal: Meal) => sum + meal.fat, 0);
        const totalCarbs = typedTodayMeals.reduce((sum: number, meal: Meal) => sum + meal.carbs, 0);

        const { data: newDailySummary, error: insertError } = await supabase
          .from('daily_summaries')
          .insert({
            user_id: user.id,
            date: todayDate,
            total_calories: totalCalories,
            total_protein: totalProtein,
            total_fat: totalFat,
            total_carbs: totalCarbs
          })
          .select()
          .single();

        if (insertError) {
          console.error('daily_summary作成エラー:', insertError);
        } else {
          console.log('daily_summary作成成功:', newDailySummary);
          // 作成したデータを使用
          const actualCalories = newDailySummary.total_calories;
          const actualProtein = newDailySummary.total_protein;
          const actualFat = newDailySummary.total_fat;
          const actualCarbs = newDailySummary.total_carbs;

          // PFC比率を計算
          const totalCaloriesFromPFC = actualProtein * 4 + actualFat * 9 + actualCarbs * 4;
          const proteinRatio = totalCaloriesFromPFC > 0 ? (actualProtein * 4 / totalCaloriesFromPFC) * 100 : 0;
          const fatRatio = totalCaloriesFromPFC > 0 ? (actualFat * 9 / totalCaloriesFromPFC) * 100 : 0;
          const carbsRatio = totalCaloriesFromPFC > 0 ? (actualCarbs * 4 / totalCaloriesFromPFC) * 100 : 0;

          setData({
            actualCalories,
            proteinRatio: Math.round(proteinRatio),
            fatRatio: Math.round(fatRatio),
            carbsRatio: Math.round(carbsRatio),
          });
          return;
        }
      }

      const actualCalories = dailySummary?.total_calories ?? 0;
      const actualProtein = dailySummary?.total_protein ?? 0;
      const actualFat = dailySummary?.total_fat ?? 0;
      const actualCarbs = dailySummary?.total_carbs ?? 0;

      // PFC比率を計算
      const totalCaloriesFromPFC = actualProtein * 4 + actualFat * 9 + actualCarbs * 4;
      const proteinRatio = totalCaloriesFromPFC > 0 ? (actualProtein * 4 / totalCaloriesFromPFC) * 100 : 0;
      const fatRatio = totalCaloriesFromPFC > 0 ? (actualFat * 9 / totalCaloriesFromPFC) * 100 : 0;
      const carbsRatio = totalCaloriesFromPFC > 0 ? (actualCarbs * 4 / totalCaloriesFromPFC) * 100 : 0;

      setData({
        actualCalories,
        proteinRatio: Math.round(proteinRatio),
        fatRatio: Math.round(fatRatio),
        carbsRatio: Math.round(carbsRatio),
      });
    } catch (error) {
      console.error('カロリーデータ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle  className="text-base font-semibold">カロリーサマリー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <p className="text-sm">データを読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle  className="text-base font-semibold">カロリーサマリー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <p className="text-gray-500 text-sm">データがありません</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const calorieProgress = idealCalories > 0 ? (data.actualCalories / idealCalories) * 100 : 0;
  const progressColor = calorieProgress > 100 ? 'bg-red-500' : 'bg-green-500';

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
            <p className="text-2xl font-bold text-blue-600">{data.actualCalories}</p>
            <p className="text-xs text-gray-500">kcal</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">理想カロリー</p>
            <p className="text-2xl font-bold text-green-600">{idealCalories}</p>
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
              <p className="font-semibold text-purple-600">{data.proteinRatio}%</p>
            </div>
            <div className="p-2 bg-yellow-50 rounded">
              <p className="text-xs text-gray-600">F</p>
              <p className="font-semibold text-yellow-600">{data.fatRatio}%</p>
            </div>
            <div className="p-2 bg-blue-50 rounded">
              <p className="text-xs text-gray-600">C</p>
              <p className="font-semibold text-blue-600">{data.carbsRatio}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 