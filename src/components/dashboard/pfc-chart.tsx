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
  }, [period]);

  useEffect(() => {
    // 食事記録イベントをリッスン
    const handleMealRecorded = () => {
      console.log('PFCチャート - 食事記録イベントを受信');
      // 少し遅延させてからデータを再読み込み（DB更新を待つ）
      setTimeout(() => {
        loadChartData();
      }, 500);
    };

    window.addEventListener('mealRecorded', handleMealRecorded);
    return () => {
      window.removeEventListener('mealRecorded', handleMealRecorded);
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

      if (period === "weekly") {
        startDate = startOfWeek(endDate);
      } else if (period === "monthly") {
        startDate = startOfMonth(endDate);
      } else { // daily
        startDate = endDate;
      }

      const { data: summaries, error } = await supabase
          .from('daily_summaries')
          .select('*')
          .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) throw error;

      let actualProtein = 0;
      let actualFat = 0;
      let actualCarbs = 0;
      let actualCalories = 0;

      if (summaries && summaries.length > 0) {
        const typedSummaries = summaries as DailySummary[];
        const totalDays = typedSummaries.length;
        const totalP = typedSummaries.reduce((sum: number, s: DailySummary) => sum + s.total_protein, 0);
        const totalF = typedSummaries.reduce((sum: number, s: DailySummary) => sum + s.total_fat, 0);
        const totalC = typedSummaries.reduce((sum: number, s: DailySummary) => sum + s.total_carbs, 0);
        
        const avgP = totalP / totalDays;
        const avgF = totalF / totalDays;
        const avgC = totalC / totalDays;
        
        actualProtein = avgP * 4;
        actualFat = avgF * 9;
        actualCarbs = avgC * 4;
      }
      
      // 目標PFCカロリーの計算
        const idealPKcal = targetProtein * 4;
        const idealFKcal = targetFat * 9;
        const idealCKcal = targetCarbs * 4;
        const idealSum = idealPKcal + idealFKcal + idealCKcal;
      let idealProteinCal = 0, idealFatCal = 0, idealCarbsCal = 0;
        if (idealSum > 0) {
          const pRatio = idealPKcal / idealSum;
          const fRatio = idealFKcal / idealSum;
        const roundedProtein = Math.round(targetCalories * pRatio);
        const roundedFat = Math.round(targetCalories * fRatio);
        idealProteinCal = roundedProtein;
        idealFatCal = roundedFat;
        idealCarbsCal = targetCalories - roundedProtein - roundedFat;
      }

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
          <div style={{ color: '#42a5f5' }}>タンパク質: {Math.round(d.protein)} kcal</div>
          <div style={{ color: '#ff9800' }}>脂質: {Math.round(d.fat)} kcal</div>
          <div style={{ color: '#ffee58' }}>炭水化物: {Math.round(d.carbs)} kcal</div>
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
          <Bar dataKey="protein" stackId="a" fill="#42a5f5" />
          <Bar dataKey="fat" stackId="a" fill="#ff9800" />
          <Bar dataKey="carbs" stackId="a" fill="#ffee58" />
          </BarChart>
        </ResponsiveContainer>
    </div>
  );
}
