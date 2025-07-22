"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleDatePicker } from "@/components/ui/simple-date-picker";

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

  // 必須項目チェック関数
  const isFormValid = () => {
    if (!profile) {
      return false;
    }
    
    return (
      profile.username?.trim() !== "" &&
      profile.gender !== "" &&
      profile.birth_date !== "" &&
      profile.height_cm > 0 &&
      profile.initial_weight_kg > 0 &&
      profile.target_weight_kg > 0 &&
      profile.activity_level > 0 &&
      profile.goal_type !== ""
    );
  };

  const handleSave = async () => {
    if (!profile || !isFormValid()) return;

    setIsSaving(true);
    try {
      // プロフィールを更新または新規作成
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: profile.username?.trim() || null,
          gender: profile.gender,
          birth_date: profile.birth_date,
          height_cm: profile.height_cm,
          initial_weight_kg: profile.initial_weight_kg,
          target_weight_kg: profile.target_weight_kg,
          activity_level: profile.activity_level,
          goal_type: profile.goal_type,
          goal_target_date: profile.goal_target_date,
          food_preferences: profile.food_preferences,
          onboarding_completed: true,
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('プロフィール保存エラー:', error);
        throw error;
      }
      
      console.log('オンボーディング - 保存されたプロフィール:', {
        id: user.id,
        username: profile.username?.trim() || null,
        gender: profile.gender,
        birth_date: profile.birth_date,
        height_cm: profile.height_cm,
        initial_weight_kg: profile.initial_weight_kg,
        target_weight_kg: profile.target_weight_kg,
        activity_level: profile.activity_level,
        goal_type: profile.goal_type,
        goal_target_date: profile.goal_target_date,
        food_preferences: profile.food_preferences,
        onboarding_completed: true,
      });
      
      onboardingComplete();
    } catch (error: any) {
      console.error('プロフィール登録エラー:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return <div>読み込み中...</div>;
  }

  return (
    <Card className="mx-4 max-w-lg md:max-w-2xl w-full">
      <CardHeader className="text-center">
        <CardTitle>ようこそ！</CardTitle>
        <CardDescription>
          最適なカロリー計算のため、あなたのことを教えてください。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="username">お名前 <span className="text-red-500">*</span></Label>
            <Input
              id="username"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              placeholder="例: 田中太郎"
            />
          </div>
          <div>
            <Label htmlFor="gender">性別 <span className="text-red-500">*</span></Label>
            <select
              id="gender"
              value={profile.gender || ""}
              onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
              className="w-full h-9 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">選択してください</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <div className="flex-1 min-w-0">
            <div className="space-y-2 w-full">
              <label className="text-sm font-medium text-gray-700">
                生年月日 <span className="text-red-500">*</span>
              </label>
              <SimpleDatePicker
                value={profile.birth_date ? new Date(profile.birth_date) : undefined}
                onChange={(date) => setProfile({ ...profile, birth_date: date ? date.toISOString().split('T')[0] : '' })}
                placeholder="生年月日を選択"
                className="w-full"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="space-y-2 w-full">
              <label className="text-sm font-medium text-gray-700">目標達成日</label>
              <SimpleDatePicker
                value={profile.goal_target_date ? new Date(profile.goal_target_date) : undefined}
                onChange={(date) => setProfile({ ...profile, goal_target_date: date ? date.toISOString().split('T')[0] : '' })}
                placeholder="目標達成日を選択"
                className="w-full"
                allowFuture={true}
                maxYearOffset={50}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <div className="flex-1 min-w-0">
            <Label htmlFor="height_cm">身長 <span className="text-red-500">*</span></Label>
            <Input
              id="height_cm"
              type="number"
              value={profile.height_cm || ''}
              onChange={(e) => setProfile({ ...profile, height_cm: Number(e.target.value) || 0 })}
              placeholder="170 cm"
              min="100"
              max="250"
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <Label htmlFor="initial_weight_kg" className="whitespace-nowrap">現在の体重 <span className="text-red-500">*</span></Label>
            <Input
              id="initial_weight_kg"
              type="number"
              value={profile.initial_weight_kg || ''}
              onChange={(e) => setProfile({ ...profile, initial_weight_kg: Number(e.target.value) || 0 })}
              placeholder="65.5 kg"
              min="30"
              max="200"
              step="0.1"
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <Label htmlFor="target_weight_kg" className="whitespace-nowrap">目標体重 <span className="text-red-500">*</span></Label>
            <Input
              id="target_weight_kg"
              type="number"
              value={profile.target_weight_kg || ''}
              onChange={(e) => setProfile({ ...profile, target_weight_kg: Number(e.target.value) || 0 })}
              placeholder="60.0 kg"
              min="30"
              max="200"
              step="0.1"
              className="w-full"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="activity_level">活動レベル <span className="text-red-500">*</span></Label>
            <select
              id="activity_level"
              value={profile.activity_level || 0}
              onChange={(e) => setProfile({ ...profile, activity_level: Number(e.target.value) })}
              className="w-full h-9 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                lineHeight: '36px',
                paddingTop: '0',
                paddingBottom: '0',
              }}
            >
              <option value={0}>選択してください</option>
              <option value={1}>座り仕事中心（運動なし）</option>
              <option value={2}>軽い運動（週1-2回）</option>
              <option value={3}>中程度の運動（週3-5回）</option>
              <option value={4}>激しい運動（週6-7回）</option>
              <option value={5}>非常に激しい運動</option>
            </select>
          </div>
          <div>
            <Label htmlFor="goal_type">目標 <span className="text-red-500">*</span></Label>
            <select
              id="goal_type"
              value={profile.goal_type || ""}
              onChange={(e) => setProfile({ ...profile, goal_type: e.target.value })}
              className="w-full h-9 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                lineHeight: '36px',
                paddingTop: '0',
                paddingBottom: '0',
              }}
            >
              <option value="">選択してください</option>
              <option value="diet">ダイエット</option>
              <option value="maintain">維持</option>
              <option value="bulk">増量</option>
            </select>
          </div>
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving || !isFormValid()} 
          className="w-full"
        >
          {isSaving ? '登録中...' : '登録して始める'}
        </Button>
      </CardContent>
    </Card>
  );
} 