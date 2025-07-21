"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, startOfWeek, startOfMonth, parseISO } from 'date-fns';

type WeightLog = {
  date: string;
  weight_kg: number;
};

export function WeightChart({ profile, weightLogs, isLoading }: { profile: any; weightLogs: WeightLog[]; isLoading: boolean }) {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const getFormattedData = () => {
    if (timeRange === 'daily') {
      return weightLogs.map(log => ({
        ...log,
        date: format(parseISO(log.date), 'M/d'),
      }));
    }

    const groupedData: { [key: string]: number[] } = {};
    const groupingFn = timeRange === 'weekly' ? startOfWeek : startOfMonth;
    
    weightLogs.forEach(log => {
      const groupKey = format(groupingFn(parseISO(log.date)), 'yyyy-MM-dd');
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = [];
      }
      groupedData[groupKey].push(log.weight_kg);
    });

    return Object.entries(groupedData).map(([date, weights]) => ({
      date: format(parseISO(date), 'M/d'),
      weight_kg: weights.reduce((a, b) => a + b, 0) / weights.length,
    }));
  };

  const formattedData = getFormattedData();
  
  // Y軸のドメインを改善
  const getYDomain = () => {
    if (formattedData.length === 0) {
      return [0, 100];
    }
    
    const weights = formattedData.map(d => d.weight_kg);
    const targetWeight = profile?.target_weight_kg;
    
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    
    // 目標体重も含めて範囲を計算
    const allWeights = targetWeight ? [...weights, targetWeight] : weights;
    const globalMin = Math.min(...allWeights);
    const globalMax = Math.max(...allWeights);
    
    // 余裕を持った範囲を設定（最小5kg、最大10kgの範囲）
    const range = globalMax - globalMin;
    const padding = Math.max(range * 0.1, 2); // 最低2kgの余裕
    
    return [
      Math.floor(globalMin - padding),
      Math.ceil(globalMax + padding)
    ];
  };

  const yDomain = getYDomain();

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
          <div className="font-semibold mb-1">{label}</div>
          <div style={{ color: '#3b82f6' }}>
            体重: {payload[0].value} kg
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full flex flex-col min-h-[250px]">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-base font-semibold">体重推移</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="w-full h-full flex flex-col max-h-[200px]">
          <div className="flex justify-center mb-2 flex-shrink-0">
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as "daily"|"weekly"|"monthly")} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="daily">日別</TabsTrigger>
                <TabsTrigger value="weekly">週別</TabsTrigger>
                <TabsTrigger value="monthly">月別</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">読み込み中...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#e0e0e0' }}
                  tickLine={{ stroke: '#e0e0e0' }}
                />
                <YAxis 
                  domain={yDomain} 
                  width={40}
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#e0e0e0' }}
                  tickLine={{ stroke: '#e0e0e0' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="weight_kg" 
                  name="体重 (kg)" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                />
                {profile?.target_weight_kg && (
                  <ReferenceLine
                    y={profile.target_weight_kg}
                    label={{ 
                      value: '目標体重', 
                      position: 'insideTopLeft',
                      fill: '#f97316',
                      fontSize: 12,
                      fontWeight: 'bold'
                    }}
                    stroke="#f97316"
                    strokeDasharray="3 3"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 