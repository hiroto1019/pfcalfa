"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getIdealCalories } from "@/lib/utils";
import { OverviewCard } from "./overview-card"; 
import { CalorieSummary } from "./calorie-summary";
import { AiAdvice } from "./ai-advice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PFCChart } from "./pfc-chart";
import { WeightChart } from "./weight-chart";

export function DashboardGrid() {
  const [profile, setProfile] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [activityLevel, setActivityLevel] = useState<number | null>(null);
  const [idealCalories, setIdealCalories] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const loadData = useCallback(async () => {
    console.log("--- 1. loadData started ---");
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);

      const { data: goalData } = await supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
      console.log("--- 2. Fetched goalData ---", goalData);
      setGoal(goalData);

      const today = new Date().toISOString().split('T')[0];
      const { data: todayWeight } = await supabase.from('daily_weight_logs').select('weight_kg').eq('user_id', user.id).eq('date', today).single();
      const currentW = todayWeight?.weight_kg ?? profileData?.initial_weight_kg;
      setCurrentWeight(currentW);

      const { data: todayActivity } = await supabase.from('daily_activity_logs').select('activity_level').eq('user_id', user.id).eq('date', today).single();
      const currentActivityLevel = todayActivity?.activity_level ?? profileData?.activity_level;
      setActivityLevel(currentActivityLevel);

      if (profileData && currentW) {
        console.log("--- 3. Calculating calories with:", { profile: profileData, goal: goalData, weight: currentW, activity: currentActivityLevel });
        const calories = getIdealCalories(profileData, goalData, currentW, currentActivityLevel);
        console.log("--- 4. Calculated idealCalories ---", calories);
        setIdealCalories(calories);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
      console.log("--- 5. loadData finished ---");
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const overviewData = {
    current_weight: currentWeight,
    activity_level: activityLevel,
    target_weight: goal?.target_weight_kg,
    goal_date: goal?.target_date,
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <main className="grid flex-1 grid-cols-1 md:grid-cols-3 gap-4 md:grid-rows-2">
      <OverviewCard initialData={overviewData} onUpdate={loadData} />
      <CalorieSummary idealCalories={idealCalories ?? 0} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">PFCバランス</CardTitle>
        </CardHeader>
        <CardContent>
          <PFCChart idealCalories={idealCalories ?? 0} />
        </CardContent>
      </Card>
      <AiAdvice />
      <WeightChart />
    </main>
  );
} 