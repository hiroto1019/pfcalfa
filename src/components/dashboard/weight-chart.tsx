"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

interface WeightData {
  date: string;
  weight: number;
  target?: number;
}

interface WeightChartProps {
  compact?: boolean;
  height?: number;
}

export function WeightChart({ compact = false, height = 300 }: WeightChartProps) {
  const [data, setData] = useState<WeightData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "3months">("week");
  const supabase = createClient();

  useEffect(() => {
    loadWeightData();
  }, [period]);

  const loadWeightData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 目標体重を取得
      const { data: goal } = await supabase
        .from('goals')
        .select('target_weight_kg')
        .eq('user_id', user.id)
        .single();

      const endDate = new Date();
      const startDate = new Date();
      
      if (period === "week") {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === "month") {
        startDate.setDate(startDate.getDate() - 30);
      } else {
        startDate.setDate(startDate.getDate() - 90);
      }

      const { data: weightLogs } = await supabase
        .from('daily_weight_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date');

      if (weightLogs && weightLogs.length > 0) {
        const chartData = weightLogs.map(log => ({
          date: new Date(log.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
          weight: log.weight_kg,
          target: goal?.target_weight_kg
        }));

        setData(chartData);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error('体重データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}kg
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">体重推移</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pt-4">
        <Tabs value={period} onValueChange={(value) => setPeriod(value as any)}>
          <TabsList className="grid w-full grid-cols-3 h-10 sm:h-12">
            <TabsTrigger value="week" className="text-xs sm:text-sm">週間</TabsTrigger>
            <TabsTrigger value="month" className="text-xs sm:text-sm">月間</TabsTrigger>
            <TabsTrigger value="3months" className="text-xs sm:text-sm">3ヶ月</TabsTrigger>
          </TabsList>
        </Tabs>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm">データを読み込み中...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-gray-500 text-sm">体重データがありません</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={40}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="weight" name="体重" stroke="#8884d8" strokeWidth={2} />
              {data[0]?.target && (
                <Line type="monotone" dataKey="target" name="目標" stroke="#82ca9d" strokeDasharray="5 5" dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
} 