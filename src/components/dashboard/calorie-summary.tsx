"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface CalorieSummaryData {
  actualCalories: number;
  proteinRatio: number;
  fatRatio: number;
  carbsRatio: number;
}

interface CalorieSummaryProps {
  idealCalories: number;
  consumedCalories: number;
}

export function CalorieSummary({ idealCalories, consumedCalories }: CalorieSummaryProps) {
  const remainingCalories = idealCalories - consumedCalories;
  const progress = idealCalories > 0 ? (consumedCalories / idealCalories) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">カロリーサマリー</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-around pt-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">目標</p>
          <p className="text-2xl font-bold">{Math.round(idealCalories)}</p>
          <p className="text-xs text-gray-500">kcal</p>
        </div>
        <div className="text-center text-blue-600">
          <p className="text-sm">今日の摂取</p>
          <p className="text-2xl font-bold">{Math.round(consumedCalories)}</p>
          <p className="text-xs">kcal</p>
        </div>
        <div className="text-center text-green-600">
          <p className="text-sm">残り</p>
          <p className="text-2xl font-bold">{Math.round(remainingCalories)}</p>
          <p className="text-xs">kcal</p>
        </div>
      </CardContent>
    </Card>
  );
} 