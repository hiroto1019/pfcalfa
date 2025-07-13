"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export function MealRecordModal() {
  const [mode, setMode] = useState<"camera" | "text" | null>(null);

  const renderContent = () => {
    if (mode === "camera") {
      return (
        <div>
          <Label htmlFor="meal-image">食事の画像をアップロード</Label>
          <Input id="meal-image" type="file" accept="image/*" />
          {/* TODO: Add image preview and analysis result form */}
        </div>
      );
    }
    if (mode === "text") {
      return (
        <div>
          <Label htmlFor="meal-text">食事の内容を入力</Label>
          <Textarea id="meal-text" placeholder="例: 鶏胸肉 200g、ごはん 150g" />
          {/* TODO: Add analysis result form */}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={() => setMode("camera")}>
          カメラで解析
        </Button>
        <Button variant="outline" onClick={() => setMode("text")}>
          テキストで入力
        </Button>
      </div>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="fixed bottom-8 right-8">
            <Button size="lg" className="rounded-full w-16 h-16 text-2xl">+</Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>食事の記録</DialogTitle>
          <DialogDescription>
            食事の記録方法を選択してください。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">{renderContent()}</div>
        <DialogFooter>
          {mode && <Button onClick={() => setMode(null)}>戻る</Button>}
          <Button type="submit">登録</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
