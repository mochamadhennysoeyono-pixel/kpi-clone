// src/app/(main)/document-management/policies/page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Files } from 'lucide-react';

export default function PoliciesPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="bg-primary text-primary-foreground dark:bg-card">
          <CardTitle className="font-headline flex items-center gap-2">
            <Files />
            Manajemen Peraturan Perusahaan
          </CardTitle>
          <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
            Kelola semua dokumen peraturan perusahaan dan kebijakan internal.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Halaman ini sedang dalam pengembangan.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
