"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { SimpleDatePicker } from "@/components/ui/simple-date-picker";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getIdealCalories } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteUserAccount, updatePassword } from "@/app/auth/actions";

interface Profile {
  id: string;
  username: string;
  gender: string;
  birth_date: string;
  height_cm: number;
  initial_weight_kg: number;
  target_weight_kg: number;
  activity_level: number;
  goal_type: string;
  food_preferences?: {
    dislikes: string[];
    allergies: string[];
  };
  goal_target_date?: string;
}

export function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<Profile | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [originalCurrentWeight, setOriginalCurrentWeight] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [newDislike, setNewDislike] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // パスワード設定用の状態
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<string[]>([]);

  const supabase = createClient();
  const router = useRouter();

  // モバイルでの入力時の自動スクロールを防ぐ
  useEffect(() => {
    const inputs = document.querySelectorAll('input, select, textarea');
    
    const handleFocus = (e: Event) => {
      const target = e.target as HTMLElement;
      // モバイルでのみ適用
      if (window.innerWidth <= 768) {
        // 少し遅延を入れてからスクロール位置を調整
        setTimeout(() => {
          const rect = target.getBoundingClientRect();
          const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
          
          if (!isInViewport) {
            // 入力フィールドが画面外にある場合のみ、最小限のスクロール
            target.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }
        }, 100);
      }
    };

    inputs.forEach(input => {
      input.addEventListener('focus', handleFocus);
    });

    return () => {
      inputs.forEach(input => {
        input.removeEventListener('focus', handleFocus);
      });
    };
  }, []);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      setUser(user);

      // パスワード設定状況とOAuthプロバイダーを確認
      const { data: { user: userDetails } } = await supabase.auth.getUser();
      if (userDetails) {
        // パスワードが設定されているかチェック（より正確な判定）
        const providers = userDetails.app_metadata?.providers || [];
        const hasEmailProvider = providers.includes('email');
        const isEmailOnlyUser = userDetails.app_metadata?.provider === 'email';
        
        // パスワードが設定されているかどうかを判定
        // emailプロバイダーが含まれている場合、またはemailのみのユーザーの場合はパスワードが設定済み
        setHasPassword(hasEmailProvider || isEmailOnlyUser);
        
        // OAuthプロバイダーを取得（email以外）
        const oauthProviders = providers.filter((p: string) => p !== 'email');
        setOauthProviders(oauthProviders);
        console.log('OAuthプロバイダー:', oauthProviders);
        console.log('パスワード設定状況:', hasEmailProvider || isEmailOnlyUser);
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        console.log('設定画面 - プロフィールデータ読み込み:', profileData);
        console.log('設定画面 - goal_type:', profileData.goal_type);
        setProfile(profileData);
        setOriginalProfile(profileData);
      }

      // 現在の体重を取得
      const { data: weightData } = await supabase
        .from('daily_weight_logs')
        .select('weight_kg')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (weightData) {
        setCurrentWeight(weightData.weight_kg);
        setOriginalCurrentWeight(weightData.weight_kg);
      } else if (profileData?.initial_weight_kg) {
        // 体重ログがない場合は、オンボーディング時の初期体重を使用
        setCurrentWeight(profileData.initial_weight_kg);
        setOriginalCurrentWeight(profileData.initial_weight_kg);
      }
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // プロフィールに変更があるかチェック
  const hasProfileChanges = () => {
    if (!profile || !originalProfile) return false;
    
    return (
      profile.username !== originalProfile.username ||
      profile.gender !== originalProfile.gender ||
      profile.birth_date !== originalProfile.birth_date ||
      profile.height_cm !== originalProfile.height_cm ||
      profile.target_weight_kg !== originalProfile.target_weight_kg ||
      profile.activity_level !== originalProfile.activity_level ||
      profile.goal_type !== originalProfile.goal_type ||
      profile.goal_target_date !== originalProfile.goal_target_date ||
      currentWeight !== originalCurrentWeight
    );
  };

  // バリデーション関数
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!profile) return errors;
    
    if (!profile.username?.trim()) {
      errors.username = 'お名前は必須です';
    }
    
    if (!profile.birth_date) {
      errors.birth_date = '生年月日は必須です';
    }
    
    if (!profile.height_cm || profile.height_cm <= 0) {
      errors.height_cm = '身長は必須です';
    }
    
    if (!currentWeight || currentWeight <= 0) {
      errors.currentWeight = '現在の体重は必須です';
    }
    
    if (!profile.target_weight_kg || profile.target_weight_kg <= 0) {
      errors.target_weight_kg = '目標体重は必須です';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!profile) return;

    // バリデーションチェック
    if (!validateForm()) {
      alert('必須項目を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          setIsSaving(false);
          return;
      }
      
      const today = new Date().toISOString().split('T')[0];

      // 1. プロフィール情報を更新 (現在の体重を除く)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id,
          username: profile.username,
          gender: profile.gender,
          birth_date: profile.birth_date,
          height_cm: profile.height_cm,
          target_weight_kg: profile.target_weight_kg,
          activity_level: profile.activity_level,
          goal_type: profile.goal_type,
          food_preferences: profile.food_preferences,
          goal_target_date: profile.goal_target_date,
          onboarding_completed: true,
        });

      // 2. 今日の体重を更新
      const { error: weightError } = await supabase
        .from('daily_weight_logs')
        .upsert({ user_id: user.id, date: today, weight_kg: currentWeight }, { onConflict: 'user_id, date' });


      if (profileError) throw profileError;
      if (weightError) throw weightError;

      alert('プロフィールを更新しました');
      setValidationErrors({}); // エラーをクリア
      
      // 元のデータを更新
      setOriginalProfile(profile);
      setOriginalCurrentWeight(currentWeight);
    } catch (error) {
      console.error('プロフィール更新エラー:', error);
      alert('プロフィールの更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== '削除') {
      alert('「削除」と入力してください');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('ユーザーが見つかりませんでした。');
        return;
      }

      // 確認ダイアログを閉じる
      setShowDeleteConfirm(false);
      setDeleteText("");

      // 削除処理中の表示
      alert('アカウント削除を開始します。この処理には数秒かかる場合があります。');

      // サーバーアクションを使用してユーザーデータを削除
      const result = await deleteUserAccount(user.id);
      
      if (result.success) {
        // 成功メッセージを表示
        if (result.warning) {
          alert(`アカウントデータを削除しました。\n\n注意: ${result.warning}\n\nログアウトします。`);
        } else {
          alert('アカウントデータを正常に削除しました。ログアウトします。');
        }
        
        // ユーザーをログアウトさせる
        await supabase.auth.signOut();
        router.push('/login');
      } else {
        // エラーメッセージを表示
        alert(`アカウントの削除に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('アカウント削除エラー:', error);
      alert('アカウントの削除に失敗しました。しばらく時間をおいて再度お試しください。');
    }
  };

  const addDislike = async () => {
    if (!newDislike?.trim() || !profile) return;
    
    const dislikes = profile.food_preferences?.dislikes || [];
    if (!dislikes.includes(newDislike)) {
      const updatedProfile = {
        ...profile,
        food_preferences: {
          dislikes: [...dislikes, newDislike],
          allergies: profile.food_preferences?.allergies || []
        }
      };
      
      setProfile(updatedProfile);
      
      // データベースに即座に保存
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
          .from('profiles')
          .update({ food_preferences: updatedProfile.food_preferences })
            .eq('id', user.id);
        }
      } catch (error) {
        console.error('嫌いな食べ物の保存エラー:', error);
      }
      
      setNewDislike("");
    }
  };

  const removeDislike = async (dislike: string) => {
    if (!profile) return;
    
    const dislikes = profile.food_preferences?.dislikes || [];
    const updatedDislikes = dislikes.filter(d => d !== dislike);
    
    const updatedProfile = {
      ...profile,
      food_preferences: {
        dislikes: updatedDislikes,
        allergies: profile.food_preferences?.allergies || []
      }
    };
    
    setProfile(updatedProfile);
    
    // データベースに即座に保存
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
        .from('profiles')
        .update({ food_preferences: updatedProfile.food_preferences })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('嫌いな食べ物の削除エラー:', error);
    }
  };

  const addAllergy = async () => {
    if (!newAllergy?.trim() || !profile) return;
    
    const allergies = profile.food_preferences?.allergies || [];
    if (!allergies.includes(newAllergy)) {
      const updatedProfile = {
        ...profile,
        food_preferences: {
          dislikes: profile.food_preferences?.dislikes || [],
          allergies: [...allergies, newAllergy]
        }
      };
      
      setProfile(updatedProfile);
      
      // データベースに即座に保存
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
          .from('profiles')
          .update({ food_preferences: updatedProfile.food_preferences })
            .eq('id', user.id);
        }
      } catch (error) {
        console.error('アレルギーの保存エラー:', error);
      }
      
      setNewAllergy("");
    }
  };

  const removeAllergy = async (allergy: string) => {
    if (!profile) return;
    
    const allergies = profile.food_preferences?.allergies || [];
    const updatedAllergies = allergies.filter(a => a !== allergy);
    
    const updatedProfile = {
      ...profile,
      food_preferences: {
        dislikes: profile.food_preferences?.dislikes || [],
        allergies: updatedAllergies
      }
    };
    
    setProfile(updatedProfile);
    
    // データベースに即座に保存
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
        .from('profiles')
        .update({ food_preferences: updatedProfile.food_preferences })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('アレルギーの削除エラー:', error);
    }
  };

  const handleSetPassword = async () => {
    setPasswordError("");
    
    if (newPassword !== confirmNewPassword) {
      setPasswordError("パスワードが一致しません");
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError("パスワードは最低6文字必要です");
      return;
    }
    
    setIsSettingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword("");
      setConfirmNewPassword("");
      setShowPasswordSection(false);
      setHasPassword(true); // パスワード設定状態を更新
      alert(hasPassword ? "パスワードが正常にリセットされました。" : "パスワードが正常に設定されました。今後はメールアドレスとパスワードでログインできます。");
    } catch (error: any) {
      setPasswordError(error.message || "パスワードの設定に失敗しました");
    } finally {
      setIsSettingPassword(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">データを読み込んでいます...</div>;
  }

  if (!profile) {
    return <div className="flex items-center justify-center h-full">プロフィールが見つかりません</div>;
  }

  const idealCalories = profile && currentWeight ? getIdealCalories(profile, currentWeight, profile.activity_level) : 2000;

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">設定</h1>
        <Button variant="outline" onClick={() => router.push('/')} className="w-full sm:w-auto">
          ダッシュボードに戻る
        </Button>
      </div>

      {/* プロフィール編集 */}
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900">プロフィール編集</CardTitle>
          <CardDescription className="text-gray-600">
            基本情報を編集できます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 名前と性別 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                お名前 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                className="h-12 mobile-input-fix"
                placeholder="お名前を入力"
                style={{ 
                  fontSize: '16px',
                  transform: 'translateZ(0)',
                }}
              />
              {validationErrors.username && (
                <p className="text-red-500 text-xs">{validationErrors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-sm font-medium text-gray-700">性別</Label>
              <select
                id="gender"
                value={profile.gender}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                className="w-full h-12 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mobile-input-fix"
                style={{ 
                  fontSize: '16px',
                  transform: 'translateZ(0)',
                }}
              >
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>

          {/* 生年月日と目標達成日 */}
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="flex-1 min-w-0">
              <div className="space-y-2 w-full">
                <Label htmlFor="birth_date" className="text-sm font-medium text-gray-700">
                  生年月日 <span className="text-red-500">*</span>
                </Label>
                <SimpleDatePicker
                  value={profile.birth_date ? new Date(profile.birth_date) : undefined}
                  onChange={(date) => setProfile({ ...profile, birth_date: date ? date.toISOString().split('T')[0] : '' })}
                  placeholder="生年月日を選択"
                  className="h-12 mobile-input-fix w-full"
                />
                {validationErrors.birth_date && (
                  <p className="text-red-500 text-xs">{validationErrors.birth_date}</p>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="space-y-2 w-full">
                <Label htmlFor="goal_target_date" className="text-sm font-medium text-gray-700">目標達成日</Label>
                <SimpleDatePicker
                  value={profile.goal_target_date ? new Date(profile.goal_target_date) : undefined}
                  onChange={(date) => setProfile({ ...profile, goal_target_date: date ? date.toISOString().split('T')[0] : '' })}
                  placeholder="目標達成日を選択"
                  className="h-12 mobile-input-fix w-full"
                  allowFuture={true}
                  maxYearOffset={50}
                />
              </div>
            </div>
          </div>

          {/* 身長、現在の体重、目標体重 */}
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-2">
              <Label htmlFor="height_cm" className="text-sm font-medium text-gray-700">
                身長 (cm) <span className="text-red-500">*</span>
              </Label>
              <NumberInput
                id="height_cm"
                value={profile.height_cm}
                onChange={(value) => setProfile({ ...profile, height_cm: typeof value === 'number' ? value : 0 })}
                placeholder="170"
                className="h-12 mobile-input-fix w-full"
                style={{ 
                  fontSize: '16px',
                  transform: 'translateZ(0)',
                  height: '48px',
                  lineHeight: '48px',
                }}
              />
              {validationErrors.height_cm && (
                <p className="text-red-500 text-xs">{validationErrors.height_cm}</p>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <Label htmlFor="current_weight" className="text-sm font-medium text-gray-700">
                現在の体重 (kg) <span className="text-red-500">*</span>
              </Label>
              <NumberInput
                id="current_weight"
                value={currentWeight}
                onChange={(value) => setCurrentWeight(typeof value === 'number' ? value : null)}
                step="0.1"
                placeholder="60"
                className="h-12 mobile-input-fix w-full"
                style={{ 
                  fontSize: '16px',
                  transform: 'translateZ(0)',
                }}
              />
              {validationErrors.currentWeight && (
                <p className="text-red-500 text-xs">{validationErrors.currentWeight}</p>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <Label htmlFor="target_weight_kg" className="text-sm font-medium text-gray-700">
                目標体重 (kg) <span className="text-red-500">*</span>
              </Label>
              <NumberInput
                id="target_weight_kg"
                value={profile.target_weight_kg}
                onChange={(value) => setProfile({ ...profile, target_weight_kg: typeof value === 'number' ? value : 0 })}
                placeholder="55"
                className="h-12 mobile-input-fix w-full"
                style={{ 
                  fontSize: '16px',
                  transform: 'translateZ(0)',
                }}
              />
              {validationErrors.target_weight_kg && (
                <p className="text-red-500 text-xs">{validationErrors.target_weight_kg}</p>
              )}
            </div>
          </div>

          {/* 活動レベルと目標 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity_level" className="text-sm font-medium text-gray-700">活動レベル</Label>
              <select
                id="activity_level"
                value={profile.activity_level}
                onChange={(e) => setProfile({ ...profile, activity_level: Number(e.target.value) })}
                className="w-full h-12 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mobile-input-fix"
                style={{ 
                  fontSize: '16px',
                  transform: 'translateZ(0)',
                  lineHeight: '48px',
                  paddingTop: '0',
                  paddingBottom: '0',
                }}
              >
                <option value={1}>座り仕事中心（運動なし）</option>
                <option value={2}>軽い運動（週1-2回）</option>
                <option value={3}>中程度の運動（週3-5回）</option>
                <option value={4}>激しい運動（週6-7回）</option>
                <option value={5}>非常に激しい運動</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal_type" className="text-sm font-medium text-gray-700">目標</Label>
              <select
                id="goal_type"
                value={profile.goal_type || ""}
                onChange={(e) => setProfile({ ...profile, goal_type: e.target.value })}
                className="w-full h-12 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mobile-input-fix"
                style={{ 
                  fontSize: '16px',
                  transform: 'translateZ(0)',
                  lineHeight: '48px',
                  paddingTop: '0',
                  paddingBottom: '0',
                }}
              >
                <option value="">目標を選択</option>
                <option value="diet">ダイエット</option>
                <option value="maintain">維持</option>
                <option value="bulk">増量</option>
              </select>
            </div>
          </div>

          {/* 保存ボタン */}
          <div className="pt-4">
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !hasProfileChanges()} 
              className="w-full sm:w-auto px-8 py-2 h-10"
            >
            {isSaving ? '保存中...' : '保存'}
          </Button>
          </div>
        </CardContent>
      </Card>

      {/* 食事の好み */}
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900">食事の好み</CardTitle>
          <CardDescription className="text-gray-600">
            嫌いな食べ物やアレルギーを登録すると、AIが食事メニューを提案する際に除外されます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 嫌いな食べ物 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">嫌いな食べ物</Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                value={newDislike}
                onChange={(e) => setNewDislike(e.target.value)}
                placeholder="例: トマト"
                onKeyPress={(e) => e.key === 'Enter' && addDislike()}
                className="flex-1 h-12 mobile-input-fix"
                style={{ 
                  fontSize: '16px',
                  transform: 'translateZ(0)',
                }}
              />
              <Button 
                onClick={addDislike} 
                disabled={!newDislike.trim()}
                className="w-full sm:w-auto px-6 h-12"
              >
                追加
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.food_preferences?.dislikes?.map((dislike, index) => (
                <span
                  key={index}
                  className="bg-gray-100 text-gray-800 px-3 py-2 rounded-full text-sm flex items-center gap-2"
                >
                  {dislike}
                  <button
                    onClick={() => removeDislike(dislike)}
                    className="text-gray-500 hover:text-gray-700 text-lg font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* アレルギー */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">アレルギー</Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                placeholder="例: えび"
                onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
                className="flex-1 h-12 mobile-input-fix"
                style={{ 
                  fontSize: '16px',
                  transform: 'translateZ(0)',
                }}
              />
              <Button 
                onClick={addAllergy} 
                disabled={!newAllergy.trim()}
                className="w-full sm:w-auto px-6 h-12"
              >
                追加
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.food_preferences?.allergies?.map((allergy, index) => (
                <span
                  key={index}
                  className="bg-gray-100 text-gray-800 px-3 py-2 rounded-full text-sm flex items-center gap-2"
                >
                  {allergy}
                  <button
                    onClick={() => removeAllergy(allergy)}
                    className="text-gray-500 hover:text-gray-700 text-lg font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アカウント設定 */}
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900">アカウント設定</CardTitle>
          <CardDescription className="text-gray-600">
            アカウントの設定を管理できます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* パスワード設定セクション */}
          {user && (
            <div className="space-y-4">
              {/* OAuthプロバイダー情報 */}
              {oauthProviders.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">連携済みアカウント</h4>
                  <div className="flex flex-wrap gap-2">
                    {oauthProviders.map((provider) => (
                      <span key={provider} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {provider === 'google' ? 'Google' : provider === 'github' ? 'GitHub' : provider}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">メールアドレスログイン</h3>
                  <p className="text-sm text-gray-600">
                    {user.email} でメールアドレスとパスワードでのログインを{hasPassword ? '使用できます' : '有効にします'}
                  </p>
                  {hasPassword && (
                    <p className="text-xs text-green-600 mt-1">✓ パスワードが設定済み</p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="h-10 w-full sm:w-auto"
                >
                  {showPasswordSection ? 'キャンセル' : (hasPassword ? 'パスワードをリセット' : 'パスワードを設定')}
                </Button>
              </div>
              
              {showPasswordSection && (
                <div className="border rounded-lg p-4 space-y-4">
                  {passwordError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-600 text-sm">{passwordError}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-sm font-medium text-gray-700">
                      {hasPassword ? '新しいパスワード（最低6文字）' : 'パスワード（最低6文字）'}
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-12 mobile-input-fix"
                      placeholder={hasPassword ? '新しいパスワードを入力' : 'パスワードを入力'}
                      style={{ 
                        fontSize: '16px',
                        transform: 'translateZ(0)',
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password" className="text-sm font-medium text-gray-700">
                      パスワード（確認用）
                    </Label>
                    <Input
                      id="confirm-new-password"
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="h-12 mobile-input-fix"
                      placeholder="パスワードを再入力"
                      style={{ 
                        fontSize: '16px',
                        transform: 'translateZ(0)',
                      }}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleSetPassword}
                    disabled={isSettingPassword || !newPassword || !confirmNewPassword}
                    className="w-full h-12"
                  >
                    {isSettingPassword ? '設定中...' : (hasPassword ? 'パスワードをリセット' : 'パスワードを設定')}
                  </Button>
                </div>
              )}
            </div>
          )}

          <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto px-8 py-3 h-12">
            ログアウト
          </Button>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-red-600 mb-3">危険な操作</h3>
            <p className="text-sm text-gray-600 mb-3">
              アカウント削除により、全てのデータが削除され、アカウントは無効化されます。
              完全なアカウント削除には管理者の確認が必要な場合があります。
            </p>
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full sm:w-auto px-8 py-3 h-12"
            >
              アカウント削除
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* アカウント削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-4 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-red-600">アカウント削除の確認</CardTitle>
              <CardDescription>
                本当にアカウントを削除しますか？全てのデータが完全に削除され、アカウントは無効化されます。この操作は元に戻すことはできません。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delete-confirm" className="text-sm font-medium text-gray-700">
                  削除を確認するには「削除」と入力してください
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  placeholder="削除"
                  className="h-12 mobile-input-fix"
                  style={{ 
                    fontSize: '16px',
                    transform: 'translateZ(0)',
                  }}
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteText("");
                  }}
                  className="w-full sm:w-auto h-12"
                >
                  キャンセル
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                  disabled={deleteText !== '削除'}
                  className="w-full sm:w-auto h-12"
                >
                  削除
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <style jsx>{`
        .mobile-input-fix {
          /* モバイルでの入力時の自動スクロールを防ぐ */
          -webkit-overflow-scrolling: touch;
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
        }
        
        .mobile-select-fix {
          /* セレクトボックスのモバイル対応 */
          -webkit-overflow-scrolling: touch;
        }
        
        /* モバイルでの入力フィールドフォーカス時の動作を改善 */
        @media (max-width: 768px) {
          .mobile-input-fix:focus {
            position: relative;
            z-index: 1;
          }
        }
      `}</style>
    </div>
  );
}
