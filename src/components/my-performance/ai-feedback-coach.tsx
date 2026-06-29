// src/components/my-performance/ai-feedback-coach.tsx
"use client";

import { useState, useMemo } from 'react';
import { runGetKpiFeedback } from '@/actions/kpiFeedbackCoach.action';
import type { KpiFeedbackInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMasterData } from '@/contexts/master-data-context';
import type { KpiData, KpiIndicator } from '@/types';
import { parse, lastDayOfMonth } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';

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


  return <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
}


type Props = {
  kpiData: KpiData;
};

export function AIFeedbackCoach({ kpiData }: Props) {
  const [feedback, setFeedback] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { kpiSetups, employees, companies } = useMasterData();
  const { currentUser, userRole } = useAuth();
  
  const userCompany = useMemo(() => {
    if (!currentUser) return null;
    return companies.find(c => c.name === currentUser.company);
  }, [currentUser, companies]);

  const showCoach = useMemo(() => {
      if (userRole === 'superadmin') return true;
      return !!userCompany?.features?.hasFeedbackCoach;
  }, [userRole, userCompany]);

  const getCycleDivider = (cycle: KpiIndicator['cycle']): number => {
    switch(cycle) {
        case 'Bulanan': return 1;
        case '3 Bulan': return 3;
        case '6 Bulan': return 6;
        case '1 Tahun': return 12;
        default: return 1;
    }
  }

  const currentKpiSetup = useMemo(() => {
    if (!kpiData) return null;
    const employee = employees.find(e => e.id === kpiData.employeeId);
    if (!employee) return null;

    const periodDate = parse(kpiData.period, 'yyyy-MM', new Date());

    return kpiSetups.find(s => {
      const isMatch = s.position === employee.position &&
                      s.department === employee.department &&
                      s.company === employee.company &&
                      s.level === employee.level &&
                      s.status === "Aktif";
      if (!isMatch) return false;

      const validFrom = s.validFrom ? parse(s.validFrom, 'yyyy-MM', new Date()) : null;
      const validTo = s.validTo ? lastDayOfMonth(parse(s.validTo, 'yyyy-MM', new Date())) : null;

      if (validFrom && validTo) {
        return periodDate >= validFrom && periodDate <= validTo;
      }
      return false;
    });
  }, [kpiData, kpiSetups, employees]);

  const handleGenerateFeedback = async () => {
    if (!kpiData || !currentKpiSetup) {
        toast({
            variant: "destructive",
            title: "Data Tidak Lengkap",
            description: "Pengaturan KPI untuk periode ini tidak ditemukan.",
        });
        return;
    }
    
    setLoading(true);
    setFeedback('');

    try {
        const achievementDetails = kpiData.achievements.map(ach => {
            const indicator = currentKpiSetup.indicators.find(i => i.id === ach.indicatorId);
            if (!indicator) {
                return {
                    indicatorName: 'Indikator Dihapus', category: 'N/A', target: 'N/A', actual: `${ach.actual}`, score: 0, weight: 0
                };
            }
            
            const cycleDivider = getCycleDivider(indicator.cycle);
            const monthlyTarget = indicator.target / cycleDivider;
            
            let score;
            const method = indicator.calculationMethod;
            const actualVal = Number(ach.actual);
            
            switch (method) {
                case 'Target Minimal':
                    if (monthlyTarget <= 0) { score = actualVal <= 0 ? indicator.weight : 0; }
                    else if (actualVal > monthlyTarget) { score = 0; }
                    else if (actualVal === monthlyTarget) { score = indicator.weight * 0.25; }
                    else { const minScore = indicator.weight * 0.25; const ratio = (monthlyTarget - actualVal) / monthlyTarget; score = minScore + ratio * (indicator.weight - minScore); }
                    break;
                case 'Target Mutlak':
                    score = actualVal === monthlyTarget ? indicator.weight : 0;
                    break;
                case 'Target Limit':
                    score = actualVal <= monthlyTarget ? indicator.weight : 0;
                    break;
                case 'Target Maksimal':
                default:
                    if (monthlyTarget === 0) { score = actualVal === 0 ? indicator.weight : 0; }
                    else { score = Math.min(actualVal / monthlyTarget, 1) * indicator.weight; }
                    break;
            }
            const finalScore = isNaN(score) ? 0 : Math.max(0, Math.min(score, indicator.weight));
            
            const unit = indicator.targetFormat === 'Persentase' ? '%' : (indicator.unit ? ` ${indicator.unit}` : '');

            return {
                indicatorName: indicator.indicator,
                category: indicator.category,
                target: `${monthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit}`,
                actual: `${actualVal.toLocaleString()}${unit}`,
                score: parseFloat(finalScore.toFixed(1)),
                weight: indicator.weight || 0,
            };
        });

      const payload: KpiFeedbackInput = {
        employeeName: kpiData.employeeName,
        overallScore: kpiData.score,
        performanceStatus: kpiData.status,
        achievements: achievementDetails,
      };

      const result = await runGetKpiFeedback(payload);
      if(result.success && result.data?.feedback){
        setFeedback(result.data.feedback);
      } else {
        throw new Error(result.error || 'Gagal mendapatkan umpan balik dari AI.');
      }
    } catch (error: any) {
      console.error('Error generating AI feedback:', error);
      toast({
        variant: "destructive",
        title: "Gagal Memberikan Umpan Balik AI",
        description: error.message || "Terjadi kesalahan. Silakan coba lagi.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!showCoach) {
      return null;
  }

  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Wand2 className="text-primary" />
          Pelatih Kinerja AI
        </CardTitle>
        <CardDescription>
          Dapatkan umpan balik dan saran yang dipersonalisasi dari AI untuk membantu Anda berkembang.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleGenerateFeedback} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Buatkan Saya Umpan Balik
        </Button>

        {(loading || feedback) && (
          <div className="mt-6 border-t pt-4">
            {loading && <p className="text-sm text-muted-foreground animate-pulse">AI sedang menganalisis kinerja Anda...</p>}
            {feedback && (
                <div className="prose prose-sm max-w-none">
                   <SimpleMarkdown text={feedback} />
                </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
