"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

interface WeightLog {
  id?: string;
  weight_kg: number;
  notes: string;
  date: string;
}

interface WeightLoggerProps {
  compact?: boolean;
}

export function WeightLogger({ compact = false }: WeightLoggerProps) {
  const [todayLog, setTodayLog] = useState<WeightLog>({
    weight_kg: 0,
    notes: "",
    date: new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadTodayWeight();
  }, []);

  const loadTodayWeight = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data: existingLog } = await supabase
        .from('daily_weight_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (existingLog) {
        setTodayLog({
          id: existingLog.id,
          weight_kg: existingLog.weight_kg,
          notes: existingLog.notes || "",
          date: existingLog.date
        });
        setIsEditing(false);
      } else {
        // 最新の体重記録を取得して初期値とする
        const { data: latestWeight } = await supabase
          .from('daily_weight_logs')
          .select('weight_kg')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1)
          .single();

        if (latestWeight) {
          setTodayLog(prev => ({ ...prev, weight_kg: latestWeight.weight_kg }));
        }
        setIsEditing(true);
      }
    } catch (error) {
      console.error('体重ログ読み込みエラー:', error);
      setIsEditing(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const logData = {
        user_id: user.id,
        date: todayLog.date,
        weight_kg: todayLog.weight_kg,
        notes: todayLog.notes
      };

      if (todayLog.id) {
        // 既存のログを更新
        await supabase
          .from('daily_weight_logs')
          .update(logData)
          .eq('id', todayLog.id);
      } else {
        // 新しいログを作成
        const { data: newLog } = await supabase
          .from('daily_weight_logs')
          .insert(logData)
          .select()
          .single();

        if (newLog) {
          setTodayLog(prev => ({ ...prev, id: newLog.id }));
        }
      }

      setIsEditing(false);
    } catch (error) {
      console.error('体重ログ保存エラー:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return compact ? (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-gray-500">読み込み中...</p>
      </div>
    ) : (
      <Card>
        <CardHeader>
          <CardTitle>今日の体重</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-sm">データを読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!todayLog) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-1">
        <p className="text-lg font-bold text-blue-600">{todayLog.weight_kg}</p>
        <p className="text-xs text-gray-500">kg</p>
        {isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(false)}
            className="text-xs h-6 px-2"
          >
            編集
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">今日の体重</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? "キャンセル" : "編集"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="weight">体重 (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={todayLog.weight_kg}
                onChange={(e) => setTodayLog(prev => ({ ...prev, weight_kg: parseFloat(e.target.value) || 0 }))}
                placeholder="例: 65.5"
              />
            </div>
            <div>
              <Label htmlFor="weight-notes">メモ（任意）</Label>
              <Textarea
                id="weight-notes"
                placeholder="体重に関するメモを残してください..."
                value={todayLog.notes}
                onChange={(e) => setTodayLog(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving || todayLog.weight_kg <= 0}
              className="w-full"
            >
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">今日の体重</p>
              <p className="text-3xl font-bold text-blue-600">{todayLog.weight_kg}kg</p>
            </div>
            
            {todayLog.notes && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">メモ</p>
                <p className="text-sm text-gray-600">{todayLog.notes}</p>
              </div>
            )}

            <div className="text-center text-xs text-gray-500">
              {new Date(todayLog.date).toLocaleDateString('ja-JP', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 