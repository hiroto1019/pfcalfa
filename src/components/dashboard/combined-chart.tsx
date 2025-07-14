"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, startOfWeek, startOfMonth, parseISO } from 'date-fns';

type CombinedData = {
  date: string;
  protein?: number;
  fat?: number;
  carbs?: number;
  weight_kg?: number;
};

export function CombinedChart({ profile }: { profile: any }) {
  const [data, setData] = useState<CombinedData[]>([]);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      const { data: summaries } = await supabase.from('daily_summaries').select('*').eq('user_id', user.id);
      const { data: weights } = await supabase.from('daily_weight_logs').select('*').eq('user_id', user.id);

      const combined: { [key: string]: CombinedData } = {};

      summaries?.forEach(s => {
          if (!combined[s.date]) combined[s.date] = { date: s.date };
          combined[s.date].protein = s.total_protein * 4;
          combined[s.date].fat = s.total_fat * 9;
          combined[s.date].carbs = s.total_carbs * 4;
      });

      weights?.forEach(w => {
          if (!combined[w.date]) combined[w.date] = { date: w.date };
          combined[w.date].weight_kg = w.weight_kg;
      });

      const processedData = Object.values(combined).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let finalData: CombinedData[];

      if (timeRange === 'daily') {
          finalData = processedData.map(d => ({ ...d, date: format(parseISO(d.date), 'M/d') }));
      } else {
          const groupingFn = timeRange === 'weekly' ? startOfWeek : startOfMonth;
          const grouped: { [key: string]: { p: number[], f: number[], c: number[], w: number[] } } = {};

          processedData.forEach(d => {
              const groupKey = format(groupingFn(parseISO(d.date)), 'yyyy-MM-dd');
              if (!grouped[groupKey]) grouped[groupKey] = { p: [], f: [], c: [], w: [] };
              if (d.protein) grouped[groupKey].p.push(d.protein);
              if (d.fat) grouped[groupKey].f.push(d.fat);
              if (d.carbs) grouped[groupKey].c.push(d.carbs);
              if (d.weight_kg) grouped[groupKey].w.push(d.weight_kg);
          });
          
          finalData = Object.entries(grouped).map(([date, values]) => ({
              date: format(parseISO(date), 'M/d'),
              protein: values.p.length ? values.p.reduce((a, b) => a + b, 0) / values.p.length : undefined,
              fat: values.f.length ? values.f.reduce((a, b) => a + b, 0) / values.f.length : undefined,
              carbs: values.c.length ? values.c.reduce((a, b) => a + b, 0) / values.c.length : undefined,
              weight_kg: values.w.length ? values.w.reduce((a, b) => a + b, 0) / values.w.length : undefined,
          }));
      }

      setData(finalData);
      setIsLoading(false);
    };

    fetchData();
  }, [profile, supabase, timeRange]);

  const yDomainCal = [0, (profile?.idealCalories ?? 2000) * 1.5];
  const yDomainKg = [ (profile?.target_weight_kg ?? 60) - 10, (profile?.target_weight_kg ?? 60) + 10];


  return (
    <Card className="md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">PFCバランスと体重の推移</CardTitle>
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
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" domain={yDomainCal} label={{ value: 'kcal', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" domain={yDomainKg} label={{ value: 'kg', angle: -90, position: 'insideRight' }}/>
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="protein" stackId="a" fill="#42a5f5" name="タンパク質" />
              <Bar yAxisId="left" dataKey="fat" stackId="a" fill="#ff9800" name="脂質" />
              <Bar yAxisId="left" dataKey="carbs" stackId="a" fill="#ffee58" name="炭水化物" />
              <Line yAxisId="right" type="monotone" dataKey="weight_kg" stroke="#ff7300" name="体重" />
              {profile?.target_weight_kg && (
                <ReferenceLine yAxisId="right" y={profile.target_weight_kg} label="目標体重" stroke="red" strokeDasharray="3 3" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
} 