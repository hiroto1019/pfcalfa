"use client";

import { type DashboardData } from "@/app/page";
import { OverviewCard } from "./overview-card";
import { CalorieSummary } from "./calorie-summary";
import { AiAdvice } from "./ai-advice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PFCChart } from "./pfc-chart";
import { WeightChart } from "./weight-chart";
import { MealHistoryCard } from "./meal-history-card"; 

export function DashboardGrid({ dashboardData }: { dashboardData: DashboardData }) {
  const { 
    profile, 
    mealLogs, 
    weightLogs, 
    totalCalories, 
    totalProtein, 
    totalFat, 
    totalCarbs, 
    idealCalories, 
    currentWeight,
    goalTargetDate,
    onDataRefresh
  } = dashboardData;

  const overviewData = {
    current_weight: currentWeight,
    target_weight: profile.target_weight_kg,
    activity_level: profile.activity_level,
    goal_date: goalTargetDate,
  };

  return (
    <main className="grid flex-1 grid-cols-1 md:grid-cols-3 gap-4">
      {/* Top Row */}
      <AiAdvice />
      <CalorieSummary 
        idealCalories={idealCalories} 
        consumedCalories={totalCalories} 
        protein={totalProtein}
        fat={totalFat}
        carbs={totalCarbs}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">PFCバランス</CardTitle>
        </CardHeader>
        <CardContent>
          <PFCChart 
            idealCalories={idealCalories} 
            dailyProtein={totalProtein}
            dailyFat={totalFat}
            dailyCarbs={totalCarbs}
          />
        </CardContent>
      </Card>
      
      {/* Bottom Row */}
      <MealHistoryCard mealLogs={mealLogs} />
      <OverviewCard initialData={overviewData} onUpdate={onDataRefresh} />
      <WeightChart profile={profile} weightLogs={weightLogs} isLoading={false} />
    </main>
  );
} 