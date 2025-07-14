"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

interface ActivityLog {
  id?: string;
  activity_level: number;
  notes: string;
  date: string;
}

const activityLevels = [
  { value: 1, label: "座り仕事", description: "デスクワーク中心、運動なし" },
  { value: 2, label: "軽い運動", description: "週1-3回の軽い運動" },
  { value: 3, label: "中程度の運動", description: "週3-5回の中程度の運動" },
  { value: 4, label: "激しい運動", description: "週6-7回の激しい運動" },
  { value: 5, label: "非常に激しい運動", description: "毎日激しい運動、肉体労働" }
];

interface ActivityLoggerProps {
  compact?: boolean;
}

export function ActivityLogger({ compact = false }: ActivityLoggerProps) {
  const [todayLog, setTodayLog] = useState<ActivityLog>({
    activity_level: 1,
    notes: "",
    date: new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadTodayActivity();
  }, []);

  const loadTodayActivity = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data: existingLog } = await supabase
        .from('daily_activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (existingLog) {
        setTodayLog({
          id: existingLog.id,
          activity_level: existingLog.activity_level,
          notes: existingLog.notes || "",
          date: existingLog.date
        });
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
    } catch (error) {
      console.error('活動ログ読み込みエラー:', error);
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
        activity_level: todayLog.activity_level,
        notes: todayLog.notes
      };

      if (todayLog.id) {
        // 既存のログを更新
        await supabase
          .from('daily_activity_logs')
          .update(logData)
          .eq('id', todayLog.id);
      } else {
        // 新しいログを作成
        const { data: newLog } = await supabase
          .from('daily_activity_logs')
          .insert(logData)
          .select()
          .single();

        if (newLog) {
          setTodayLog(prev => ({ ...prev, id: newLog.id }));
        }
      }

      setIsEditing(false);
    } catch (error) {
      console.error('活動ログ保存エラー:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getActivityLevelInfo = (level: number) => {
    return activityLevels.find(a => a.value === level) || activityLevels[0];
  };

  if (isLoading) {
    return compact ? (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-gray-500">読み込み中...</p>
      </div>
    ) : (
      <Card>
        <CardHeader>
          <CardTitle>今日の活動レベル</CardTitle>
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
    const activityInfo = getActivityLevelInfo(todayLog.activity_level);
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-1">
        <p className="text-lg font-bold text-blue-600">{activityInfo.label}</p>
        <p className="text-xs text-gray-500">レベル {todayLog.activity_level}</p>
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
        <CardTitle className="text-lg">今日の活動レベル</CardTitle>
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
              <Label htmlFor="activity-level">活動レベル</Label>
              <Select
                value={todayLog.activity_level.toString()}
                onValueChange={(value) => setTodayLog(prev => ({ ...prev, activity_level: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activityLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value.toString()}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {getActivityLevelInfo(todayLog.activity_level).description}
              </p>
            </div>
            <div>
              <Label htmlFor="notes">メモ（任意）</Label>
              <Textarea
                id="notes"
                placeholder="今日の活動についてメモを残してください..."
                value={todayLog.notes}
                onChange={(e) => setTodayLog(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">活動レベル</p>
              <p className="text-2xl font-bold text-blue-600">
                {getActivityLevelInfo(todayLog.activity_level).label}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {getActivityLevelInfo(todayLog.activity_level).description}
              </p>
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