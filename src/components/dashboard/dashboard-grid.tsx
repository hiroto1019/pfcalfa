"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { OverviewCard } from "./overview-card"; 
import { CalorieSummary } from "./calorie-summary";
import { AiAdvice } from "./ai-advice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PFCChart } from "./pfc-chart";
import { WeightChart } from "./weight-chart";
import { getIdealCalories } from "@/lib/utils";
import { MealHistoryCard } from "./meal-history-card"; 
import { useRouter } from "next/navigation"; // useRouterをインポート

export function DashboardGrid({ profile }: { profile: any }) {
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter(); // routerインスタンスを取得

  const handleUpdate = () => {
    router.refresh(); // サーバーからデータを再取得して画面を更新
  };

  useEffect(() => {
    const fetchWeightLogs = async () => {
      if (!profile?.id) return;
    setIsLoading(true);
      const { data, error } = await supabase
        .from('daily_weight_logs')
        .select('date, weight_kg')
        .eq('user_id', profile.id)
        .order('date', { ascending: true });

      if (error) {
        console.error('体重記録の読み込みエラー:', error);
        setWeightLogs([]);
      } else {
        setWeightLogs(data);
      }
      setIsLoading(false);
    };

    fetchWeightLogs();
  }, [profile, supabase]);

  if (!profile || isLoading) {
    return <div className="flex items-center justify-center h-full">データを読み込んでいます...</div>;
  }
  
  const currentWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_kg : profile.initial_weight_kg;
  const idealCalories = getIdealCalories(profile, currentWeight);

  return (
    <main className="grid flex-1 grid-cols-1 md:grid-cols-3 gap-4">
      {/* Top Row */}
      <AiAdvice />
      <CalorieSummary idealCalories={idealCalories ?? 0} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">PFCバランス</CardTitle>
        </CardHeader>
        <CardContent>
          <PFCChart idealCalories={idealCalories ?? 0} />
        </CardContent>
      </Card>
      
      {/* Bottom Row */}
      <MealHistoryCard />
      <OverviewCard profile={profile} currentWeight={currentWeight} onUpdate={handleUpdate} />
      <WeightChart profile={profile} weightLogs={weightLogs} isLoading={isLoading} />
    </main>
  );
} 