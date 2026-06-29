// src/app/(main)/feature-management/page.tsx
"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useMasterData } from "@/contexts/master-data-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { KeyRound, Building } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Company } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const features: { key: keyof NonNullable<Company['features']>, label: string }[] = [
    { key: 'hasAiKpiWizard', label: 'AI KPI Wizard' },
    { key: 'hasPageAssistant', label: 'Page Assistant (KIPI)' },
    { key: 'hasFeedbackCoach', label: 'AI Feedback Coach' },
    { key: 'hasKpiSuggestion', label: 'AI KPI Suggestion' },
    { key: 'hasScenarioPlanner', label: 'AI Scenario Planner' },
];

export default function FeatureManagementPage() {
  const { companies, updateCompany } = useMasterData();
  const { userRole } = useAuth();
  const { toast } = useToast();

  const handleToggleFeature = async (company: Company, feature: keyof NonNullable<Company['features']>, checked: boolean) => {
    try {
      const currentFeatures = company.features || {};
      await updateCompany(company.id, {
        features: {
          ...currentFeatures,
          [feature]: checked,
        },
      });
      toast({
        title: "Fitur Diperbarui",
        description: `Fitur ${features.find(f => f.key === feature)?.label} untuk ${company.name} telah ${checked ? 'diaktifkan' : 'dinonaktifkan'}.`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui",
        description: e.message,
      });
    }
  };

  if (userRole !== 'superadmin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Akses Ditolak</CardTitle>
          <CardDescription>Halaman ini hanya untuk Superadmin.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg mb-6">
        <CardHeader className="bg-primary text-primary-foreground dark:bg-card dark:text-primary-foreground">
          <div>
            <CardTitle className="font-headline dark:text-white flex items-center gap-2">
                <KeyRound />
                Manajemen Fitur Add-On
            </CardTitle>
            <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
              Aktifkan atau nonaktifkan fitur tambahan untuk setiap perusahaan.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Perusahaan</TableHead>
                   {features.map(f => (
                      <TableHead key={f.key} className="text-center">{f.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-full bg-muted">
                          <Building className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p>{company.name}</p>
                          <p className="text-xs text-muted-foreground">{company.businessField}</p>
                        </div>
                      </div>
                    </TableCell>
                     {features.map(f => (
                        <TableCell key={f.key} className="text-center">
                            <Switch
                                id={`${f.key}-switch-${company.id}`}
                                checked={!!company.features?.[f.key]}
                                onCheckedChange={(checked) => handleToggleFeature(company, f.key, checked)}
                            />
                        </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
