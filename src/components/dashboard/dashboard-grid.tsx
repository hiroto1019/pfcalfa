"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { OverviewCard } from "./overview-card"; 
import { CalorieSummary } from "./calorie-summary";
import { AiAdvice } from "@/components/dashboard/ai-advice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PFCChart } from "./pfc-chart";
import { WeightChart } from "./weight-chart";
import { getIdealCalories } from "@/lib/utils";
import { MealHistoryCard } from "./meal-history-card"; 
import { type Profile } from "@/lib/types";


export function DashboardGrid({ profile, onUpdate }: { profile: Profile, onUpdate: () => void }) {
  if (!profile) {
    return <div className="text-center">プロフィールデータが見つかりません。</div>;
  }

  const idealCalories = getIdealCalories(profile);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 grid gap-6">
        <AiAdvice />
        <PFCChart idealCalories={idealCalories} />
      </div>
      <div className="lg:col-span-1 grid gap-6">
        <OverviewCard profile={profile} onUpdate={onUpdate} />
        <WeightChart targetWeight={profile.target_weight_kg} />
        <MealHistoryCard />
      </div>
    </div>
  );
} 