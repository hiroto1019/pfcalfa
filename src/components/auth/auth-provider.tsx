// 1. 新しいファイルを作成: src/components/auth/auth-provider.tsx
// このコンポーネントが認証状態を監視し、ローディング画面を提供します。

'use client';

import { createClient } from '@/lib/supabase/client'; // あなたのクライアント用Supabaseインスタンス
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Contextを作成して、アプリケーション全体でSupabaseインスタンスを共有できるようにします
const SupabaseContext = createContext<any>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChangeは、ユーザーのログイン/ログアウト/初期読み込み時に毎回発火します
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // このコールバックが呼ばれた時点で、認証状態は「確定」しています。
      // これでローディングを終了できます。
      setLoading(false);
    });

    // クリーンアップ関数でリスナーを解除します
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // ローディング中はスピナーなどを表示し、アプリケーション本体は描画しません
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  // ローディング完了後にアプリケーション本体を描画します
  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
}

// 他のコンポーネントからSupabaseインスタンスを簡単に使うためのカスタムフック
export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within an AuthProvider');
  }
  return context;
};
