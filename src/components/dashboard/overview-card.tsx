"use client";

import { useState, Dispatch, SetStateAction } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateDashboardData } from "./actions";
import { toast } from "sonner";

interface FormData {
  currentWeight: number;
  targetWeight: number;
  activityLevel: number;
  goalDate: string;
}

interface OverviewCardProps {
  formData: FormData;
  setFormData: Dispatch<SetStateAction<FormData>>;
  onUpdate: () => void;
}

export function OverviewCard({ formData, setFormData, onUpdate }: OverviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateDashboardData({
      current_weight_kg: formData.currentWeight > 0 ? formData.currentWeight : null,
      target_weight_kg: formData.targetWeight > 0 ? formData.targetWeight : null,
      activity_level: formData.activityLevel,
      goal_target_date: formData.goalDate === "" ? null : formData.goalDate,
    });
    setIsSaving(false);

    if (result.success) {
      toast.success("情報を更新しました！");
      setIsEditing(false);
      onUpdate();
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
              <Label htmlFor="weight">今日の体重 (kg)</Label>
              <Input id="weight" type="number" value={formData.currentWeight} onChange={e => setFormData({...formData, currentWeight: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <Label htmlFor="target_weight">目標体重 (kg)</Label>
              <Input id="target_weight" type="number" value={formData.targetWeight} onChange={e => setFormData({...formData, targetWeight: parseFloat(e.target.value) || 0})} />
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
             <div>
              <Label htmlFor="target_date">目標達成日</Label>
              <Input id="target_date" type="date" value={formData.goalDate} onChange={e => setFormData({...formData, goalDate: e.target.value})} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "保存中..." : "保存"}</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                <p className="text-sm text-gray-500">今日の体重</p>
                <p className="text-2xl font-bold">{formData.currentWeight}kg</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                <p className="text-sm text-gray-500">目標体重</p>
                <p className="text-2xl font-bold text-green-600">{formData.targetWeight}kg</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                <p className="text-sm text-gray-500">活動レベル</p>
                <p className="font-semibold truncate text-sm" title={activityLevelMap[formData.activityLevel]}>{activityLevelMap[formData.activityLevel]}</p>
            </div>
             <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                <p className="text-sm text-gray-500">目標達成日</p>
                <p className="text-lg font-semibold">{formData.goalDate ? new Date(formData.goalDate).toLocaleDateString() : '未設定'}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 