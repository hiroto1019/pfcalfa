"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { OverviewCard } from "./overview-card"; 
import { CalorieSummary } from "./calorie-summary";
import { AiAdvice } from "./ai-advice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PFCChart } from "./pfc-chart";
import { WeightChart } from "./weight-chart";
import { getIdealCalories } from "@/lib/utils";
import { HistoryCard } from "./meal-history-card"; 
import { useRouter } from "next/navigation";

export function DashboardGrid({ profile }: { profile: any }) {
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // リアルタイム更新用のキー
  const [editableData, setEditableData] = useState({
    currentWeight: 0,
    targetWeight: 0,
    activityLevel: 2,
    goalDate: "",
  });
  const [idealCalories, setIdealCalories] = useState(0); // 理想カロリーを状態として管理

  const supabase = createClient();
  const router = useRouter();

  // 理想カロリーを計算する関数
  const calculateIdealCalories = () => {
    const calculated = getIdealCalories(
      profile,
      editableData.currentWeight,
      editableData.activityLevel,
      editableData.targetWeight,
      editableData.goalDate
    );
    console.log('理想カロリー計算:', {
      profile: profile?.id,
      currentWeight: editableData.currentWeight,
      activityLevel: editableData.activityLevel,
      targetWeight: editableData.targetWeight,
      goalDate: editableData.goalDate,
      calculated
    });
    setIdealCalories(calculated ?? 0);
  };

  // 体重データを取得する関数
  const fetchWeightData = async () => {
    if (!profile?.id) return;
    
    const { data, error } = await supabase
      .from('daily_weight_logs')
      .select('date, weight_kg')
      .eq('user_id', profile.id)
      .order('date', { ascending: true });

    let currentWeightValue = profile.initial_weight_kg ?? 0;
    if (error) {
      console.error('体重記録の読み込みエラー:', error);
      setWeightLogs([]);
    } else {
      setWeightLogs(data);
      if (data.length > 0) {
        currentWeightValue = data[data.length - 1].weight_kg;
      }
    }
    
    setEditableData(prev => ({
      ...prev,
      currentWeight: currentWeightValue,
      targetWeight: profile.target_weight_kg ?? 0,
      activityLevel: profile.activity_level ?? 2,
      goalDate: profile.goal_target_date ? new Date(profile.goal_target_date).toISOString().split('T')[0] : "",
    }));
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      await fetchWeightData();
      setIsLoading(false);
    };

    fetchInitialData();
  }, [profile, supabase]);

  // リアルタイム更新のためのイベントリスナー
  useEffect(() => {
    const handleDataUpdate = () => {
      console.log('データ更新イベントを受信 - 全コンポーネントを更新');
      setRefreshKey(prev => prev + 1); // キーを更新してコンポーネントを強制再レンダリング
      fetchWeightData(); // 体重データも更新
    };

    const handleMealRecorded = () => {
      console.log('食事記録イベントを受信');
      handleDataUpdate();
    };

    const handleExerciseRecorded = () => {
      console.log('運動記録イベントを受信');
      handleDataUpdate();
    };

    const handleWeightRecorded = () => {
      console.log('体重記録イベントを受信');
      handleDataUpdate();
    };

    const handleMealDeleted = () => {
      console.log('食事削除イベントを受信');
      handleDataUpdate();
    };

    const handleExerciseDeleted = () => {
      console.log('運動削除イベントを受信');
      handleDataUpdate();
    };

    const handleIdealCaloriesUpdated = (event: CustomEvent) => {
      console.log('理想カロリー更新イベントを受信:', event.detail);
      const { currentWeight, targetWeight, activityLevel, goalDate } = event.detail;
      
      // editableDataを更新
      setEditableData(prev => {
        const newData = {
          ...prev,
          currentWeight,
          targetWeight,
          activityLevel,
          goalDate
        };
        console.log('editableData更新:', newData);
        return newData;
      });
      
      // 理想カロリーを再計算
      const newIdealCalories = getIdealCalories(
        profile,
        currentWeight,
        activityLevel,
        targetWeight,
        goalDate
      );
      console.log('新しい理想カロリー:', newIdealCalories);
      setIdealCalories(newIdealCalories ?? 0);
      
      // 他のコンポーネントも更新
      setRefreshKey(prev => prev + 1);
    };

    // イベントリスナーを登録
    window.addEventListener('mealRecorded', handleMealRecorded);
    window.addEventListener('exerciseRecorded', handleExerciseRecorded);
    window.addEventListener('weightRecorded', handleWeightRecorded);
    window.addEventListener('mealDeleted', handleMealDeleted);
    window.addEventListener('exerciseDeleted', handleExerciseDeleted);
    window.addEventListener('idealCaloriesUpdated', handleIdealCaloriesUpdated as EventListener);
    window.addEventListener('dataUpdated', handleDataUpdate);
    
    return () => {
      window.removeEventListener('mealRecorded', handleMealRecorded);
      window.removeEventListener('exerciseRecorded', handleExerciseRecorded);
      window.removeEventListener('weightRecorded', handleWeightRecorded);
      window.removeEventListener('mealDeleted', handleMealDeleted);
      window.removeEventListener('exerciseDeleted', handleExerciseDeleted);
      window.removeEventListener('idealCaloriesUpdated', handleIdealCaloriesUpdated as EventListener);
      window.removeEventListener('dataUpdated', handleDataUpdate);
    };
  }, []);

  const handleUpdate = () => {
    router.refresh();
  };

  // 初期化時に理想カロリーを計算
  useEffect(() => {
    if (profile) {
      calculateIdealCalories();
    }
  }, [profile, editableData]);

  if (!profile || isLoading) {
    return <div className="flex items-center justify-center h-full">データを読み込んでいます...</div>;
  }

  return (
    <main className="grid flex-1 grid-cols-1 md:grid-cols-3 gap-4 p-4 min-h-0" style={{ paddingBottom: '0px' }}>
      {/* AIアドバイス - SP: 1番目, PC: 1番目 */}
      <div className="order-1 md:order-1 h-full">
        <AiAdvice key={`ai-advice-${refreshKey}`} />
      </div>
      
      {/* カロリーサマリー - SP: 2番目, PC: 2番目 */}
      <div className="order-2 md:order-2 h-full">
        <CalorieSummary key={`calorie-summary-${refreshKey}`} idealCalories={idealCalories ?? 0} />
      </div>
      
      {/* PFCバランス - SP: 3番目, PC: 3番目 */}
      <div className="order-3 md:order-3 h-full">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base font-semibold">PFCバランス</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <PFCChart key={`pfc-chart-${refreshKey}`} idealCalories={idealCalories ?? 0} />
          </CardContent>
        </Card>
      </div>
      
      {/* 今日のサマリーと目標 - SP: 4番目, PC: 5番目 */}
      <div className="order-4 md:order-5 h-full">
        <OverviewCard 
          key={`overview-${refreshKey}`}
          formData={editableData}
          setFormData={setEditableData}
          onUpdate={handleUpdate} 
        />
      </div>
      
      {/* 体重推移 - SP: 5番目, PC: 6番目 */}
      <div className="order-5 md:order-6 h-full">
        <WeightChart key={`weight-chart-${refreshKey}`} profile={profile} weightLogs={weightLogs} isLoading={isLoading} />
      </div>
      
      {/* 履歴 - SP: 6番目, PC: 4番目 */}
      <div className="order-6 md:order-4 h-full">
        <HistoryCard key={`history-${refreshKey}`} />
      </div>
    </main>
  );
} 