"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OnboardingForm } from "./onboarding-form";

export function OnboardingTrigger() {
  const [open, setOpen] = useState(false); // Default to closed

  return (
    <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">ようこそ！</h1>
            <p className="mb-8">まずはじめに、あなたのことを教えてください。</p>
            <Button onClick={() => setOpen(true)}>プロフィールを登録する</Button>
            <OnboardingForm open={open} onOpenChange={setOpen} />
        </div>
    </div>
  );
}
