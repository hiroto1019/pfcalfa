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
}

export function PFCChart({ compact = false }: PFCChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const supabase = createClient();

  useEffect(() => {
    loadChartData();
  }, [period]);

  const loadChartData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // プロファイル取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (!profile) return;

      // 理想カロリー計算を共通関数に置き換え
      const { data: todayWeight } = await supabase
        .from('daily_weight_logs')
        .select('weight_kg')
        .eq('user_id', user.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();
      const { data: todayActivity } = await supabase
        .from('daily_activity_logs')
        .select('activity_level')
        .eq('user_id', user.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();
      const currentWeight = todayWeight?.weight_kg ?? profile.initial_weight_kg;
      const currentActivityLevel = todayActivity?.activity_level ?? profile.activity_level;
      const targetCalories = getIdealCalories(profile, currentWeight, currentActivityLevel);
      
      // 目標PFC
      const targetProtein = (targetCalories * 0.25) / 4;
      const targetFat = (targetCalories * 0.25) / 9;
      const targetCarbs = (targetCalories * 0.5) / 4;
      // 実績データ取得
      let chartData: any[] = [];
      if (period === "daily") {
        const today = new Date().toISOString().split('T')[0];
        const { data: dailySummary } = await supabase
          .from('daily_summaries')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();
        // PFC比率で分配（摂取）
        let protein = 0, fat = 0, carbs = 0;
        if (dailySummary) {
          const totalCalories = dailySummary.total_calories;
          const pKcal = dailySummary.total_protein * 4;
          const fKcal = dailySummary.total_fat * 9;
          const cKcal = dailySummary.total_carbs * 4;
          const sum = pKcal + fKcal + cKcal;
          if (sum > 0) {
            protein = totalCalories * (pKcal / sum);
            fat = totalCalories * (fKcal / sum);
            carbs = totalCalories * (cKcal / sum);
          }
        }
        // PFC比率で分配（目標）
        // ここでidealCaloriesをPFCグラフの目標棒合計値として使い、カロリーサマリーと完全一致させる
        const idealCalories = Math.round(targetCalories);
        // PFC比率
        const idealPKcal = targetProtein * 4;
        const idealFKcal = targetFat * 9;
        const idealCKcal = targetCarbs * 4;
        const idealSum = idealPKcal + idealFKcal + idealCKcal;
        let idealProtein = 0, idealFat = 0, idealCarbs = 0;
        if (idealSum > 0) {
          // PFC比率で分配（合計値はidealCaloriesに必ず一致）
          const pRatio = idealPKcal / idealSum;
          const fRatio = idealFKcal / idealSum;
          const cRatio = idealCKcal / idealSum;
          const rawProtein = idealCalories * pRatio;
          const rawFat = idealCalories * fRatio;
          // 端数調整：P・Fを四捨五入、Cで合計を合わせる
          const roundedProtein = Math.round(rawProtein);
          const roundedFat = Math.round(rawFat);
          let roundedCarbs = idealCalories - roundedProtein - roundedFat;
          if (roundedCarbs < 0) roundedCarbs = 0;
          if (roundedCarbs > idealCalories) roundedCarbs = idealCalories;
          idealProtein = roundedProtein;
          idealFat = roundedFat;
          idealCarbs = roundedCarbs;
        }
        chartData = [
          {
            name: "摂取",
            protein,
            fat,
            carbs,
  },
          {
            name: "目標",
            protein: idealProtein,
            fat: idealFat,
            carbs: idealCarbs,
          }
        ];
      } else {
        // 週・月は合計または平均で同様に作成（省略可）
        chartData = [];
      }
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
