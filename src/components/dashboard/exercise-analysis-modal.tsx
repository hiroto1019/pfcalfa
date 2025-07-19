"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, X, Loader2, Edit, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ExerciseAnalysisModalProps {
  open: boolean;
  onClose: () => void;
}

interface ExerciseAnalysisResult {
  exercise_name: string;
  calories_burned: number;
  duration_minutes: number;
  exercise_type: string;
  notes: string;
}

export function ExerciseAnalysisModal({ open, onClose }: ExerciseAnalysisModalProps) {
  const [exerciseText, setExerciseText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ExerciseAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const supabase = createClient();

  if (!open) return null;

  const handleAnalyze = async () => {
    if (!exerciseText.trim()) {
      setErrorMessage("運動内容を入力してください");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage("");
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/exercise/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ exerciseText: exerciseText.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setAnalysisResult(data.data);
        // 運動解析完了イベントを発火
        window.dispatchEvent(new CustomEvent('exerciseAnalyzed', { detail: data.data }));
      } else {
        setErrorMessage(data.error || '解析に失敗しました');
      }
    } catch (error) {
      console.error('運動解析エラー:', error);
      setErrorMessage('解析中にエラーが発生しました');
    } finally {
      setIsAnalyzing(false);
    }
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
      handleClose();
    } catch (error) {
      console.error('運動記録エラー:', error);
      setErrorMessage('記録に失敗しました');
    } finally {
      setIsRecording(false);
    }
  };

  const handleEdit = () => {
    // 解析結果をクリアして編集モードに戻る
    setAnalysisResult(null);
    setErrorMessage("");
  };

  const handleClose = () => {
    setExerciseText("");
    setAnalysisResult(null);
    setErrorMessage("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-orange-600" />
            <h2 className="text-xl font-semibold">運動解析</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* 運動内容入力 */}
          <div>
            <Label htmlFor="exerciseText" className="text-sm font-medium">
              運動内容を入力してください
            </Label>
            <Textarea
              id="exerciseText"
              placeholder="例: 30分ランニング、腕立て伏せ20回を3セット、ヨガ1時間..."
              value={exerciseText}
              onChange={(e) => setExerciseText(e.target.value)}
              className="mt-2 min-h-[100px]"
              disabled={isAnalyzing}
            />
          </div>

          {/* エラーメッセージ */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          )}

          {/* 解析ボタン */}
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !exerciseText.trim()}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                解析中...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" />
                運動を解析
              </>
            )}
          </Button>

          {/* 解析結果 */}
          {analysisResult && (
            <Card className="bg-green-50 border-green-200 relative">
              {/* 右上のボタン群 */}
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="h-6 px-2 text-xs"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  編集
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  className="h-6 px-2 text-xs"
                >
                  キャンセル
                </Button>
              </div>
              
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
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">補足</p>
                    <p className="text-sm mt-1">{analysisResult.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 