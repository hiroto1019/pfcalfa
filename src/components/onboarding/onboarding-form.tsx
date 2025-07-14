"use client";

import React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, type OnboardingFormState } from "@/app/onboarding/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: OnboardingFormState = {
  message: '',
  errors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? '登録中...' : '登録する'}
    </Button>
  );
}

export function OnboardingForm({ userId }: { userId: string }) {
  const [state, formAction] = useFormState(updateProfile, initialState);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>プロフィール登録</CardTitle>
          <CardDescription>
            あなたに最適なカロリーを計算するために、以下の情報を入力してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="userId" value={userId} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initial_weight_kg">現在の体重 (kg)</Label>
                <Input name="initial_weight_kg" id="initial_weight_kg" type="number" required />
                {state.errors?.initial_weight_kg && <p className="text-sm text-red-500">{state.errors.initial_weight_kg[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_weight_kg">目標体重 (kg)</Label>
                <Input name="target_weight_kg" id="target_weight_kg" type="number" required />
                {state.errors?.target_weight_kg && <p className="text-sm text-red-500">{state.errors.target_weight_kg[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="height_cm">身長 (cm)</Label>
                <Input name="height_cm" id="height_cm" type="number" required />
                {state.errors?.height_cm && <p className="text-sm text-red-500">{state.errors.height_cm[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">生年月日</Label>
                <Input name="birth_date" id="birth_date" type="date" required />
                {state.errors?.birth_date && <p className="text-sm text-red-500">{state.errors.birth_date[0]}</p>}
              </div>
               <div className="space-y-2">
                <Label htmlFor="target_date">目標達成日</Label>
                <Input name="target_date" id="target_date" type="date" required />
                {state.errors?.target_date && <p className="text-sm text-red-500">{state.errors.target_date[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">性別</Label>
                <Select name="gender" required>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">男性</SelectItem>
                    <SelectItem value="female">女性</SelectItem>
                  </SelectContent>
                </Select>
                {state.errors?.gender && <p className="text-sm text-red-500">{state.errors.gender[0]}</p>}
              </div>
               <div className="space-y-2 md:col-span-2">
                <Label htmlFor="activity_level">活動レベル</Label>
                <Select name="activity_level" required defaultValue="2">
                   <SelectTrigger id="activity_level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1"> sedentary (office worker)</SelectItem>
                    <SelectItem value="2">lightly active (1-2 days/week exercise)</SelectItem>
                    <SelectItem value="3">moderately active (3-5 days/week exercise)</SelectItem>
                    <SelectItem value="4">very active (6-7 days/week exercise)</SelectItem>
                    <SelectItem value="5">extra active (daily exercise & physical job)</SelectItem>
                  </SelectContent>
                </Select>
                 {state.errors?.activity_level && <p className="text-sm text-red-500">{state.errors.activity_level[0]}</p>}
              </div>
            </div>
            
            {state.message && !state.errors && <p className="text-sm text-red-500">{state.message}</p>}
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
