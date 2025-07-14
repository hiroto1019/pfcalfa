'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const profileSchema = z.object({
  userId: z.string(),
  height_cm: z.coerce.number(),
  birth_date: z.string(),
  gender: z.enum(['male', 'female']),
  initial_weight_kg: z.coerce.number(),
  target_weight_kg: z.coerce.number(),
  target_date: z.string(),
  activity_level: z.string(),
});

export async function updateProfile(formData: FormData) {
  console.log("--- 1. updateProfile action started ---");
  const supabase = createClient();
  const rawData = Object.fromEntries(formData.entries());
  console.log("--- 2. Raw form data ---", rawData);

  const validatedFields = profileSchema.safeParse(rawData);

  if (!validatedFields.success) {
    console.error("--- VALIDATION FAILED ---", validatedFields.error);
    // ここでリダイレクトすると、なぜ失敗したかユーザーに伝わらない
    // 本来はエラーメッセージを返すのが望ましい
    return;
  }
  
  console.log("--- 3. Validation successful ---", validatedFields.data);
  const data = validatedFields.data;

  // profilesテーブルへのUpsert
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: data.userId,
      height_cm: data.height_cm,
      birth_date: data.birth_date,
      gender: data.gender,
      initial_weight_kg: data.initial_weight_kg,
      activity_level: Number(data.activity_level),
      onboarding_completed: true,
    });

  if (profileError) {
    console.error("--- PROFILE UPSERT FAILED ---", profileError);
    return;
  }
  console.log("--- 4. Profile upsert successful ---");

  // goalsテーブルへのUpsert
  const goal_type = data.initial_weight_kg > data.target_weight_kg ? 'diet' : 'bulk-up';
  const { error: goalError } = await supabase
    .from("goals")
    .upsert({
      user_id: data.userId,
      target_weight_kg: data.target_weight_kg,
      target_date: data.target_date,
      current_weight_kg: data.initial_weight_kg,
      goal_type: goal_type,
    }, { onConflict: 'user_id' });

  if (goalError) {
    console.error("--- GOAL UPSERT FAILED ---", goalError);
    return;
  }
  console.log("--- 5. Goal upsert successful ---");
  
  revalidatePath('/');
  redirect("/");
  console.log("--- 6. Redirecting to dashboard ---");
}
