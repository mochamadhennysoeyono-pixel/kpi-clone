
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
  iconColor?: string;
};

export default function StatCard({ title, value, icon: Icon, description, iconColor }: StatCardProps) {
  const isNumeric = !isNaN(parseFloat(value));

  return (
    <Card className="shadow-lg h-full flex flex-col justify-between hover:shadow-xl transition-shadow border-l-4 border-primary">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-5 w-5 text-muted-foreground", iconColor)} />
      </CardHeader>
      <CardContent>
        <div className={cn(
          "font-bold truncate",
          isNumeric ? "text-3xl" : "text-xl"
        )}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </CardContent>
    </Card>
  );
}
