// src/components/cycle-reports/cycle-report-card.tsx
import type { ReportData } from "@/app/(main)/cycle-reports/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { User, MousePointerClick, CalendarDays } from "lucide-react";
import { format, parse } from "date-fns";
import { id } from "date-fns/locale";

interface CycleReportCardProps {
    report: ReportData;
    onClick: () => void;
}

export function CycleReportCard({ report, onClick }: CycleReportCardProps) {
    const { indicator, leader, actual, target, progress, sourceType } = report;
    
    const isCurrency = indicator.unit?.toLowerCase().includes('rp') || 
                       indicator.unit?.toLowerCase().includes('rupiah') || 
                       indicator.indicator.toLowerCase().includes('omset') || 
                       indicator.indicator.toLowerCase().includes('pendapatan');

    const formatValue = (value: number) => {
        if (isCurrency) {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value);
        }
        const unit = indicator.targetFormat === 'Persentase' ? '%' : (indicator.unit ? ` ${indicator.unit}` : '');
        return `${value.toLocaleString('id-ID')}${unit}`;
    };

    const formatPeriod = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
            return format(parse(dateString, 'yyyy-MM', new Date()), "MMM yyyy", { locale: id });
        } catch (e) {
            return dateString;
        }
    };
    
    const personInCharge = leader ? leader.name : (sourceType === 'Holding' ? indicator.company : 'N/A');
    const picDepartment = leader ? leader.department : (sourceType === 'Holding' ? 'Holding' : 'N/A');


    return (
        <Card 
            className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer group"
            onClick={onClick}
        >
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base font-semibold capitalize">{indicator.indicator}</CardTitle>
                    <div className="flex items-center gap-2">
                        <Badge variant={sourceType === 'Holding' ? 'default' : 'secondary'}>{sourceType}</Badge>
                        <Badge variant="outline">{indicator.cycle}</Badge>
                    </div>
                </div>
                 <div className="flex flex-col gap-1 text-sm text-muted-foreground pt-1">
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Penanggung Jawab: <span className="font-semibold text-foreground">{personInCharge}</span> ({picDepartment})</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <CalendarDays className="h-4 w-4" />
                         <span>Periode Aktif: <span className="font-semibold text-foreground">{formatPeriod(indicator.validFrom)} - {formatPeriod(indicator.validTo)}</span></span>
                    </div>
                 </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-end">
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Progres</span>
                            <span className="font-bold text-primary">{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress} />
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center border-t pt-4">
                        <div className="sm:text-left">
                            <p className="text-muted-foreground text-xs">Aktual Kumulatif</p>
                            <p className="font-bold text-base">{formatValue(actual)}</p>
                        </div>
                         <div className="sm:text-center">
                            <div>
                                <p className="text-muted-foreground text-xs">Target Total</p>
                                <p className="font-semibold text-base">{formatValue(target)}</p>
                            </div>
                        </div>
                         <div className="sm:text-right">
                            <p className="text-muted-foreground text-xs">Sisa Target</p>
                            <p className="font-semibold text-base text-destructive">{formatValue(Math.max(0, target - actual))}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="pt-4 pb-3">
                <div className="flex items-center justify-center w-full">
                    <p className="text-xs text-muted-foreground/80 flex items-center gap-1.5 group-hover:text-primary transition-colors">
                        <MousePointerClick className="h-3 w-3" />
                        klik untuk review detail
                    </p>
                </div>
            </CardFooter>
        </Card>
    )
}
