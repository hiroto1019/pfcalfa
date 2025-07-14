"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { createClient } from '@/lib/supabase/client';

type WeightLog = {
  date: string;
  weight_kg: number;
};

export function WeightChart({ targetWeight }: { targetWeight: number | null }) {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchWeightLogs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase
        .from('daily_weight_logs')
        .select('date, weight_kg')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) {
        console.error('体重記録の読み込みエラー:', error);
        setWeightLogs([]);
      } else {
        setWeightLogs(data.map(log => ({ ...log, weight_kg: log.weight_kg ?? 0 })));
      }
      setIsLoading(false);
    };

    fetchWeightLogs();
  }, [supabase]);


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
    Math.min(...(formattedData.map(d => d.weight_kg).concat(targetWeight ?? 0))) - 2,
    Math.max(...(formattedData.map(d => d.weight_kg).concat(targetWeight ?? 0))) + 2,
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">体重推移</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant={timeRange === 'daily' ? 'default' : 'outline'} onClick={() => setTimeRange('daily')}>日別</Button>
          <Button size="sm" variant={timeRange === 'weekly' ? 'default' : 'outline'} onClick={() => setTimeRange('weekly')}>週別</Button>
          <Button size="sm" variant={timeRange === 'monthly' ? 'default' : 'outline'} onClick={() => setTimeRange('monthly')}>月別</Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-60">読み込み中...</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={yDomain} width={30} />
              <Tooltip />
              <Line type="monotone" dataKey="weight_kg" name="体重 (kg)" stroke="#8884d8" />
              {targetWeight && (
                <ReferenceLine
                  y={targetWeight}
                  label={{ value: '目標', position: 'insideTopLeft' }}
                  stroke="red"
                  strokeDasharray="3 3"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
} 