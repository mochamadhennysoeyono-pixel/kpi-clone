
// src/components/reports/category-performance-card.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type CategoryScore = {
  category: string;
  score: number;
  weight: number;
  achievement: number;
};

interface CategoryPerformanceCardProps {
  data: CategoryScore;
}

export function CategoryPerformanceCard({ data }: CategoryPerformanceCardProps) {
  return (
    <Card className="bg-muted/50">
        <CardContent className="p-4">
             <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium">{data.category}</p>
                <p className="text-sm font-semibold">{data.achievement.toFixed(1)}%</p>
            </div>
            <Progress value={data.achievement} className="h-2" />
            <div className="flex justify-between items-center mt-1">
                 <p className="text-xs text-muted-foreground">Bobot: {data.weight}%</p>
                <p className="text-xs text-muted-foreground">Skor: {data.score}/{data.weight}</p>
            </div>
        </CardContent>
    </Card>
  );
}
