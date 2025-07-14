"use client";

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Dashboard } from '@/components/dashboard/dashboard';
import { OnboardingForm } from '@/components/onboarding/onboarding-form';
import { getIdealCalories } from '@/lib/utils';

export interface MealLog {
  food_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  created_at: string;
}

export interface DashboardData {
  profile: any;
  mealLogs: MealLog[];
  weightLogs: any[];
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  idealCalories: number;
  currentWeight: number;
  onDataRefresh: () => void;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<Omit<DashboardData, 'onDataRefresh'> | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profileData) {
      setLoading(false);
      router.push('/login');
      return;
    }
    
    if (!profileData.onboarding_completed) {
      setUser({ id: userId });
      setLoading(false);
      setShowOnboarding(true);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: mealLogs } = await supabase
      .from('meal_logs')
      .select('food_name, calories, protein, fat, carbs, created_at')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    const { data: weightLogs } = await supabase
      .from('daily_weight_logs')
      .select('date, weight_kg')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    const totalCalories = mealLogs?.reduce((sum, log) => sum + log.calories, 0) || 0;
    const totalProtein = mealLogs?.reduce((sum, log) => sum + log.protein, 0) || 0;
    const totalFat = mealLogs?.reduce((sum, log) => sum + log.fat, 0) || 0;
    const totalCarbs = mealLogs?.reduce((sum, log) => sum + log.carbs, 0) || 0;
    const idealCalories = getIdealCalories(profileData);
    const currentWeight = weightLogs && weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_kg : profileData.initial_weight_kg;

    setDashboardData({
      profile: profileData,
      mealLogs: mealLogs || [],
      weightLogs: weightLogs || [],
      totalCalories,
      totalProtein,
      totalFat,
      totalCarbs,
      idealCalories,
      currentWeight
    });
    setLoading(false);
  }, [supabase, router]);


  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      fetchData(user.id);
    };
    checkUser();
  }, [fetchData, router, supabase]);

  const handleDataRefresh = () => {
    if(user?.id) {
      fetchData(user.id);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    if(user?.id) {
      fetchData(user.id);
    }
  };

  if (loading || !dashboardData) {
    if (showOnboarding && user) {
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-2xl">
               <OnboardingForm user={user} onboardingComplete={handleOnboardingComplete} />
            </div>
          </div>
        );
    }
    return <div className="flex items-center justify-center h-screen">読み込み中...</div>;
  }
  
  const fullDashboardData: DashboardData = {
    ...dashboardData,
    onDataRefresh: handleDataRefresh
  };
  
  return <Dashboard dashboardData={fullDashboardData} />;
}