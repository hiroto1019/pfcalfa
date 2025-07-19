"use client";

import { useState, Dispatch, SetStateAction, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<FormData>(formData);
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
        formData.currentWeight !== originalFormData.currentWeight ||
        formData.targetWeight !== originalFormData.targetWeight ||
        formData.activityLevel !== originalFormData.activityLevel ||
        formData.goalDate !== originalFormData.goalDate;
      
      setHasChanges(hasAnyChanges);
    }
  }, [formData, originalFormData, isEditing]);

  const handleEditClick = () => {
    if (isMobile) {
      setShowModal(true);
    } else {
      setOriginalFormData(formData);
      setIsEditing(true);
      setHasChanges(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalFormData);
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateDashboardData({
      current_weight_kg: formData.currentWeight > 0 ? formData.currentWeight : null,
      target_weight_kg: formData.targetWeight > 0 ? formData.targetWeight : null,
      activity_level: formData.activityLevel,
      goal_target_date: formData.goalDate === "" ? null : formData.goalDate,
    });
    setIsSaving(false);

    if (result.success) {
      toast.success("情報を更新しました！");
      setIsEditing(false);
      setShowModal(false);
      setOriginalFormData(formData);
      setHasChanges(false);
      
      // グローバルイベントを発火して理想カロリーの変更を通知
      console.log('overview-card: 理想カロリー更新イベントを発火', {
        currentWeight: formData.currentWeight,
        targetWeight: formData.targetWeight,
        activityLevel: formData.activityLevel,
        goalDate: formData.goalDate
      });
      window.dispatchEvent(new CustomEvent('idealCaloriesUpdated', {
        detail: {
          currentWeight: formData.currentWeight,
          targetWeight: formData.targetWeight,
          activityLevel: formData.activityLevel,
          goalDate: formData.goalDate
        }
      }));
      
      // プロフィール更新イベントも発火
      console.log('overview-card: プロフィール更新イベントを発火', {
        currentWeight: formData.currentWeight,
        targetWeight: formData.targetWeight,
        activityLevel: formData.activityLevel,
        goalDate: formData.goalDate
      });
      window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: {
          currentWeight: formData.currentWeight,
          targetWeight: formData.targetWeight,
          activityLevel: formData.activityLevel,
          goalDate: formData.goalDate
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
        <Input 
          id="weight" 
          type="number" 
          value={formData.currentWeight} 
          onChange={e => setFormData({...formData, currentWeight: parseFloat(e.target.value) || 0})}
        />
      </div>
      <div>
        <Label htmlFor="target_weight">目標体重 (kg)</Label>
        <Input 
          id="target_weight" 
          type="number" 
          value={formData.targetWeight} 
          onChange={e => setFormData({...formData, targetWeight: parseFloat(e.target.value) || 0})}
        />
      </div>
      <div>
        <Label>活動レベル</Label>
        <Select value={String(formData.activityLevel)} onValueChange={value => setFormData({...formData, activityLevel: Number(value)})}>
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
        <Label htmlFor="target_date">目標達成日</Label>
        <Input 
          id="target_date" 
          type="date" 
          value={formData.goalDate} 
          onChange={e => setFormData({...formData, goalDate: e.target.value})}
        />
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
                  <Input 
                    id="modal-weight" 
                    type="number" 
                    value={formData.currentWeight} 
                    onChange={e => setFormData({...formData, currentWeight: parseFloat(e.target.value) || 0})}
                    className="text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="modal-target-weight">目標体重 (kg)</Label>
                  <Input 
                    id="modal-target-weight" 
                    type="number" 
                    value={formData.targetWeight} 
                    onChange={e => setFormData({...formData, targetWeight: parseFloat(e.target.value) || 0})}
                    className="text-base"
                  />
                </div>
                <div>
                  <Label>活動レベル</Label>
                  <Select value={String(formData.activityLevel)} onValueChange={value => setFormData({...formData, activityLevel: Number(value)})}>
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
                  <Label htmlFor="modal-target-date">目標達成日</Label>
                  <Input 
                    id="modal-target-date" 
                    type="date" 
                    value={formData.goalDate} 
                    onChange={e => setFormData({...formData, goalDate: e.target.value})}
                    className="text-base"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setShowModal(false)}
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
        <CardContent className="pt-4 flex-1 flex flex-col">
          {isEditing ? (
            <EditForm />
          ) : (
            <div className="grid grid-cols-2 grid-rows-2 gap-4 flex-1">
              <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                  <p className="text-sm text-gray-500 mb-1">今日の体重</p>
                  <p className="text-2xl font-bold">{formData.currentWeight}kg</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                  <p className="text-sm text-gray-500 mb-1">目標体重</p>
                  <p className="text-2xl font-bold text-green-600">{formData.targetWeight}kg</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                  <p className="text-sm text-gray-500 mb-2">活動レベル</p>
                  <div className="font-semibold text-base leading-tight">
                    {activityLevelMap[formData.activityLevel].split('\n').map((line, index) => (
                      <p key={index} className={index === 0 ? '' : 'text-sm text-gray-600'}>
                        {line}
                      </p>
                    ))}
                  </div>
              </div>
               <div className="bg-gray-50 rounded-lg p-3 text-center flex flex-col justify-center">
                  <p className="text-sm text-gray-500 mb-1">目標達成日</p>
                  <p className="text-lg font-semibold">{formData.goalDate ? new Date(formData.goalDate).toLocaleDateString() : '未設定'}</p>
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