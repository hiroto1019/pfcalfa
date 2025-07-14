"use client";

import { OverviewCard } from "./overview-card";
import { CalorieSummary } from "./calorie-summary";
import { AiAdvice } from "./ai-advice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PFCChart } from "./pfc-chart";
import { WeightChart } from "./weight-chart";
import { getIdealCalories } from "@/lib/utils";

export function DashboardGrid({ profile }: { profile: any }) {

  if (!profile) {
    return <div className="flex items-center justify-center h-full">プロフィールを読み込んでいます...</div>;
  }
  
  const idealCalories = getIdealCalories(profile);

  const overviewData = {
    current_weight: profile.initial_weight_kg,
    target_weight: profile.target_weight_kg,
    activity_level: profile.activity_level,
    goal_date: profile.goal_target_date,
  };

  return (
    <main className="grid flex-1 grid-cols-1 md:grid-cols-3 gap-4 md:grid-rows-2">
      <OverviewCard initialData={overviewData} onUpdate={() => {}} />
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
      <WeightChart profile={profile} />
    </main>
  );
} 