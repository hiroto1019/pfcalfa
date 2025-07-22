"use client";

import { useState, Dispatch, SetStateAction, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SimpleDatePicker } from "@/components/ui/simple-date-picker";
import { updateDashboardData } from "./actions";
import { toast } from "sonner";

interface FormData {
  currentWeight: number;
  targetWeight: number;
  activityLevel: number;
  goalDate: string;
}

interface OverviewCardProps {
  formData: FormData;
  setFormData: Dispatch<SetStateAction<FormData>>;
  onUpdate: () => void;
}

export function OverviewCard({ formData, setFormData, onUpdate }: OverviewCardProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<FormData>(formData);
  const [editingFormData, setEditingFormData] = useState<FormData>(formData);
  const [hasChanges, setHasChanges] = useState(false);

  // モバイル判定
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 変更を検知
  useEffect(() => {
    if (isEditing) {
      const hasAnyChanges = 
        editingFormData.currentWeight !== originalFormData.currentWeight ||
        editingFormData.targetWeight !== originalFormData.targetWeight ||
        editingFormData.activityLevel !== originalFormData.activityLevel ||
        editingFormData.goalDate !== originalFormData.goalDate;
      
      setHasChanges(hasAnyChanges);
    }
  }, [editingFormData, originalFormData, isEditing]);

  // グリッドの高さを監視して履歴のスクロールエリアを調整
  useEffect(() => {
    if (!isEditing && gridRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = entry.contentRect.height;
          // 履歴のスクロールエリアの高さを調整
          const historyScrollArea = document.querySelector('[data-history-scroll]') as HTMLElement;
          if (historyScrollArea) {
            historyScrollArea.style.height = `${height}px`;
          }
        }
      });

      resizeObserver.observe(gridRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [isEditing]);

  const handleEditClick = () => {
    if (isMobile) {
      setOriginalFormData(formData);
      setEditingFormData(formData);
      setShowModal(true);
    } else {
      setOriginalFormData(formData);
      setEditingFormData(formData);
      setIsEditing(true);
      setHasChanges(false);
    }
  };

  const handleCancel = () => {
    setEditingFormData(originalFormData);
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateDashboardData({
      current_weight_kg: editingFormData.currentWeight > 0 ? editingFormData.currentWeight : null,
      target_weight_kg: editingFormData.targetWeight > 0 ? editingFormData.targetWeight : null,
      activity_level: editingFormData.activityLevel,
      goal_target_date: editingFormData.goalDate === "" ? null : editingFormData.goalDate,
    });
    setIsSaving(false);

    if (result.success) {
      // 保存成功時のみ実際のデータを更新
      setFormData(editingFormData);
      toast.success("情報を更新しました！");
      setIsEditing(false);
      setShowModal(false);
      setOriginalFormData(editingFormData);
      setHasChanges(false);
      
      // グローバルイベントを発火して理想カロリーの変更を通知
      console.log('overview-card: 理想カロリー更新イベントを発火', {
        currentWeight: editingFormData.currentWeight,
        targetWeight: editingFormData.targetWeight,
        activityLevel: editingFormData.activityLevel,
        goalDate: editingFormData.goalDate
      });
      window.dispatchEvent(new CustomEvent('idealCaloriesUpdated', {
        detail: {
          currentWeight: editingFormData.currentWeight,
          targetWeight: editingFormData.targetWeight,
          activityLevel: editingFormData.activityLevel,
          goalDate: editingFormData.goalDate
        }
      }));
      
      // プロフィール更新イベントも発火
      console.log('overview-card: プロフィール更新イベントを発火', {
        currentWeight: editingFormData.currentWeight,
        targetWeight: editingFormData.targetWeight,
        activityLevel: editingFormData.activityLevel,
        goalDate: editingFormData.goalDate
      });
      window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: {
          currentWeight: editingFormData.currentWeight,
          targetWeight: editingFormData.targetWeight,
          activityLevel: editingFormData.activityLevel,
          goalDate: editingFormData.goalDate
        }
      }));
      
      onUpdate();
    } else {
      toast.error(result.error);
    }
  };

  const activityLevelMap: { [key: number]: string } = {
    1: '座り仕事中心',
    2: '軽い運動\n（週1-2回）',
    3: '中程度の運動\n（週3-5回）',
    4: '激しい運動\n（週6-7回）',
    5: '非常に激しい運動',
  };

  // 編集フォーム（PC用）
  const EditForm = () => (
    <div className="space-y-4 flex-1 flex flex-col">
      <div>
        <Label htmlFor="weight">今日の体重 (kg)</Label>
        <NumberInput 
          id="weight" 
          value={editingFormData.currentWeight} 
          onChange={value => setEditingFormData({...editingFormData, currentWeight: typeof value === 'number' ? value : 0})}
        />
      </div>
      <div>
        <Label htmlFor="target_weight">目標体重 (kg)</Label>
        <NumberInput 
          id="target_weight" 
          value={editingFormData.targetWeight} 
          onChange={value => setEditingFormData({...editingFormData, targetWeight: typeof value === 'number' ? value : 0})}
        />
      </div>
      <div>
        <Label>活動レベル</Label>
        <Select value={String(editingFormData.activityLevel)} onValueChange={value => setEditingFormData({...editingFormData, activityLevel: Number(value)})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-w-sm">
            <SelectItem value="1" className="whitespace-normal leading-relaxed">
              {activityLevelMap[1]}
            </SelectItem>
            <SelectItem value="2" className="whitespace-normal leading-relaxed">
              {activityLevelMap[2]}
            </SelectItem>
            <SelectItem value="3" className="whitespace-normal leading-relaxed">
              {activityLevelMap[3]}
            </SelectItem>
            <SelectItem value="4" className="whitespace-normal leading-relaxed">
              {activityLevelMap[4]}
            </SelectItem>
            <SelectItem value="5" className="whitespace-normal leading-relaxed">
              {activityLevelMap[5]}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <div className="space-y-2">
          <Label>目標達成日</Label>
          <SimpleDatePicker
            value={editingFormData.goalDate ? new Date(editingFormData.goalDate) : undefined}
            onChange={(date: Date | null) => setEditingFormData({...editingFormData, goalDate: date ? date.toISOString().split('T')[0] : ''})}
            placeholder="目標達成日を選択"
            allowFuture={true}
            maxYearOffset={50}
          />
        </div>
      </div>
    </div>
  );

  // モーダル（モバイル用）
  const Modal = () => (
    <>
      {showModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">今日のサマリーと目標</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="modal-weight">今日の体重 (kg)</Label>
                  <NumberInput 
                    id="modal-weight" 
                    value={editingFormData.currentWeight} 
                    onChange={value => setEditingFormData({...editingFormData, currentWeight: typeof value === 'number' ? value : 0})}
                    className="text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="modal-target-weight">目標体重 (kg)</Label>
                  <NumberInput 
                    id="modal-target-weight" 
                    value={editingFormData.targetWeight} 
                    onChange={value => setEditingFormData({...editingFormData, targetWeight: typeof value === 'number' ? value : 0})}
                    className="text-base"
                  />
                </div>
                <div>
                  <Label>活動レベル</Label>
                  <Select value={String(editingFormData.activityLevel)} onValueChange={value => setEditingFormData({...editingFormData, activityLevel: Number(value)})}>
                    <SelectTrigger className="text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-w-sm">
                      <SelectItem value="1" className="whitespace-normal leading-relaxed">
                        {activityLevelMap[1]}
                      </SelectItem>
                      <SelectItem value="2" className="whitespace-normal leading-relaxed">
                        {activityLevelMap[2]}
                      </SelectItem>
                      <SelectItem value="3" className="whitespace-normal leading-relaxed">
                        {activityLevelMap[3]}
                      </SelectItem>
                      <SelectItem value="4" className="whitespace-normal leading-relaxed">
                        {activityLevelMap[4]}
                      </SelectItem>
                      <SelectItem value="5" className="whitespace-normal leading-relaxed">
                        {activityLevelMap[5]}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="space-y-2">
                    <Label>目標達成日</Label>
                    <SimpleDatePicker
                      value={editingFormData.goalDate ? new Date(editingFormData.goalDate) : undefined}
                      onChange={(date: Date | null) => setEditingFormData({...editingFormData, goalDate: date ? date.toISOString().split('T')[0] : ''})}
                      placeholder="目標達成日を選択"
                      className="text-base"
                      allowFuture={true}
                      maxYearOffset={50}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingFormData(originalFormData);
                    setShowModal(false);
                  }}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle className="text-base font-semibold">今日のサマリーと目標</CardTitle>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={handleEditClick}>
              編集
            </Button>
          ) : hasChanges ? (
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-black text-white hover:bg-gray-800"
            >
              {isSaving ? "保存中..." : "保存"}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleCancel}>
              戻る
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0 flex flex-col">
          {isEditing ? (
            <EditForm />
          ) : (
            <div ref={gridRef} className="grid grid-cols-2 grid-rows-2 gap-4 auto-rows-fr">
              <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                  <p className="text-sm text-gray-500 mb-1">今日の体重</p>
                  <p className="text-2xl font-bold break-words">{formData.currentWeight}kg</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                  <p className="text-sm text-gray-500 mb-1">目標体重</p>
                  <p className="text-2xl font-bold text-green-600 break-words">{formData.targetWeight}kg</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                  <p className="text-sm text-gray-500 mb-2">活動レベル</p>
                  <div className="font-semibold text-base leading-tight">
                    {activityLevelMap[formData.activityLevel] ? 
                      activityLevelMap[formData.activityLevel].split('\n').map((line, index) => (
                        <p key={index} className={index === 0 ? '' : 'text-sm text-gray-600'}>
                          {line}
                        </p>
                      ))
                      : 
                      <p>未設定</p>
                    }
                  </div>
              </div>
               <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                  <p className="text-sm text-gray-500 mb-1">目標達成日</p>
                  <p className="text-lg font-semibold break-words">{formData.goalDate ? new Date(formData.goalDate).toLocaleDateString() : '未設定'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* モバイル用モーダル */}
      <Modal />
    </>
  );
} 