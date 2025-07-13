import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AiAdvice() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AIアドバイス</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">食事アドバイス</h3>
            <p className="text-sm text-muted-foreground">
              タンパク質が不足しています。夕食に鶏胸肉を100g追加してみましょう。
            </p>
          </div>
          <div>
            <h3 className="font-semibold">運動アドバイス</h3>
            <p className="text-sm text-muted-foreground">
              今日の活動量は目標に達していません。30分のウォーキングをおすすめします。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
