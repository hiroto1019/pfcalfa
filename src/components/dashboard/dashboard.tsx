import { PFCChart } from "./pfc-chart";
import { AiAdvice } from "./ai-advice";
import { MealRecordModal } from "@/components/meals/meal-record-modal";

export function Dashboard() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">ダッシュボード</h1>
        {/* TODO: Add user menu and logout button */}
      </header>
      <main className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PFCChart />
        </div>
        <div>
          <AiAdvice />
        </div>
      </main>
      <MealRecordModal />
    </div>
  );
}
