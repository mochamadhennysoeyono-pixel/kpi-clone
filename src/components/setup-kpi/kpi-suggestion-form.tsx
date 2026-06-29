// src/components/setup-kpi/kpi-suggestion-form.tsx
"use client";

import { useState, useMemo } from 'react';
import { runSuggestKpiIndicators } from '@/actions/aiKpiSuggestion.action';
import type { SuggestKpiIndicatorsInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2, Loader2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '../ui/checkbox';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';

type Props = {
  onAddIndicators: (indicators: string[]) => void;
};

export function KpiSuggestionForm({ onAddIndicators }: Props) {
  const [formData, setFormData] = useState<SuggestKpiIndicatorsInput>({
    jobTitle: 'Insinyur Perangkat Lunak',
    department: 'Teknologi',
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser, userRole } = useAuth();
  const { companies } = useMasterData();

  const userCompany = useMemo(() => {
      if (!currentUser) return null;
      return companies.find(c => c.name === currentUser.company);
  }, [currentUser, companies]);

  const showSuggestionForm = useMemo(() => {
      if (userRole === 'superadmin') return true;
      return !!userCompany?.features?.hasKpiSuggestion;
  }, [userRole, userCompany]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (checked: boolean | 'indeterminate', suggestion: string) => {
    if (checked) {
      setSelectedSuggestions(prev => [...prev, suggestion]);
    } else {
      setSelectedSuggestions(prev => prev.filter(s => s !== suggestion));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuggestions([]);
    setSelectedSuggestions([]);
    try {
      const response = await runSuggestKpiIndicators(formData);
      if (response.success && response.data) {
        setSuggestions(response.data.kpiSuggestions);
      } else {
        throw new Error(response.error || 'AI tidak memberikan respon yang valid.');
      }
    } catch (error: any) {
      console.error('Error suggesting KPIs:', error);
      toast({
        variant: "destructive",
        title: "Gagal Memberikan Saran AI",
        description: error.message || "Terjadi kesalahan saat membuat saran KPI. Silakan coba lagi.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddSelected = () => {
    onAddIndicators(selectedSuggestions);
    setSelectedSuggestions([]);
  }

  if (!showSuggestionForm) {
      return null;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-primary text-primary-foreground dark:bg-card">
        <CardTitle className="flex items-center gap-2 font-headline">
          <Wand2 />
          Alat Saran KPI AI
        </CardTitle>
        <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
          Dapatkan saran bertenaga AI untuk indikator KPI yang relevan berdasarkan jabatan dan departemen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="jobTitle">Jabatan</Label>
              <Input
                id="jobTitle"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleInputChange}
                placeholder="cth., Insinyur Perangkat Lunak"
              />
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="department">Departemen</Label>
              <Input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                placeholder="cth., Teknologi"
              />
            </div>
            <div className="space-y-2 sm:col-span-1 self-end">
                <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                )}
                Sarankan KPI
                </Button>
            </div>
          </div>
        </form>

        {(loading || suggestions.length > 0) && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Indikator yang Disarankan:</h3>
            {loading && <p className="text-sm text-muted-foreground">Menghasilkan saran...</p>}
            {suggestions.length > 0 && (
                <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                         id={`suggestion-${index}`}
                         onCheckedChange={(checked) => handleCheckboxChange(checked, suggestion)}
                         checked={selectedSuggestions.includes(suggestion)}
                        />
                        <label
                        htmlFor={`suggestion-${index}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                        {suggestion}
                        </label>
                    </div>
                    ))}
                    <div className="pt-4">
                        <Button onClick={handleAddSelected} disabled={selectedSuggestions.length === 0}>
                            <Plus className="mr-2 h-4 w-4" />
                            Tambahkan Pilihan ke Pengaturan
                        </Button>
                    </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
