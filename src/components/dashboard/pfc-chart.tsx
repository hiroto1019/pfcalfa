"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// TODO: Replace with actual data from Supabase
const data = [
  {
    name: "PFC Balance",
    ideal_protein: 150,
    actual_protein: 120,
    ideal_fat: 60,
    actual_fat: 70,
    ideal_carbs: 200,
    actual_carbs: 250,
  },
];

export function PFCChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>PFCバランス</CardTitle>
        {/* TODO: Add date range tabs */}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="actual_protein" name="実績タンパク質 (g)" fill="#8884d8" />
            <Bar dataKey="ideal_protein" name="理想タンパク質 (g)" fill="#82ca9d" />
            <Bar dataKey="actual_fat" name="実績脂質 (g)" fill="#ffc658" />
            <Bar dataKey="ideal_fat" name="理想脂質 (g)" fill="#ff8042" />
            <Bar dataKey="actual_carbs" name="実績炭水化物 (g)" fill="#0088FE" />
            <Bar dataKey="ideal_carbs" name="理想炭水化物 (g)" fill="#00C49F" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
