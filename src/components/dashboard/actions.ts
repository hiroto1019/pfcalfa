"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfileGoals(formData: {
  target_weight_kg: number | null;
  activity_level: number;
  goal_type: string;
}) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "ユーザーが認証されていません。" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      target_weight_kg: formData.target_weight_kg,
      activity_level: formData.activity_level,
      goal_type: formData.goal_type,
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile goals:", error);
    return { success: false, error: "プロフィールの更新に失敗しました。" };
  }

  revalidatePath("/"); //ダッシュボードページを再検証してデータを更新

  return { success: true, error: null };
} 