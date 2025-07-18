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
    return redirect('/register?message=' + encodeURIComponent('登録に失敗しました'));
  }

  revalidatePath('/', 'layout');
  redirect('/login?message=' + encodeURIComponent('確認メールを送信しました。メールを確認してログインしてください'));
}

export async function signInWithGithub() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${headers().get('origin')}/auth/callback`,
    },
  });

  if (error) {
    console.error('GitHub sign in error:', error);
    return redirect('/login?message=' + encodeURIComponent('GitHubログインに失敗しました'));
  }

  return redirect(data.url);
}

export async function deleteUserAccount(userId: string) {
  const supabase = createClient();

  try {
    // 関連データを削除（CASCADEにより関連データも削除される）
    const { error: deleteDataError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteDataError) {
      console.error('プロフィール削除エラー:', deleteDataError);
      throw new Error('プロフィールの削除に失敗しました');
    }

    // 無料プランではauth.admin.deleteUserが利用できないため、
    // ユーザーのデータを削除してアカウントを無効化する
    // 実際のユーザー削除は管理者が手動で行う必要があります
    
    return { success: true };
  } catch (error) {
    console.error('アカウント削除エラー:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'アカウントの削除に失敗しました' 
    };
  }
}
