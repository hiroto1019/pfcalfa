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
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { startOfWeek, startOfMonth, format } from 'date-fns';

interface PFCChartProps {
  idealCalories: number;
  dailyProtein: number;
  dailyFat: number;
  dailyCarbs: number;
}

export function PFCChart({ idealCalories, dailyProtein, dailyFat, dailyCarbs }: PFCChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const supabase = createClient();

  useEffect(() => {
    const loadChartData = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // 目標PFCカロリーの計算 (目標は常に同じ)
      const targetProteinCal = idealCalories * 0.30; // P: 30%
      const targetFatCal = idealCalories * 0.20;     // F: 20%
      const targetCarbsCal = idealCalories * 0.50;   // C: 50%
      
      const idealData = {
        name: "目標",
        protein: targetProteinCal,
        fat: targetFatCal,
        carbs: targetCarbsCal,
      };

      let actualData = { name: "摂取", protein: 0, fat: 0, carbs: 0 };

      if (period === "daily") {
        actualData = {
          name: "摂取",
          protein: dailyProtein * 4,
          fat: dailyFat * 9,
          carbs: dailyCarbs * 4,
        };
        setData([actualData, idealData]);
        setIsLoading(false);
        return;
      }

      // 週別・月別データ取得
      const endDate = new Date();
      let startDate: Date;
      if (period === "weekly") {
        startDate = startOfWeek(endDate, { weekStartsOn: 1 });
      } else { // monthly
        startDate = startOfMonth(endDate);
      }

      const { data: summaries, error } = await supabase
        .from('meal_logs')
        .select('protein, fat, carbs')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        console.error('PFCデータ読み込みエラー:', error);
        setIsLoading(false);
        return;
      }
      
      if (summaries && summaries.length > 0) {
        const totalP = summaries.reduce((sum, s) => sum + s.protein, 0);
        const totalF = summaries.reduce((sum, s) => sum + s.fat, 0);
        const totalC = summaries.reduce((sum, s) => sum + s.carbs, 0);
        
        // 期間中の平均を計算
        const days = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
        const avgP = totalP / days;
        const avgF = totalF / days;
        const avgC = totalC / days;

        actualData = {
            name: `摂取(${period === 'weekly' ? '週平均' : '月平均'})`,
            protein: avgP * 4,
            fat: avgF * 9,
            carbs: avgC * 4,
        };
      }
      setData([actualData, idealData]);
      setIsLoading(false);
    };

    loadChartData();
  }, [period, idealCalories, dailyProtein, dailyFat, dailyCarbs]);


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const total = Math.round(Number(d.protein) + Number(d.fat) + Number(d.carbs));
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
          <div className="font-semibold mb-1">{d.name}</div>
          <div style={{ color: '#8884d8' }}>タンパク質: {Math.round(d.protein)} kcal</div>
          <div style={{ color: '#82ca9d' }}>脂質: {Math.round(d.fat)} kcal</div>
          <div style={{ color: '#ffc658' }}>炭水化物: {Math.round(d.carbs)} kcal</div>
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
       {isLoading ? (
         <div className="flex items-center justify-center h-full text-xs text-gray-500">読み込み中...</div>
       ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barCategoryGap={40}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="protein" stackId="a" fill="#8884d8" name="タンパク質" />
            <Bar dataKey="fat" stackId="a" fill="#82ca9d" name="脂質"/>
            <Bar dataKey="carbs" stackId="a" fill="#ffc658" name="炭水化物"/>
            </BarChart>
        </ResponsiveContainer>
       )}
    </div>
  );
}
