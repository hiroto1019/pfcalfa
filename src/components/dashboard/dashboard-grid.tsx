"use client";

import { useState } from "react";
import { OverviewCard } from "./overview-card";
import { CalorieSummary } from "./calorie-summary";
import { AiAdvice } from "./ai-advice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PFCChart } from "./pfc-chart";
import { WeightChart } from "./weight-chart";
import { getIdealCalories } from "@/lib/utils";
import { MealHistoryCard } from "./meal-history-card"; 

export function DashboardGrid({ profile, weightLogs, onUpdate }: { profile: any, weightLogs: any[], onUpdate: () => void }) {
  const isLoading = !profile;

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">データを読み込んでいます...</div>;
  }
  
  const currentWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_kg : profile.initial_weight_kg;
  const idealCalories = getIdealCalories(profile, currentWeight);

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
      <OverviewCard initialData={overviewData} onUpdate={onUpdate} />
      <WeightChart profile={profile} weightLogs={weightLogs} isLoading={isLoading} />
    </main>
  );
} 