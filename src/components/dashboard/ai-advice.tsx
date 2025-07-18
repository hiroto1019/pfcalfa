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
  const supabase = createClient();
  const lastProfileHash = useRef<string | null>(null);
  const lastDailyHash = useRef<string | null>(null);
  const dataLoadAttempts = useRef(0);

  // ハッシュ生成関数
  const getHash = (obj: any) => JSON.stringify(obj ?? {});

  // localStorageキー
  const getAdviceKey = () => {
    if (!userProfile) return "ai-advice-default";
    return `ai-advice-${userProfile.username}`;
  };

  // キャッシュから復元
  useEffect(() => {
    if (userProfile) {
      const cache = localStorage.getItem(getAdviceKey());
      if (cache) {
        try {
          const cachedAdvice = JSON.parse(cache);
          setAdvice(cachedAdvice);
        } catch (error) {
          console.error('キャッシュの復元に失敗:', error);
          localStorage.removeItem(getAdviceKey());
        }
      }
    }
  }, [userProfile]);

  // プロフィール・日次データ取得（改善版）
  useEffect(() => {
    loadUserData();
  }, []);

  // 食事記録イベントをリッスン
  useEffect(() => {
    const handleMealRecorded = () => {
      console.log('AIアドバイス - 食事記録イベントを受信');
      // 少し遅延させてからデータを再読み込み（DB更新を待つ）
      setTimeout(() => {
        loadUserData();
      }, 1000); // 500msから1000msに延長
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

      // プロフィールデータ取得
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('プロフィール取得エラー:', profileError);
        if (dataLoadAttempts.current < 3) {
          setTimeout(loadUserData, 1000);
          return;
        }
      }

      if (profile) {
        const userProfileData = {
          username: profile.username,
          gender: profile.gender,
          birth_date: profile.birth_date,
          height_cm: profile.height_cm,
          initial_weight_kg: profile.initial_weight_kg,
          target_weight_kg: profile.target_weight_kg,
          activity_level: profile.activity_level,
          goal_type: profile.goal_type,
          food_preferences: profile.food_preferences
        };
        setUserProfile(userProfileData);
        console.log('プロフィールデータ設定完了:', userProfileData);
      }

      // 今日の日付を取得（JST）
      const today = new Date();
      const jstOffset = 9 * 60; // JSTはUTC+9
      const jstDate = new Date(today.getTime() + jstOffset * 60000);
      const todayDate = jstDate.toISOString().split('T')[0];
      
      // 日次データ取得
      const { data: dailySummary, error: dailyError } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayDate)
        .single();

      if (dailyError && dailyError.code !== 'PGRST116') { // PGRST116はデータが見つからないエラー
        console.error('日次データ取得エラー:', dailyError);
        if (dataLoadAttempts.current < 3) {
          setTimeout(loadUserData, 1000);
          return;
        }
      }

      if (dailySummary) {
        setDailyData(dailySummary);
        console.log('日次データ設定完了:', dailySummary);
      } else {
        // データがない場合は空のオブジェクトを設定
        setDailyData({
          total_calories: 0,
          total_protein: 0,
          total_fat: 0,
          total_carbs: 0
        });
        console.log('日次データなし、デフォルト値を設定');
      }

      // データ読み込み完了フラグを設定
      setIsDataReady(true);
      dataLoadAttempts.current = 0; // リセット

    } catch (error) {
      console.error('ユーザーデータ読み込みエラー:', error);
      if (dataLoadAttempts.current < 3) {
        setTimeout(loadUserData, 1000);
      } else {
        setIsDataReady(true); // エラーでもフラグを設定
      }
    }
  };

  // プロフィール・日次データの変更検知
  useEffect(() => {
    if (!isDataReady) return; // データが準備できていない場合はスキップ

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

    setIsLoading(true);
    setRetryCount(prev => prev + 1);

    try {
      console.log('AIアドバイス取得開始:', { userProfile, dailyData });
      const adviceData = await getAiAdvice(userProfile, dailyData);
      
      if (adviceData) {
        setAdvice(adviceData);
        localStorage.setItem(getAdviceKey(), JSON.stringify(adviceData));
        // 更新後はハッシュを最新に
        lastProfileHash.current = getHash(userProfile);
        lastDailyHash.current = getHash(dailyData);
        setCanUpdate(false);
        setRetryCount(0); // 成功時にリセット
        console.log('AIアドバイス取得成功:', adviceData);
      } else {
        throw new Error('アドバイスデータが空です');
      }
    } catch (error) {
      console.error('AIアドバイス取得エラー:', error);
      
      // リトライロジック（最大3回）
      if (retryCount < 3) {
        console.log(`${retryCount}回目のリトライを実行します...`);
        setTimeout(() => {
          fetchAdvice();
        }, 2000 * (retryCount + 1)); // 指数バックオフ
        return;
      }

      // 最終的なフォールバック
      setAdvice({
        meal_summary: "データの読み込みに失敗しました。",
        meal_detail: "データの読み込みに失敗しました。しばらく時間をおいて再度お試しください。",
        exercise_summary: "現在アドバイスを取得できません。",
        exercise_detail: "現在アドバイスを取得できません。しばらく時間をおいて再度お試しください。"
      });
      setRetryCount(0); // リセット
    } finally {
      setIsLoading(false);
    }
  };

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
              disabled={isLoading || !canUpdate || !isDataReady}
              className="text-xs h-6 px-2"
            >
              {canUpdate ? "更新" : "最新"}
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
            disabled={isLoading || !canUpdate || !isDataReady}
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
              
              <div className="text-xs text-gray-400 mt-2">※前回生成したアドバイスを表示中</div>
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
