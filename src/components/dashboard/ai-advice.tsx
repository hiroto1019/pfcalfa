"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { getAiAdvice } from '@/lib/grok';
import { UserProfile } from '@/lib/grok';

interface AiAdviceProps {
  compact?: boolean;
}

export function AiAdvice({ compact = false }: AiAdviceProps) {
  console.log('AIアドバイスコンポーネントがレンダリングされました');
  const [advice, setAdvice] = useState<{ 
    meal_summary: string; 
    meal_detail: string; 
    exercise_summary: string; 
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

  // localStorageキー
  const getAdviceKey = () => {
    if (!userProfile) return "ai-advice-default";
    return `ai-advice-${userProfile.username}-${userProfile.goal_type}`;
  };

  // 目標カロリー計算関数
  const calculateTargetCalories = (profile: UserProfile): number => {
    const age = new Date().getFullYear() - new Date(profile.birth_date).getFullYear();
    let bmr = 0;
    
    if (profile.gender === 'male') {
      bmr = 88.362 + (13.397 * profile.initial_weight_kg) + (4.799 * profile.height_cm) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * profile.initial_weight_kg) + (3.098 * profile.height_cm) - (4.330 * age);
    }

    const activityMultipliers = [1.2, 1.375, 1.55, 1.725, 1.9];
    const tdee = bmr * activityMultipliers[profile.activity_level - 1];

    let targetCalories = tdee;
    if (profile.goal_type === 'diet') {
      targetCalories = tdee - 500;
    } else if (profile.goal_type === 'bulk-up') {
      targetCalories = tdee + 300;
    }
    
    return targetCalories;
  };

  // キャッシュから復元（シンプル版）
  useEffect(() => {
    if (userProfile && isFirstLoad.current) {
      console.log('キャッシュ復元処理開始');
      
      let cache = localStorage.getItem(getAdviceKey());
      let cacheKey = getAdviceKey();
      
      if (!cache) {
        const genericKey = `ai-advice-${userProfile.username}`;
        cache = localStorage.getItem(genericKey);
        cacheKey = genericKey;
        console.log('汎用キャッシュキーで検索:', genericKey);
      }
      
      if (cache) {
        try {
          const cachedAdvice = JSON.parse(cache);
          const cacheAge = Date.now() - (cachedAdvice.timestamp || 0);
          if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
            setAdvice(cachedAdvice.data || cachedAdvice);
            setLastUpdateTime(cachedAdvice.timestamp || Date.now());
            setHasEverUpdated(true);
            console.log('キャッシュからアドバイスを復元:', cachedAdvice.data || cachedAdvice);
            console.log('使用したキャッシュキー:', cacheKey);
            isFirstLoad.current = false;
            setUpdateButtonEnabled(true);
            console.log('キャッシュ復元 - 生成ボタンを有効化したまま維持');
          } else {
            console.log('キャッシュが期限切れです');
            localStorage.removeItem(cacheKey);
            isFirstLoad.current = false;
            setUpdateButtonEnabled(true);
          }
        } catch (error) {
          console.error('キャッシュの復元に失敗:', error);
          localStorage.removeItem(cacheKey);
          isFirstLoad.current = false;
          setUpdateButtonEnabled(true);
        }
      } else {
        console.log('キャッシュが見つかりません');
        isFirstLoad.current = false;
        setUpdateButtonEnabled(true);
        console.log('キャッシュなし - 更新ボタンを有効化');
      }
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
    };

    const handleProfileUpdated = () => {
      console.log('AIアドバイス - プロフィール更新イベントを受信');
      setUpdateButtonEnabled(true);
      console.log('プロフィール更新で更新ボタンを有効化しました');
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

      const [profileResult, dailyResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        (async () => {
          const today = new Date();
          const jstOffset = 9 * 60;
          const jstDate = new Date(today.getTime() + jstOffset * 60000);
          const todayDate = jstDate.toISOString().split('T')[0];
          
          return supabase
            .from('daily_summaries')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', todayDate)
            .single();
        })()
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
          food_preferences: profileResult.data.food_preferences
        };
        setUserProfile(userProfileData);
        console.log('プロフィールデータ設定完了:', userProfileData);
      } else {
        console.log('プロフィールデータが取得できませんでした');
      }

      if (dailyResult.error && dailyResult.error.code !== 'PGRST116') {
        console.error('日次データ取得エラー:', dailyResult.error);
        if (dataLoadAttempts.current < 2) {
          setTimeout(loadUserData, 500);
          return;
        }
      }

      if (dailyResult.data) {
        setDailyData(dailyResult.data);
        console.log('日次データ設定完了:', dailyResult.data);
      } else {
        setDailyData({
          total_calories: 0,
          total_protein: 0,
          total_fat: 0,
          total_carbs: 0
        });
        console.log('日次データなし、デフォルト値を設定');
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

    localStorage.removeItem(getAdviceKey());

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

  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-2">
        {isLoading ? (
          <p className="text-xs text-gray-500">生成中...</p>
        ) : advice ? (
          <div className="text-center space-y-1">
            <p className="text-xs text-gray-500">AIアドバイス</p>
            <p className="text-xs text-gray-700 whitespace-pre-line select-text">
              {advice.meal_summary}
              <br />
              {advice.exercise_summary}
            </p>
            <Button 
              variant="outline"
              size="sm" 
              onClick={fetchAdvice}
              disabled={isLoading}
              className="text-xs h-6 px-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              {isLoading ? "生成中" : "アドバイスを生成"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-gray-500">アドバイスなし</p>
        )}
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">AIアドバイス</CardTitle>
        </div>
        <Button 
            variant={updateButtonEnabled ? "default" : "outline"}
            size="sm" 
            onClick={fetchAdvice}
            disabled={isLoading}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isLoading ? "生成中..." : "アドバイスを生成"}
          </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-4 flex-1 flex flex-col">
          {isLoading ? (
            <div className="text-center py-4 flex-1 flex items-center justify-center">
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
              <div className="space-y-3 flex-1 flex flex-col">
                <div className="flex-1">
                  <h3 className="font-semibold text-green-700 mb-2">🍽️ 食事アドバイス</h3>
                  <div className="text-sm text-gray-700 leading-relaxed select-text">
                    {showDetails ? (
                      <div className="whitespace-pre-line max-h-48 overflow-y-auto select-text">
                        {advice.meal_detail}
                      </div>
                    ) : (
                      <span className="select-text">{advice.meal_summary}</span>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-700 mb-2">🏃‍♂️ 運動アドバイス</h3>
                  <div className="text-sm text-gray-700 leading-relaxed select-text">
                    {showDetails ? (
                      <div className="whitespace-pre-line max-h-48 overflow-y-auto select-text">
                        {advice.exercise_detail}
                      </div>
                    ) : (
                      <span className="select-text">{advice.exercise_summary}</span>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full mt-2 flex-shrink-0"
                >
                  {showDetails ? "要約を表示" : "詳細を見る"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 flex-1 flex items-center justify-center">
              <div>
                {!hasEverUpdated ? (
                  <>
                    <p className="text-gray-500">プロフィールを登録すると、パーソナライズされたアドバイスが表示されます。</p>
                    {userProfile && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-400">「アドバイスを生成」ボタンを押すと新しいアドバイスが生成されます。</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">アドバイスを読み込み中...</p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
