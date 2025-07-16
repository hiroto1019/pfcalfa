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
  const [advice, setAdvice] = useState<{ meal_advice: string; exercise_advice: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dailyData, setDailyData] = useState<any>(null);
  const [canUpdate, setCanUpdate] = useState(false);
  const supabase = createClient();
  const lastProfileHash = useRef<string | null>(null);
  const lastDailyHash = useRef<string | null>(null);

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
        setAdvice(JSON.parse(cache));
      }
    }
  }, [userProfile]);

  // プロフィール・日次データ取得
  useEffect(() => {
    loadUserData();
  }, []);

  // 食事記録イベントをリッスン
  useEffect(() => {
    const handleMealRecorded = () => {
      loadUserData();
    };

    window.addEventListener('mealRecorded', handleMealRecorded);
    return () => {
      window.removeEventListener('mealRecorded', handleMealRecorded);
    };
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profile) {
        setUserProfile({
          username: profile.username,
          gender: profile.gender,
          birth_date: profile.birth_date,
          height_cm: profile.height_cm,
          initial_weight_kg: profile.initial_weight_kg,
          target_weight_kg: profile.target_weight_kg,
          activity_level: profile.activity_level,
          goal_type: profile.goal_type,
          food_preferences: profile.food_preferences
        });
      }
      const today = new Date().toISOString().split('T')[0];
      const { data: dailySummary } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();
      if (dailySummary) {
        setDailyData(dailySummary);
      }
    } catch (error) {
      console.error('ユーザーデータ読み込みエラー:', error);
    }
  };

  // プロフィール・日次データの変更検知
  useEffect(() => {
    const profileHash = getHash(userProfile);
    const dailyHash = getHash(dailyData);
    if (lastProfileHash.current === null && lastDailyHash.current === null) {
      lastProfileHash.current = profileHash;
      lastDailyHash.current = dailyHash;
      setCanUpdate(false);
      return;
    }
    if (profileHash !== lastProfileHash.current || dailyHash !== lastDailyHash.current) {
      setCanUpdate(true);
    } else {
      setCanUpdate(false);
    }
  }, [userProfile, dailyData]);

  const fetchAdvice = async () => {
    if (!userProfile) return;
    setIsLoading(true);
    try {
      const adviceData = await getAiAdvice(userProfile, dailyData);
      setAdvice(adviceData);
      localStorage.setItem(getAdviceKey(), JSON.stringify(adviceData));
      // 更新後はハッシュを最新に
      lastProfileHash.current = getHash(userProfile);
      lastDailyHash.current = getHash(dailyData);
      setCanUpdate(false);
    } catch (error) {
      console.error('AIアドバイス取得エラー:', error);
      setAdvice({
        meal_advice: "データの読み込みに失敗しました。しばらく時間をおいて再度お試しください。",
        exercise_advice: "現在アドバイスを取得できません。"
      });
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
              {advice.meal_advice}
              <br />
              {advice.exercise_advice}
            </p>
            <Button 
              variant="outline"
              size="sm" 
              onClick={fetchAdvice}
              disabled={isLoading || !canUpdate}
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
            disabled={isLoading || !canUpdate}
          >
            {isLoading ? "更新中..." : canUpdate ? "更新" : "最新"}
          </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4">
              <p>AIアドバイスを生成中...</p>
            </div>
          ) : advice ? (
            <>
              <div>
                <h3 className="font-semibold text-green-700 mb-2">🍽️ 食事アドバイス</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {advice.meal_advice}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-blue-700 mb-2">🏃‍♂️ 運動アドバイス</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {advice.exercise_advice}
                </p>
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
