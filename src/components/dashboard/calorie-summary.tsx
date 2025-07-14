"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { getIdealCalories } from "@/lib/utils";

interface CalorieSummaryData {
  actualCalories: number;
  idealCalories: number;
  proteinRatio: number;
  fatRatio: number;
  carbsRatio: number;
}

interface CalorieSummaryProps {
  compact?: boolean;
  idealCalories: number;
}

export function CalorieSummary({ compact = false, idealCalories }: CalorieSummaryProps) {
  const [data, setData] = useState<Omit<CalorieSummaryData, 'idealCalories'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadCalorieData();
  }, []);

  // ページのリフレッシュを監視してデータを再読み込み
  useEffect(() => {
    const handleStorageChange = () => {
      loadCalorieData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', loadCalorieData);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', loadCalorieData);
    };
  }, []);

  const loadCalorieData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ユーザープロファイルを取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      // 今日の活動レベルを取得
      const today = new Date().toISOString().split('T')[0];
      const { data: todayActivity } = await supabase
        .from('daily_activity_logs')
        .select('activity_level')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      // 今日の体重を取得
      const { data: todayWeight } = await supabase
        .from('daily_weight_logs')
        .select('weight_kg')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      // 現在の体重を使用（今日の記録がない場合は初期体重）
      const currentWeight = todayWeight?.weight_kg || profile.initial_weight_kg;
      // 今日の活動レベルを使用（記録がない場合はプロファイルの活動レベル）
      const todayActivityLevel = todayActivity?.activity_level || profile.activity_level;

      // 理想カロリーを計算
      const idealCalories = getIdealCalories(profile, currentWeight, todayActivityLevel);

      // 今日のデータを取得
      const todayDate = new Date().toISOString().split('T')[0];
      const { data: dailySummary } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayDate)
        .single();

      const actualCalories = dailySummary ? dailySummary.total_calories : 0;
      const actualProtein = dailySummary ? dailySummary.total_protein : 0;
      const actualFat = dailySummary ? dailySummary.total_fat : 0;
      const actualCarbs = dailySummary ? dailySummary.total_carbs : 0;

      // PFC比率を計算
      const totalCalories = actualProtein * 4 + actualFat * 9 + actualCarbs * 4;
      const proteinRatio = totalCalories > 0 ? (actualProtein * 4 / totalCalories) * 100 : 0;
      const fatRatio = totalCalories > 0 ? (actualFat * 9 / totalCalories) * 100 : 0;
      const carbsRatio = totalCalories > 0 ? (actualCarbs * 4 / totalCalories) * 100 : 0;

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
    return compact ? (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-gray-500">読み込み中...</p>
      </div>
    ) : (
      <Card>
        <CardHeader>
          <CardTitle>カロリーサマリー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-sm">データを読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return compact ? (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-gray-500">データなし</p>
      </div>
    ) : (
      <Card>
        <CardHeader>
          <CardTitle>カロリーサマリー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500 text-sm">データがありません</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const calorieProgress = idealCalories > 0 ? (data.actualCalories / idealCalories) * 100 : 0;
  const progressColor = calorieProgress > 100 ? 'bg-red-500' : 
                       calorieProgress > 80 ? 'bg-yellow-500' : 'bg-green-500';

  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-1">
        <div className="text-center">
          <p className="text-xs text-gray-500">摂取/目標</p>
          <p className="text-lg font-bold text-blue-600">{data.actualCalories}</p>
          <p className="text-xs text-gray-500">/ {idealCalories} kcal</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div 
            className={`h-1 rounded-full ${progressColor} transition-all duration-300`}
            style={{ width: `${Math.min(calorieProgress, 100)}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500">{Math.round(calorieProgress)}%</div>
      </div>
    );
  }

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