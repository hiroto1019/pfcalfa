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

      // 今日のmealsテーブルも確認（日付フィルタリングなしで全データを取得してからフィルタリング）
      const { data: allMeals, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (mealsError) {
        console.error('meals取得エラー:', mealsError);
      }

      // クライアント側で今日のデータをフィルタリング（修正版）
      const todayMeals = allMeals ? allMeals.filter((meal: Meal) => {
        const mealDate = new Date(meal.created_at);
        // JSTに変換してから日付を比較
        const jstDate = new Date(mealDate.getTime() + 9 * 60 * 60 * 1000);
        const mealDateStr = jstDate.toISOString().split('T')[0];
        console.log(`食事フィルタリング: ${meal.food_name} - ${meal.created_at} -> ${mealDateStr} vs ${todayDate}`);
        return mealDateStr === todayDate;
      }) : [];

      console.log('カロリーサマリー - 全meals:', allMeals);
      console.log('カロリーサマリー - 今日のmeals:', todayMeals);

      if (mealsError) {
        console.error('meals取得エラー:', mealsError);
      }

      console.log('カロリーサマリー - 今日の日付:', todayDate);
      if (todayMeals && todayMeals.length > 0) {
        console.log('カロリーサマリー - 各食事のcreated_at:', todayMeals.map((meal: Meal) => ({
          food_name: meal.food_name,
          created_at: meal.created_at,
          mealDate: new Date(meal.created_at).toISOString().split('T')[0],
          calories: meal.calories
        })));
      }

      // 運動データの取得（日付フィルタリングなしで全データを取得してからフィルタリング）
      const { data: allExercises, error: exercisesError } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (exercisesError) {
        console.error('exercise_logs取得エラー:', exercisesError);
      }

      // クライアント側で今日のデータをフィルタリング（修正版）
      const todayExercises = allExercises ? allExercises.filter((exercise: Exercise) => {
        const exerciseDate = new Date(exercise.created_at);
        // JSTに変換してから日付を比較
        const jstDate = new Date(exerciseDate.getTime() + 9 * 60 * 60 * 1000);
        const exerciseDateStr = jstDate.toISOString().split('T')[0];
        console.log(`運動フィルタリング: ${exercise.exercise_name} - ${exercise.created_at} -> ${exerciseDateStr} vs ${todayDate}`);
        return exerciseDateStr === todayDate;
      }) : [];

      console.log('カロリーサマリー - 全exercises:', allExercises);
      console.log('カロリーサマリー - 今日のexercises:', todayExercises);

      if (exercisesError) {
        console.error('exercise_logs取得エラー:', exercisesError);
      }

      console.log('カロリーサマリー - 今日のexercises:', todayExercises);

      // mealsテーブルから実際のデータを計算
      const typedTodayMeals = todayMeals as Meal[] || [];
      const totalCalories = typedTodayMeals.reduce((sum: number, meal: Meal) => sum + meal.calories, 0);
      const totalProtein = typedTodayMeals.reduce((sum: number, meal: Meal) => sum + meal.protein, 0);
      const totalFat = typedTodayMeals.reduce((sum: number, meal: Meal) => sum + meal.fat, 0);
      const totalCarbs = typedTodayMeals.reduce((sum: number, meal: Meal) => sum + meal.carbs, 0);

      console.log('カロリーサマリー - 計算結果:', {
        mealsCount: typedTodayMeals.length,
        totalCalories,
        totalProtein,
        totalFat,
        totalCarbs
      });

      // daily_summariesテーブルを最新のデータで更新
      if (dailySummary) {
        // 既存のレコードを更新
        const { error: updateError } = await supabase
          .from('daily_summaries')
          .update({
            total_calories: totalCalories,
            total_protein: totalProtein,
            total_fat: totalFat,
            total_carbs: totalCarbs
          })
          .eq('user_id', user.id)
          .eq('date', todayDate);

        if (updateError) {
          console.error('daily_summary更新エラー:', updateError);
        } else {
          console.log('daily_summary更新成功');
        }
      } else if (typedTodayMeals.length > 0) {
        // 新規レコードを作成
        const { error: insertError } = await supabase
          .from('daily_summaries')
          .insert({
            user_id: user.id,
            date: todayDate,
            total_calories: totalCalories,
            total_protein: totalProtein,
            total_fat: totalFat,
            total_carbs: totalCarbs
          });

        if (insertError) {
          console.error('daily_summary作成エラー:', insertError);
        } else {
          console.log('daily_summary作成成功');
        }
      }

      const actualCalories = totalCalories;
      const actualProtein = totalProtein;
      const actualFat = totalFat;
      const actualCarbs = totalCarbs;

      // 運動消費カロリーを計算
      const exerciseCalories = todayExercises ? 
        (todayExercises as Exercise[]).reduce((sum: number, exercise: Exercise) => sum + exercise.calories_burned, 0) : 0;

      // 純カロリー（摂取 - 運動消費）
      const netCalories = actualCalories - exerciseCalories;

      console.log('カロリー計算詳細:', {
        actualCalories,
        exerciseCalories,
        netCalories,
        idealCalories,
        calorieDiff: netCalories - idealCalories
      });

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
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-base font-semibold">カロリーサマリー</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm">データを読み込み中...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-base font-semibold">カロリーサマリー</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">データがありません</p>
        </CardContent>
      </Card>
    );
  }

  // 進捗計算（理想カロリーを100%とする）
  const calculateProgress = () => {
    if (idealCalories <= 0) return 0;
    if (data.netCalories <= 0) return 0;
    
    const progress = (data.netCalories / idealCalories) * 100;
    console.log('進捗計算:', {
      netCalories: data.netCalories,
      idealCalories,
      progress: Math.round(progress)
    });
    return Math.round(progress);
  };

  const progress = calculateProgress();
  // 100%未満は緑基調、100%超えたら現在の配色
  const progressColor = progress > 100 ? 'text-red-600' : 'text-green-600';
  const progressBgColor = progress > 100 ? 'bg-red-50' : 'bg-green-50';

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-base font-semibold">カロリーサマリー</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-0 pl-4 pr-4 flex-1 flex flex-col">
        {/* レスポンシブ対応: 横並び → 縦並び */}
        <div className="flex flex-col lg:flex-row gap-4 flex-1">
          {/* 左カラム: 今日の総カロリー */}
          <div className="flex-1 flex flex-col">
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200 flex flex-col h-full">
              <p className="text-sm text-gray-600">今日の純カロリー</p>
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
              <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200 flex-1 flex flex-col justify-center">
                <p className="text-xs text-gray-600">今日の運動消費</p>
              <p className="text-[10px] text-gray-500 mb-1">(摂取から差し引き)</p>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-lg font-bold text-purple-600">{data.exerciseCalories}</p>
                  <p className="text-xs text-gray-500">kcal</p>
                </div>
              </div>
            </div>
          </div>

          {/* 右カラム: 理想カロリー */}
          <div className="flex-1 flex flex-col">
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200 flex flex-col h-full">
              <p className="text-sm text-gray-600">理想カロリー</p>
              {idealCalories > 0 ? (
                <>
                  <div className="flex items-center justify-center gap-1 mb-3">
                    <p className="text-2xl font-bold text-green-600">{idealCalories}</p>
                    <p className="text-sm text-gray-500">kcal</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center gap-1 mb-3">
                  <p className="text-lg font-bold text-gray-400">未設定</p>
                </div>
              )}
              
              {/* 理想PFC割合 */}
              {idealCalories > 0 ? (
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
              ) : (
                <div className="text-center p-2 bg-gray-50 rounded-lg border border-gray-200 mb-2">
                  <p className="text-xs text-gray-500 mb-1">オンボーディング完了後に表示</p>
                </div>
              )}

              {/* 進捗表示 */}
              {idealCalories > 0 ? (
                <div className={`text-center p-2 rounded-lg border flex-1 flex flex-col justify-center ${progressBgColor} ${progress > 100 ? 'border-red-200' : 'border-green-200'}`}>
                  <p className="text-xs text-gray-600">進捗</p>
                  <p className={`text-lg font-bold ${progressColor}`}>{progress}%</p>
                  <p className="text-[10px] text-gray-500">
                    {progress > 100 ? '目標超過' : '目標未達'}
                  </p>
                </div>
              ) : (
                <div className="text-center p-2 rounded-lg border border-gray-200 flex-1 flex flex-col justify-center bg-gray-50">
                  <p className="text-xs text-gray-500">進捗</p>
                  <p className="text-lg font-bold text-gray-400">-</p>
                  <p className="text-[10px] text-gray-500">未設定</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 