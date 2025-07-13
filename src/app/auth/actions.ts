'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function signInWithEmail(data: FormData) {
  const email = data.get('email') as string;
  const password = data.get('password') as string;
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // TODO: Implement proper error handling
    console.error(error);
    return redirect('/?message=Could not authenticate user');
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signUp(data: FormData) {
  const email = data.get('email') as string;
  const password = data.get('password') as string;
  const supabase = createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${location.origin}/auth/callback`,
    },
  });

  if (error) {
    // TODO: Implement proper error handling
    console.error(error);
    return redirect('/?message=Could not create user');
  }

  revalidatePath('/', 'layout');
  // A confirmation email will be sent. For now, we redirect to a page that tells the user to check their email.
  redirect('/?message=Check email to continue sign in process');
}

export async function signInWithGithub() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error);
    return redirect('/?message=Could not authenticate with GitHub');
  }

  redirect(data.url);
}
