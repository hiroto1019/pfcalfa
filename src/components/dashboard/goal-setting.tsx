"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function GoalSetting() {
  const [goal, setGoal] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editedTargetWeight, setEditedTargetWeight] = useState<string>("");
  const [editedTargetDate, setEditedTargetDate] = useState<string>("");

  const supabase = createClient();

  async function loadGoalData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profileData } = await supabase.from('profiles').select('initial_weight_kg').eq('id', user.id).single();
    setProfile(profileData);

    const { data: goalData } = await supabase.from('goals').select('*').eq('user_id', user.id).single();
    if (goalData) {
      setGoal(goalData);
      setEditedTargetWeight(goalData.target_weight_kg?.toString() ?? "");
      setEditedTargetDate(goalData.target_date ?? "");
    }
  }

  useEffect(() => {
    loadGoalData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !goal) return;

    try {
      await supabase.from('goals').update({
        target_weight_kg: parseFloat(editedTargetWeight),
        target_date: editedTargetDate,
      }).eq('id', goal.id);
      
      await loadGoalData();
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating goal:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile || !goal) {
    return <div>Loading...</div>;
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">目標設定</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? "キャンセル" : "編集"}
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="target-weight">目標体重 (kg)</Label>
              <Input id="target-weight" type="number" value={editedTargetWeight} onChange={e => setEditedTargetWeight(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="target-date">目標達成日</Label>
              <Input id="target-date" type="date" value={editedTargetDate} onChange={e => setEditedTargetDate(e.target.value)} />
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500">現在の体重</span>
                <span className="text-2xl font-bold">{profile.initial_weight_kg}kg</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-500">目標体重</span>
                <span className="text-2xl font-bold">{goal.target_weight_kg}kg</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm text-gray-500">目標達成日</span>
              <span className="text-xl font-bold">{new Date(goal.target_date).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 