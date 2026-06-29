// src/app/(main)/document-management/decrees/page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Files } from 'lucide-react';

export default function DecreesPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="bg-primary text-primary-foreground dark:bg-card">
          <CardTitle className="font-headline flex items-center gap-2">
            <Files />
            Manajemen Surat Keputusan
          </CardTitle>
          <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
            Kelola semua surat keputusan (SK) direksi dan lainnya.
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
