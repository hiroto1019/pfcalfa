import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  console.log('認証コールバック開始:', { code: !!code, error, origin });
  
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent(`認証エラー: ${errorDescription || error}`)}`);
  }

  if (code) {
    const supabase = createClient();
    console.log('認証コード交換開始');
    
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('Code exchange error:', exchangeError);
      return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent('認証コードの交換に失敗しました')}`);
    }
    
    console.log('認証コード交換成功:', { user: data.user?.id });
    
    // Successful authentication
    console.log('リダイレクト先:', `${origin}/`);
    return NextResponse.redirect(`${origin}/`); // ルートページ（ダッシュボード）にリダイレクト
  }

  // No code provided
  console.error('No authorization code provided');
  return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent('認証コードが提供されませんでした')}`);
}
