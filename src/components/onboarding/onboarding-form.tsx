"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

interface OnboardingFormProps {
  user: any;
  onboardingComplete: () => void;
}

export function OnboardingForm({ user, onboardingComplete }: OnboardingFormProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    } else {
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
        goal_target_date: "",
      });
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          ...profile,
          onboarding_completed: true,
        });

      if (error) throw error;
      alert('プロフィールを登録しました');
      onboardingComplete();
    } catch (error) {
      console.error('プロフィール登録エラー:', error);
      alert('プロフィールの登録に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return <div>読み込み中...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ようこそ！</CardTitle>
        <CardDescription>
          最適なカロリー計算のため、あなたのことを教えてください。
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
              className="w-full p-2 border rounded"
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
              value={profile.initial_weight_kg}
              onChange={(e) => setProfile({ ...profile, initial_weight_kg: Number(e.target.value) })}
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
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? '登録中...' : '登録して始める'}
        </Button>
      </CardContent>
    </Card>
  );
} 