// src/app/(main)/okr/[okrId]/page.tsx
"use client";

import { useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMasterData } from '@/contexts/master-data-context';
import { OKRSetupForm } from '../okr-form';
import { OKRDetailView } from '../okr-detail-view';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function OkrDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const okrId = params.okrId as string;
    const { okrs } = useMasterData();
    const { userRole } = useAuth();
    const router = useRouter();

    const okr = useMemo(() => okrs.find(o => o.id === okrId), [okrs, okrId]);
    const isEditMode = searchParams.get('edit') === 'true';

    if (!okr) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    // If in edit mode and user is an admin, show the form.
    if (isEditMode && (userRole === 'superadmin' || userRole === 'manajemen')) {
        return <OKRSetupForm okr={okr} />;
    }
    
    // Otherwise, always show the detail view for this page.
    return <OKRDetailView okr={okr} />;
}
