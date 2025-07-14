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

export function DashboardGrid({ profile }: { profile: any }) {
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

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
  
  const handleProfileUpdate = async (updatedData: any) => {
    if (!profile?.id) return;
    
    const { current_weight, ...profileDataToUpdate } = updatedData;

    if (current_weight && current_weight > 0) {
      const today = new Date().toISOString().split('T')[0];
      const { error: weightError } = await supabase
        .from('daily_weight_logs')
        .upsert({ user_id: profile.id, date: today, weight_kg: current_weight }, { onConflict: 'user_id, date' });
      if (weightError) {
        console.error('体重記録の保存エラー:', weightError);
        alert('体重の保存に失敗しました。');
      }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileDataToUpdate)
      .eq('id', profile.id);

    if (profileError) {
      console.error('プロフィールの更新エラー:', profileError);
      alert('プロフィールの更新に失敗しました。');
    } else {
      alert('プロフィールを更新しました。');
      window.location.reload();
    }
  };

  if (!profile || isLoading) {
    return <div className="flex items-center justify-center h-full">データを読み込んでいます...</div>;
  }
  
  const currentWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_kg : profile.initial_weight_kg;
  const idealCalories = getIdealCalories({ ...profile, current_weight_kg: currentWeight });

  const overviewData = {
    current_weight: currentWeight,
    target_weight: profile.target_weight_kg,
    activity_level: profile.activity_level,
    goal_date: profile.goal_target_date,
  };

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
      <OverviewCard initialData={overviewData} onUpdate={handleProfileUpdate} />
      <WeightChart profile={profile} weightLogs={weightLogs} isLoading={isLoading} />
    </main>
  );
} 