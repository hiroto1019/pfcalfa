'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const formSchema = z.object({
  username: z.string().min(2),
  gender: z.enum(["male", "female", "other"]),
  birth_date: z.date(),
  height_cm: z.coerce.number().positive(),
  initial_weight_kg: z.coerce.number().positive(),
  target_weight_kg: z.coerce.number().positive(),
  activity_level: z.enum(["1", "2", "3", "4", "5"]),
  goal_type: z.enum(["diet", "bulk-up", "maintain"]),
});

export async function createProfile(values: z.infer<typeof formSchema>) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not found");
  }

  const validated = formSchema.parse(values);

  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    ...validated,
    activity_level: parseInt(validated.activity_level, 10),
  });

  if (error) {
    console.error(error);
    throw new Error("Failed to create profile");
  }

  revalidatePath('/');
}
