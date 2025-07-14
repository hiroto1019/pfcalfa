"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProfileGoals } from "./actions"; // 新しいアクションをインポート
import { toast } from "sonner"; // トースト通知用

interface OverviewCardProps {
  profile: {
    target_weight_kg: number | null;
    activity_level: number | null;
    goal_type: string | null;
    // 他に必要なプロパティがあれば追加
  };
  onUpdate: () => void;
}

export function OverviewCard({ profile, onUpdate }: OverviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    targetWeight: profile.target_weight_kg ?? 0,
    activityLevel: profile.activity_level ?? 2,
    goalType: profile.goal_type ?? 'diet',
  });

  useEffect(() => {
    setFormData({
      targetWeight: profile.target_weight_kg ?? 0,
      activityLevel: profile.activity_level ?? 2,
      goalType: profile.goal_type ?? 'diet',
    });
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateProfileGoals({
      target_weight_kg: formData.targetWeight > 0 ? formData.targetWeight : null,
      activity_level: formData.activityLevel,
      goal_type: formData.goalType,
    });
    setIsSaving(false);

    if (result.success) {
      toast.success("目標を更新しました！");
      setIsEditing(false);
      onUpdate(); // ダッシュボード全体を再更新
    } else {
      toast.error(result.error);
    }
  };
  
  const activityLevelMap: { [key: number]: string } = {
    1: '座り仕事中心（運動なし）',
    2: '軽い運動（週1-2回）',
    3: '中程度の運動（週3-5回）',
    4: '激しい運動（週6-7回）',
    5: '非常に激しい運動',
  };

  const goalTypeMap: { [key: string]: string } = {
    'lose_weight': '減量',
    'maintain': '維持',
    'gain_muscle': '増量',
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
              <Label htmlFor="target_weight">目標体重 (kg)</Label>
              <Input id="target_weight" type="number" value={formData.targetWeight} onChange={e => setFormData({...formData, targetWeight: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <Label>目的</Label>
              <Select value={formData.goalType} onValueChange={value => setFormData({...formData, goalType: value})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose_weight">{goalTypeMap['lose_weight']}</SelectItem>
                  <SelectItem value="maintain">{goalTypeMap['maintain']}</SelectItem>
                  <SelectItem value="gain_muscle">{goalTypeMap['gain_muscle']}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>活動レベル</Label>
              <Select value={String(formData.activityLevel)} onValueChange={value => setFormData({...formData, activityLevel: Number(value)})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{activityLevelMap[1]}</SelectItem>
                  <SelectItem value="2">{activityLevelMap[2]}</SelectItem>
                  <SelectItem value="3">{activityLevelMap[3]}</SelectItem>
                  <SelectItem value="4">{activityLevelMap[4]}</SelectItem>
                  <SelectItem value="5">{activityLevelMap[5]}</SelectItem>
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
                <p className="text-sm text-gray-500">目標体重</p>
                <p className="text-2xl font-bold text-green-600">{formData.targetWeight}kg</p>
            </div>
             <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                <p className="text-sm text-gray-500">目的</p>
                <p className="text-lg font-semibold">{goalTypeMap[formData.goalType] ?? '未設定'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 col-span-2 text-center flex flex-col justify-center">
                <p className="text-sm text-gray-500">活動レベル</p>
                <p className="font-semibold truncate text-sm" title={activityLevelMap[formData.activityLevel]}>{activityLevelMap[formData.activityLevel]}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 