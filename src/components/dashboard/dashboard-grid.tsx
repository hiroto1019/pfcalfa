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
import { useRouter } from "next/navigation";

export function DashboardGrid({ profile }: { profile: any }) {
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editableData, setEditableData] = useState({
    currentWeight: 0,
    targetWeight: 0,
    activityLevel: 2,
    goalDate: "",
  });

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!profile?.id) return;
    setIsLoading(true);
      
      const { data, error } = await supabase
        .from('daily_weight_logs')
        .select('date, weight_kg')
        .eq('user_id', profile.id)
        .order('date', { ascending: true });

      let currentWeightValue = profile.initial_weight_kg ?? 0;
      if (error) {
        console.error('体重記録の読み込みエラー:', error);
        setWeightLogs([]);
      } else {
        setWeightLogs(data);
        if (data.length > 0) {
          currentWeightValue = data[data.length - 1].weight_kg;
        }
      }
      
      setEditableData({
        currentWeight: currentWeightValue,
        targetWeight: profile.target_weight_kg ?? 0,
        activityLevel: profile.activity_level ?? 2,
        goalDate: profile.goal_target_date ? new Date(profile.goal_target_date).toISOString().split('T')[0] : "",
      });
      
      setIsLoading(false);
    };

    fetchInitialData();
  }, [profile, supabase]);

  const handleUpdate = () => {
    router.refresh();
  };

  if (!profile || isLoading) {
    return <div className="flex items-center justify-center h-full">データを読み込んでいます...</div>;
  }
  
  const idealCalories = getIdealCalories(
    profile,
    editableData.currentWeight,
    editableData.activityLevel,
    editableData.targetWeight,
    editableData.goalDate
  );

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
      <OverviewCard 
        formData={editableData}
        setFormData={setEditableData}
        onUpdate={handleUpdate} 
      />
      <WeightChart profile={profile} weightLogs={weightLogs} isLoading={isLoading} />
    </main>
  );
} 