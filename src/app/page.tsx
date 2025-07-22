"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Dashboard } from '@/components/dashboard/dashboard';
import { OnboardingForm } from '@/components/onboarding/onboarding-form';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }
        
        console.log('ユーザー認証確認:', user.id);
        setUser(user);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.error('プロフィール取得エラー:', profileError);
        }
        
        console.log('プロフィールデータ:', profileData);
        setProfile(profileData);

        if (!profileData || !profileData.onboarding_completed) {
          console.log('オンボーディング画面を表示');
          setShowOnboarding(true);
        } else {
          console.log('ダッシュボードを表示');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('ユーザー確認エラー:', error);
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    setLoading(true); // ローディング状態にする
    
    // プロフィールを再読み込み
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('プロフィール再読み込みエラー:', profileError);
    }
    
    console.log('オンボーディング完了後のプロフィールデータ:', profileData);
    setProfile(profileData);
    setLoading(false); // ローディング状態を解除
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">読み込み中...</div>;
  }

  if (showOnboarding && user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <OnboardingForm user={user} onboardingComplete={handleOnboardingComplete} />
      </div>
    );
  }

  return <Dashboard profile={profile} />;
}