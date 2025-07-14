import { DashboardGrid } from "./dashboard-grid";
import { type DashboardData } from "@/app/page";

export function Dashboard({ dashboardData }: { dashboardData: DashboardData }) {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
      </div>
      <DashboardGrid dashboardData={dashboardData} />
    </div>
  );
}
