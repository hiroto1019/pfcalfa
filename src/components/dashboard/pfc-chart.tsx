"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

interface PFCChartProps {
  protein: number;
  fat: number;
  carbs: number;
  idealCalories: number;
}

export function PFCChart({ protein, fat, carbs, idealCalories }: PFCChartProps) {
  const proteinCalories = protein * 4;
  const fatCalories = fat * 9;
  const carbsCalories = carbs * 4;
  const totalCalories = proteinCalories + fatCalories + carbsCalories;

  const data = [
    { name: 'タンパク質', value: proteinCalories },
    { name: '脂質', value: fatCalories },
    { name: '炭水化物', value: carbsCalories },
  ];

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658'];

  // 目標PFCバランス（例：3:2:5）
  const idealProteinRatio = 0.3;
  const idealFatRatio = 0.2;
  const idealCarbsRatio = 0.5;

  return (
    <div style={{ width: '100%', height: 250 }}>
      <div className='text-center text-sm mb-2'>
        合計: {Math.round(totalCalories)} / {Math.round(idealCalories)} kcal
      </div>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
