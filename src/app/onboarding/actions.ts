'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const profileSchema = z.object({
  userId: z.string(),
  height_cm: z.coerce.number().positive(),
  birth_date: z.string().min(1, "生年月日を選択してください"),
  gender: z.enum(["male", "female"]),
  initial_weight_kg: z.coerce.number().positive(),
  target_weight_kg: z.coerce.number().positive(),
  target_date: z.string().min(1, "目標達成日を選択してください"),
  activity_level: z.string().min(1, "活動レベルを選択してください"),
});

export type OnboardingFormState = {
  message: string;
  errors?: {
    [key in keyof z.infer<typeof profileSchema>]?: string[];
  };
};

export async function updateProfile(
  prevState: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const supabase = createClient();
  const rawData = Object.fromEntries(formData.entries());

  const validatedFields = profileSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      message: '入力内容にエラーがあります。各項目をご確認ください。',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const data = validatedFields.data;

  // 1. profilesテーブルを更新または作成 (Upsert)
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: data.userId,
      height_cm: data.height_cm,
      birth_date: data.birth_date,
      gender: data.gender,
      initial_weight_kg: data.initial_weight_kg,
      activity_level: data.activity_level,
      onboarding_completed: true,
    })
    .select();

  if (profileError) {
    console.error("Profile upsert error:", profileError);
    return { message: `プロフィールの保存に失敗しました: ${profileError.message}`, errors: {} };
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
    }, { onConflict: 'user_id' });

  if (goalError) {
    console.error("Goal upsert error:", goalError);
    return { message: `目標の保存に失敗しました: ${goalError.message}`, errors: {} };
  }
  
  revalidatePath('/');
  redirect("/");
}
