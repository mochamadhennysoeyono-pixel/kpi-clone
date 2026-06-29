// src/components/reports/scenario-planner-dialog.tsx
"use client";

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from '../ui/textarea';
import { Wand2, Loader2 } from 'lucide-react';
import { runPlanScenario } from '@/actions/scenarioPlanner.action';
import type { ScenarioPlannerInput } from '@/types';
import type { KpiData } from '@/types';
import { useMasterData } from '@/contexts/master-data-context';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';

// A simple markdown-to-HTML converter
function SimpleMarkdown({ text }: { text: string }) {
    const html = text
      .replace(/^### (.*$)/gim, '<h3 class="font-semibold text-base mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="font-bold text-lg mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="font-bold text-xl mt-8 mb-4">$1</h1>')
      .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*)\*/g, '<em>$1</em>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/(\<li.*\>.*<\/li\>)/gs, '<ul class="list-disc list-inside space-y-1">$1</ul>')
      .replace(/\n/g, '<br />')
      .replace(/<br \/>(\s*<br \/>)+/g, '<br />')
      .replace(/<br \/>(\s*<h[1-3]>)/g, '$1')
      .replace(/(<\/ul>)<br \/>/g, '$1');

  return <div className="text-sm leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}

interface ScenarioPlannerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  filteredReportData: KpiData[];
}

export function ScenarioPlannerDialog({
  isOpen,
  onOpenChange,
  filteredReportData,
}: ScenarioPlannerDialogProps) {
    const { kpiSetups } = useMasterData();
    const { toast } = useToast();
    const [scenario, setScenario] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [loading, setLoading] = useState(false);

    const teamContext = useMemo(() => {
        if (!filteredReportData.length) return [];
        const firstEntry = filteredReportData[0];
        
        const setup = kpiSetups.find(s => 
            s.company === firstEntry.company && 
            s.position === firstEntry.position && 
            s.department === firstEntry.department &&
            s.level === firstEntry.level &&
            s.status === 'Aktif'
        );

        if (!setup) return [];

        return setup.indicators.map(indicator => {
            const relevantData = filteredReportData
                .map(d => {
                    const achievement = d.achievements.find(a => a.indicatorId === indicator.id);
                    if (!achievement) return null;
                    const monthlyTarget = indicator.target / 1; // Assuming monthly cycle for simplicity here
                    return monthlyTarget > 0 ? Math.min((achievement.actual / monthlyTarget) * indicator.weight, indicator.weight) : 0;
                })
                .filter((score): score is number => score !== null);

            const averageScore = relevantData.length > 0 ? relevantData.reduce((a, b) => a + b, 0) / relevantData.length : 0;
            const unit = indicator.targetFormat === 'Persentase' ? '%' : (indicator.unit ? ` ${indicator.unit}` : '');

            return {
                indicator: indicator.indicator,
                category: indicator.category,
                target: `${indicator.target.toLocaleString()}${unit}`,
                weight: indicator.weight,
                averageScore: parseFloat(averageScore.toFixed(1)),
            };
        });

    }, [filteredReportData, kpiSetups]);

    const handleGenerateAnalysis = async () => {
        if (!scenario.trim() || !teamContext.length) {
            toast({
                variant: 'destructive',
                title: 'Data tidak lengkap',
                description: 'Pastikan skenario telah diisi dan ada data kinerja tim yang tersedia.'
            });
            return;
        }

        setLoading(true);
        setAnalysis('');

        try {
            const payload: ScenarioPlannerInput = {
                scenarioDescription: scenario,
                teamContext: teamContext
            };
            const result = await runPlanScenario(payload);
            if(result.success && result.data?.analysis) {
              setAnalysis(result.data.analysis);
            } else {
              throw new Error(result.error || 'Gagal menganalisis skenario.');
            }
        } catch (error: any) {
            console.error('Error planning scenario:', error);
            toast({
                variant: 'destructive',
                title: 'Gagal Menganalisis',
                description: error.message || 'Terjadi kesalahan saat berkomunikasi dengan AI. Silakan coba lagi.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[90vh] sm:h-auto flex flex-col">
                <DialogHeader>
                    <DialogTitle>AI What-If Scenario Planner</DialogTitle>
                    <DialogDescription>
                        Tuliskan sebuah skenario bisnis, dan AI akan menganalisis potensi dampaknya terhadap KPI tim Anda saat ini.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Textarea 
                        placeholder='Contoh: "Bagaimana jika kita menaikkan target penjualan sebesar 20% untuk kuartal berikutnya?" atau "Saya ingin tim lebih fokus pada kepuasan pelanggan, apa dampaknya pada KPI yang ada?"'
                        value={scenario}
                        onChange={(e) => setScenario(e.target.value)}
                        className="h-24"
                        disabled={loading}
                    />
                    <Button onClick={handleGenerateAnalysis} disabled={loading}>
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Wand2 className="mr-2 h-4 w-4" />
                        )}
                        Jalankan Analisis AI
                    </Button>
                </div>

                <ScrollArea className="flex-1 min-h-0 pr-2">
                    {(loading || analysis) && (
                        <div className="mt-4 border-t pt-4">
                            {loading && <p className="text-sm text-muted-foreground animate-pulse">AI sedang menganalisis skenario Anda...</p>}
                            {analysis && <SimpleMarkdown text={analysis} />}
                        </div>
                    )}
                </ScrollArea>
                
                <DialogFooter className="border-t pt-4 mt-auto">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                        Tutup
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
