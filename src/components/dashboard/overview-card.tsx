"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { type Profile } from "@/app/page"; // Profile型をインポート
import { toast } from "sonner";


interface OverviewCardProps {
  profile: Profile;
  onUpdate: () => void;
}

export function OverviewCard({ profile, onUpdate }: OverviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    current_weight_kg: profile.current_weight_kg ?? 0,
    activity_level: profile.activity_level ?? 'sedentary',
    target_weight_kg: profile.target_weight_kg ?? 0,
    goal_type: profile.goal_type ?? 'lose_weight',
  });
  const supabase = createClient();

  useEffect(() => {
    setFormData({
      current_weight_kg: profile.current_weight_kg ?? 0,
      activity_level: profile.activity_level ?? 'sedentary',
      target_weight_kg: profile.target_weight_kg ?? 0,
      goal_type: profile.goal_type ?? 'lose_weight',
    });
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        toast.error("ユーザー情報が見つかりません。");
        setIsSaving(false);
        return;
    }

    // profilesテーブルを更新
    const { error } = await supabase
      .from('profiles')
      .update({
        current_weight_kg: formData.current_weight_kg > 0 ? formData.current_weight_kg : null,
        activity_level: formData.activity_level,
        target_weight_kg: formData.target_weight_kg > 0 ? formData.target_weight_kg : null,
        goal_type: formData.goal_type,
      })
      .eq('id', user.id);

    if (error) {
      toast.error("プロフィールの更新に失敗しました。");
      console.error("Error updating profile:", error);
    } else {
      toast.success("プロフィールを更新しました。");
      onUpdate(); // 親コンポーネントに更新を通知
    }
    
    setIsSaving(false);
    setIsEditing(false);
  };
  
  const activityLevelMap: { [key: string]: string } = {
    sedentary: '座り仕事中心（運動なし）',
    lightly_active: '軽い運動（週1-2回）',
    moderately_active: '中程度の運動（週3-5回）',
    very_active: '激しい運動（週6-7回）',
    extra_active: '非常に激しい運動',
  };

  const goalTypeMap: { [key: string]: string } = {
    lose_weight: '減量',
    gain_weight: '増量',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">今日のサマリーと目標</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>{isEditing ? 'キャンセル' : '編集'}</Button>
      </CardHeader>
      <CardContent className="pt-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="current_weight_kg">今日の体重 (kg)</Label>
              <Input id="current_weight_kg" type="number" value={formData.current_weight_kg} onChange={e => setFormData({...formData, current_weight_kg: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <Label>活動レベル</Label>
              <Select value={String(formData.activity_level)} onValueChange={value => setFormData({...formData, activity_level: value})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(activityLevelMap).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="target_weight_kg">目標体重 (kg)</Label>
              <Input id="target_weight_kg" type="number" value={formData.target_weight_kg} onChange={e => setFormData({...formData, target_weight_kg: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <Label>目標</Label>
               <Select value={formData.goal_type} onValueChange={value => setFormData({...formData, goal_type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                   {Object.entries(goalTypeMap).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "保存中..." : "保存"}</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                <p className="text-sm text-gray-500">今日の体重</p>
                <p className="text-2xl font-bold">{formData.current_weight_kg}kg</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                <p className="text-sm text-gray-500">目標体重</p>
                <p className="text-2xl font-bold text-green-600">{formData.target_weight_kg}kg</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                <p className="text-sm text-gray-500">活動レベル</p>
                <p className="font-semibold truncate text-sm" title={activityLevelMap[formData.activity_level]}>{activityLevelMap[formData.activity_level]}</p>
            </div>
             <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                <p className="text-sm text-gray-500">目標</p>
                <p className="text-lg font-semibold">{goalTypeMap[formData.goal_type] ?? '未設定'}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 