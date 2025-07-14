"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

const activityLevels = [
  { value: 1, label: "座り仕事", description: "デスクワーク中心" },
  { value: 2, label: "軽い運動", description: "週1-3回の軽い運動" },
  { value: 3, label: "中程度の運動", description: "週3-5回の中程度の運動" },
  { value: 4, label: "激しい運動", description: "週6-7回の激しい運動" },
  { value: 5, label: "非常に激しい運動", description: "毎日激しい運動、肉体労働" }
];

export function WeightActivityToday() {
  const [weight, setWeight] = useState<number>(0);
  const [activityLevel, setActivityLevel] = useState<number>(1);
  const [initialWeight, setInitialWeight] = useState<number>(0);
  const [initialActivityLevel, setInitialActivityLevel] = useState<number>(1);
  const [weightLogId, setWeightLogId] = useState<string | null>(null);
  const [activityLogId, setActivityLogId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    
    // Get profile defaults first
    const { data: profile } = await supabase.from('profiles').select('initial_weight_kg, activity_level').eq('id', user.id).single();
    const defaultWeight = profile?.initial_weight_kg ?? 0;
    const defaultActivity = profile?.activity_level ?? 1;

    // Weight
    const { data: weightLog } = await supabase.from('daily_weight_logs').select('id, weight_kg').eq('user_id', user.id).eq('date', today).single();
    setWeight(weightLog?.weight_kg ?? defaultWeight);
    setInitialWeight(weightLog?.weight_kg ?? defaultWeight);
    setWeightLogId(weightLog?.id ?? null);

    // Activity
    const { data: activityLog } = await supabase.from('daily_activity_logs').select('id, activity_level').eq('user_id', user.id).eq('date', today).single();
    setActivityLevel(activityLog?.activity_level ?? defaultActivity);
    setInitialActivityLevel(activityLog?.activity_level ?? defaultActivity);
    setActivityLogId(activityLog?.id ?? null);

    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    // Upsert weight
    const { data: savedWeight } = await supabase.from('daily_weight_logs').upsert({ id: weightLogId, user_id: user.id, date: today, weight_kg: weight }).select().single();
    if(savedWeight) {
        setWeightLogId(savedWeight.id);
        setInitialWeight(savedWeight.weight_kg);
    }
    
    // Upsert activity
    const { data: savedActivity } = await supabase.from('daily_activity_logs').upsert({ id: activityLogId, user_id: user.id, date: today, activity_level: activityLevel }).select().single();
    if(savedActivity) {
        setActivityLogId(savedActivity.id);
        setInitialActivityLevel(savedActivity.activity_level);
    }

    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setWeight(initialWeight);
    setActivityLevel(initialActivityLevel);
    setIsEditing(false);
  };

  const activityInfo = activityLevels.find(a => a.value === activityLevel);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">今日の体重と活動レベル</CardTitle>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>編集</Button>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="text-center text-sm text-gray-500">読み込み中...</div>
        ) : isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="weight">今日の体重 (kg)</Label>
              <Input id="weight" type="number" value={weight} onChange={(e) => setWeight(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label htmlFor="activity">活動レベル</Label>
              <Select value={String(activityLevel)} onValueChange={(v) => setActivityLevel(Number(v))}>
                <SelectTrigger id="activity">
                  <SelectValue placeholder="活動レベルを選択" />
                </SelectTrigger>
                <SelectContent>
                  {activityLevels.map(level => (
                    <SelectItem key={level.value} value={String(level.value)}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>キャンセル</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-row gap-4">
            <div className="flex-1 bg-gray-50 rounded-lg flex flex-col items-center justify-center p-4 text-center">
              <p className="text-sm text-gray-500">今日の体重</p>
              <p className="text-2xl font-bold">{weight}kg</p>
            </div>
            <div className="flex-1 bg-gray-50 rounded-lg flex flex-col items-center justify-center p-4 text-center">
              <p className="text-sm text-gray-500">活動レベル</p>
              <p className="text-lg font-bold">{activityInfo?.label}</p>
              <p className="text-xs text-gray-400">{activityInfo?.description}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 