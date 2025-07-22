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

  // まずサインアップ
  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("Sign up error:", error);
    if (error.message.includes('weak_password')) {
      return redirect('/register?message=' + encodeURIComponent('パスワードは最低6文字必要です'));
    }
    if (error.message.includes('already registered')) {
      return redirect('/register?message=' + encodeURIComponent('このメールアドレスは既に登録されています'));
    }
    return redirect('/register?message=' + encodeURIComponent('登録に失敗しました'));
  }

  // サインアップ成功後、自動的にログイン
  if (signUpData.user) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error("Auto sign in error:", signInError);
      return redirect('/login?message=' + encodeURIComponent('登録は完了しましたが、ログインに失敗しました'));
    }
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signInWithGithub() {
  const supabase = createClient();
  const origin = headers().get('origin'); // オリジンを取得

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    // redirectToオプションを再追加します
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('GitHub sign in error:', error);
    return redirect('/login?message=' + encodeURIComponent('GitHubログインに失敗しました'));
  }

  return redirect(data.url);
}

export async function signInWithGoogle() {
  const supabase = createClient();
  const origin = headers().get('origin'); // オリジンを取得

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    // redirectToオプションを再追加します
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('Google sign in error:', error);
    return redirect('/login?message=' + encodeURIComponent('Googleログインに失敗しました'));
  }

  return redirect(data.url);
}

export async function deleteUserAccount(userId: string) {
  try {
    // Supabase Edge Functionを呼び出してユーザーを削除
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase設定が不完全です');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ userId }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Edge Function エラー:', result);
      throw new Error(result.error || 'ユーザー削除に失敗しました');
    }

    if (!result.success) {
      throw new Error(result.error || 'ユーザー削除に失敗しました');
    }

    // 警告がある場合はログに出力
    if (result.warning) {
      console.warn('ユーザー削除警告:', result.warning);
    }

    return { 
      success: true, 
      message: result.message,
      warning: result.warning 
    };
  } catch (error) {
    console.error('アカウント削除エラー:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'アカウントの削除に失敗しました' 
    };
  }
}

export async function setPasswordForOAuthUser(email: string, password: string) {
  const supabase = createClient();

  // パスワードリセットを開始
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${headers().get('origin')}/auth/reset-password`,
  });

  if (error) {
    console.error('Password reset error:', error);
    throw error;
  }

  return { success: true };
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Password update error:', error);
    throw error;
  }

  return { success: true };
}
