"use client";

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Dashboard } from '@/components/dashboard/dashboard';
import { OnboardingForm } from '@/components/onboarding/onboarding-form';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  const fetchDashboardData = useCallback(async (userId: string) => {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        goals(*),
        daily_activity_logs(*)
      `)
      .eq('id', userId)
      .single();

    if (profileError) console.error("Profile fetch error:", profileError);

    const { data: weightData, error: weightError } = await supabase
      .from('daily_weight_logs')
      .select('date, weight_kg')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (weightError) console.error("Weight log fetch error:", weightError);

    // 取得したデータを統合して一つのprofileオブジェクトにする
    const combinedProfile = {
      ...profileData,
      target_weight_kg: profileData?.goals[0]?.target_weight_kg,
      goal_target_date: profileData?.goals[0]?.target_date,
      activity_level: profileData?.daily_activity_logs[0]?.activity_level ?? profileData?.activity_level ?? 2,
    };

    setProfile(combinedProfile);
    setWeightLogs(weightData ?? []);
    
    return combinedProfile;
  }, [supabase]);


  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      const currentProfile = await fetchDashboardData(user.id);
      
      if (!currentProfile || !currentProfile.onboarding_completed) {
        setShowOnboarding(true);
      }
      setLoading(false);
    };

    initialize();
  }, [fetchDashboardData, router, supabase]);

  const refreshDashboardData = useCallback(async () => {
    if (user?.id) {
      setLoading(true);
      await fetchDashboardData(user.id);
      setLoading(false);
    }
  }, [user, fetchDashboardData]);


  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    refreshDashboardData();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">読み込み中...</div>;
  }

  if (showOnboarding && user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
        <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-2xl">
           <OnboardingForm user={user} onboardingComplete={handleOnboardingComplete} />
        </div>
      </div>
    );
  }
  
  return <Dashboard profile={profile} weightLogs={weightLogs} onUpdate={refreshDashboardData} />;
}