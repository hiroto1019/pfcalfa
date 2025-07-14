'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const profileSchema = z.object({
  userId: z.string(),
  height_cm: z.coerce.number().positive(),
  birth_date: z.string().date(),
  gender: z.enum(["male", "female"]),
  initial_weight_kg: z.coerce.number().positive(),
  target_weight_kg: z.coerce.number().positive(),
  target_date: z.string().date(),
  activity_level: z.coerce.number().min(1).max(5),
});

export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const rawData = Object.fromEntries(formData.entries());

  try {
    const data = profileSchema.parse(rawData);

    // 1. profilesテーブルを更新または作成 (Upsert)
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: data.userId, // idを追加
        height_cm: data.height_cm,
        birth_date: data.birth_date,
        gender: data.gender,
        initial_weight_kg: data.initial_weight_kg,
        activity_level: data.activity_level,
        onboarding_completed: true,
      })
      .select(); // Upsertの後にselect()を呼ぶのが一般的

    if (profileError) {
      console.error("Profile upsert error:", profileError);
      throw profileError;
    }

    // 2. goalsテーブルに目標を作成または更新 (Upsert)
    const goal_type = data.initial_weight_kg > data.target_weight_kg ? 'diet' : 'bulk-up';
    const { error: goalError } = await supabase
      .from("goals")
      .upsert({
        user_id: data.userId,
        target_weight_kg: data.target_weight_kg,
        target_date: data.target_date,
        current_weight_kg: data.initial_weight_kg,
        goal_type: goal_type,
      }, { onConflict: 'user_id' }); // user_idが重複した場合は更新する

    if (goalError) {
      console.error("Goal creation error:", goalError);
      throw goalError;
    }

  } catch (error) {
    console.error("Onboarding Error:", error);
    // TODO: エラーメッセージをUIに表示する
    return;
  }
  
  // 3. ダッシュボードにリダイレクト
  redirect("/");
}
