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
                <div key={meal.id} className="flex justify-between items-center p-2 rounded-md bg-gray-50">
                  <div className="flex-grow">
                    <p className="font-semibold truncate" title={meal.food_name}>{meal.food_name}</p>
                    <p className="text-xs text-gray-500">{format(new Date(meal.created_at), 'M月d日 HH:mm')}</p>
                  </div>
                  <div className="text-xs text-right space-y-1">
                    <p className="font-bold">{meal.calories} kcal</p>
                    <p className="text-gray-600">
                      P: {meal.protein}g F: {meal.fat}g C: {meal.carbs}g
                    </p>
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