"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, FileText, Activity, X } from "lucide-react";

interface RecordSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onExerciseModalOpen: () => void;
}

export function RecordSelectionModal({ open, onClose, onExerciseModalOpen }: RecordSelectionModalProps) {
  const [selectedOption, setSelectedOption] = useState<"image" | "text" | "exercise" | null>(null);

  if (!open) return null;

  const handleOptionSelect = (option: "image" | "text" | "exercise") => {
    setSelectedOption(option);
    
    // 各オプションに対応するイベントを発火
    switch (option) {
      case "image":
        window.dispatchEvent(new CustomEvent('openMealRecordModal', { detail: { method: 'image' } }));
        break;
      case "text":
        window.dispatchEvent(new CustomEvent('openMealRecordModal', { detail: { method: 'text' } }));
        break;
      case "exercise":
        onExerciseModalOpen();
        break;
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">記録方法を選択</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* 画像解析（食事） */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleOptionSelect("image")}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Camera className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">画像解析（食事）</h3>
                  <p className="text-sm text-gray-500">食事の写真を撮影して自動解析</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* テキスト解析（食事） */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleOptionSelect("text")}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">テキスト解析（食事）</h3>
                  <p className="text-sm text-gray-500">食事内容をテキストで入力して解析</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 運動記録 */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleOptionSelect("exercise")}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Activity className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">運動記録</h3>
                  <p className="text-sm text-gray-500">手動入力またはAI解析で運動を記録</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  );
} 