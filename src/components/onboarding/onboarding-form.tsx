"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
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
  const [birthDateOpen, setBirthDateOpen] = useState(false);
  const [goalDateOpen, setGoalDateOpen] = useState(false);
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
    if (!profile) return false;
    
    return (
      (profile.username?.trim() || "") !== "" &&
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
    <Card className="mx-4 max-w-md w-full">
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
              value={profile.gender}
              onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="">選択してください</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="birth_date">生年月日 <span className="text-red-500">*</span></Label>
            <Popover open={birthDateOpen} onOpenChange={setBirthDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {profile.birth_date ? (
                    format(new Date(profile.birth_date), "yyyy年MM月dd日", { locale: ja })
                  ) : (
                    <span className="text-muted-foreground">生年月日を選択</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={profile.birth_date ? new Date(profile.birth_date) : undefined}
                  onSelect={(date) => {
                    setProfile({ 
                      ...profile, 
                      birth_date: date ? format(date, "yyyy-MM-dd") : "" 
                    });
                    setBirthDateOpen(false);
                  }}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                  locale={ja}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="goal_target_date">目標達成日</Label>
            <Popover open={goalDateOpen} onOpenChange={setGoalDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {profile.goal_target_date ? (
                    format(new Date(profile.goal_target_date), "yyyy年MM月dd日", { locale: ja })
                  ) : (
                    <span className="text-muted-foreground">目標達成日を選択</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={profile.goal_target_date ? new Date(profile.goal_target_date) : undefined}
                  onSelect={(date) => {
                    setProfile({ 
                      ...profile, 
                      goal_target_date: date ? format(date, "yyyy-MM-dd") : "" 
                    });
                    setGoalDateOpen(false);
                  }}
                  disabled={(date) =>
                    date < new Date()
                  }
                  initialFocus
                  locale={ja}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="height_cm">身長 (cm) <span className="text-red-500">*</span></Label>
            <Input
              id="height_cm"
              type="number"
              value={profile.height_cm || ''}
              onChange={(e) => setProfile({ ...profile, height_cm: Number(e.target.value) || 0 })}
              placeholder="例: 170"
              min="100"
              max="250"
            />
          </div>
          <div>
            <Label htmlFor="initial_weight_kg" className="whitespace-nowrap">現在の体重 (kg) <span className="text-red-500">*</span></Label>
            <Input
              id="initial_weight_kg"
              type="number"
              value={profile.initial_weight_kg || ''}
              onChange={(e) => setProfile({ ...profile, initial_weight_kg: Number(e.target.value) || 0 })}
              placeholder="例: 65.5"
              min="30"
              max="200"
              step="0.1"
            />
          </div>
          <div>
            <Label htmlFor="target_weight_kg">目標体重 (kg) <span className="text-red-500">*</span></Label>
            <Input
              id="target_weight_kg"
              type="number"
              value={profile.target_weight_kg || ''}
              onChange={(e) => setProfile({ ...profile, target_weight_kg: Number(e.target.value) || 0 })}
              placeholder="例: 60.0"
              min="30"
              max="200"
              step="0.1"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="activity_level">活動レベル <span className="text-red-500">*</span></Label>
            <select
              id="activity_level"
              value={profile.activity_level}
              onChange={(e) => setProfile({ ...profile, activity_level: Number(e.target.value) })}
              className="w-full p-2 border rounded"
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
              value={profile.goal_type}
              onChange={(e) => setProfile({ ...profile, goal_type: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="">選択してください</option>
              <option value="diet">ダイエット</option>
              <option value="maintain">維持</option>
              <option value="bulk-up">増量</option>
            </select>
          </div>
        </div>
        
        {/* 必須項目の説明 */}
        <div className="text-sm text-gray-600">
          <span className="text-red-500">*</span> は必須項目です
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving || !isFormValid()} 
          className="w-full"
        >
          {isSaving ? '登録中...' : '登録して始める'}
        </Button>
        
        {/* フォームが無効な場合のメッセージ */}
        {!isFormValid() && (
          <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-md">
            全ての必須項目を入力してください
          </div>
        )}
      </CardContent>
    </Card>
  );
} 