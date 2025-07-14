"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProfile } from "@/app/onboarding/actions";
import { useRouter } from "next/navigation";

export function OnboardingForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void; }) {
  const [formData, setFormData] = useState({
    username: "",
    gender: "male" as "male" | "female" | "other",
    birth_date: "",
    height_cm: "",
    initial_weight_kg: "",
    target_weight_kg: "",
    activity_level: "3" as "1" | "2" | "3" | "4" | "5",
    goal_type: "maintain" as "diet" | "bulk-up" | "maintain"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const profileData = {
        ...formData,
        birth_date: new Date(formData.birth_date),
        height_cm: Number(formData.height_cm),
        initial_weight_kg: Number(formData.initial_weight_kg),
        target_weight_kg: Number(formData.target_weight_kg),
      };
      
      await createProfile(profileData);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("プロフィール作成エラー:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>プロフィール登録</CardTitle>
          <CardDescription>
            あなたの基本情報を教えてください。PFCバランスの計算に使用されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">お名前</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gender">性別</Label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="birth_date">生年月日</Label>
              <Input
                id="birth_date"
                name="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="height_cm">身長 (cm)</Label>
              <Input
                id="height_cm"
                name="height_cm"
                type="number"
                value={formData.height_cm}
                onChange={handleInputChange}
                required
                min="100"
                max="250"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="initial_weight_kg">現在の体重 (kg)</Label>
              <Input
                id="initial_weight_kg"
                name="initial_weight_kg"
                type="number"
                value={formData.initial_weight_kg}
                onChange={handleInputChange}
                required
                min="30"
                max="200"
                step="0.1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target_weight_kg">目標体重 (kg)</Label>
              <Input
                id="target_weight_kg"
                name="target_weight_kg"
                type="number"
                value={formData.target_weight_kg}
                onChange={handleInputChange}
                required
                min="30"
                max="200"
                step="0.1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="activity_level">活動レベル</Label>
              <select
                id="activity_level"
                name="activity_level"
                value={formData.activity_level}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="1">座り仕事中心（運動なし）</option>
                <option value="2">軽い運動（週1-3回）</option>
                <option value="3">適度な運動（週3-5回）</option>
                <option value="4">活発な運動（週6-7回）</option>
                <option value="5">非常に活発な運動（毎日激しい運動）</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="goal_type">目標</Label>
              <select
                id="goal_type"
                name="goal_type"
                value={formData.goal_type}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="diet">ダイエット</option>
                <option value="bulk-up">筋肉増強</option>
                <option value="maintain">体重維持</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "登録中..." : "登録する"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
