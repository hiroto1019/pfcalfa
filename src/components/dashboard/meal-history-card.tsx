"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Activity, Utensils, Trash2 } from 'lucide-react';

interface Meal {
  id: string;
  created_at: string;
  food_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface Exercise {
  id: string;
  created_at: string;
  exercise_name: string;
  duration_minutes: number;
  calories_burned: number;
  exercise_type: string;
}

interface HistoryItem {
  id: string;
  created_at: string;
  type: 'meal' | 'exercise';
  data: Meal | Exercise;
}

export function HistoryCard() {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // 食事データを取得
        const { data: meals, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

        if (mealsError) {
          console.error("食事履歴の読み込みエラー:", mealsError);
        }

        // 運動データを取得
        const { data: exercises, error: exercisesError } = await supabase
          .from('exercise_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (exercisesError) {
          console.error("運動履歴の読み込みエラー:", exercisesError);
        }

        // 食事と運動を統合して時系列順にソート
        const mealItems: HistoryItem[] = (meals || []).map((meal: Meal) => ({
          id: meal.id,
          created_at: meal.created_at,
          type: 'meal' as const,
          data: meal
        }));

        const exerciseItems: HistoryItem[] = (exercises || []).map((exercise: Exercise) => ({
          id: exercise.id,
          created_at: exercise.created_at,
          type: 'exercise' as const,
          data: exercise
        }));

        const allItems = [...mealItems, ...exerciseItems].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setHistoryItems(allItems);
      } catch (error) {
        console.error("履歴の読み込みエラー:", error);
      }
      
      setIsLoading(false);
    };

    fetchHistory();

    // 食事記録イベントをリッスン
    const handleMealRecorded = () => {
      fetchHistory();
    };

    // 運動記録イベントをリッスン
    const handleExerciseRecorded = () => {
      fetchHistory();
    };

    window.addEventListener('mealRecorded', handleMealRecorded);
    window.addEventListener('exerciseRecorded', handleExerciseRecorded);
    
    return () => {
      window.removeEventListener('mealRecorded', handleMealRecorded);
      window.removeEventListener('exerciseRecorded', handleExerciseRecorded);
    };
  }, [supabase]);

  // 履歴削除機能
  const handleDelete = async (item: HistoryItem) => {
    if (!confirm('この記録を削除しますか？')) {
      return;
    }

    setDeletingItems(prev => new Set(prev).add(item.id));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      let error;
      if (item.type === 'meal') {
        const { error: deleteError } = await supabase
          .from('meals')
          .delete()
          .eq('id', item.id)
          .eq('user_id', user.id);
        error = deleteError;
      } else {
        const { error: deleteError } = await supabase
          .from('exercise_logs')
          .delete()
          .eq('id', item.id)
          .eq('user_id', user.id);
        error = deleteError;
      }

      if (error) {
        throw error;
      }

      // 削除成功後、履歴を再取得
      setHistoryItems(prev => prev.filter(historyItem => historyItem.id !== item.id));
      
      // 削除イベントを発火して他のコンポーネントに通知
      if (item.type === 'meal') {
        window.dispatchEvent(new CustomEvent('mealDeleted'));
      } else {
        window.dispatchEvent(new CustomEvent('exerciseDeleted'));
      }

    } catch (error) {
      console.error('履歴削除エラー:', error);
      alert('削除に失敗しました');
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const renderHistoryItem = (item: HistoryItem) => {
    const isDeleting = deletingItems.has(item.id);

    if (item.type === 'meal') {
      const meal = item.data as Meal;
      return (
        <div key={item.id} className="flex flex-col lg:flex-row lg:justify-between p-3 rounded-lg bg-blue-50 gap-3 border-l-4 border-blue-400 relative">
          {/* 削除ボタン */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item)}
            disabled={isDeleting}
            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-60 hover:opacity-100 hover:bg-red-100"
          >
            <Trash2 className="w-3 h-3 text-red-600" />
          </Button>

          {/* タイトル・記録日時のブロック */}
          <div className="flex-grow min-w-0 pr-8">
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-blue-600" />
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-sm leading-tight break-words" title={meal.food_name}>
                  {meal.food_name}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(meal.created_at), 'M月d日 HH:mm')}
                </p>
              </div>
            </div>
          </div>
          
          {/* カロリー・PFCのブロック */}
          <div className="flex-shrink-0">
            <div className="flex flex-col gap-1 text-right">
              <p className="font-bold text-sm text-blue-800">
                +{meal.calories}kcal
              </p>
              <div className="flex gap-3 text-xs text-gray-600 justify-end">
                <span className="whitespace-nowrap">P: {meal.protein}g</span>
                <span className="whitespace-nowrap">F: {meal.fat}g</span>
                <span className="whitespace-nowrap">C: {meal.carbs}g</span>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      const exercise = item.data as Exercise;
      return (
        <div key={item.id} className="flex flex-col lg:flex-row lg:justify-between p-3 rounded-lg bg-orange-50 gap-3 border-l-4 border-orange-400 relative">
          {/* 削除ボタン */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item)}
            disabled={isDeleting}
            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-60 hover:opacity-100 hover:bg-red-100"
          >
            <Trash2 className="w-3 h-3 text-red-600" />
          </Button>

          {/* タイトル・記録日時のブロック */}
          <div className="flex-grow min-w-0 pr-8">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-600" />
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-sm leading-tight break-words" title={exercise.exercise_name}>
                  {exercise.exercise_name}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(exercise.created_at), 'M月d日 HH:mm')} • {exercise.duration_minutes}分
                </p>
              </div>
            </div>
          </div>
          
          {/* カロリーのブロック */}
          <div className="flex-shrink-0">
            <div className="flex flex-col gap-1 text-right">
              <p className="font-bold text-sm text-orange-800">
                -{exercise.calories_burned}kcal
              </p>
              <div className="text-xs text-gray-600">
                {exercise.exercise_type}
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">履歴</CardTitle>
      </CardHeader>
      <CardContent className="w-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-56">
            <p>読み込み中...</p>
          </div>
        ) : historyItems.length === 0 ? (
          <div className="flex items-center justify-center h-56">
            <p className="text-gray-500">記録がありません</p>
          </div>
        ) : (
          <ScrollArea className="h-[220px] pr-4">
            <div className="space-y-3 w-full">
              {historyItems.map(renderHistoryItem)}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
} 