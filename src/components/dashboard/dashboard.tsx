import { MealRecordModal } from "@/components/meals/meal-record-modal";
import ExerciseRecordModal from "@/components/dashboard/exercise-record-modal";
import { ExerciseAnalysisModal } from "@/components/dashboard/exercise-analysis-modal";
import { Button } from "@/components/ui/button";
import { Settings, Activity, Plus, Users } from "lucide-react";
import Link from "next/link";
import { DashboardGrid } from "./dashboard-grid";
import { useState, useEffect } from "react";
import { RecordSelectionModal } from "./record-selection-modal";
import { createClient } from "@/lib/supabase/client";

export function Dashboard({ profile }: { profile: any }) {
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [exerciseAnalysisModalOpen, setExerciseAnalysisModalOpen] = useState(false);
  const [recordSelectionModalOpen, setRecordSelectionModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkAdminStatus();
    
    const handleOpenExerciseModal = () => {
      setExerciseModalOpen(true);
    };

    const handleOpenExerciseAnalysisModal = () => {
      setExerciseAnalysisModalOpen(true);
    };

    const handleOpenRecordSelectionModal = () => {
      setRecordSelectionModalOpen(true);
    };

    window.addEventListener('openExerciseModal', handleOpenExerciseModal);
    window.addEventListener('openExerciseAnalysisModal', handleOpenExerciseAnalysisModal);
    window.addEventListener('openRecordSelectionModal', handleOpenRecordSelectionModal);
    
    return () => {
      window.removeEventListener('openExerciseModal', handleOpenExerciseModal);
      window.removeEventListener('openExerciseAnalysisModal', handleOpenExerciseAnalysisModal);
      window.removeEventListener('openRecordSelectionModal', handleOpenRecordSelectionModal);
    };
  }, []);

  const checkAdminStatus = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCurrentUser(user);
        
        // 管理者かどうかチェック（ここで管理者のメールアドレスを設定）
        const adminEmails = [
          'your-admin-email@example.com', // 管理者のメールアドレスをここに設定
          'hiroto.mukai@example.com' // 追加の管理者メールアドレス
        ];
        
        setIsAdmin(adminEmails.includes(user.email || ''));
      }
    } catch (error) {
      console.error('管理者ステータスチェックエラー:', error);
    }
  };

  const handleExerciseAdded = () => {
    // 運動記録が追加された時の処理
    window.dispatchEvent(new CustomEvent('exerciseRecorded'));
  };

  const handleRecordButtonClick = () => {
    setRecordSelectionModalOpen(true);
  };

  return (
    <div className="bg-gray-50 relative pt-4 pb-4 px-2 md:px-8 flex items-center justify-center min-h-screen">
      {/* PC時: 白いボックスで囲む, SP時: 直接表示 */}
      <div className="w-full max-w-screen-xl mx-auto md:bg-white md:rounded-xl md:shadow-lg flex flex-col md:pt-6 md:pb-8 md:px-6">
        <header className="flex justify-between items-center mb-2 px-4 md:px-6">
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
          <div className="flex gap-2">
            {isAdmin && (
              <Link href="/admin/users">
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  ユーザー管理
                </Button>
              </Link>
            )}
            <Link href="/settings">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                設定
              </Button>
            </Link>
          </div>
        </header>
        <div className="overflow-hidden" style={{ paddingBottom: '0px' }}>
          <DashboardGrid profile={profile} />
        </div>
        
        {/* 固定の運動記録ボタン */}
        <div className="fixed bottom-6 right-6 z-40">
          <Button 
            variant="default" 
            size="lg" 
            onClick={handleRecordButtonClick}
            className="bg-blue-600 hover:bg-blue-700 shadow-lg rounded-full w-16 h-16"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
        <MealRecordModal />
        <ExerciseRecordModal 
          open={exerciseModalOpen} 
          onClose={() => setExerciseModalOpen(false)} 
          onExerciseAdded={handleExerciseAdded} 
        />
        <ExerciseAnalysisModal
          open={exerciseAnalysisModalOpen}
          onClose={() => setExerciseAnalysisModalOpen(false)}
        />
        <RecordSelectionModal 
          open={recordSelectionModalOpen}
          onClose={() => setRecordSelectionModalOpen(false)}
          onExerciseModalOpen={() => setExerciseModalOpen(true)}
        />
      </div>
    </div>
  );
}
