"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef, useEffect } from "react";
import { analyzeImageNutrition, analyzeTextNutrition, GrokNutritionResponse } from "@/lib/grok";
import { createClient } from "@/lib/supabase/client";

export function MealRecordModal() {
  const [mode, setMode] = useState<"camera" | "text" | null>(null);
  const [open, setOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [nutritionData, setNutritionData] = useState<GrokNutritionResponse | null>(null);
  const [formData, setFormData] = useState({
    food_name: "",
    calories: "",
    protein: "",
    fat: "",
    carbs: ""
  });
  const [isCorrectedByUser, setIsCorrectedByUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const [errorMessage, setErrorMessage] = useState("");
  const [textInput, setTextInput] = useState("");

  useEffect(() => {
    if (open) {
      modalRef.current?.classList.add('block');
      modalRef.current?.classList.remove('hidden');
    } else {
      modalRef.current?.classList.add('hidden');
      modalRef.current?.classList.remove('block');
    }
  }, [open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setErrorMessage('画像ファイルが大きすぎます。10MB以下のファイルを選択してください。');
      return;
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('サポートされていないファイル形式です。JPEG、PNG、WebP形式の画像を選択してください。');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage("");
    
    try {
      // 画像をリサイズ（モバイルでの大きな画像に対応）
      let processedFile = file;
      
      // ファイルサイズが2MBを超える場合はリサイズ
      if (file.size > 2 * 1024 * 1024) {
        try {
          processedFile = await resizeImage(file);
          console.log('画像をリサイズしました:', file.size, '->', processedFile.size, 'bytes');
        } catch (resizeError) {
          console.warn('画像のリサイズに失敗しました。元の画像を使用します:', resizeError);
          // リサイズに失敗した場合は元の画像を使用
        }
      }
      
      const result = await analyzeImageNutrition(processedFile);
      setNutritionData(result);
      
      // 解析結果の検証
      if (result.food_name === "解析できませんでした" || result.food_name === "食事が写っていません") {
        setErrorMessage('画像から食事を認識できませんでした。食事が写っている画像を選択してください。');
        setFormData({
          food_name: "",
          calories: "",
          protein: "",
          fat: "",
          carbs: ""
        });
      } else {
        setFormData({
          food_name: result.food_name,
          calories: result.calories.toString(),
          protein: result.protein.toString(),
          fat: result.fat.toString(),
          carbs: result.carbs.toString()
        });
      }
    } catch (error: any) {
      console.error('画像解析エラー:', error);
      if (error.message.includes('タイムアウト')) {
        setErrorMessage('画像解析がタイムアウトしました。画像サイズを小さくするか、再度お試しください。');
      } else if (error.message.includes('ファイルが大きすぎます')) {
        setErrorMessage('画像ファイルが大きすぎます。10MB以下のファイルを選択してください。');
      } else {
        setErrorMessage('画像解析に失敗しました。手入力で登録できます。');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 画像をリサイズする関数
  const resizeImage = async (file: File, maxWidth: number = 1024, maxHeight: number = 1024): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // アスペクト比を保ちながらリサイズ
          let { width, height } = img;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          if (!ctx) {
            reject(new Error('Canvas context の取得に失敗しました'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            } else {
              reject(new Error('画像のリサイズに失敗しました'));
            }
          }, file.type, 0.7); // 品質を70%に設定してファイルサイズを削減
        } catch (error) {
          reject(new Error(`画像のリサイズ処理でエラーが発生しました: ${error}`));
        }
      };
      
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      img.crossOrigin = 'anonymous'; // CORSエラーを防ぐ
      img.src = URL.createObjectURL(file);
    });
  };

  const handleTextAnalysis = async () => {
    const text = textInput.trim();
    if (!text) return;

    setIsAnalyzing(true);
    setErrorMessage("");
    try {
      const result = await analyzeTextNutrition(text);
      setNutritionData(result);
      setFormData({
        food_name: result.food_name,
        calories: result.calories.toString(),
        protein: result.protein.toString(),
        fat: result.fat.toString(),
        carbs: result.carbs.toString()
      });
    } catch (error: any) {
      console.error('テキスト解析エラー:', error);
      setErrorMessage('テキスト解析に失敗しました。手入力で登録できます。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // ユーザーが食品名を修正した場合
    if (name === 'food_name' && nutritionData && value !== nutritionData.food_name) {
      setIsCorrectedByUser(true);
    }
  };

  const handleFoodNameCorrection = async () => {
    if (!formData.food_name || !isCorrectedByUser) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeTextNutrition(formData.food_name);
      setNutritionData(result);
      setFormData(prev => ({
        ...prev,
        calories: result.calories.toString(),
        protein: result.protein.toString(),
        fat: result.fat.toString(),
        carbs: result.carbs.toString()
      }));
      setIsCorrectedByUser(false);
    } catch (error) {
      console.error('再解析エラー:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ユーザーが見つかりません');

      const { error } = await supabase.from('meals').insert({
        user_id: user.id,
        food_name: formData.food_name,
        calories: parseFloat(formData.calories),
        protein: parseFloat(formData.protein),
        fat: parseFloat(formData.fat),
        carbs: parseFloat(formData.carbs),
        is_corrected_by_user: isCorrectedByUser
      });

      if (error) throw error;

      // フォームをリセット
      setFormData({
        food_name: "",
        calories: "",
        protein: "",
        fat: "",
        carbs: ""
      });
      setNutritionData(null);
      setTextInput("");
      setIsCorrectedByUser(false);
      setMode(null);
      setOpen(false);
      
      // ページをリフレッシュしてデータを更新
      window.location.reload();
    } catch (error) {
      console.error('食事記録エラー:', error);
      alert('食事記録の保存に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (mode === "camera") {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="meal-image">食事の画像をアップロード</Label>
            <Input 
              id="meal-image" 
              type="file" 
              accept="image/jpeg,image/jpg,image/png,image/webp" 
              onChange={handleImageUpload}
              ref={fileInputRef}
            />
          </div>
          {isAnalyzing && (
            <div className="text-center py-4">
              <p>画像を解析中...</p>
            </div>
          )}
          {errorMessage && (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <p className="text-red-600 text-sm">{errorMessage}</p>
            </div>
          )}
          {nutritionData && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-2">解析結果</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>食品名: {nutritionData.food_name}</div>
                <div>カロリー: {nutritionData.calories}kcal</div>
                <div>タンパク質: {nutritionData.protein}g</div>
                <div>脂質: {nutritionData.fat}g</div>
                <div>炭水化物: {nutritionData.carbs}g</div>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    if (mode === "text") {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="meal-text">食事の内容を入力</Label>
            <Textarea 
              id="meal-text" 
              placeholder="例: 鶏胸肉 200g、ごはん 150g" 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
            <Button 
              type="button" 
              onClick={handleTextAnalysis}
              disabled={isAnalyzing || !textInput.trim()}
              className="mt-2"
            >
              {isAnalyzing ? "解析中..." : "解析する"}
            </Button>
          </div>
          {errorMessage && (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <p className="text-red-600 text-sm">{errorMessage}</p>
            </div>
          )}
          {nutritionData && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-2">解析結果</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>食品名: {nutritionData.food_name}</div>
                <div>カロリー: {nutritionData.calories}kcal</div>
                <div>タンパク質: {nutritionData.protein}g</div>
                <div>脂質: {nutritionData.fat}g</div>
                <div>炭水化物: {nutritionData.carbs}g</div>
              </div>
            </div>
          )}
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

  // 登録ボタンの表示条件を見直し
  const isFormFilled = formData.food_name || formData.calories || formData.protein || formData.fat || formData.carbs;
  // 登録ボタンの有効条件（全項目入力時のみ）
  const isFormComplete = formData.food_name && formData.calories && formData.protein && formData.fat && formData.carbs;

  const renderForm = () => {
    // 画像・テキスト解析失敗時でも、何か1つでも入力があればフォームを表示
    if (!isFormFilled && !nutritionData && mode !== "text" && mode !== "camera") return null;

    return (
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="food_name">食品名</Label>
            <Input
              id="food_name"
              name="food_name"
              value={formData.food_name}
              onChange={handleInputChange}
              required
            />
            {isCorrectedByUser && (
              <Button 
                type="button" 
                onClick={handleFoodNameCorrection}
                disabled={isAnalyzing}
                size="sm"
                className="mt-1"
              >
                {isAnalyzing ? "再解析中..." : "再解析"}
              </Button>
            )}
          </div>
          <div>
            <Label htmlFor="calories">カロリー (kcal)</Label>
            <Input
              id="calories"
              name="calories"
              type="number"
              value={formData.calories}
              onChange={handleInputChange}
              required
              step="0.1"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="protein">タンパク質 (g)</Label>
            <Input
              id="protein"
              name="protein"
              type="number"
              value={formData.protein}
              onChange={handleInputChange}
              required
              step="0.1"
            />
          </div>
          <div>
            <Label htmlFor="fat">脂質 (g)</Label>
            <Input
              id="fat"
              name="fat"
              type="number"
              value={formData.fat}
              onChange={handleInputChange}
              required
              step="0.1"
            />
          </div>
          <div>
            <Label htmlFor="carbs">炭水化物 (g)</Label>
            <Input
              id="carbs"
              name="carbs"
              type="number"
              value={formData.carbs}
              onChange={handleInputChange}
              required
              step="0.1"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={() => setMode(null)} type="button" variant="outline">戻る</Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={!isFormComplete || isSubmitting}
          >
            {isSubmitting ? "登録中..." : "登録"}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <>
      <div className="fixed bottom-8 right-8">
        <Button 
          size="lg" 
          className="rounded-full w-16 h-16 text-2xl shadow-lg" 
          onClick={() => setOpen(true)}
        >
          +
        </Button>
      </div>
      
      <div ref={modalRef} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">食事の記録</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setOpen(false);
                setMode(null);
                setNutritionData(null);
                setTextInput("");
                setFormData({
                  food_name: "",
                  calories: "",
                  protein: "",
                  fat: "",
                  carbs: ""
                });
                setIsCorrectedByUser(false);
              }}
            >
              ✕
            </Button>
          </div>
          
          {!nutritionData && (
            <p className="text-sm text-muted-foreground mb-4">
              食事の記録方法を選択してください。
            </p>
          )}
          
          <div className="py-4">
            {errorMessage && (
              <div className="text-red-500 text-sm mb-2">{errorMessage}</div>
            )}
            {renderContent()}
            {renderForm()}
          </div>
          
        </div>
      </div>
    </>
  );
}