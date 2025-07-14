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
  };
  onUpdate: () => void;
}

export function OverviewCard({ initialData, onUpdate }: OverviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    weight: initialData.current_weight ?? 0,
    activityLevel: initialData.activity_level ?? 1.5,
    targetWeight: initialData.target_weight ?? 0,
  });
  const supabase = createClient();

  useEffect(() => {
    setFormData({
      weight: initialData.current_weight ?? 0,
      activityLevel: initialData.activity_level ?? 1.5,
      targetWeight: initialData.target_weight ?? 0,
    });
  }, [initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setIsSaving(false);
        return;
    }

    const { error: profileError } = await supabase.from('profiles').update({
      activity_level: formData.activityLevel,
      target_weight_kg: formData.targetWeight > 0 ? formData.targetWeight : null,
      initial_weight_kg: formData.weight > 0 ? formData.weight : null, // initial_weightを現在の体重で更新
    }).eq('id', user.id);

    // 今日の体重記録も更新
    const today = new Date().toISOString().split('T')[0];
    const { error: weightError } = await supabase.from('daily_weight_logs').upsert({ 
      user_id: user.id, 
      date: today, 
      weight_kg: formData.weight > 0 ? formData.weight : null 
    }, { onConflict: 'user_id, date' });

    if (profileError) console.error("Error saving profile:", profileError);
    if (weightError) console.error("Error saving weight log:", weightError);
    
    setIsSaving(false);
    setIsEditing(false);
    if (!profileError && !weightError) {
      onUpdate();
    }
  };

  const activityLevelMap: { [key: number]: string } = {
    1.2: '座り仕事中心（運動なし）',
    1.375: '軽い運動（週1-2回）',
    1.55: '中程度の運動（週3-5回）',
    1.725: '激しい運動（週6-7回）',
    1.9: '非常に激しい運動',
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
              <Input id="weight" type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <Label>活動レベル</Label>
              <Select value={String(formData.activityLevel)} onValueChange={value => setFormData({...formData, activityLevel: Number(value)})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(activityLevelMap).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="target_weight">目標体重 (kg)</Label>
              <Input id="target_weight" type="number" value={formData.targetWeight} onChange={e => setFormData({...formData, targetWeight: parseFloat(e.target.value) || 0})} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "保存中..." : "保存"}</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                <p className="text-sm text-gray-500">今日の体重</p>
                <p className="text-2xl font-bold">{formData.weight}kg</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                <p className="text-sm text-gray-500">目標体重</p>
                <p className="text-2xl font-bold text-green-600">{formData.targetWeight}kg</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center col-span-2">
                <p className="text-sm text-gray-500">活動レベル</p>
                <p className="font-semibold truncate text-sm" title={activityLevelMap[formData.activityLevel]}>{activityLevelMap[formData.activityLevel]}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 