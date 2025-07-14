"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

interface ActivityStats {
  totalDays: number;
  averageLevel: number;
  levelDistribution: { [key: number]: number };
  recentActivity: Array<{
    date: string;
    level: number;
    notes?: string;
  }>;
}

const activityLevelLabels = {
  1: "座り仕事",
  2: "軽い運動", 
  3: "中程度の運動",
  4: "激しい運動",
  5: "非常に激しい運動"
};

export function ActivityStats() {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const supabase = createClient();

  useEffect(() => {
    loadActivityStats();
  }, [period]);

  const loadActivityStats = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const endDate = new Date();
      const startDate = new Date();
      
      if (period === "week") {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setDate(startDate.getDate() - 30);
      }

      const { data: activityLogs } = await supabase
        .from('daily_activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (activityLogs && activityLogs.length > 0) {
        const totalDays = activityLogs.length;
        const totalLevel = activityLogs.reduce((sum, log) => sum + log.activity_level, 0);
        const averageLevel = totalLevel / totalDays;

        const levelDistribution: { [key: number]: number } = {};
        activityLogs.forEach(log => {
          levelDistribution[log.activity_level] = (levelDistribution[log.activity_level] || 0) + 1;
        });

        const recentActivity = activityLogs.slice(0, 7).map(log => ({
          date: log.date,
          level: log.activity_level,
          notes: log.notes
        }));

        setStats({
          totalDays,
          averageLevel,
          levelDistribution,
          recentActivity
        });
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error('活動統計読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLevelColor = (level: number) => {
    const colors = {
      1: "bg-gray-500",
      2: "bg-blue-500", 
      3: "bg-green-500",
      4: "bg-yellow-500",
      5: "bg-red-500"
    };
    return colors[level as keyof typeof colors] || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>活動統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-sm">データを読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>活動統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500 text-sm">データがありません</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">活動統計</CardTitle>
        <Tabs value={period} onValueChange={(value) => setPeriod(value as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="week">週間</TabsTrigger>
            <TabsTrigger value="month">月間</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* サマリー */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">記録日数</p>
            <p className="text-xl font-bold text-blue-600">{stats.totalDays}日</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">平均レベル</p>
            <p className="text-xl font-bold text-green-600">{stats.averageLevel.toFixed(1)}</p>
          </div>
        </div>

        {/* レベル分布 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">レベル分布</p>
          <div className="space-y-2">
            {Object.entries(stats.levelDistribution).map(([level, count]) => (
              <div key={level} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getLevelColor(parseInt(level))}`}></div>
                  <span className="text-sm">{activityLevelLabels[parseInt(level) as keyof typeof activityLevelLabels]}</span>
                </div>
                <span className="text-sm font-medium">{count}日</span>
              </div>
            ))}
          </div>
        </div>

        {/* 最近の活動 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">最近の活動</p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {stats.recentActivity.map((activity) => (
              <div key={activity.date} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getLevelColor(activity.level)}`}></div>
                  <span className="text-xs">
                    {new Date(activity.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <span className="text-xs font-medium">
                  {activityLevelLabels[activity.level as keyof typeof activityLevelLabels]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 