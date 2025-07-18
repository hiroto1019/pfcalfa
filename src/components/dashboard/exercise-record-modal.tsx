"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, X, Plus, Loader2, Zap } from "lucide-react";

interface ExerciseRecordModalProps {
  open: boolean;
  onClose: () => void;
  onExerciseAdded: () => void;
}

interface ExerciseFormData {
  exercise_name: string;
  duration_minutes: string;
  calories_burned: string;
  exercise_type: string;
  notes: string;
}

// 一般的な運動データ
const COMMON_EXERCISES = [
  { name: 'ランニング', calories: 300, type: 'cardio' },
  { name: 'ウォーキング', calories: 150, type: 'cardio' },
  { name: 'サイクリング', calories: 250, type: 'cardio' },
  { name: '水泳', calories: 400, type: 'cardio' },
  { name: '筋力トレーニング', calories: 200, type: 'strength' },
  { name: 'ヨガ', calories: 120, type: 'flexibility' },
  { name: 'ピラティス', calories: 150, type: 'flexibility' },
  { name: 'バスケットボール', calories: 350, type: 'sports' },
  { name: 'テニス', calories: 300, type: 'sports' },
  { name: 'サッカー', calories: 400, type: 'sports' },
  { name: '卓球', calories: 200, type: 'sports' },
  { name: 'ダンス', calories: 250, type: 'cardio' },
  { name: 'エアロビクス', calories: 300, type: 'cardio' },
  { name: 'ボクシング', calories: 400, type: 'strength' },
  { name: 'クロスフィット', calories: 350, type: 'strength' }
];

const EXERCISE_TYPES = [
  { value: 'cardio', label: '有酸素運動' },
  { value: 'strength', label: '筋力トレーニング' },
  { value: 'flexibility', label: '柔軟性' },
  { value: 'sports', label: 'スポーツ' },
  { value: 'other', label: 'その他' }
];

