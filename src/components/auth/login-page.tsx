import { signInWithEmail, signInWithGithub, signUp } from "@/app/auth/actions";
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

export function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">PFCα</CardTitle>
          <CardDescription>
            AIで最適なPFCバランスを管理
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInWithGithub} className="space-y-4">
            <Button variant="outline" className="w-full">
              GitHubでログイン
            </Button>
          </form>
          <div className="relative my-4">
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
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <CardFooter className="flex flex-col gap-2 p-0">
              <Button formAction={signInWithEmail} className="w-full">
                ログイン
              </Button>
              <Button formAction={signUp} variant="outline" className="w-full">
                新規登録
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
