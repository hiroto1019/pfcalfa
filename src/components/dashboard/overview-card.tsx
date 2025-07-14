"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

interface OverviewCardProps {
  initialData: {
    current_weight: number | null;
    activity_level: number | null;
    target_weight: number | null;
    goal_date: string | null;
  };
  onUpdate: () => void;
}

export function OverviewCard({ initialData, onUpdate }: OverviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    weight: initialData.current_weight ?? 0,
    activityLevel: initialData.activity_level ?? 2,
    targetWeight: initialData.target_weight ?? 0,
    goalDate: initialData.goal_date ? new Date(initialData.goal_date).toISOString().split('T')[0] : "",
  });
  const supabase = createClient();

  useEffect(() => {
    setFormData({
      weight: initialData.current_weight ?? 0,
      activityLevel: initialData.activity_level ?? 2,
      targetWeight: initialData.target_weight ?? 0,
      goalDate: initialData.goal_date ? new Date(initialData.goal_date).toISOString().split('T')[0] : "",
    });
  }, [initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setIsSaving(false);
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    // 入力値が0や空の場合はnullに変換する
    const safeCurrentWeight = formData.weight > 0 ? formData.weight : null;
    const safeTargetWeight = formData.targetWeight > 0 ? formData.targetWeight : null;
    const safeGoalDate = formData.goalDate === "" ? null : formData.goalDate;

    const { error: weightError } = await supabase.from('daily_weight_logs').upsert({ user_id: user.id, date: today, weight_kg: safeCurrentWeight }, { onConflict: 'user_id, date' });
    const { error: activityError } = await supabase.from('daily_activity_logs').upsert({ user_id: user.id, date: today, activity_level: formData.activityLevel }, { onConflict: 'user_id, date' });

    const { data: existingGoal, error: selectError } = await supabase.from('goals').select('id').eq('user_id', user.id).single();

    let goalError;
    if (selectError && selectError.code !== 'PGRST116') {
        console.error("Error selecting goal:", selectError);
        goalError = selectError;
    } else if (existingGoal) {
        const { error } = await supabase.from('goals').update({ 
            target_weight_kg: safeTargetWeight, 
            target_date: safeGoalDate,
            current_weight_kg: safeCurrentWeight // 今日の体重も更新
        }).eq('id', existingGoal.id);
        goalError = error;
    } else {
        const { error } = await supabase.from('goals').insert({ 
            user_id: user.id, 
            target_weight_kg: safeTargetWeight, 
            target_date: safeGoalDate, 
            current_weight_kg: safeCurrentWeight, 
            goal_type: 'diet' 
        });
        goalError = error;
    }

    if (weightError) console.error("Error saving weight:", weightError);
    if (activityError) console.error("Error saving activity:", activityError);
    if (goalError) console.error("Error saving goal:", goalError);
    
    setIsSaving(false);
    setIsEditing(false);
    if (!weightError && !activityError && !goalError) {
      onUpdate();
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
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">今日のサマリーと目標</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>{isEditing ? 'キャンセル' : '編集'}</Button>
      </CardHeader>
      <CardContent className="pt-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="weight">今日の体重 (kg)</Label>
              <Input id="weight" type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: parseFloat(e.target.value) || 0})} />
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
              <Label htmlFor="target_weight">目標体重 (kg)</Label>
              <Input id="target_weight" type="number" value={formData.targetWeight} onChange={e => setFormData({...formData, targetWeight: parseFloat(e.target.value) || 0})} />
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
            <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">今日の体重</p>
                <p className="text-2xl font-bold">{formData.weight}kg</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">目標体重</p>
                <p className="text-2xl font-bold text-green-600">{formData.targetWeight}kg</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">活動レベル</p>
                <p className="font-semibold truncate" title={activityLevelMap[formData.activityLevel]}>{activityLevelMap[formData.activityLevel]}</p>
            </div>
             <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">目標達成日</p>
                <p className="text-lg font-semibold">{formData.goalDate ? new Date(formData.goalDate).toLocaleDateString() : '未設定'}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 