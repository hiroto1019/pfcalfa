"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

interface GoalData {
  target_weight_kg: number;
  target_date: string;
}

export function GoalSetting() {
  const [goal, setGoal] = useState<GoalData>({ target_weight_kg: 0, target_date: "" });
  const [initialGoal, setInitialGoal] = useState<GoalData>({ target_weight_kg: 0, target_date: "" });
  const [currentWeight, setCurrentWeight] = useState<number>(0);
  
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
    
    // Get profile for defaults
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) {
        const goalData = {
            target_weight_kg: profile.target_weight_kg ?? 0,
            target_date: profile.goal_target_date ? new Date(profile.goal_target_date).toISOString().split('T')[0] : ""
        };
        setGoal(goalData);
        setInitialGoal(goalData);
        setCurrentWeight(profile.initial_weight_kg ?? 0);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('profiles').update({
        target_weight_kg: goal.target_weight_kg,
        goal_target_date: goal.target_date,
    }).eq('id', user.id);

    setInitialGoal(goal);
    setIsSaving(false);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setGoal(initialGoal);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
        <Card>
            <CardHeader><CardTitle className="text-base font-semibold">目標設定</CardTitle></CardHeader>
            <CardContent><div className="text-center text-sm text-gray-500">読み込み中...</div></CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">目標設定</CardTitle>
        {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>編集</Button>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {isEditing ? (
            <div className="space-y-4">
                <div>
                    <Label htmlFor="target_weight">目標体重 (kg)</Label>
                    <Input id="target_weight" type="number" value={goal.target_weight_kg} onChange={e => setGoal({...goal, target_weight_kg: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                    <Label htmlFor="target_date">目標達成日</Label>
                    <Input id="target_date" type="date" value={goal.target_date} onChange={e => setGoal({...goal, target_date: e.target.value})} />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>キャンセル</Button>
                    <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "保存中..." : "保存"}</Button>
                </div>
            </div>
        ) : (
            <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-500">現在の体重</p>
                        <p className="text-2xl font-bold">{currentWeight}kg</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-500">目標体重</p>
                        <p className="text-2xl font-bold text-green-600">{goal.target_weight_kg}kg</p>
                    </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">目標達成日</p>
                    <p className="text-lg font-semibold">{goal.target_date ? new Date(goal.target_date).toLocaleDateString() : '未設定'}</p>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
} 