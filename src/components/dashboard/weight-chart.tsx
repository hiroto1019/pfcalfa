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
  const yDomain = [
    Math.min(...(formattedData.map(d => d.weight_kg).concat(profile?.target_weight_kg ?? 0))) - 2,
    Math.max(...(formattedData.map(d => d.weight_kg).concat(profile?.target_weight_kg ?? 0))) + 2,
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-base font-semibold">体重推移</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="w-full h-full flex flex-col">
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={yDomain} width={30} />
                <Tooltip />
                <Line type="monotone" dataKey="weight_kg" name="体重 (kg)" stroke="#8884d8" />
                {profile?.target_weight_kg && (
                  <ReferenceLine
                    y={profile.target_weight_kg}
                    label={{ value: '目標', position: 'insideTopLeft' }}
                    stroke="red"
                    strokeDasharray="3 3"
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