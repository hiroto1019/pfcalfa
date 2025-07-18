"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef, useEffect } from "react";
import { analyzeImageNutrition, analyzeTextNutrition, GrokNutritionResponse } from "@/lib/grok";
import { createClient } from "@/lib/supabase/client";
import { findFoodByName } from "@/lib/food-database";

export function MealRecordModal() {
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
  const [imageErrorMessage, setImageErrorMessage] = useState("");
  const [textErrorMessage, setTextErrorMessage] = useState("");
  const [textInput, setTextInput] = useState("");
  const [analysisMethod, setAnalysisMethod] = useState<"image" | "text" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);

  useEffect(() => {
    if (open) {
      modalRef.current?.classList.add('block');
      modalRef.current?.classList.remove('hidden');
    } else {
      modalRef.current?.classList.add('hidden');
      modalRef.current?.classList.remove('block');
    }
  }, [open]);

  // リアルタイム検索のためのuseEffect
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSelectedFood(null);
      return;
    }

    // デバウンス処理（300ms待機）
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success) {
          setSearchResults(data.data);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('食品検索エラー:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（リサイズ機能により10MBまで許可）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setImageErrorMessage('画像ファイルが大きすぎます。10MB以下のファイルを選択してください。');
      return;
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setImageErrorMessage('サポートされていないファイル形式です。JPEG、PNG、WebP形式の画像を選択してください。');
      return;
    }

    setIsAnalyzing(true);
    setImageErrorMessage("");
    setAnalysisMethod("image");
    
    try {
      // 画像をリサイズ（モバイルでの大きな画像に対応）
      let processedFile = file;
      
      // ファイルサイズが2MBを超える場合、または画像サイズが大きい場合はリサイズ
      if (file.size > 2 * 1024 * 1024) {
        try {
          processedFile = await resizeImage(file, 1024, 1024);
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
        setImageErrorMessage('画像から食事を認識できませんでした。食事が写っている画像を選択してください。');
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
        setImageErrorMessage('画像解析がタイムアウトしました。手入力で登録するか、画像サイズを小さくして再度お試しください。');
      } else if (error.message.includes('ファイルが大きすぎます')) {
        setImageErrorMessage('画像ファイルが大きすぎます。10MB以下のファイルを選択してください。');
      } else if (error.message.includes('過負荷状態') || error.message.includes('503')) {
        setImageErrorMessage('Gemini APIが一時的に過負荷状態です。手入力で登録するか、数分後に再度お試しください。');
      } else {
        setImageErrorMessage('画像解析に失敗しました。手入力で登録できます。');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 画像をリサイズする関数
  const resizeImage = async (file: File, maxWidth: number = 800, maxHeight: number = 800): Promise<File> => {
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
          }, file.type, 0.8); // 品質を80%に設定してファイルサイズを削減
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
    const text = textInput?.trim() || "";
    if (!text) return;

    setIsAnalyzing(true);
    setTextErrorMessage("");
    setAnalysisMethod("text");
    
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
      if (error.message.includes('タイムアウト')) {
        setTextErrorMessage('テキスト解析がタイムアウトしました。手入力で登録するか、再度お試しください。');
      } else if (error.message.includes('過負荷状態') || error.message.includes('503')) {
        setTextErrorMessage('Gemini APIが一時的に過負荷状態です。手入力で登録するか、数分後に再度お試しください。');
      } else if (error.message.includes('食品名を確認')) {
        setTextErrorMessage('入力されたテキストを解析できませんでした。食品名を確認してください。');
      } else {
        setTextErrorMessage('テキスト解析に失敗しました。手入力で登録できます。');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 手動入力機能を削除
  // const handleManualInput = () => {
  //   setAnalysisMethod("manual");
  //   setNutritionData(null);
  //   setFormData({
  //     food_name: "",
  //     calories: "",
  //     protein: "",
  //     fat: "",
  //     carbs: ""
  //   });
  //   setImageErrorMessage("");
  //   setTextErrorMessage("");
  // };

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
      // まず食品データベースから検索
      const foodData = findFoodByName(formData.food_name);
      if (foodData) {
        setNutritionData({
          food_name: foodData.name,
          calories: foodData.calories,
          protein: foodData.protein,
          fat: foodData.fat,
          carbs: foodData.carbs
        });
        setFormData(prev => ({
          ...prev,
          calories: foodData.calories.toString(),
          protein: foodData.protein.toString(),
          fat: foodData.fat.toString(),
          carbs: foodData.carbs.toString()
        }));
        setIsCorrectedByUser(false);
        return;
      }

      // データベースにない場合はAI解析
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

  // 検索結果から食品を選択
  const handleFoodSelect = (food: any) => {
    setSelectedFood(food);
    setSearchResults([]);
    setSearchQuery(food.name);
  };

  // 選択した食品を適用
  const handleApplyFood = () => {
    if (!selectedFood) return;
    
    setFormData({
      food_name: selectedFood.name,
      calories: selectedFood.calories.toString(),
      protein: selectedFood.protein.toString(),
      fat: selectedFood.fat.toString(),
      carbs: selectedFood.carbs.toString()
    });
    setNutritionData({
      food_name: selectedFood.name,
      calories: selectedFood.calories,
      protein: selectedFood.protein,
      fat: selectedFood.fat,
      carbs: selectedFood.carbs
    });
    setSelectedFood(null);
    setSearchQuery("");
    setIsCorrectedByUser(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ユーザーが見つかりません');

      console.log('食事記録保存開始:', {
        user_id: user.id,
        food_name: formData.food_name,
        calories: parseFloat(formData.calories),
        protein: parseFloat(formData.protein),
        fat: parseFloat(formData.fat),
        carbs: parseFloat(formData.carbs),
        is_corrected_by_user: isCorrectedByUser
      });

      const { data, error } = await supabase.from('meals').insert({
        user_id: user.id,
        food_name: formData.food_name,
        calories: parseFloat(formData.calories),
        protein: parseFloat(formData.protein),
        fat: parseFloat(formData.fat),
        carbs: parseFloat(formData.carbs),
        is_corrected_by_user: isCorrectedByUser
      }).select();

      if (error) {
        console.error('食事記録保存エラー:', error);
        throw error;
      }

      console.log('食事記録保存成功:', data);

      // 食事記録保存後、daily_summariesを手動で更新
      try {
        // 今日の日付を取得（JST）
        const now = new Date();
        const jstOffset = 9 * 60; // JSTはUTC+9
        const jstDate = new Date(now.getTime() + jstOffset * 60000);
        const todayDate = jstDate.toISOString().split('T')[0];

        console.log('=== daily_summaries手動更新開始 ===');
        console.log('今日の日付:', todayDate);
        console.log('ユーザーID:', user.id);

        // 今日のmealsテーブルから集計
        const { data: todayMeals, error: mealsError } = await supabase
          .from('meals')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', todayDate + 'T00:00:00+09:00')
          .lte('created_at', todayDate + 'T23:59:59+09:00');

        if (mealsError) {
          console.error('meals取得エラー:', mealsError);
        } else {
          console.log('今日のmeals件数:', todayMeals?.length || 0);
          console.log('今日のmeals詳細:', todayMeals);

          // daily_summariesを更新または作成
          const totalCalories = todayMeals?.reduce((sum, meal) => sum + meal.calories, 0) ?? 0;
          const totalProtein = todayMeals?.reduce((sum, meal) => sum + meal.protein, 0) ?? 0;
          const totalFat = todayMeals?.reduce((sum, meal) => sum + meal.fat, 0) ?? 0;
          const totalCarbs = todayMeals?.reduce((sum, meal) => sum + meal.carbs, 0) ?? 0;

          console.log('集計結果:', {
            totalCalories,
            totalProtein,
            totalFat,
            totalCarbs
          });
          
          // 各食事の詳細も表示
          console.log('各食事の詳細:');
          todayMeals?.forEach((meal, index) => {
            console.log(`${index + 1}. ${meal.food_name}: ${meal.calories}kcal (P:${meal.protein}g, F:${meal.fat}g, C:${meal.carbs}g)`);
          });

          // 既存のdaily_summaryを確認
          const { data: existingSummary, error: checkError } = await supabase
            .from('daily_summaries')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', todayDate)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            console.error('daily_summaries確認エラー:', checkError);
          }

          let updateResult;
          if (existingSummary) {
            // 既存レコードがある場合は更新
            console.log('既存のdaily_summaryを更新:', existingSummary);
            updateResult = await supabase
              .from('daily_summaries')
              .update({
                total_calories: totalCalories,
                total_protein: totalProtein,
                total_fat: totalFat,
                total_carbs: totalCarbs
              })
              .eq('user_id', user.id)
              .eq('date', todayDate)
              .select()
              .single();
          } else {
            // 新規レコードの場合は挿入
            console.log('新しいdaily_summaryを作成');
            updateResult = await supabase
              .from('daily_summaries')
              .insert({
                user_id: user.id,
                date: todayDate,
                total_calories: totalCalories,
                total_protein: totalProtein,
                total_fat: totalFat,
                total_carbs: totalCarbs
              })
              .select()
              .single();
          }

          if (updateResult.error) {
            console.error('daily_summaries更新エラー:', updateResult.error);
            console.error('エラー詳細:', {
              message: updateResult.error.message,
              details: updateResult.error.details,
              hint: updateResult.error.hint
            });
          } else {
            console.log('daily_summaries更新成功:', updateResult.data);
          }
        }
      } catch (updateError) {
        console.error('daily_summaries手動更新エラー:', updateError);
        console.error('エラーの詳細:', updateError);
      }

      // フォームをリセット
      setFormData({
        food_name: "",
        calories: "",
        protein: "",
        fat: "",
        carbs: ""
      });
      setNutritionData(null);
      setSearchQuery("");
      setSelectedFood(null);
      setTextInput("");
      setIsCorrectedByUser(false);
      setAnalysisMethod(null);
      setImageErrorMessage("");
      setTextErrorMessage("");
      setOpen(false);
      
      // ページをリロードせずに、親コンポーネントに更新を通知
      // カスタムイベントを発火して、ダッシュボードの更新を促す
      window.dispatchEvent(new CustomEvent('mealRecorded'));
      
    } catch (error) {
      console.error('食事記録エラー:', error);
      alert('食事記録の保存に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAnalysisOptions = () => {
    if (analysisMethod) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            onClick={() => setAnalysisMethod("image")}
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <span className="text-2xl">📷</span>
            <span className="text-sm">画像解析</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setAnalysisMethod("text")}
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <span className="text-2xl">📝</span>
            <span className="text-sm">テキスト解析</span>
          </Button>
        </div>
      </div>
    );
  };

  const renderImageAnalysis = () => {
    if (analysisMethod !== "image") return null;

      return (
        <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">画像解析</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setAnalysisMethod(null)}
          >
            戻る
          </Button>
        </div>
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
            <p>画像を解析中...（10秒以内）</p>
            </div>
          )}
        {imageErrorMessage && (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <p className="text-red-600 text-sm">{imageErrorMessage}</p>
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
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  💡 解析結果が不正確な場合は、下のフォームで手動で修正できます
                </p>
              </div>
            </div>
          )}
        </div>
      );
  };

  const renderTextAnalysis = () => {
    if (analysisMethod !== "text") return null;
    
      return (
        <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">テキスト解析</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setAnalysisMethod(null)}
          >
            戻る
          </Button>
        </div>
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
            disabled={isAnalyzing || !textInput?.trim()}
              className="mt-2"
            >
            {isAnalyzing ? "解析中...（10秒以内）" : "解析する"}
            </Button>
          </div>
        {textErrorMessage && (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <p className="text-red-600 text-sm">{textErrorMessage}</p>
            </div>
          )}
          {nutritionData && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-2">解析結果</h3>
              <div className="space-y-2 text-sm">
                <div className="break-words">
                  <span className="font-medium">食品名:</span> 
                  <div className="mt-1 text-gray-700 break-all">
                    {nutritionData.food_name}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>カロリー: {nutritionData.calories}kcal</div>
                  <div>タンパク質: {nutritionData.protein}g</div>
                  <div>脂質: {nutritionData.fat}g</div>
                  <div>炭水化物: {nutritionData.carbs}g</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  💡 解析結果が不正確な場合は、下のフォームで手動で修正できます
                </p>
              </div>
            </div>
          )}
        </div>
      );
  };

  // 手動入力機能を削除
  // const renderManualInput = () => {
  //   if (analysisMethod !== "manual") return null;

  //   return (
  //     <div className="space-y-4">
  //       <div className="flex items-center justify-between">
  //         <h3 className="text-lg font-semibold text-gray-900">手動入力</h3>
  //         <Button 
  //           variant="ghost" 
  //           size="sm" 
  //           onClick={() => setAnalysisMethod(null)}
  //         >
  //           戻る
  //       </Button>
  //       </div>
  //       <div className="border rounded-lg p-4 bg-blue-50">
  //         <p className="text-sm text-blue-700">
  //           💡 栄養成分を手動で入力してください。食品名と栄養成分を正確に入力することで、より正確な記録ができます。
  //         </p>
  //       </div>
  //     </div>
  //   );
  // };

  // 登録ボタンの表示条件を見直し
  const isFormFilled = formData.food_name || formData.calories || formData.protein || formData.fat || formData.carbs;
  // 登録ボタンの有効条件（全項目入力時のみ）
  const isFormComplete = formData.food_name && formData.calories && formData.protein && formData.fat && formData.carbs;

  const renderForm = () => {
    // 解析方法が選択されていない場合は表示しない
    if (!analysisMethod) return null;

    return (
      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="food_name">食品名</Label>
            <div className="space-y-2">
              <Input
                id="food_name"
                name="food_name"
                value={formData.food_name}
                onChange={handleInputChange}
                required
                className="text-sm"
              />
              <div className="space-y-2">
                <Input
                  placeholder="食品を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isSearching && (
                  <div className="text-sm text-gray-500">検索中...</div>
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="border rounded-lg p-2 max-h-32 overflow-y-auto">
                  {searchResults.map((food, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                      onClick={() => handleFoodSelect(food)}
                    >
                      <div className="font-medium">{food.name}</div>
                      <div className="text-gray-600">
                        {food.calories}kcal (P:{food.protein}g, F:{food.fat}g, C:{food.carbs}g)
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedFood && (
                <div className="border rounded-lg p-3 bg-blue-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-blue-900">{selectedFood.name}</div>
                      <div className="text-sm text-blue-700">
                        {selectedFood.calories}kcal (P:{selectedFood.protein}g, F:{selectedFood.fat}g, C:{selectedFood.carbs}g)
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleApplyFood}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      適用
                    </Button>
                  </div>
                </div>
              )}
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
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
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
        </div>
        <div className="grid grid-cols-2 gap-4">
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
      
      <div ref={modalRef} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-200 rounded-t-lg">
            <h2 className="text-xl font-bold">食事の記録</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setOpen(false);
                setAnalysisMethod(null);
                setNutritionData(null);
                setTextInput("");
                setFormData({
                  food_name: "",
                  calories: "",
                  protein: "",
                  fat: "",
                  carbs: ""
                });
                setSearchQuery("");
                setSelectedFood(null);
                setIsCorrectedByUser(false);
                setImageErrorMessage("");
                setTextErrorMessage("");
              }}
            >
              ✕
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {renderAnalysisOptions()}
            {renderImageAnalysis()}
            {renderTextAnalysis()}
            {renderForm()}
          </div>
          
          {/* 登録ボタン（解析方法が選択されている場合のみ表示） */}
          {analysisMethod && (
            <div className="border-t border-gray-200 p-6 bg-white rounded-b-lg">
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  onClick={handleSubmit}
                  disabled={!isFormComplete || isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? "登録中..." : "登録"}
                </Button>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </>
  );
}