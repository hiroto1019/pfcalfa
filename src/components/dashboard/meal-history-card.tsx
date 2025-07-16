"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface Meal {
  id: string;
  created_at: string;
  food_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export function MealHistoryCard() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchMeals = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("食事履歴の読み込みエラー:", error);
      } else {
        setMeals(data);
      }
      setIsLoading(false);
    };

    fetchMeals();

    // 食事記録イベントをリッスン
    const handleMealRecorded = () => {
      fetchMeals();
    };

    window.addEventListener('mealRecorded', handleMealRecorded);
    return () => {
      window.removeEventListener('mealRecorded', handleMealRecorded);
    };
  }, [supabase]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">食事履歴</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-56">
            <p>読み込み中...</p>
          </div>
        ) : meals.length === 0 ? (
          <div className="flex items-center justify-center h-56">
            <p className="text-gray-500">食事の記録がありません</p>
          </div>
        ) : (
          <ScrollArea className="h-[220px] pr-4">
            <div className="space-y-4">
              {meals.map((meal) => (
                <div key={meal.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 rounded-md bg-gray-50 gap-2">
                  <div className="flex-grow min-w-0 pr-2">
                    <p className="font-semibold truncate text-sm" title={meal.food_name}>{meal.food_name}</p>
                    <p className="text-xs text-gray-500">{format(new Date(meal.created_at), 'M月d日 HH:mm')}</p>
                  </div>
                  <div className="text-xs text-right space-y-1 flex-shrink-0 w-16">
                    <p className="font-bold text-sm truncate">{meal.calories} kcal</p>
                    <div className="flex flex-col gap-0 text-gray-600">
                      <span className="text-xs">P:{meal.protein}g</span>
                      <span className="text-xs">F:{meal.fat}g</span>
                      <span className="text-xs">C:{meal.carbs}g</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
} 