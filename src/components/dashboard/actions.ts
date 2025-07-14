"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateDashboardData(formData: {
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  activity_level: number;
  goal_type: string;
  goal_target_date: string | null;
}) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ユーザーが認証されていません。" };
  }

  // 1. プロフィール情報を更新
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      target_weight_kg: formData.target_weight_kg,
      activity_level: formData.activity_level,
      goal_type: formData.goal_type,
      goal_target_date: formData.goal_target_date,
    })
    .eq("id", user.id);

  if (profileError) {
    console.error("Error updating profile:", profileError);
    return { success: false, error: "プロフィールの更新に失敗しました。" };
  }

  // 2. 今日の体重を記録 (upsert)
  if (formData.current_weight_kg) {
    const today = new Date().toISOString().split('T')[0];
    const { error: weightError } = await supabase
      .from("daily_weight_logs")
      .upsert({ 
        user_id: user.id, 
        date: today, 
        weight_kg: formData.current_weight_kg 
      }, { onConflict: 'user_id, date' });

    if (weightError) {
      console.error("Error saving weight:", weightError);
      return { success: false, error: "体重の記録に失敗しました。" };
    }
  }

  revalidatePath("/"); //ダッシュボードページを再検証してデータを更新

  return { success: true, error: null };
} 