"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/app/auth/actions";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export function RegisterForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      setError(message);
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(""); // エラーをクリア
  };

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return "パスワードは最低6文字必要です。";
    }
    return null;
  };

  const handleNextStep = () => {
    // Basic validation for step 1
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError("全てのフィールドを入力してください。");
      return;
    }
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError("パスワードが一致しません。");
      return;
    }
    
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    
    // 最終的なバリデーション
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError("全てのフィールドを入力してください。");
      return;
    }
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError("パスワードが一致しません。");
      return;
    }
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      await signUp(formDataToSend);
    } catch (err) {
      setError("登録に失敗しました。もう一度お試しください。");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">新規登録</CardTitle>
          <CardDescription>
            PFCαを始めるためにアカウントを作成します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2 relative">
                <Label htmlFor="password">パスワード（最低6文字）</Label>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 mt-6"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>
              <div className="space-y-2 relative">
                <Label htmlFor="confirmPassword">パスワード（確認用）</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 mt-6"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-center">以下の内容で登録しますか？</p>
              <p><strong>メールアドレス:</strong> {formData.email}</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          {step === 1 && (
            <Button className="w-full" onClick={handleNextStep}>
              次へ
            </Button>
          )}
          {step === 2 && (
            <div className="flex flex-col gap-2 w-full">
              <form onSubmit={handleSubmit}>
                <input type="hidden" name="email" value={formData.email} />
                <input type="hidden" name="password" value={formData.password} />
                <Button type="submit" className="w-full mb-2">
                  登録を完了する
                </Button>
              </form>
              <Button variant="outline" className="w-full" onClick={() => setStep(1)}>
                戻る
              </Button>
            </div>
          )}
        </CardFooter>
        <div className="px-6 pb-6 text-center">
          <p className="text-sm text-gray-600">
            すでにアカウントをお持ちですか？{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-800 underline">
              ログイン
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}