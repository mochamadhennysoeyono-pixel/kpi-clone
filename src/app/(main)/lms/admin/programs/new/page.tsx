// src/app/(main)/lms/admin/programs/new/page.tsx
"use client";

import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { ProgramForm } from '@/components/lms/admin/programs/program-form';
import { LearningProgramSchema, type ProgramFormValues, type Company } from '@/types';

export default function NewLearningProgramPage() {
  const { currentUser, userRole } = useAuth();
  const { companies } = useMasterData();

  const userCompany = React.useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  
  const isHoldingAdmin = React.useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);

  const manageableCompanies = React.useMemo(() => {
    if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
    if (isHoldingAdmin && userCompany) {
      const getChildCompanies = (parentId: string): Company[] => {
        const children = companies.filter(c => c.parentId === parentId);
        return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
      };
      return [userCompany, ...getChildCompanies(userCompany.id)];
    }
    if (userCompany) return [userCompany];
    return [];
  }, [userRole, isHoldingAdmin, userCompany, companies]);

  const defaultCompany = (userRole !== 'superadmin' && currentUser) ? currentUser.company || '' : (manageableCompanies[0]?.name || '');

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(LearningProgramSchema),
    defaultValues: {
      title: "",
      description: "",
      company: defaultCompany,
      targetAudience: {}, // Use an empty object for "target all"
      stages: [],
      status: 'draft',
    }
  });

  // State for filters is now managed by the parent page
  const [filterCompany, setFilterCompany] = React.useState<string>(defaultCompany);
  const [filterDepartment, setFilterDepartment] = React.useState<string>('');
  const [filterPosition, setFilterPosition] = React.useState<string>('');

  // Watch for changes in the form's company field and update the local filter state
  const watchedCompany = form.watch('company');
  React.useEffect(() => {
    setFilterCompany(watchedCompany);
  }, [watchedCompany]);

  return (
    <FormProvider {...form}>
        <ProgramForm 
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
