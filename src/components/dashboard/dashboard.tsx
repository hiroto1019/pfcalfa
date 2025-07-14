import { CalorieSummary } from "@/components/dashboard/calorie-summary";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { type Profile } from "@/lib/types";

export function Dashboard({ profile, onUpdate }: { profile: Profile | null, onUpdate: () => void }) {
  if (!profile) {
    return <div className="flex items-center justify-center h-screen">プロフィール情報を読み込んでいます...</div>;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50/90">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <CalorieSummary profile={profile} />
        <DashboardGrid profile={profile} onUpdate={onUpdate} />
      </main>
    </div>
  );
}
