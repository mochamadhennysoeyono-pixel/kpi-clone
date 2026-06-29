// src/app/(main)/lms/admin/programs/[programId]/edit/page.tsx
"use client";

import * as React from 'react';
import { useParams } from "next/navigation";
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LearningProgramSchema, type ProgramFormValues } from '@/types';
import { ProgramForm } from '@/components/lms/admin/programs/program-form';
import { useMasterData } from '@/contexts/master-data-context';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function EditProgramPage() {
  const params = useParams();
  const programId = params.programId as string;
  const { learningPrograms } = useMasterData();
  const { currentUser } = useAuth();

  const program = React.useMemo(() => {
    return learningPrograms.find(p => p.id === programId);
  }, [programId, learningPrograms]);
  
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(LearningProgramSchema),
  });
  
  const [filterCompany, setFilterCompany] = React.useState<string>('');
  const [filterDepartment, setFilterDepartment] = React.useState<string>('');
  const [filterPosition, setFilterPosition] = React.useState<string>('');
  
  React.useEffect(() => {
    if (program) {
       const programDataWithDates = {
        ...program,
        stages: (program.stages || []).map(stage => ({
          ...stage,
          activities: (stage.activities || []).map(activity => ({
            ...activity,
            startDate: activity.startDate && typeof (activity.startDate as any).toDate === 'function' ? (activity.startDate as any).toDate() : (activity.startDate ? new Date(activity.startDate as any) : undefined),
            endDate: activity.endDate && typeof (activity.endDate as any).toDate === 'function' ? (activity.endDate as any).toDate() : (activity.endDate ? new Date(activity.endDate as any) : undefined),
          }))
        }))
      };
      form.reset(programDataWithDates);

      // Set initial filters based on the loaded program data
      setFilterCompany(program.company || '');
      // Note: We are setting only the first one if it's an array. The form will show all selected values.
      // The filter's purpose is to populate the options, not necessarily reflect the full selection.
      setFilterDepartment(program.targetAudience?.departments?.[0] || '');
      setFilterPosition(program.targetAudience?.positions?.[0] || '');
    } else {
        // Fallback for new item if somehow routed here, or user without company
        setFilterCompany(currentUser?.company || '');
    }
  }, [program, form, currentUser]);


  if (!program) {
    return (
        <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Memuat data program...</p>
        </div>
    );
  }

  return (
    <FormProvider {...form}>
      <ProgramForm 
        program={program}
        filterCompany={filterCompany}
        setFilterCompany={setFilterCompany}
        filterDepartment={filterDepartment}
        setFilterDepartment={setFilterDepartment}
        filterPosition={filterPosition}
        setFilterPosition={setFilterPosition}
      />
    </FormProvider>
  );
}
