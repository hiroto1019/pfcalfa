"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, FileText, Activity, X, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface RecordSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onExerciseModalOpen: () => void;
}

interface ExerciseAnalysisResult {
  exercise_name: string;
  calories_burned: number;
  duration_minutes: number;
  exercise_type: string;
  notes: string;
}

export function RecordSelectionModal({ open, onClose, onExerciseModalOpen }: RecordSelectionModalProps) {
  const [selectedOption, setSelectedOption] = useState<"image" | "text" | "exercise" | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ExerciseAnalysisResult | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // 運動解析結果のイベントをリッスン
    const handleExerciseAnalyzed = (event: CustomEvent) => {
      setAnalysisResult(event.detail);
    };

    window.addEventListener('exerciseAnalyzed', handleExerciseAnalyzed as EventListener);
    
    return () => {
      window.removeEventListener('exerciseAnalyzed', handleExerciseAnalyzed as EventListener);
    };
  }, []);

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

  const handleRecord = async () => {
    if (!analysisResult) return;

    setIsRecording(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      const { error } = await supabase
        .from('exercise_logs')
        .insert({
          user_id: user.id,
          exercise_name: analysisResult.exercise_name,
          duration_minutes: analysisResult.duration_minutes,
          calories_burned: analysisResult.calories_burned,
          exercise_type: analysisResult.exercise_type,
          notes: analysisResult.notes
        });

      if (error) {
        throw error;
      }

      // 運動記録イベントを発火
      window.dispatchEvent(new CustomEvent('exerciseRecorded'));
      
      // モーダルを閉じる
      setAnalysisResult(null);
      onClose();
    } catch (error) {
      console.error('運動記録エラー:', error);
      alert('記録に失敗しました');
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
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
          {/* 解析結果がある場合の記録ボタン */}
          {analysisResult && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-lg text-green-800">解析完了</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">運動名</p>
                    <p className="font-medium">{analysisResult.exercise_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">消費カロリー</p>
                    <p className="font-medium text-orange-600">{analysisResult.calories_burned} kcal</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">運動時間</p>
                    <p className="font-medium">{analysisResult.duration_minutes} 分</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">運動タイプ</p>
                    <p className="font-medium">{analysisResult.exercise_type}</p>
                  </div>
                </div>
                {analysisResult.notes && (
                  <div>
                    <p className="text-sm text-gray-600">補足</p>
                    <p className="text-sm">{analysisResult.notes}</p>
                  </div>
                )}
                
                {/* 記録ボタン */}
                <Button
                  onClick={handleRecord}
                  className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
                >
                  {isRecording ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      記録中...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      この内容で記録
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

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