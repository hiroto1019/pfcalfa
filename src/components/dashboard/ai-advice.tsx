"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { getAiAdvice, UserProfile } from "@/lib/grok";
import { createClient } from "@/lib/supabase/client";

interface AiAdviceProps {
  compact?: boolean;
}

export function AiAdvice({ compact = false }: AiAdviceProps) {
  const [advice, setAdvice] = useState<{ 
    meal_summary: string; 
    meal_detail: string; 
    exercise_summary: string; 
    exercise_detail: string 
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dailyData, setDailyData] = useState<any>(null);
  const [canUpdate, setCanUpdate] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const supabase = createClient();
  const lastProfileHash = useRef<string | null>(null);
  const lastDailyHash = useRef<string | null>(null);
  const dataLoadAttempts = useRef(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const forceUpdateRef = useRef(false);
  const isFirstLoad = useRef(true);

  // ハッシュ生成関数（最適化版）
  const getHash = (obj: any) => {
    if (!obj) return 'null';
    // 重要なフィールドのみをハッシュ化（高速化）
    const keyFields = obj.username ? {
      username: obj.username,
      goal_type: obj.goal_type,
      activity_level: obj.activity_level,
      total_calories: obj.total_calories || 0,
      total_protein: obj.total_protein || 0,
      total_fat: obj.total_fat || 0,
      total_carbs: obj.total_carbs || 0
    } : obj;
    return JSON.stringify(keyFields);
  };

  // localStorageキー（最適化版）
  const getAdviceKey = () => {
    if (!userProfile) return "ai-advice-default";
    const targetCalories = calculateTargetCalories(userProfile);
    const calorieRange = dailyData ? Math.floor((dailyData.total_calories || 0) / 100) * 100 : 0;
    return `ai-advice-${userProfile.username}-${userProfile.goal_type}-${calorieRange}-${Math.round(targetCalories / 100) * 100}`;
  };

  // 目標カロリー計算関数（フロントエンド版）
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

  // キャッシュから復元（改善版）
  useEffect(() => {
    if (userProfile && !forceUpdateRef.current && isFirstLoad.current) {
      const cache = localStorage.getItem(getAdviceKey());
      if (cache) {
        try {
          const cachedAdvice = JSON.parse(cache);
          // キャッシュの有効期限をチェック（20分に短縮）
          const cacheAge = Date.now() - (cachedAdvice.timestamp || 0);
          if (cacheAge < 20 * 60 * 1000) { // 20分以内
            setAdvice(cachedAdvice.data || cachedAdvice);
            setLastUpdateTime(cachedAdvice.timestamp || Date.now());
            console.log('キャッシュからアドバイスを復元');
            isFirstLoad.current = false;
          } else {
            localStorage.removeItem(getAdviceKey());
          }
        } catch (error) {
          console.error('キャッシュの復元に失敗:', error);
          localStorage.removeItem(getAdviceKey());
        }
      }
    }
  }, [userProfile, dailyData]);

  // プロフィール・日次データ取得（最適化版）
  useEffect(() => {
    loadUserData();
  }, []);

  // 食事記録イベントをリッスン（改善版）
  useEffect(() => {
    const handleMealRecorded = () => {
      console.log('AIアドバイス - 食事記録イベントを受信');
      // 強制更新フラグを設定
      forceUpdateRef.current = true;
      // 遅延を短縮（高速化）
      setTimeout(() => {
        loadUserData();
      }, 500);
    };

    window.addEventListener('mealRecorded', handleMealRecorded);
    return () => {
      window.removeEventListener('mealRecorded', handleMealRecorded);
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

      // プロフィールデータ取得（並列処理で高速化）
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

    } catch (error) {
      console.error('ユーザーデータ読み込みエラー:', error);
      if (dataLoadAttempts.current < 2) {
        setTimeout(loadUserData, 500);
      } else {
        setIsDataReady(true);
      }
    }
  };

  // プロフィール・日次データの変更検知（改善版）
  useEffect(() => {
    if (!isDataReady) return;

    const profileHash = getHash(userProfile);
    const dailyHash = getHash(dailyData);
    
    if (lastProfileHash.current === null && lastDailyHash.current === null) {
      lastProfileHash.current = profileHash;
      lastDailyHash.current = dailyHash;
      setCanUpdate(false);
      // 初回データ読み込み完了時に自動でアドバイスを取得
      if (userProfile) {
        fetchAdvice();
      }
      return;
    }
    
    // 強制更新フラグが設定されている場合は更新可能にする
    if (forceUpdateRef.current) {
      setCanUpdate(true);
      forceUpdateRef.current = false;
      return;
    }
    
    if (profileHash !== lastProfileHash.current || dailyHash !== lastDailyHash.current) {
      setCanUpdate(true);
    } else {
      setCanUpdate(false);
    }
  }, [userProfile, dailyData, isDataReady]);

  const fetchAdvice = async () => {
    if (!userProfile || !isDataReady) {
      console.log('プロフィールまたはデータが準備できていません');
      return;
    }

    // 既存のタイムアウトをクリア
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    setIsLoading(true);
    setRetryCount(prev => prev + 1);

    try {
      console.log('AIアドバイス取得開始:', { userProfile, dailyData });
      
      // 8秒タイムアウトに延長（高品質なアドバイス生成のため）
      const timeoutPromise = new Promise((_, reject) => {
        fetchTimeoutRef.current = setTimeout(() => {
          reject(new Error('タイムアウト'));
        }, 8000);
      });

      const advicePromise = getAiAdvice(userProfile, dailyData);
      
      const adviceData = await Promise.race([advicePromise, timeoutPromise]) as any;
      
      // タイムアウトをクリア
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      
      if (adviceData) {
        setAdvice(adviceData);
        const currentTime = Date.now();
        setLastUpdateTime(currentTime);
        // キャッシュにタイムスタンプ付きで保存
        localStorage.setItem(getAdviceKey(), JSON.stringify({
          data: adviceData,
          timestamp: currentTime
        }));
        lastProfileHash.current = getHash(userProfile);
        lastDailyHash.current = getHash(dailyData);
        setCanUpdate(false);
        setRetryCount(0);
        isFirstLoad.current = false;
        console.log('AIアドバイス取得成功:', adviceData);
      } else {
        throw new Error('アドバイスデータが空です');
      }
    } catch (error) {
      console.error('AIアドバイス取得エラー:', error);
      
      // タイムアウトをクリア
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      
      // リトライロジック（最大2回に増加）
      if (retryCount < 2) {
        console.log(`${retryCount}回目のリトライを実行します...`);
        setTimeout(() => {
          fetchAdvice();
        }, 1000 * (retryCount + 1)); // 指数バックオフ: 1秒、2秒
        return;
      }

      // 最終的なフォールバック（改善版）
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
            <p className="text-xs text-gray-700 whitespace-pre-line">
              {advice.meal_summary}
              <br />
              {advice.exercise_summary}
            </p>
            <Button 
              variant="outline"
              size="sm" 
              onClick={fetchAdvice}
              disabled={isLoading || !isDataReady}
              className="text-xs h-6 px-2"
            >
              {isLoading ? "更新中" : "更新"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-gray-500">アドバイスなし</p>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-base font-semibold">AIアドバイス</CardTitle>
        <Button 
            variant={canUpdate ? "default" : "outline"}
            size="sm" 
            onClick={fetchAdvice}
            disabled={isLoading || !isDataReady}
          >
            {isLoading ? "更新中..." : canUpdate ? "更新" : "最新"}
          </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4">
              <p>AIアドバイスを生成中...</p>
              {retryCount > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  {retryCount}回目の試行中...
                </p>
              )}
            </div>
          ) : advice ? (
            <>
              {/* 要約表示 */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-green-700 mb-2">🍽️ 食事アドバイス</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {showDetails ? (
                      <div className="whitespace-pre-line">
                        {advice.meal_detail}
                      </div>
                    ) : (
                      advice.meal_summary
                    )}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-700 mb-2">🏃‍♂️ 運動アドバイス</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {showDetails ? (
                      <div className="whitespace-pre-line">
                        {advice.exercise_detail}
                      </div>
                    ) : (
                      advice.exercise_summary
                    )}
                  </p>
                </div>
                
                {/* 詳細表示切り替えボタン - 常に表示 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full mt-2"
                >
                  {showDetails ? "要約を表示" : "詳細を見る"}
                </Button>
              </div>
              
              <div className="text-xs text-gray-400 mt-2">
                ※{lastUpdateTime ? new Date(lastUpdateTime).toLocaleTimeString('ja-JP') : '不明'}に生成
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">プロフィールを登録すると、パーソナライズされたアドバイスが表示されます。</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
