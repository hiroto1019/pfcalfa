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

interface Exercise {
  id: string;
  user_id: string;
  exercise_name: string;
  duration_minutes: number;
  calories_burned: number;
  exercise_type: string;
  notes: string;
  created_at: string;
}

interface CalorieSummaryData {
  actualCalories: number;
  exerciseCalories: number;
  netCalories: number;
  proteinRatio: number;
  fatRatio: number;
  carbsRatio: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
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

    const handleMealDeleted = () => {
      console.log('カロリーサマリー - 食事削除イベントを受信');
      setTimeout(() => {
        loadCalorieData();
      }, 500);
    };

    window.addEventListener('mealRecorded', handleMealRecorded);
    window.addEventListener('mealDeleted', handleMealDeleted);
    return () => {
      window.removeEventListener('mealRecorded', handleMealRecorded);
      window.removeEventListener('mealDeleted', handleMealDeleted);
    };
  }, []);

  // 運動記録イベントをリッスン
  useEffect(() => {
    const handleExerciseRecorded = () => {
      console.log('カロリーサマリー - 運動記録イベントを受信');
      // 少し遅延させてからデータを再読み込み（DB更新を待つ）
      setTimeout(() => {
        loadCalorieData();
      }, 500);
    };

    const handleExerciseDeleted = () => {
      console.log('カロリーサマリー - 運動削除イベントを受信');
      setTimeout(() => {
        loadCalorieData();
      }, 500);
    };

    window.addEventListener('exerciseRecorded', handleExerciseRecorded);
    window.addEventListener('exerciseDeleted', handleExerciseDeleted);
    return () => {
      window.removeEventListener('exerciseRecorded', handleExerciseRecorded);
      window.removeEventListener('exerciseDeleted', handleExerciseDeleted);
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

      // 食事データの取得
      const { data: dailySummary, error: dailySummaryError } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayDate)
        .single();

      if (dailySummaryError) {
        console.error('daily_summaries取得エラー:', dailySummaryError);
      }

      console.log('カロリーサマリー - daily_summary:', dailySummary);

      // 今日のmealsテーブルも確認
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

      // 運動データの取得
      const { data: todayExercises, error: exercisesError } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', todayDate + 'T00:00:00+09:00')
        .lte('created_at', todayDate + 'T23:59:59+09:00');

      if (exercisesError) {
        console.error('exercise_logs取得エラー:', exercisesError);
      }

      console.log('カロリーサマリー - 今日のexercises:', todayExercises);

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

          // 運動消費カロリーを計算
          const exerciseCalories = todayExercises ? 
            (todayExercises as Exercise[]).reduce((sum: number, exercise: Exercise) => sum + exercise.calories_burned, 0) : 0;

          // 純カロリー（摂取 - 運動消費）
          const netCalories = actualCalories - exerciseCalories;

          // PFC比率を計算
          const totalCaloriesFromPFC = actualProtein * 4 + actualFat * 9 + actualCarbs * 4;
          const proteinRatio = totalCaloriesFromPFC > 0 ? (actualProtein * 4 / totalCaloriesFromPFC) * 100 : 0;
          const fatRatio = totalCaloriesFromPFC > 0 ? (actualFat * 9 / totalCaloriesFromPFC) * 100 : 0;
          const carbsRatio = totalCaloriesFromPFC > 0 ? (actualCarbs * 4 / totalCaloriesFromPFC) * 100 : 0;

          setData({
            actualCalories,
            exerciseCalories,
            netCalories,
            proteinRatio: Math.round(proteinRatio),
            fatRatio: Math.round(fatRatio),
            carbsRatio: Math.round(carbsRatio),
            proteinGrams: actualProtein,
            fatGrams: actualFat,
            carbsGrams: actualCarbs,
          });
          return;
        }
      }

      const actualCalories = dailySummary?.total_calories ?? 0;
      const actualProtein = dailySummary?.total_protein ?? 0;
      const actualFat = dailySummary?.total_fat ?? 0;
      const actualCarbs = dailySummary?.total_carbs ?? 0;

      // 運動消費カロリーを計算
      const exerciseCalories = todayExercises ? 
        (todayExercises as Exercise[]).reduce((sum: number, exercise: Exercise) => sum + exercise.calories_burned, 0) : 0;

      // 純カロリー（摂取 - 運動消費）
      const netCalories = actualCalories - exerciseCalories;

      // PFC比率を計算
      const totalCaloriesFromPFC = actualProtein * 4 + actualFat * 9 + actualCarbs * 4;
      const proteinRatio = totalCaloriesFromPFC > 0 ? (actualProtein * 4 / totalCaloriesFromPFC) * 100 : 0;
      const fatRatio = totalCaloriesFromPFC > 0 ? (actualFat * 9 / totalCaloriesFromPFC) * 100 : 0;
      const carbsRatio = totalCaloriesFromPFC > 0 ? (actualCarbs * 4 / totalCaloriesFromPFC) * 100 : 0;

      setData({
        actualCalories,
        exerciseCalories,
        netCalories,
        proteinRatio: Math.round(proteinRatio),
        fatRatio: Math.round(fatRatio),
        carbsRatio: Math.round(carbsRatio),
        proteinGrams: actualProtein,
        fatGrams: actualFat,
        carbsGrams: actualCarbs,
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
          <CardTitle className="text-base font-semibold">カロリーサマリー</CardTitle>
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
          <CardTitle className="text-base font-semibold">カロリーサマリー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <p className="text-gray-500 text-sm">データがありません</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 進捗計算（理想カロリーを100%とする）
  const calculateProgress = () => {
    if (idealCalories <= 0) return 0;
    if (data.netCalories <= 0) return 0;
    
    const progress = (data.netCalories / idealCalories) * 100;
    return Math.round(progress);
  };

  const progress = calculateProgress();
  const progressColor = progress > 100 ? 'text-red-600' : progress >= 80 ? 'text-yellow-600' : 'text-green-600';
  const progressBgColor = progress > 100 ? 'bg-red-50' : progress >= 80 ? 'bg-yellow-50' : 'bg-green-50';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">カロリーサマリー</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* レスポンシブ対応: 横並び → 縦並び */}
        <div className="flex flex-col lg:flex-row gap-4 mt-2">
          {/* 左カラム: 今日の総カロリー */}
          <div className="flex-1">
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200 flex flex-col lg:h-full">
              <p className="text-sm text-gray-600">今日の総カロリー</p>
              <div className="flex items-center justify-center gap-1 mb-3">
                <p className="text-2xl font-bold text-orange-600">{data.netCalories}</p>
                <p className="text-sm text-gray-500">kcal</p>
              </div>
              
              {/* 今日の摂取 */}
              <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200 mb-2">
                <p className="text-xs text-gray-600">今日の摂取</p>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <p className="text-lg font-bold text-purple-600">{data.actualCalories}</p>
                  <p className="text-xs text-gray-500">kcal</p>
                </div>
                
                {/* PFC割合（背景色付きタグ形式） */}
                <div className="flex justify-center gap-1">
                  <div className="px-1 py-0.5 bg-blue-100 rounded text-[10px]">
                    <span className="text-blue-600">P:{data.proteinRatio}%</span>
                  </div>
                  <div className="px-1 py-0.5 bg-yellow-100 rounded text-[10px]">
                    <span className="text-yellow-600">F:{data.fatRatio}%</span>
                  </div>
                  <div className="px-1 py-0.5 bg-red-100 rounded text-[10px]">
                    <span className="text-red-600">C:{data.carbsRatio}%</span>
                  </div>
                </div>
              </div>

              {/* 今日の運動消費 */}
              <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200 lg:flex-1 lg:flex lg:flex-col lg:justify-center">
                <p className="text-xs text-gray-600">今日の運動消費</p>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-lg font-bold text-purple-600">{data.exerciseCalories}</p>
                  <p className="text-xs text-gray-500">kcal</p>
                </div>
              </div>
            </div>
          </div>

          {/* 右カラム: 理想カロリー */}
          <div className="flex-1">
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200 flex flex-col lg:h-full">
              <p className="text-sm text-gray-600">理想カロリー</p>
              <div className="flex items-center justify-center gap-1 mb-3">
                <p className="text-2xl font-bold text-green-600">{idealCalories}</p>
                <p className="text-sm text-gray-500">kcal</p>
              </div>
              
              {/* 理想PFC割合 */}
              <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200 mb-2">
                <p className="text-xs text-gray-600 mb-1">理想PFC割合</p>
                <div className="flex justify-center gap-1">
                  <div className="px-1 py-0.5 bg-blue-100 rounded text-[10px]">
                    <span className="text-blue-600">P:20%</span>
                  </div>
                  <div className="px-1 py-0.5 bg-yellow-100 rounded text-[10px]">
                    <span className="text-yellow-600">F:25%</span>
                  </div>
                  <div className="px-1 py-0.5 bg-red-100 rounded text-[10px]">
                    <span className="text-red-600">C:55%</span>
                  </div>
                </div>
              </div>

              {/* 進捗表示 */}
              <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-200 lg:flex-1 lg:flex lg:flex-col lg:justify-center">
                <p className="text-xs text-gray-600">進捗</p>
                <p className="text-lg font-bold text-red-600">{progress}%</p>
                <p className="text-[10px] text-gray-500">
                  {progress > 100 ? '目標超過' : progress >= 80 ? '目標近い' : '目標未達'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 