"use client";

import { signInWithEmail, signInWithGithub } from "@/app/auth/actions";
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
import Link from "next/link";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      setError(message);
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-sm sm:max-w-md">
        <CardHeader className="text-center px-6 sm:px-8">
          <CardTitle className="text-2xl sm:text-3xl font-bold">PFCα</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            AIで最適なPFCバランスを管理
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 sm:px-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          <form action={signInWithGithub} className="space-y-4">
            <Button variant="outline" className="w-full h-12 text-base">
              GitHubでログイン
            </Button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                または
              </span>
            </div>
          </div>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="password" className="text-sm sm:text-base">パスワード</Label>
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className="h-12 text-base pr-12"
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
            <CardFooter className="flex flex-col gap-2 p-0">
              <Button formAction={signInWithEmail} className="w-full h-12 text-base">
                ログイン
              </Button>
            </CardFooter>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              アカウントをお持ちでないですか？{" "}
              <Link href="/register" className="text-blue-600 hover:text-blue-800 underline">
                新規登録
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}