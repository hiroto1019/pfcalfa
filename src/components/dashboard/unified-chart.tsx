"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PFCChart } from "./pfc-chart";
import { WeightChart } from "./weight-chart";

export function UnifiedChart() {
  const [activeTab, setActiveTab] = useState("pfc");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 食事記録データを取得
      const { data: meals } = await supabase
        .from("meals")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: true });

      // 体重記録データを取得
      const { data: weightLogs } = await supabase
        .from("daily_weight_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("date", { ascending: true });

      setData({ meals, weightLogs });
    } catch (error) {
      console.error("データ取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-2">
          <TabsTrigger value="pfc" className="text-xs">PFCバランス</TabsTrigger>
          <TabsTrigger value="weight" className="text-xs">体重推移</TabsTrigger>
        </TabsList>
        <TabsContent value="pfc" className="flex-1 mt-0">
          <div className="h-full">
            <PFCChart />
          </div>
        </TabsContent>
        <TabsContent value="weight" className="flex-1 mt-0">
          <div className="h-full">
            <WeightChart />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 