// src/components/cycle-reports/cycle-detail-dialog.tsx
"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import CycleDetailViewContent from './cycle-detail-dialog-content';

// This is a dummy component now. The logic has been moved to the new [reportId] page
// and the main cycle-reports page. This is kept to avoid breaking imports.
export function CycleDetailDialog() {
    return null;
}

// Attach the content component for desktop usage
CycleDetailDialog.Content = CycleDetailViewContent;
