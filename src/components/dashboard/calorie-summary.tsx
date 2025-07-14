"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
      <CardContent>
        <div className="flex justify-between items-baseline mb-2">
          <div className="text-sm text-muted-foreground">消費</div>
          <div className="text-2xl font-bold">{consumedCalories.toLocaleString()}kcal</div>
        </div>
        <div className="flex justify-between items-baseline mb-4">
          <div className="text-sm text-muted-foreground">残り</div>
          <div className="text-2xl font-bold">{remainingCalories.toLocaleString()}kcal</div>
        </div>
        <Progress value={progress} className="w-full" />
        <div className="text-right text-sm text-muted-foreground mt-1">
          目標: {idealCalories.toLocaleString()}kcal
        </div>
      </CardContent>
    </Card>
  );
} 