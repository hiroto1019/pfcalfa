import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent(`認証エラー: ${errorDescription || error}`)}`);
  }

  if (code) {
    const supabase = createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('Code exchange error:', exchangeError);
      return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent('認証コードの交換に失敗しました')}`);
    }
    
    // Successful authentication
    return NextResponse.redirect(`${origin}/`); // ルートページ（ダッシュボード）にリダイレクト
  }

  // No code provided
  console.error('No authorization code provided');
  return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent('認証コードが提供されませんでした')}`);
}
