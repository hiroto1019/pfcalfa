import { MealRecordModal } from "@/components/meals/meal-record-modal";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import Link from "next/link";
import { DashboardGrid } from "./dashboard-grid";

export function Dashboard() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="w-full max-w-screen-xl aspect-[16/9] bg-white rounded-xl shadow-lg flex flex-col p-4">
        <header className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              設定
            </Button>
          </Link>
      </header>
        <DashboardGrid />
        <MealRecordModal />
        </div>
    </div>
  );
}
