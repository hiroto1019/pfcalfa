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
      const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      if (!profileData || !profileData.onboarding_completed) {
        setShowOnboarding(true);
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    const reloadProfile = async () => {
       const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profileData);
    };
    reloadProfile();
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