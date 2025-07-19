"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { getIdealCalories } from "@/lib/utils";
import { startOfWeek, startOfMonth, subDays } from 'date-fns';

interface DailySummary {
  id: string;
  user_id: string;
  date: string;
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
}

interface ChartData {
  name: string;
  ideal_protein: number;
  actual_protein: number;
  ideal_fat: number;
  actual_fat: number;
  ideal_carbs: number;
  actual_carbs: number;
  ideal_calories: number;
  actual_calories: number;
}

interface PFCChartProps {
  compact?: boolean;
  idealCalories: number;
}

export function PFCChart({ compact = false, idealCalories }: PFCChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const supabase = createClient();

  useEffect(() => {
    loadChartData();
  }, [period, idealCalories]); // idealCaloriesの変更も監視

  useEffect(() => {
    // 食事記録イベントをリッスン
    const handleMealRecorded = () => {
      console.log('PFCチャート - 食事記録イベントを受信');
      // 少し遅延させてからデータを再読み込み（DB更新を待つ）
      setTimeout(() => {
        loadChartData();
      }, 500);
    };

    const handleExerciseRecorded = () => {
      console.log('PFCチャート - 運動記録イベントを受信');
      setTimeout(() => {
        loadChartData();
      }, 500);
    };

    const handleIdealCaloriesUpdated = () => {
      console.log('PFCチャート - 理想カロリー更新イベントを受信');
      loadChartData();
    };

    window.addEventListener('mealRecorded', handleMealRecorded);
    window.addEventListener('exerciseRecorded', handleExerciseRecorded);
    window.addEventListener('idealCaloriesUpdated', handleIdealCaloriesUpdated);
    
    return () => {
      window.removeEventListener('mealRecorded', handleMealRecorded);
      window.removeEventListener('exerciseRecorded', handleExerciseRecorded);
      window.removeEventListener('idealCaloriesUpdated', handleIdealCaloriesUpdated);
    };
  }, []);

  const loadChartData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const targetCalories = idealCalories;
      const targetProtein = (targetCalories * 0.25) / 4;
      const targetFat = (targetCalories * 0.25) / 9;
      const targetCarbs = (targetCalories * 0.5) / 4;

      // 日付取得方法を統一（get-jst-date関数を使用せず、クライアント側でJSTを計算）
      const now = new Date();
      const jstOffset = 9 * 60; // JSTはUTC+9
      const jstDate = new Date(now.getTime() + jstOffset * 60000);
      const endDate = jstDate;

      let startDate: Date;
      let endDateForFilter: Date;

      if (period === "weekly") {
        startDate = startOfWeek(endDate);
        endDateForFilter = endDate;
      } else if (period === "monthly") {
        startDate = startOfMonth(endDate);
        endDateForFilter = endDate;
      } else { // daily
        // 日別の場合は今日の日付のみ（より確実に）
        const today = new Date();
        const jstOffset = 9 * 60; // JSTはUTC+9
        const jstToday = new Date(today.getTime() + jstOffset * 60000);
        const todayDateStr = jstToday.toISOString().split('T')[0];
        
        startDate = new Date(todayDateStr + 'T00:00:00.000Z');
        endDateForFilter = new Date(todayDateStr + 'T23:59:59.999Z');
        
        console.log('PFCチャート - 今日の日付範囲:', {
          todayDateStr,
          startDate: startDate.toISOString(),
          endDate: endDateForFilter.toISOString()
        });
      }

      // mealsテーブルから直接データを取得
      const { data: allMeals, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // カロリーサマリーと同じロジックで今日のデータをフィルタリング
      const todayDate = jstDate.toISOString().split('T')[0];
      const filteredMeals = allMeals ? allMeals.filter((meal: any) => {
        const mealDate = new Date(meal.created_at);
        // JSTに変換してから日付を比較
        const jstMealDate = new Date(mealDate.getTime() + 9 * 60 * 60 * 1000);
        const mealDateStr = jstMealDate.toISOString().split('T')[0];
        
        const isToday = mealDateStr === todayDate;
        console.log(`PFCフィルタリング: ${meal.food_name} - ${meal.created_at} -> ${mealDateStr} vs ${todayDate} -> ${isToday ? '今日' : '過去'}`);
        
        return isToday;
      }) : [];

      console.log('PFCチャート - 期間:', { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] });
      console.log('PFCチャート - フィルタリングされた食事数:', filteredMeals.length);
      if (filteredMeals.length > 0) {
        console.log('PFCチャート - フィルタリングされた食事詳細:', filteredMeals.map((meal: any) => ({
          food_name: meal.food_name,
          created_at: meal.created_at,
          protein: meal.protein,
          fat: meal.fat,
          carbs: meal.carbs,
          calories: meal.calories
        })));
      }

      let actualProtein = 0;
      let actualFat = 0;
      let actualCarbs = 0;
      let actualCalories = 0;

      if (filteredMeals.length > 0) {
        const totalP = filteredMeals.reduce((sum: number, meal: any) => sum + meal.protein, 0);
        const totalF = filteredMeals.reduce((sum: number, meal: any) => sum + meal.fat, 0);
        const totalC = filteredMeals.reduce((sum: number, meal: any) => sum + meal.carbs, 0);
        const totalCalories = filteredMeals.reduce((sum: number, meal: any) => sum + meal.calories, 0);
        
        console.log('PFCチャート - 計算詳細:', {
          totalP,
          totalF,
          totalC,
          totalCalories,
          period,
          mealCount: filteredMeals.length,
          pfcCalculatedCalories: (totalP * 4) + (totalF * 9) + (totalC * 4)
        });
        
        if (period === "daily") {
          // 日別の場合はcaloriesフィールドを直接使用（カロリーサマリーと一致させる）
          const totalCaloriesFromPFC = totalP * 4 + totalF * 9 + totalC * 4;
          
          if (totalCaloriesFromPFC > 0) {
            // PFC比率を維持しながら、実際のカロリー値に調整
            const pRatio = (totalP * 4) / totalCaloriesFromPFC;
            const fRatio = (totalF * 9) / totalCaloriesFromPFC;
            const cRatio = (totalC * 4) / totalCaloriesFromPFC;
            
            actualProtein = totalCalories * pRatio;
            actualFat = totalCalories * fRatio;
            actualCarbs = totalCalories * cRatio;
          } else {
            actualProtein = 0;
            actualFat = 0;
            actualCarbs = 0;
          }
        } else {
          // 週別・月別の場合は平均を計算
          const days = period === "weekly" ? 7 : 30;
          const avgP = totalP / days;
          const avgF = totalF / days;
          const avgC = totalC / days;
          const avgCalories = totalCalories / days;
          
          const totalCaloriesFromPFC = avgP * 4 + avgF * 9 + avgC * 4;
          
          if (totalCaloriesFromPFC > 0) {
            const pRatio = (avgP * 4) / totalCaloriesFromPFC;
            const fRatio = (avgF * 9) / totalCaloriesFromPFC;
            const cRatio = (avgC * 4) / totalCaloriesFromPFC;
            
            actualProtein = avgCalories * pRatio;
            actualFat = avgCalories * fRatio;
            actualCarbs = avgCalories * cRatio;
          } else {
            actualProtein = 0;
            actualFat = 0;
            actualCarbs = 0;
          }
        }
      }
      
      // 目標PFCカロリーの計算（理想カロリーからPFC比率を計算）
      // 理想的なPFC比率: タンパク質20%, 脂質25%, 炭水化物55%
      const idealProteinRatio = 0.20; // 20%
      const idealFatRatio = 0.25; // 25%
      const idealCarbsRatio = 0.55; // 55%
      
      const idealProteinCal = Math.round(idealCalories * idealProteinRatio);
      const idealFatCal = Math.round(idealCalories * idealFatRatio);
      const idealCarbsCal = idealCalories - idealProteinCal - idealFatCal; // 残りを炭水化物に
      
      console.log('PFCチャート - 理想カロリー計算:', {
        idealCalories,
        idealProteinCal,
        idealFatCal,
        idealCarbsCal,
        total: idealProteinCal + idealFatCal + idealCarbsCal
      });

      const chartData = [
          {
            name: "摂取",
          protein: actualProtein,
          fat: actualFat,
          carbs: actualCarbs,
  },
          {
            name: "目標",
          protein: idealProteinCal,
          fat: idealFatCal,
          carbs: idealCarbsCal,
          }
        ];
      setData(chartData);
    } catch (error) {
      console.error('チャートデータ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-xs text-gray-500">読み込み中...</div>;
  }

  let totalCalories = 0;
  if (data && data.length > 0) {
    const intake = data.find(d => d.name === "摂取");
    if (intake) {
      totalCalories = (Number(intake.protein) + Number(intake.fat) + Number(intake.carbs));
    }
  }

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const total = Math.round(Number(d.protein) + Number(d.fat) + Number(d.carbs));
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
          <div className="font-semibold mb-1">{d.name}</div>
          <div style={{ color: '#739FFF' }}>タンパク質: {Math.round(d.protein)} kcal</div>
          <div style={{ color: '#FFEE70' }}>脂質: {Math.round(d.fat)} kcal</div>
          <div style={{ color: '#FF7C80' }}>炭水化物: {Math.round(d.carbs)} kcal</div>
          <div className="mt-1 font-bold">合計: {total} kcal</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-center mb-2">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as "daily"|"weekly"|"monthly")} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">日別</TabsTrigger>
            <TabsTrigger value="weekly">週別</TabsTrigger>
            <TabsTrigger value="monthly">月別</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data.length ? data : [
          { name: "摂取", protein: 0, fat: 0, carbs: 0 },
          { name: "目標", protein: 0, fat: 0, carbs: 0 }
        ]} barCategoryGap={40}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="protein" stackId="a" fill="#739FFF" />
          <Bar dataKey="fat" stackId="a" fill="#FFEE70" />
          <Bar dataKey="carbs" stackId="a" fill="#FF7C80" />
          </BarChart>
        </ResponsiveContainer>
    </div>
  );
}
