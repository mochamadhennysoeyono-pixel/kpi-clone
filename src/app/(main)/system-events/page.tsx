// src/app/(main)/system-events/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SYSTEM_EVENTS } from "@/lib/default-data";
import { Workflow } from "lucide-react";

export default function SystemEventsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-primary text-primary-foreground dark:bg-card">
          <CardTitle className="font-headline flex items-center gap-2">
            <Workflow />
            Daftar Event Sistem
          </CardTitle>
          <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
            Ini adalah daftar semua "peristiwa" logis di dalam aplikasi yang dapat digunakan sebagai pemicu notifikasi otomatis.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
            {SYSTEM_EVENTS.map((section) => (
                <Card key={section.module} className="bg-muted/30 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">{section.module}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {section.events.map((item) => (
                                <li key={item.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-3 border-b last:border-b-0">
                                    <div className="flex-1 mb-2 sm:mb-0">
                                      <p className="font-medium text-sm">{item.name}</p>
                                      <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                                    </div>
                                    <Badge variant="outline" className="font-mono text-xs w-fit">{item.id}</Badge>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
