"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

const activityLevels = [
  { value: 1, label: "座り仕事", description: "デスクワーク中心、運動なし" },
  { value: 2, label: "軽い運動", description: "週1-3回の軽い運動" },
  { value: 3, label: "中程度の運動", description: "週3-5回の中程度の運動" },
  { value: 4, label: "激しい運動", description: "週6-7回の激しい運動" },
  { value: 5, label: "非常に激しい運動", description: "毎日激しい運動、肉体労働" }
];

export function WeightActivityToday() {
  const [weight, setWeight] = useState<number | null>(null);
  const [activityLevel, setActivityLevel] = useState<number | null>(null);
  const [editedWeight, setEditedWeight] = useState<string>("");
  const [editedActivityLevel, setEditedActivityLevel] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  async function loadData() {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      
      const { data: weightLog } = await supabase.from('daily_weight_logs').select('weight_kg').eq('user_id', user.id).eq('date', today).single();
      const { data: activityLog } = await supabase.from('daily_activity_logs').select('activity_level').eq('user_id', user.id).eq('date', today).single();
      
      const currentWeight = weightLog?.weight_kg;
      const currentActivity = activityLog?.activity_level;

      setWeight(currentWeight ?? null);
      setActivityLevel(currentActivity ?? null);
      setEditedWeight(currentWeight?.toString() ?? "");
      setEditedActivityLevel(currentActivity ?? 1);

    } catch (e) {
      console.error("Error loading data", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];

      await supabase.from('daily_weight_logs').upsert({ user_id: user.id, date: today, weight_kg: parseFloat(editedWeight) }, { onConflict: 'user_id, date' });
      await supabase.from('daily_activity_logs').upsert({ user_id: user.id, date: today, activity_level: editedActivityLevel }, { onConflict: 'user_id, date' });
      
      await loadData();
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving data", error);
    } finally {
      setIsSaving(false);
    }
  };

  const activityInfo = activityLevels.find(a => a.value === activityLevel) || activityLevels[0];
  const editedActivityInfo = activityLevels.find(a => a.value === editedActivityLevel) || activityLevels[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">今日の体重と活動レベル</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? "キャンセル" : "編集"}
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="weight">今日の体重 (kg)</Label>
              <Input id="weight" type="number" value={editedWeight} onChange={(e) => setEditedWeight(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="activity-level">活動レベル</Label>
              <Select value={editedActivityLevel?.toString()} onValueChange={(v) => setEditedActivityLevel(Number(v))}>
                <SelectTrigger id="activity-level">
                  <SelectValue placeholder="選択..." />
                </SelectTrigger>
                <SelectContent>
                  {activityLevels.map(level => (
                    <SelectItem key={level.value} value={level.value.toString()}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <p className="text-xs text-gray-500 mt-1">{editedActivityInfo.description}</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">今日の体重</span>
              <span className="text-2xl font-bold">{weight ? `${weight}kg` : "未入力"}</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">活動レベル</span>
              <span className="text-xl font-bold">{activityInfo.label}</span>
              <span className="text-xs text-gray-400">{activityInfo.description}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 