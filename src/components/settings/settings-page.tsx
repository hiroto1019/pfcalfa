"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { deleteUser } from "@/app/settings/actions";

interface Profile {
  id: string;
  username: string;
  gender: string;
  birth_date: string;
  height_cm: number;
  initial_weight_kg: number;
  target_weight_kg: number;
  activity_level: number;
  goal_type: string;
  food_preferences?: {
    dislikes: string[];
    allergies: string[];
  };
  goal_target_date?: string;
}

export function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [newDislike, setNewDislike] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // ダッシュボードと同様に複数テーブルからデータを取得
      const { data: profileData } = await supabase
        .from('profiles')
        .select(`
          *,
          goals(*),
          daily_activity_logs(*)
        `)
        .eq('id', user.id)
        .single();

      const { data: latestWeightLog } = await supabase
        .from('daily_weight_logs')
        .select('weight_kg')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (profileData) {
        // 取得したデータを統合してstateにセット
        const combinedData = {
          ...profileData,
          target_weight_kg: profileData.goals[0]?.target_weight_kg ?? 0,
          goal_target_date: profileData.goals[0]?.target_date,
          activity_level: profileData.daily_activity_logs[0]?.activity_level ?? profileData.activity_level ?? 2,
        };
        setProfile(combinedData);
        setCurrentWeight(latestWeightLog?.weight_kg ?? profileData.initial_weight_kg);
      } else if (user) {
        // プロフィールが存在しない場合、空のフォームを表示するためにデフォルト値を設定
        setProfile({
          id: user.id,
          username: "",
          gender: "male",
          birth_date: "",
          height_cm: 0,
          initial_weight_kg: 0,
          target_weight_kg: 0,
          activity_level: 2,
          goal_type: 'diet',
          food_preferences: { dislikes: [], allergies: [] },
        });
      }
      setIsLoading(false);
    };
    loadData();
  }, [supabase, router]);


  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setIsSaving(false);
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];

    // 1. プロフィール本体の更新（目標関連以外）
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: profile.id,
      username: profile.username,
      gender: profile.gender,
      birth_date: profile.birth_date,
      height_cm: profile.height_cm,
      initial_weight_kg: profile.initial_weight_kg,
      food_preferences: profile.food_preferences,
      // `onboarding_completed`はここで更新し続ける
      onboarding_completed: true, 
    });

    // 2. 今日の体重を更新
    const { error: weightError } = await supabase.from('daily_weight_logs').upsert(
      { user_id: user.id, date: today, weight_kg: currentWeight },
      { onConflict: 'user_id, date' }
    );

    // 3. 今日の活動レベルを更新
    const { error: activityError } = await supabase.from('daily_activity_logs').upsert(
      { user_id: user.id, date: today, activity_level: profile.activity_level },
      { onConflict: 'user_id, date' }
    );

    // 4. 目標を更新 (存在確認してから追加 or 更新)
    const { data: existingGoal, error: selectError } = await supabase.from('goals').select('id').eq('user_id', user.id).single();

    let goalError;
    const goalData = {
        target_weight_kg: profile.target_weight_kg > 0 ? profile.target_weight_kg : null,
        target_date: profile.goal_target_date || null,
        current_weight_kg: currentWeight,
        goal_type: profile.goal_type,
    };

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116はデータなしエラー
        goalError = selectError;
    } else if (existingGoal) {
        const { error } = await supabase.from('goals').update(goalData).eq('id', existingGoal.id);
        goalError = error;
    } else {
        const { error } = await supabase.from('goals').insert({ user_id: user.id, ...goalData });
        goalError = error;
    }

    if (profileError || weightError || activityError || goalError) {
      console.error({ profileError, weightError, activityError, goalError });
      alert('プロフィールの更新に失敗しました');
    } else {
      alert('プロフィールを更新しました');
    }

    setIsSaving(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== '削除') {
      alert('「削除」と入力してください');
      return;
    }

    try {
      const result = await deleteUser();
      if (result?.error) {
        throw new Error(result.error);
      }
      alert('アカウントを削除しました');
      // Redirect is handled by the server action
    } catch (error) {
      console.error('アカウント削除エラー:', error);
      alert('アカウントの削除に失敗しました');
    }
  };

  const addDislike = () => {
    if (!newDislike.trim() || !profile) return;
    
    const dislikes = profile.food_preferences?.dislikes || [];
    if (!dislikes.includes(newDislike)) {
      setProfile({
        ...profile,
        food_preferences: {
          dislikes: [...dislikes, newDislike],
          allergies: profile.food_preferences?.allergies || []
        }
      });
    }
    setNewDislike("");
  };

  const removeDislike = (dislike: string) => {
    if (!profile) return;
    
    const dislikes = profile.food_preferences?.dislikes || [];
    setProfile({
      ...profile,
      food_preferences: {
        dislikes: dislikes.filter(d => d !== dislike),
        allergies: profile.food_preferences?.allergies || []
      }
    });
  };

  const addAllergy = () => {
    if (!newAllergy.trim() || !profile) return;
    
    const allergies = profile.food_preferences?.allergies || [];
    if (!allergies.includes(newAllergy)) {
      setProfile({
        ...profile,
        food_preferences: {
          dislikes: profile.food_preferences?.dislikes || [],
          allergies: [...allergies, newAllergy]
        }
      });
    }
    setNewAllergy("");
  };

  const removeAllergy = (allergy: string) => {
    if (!profile) return;
    
    const allergies = profile.food_preferences?.allergies || [];
    setProfile({
      ...profile,
      food_preferences: {
        dislikes: profile.food_preferences?.dislikes || [],
        allergies: allergies.filter(a => a !== allergy)
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <p>プロフィールが見つかりません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">設定</h1>
        <Button variant="outline" onClick={() => router.push('/')}>
          ダッシュボードに戻る
        </Button>
      </div>

      {/* プロフィール編集 */}
      <Card>
        <CardHeader>
          <CardTitle>プロフィール編集</CardTitle>
          <CardDescription>
            基本情報を編集できます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">お名前</Label>
              <Input
                id="username"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="gender">性別</Label>
              <select
                id="gender"
                value={profile.gender}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birth_date">生年月日</Label>
              <Input
                id="birth_date"
                type="date"
                value={profile.birth_date ? profile.birth_date.split('T')[0] : ''}
                onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="goal_target_date">目標達成日</Label>
              <Input
                id="goal_target_date"
                type="date"
                value={profile.goal_target_date ? profile.goal_target_date.split('T')[0] : ''}
                onChange={(e) => setProfile({ ...profile, goal_target_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="height_cm">身長 (cm)</Label>
              <Input
                id="height_cm"
                type="number"
                value={profile.height_cm}
                onChange={(e) => setProfile({ ...profile, height_cm: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="initial_weight_kg">現在の体重 (kg)</Label>
              <Input
                id="initial_weight_kg"
                type="number"
                value={currentWeight ?? ''}
                onChange={(e) => setCurrentWeight(parseFloat(e.target.value) || null)}
                step="0.1"
              />
            </div>
            <div>
              <Label htmlFor="target_weight_kg">目標体重 (kg)</Label>
              <Input
                id="target_weight_kg"
                type="number"
                value={profile.target_weight_kg}
                onChange={(e) => setProfile({ ...profile, target_weight_kg: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="activity_level">活動レベル</Label>
              <select
                id="activity_level"
                value={profile.activity_level}
                onChange={(e) => setProfile({ ...profile, activity_level: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              >
                <option value={1}>座り仕事中心（運動なし）</option>
                <option value={2}>軽い運動（週1-2回）</option>
                <option value={3}>中程度の運動（週3-5回）</option>
                <option value={4}>激しい運動（週6-7回）</option>
                <option value={5}>非常に激しい運動</option>
              </select>
            </div>
            <div>
              <Label htmlFor="goal_type">目標</Label>
              <select
                id="goal_type"
                value={profile.goal_type}
                onChange={(e) => setProfile({ ...profile, goal_type: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="diet">ダイエット</option>
                <option value="maintain">維持</option>
                <option value="bulk-up">増量</option>
              </select>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </CardContent>
      </Card>

      {/* 食事の好み */}
      <Card>
        <CardHeader>
          <CardTitle>食事の好み</CardTitle>
          <CardDescription>
            嫌いな食べ物やアレルギーを登録すると、AIが食事メニューを提案する際に除外されます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 嫌いな食べ物 */}
          <div>
            <Label>嫌いな食べ物</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newDislike}
                onChange={(e) => setNewDislike(e.target.value)}
                placeholder="例: トマト"
                onKeyPress={(e) => e.key === 'Enter' && addDislike()}
              />
              <Button onClick={addDislike}>追加</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.food_preferences?.dislikes?.map((dislike, index) => (
                <span
                  key={index}
                  className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm flex items-center gap-1"
                >
                  {dislike}
                  <button
                    onClick={() => removeDislike(dislike)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* アレルギー */}
          <div>
            <Label>アレルギー</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                placeholder="例: えび"
                onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
              />
              <Button onClick={addAllergy}>追加</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.food_preferences?.allergies?.map((allergy, index) => (
                <span
                  key={index}
                  className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm flex items-center gap-1"
                >
                  {allergy}
                  <button
                    onClick={() => removeAllergy(allergy)}
                    className="text-orange-600 hover:text-orange-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アカウント管理 */}
      <Card>
        <CardHeader>
          <CardTitle>アカウント管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={handleLogout}>
            ログアウト
          </Button>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-red-600 mb-2">危険な操作</h3>
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteConfirm(true)}
            >
              アカウント削除
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* アカウント削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-red-600">アカウント削除の確認</CardTitle>
              <CardDescription>
                本当にアカウントを削除しますか？全てのデータが完全に削除され、元に戻すことはできません。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="delete-confirm">
                  削除を確認するには「削除」と入力してください
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  placeholder="削除"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteText("");
                  }}
                >
                  キャンセル
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                  disabled={deleteText !== '削除'}
                >
                  削除
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
