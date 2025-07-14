'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export async function signInWithEmail(data: FormData) {
  const email = data.get('email') as string;
  const password = data.get('password') as string;
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(error);
    if (error.message.includes('Invalid login credentials')) {
      return redirect('/login?message=' + encodeURIComponent('メールアドレスまたはパスワードが正しくありません'));
    }
    return redirect('/login?message=' + encodeURIComponent('ログインに失敗しました'));
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
      emailRedirectTo: `${headers().get('origin')}/auth/callback`,
    },
  });

  if (error) {
    console.error("Sign up error:", error);
    if (error.message.includes('weak_password')) {
      return redirect('/register?message=' + encodeURIComponent('パスワードは最低6文字必要です'));
    }
    if (error.message.includes('already registered')) {
      return redirect('/register?message=' + encodeURIComponent('このメールアドレスは既に登録されています'));
    }
    return redirect('/register?message=' + encodeURIComponent(error.message));
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signInWithGithub() {
  const supabase = createClient();
  // 動的にリダイレクト先を取得
  const origin = headers().get('origin') || 'http://127.0.0.1:3000';
  const redirectTo = `${origin}/auth/callback`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error('GitHub OAuth error:', error);
    return redirect('/login?message=' + encodeURIComponent('GitHubでのログインに失敗しました: ' + error.message));
  }

  if (!data.url) {
    console.error('No OAuth URL returned');
    return redirect('/login?message=' + encodeURIComponent('GitHubでのログインに失敗しました'));
  }

  redirect(data.url);
}
