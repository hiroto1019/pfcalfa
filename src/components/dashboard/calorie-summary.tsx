import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getIdealCalories } from "@/lib/utils";
import { type Profile } from "@/lib/types";

interface CalorieSummaryProps {
  profile: Profile;
}

export function CalorieSummary({ profile }: CalorieSummaryProps) {
  const idealCalories = getIdealCalories(profile);
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-bold">目標摂取カロリー</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-extrabold text-center text-blue-600">
          {idealCalories.toLocaleString()} kcal
        </p>
      </CardContent>
    </Card>
  );
} 