export default function ExerciseRecordModal({ open, onClose, onExerciseAdded }: ExerciseRecordModalProps) {
  const [formData, setFormData] = useState<ExerciseFormData>({
    exercise_name: '',
    duration_minutes: '',
    calories_burned: '',
    exercise_type: '',
    notes: ''
  });
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'analysis'>('manual');
  const [isRegisteredFromAnalysis, setIsRegisteredFromAnalysis] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleExerciseSelect = (exercise: any) => {
    setSelectedExercise(exercise);
    setFormData(prev => ({
      ...prev,
      exercise_name: exercise.name,
      exercise_type: exercise.type,
      duration_minutes: '30',
      calories_burned: exercise.calories.toString()
    }));
  };

  const calculateCalories = () => {
    if (selectedExercise && formData.duration_minutes) {
      const duration = parseInt(formData.duration_minutes);
      const caloriesPer30Min = selectedExercise.calories;
      const calculatedCalories = Math.round((caloriesPer30Min * duration) / 30);
      setFormData(prev => ({
        ...prev,
        calories_burned: calculatedCalories.toString()
      }));
    }
  };

  const handleAnalyze = async () => {
    if (!analysisText.trim()) {
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
        body: JSON.stringify({ exerciseText: analysisText.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setAnalysisResult(data.data);
        setAnalysisData(data.data);
        setShowAnalysisModal(true);
        // 手動入力タブには自動的に移動しない
        // フォームデータも自動的に設定しない
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!formData.exercise_name || !formData.duration_minutes || !formData.calories_burned || !formData.exercise_type) {
      alert('必須項目を入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody = {
        exercise_name: formData.exercise_name,
        duration_minutes: parseInt(formData.duration_minutes),
        calories_burned: parseInt(formData.calories_burned),
        exercise_type: formData.exercise_type,
        notes: formData.notes
      };

      console.log('運動記録作成リクエスト:', requestBody);

      const response = await fetch('/api/exercise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('レスポンスステータス:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('運動記録作成エラーレスポンス:', errorText);
        
        let errorMessage = '運動記録の作成に失敗しました';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('エラーレスポンスのパース失敗:', e);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('運動記録作成成功:', data);

      // フォームをリセット
      setFormData({
        exercise_name: '',
        duration_minutes: '',
        calories_burned: '',
        exercise_type: '',
        notes: ''
      });
      setSelectedExercise(null);
      setAnalysisText('');
      setAnalysisResult(null);
      setAnalysisData(null);
      setErrorMessage('');
      setShowAnalysisModal(false);

      onExerciseAdded();
      onClose();

    } catch (error) {
      console.error('運動記録作成エラー:', error);
      alert(error instanceof Error ? error.message : '運動記録の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 必須項目が入力されているかチェック
  const isFormValid = () => {
    return formData.exercise_name.trim() !== '' && 
           formData.duration_minutes.trim() !== '' && 
           formData.calories_burned.trim() !== '' && 
           formData.exercise_type.trim() !== '';
  };

  const handleClose = () => {
    setFormData({
      exercise_name: '',
      duration_minutes: '',
      calories_burned: '',
      exercise_type: '',
      notes: ''
    });
    setSelectedExercise(null);
    setAnalysisText('');
    setAnalysisResult(null);
    setAnalysisData(null);
    setErrorMessage('');
    setActiveTab('manual');
    setIsRegisteredFromAnalysis(false);
    setShowAnalysisModal(false);
    onClose();
  };

  // 解析完了モーダルでの記録処理
  const handleAnalysisRecord = async () => {
    if (!analysisData) return;

    setIsSubmitting(true);

    try {
      const requestBody = {
        exercise_name: analysisData.exercise_name,
        duration_minutes: analysisData.duration_minutes,
        calories_burned: analysisData.calories_burned,
        exercise_type: analysisData.exercise_type,
        notes: analysisData.notes || ''
      };

      console.log('AI解析結果から運動記録作成リクエスト:', requestBody);

      const response = await fetch('/api/exercise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('運動記録作成エラーレスポンス:', errorText);
        
        let errorMessage = '運動記録の作成に失敗しました';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('エラーレスポンスのパース失敗:', e);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('AI解析結果から運動記録作成成功:', data);

      // フォームをリセット
      setFormData({
        exercise_name: '',
        duration_minutes: '',
        calories_burned: '',
        exercise_type: '',
        notes: ''
      });
      setSelectedExercise(null);
      setAnalysisText('');
      setAnalysisResult(null);
      setAnalysisData(null);
      setErrorMessage('');
      setShowAnalysisModal(false);

      onExerciseAdded();
      onClose();

    } catch (error) {
      console.error('運動記録作成エラー:', error);
      alert(error instanceof Error ? error.message : '運動記録の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 解析完了モーダルでの編集処理
  const handleAnalysisEdit = () => {
    if (!analysisData) return;

    // 解析結果をフォームに反映
    setFormData({
      exercise_name: analysisData.exercise_name,
      duration_minutes: analysisData.duration_minutes.toString(),
      calories_burned: analysisData.calories_burned.toString(),
      exercise_type: analysisData.exercise_type,
      notes: analysisData.notes || ''
    });

    setShowAnalysisModal(false);
    setActiveTab('manual');
  };

  // 解析完了モーダルでのキャンセル処理
  const handleAnalysisCancel = () => {
    setShowAnalysisModal(false);
    setAnalysisData(null);
    setAnalysisResult(null);
  };

  if (!open) return null;

  return (
    <>
      {/* 解析完了モーダル */}
      {showAnalysisModal && analysisData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">解析完了</h3>
              <p className="text-gray-600">運動内容の解析が完了しました</p>
            </div>

            {/* 解析結果の表示 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">運動名</span>
                  <span className="font-medium">{analysisData.exercise_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">運動時間</span>
                  <span className="font-medium">{analysisData.duration_minutes}分</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">消費カロリー</span>
                  <span className="font-medium text-orange-600">{analysisData.calories_burned}kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">運動タイプ</span>
                  <span className="font-medium">{analysisData.exercise_type}</span>
                </div>
                {analysisData.notes && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">補足</span>
                    <span className="font-medium text-sm">{analysisData.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ボタン群 */}
            <div className="flex gap-3">
              <Button
                onClick={handleAnalysisCancel}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleAnalysisEdit}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                編集
              </Button>
              <Button
                onClick={handleAnalysisRecord}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    記録中...
                  </>
                ) : (
                  'この内容で記録'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* メインの運動記録モーダル */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[80vh] flex flex-col">
        {/* 固定ヘッダー */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6" />
              運動記録
            </h2>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* タブ切り替え */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <Button
              variant={activeTab === 'manual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('manual')}
              className="flex-1"
            >
              手動入力
            </Button>
            <Button
              variant={activeTab === 'analysis' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('analysis')}
              className="flex-1"
            >
              <Zap className="w-4 h-4 mr-2" />
              AI解析
            </Button>
          </div>
        </div>

        {/* スクロール可能なコンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-6">

        {activeTab === 'manual' ? (
          <div className="space-y-6">
            {/* 一般的な運動選択 */}
            <div>
              <Label className="text-sm font-medium">一般的な運動</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  const exercise = COMMON_EXERCISES.find(ex => ex.name === value);
                  if (exercise) {
                    handleExerciseSelect(exercise);
                  }
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="一般的な運動を選択" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_EXERCISES.map((exercise, index) => (
                    <SelectItem key={index} value={exercise.name}>
                      <div className="flex justify-between items-center w-full">
                        <span>{exercise.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {exercise.calories}kcal/30分
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 運動プレビュー - 一般的な運動選択の直下に表示 */}
            {formData.exercise_name && (
              <div className="mt-2">
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-1 pt-3">
                    <CardTitle className="text-sm text-blue-900">運動プレビュー</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <div className="text-sm text-blue-800 grid grid-cols-2 gap-2">
                      <div><strong>運動名:</strong> {formData.exercise_name}</div>
                      <div><strong>時間:</strong> {formData.duration_minutes}分</div>
                      <div><strong>消費カロリー:</strong> {formData.calories_burned}kcal</div>
                      <div><strong>タイプ:</strong> {EXERCISE_TYPES.find(t => t.value === formData.exercise_type)?.label}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 運動名 */}
            <div>
              <Label htmlFor="exercise_name">運動名 *</Label>
              <Input
                id="exercise_name"
                name="exercise_name"
                value={formData.exercise_name}
                onChange={handleInputChange}
                placeholder="運動名を入力"
                required
              />
            </div>

            {/* 運動時間とカロリー */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration_minutes">運動時間（分） *</Label>
                <Input
                  id="duration_minutes"
                  name="duration_minutes"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={handleInputChange}
                  placeholder="30"
                  min="1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="calories_burned">消費カロリー *</Label>
                <Input
                  id="calories_burned"
                  name="calories_burned"
                  type="number"
                  value={formData.calories_burned}
                  onChange={handleInputChange}
                  placeholder="150"
                  min="0"
                  required
                />
              </div>
            </div>

            {/* カロリー自動計算ボタン */}
            {selectedExercise && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={calculateCalories}
                className="w-full"
              >
                運動時間に応じてカロリーを自動計算
              </Button>
            )}

            {/* 運動タイプ */}
            <div>
              <Label htmlFor="exercise_type">運動タイプ *</Label>
              <Select
                value={formData.exercise_type}
                onValueChange={(value) => handleSelectChange('exercise_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="運動タイプを選択" />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* メモ */}
            <div>
              <Label htmlFor="notes">メモ</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="運動の詳細や感想を記録"
                rows={6}
                className="min-h-[120px]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {showAnalysisModal && analysisData ? (
              <>
                {/* 解析完了画面 */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">解析完了</h3>
                  <p className="text-gray-600">運動内容の解析が完了しました</p>
                </div>

                {/* 解析結果の表示 */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">運動名</span>
                      <span className="font-medium">{analysisData.exercise_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">運動時間</span>
                      <span className="font-medium">{analysisData.duration_minutes}分</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">消費カロリー</span>
                      <span className="font-medium text-orange-600">{analysisData.calories_burned}kcal</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">運動タイプ</span>
                      <span className="font-medium">{analysisData.exercise_type}</span>
                    </div>
                    {analysisData.notes && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">補足</span>
                        <span className="font-medium text-sm">{analysisData.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ボタン群 */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleAnalysisCancel}
                    variant="outline"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleAnalysisEdit}
                    variant="outline"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    編集
                  </Button>
                  <Button
                    onClick={handleAnalysisRecord}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        記録中...
                      </>
                    ) : (
                      'この内容で記録'
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* AI解析セクション */}
                <div>
                  <Label htmlFor="analysisText" className="text-sm font-medium">
                    運動内容を入力してください
                  </Label>
                  <Textarea
                    id="analysisText"
                    placeholder="例: 30分ランニング、腕立て伏せ20回を3セット、ヨガ1時間..."
                    value={analysisText}
                    onChange={(e) => setAnalysisText(e.target.value)}
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
                  disabled={isAnalyzing || !analysisText.trim()}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      解析中...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      運動を解析
                    </>
                  )}
                </Button>

                {/* 解析結果（簡易表示） */}
                {analysisResult && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-sm text-blue-900">解析完了</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3">
                      <p className="text-sm text-blue-800">
                        ✓ 解析が完了しました。詳細を確認できます。
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
        
        </div>
        
        {/* 固定の送信ボタン */}
        <div className="flex-shrink-0 border-t border-gray-200 p-6 bg-white rounded-b-lg">
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              className="w-16 h-9"
              onClick={() => {
                // 記録方法を選択モーダルに戻る
                const event = new CustomEvent('openRecordSelectionModal');
                window.dispatchEvent(event);
                // 現在のモーダルを閉じる
                onClose();
              }}
            >
              戻る
            </Button>
            <Button
              type="button"
              disabled={isSubmitting || !isFormValid()}
              className="w-20 h-9"
              onClick={activeTab === 'manual' ? handleSubmit : (e) => {
                e.preventDefault();
                setActiveTab('manual');
              }}
            >
              {isSubmitting ? '記録中...' : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  記録
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
} 