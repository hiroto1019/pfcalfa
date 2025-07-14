"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type MealLog } from "@/app/page";

export function MealHistoryCard({ mealLogs }: { mealLogs: MealLog[] }) {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">食事履歴</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {mealLogs && mealLogs.length > 0 ? (
            <div className="space-y-4">
              {mealLogs.map((log, index) => (
                <div key={index} className="flex justify-between items-center text-sm p-2 rounded-md bg-gray-50">
                  <div>
                    <p className="font-medium">{log.food_name}</p>
                    <p className="text-xs text-muted-foreground">
                      P: {log.protein}g, F: {log.fat}g, C: {log.carbs}g
                    </p>
                  </div>
                  <div className="font-semibold">{log.calories} kcal</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">今日の食事記録はありません。</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 