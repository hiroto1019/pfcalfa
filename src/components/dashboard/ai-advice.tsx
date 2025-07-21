"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { getAiAdvice } from '@/lib/grok';
import { UserProfile } from '@/lib/grok';
import { getIdealCalories } from '@/lib/utils';

interface AiAdviceProps {
  compact?: boolean;
}

export function AiAdvice({ compact = false }: AiAdviceProps) {
  console.log('AIアドバイスコンポーネントがレンダリングされました');
  const [advice, setAdvice] = useState<{ 
    meal_detail: string; 
    exercise_detail: string 
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dailyData, setDailyData] = useState<any>(null);
  const [updateButtonEnabled, setUpdateButtonEnabled] = useState(true); // 常に生成可能
  const [showDetails, setShowDetails] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [hasEverUpdated, setHasEverUpdated] = useState(false);
  const [currentWeight, setCurrentWeight] = useState<number>(0);
  const supabase = createClient();
  const lastProfileHash = useRef<string | null>(null);
  const lastDailyHash = useRef<string | null>(null);
  const dataLoadAttempts = useRef(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  // ハッシュ生成関数
  const getHash = (obj: any) => {
    if (!obj) return 'null';
    if (obj.username) {
      const keyFields = {
        username: obj.username,
        gender: obj.gender,
        birth_date: obj.birth_date,
        height_cm: obj.height_cm,
        initial_weight_kg: obj.initial_weight_kg,
        target_weight_kg: obj.target_weight_kg,
        activity_level: obj.activity_level,
        goal_type: obj.goal_type,
        goal_target_date: obj.goal_target_date,
        food_preferences: obj.food_preferences
      };
      return JSON.stringify(keyFields);
    }
    if (obj.total_calories !== undefined) {
      const keyFields = {
        total_calories: obj.total_calories || 0,
        total_protein: obj.total_protein || 0,
        total_fat: obj.total_fat || 0,
        total_carbs: obj.total_carbs || 0,
        date: obj.date
      };
      return JSON.stringify(keyFields);
    }
    return JSON.stringify(obj);
  };

  // 現在の体重を取得する関数
  const fetchCurrentWeight = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('daily_weight_logs')
        .select('weight_kg')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.log('体重ログ取得エラー（デフォルト値を使用）:', error);
        return null;
      }

      return data?.weight_kg || null;
    } catch (error) {
      console.log('体重ログ取得エラー（デフォルト値を使用）:', error);
      return null;
    }
  };

  // localStorageキー
  const getAdviceKey = () => {
    if (!userProfile) return "ai-advice-default";
    return `ai-advice-${userProfile.username}-${userProfile.goal_type}`;
  };



  // UI側で要約文を生成する関数（40-60文字制限、カロリーサマリーの情報を絶対とする）
  const generateMealSummary = (): { calorieBox: string; advice: string } => {
    if (!userProfile || !dailyData) return { calorieBox: "データを読み込み中...", advice: "" };
    
    // カロリーサマリーと同じ計算ロジックを使用（画面表示の絶対正義）
    const actualCalories = dailyData.total_calories || 0; // 摂取カロリー
    const exerciseCalories = dailyData.total_exercise_calories || 0; // 運動消費カロリー
    
    // デバッグ: 運動データの確認
    console.log('AIアドバイス - 運動データ確認:', {
      dailyData,
      total_calories: dailyData.total_calories,
      total_exercise_calories: dailyData.total_exercise_calories,
      exerciseCalories
    });
    
    // カロリーサマリーと同じ計算ロジック（動的）
    const netCalories = actualCalories - exerciseCalories; // 純カロリー（摂取 - 運動消費）
    
    // 理想カロリーを計算
    const targetCalories = getIdealCalories(
      userProfile, 
      currentWeight || userProfile.initial_weight_kg, 
      userProfile.activity_level,
      userProfile.target_weight_kg,
      (userProfile as any).goal_target_date
    );
    
    // カロリーサマリーと同じ計算ロジック（動的）
    const calorieDiff = netCalories > targetCalories 
      ? Math.round(netCalories - targetCalories) // カロリーオーバー：(純カロリー - 理想カロリー)
      : Math.round(targetCalories - netCalories); // 目標達成まで残り：(理想カロリー - 純カロリー)

    // 画面表示の絶対正義で計算
        console.log('要約文生成時のデータ確認:', {
      userProfile: {
        username: userProfile.username,
        goal_type: userProfile.goal_type,
        birth_date: userProfile.birth_date,
        gender: userProfile.gender,
        height_cm: userProfile.height_cm,
        initial_weight_kg: userProfile.initial_weight_kg,
        target_weight_kg: userProfile.target_weight_kg,
        activity_level: userProfile.activity_level,
        goal_target_date: (userProfile as any).goal_target_date
      },
      dailyData: {
        total_calories: dailyData.total_calories,
        total_exercise_calories: dailyData.total_exercise_calories,
        total_protein: dailyData.total_protein,
        total_fat: dailyData.total_fat,
        total_carbs: dailyData.total_carbs,
        date: dailyData.date
      },
      calculatedValues: {
        actualCalories,
        exerciseCalories,
        netCalories,
        targetCalories: Math.round(targetCalories),
        calorieDiff,
        currentWeight,
        rawTargetCalories: targetCalories
      }
    });

    // カロリーボックス生成（動的計算）
    let calorieBox = '';
    if (netCalories > targetCalories) {
      // カロリーオーバー：(今日の摂取-今日の運動消費)>理想カロリー
      calorieBox = `カロリーオーバー：${calorieDiff}kcal`;
    } else if (netCalories < targetCalories) {
      // 目標達成まで残り：(今日の摂取-今日の運動消費)<理想カロリー
      calorieBox = `目標達成まで残り：${calorieDiff}kcal`;
    } else {
      // カロリー適正
      calorieBox = `カロリー目標達成！`;
    }

    // アドバイス文生成（動的計算）
    let advice = '';
    if (netCalories > targetCalories) {
      // カロリーオーバー：(今日の摂取-今日の運動消費)>理想カロリー
      if (calorieDiff > 300) {
        advice = `明日は調整しましょう。野菜中心の食事でバランスを取り戻しましょう。`;
      } else {
        advice = `軽めの食事を心がけましょう。明日は調整してバランスを取りましょう。`;
      }
    } else if (netCalories < targetCalories) {
      // 目標達成まで残り：(今日の摂取-今日の運動消費)<理想カロリー
      if (calorieDiff > 100) {
        advice = `栄養をしっかり摂りましょう。タンパク質中心の食事がおすすめです。`;
      } else {
        advice = `もう少しで目標達成です。バランスの良い食事を続けましょう。`;
      }
    } else {
      // カロリー適正
      advice = `この調子で健康的な食生活を続けましょう。バランスの良い食事を心がけてください。`;
    }

    console.log('UI側要約文生成デバッグ:', {
      actualCalories,
      exerciseCalories,
      netCalories,
      targetCalories: Math.round(targetCalories),
      calorieDiff,
      isOverTarget: netCalories > targetCalories,
      calorieBox,
      advice,
      summaryLength: (calorieBox + advice).length
    });

    console.log('食事要約文最終生成:', {
      actualCalories,
      exerciseCalories,
      netCalories,
      targetCalories: Math.round(targetCalories),
      calorieDiff,
      calorieBox,
      advice,
      finalSummaryLength: (calorieBox + advice).length
    });

    return { calorieBox, advice };
  };

  const generateExerciseSummary = (): string => {
    if (!userProfile || !dailyData) return "データを読み込み中...";
    
    // カロリーサマリーと同じリアルタイム計算で運動消費カロリーを取得
    const exerciseCalories = dailyData.total_exercise_calories || 0;
    
    let exerciseSummary = '';
    if (userProfile.goal_type === 'diet') {
      if (exerciseCalories > 0) {
        exerciseSummary = `今日は${exerciseCalories}kcal消費しました。有酸素運動で脂肪燃焼を促進しましょう。継続できる運動が効果的です。`;
      } else {
        exerciseSummary = '有酸素運動で脂肪燃焼を促進しましょう。継続できる運動が効果的です。無理なく続けることが大切です。';
      }
    } else if (userProfile.goal_type === 'bulk-up') {
      if (exerciseCalories > 0) {
        exerciseSummary = `今日は${exerciseCalories}kcal消費しました。高強度の筋トレで筋肉に刺激を与えましょう。休息も重要です。`;
      } else {
        exerciseSummary = '高強度の筋トレで筋肉に刺激を与えましょう。休息も重要です。栄養補給も忘れずに。';
      }
    } else {
      if (exerciseCalories > 0) {
        exerciseSummary = `今日は${exerciseCalories}kcal消費しました。今の体型を維持するための、適度な運動を習慣にしましょう。`;
      } else {
        exerciseSummary = '今の体型を維持するための、適度な運動を習慣にしましょう。ウォーキングから始めてみてください。';
      }
    }

    // 運動要約文の文字数確認ログ
    console.log('運動要約文文字数確認:', {
      goal_type: userProfile.goal_type,
      exercise_calories: exerciseCalories,
      exercise_summary: exerciseSummary,
      exercise_summary_length: exerciseSummary.length
    });

    return exerciseSummary;
  };

  // キャッシュを強制的にクリアして最新データを使用
  useEffect(() => {
    if (userProfile && isFirstLoad.current) {
      console.log('キャッシュを強制的にクリアします');
      
      // すべてのAIアドバイス関連のキャッシュをクリア
      const cacheKey = getAdviceKey();
      const genericKey = `ai-advice-${userProfile.username}`;
      
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(genericKey);
      
      console.log('キャッシュクリア完了:', { cacheKey, genericKey });
      
      isFirstLoad.current = false;
      setUpdateButtonEnabled(true);
      setAdvice(null); // 古いアドバイスをクリア
      setHasEverUpdated(false);
      
      console.log('キャッシュクリア - 更新ボタンを有効化');
    }
  }, [userProfile]);

  // プロフィール・日次データ取得
  useEffect(() => {
    loadUserData();
  }, []);

  // データ変更イベントをリッスン（シンプル版）
  useEffect(() => {
    console.log('AIアドバイス: イベントリスナーを設定します');

    // シンプルなイベントハンドラー
    const handleMealRecorded = () => {
      console.log('AIアドバイス - 食事記録イベントを受信');
      setUpdateButtonEnabled(true);
      console.log('食事記録で更新ボタンを有効化しました');
      
      // 食事が記録されたら、データを再読み込み
      console.log('食事記録によりデータを再読み込みします');
      
      // キャッシュをクリア
      localStorage.removeItem(getAdviceKey());
      console.log('食事記録によりキャッシュをクリアしました');
      
      loadUserData();
      
      // 要約文を強制的に再生成して表示を更新
      setTimeout(() => {
        if (userProfile && dailyData) {
          console.log('要約文を強制再生成します');
          const newMealSummary = generateMealSummary();
          const newExerciseSummary = generateExerciseSummary();
          console.log('新しい要約文:', {
            mealSummary: newMealSummary.advice,
            exerciseSummary: newExerciseSummary
          });
          
          // 新しい要約文でアドバイスを更新（ローカル生成のみ）
          setAdvice({
            meal_detail: newMealSummary.advice,
            exercise_detail: newExerciseSummary
          });
          
          // 更新ボタンを有効化して、ユーザーがGemini APIを呼び出せるようにする
          setUpdateButtonEnabled(true);
          console.log('要約文を更新しました。詳細なアドバイスが必要な場合は「アドバイスを生成」ボタンを押してください。');
        }
      }, 1000);
    };

    const handleExerciseRecorded = () => {
      console.log('AIアドバイス - 運動記録イベントを受信');
      setUpdateButtonEnabled(true);
      console.log('運動記録で更新ボタンを有効化しました');
    };

    const handleMealDeleted = () => {
      console.log('AIアドバイス - 食事削除イベントを受信');
      setUpdateButtonEnabled(true);
      console.log('食事削除で更新ボタンを有効化しました');
      
      // キャッシュをクリア
      localStorage.removeItem(getAdviceKey());
      console.log('食事削除によりキャッシュをクリアしました');
      
      // アドバイスをクリアして強制的に再表示
      setAdvice(null);
      setHasEverUpdated(false);
      
      // 食事が削除されたら、データを再読み込み
      console.log('食事削除によりデータを再読み込みします');
      loadUserData();
      
      // 要約文を強制的に再生成して表示を更新
      setTimeout(() => {
        if (userProfile && dailyData) {
          console.log('要約文を強制再生成します');
          const newMealSummary = generateMealSummary();
          const newExerciseSummary = generateExerciseSummary();
          console.log('新しい要約文:', {
            mealSummary: newMealSummary.advice,
            exerciseSummary: newExerciseSummary
          });
          
          // 新しい要約文でアドバイスを更新（ローカル生成のみ）
          setAdvice({
            meal_detail: newMealSummary.advice,
            exercise_detail: newExerciseSummary
          });
          
          // 更新ボタンを有効化して、ユーザーがGemini APIを呼び出せるようにする
          setUpdateButtonEnabled(true);
          console.log('要約文を更新しました。詳細なアドバイスが必要な場合は「アドバイスを生成」ボタンを押してください。');
        }
      }, 1000);
    };

    const handleExerciseDeleted = () => {
      console.log('AIアドバイス - 運動削除イベントを受信');
      setUpdateButtonEnabled(true);
      console.log('運動削除で更新ボタンを有効化しました');
    };

    const handleIdealCaloriesUpdated = () => {
      console.log('AIアドバイス - 理想カロリー更新イベントを受信');
      setUpdateButtonEnabled(true);
      console.log('理想カロリー更新で更新ボタンを有効化しました');
      
      // キャッシュをクリア
      localStorage.removeItem(getAdviceKey());
      console.log('理想カロリー更新によりキャッシュをクリアしました');
      
      // アドバイスをクリアして強制的に再表示
      setAdvice(null);
      setHasEverUpdated(false);
      
      // 理想カロリーが変更されたら、プロフィールデータを再読み込み
      console.log('理想カロリー変更によりプロフィールデータを再読み込みします');
      console.log('現在のuserProfile:', userProfile);
      
      // 強制的にデータを再読み込み
      loadUserData();
      
      // 要約文を強制的に再生成して表示を更新
      setTimeout(() => {
        if (userProfile && dailyData) {
          console.log('要約文を強制再生成します');
          const newMealSummary = generateMealSummary();
          const newExerciseSummary = generateExerciseSummary();
          console.log('新しい要約文:', {
            mealSummary: newMealSummary.advice,
            exerciseSummary: newExerciseSummary
          });
          
          // 新しい要約文でアドバイスを更新（ローカル生成のみ）
          setAdvice({
            meal_detail: newMealSummary.advice,
            exercise_detail: newExerciseSummary
          });
          
          // 更新ボタンを有効化して、ユーザーがGemini APIを呼び出せるようにする
          setUpdateButtonEnabled(true);
          console.log('要約文を更新しました。詳細なアドバイスが必要な場合は「アドバイスを生成」ボタンを押してください。');
        }
      }, 1000);
    };

    const handleProfileUpdated = () => {
      console.log('AIアドバイス - プロフィール更新イベントを受信');
      setUpdateButtonEnabled(true);
      console.log('プロフィール更新で更新ボタンを有効化しました');
      
      // キャッシュをクリア
      localStorage.removeItem(getAdviceKey());
      console.log('プロフィール更新によりキャッシュをクリアしました');
      
      // アドバイスをクリアして強制的に再表示
      setAdvice(null);
      setHasEverUpdated(false);
      
      // プロフィールが更新されたら、データを再読み込み
      console.log('プロフィール更新によりデータを再読み込みします');
      console.log('現在のuserProfile:', userProfile);
      
      // 強制的にデータを再読み込み
      loadUserData();
      
      // 要約文を強制的に再生成して表示を更新
      setTimeout(() => {
        if (userProfile && dailyData) {
          console.log('要約文を強制再生成します');
          const newMealSummary = generateMealSummary();
          const newExerciseSummary = generateExerciseSummary();
          console.log('新しい要約文:', {
            mealSummary: newMealSummary.advice,
            exerciseSummary: newExerciseSummary
          });
          
          // 新しい要約文でアドバイスを更新（ローカル生成のみ）
          setAdvice({
            meal_detail: newMealSummary.advice,
            exercise_detail: newExerciseSummary
          });
          
          // 更新ボタンを有効化して、ユーザーがGemini APIを呼び出せるようにする
          setUpdateButtonEnabled(true);
          console.log('要約文を更新しました。詳細なアドバイスが必要な場合は「アドバイスを生成」ボタンを押してください。');
        }
      }, 1000);
    };

    const handleFoodPreferencesUpdated = () => {
      console.log('AIアドバイス - 食事の好み更新イベントを受信');
      setUpdateButtonEnabled(true);
      console.log('食事の好み更新で更新ボタンを有効化しました');
    };

    // イベントリスナー登録
    window.addEventListener('mealRecorded', handleMealRecorded);
    window.addEventListener('exerciseRecorded', handleExerciseRecorded);
    window.addEventListener('mealDeleted', handleMealDeleted);
    window.addEventListener('exerciseDeleted', handleExerciseDeleted);
    window.addEventListener('idealCaloriesUpdated', handleIdealCaloriesUpdated);
    window.addEventListener('profileUpdated', handleProfileUpdated);
    window.addEventListener('foodPreferencesUpdated', handleFoodPreferencesUpdated);
    
    return () => {
      console.log('AIアドバイス: イベントリスナーを削除します');
      window.removeEventListener('mealRecorded', handleMealRecorded);
      window.removeEventListener('exerciseRecorded', handleExerciseRecorded);
      window.removeEventListener('mealDeleted', handleMealDeleted);
      window.removeEventListener('exerciseDeleted', handleExerciseDeleted);
      window.removeEventListener('idealCaloriesUpdated', handleIdealCaloriesUpdated);
      window.removeEventListener('profileUpdated', handleProfileUpdated);
      window.removeEventListener('foodPreferencesUpdated', handleFoodPreferencesUpdated);
    };
  }, []);

  const loadUserData = async () => {
    try {
      dataLoadAttempts.current += 1;
      console.log(`ユーザーデータ読み込み試行 ${dataLoadAttempts.current}回目`);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('ユーザーが認証されていません');
        return;
      }
      console.log('ユーザー認証確認完了:', user.id);

      const today = new Date();
      const jstOffset = 9 * 60;
      const jstDate = new Date(today.getTime() + jstOffset * 60000);
      const todayDate = jstDate.toISOString().split('T')[0];
      
      console.log('AIアドバイス - 日付計算:', {
        today: today.toISOString(),
        jstDate: jstDate.toISOString(),
        todayDate,
        jstOffset
      });
      
      const [profileResult, mealsResult, exercisesResult, weightResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('meals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('exercise_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        fetchCurrentWeight(user.id)
      ]);

      if (profileResult.error) {
        console.error('プロフィール取得エラー:', profileResult.error);
        if (dataLoadAttempts.current < 2) {
          setTimeout(loadUserData, 500);
          return;
        }
      }

      if (profileResult.data) {
        const userProfileData = {
          username: profileResult.data.username,
          gender: profileResult.data.gender,
          birth_date: profileResult.data.birth_date,
          height_cm: profileResult.data.height_cm,
          initial_weight_kg: profileResult.data.initial_weight_kg,
          target_weight_kg: profileResult.data.target_weight_kg,
          activity_level: profileResult.data.activity_level,
          goal_type: profileResult.data.goal_type,
          food_preferences: profileResult.data.food_preferences,
          goal_target_date: profileResult.data.goal_target_date
        };
        setUserProfile(userProfileData);
        console.log('プロフィールデータ設定完了:', userProfileData);
        
        // 現在の体重を設定
        const actualCurrentWeight = weightResult || profileResult.data.initial_weight_kg;
        setCurrentWeight(actualCurrentWeight);
        console.log('現在の体重設定:', actualCurrentWeight);
      } else {
        console.log('プロフィールデータが取得できませんでした');
      }

      if (mealsResult.error) {
        console.error('食事データ取得エラー:', mealsResult.error);
        if (dataLoadAttempts.current < 2) {
          setTimeout(loadUserData, 500);
          return;
        }
      }

      if (mealsResult.data) {
        // カロリーサマリーと同じ方法でクライアント側フィルタリング
        const todayMeals = mealsResult.data.filter((meal: any) => {
          const mealDate = new Date(meal.created_at);
          // JSTに変換してから日付を比較
          const jstDate = new Date(mealDate.getTime() + 9 * 60 * 60 * 1000);
          const mealDateStr = jstDate.toISOString().split('T')[0];
          console.log(`AIアドバイス - 食事フィルタリング: ${meal.food_name} - ${meal.created_at} -> ${mealDateStr} vs ${todayDate}`);
          return mealDateStr === todayDate;
        });
        
        // フィルタリングされた食事データから計算
        const totalCalories = todayMeals.reduce((sum: any, meal: any) => sum + meal.calories, 0);
        const totalProtein = todayMeals.reduce((sum: any, meal: any) => sum + meal.protein, 0);
        const totalFat = todayMeals.reduce((sum: any, meal: any) => sum + meal.fat, 0);
        const totalCarbs = todayMeals.reduce((sum: any, meal: any) => sum + meal.carbs, 0);
        
        // 運動データの処理
        let totalExerciseCalories = 0;
        if (exercisesResult.data) {
          const todayExercises = exercisesResult.data.filter((exercise: any) => {
            const exerciseDate = new Date(exercise.created_at);
            // JSTに変換してから日付を比較
            const jstDate = new Date(exerciseDate.getTime() + 9 * 60 * 60 * 1000);
            const exerciseDateStr = jstDate.toISOString().split('T')[0];
            console.log(`AIアドバイス - 運動フィルタリング: ${exercise.exercise_name} - ${exercise.created_at} -> ${exerciseDateStr} vs ${todayDate}`);
            return exerciseDateStr === todayDate;
          });
          
          totalExerciseCalories = todayExercises.reduce((sum: any, exercise: any) => sum + exercise.calories_burned, 0);
          console.log('AIアドバイス - フィルタリングされた運動数:', todayExercises.length);
          console.log('AIアドバイス - 運動消費カロリー:', totalExerciseCalories);
        }
        
        const dailyDataObj = {
          total_calories: totalCalories,
          total_protein: totalProtein,
          total_fat: totalFat,
          total_carbs: totalCarbs,
          total_exercise_calories: totalExerciseCalories,
          date: todayDate
        };
        
        setDailyData(dailyDataObj);
        console.log('食事・運動データ設定完了:', dailyDataObj);
        console.log('AIアドバイス - フィルタリングされた食事数:', todayMeals.length);
      } else {
        setDailyData({
          total_calories: 0,
          total_protein: 0,
          total_fat: 0,
          total_carbs: 0,
          total_exercise_calories: 0,
          date: todayDate
        });
        console.log('食事・運動データなし、デフォルト値を設定');
      }

      setIsDataReady(true);
      dataLoadAttempts.current = 0;
      console.log('データ読み込み完了 - isDataReady: true');

    } catch (error) {
      console.error('ユーザーデータ読み込みエラー:', error);
      if (dataLoadAttempts.current < 2) {
        setTimeout(loadUserData, 500);
      } else {
        setIsDataReady(true);
      }
    }
  };

  const fetchAdvice = async () => {
    if (!userProfile) {
      console.log('プロフィールが準備できていません');
      return;
    }

    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // キャッシュを完全にクリア
    const cacheKey = getAdviceKey();
    const genericKey = `ai-advice-${userProfile.username}`;
    
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(genericKey);
    console.log('fetchAdvice - キャッシュクリア完了:', { cacheKey, genericKey });
    
    // 古いアドバイスをクリア
    setAdvice(null);
    
    // 最新のデータを再取得
    await loadUserData();
    console.log('データ再取得後の状態:', { userProfile, dailyData });

    setIsLoading(true);
    setRetryCount(prev => prev + 1);

    try {
      console.log('AIアドバイス取得開始:', { userProfile, dailyData });
      
      const timeoutPromise = new Promise((_, reject) => {
        fetchTimeoutRef.current = setTimeout(() => {
          reject(new Error('タイムアウト'));
        }, 8000);
      });

      const advicePromise = getAiAdvice(userProfile, dailyData);
      
      const adviceData = await Promise.race([advicePromise, timeoutPromise]) as any;
      
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      
      if (adviceData) {
        setAdvice(adviceData);
        const currentTime = Date.now();
        setLastUpdateTime(currentTime);
        localStorage.setItem(getAdviceKey(), JSON.stringify({
          data: adviceData,
          timestamp: currentTime
        }));
        lastProfileHash.current = getHash(userProfile);
        lastDailyHash.current = getHash(dailyData);
                 setUpdateButtonEnabled(true); // 生成成功後も有効化したまま
        setRetryCount(0);
        isFirstLoad.current = false;
        setHasEverUpdated(true);
        console.log('AIアドバイス取得成功:', adviceData);
      } else {
        throw new Error('アドバイスデータが空です');
      }
    } catch (error) {
      console.error('AIアドバイス取得エラー:', error);
      
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      
      if (retryCount < 2) {
        console.log(`${retryCount}回目のリトライを実行します...`);
        setTimeout(() => {
          fetchAdvice();
        }, 1000 * (retryCount + 1));
        return;
      }

      const fallbackAdvice = {
        meal_summary: "データの読み込みに失敗しました。しばらく時間をおいて再度お試しください。",
        meal_detail: "データの読み込みに失敗しました。しばらく時間をおいて再度お試しください。一般的なアドバイス: バランスの良い食事と適度な運動を心がけましょう。",
        exercise_summary: "現在アドバイスを取得できません。ウォーキングから始めてみましょう。",
        exercise_detail: "現在アドバイスを取得できません。しばらく時間をおいて再度お試しください。一般的なアドバイス: ウォーキングや軽い筋トレを習慣にしましょう。"
      };
      
      setAdvice(fallbackAdvice);
      setRetryCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // UI表示部分を修正
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">AIアドバイス</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-2 flex-1 flex flex-col">
          {isLoading ? (
            <div className="text-center py-2 flex-1 flex items-center justify-center">
              <div>
                <p>AIアドバイスを生成中...</p>
                {retryCount > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    {retryCount}回目の試行中...
                  </p>
                )}
              </div>
            </div>
          ) : advice ? (
            <div className="flex-1 flex flex-col">
              <div className="space-y-2 flex-1 flex flex-col">
                <div>
                  <h3 className="font-semibold text-green-700 mb-1">🍽️ 食事アドバイス</h3>
                  <div className="text-sm text-gray-700 leading-relaxed select-text">
                    {showDetails ? (
                      <div className="whitespace-pre-line max-h-48 overflow-y-auto select-text">
                        {/* 詳細アドバイスは要約文のカロリー表記を参照 */}
                        {advice.meal_detail}
                      </div>
                    ) : (
                      <div>
                        {(() => {
                          const mealData = generateMealSummary();
                          return (
                            <>
                              <div className={`inline-block px-3 py-1 rounded-md text-sm font-medium mb-2 ${
                                mealData.calorieBox.includes('オーバー') 
                                  ? 'bg-orange-50 text-orange-600 border border-orange-200' 
                                  : 'bg-green-50 text-green-600 border border-green-200'
                              }`}>
                                {mealData.calorieBox}
                              </div>
                              <div className="select-text">{mealData.advice}</div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-700 mb-1">🏃‍♂️ 運動アドバイス</h3>
                  <div className="text-sm text-gray-700 leading-relaxed select-text">
                    {showDetails ? (
                      <div className="whitespace-pre-line max-h-48 overflow-y-auto select-text">
                        {/* 詳細アドバイスは要約文のカロリー表記を参照 */}
                        {advice.exercise_detail}
                      </div>
                    ) : (
                      <span className="select-text">{generateExerciseSummary()}</span>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!showDetails) {
                      // 詳細表示時にGemini APIを呼び出し
                      if (!advice?.meal_detail || !advice?.exercise_detail) {
                        await fetchAdvice();
                      }
                    }
                    setShowDetails(!showDetails);
                  }}
                  disabled={isLoading}
                  className="w-full mt-1 flex-shrink-0"
                >
                  {isLoading ? "生成中..." : showDetails ? "要約を表示" : "詳細アドバイスを生成"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {!userProfile ? (
                <div className="text-center py-2 flex-1 flex items-center justify-center">
                  <div>
                    <p className="text-gray-500">プロフィールを登録すると、パーソナライズされたアドバイスが表示されます。</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 flex-1 flex flex-col">
                  <div>
                    <h3 className="font-semibold text-green-700 mb-1">🍽️ 食事アドバイス</h3>
                    <div className="text-sm text-gray-700 leading-relaxed select-text">
                      {(() => {
                        const mealData = generateMealSummary();
                        return (
                          <>
                            <div className={`inline-block px-3 py-1 rounded-md text-sm font-medium mb-2 ${
                              mealData.calorieBox.includes('オーバー') 
                                ? 'bg-orange-50 text-orange-600 border border-orange-200' 
                                : 'bg-green-50 text-green-600 border border-green-200'
                            }`}>
                              {mealData.calorieBox}
                            </div>
                            <div className="select-text">{mealData.advice}</div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-700 mb-1">🏃‍♂️ 運動アドバイス</h3>
                    <div className="text-sm text-gray-700 leading-relaxed select-text">
                      <span className="select-text">{generateExerciseSummary()}</span>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await fetchAdvice();
                      setShowDetails(!showDetails);
                    }}
                    disabled={isLoading}
                    className="w-full mt-1 flex-shrink-0"
                  >
                    {isLoading ? "生成中..." : "詳細アドバイスを生成"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
