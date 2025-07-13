import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export function SettingsPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">設定</h1>
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">プロフィール</TabsTrigger>
          <TabsTrigger value="preferences">食事の好み</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>プロフィール編集</CardTitle>
              <CardDescription>
                あなたの基本情報を更新します。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">ハンドルネーム</Label>
                <Input id="username" defaultValue="PFCマスター" />
              </div>
              {/* TODO: Add other profile fields */}
              <Button>プロフィールを更新</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>食事の好み</CardTitle>
              <CardDescription>
                AIが食事メニューを提案する際の参考にします。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="disliked-foods">嫌いな食べ物</Label>
                <Textarea id="disliked-foods" placeholder="例: トマト, ピーマン" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allergies">アレルギーのある食材</Label>
                <Textarea id="allergies" placeholder="例: えび, そば" />
              </div>
              <Button>好みを保存</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>アカウント管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full">ログアウト</Button>
          <Button variant="destructive" className="w-full">アカウント削除</Button>
        </CardContent>
      </Card>
    </div>
  );
}
