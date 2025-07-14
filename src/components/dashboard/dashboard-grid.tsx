"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getIdealCalories } from "@/lib/utils";
import { GoalSetting } from "./goal-setting";
import { WeightActivityToday } from "./weight-activity-today";
import { CalorieSummary } from "./calorie-summary";
import { AiAdvice } from "./ai-advice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PFCChart } from "./pfc-chart";
import { WeightChart } from "./weight-chart";

export function DashboardGrid() {
  const [idealCalories, setIdealCalories] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadInitialData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          const today = new Date().toISOString().split('T')[0];
          const { data: todayWeight } = await supabase
            .from('daily_weight_logs')
            .select('weight_kg')
            .eq('user_id', user.id)
            .eq('date', today)
            .single();
          const { data: todayActivity } = await supabase
            .from('daily_activity_logs')
            .select('activity_level')
            .eq('user_id', user.id)
            .eq('date', today)
            .single();

          const currentWeight = todayWeight?.weight_kg ?? profile.initial_weight_kg;
          const currentActivityLevel = todayActivity?.activity_level ?? profile.activity_level;
          
          const calculatedCalories = getIdealCalories(profile, currentWeight, currentActivityLevel);
          setIdealCalories(calculatedCalories);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <main className="grid flex-1 grid-cols-1 md:grid-cols-3 gap-4 md:grid-rows-2">
      <GoalSetting />
      <CalorieSummary idealCalories={idealCalories ?? 0} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">PFCバランス</CardTitle>
        </CardHeader>
        <CardContent>
          <PFCChart idealCalories={idealCalories ?? 0} />
        </CardContent>
      </Card>
      <WeightActivityToday />
      <AiAdvice />
      <WeightChart />
    </main>
  );
} 