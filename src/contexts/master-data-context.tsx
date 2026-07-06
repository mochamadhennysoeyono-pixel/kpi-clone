
// src/contexts/master-data-context.tsx
"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase/client';
import type { 
    Company, Department, Position, Employee, CompanyAdmin, SuperAdmin, KpiCategory, KboCategory, 
    KboSetup, AppraisalSetup, KpiSetup, KpiData, TargetOverride, 
    KboAssessment, AppraisalTask, SubscriptionPlan, LmsQuiz, Course, Enrollment, 
    DocumentTemplate, OKR, NotificationTemplate, LearningProgram, CompanyObjective, 
    AiTool, MediaFile, CollabSpace, CollabTask, CollabMessage, EmailTemplate, 
    WhatsappTemplate, SubscriptionLog, Memo, ModulePricing, AddonPricing
} from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './auth-context';
import { 
    collection, getDocs, query, where, addDoc, doc, updateDoc, writeBatch, 
    serverTimestamp, deleteDoc, getDoc, setDoc, deleteField 
} from 'firebase/firestore';
import { DEFAULT_KPI_CATEGORIES, DEFAULT_KBO_CATEGORIES } from '@/lib/default-data';
import { enrollmentWithMethods } from '@/types';
import { addDays } from 'date-fns';

interface MasterDataContextType {
  companies: Company[];
  departments: Department[];
  positions: Position[];
  employees: Employee[];
  companyAdmins: CompanyAdmin[];
  superadmins: SuperAdmin[];
  companyObjectives: CompanyObjective[];
  kpiCategories: KpiCategory[];
  kboCategories: KboCategory[];
  kboSetups: KboSetup[];
  appraisalSetups: AppraisalSetup[];
  kpiSetups: KpiSetup[];
  documentTemplates: DocumentTemplate[];
  emailTemplates: EmailTemplate[];
  whatsappTemplates: WhatsappTemplate[];
  notificationTemplates: NotificationTemplate[];
  kpiData: KpiData[];
  okrs: OKR[];
  targetOverrides: TargetOverride[];
  kboAssessments: KboAssessment[];
  appraisalTasks: AppraisalTask[];
  subscriptionPlans: SubscriptionPlan[];
  courses: Course[];
  quizzes: LmsQuiz[];
  learningPrograms: LearningProgram[];
  enrollments: Enrollment[];
  aiTools: AiTool[];
  mediaFiles: MediaFile[];
  collabSpaces: CollabSpace[];
  collabTasks: CollabTask[];
  collabMessages: CollabMessage[];
  subscriptionLogs: SubscriptionLog[];
  memos: Memo[];
  modulePricing: ModulePricing[];
  addonPricing: AddonPricing[];
  
  fetchData: (isSilent?: boolean) => Promise<void>;
  addCompany: (company: Omit<Company, 'id'>) => Promise<Company | null>;
  updateCompany: (id: string, data: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  resetCompanySubscription: (companyId: string) => Promise<void>;
  addDepartment: (department: Omit<Department, 'id'>) => Promise<Department | null>;
  updateDepartment: (id: string, data: Partial<Omit<Department, 'id'>>) => Promise<void>;
  deleteDepartments: (ids: string[]) => Promise<void>;
  addPosition: (position: Omit<Position, 'id'>) => Promise<Position | null>;
  updatePosition: (id: string, data: Partial<Omit<Position, 'id'>>) => Promise<void>;
  deletePositions: (ids: string[]) => Promise<void>;
  updateEmployee: (id: string, data: Partial<Omit<Employee, 'id'>>) => Promise<void>;
  deleteEmployees: (ids: string[]) => Promise<void>;
  updateCompanyAdmin: (id: string, data: Partial<CompanyAdmin>) => Promise<void>;
  deleteCompanyAdmins: (ids: string[]) => Promise<void>;
  deleteSuperadmins: (ids: string[]) => Promise<void>;
  addCompanyObjective: (objective: Omit<CompanyObjective, 'id'>) => Promise<CompanyObjective | null>;
  updateCompanyObjective: (id: string, data: Partial<CompanyObjective>) => Promise<void>;
  deleteCompanyObjectives: (ids: string[]) => Promise<void>;
  addKpiCategory: (category: Omit<KpiCategory, 'id'>) => Promise<KpiCategory | null>;
  updateKpiCategory: (id: string, data: Partial<KpiCategory>) => Promise<void>;
  deleteKpiCategories: (ids: string[]) => Promise<void>;
  addKboCategory: (category: Omit<KboCategory, 'id'> & {id: string}) => Promise<KboCategory | null>;
  updateKboCategory: (id: string, data: Partial<KboCategory>) => Promise<void>;
  deleteKboCategories: (ids: string[]) => Promise<void>;
  addKboSetup: (setup: Omit<KboSetup, 'id'>) => Promise<KboSetup | null>;
  updateKboSetup: (id: string, data: Partial<KboSetup>) => Promise<void>;
  deleteKboSetup: (id: string) => Promise<void>;
  addAppraisalSetup: (setup: Omit<AppraisalSetup, 'id'>) => Promise<AppraisalSetup | null>;
  updateAppraisalSetup: (id: string, data: Partial<AppraisalSetup>) => Promise<void>;
  deleteAppraisalSetup: (setupId: string) => Promise<void>;
  generateAppraisalTasks: (setup: AppraisalSetup, kboSetupId: string) => Promise<void>;
  addKboAssessment: (assessment: Omit<KboAssessment, 'id'>) => Promise<void>;
  deleteKboAssessment: (assessmentId: string, kboSetupId: string) => Promise<void>;
  addKpiSetup: (setup: Omit<KpiSetup, 'id'>, silent?: boolean) => Promise<KpiSetup | null>;
  updateKpiSetup: (id: string, data: Partial<KpiSetup>, silent?: boolean) => Promise<void>;
  deleteKpiSetup: (id: string) => Promise<void>;
  addDocumentTemplate: (template: Omit<DocumentTemplate, 'id'>) => Promise<DocumentTemplate | null>;
  updateDocumentTemplate: (id: string, data: Partial<DocumentTemplate>) => Promise<void>;
  deleteDocumentTemplate: (id: string) => Promise<void>;
  addOrUpdateKpiData: (data: Partial<KpiData> & { id: string }) => Promise<void>;
  updateKpiData: (id: string, data: Partial<KpiData>) => Promise<void>;
  deleteKpiData: (ids: string[]) => Promise<void>;
  addOkr: (okr: Omit<OKR, 'id'>) => Promise<OKR | null>;
  updateOkr: (id: string, data: Partial<OKR>) => Promise<void>;
  deleteOkr: (id: string) => Promise<void>;
  addSubscriptionPlan: (plan: Omit<SubscriptionPlan, 'id'>) => Promise<SubscriptionPlan | null>;
  updateSubscriptionPlan: (id: string, data: Partial<SubscriptionPlan>) => Promise<void>;
  deleteSubscriptionPlan: (id: string) => Promise<void>;
  addCourse: (course: Omit<Course, 'id'>) => Promise<Course | null>;
  updateCourse: (id: string, data: Partial<Course>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  addQuiz: (quiz: Omit<LmsQuiz, 'id'>) => Promise<LmsQuiz | null>;
  updateQuiz: (id: string, data: Partial<LmsQuiz>) => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;
  addLearningProgram: (program: Omit<LearningProgram, 'id'>) => Promise<LearningProgram | null>;
  updateLearningProgram: (id: string, data: Partial<LearningProgram>) => Promise<void>;
  enrollToCourse: (courseId: string, employeeId: string) => Promise<Enrollment | null>;
  updateEnrollment: (enrollmentId: string, data: Partial<Enrollment>) => Promise<void>;
  resetEnrollment: (enrollmentId: string) => Promise<void>;
  addCollabSpace: (space: Omit<CollabSpace, 'id'>) => Promise<CollabSpace | null>;
  updateCollabSpace: (id: string, data: Partial<CollabSpace>) => Promise<void>;
  deleteCollabSpace: (id: string) => Promise<void>;
  addCollabTask: (task: Omit<CollabTask, 'id'>) => Promise<CollabTask | null>;
  updateCollabTask: (id: string, data: Partial<CollabTask>) => Promise<void>;
  deleteCollabTask: (id: string) => Promise<void>;
  addEmailTemplate: (template: Omit<EmailTemplate, 'id'>) => Promise<void>;
  updateEmailTemplate: (id: string, data: Partial<EmailTemplate>) => Promise<void>;
  deleteEmailTemplate: (id: string) => Promise<void>;
  addWhatsappTemplate: (template: Omit<WhatsappTemplate, 'id'>) => Promise<void>;
  updateWhatsappTemplate: (id: string, data: Partial<WhatsappTemplate>) => Promise<void>;
  deleteWhatsappTemplate: (id: string) => Promise<void>;
  initializeDefaultEmailTemplates: () => Promise<void>;
  initializeDefaultWhatsappTemplates: () => Promise<void>;
  addAiTool: (d: Omit<AiTool, 'id'>) => Promise<AiTool | null>;
  updateAiTool: (id: string, data: Partial<AiTool>) => Promise<void>;
  deleteAiTool: (id: string) => Promise<void>;
  addMediaFile: (d: Omit<MediaFile, 'id'>) => Promise<MediaFile | null>;
  deleteMediaFile: (id: string) => Promise<void>;
  addMemo: (memo: Omit<Memo, 'id'>) => Promise<void>;
  addSubscriptionLog: (log: Omit<SubscriptionLog, 'id'>) => Promise<void>;
  
  updateModulePricing: (id: string, data: Partial<ModulePricing>) => Promise<void>;
  updateAddonPricing: (id: string, data: Partial<AddonPricing>) => Promise<void>;
  
  isLoading: boolean;
}

const MasterDataContext = createContext<MasterDataContextType | null>(null);

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (!context) throw new Error('useMasterData must be used within a MasterDataProvider');
  return context;
}

const mapSnapshot = <T extends any>(snapshot: any): T[] => {
    return snapshot.docs.map((d: any) => ({ ...d.data(), id: d.id })) as T[];
}

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const { currentUser, userRole, isLoading: isAuthLoading } = useAuth();
  const [data, setData] = useState<any>({
    companies: [], departments: [], positions: [], employees: [], companyAdmins: [], superadmins: [], companyObjectives: [],
    kpiCategories: [], kboCategories: [], kboSetups: [], kpiSetups: [], appraisalSetups: [], documentTemplates: [], 
    emailTemplates: [], whatsappTemplates: [], notificationTemplates: [], kpiData: [], okrs: [], 
    targetOverrides: [], kboAssessments: [], appraisalTasks: [], subscriptionPlans: [], courses: [], 
    quizzes: [], learningPrograms: [], enrollments: [], aiTools: [], mediaFiles: [], collabSpaces: [], 
    collabTasks: [], collabMessages: [], subscriptionLogs: [], memos: [],
    modulePricing: [], addonPricing: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const { toast } = useToast();

  const fetchData = useCallback(async (isSilent = false) => {
      if (isAuthLoading) return;
      if (!currentUser || !userRole || !db) {
        setIsLoading(false);
        return;
      }
      if (!hasFetchedRef.current && !isSilent) setIsLoading(true);

      try {
        const allCompaniesSnap = await getDocs(collection(db, 'companies'));
        const allCompanies = mapSnapshot<Company>(allCompaniesSnap);
        
        let companyNamesToQuery: string[] = [];
        const isSuperadmin = userRole === 'superadmin';

        if (!isSuperadmin) {
            companyNamesToQuery = [currentUser.company];
            const userComp = allCompanies.find(c => c.name === currentUser.company);
            if (userComp?.isHolding) {
                const getChildNames = (parentId: string): string[] => {
                    const children = allCompanies.filter(c => c.parentId === parentId);
                    return [...children.map(c => c.name), ...children.flatMap(c => getChildNames(c.id))];
                };
                companyNamesToQuery.push(...getChildNames(userComp.id));
            }
        }

        const globalCollections = [
            'subscriptionPlans', 'emailTemplates', 'whatsappTemplates', 
            'notificationTemplates', 'aiTools', 'targetOverrides', 
            'lmsEnrollments', 'memos', 'modulePricing', 'addonPricing',
            'superadmins'
        ];
        
        const scopedCollections = [
            'departments', 'positions', 'employees', 'companyAdmins', 'companyObjectives', 
            'kpiCategories', 'kboCategories', 'kboSetups', 'kpiSetups', 'appraisalSetups', 
            'documentTemplates', 'kpiData', 'okrs', 'lmsCourses', 'lmsQuizzes', 
            'learningPrograms', 'mediaFiles', 'collabSpaces', 'collabTasks', 'subscriptionLogs',
            'kboAssessments', 'appraisalTasks'
        ];
        
        const [scopedSnaps, globalSnaps] = await Promise.all([
             Promise.all(scopedCollections.map(coll => {
                if (isSuperadmin) {
                    return getDocs(collection(db, coll));
                } else {
                    return getDocs(query(collection(db, coll), where("company", "in", [...companyNamesToQuery, 'Global'])));
                }
            })),
             Promise.all(globalCollections.map(coll => 
                getDocs(collection(db, coll))
            ))
        ]);

        const [
            departmentsSnap, positionsSnap, employeesSnap, companyAdminsSnap, companyObjectivesSnap, 
            kpiCategoriesSnap, kboCategoriesSnap, kboSetupsSnap, kpiSetupsSnap, appraisalSetupsSnap, 
            documentTemplatesSnap, kpiDataSnap, okrsSnap, coursesSnap, quizzesSnap, 
            learningProgramsSnap, mediaFilesSnap, collabSpacesSnap, collabTasksSnap, subscriptionLogsSnap,
            kboAssessmentsSnap, appraisalTasksSnap
        ] = scopedSnaps;

        const [
            subscriptionPlansSnap, emailTemplatesSnap, whatsappTemplatesSnap, 
            notificationTemplatesSnap, aiToolsSnap, targetOverridesSnap, 
            enrollmentsSnap, memosSnap, modulePricingSnap, addonPricingSnap,
            superadminsSnap
        ] = globalSnaps;

        const accessibleEmployees = mapSnapshot<Employee>(employeesSnap);
        const accessibleEmployeeIds = new Set(accessibleEmployees.map(e => e.id));

        setData(prev => ({
            ...prev,
            companies: isSuperadmin ? allCompanies : allCompanies.filter(c => companyNamesToQuery.includes(c.name)),
            departments: mapSnapshot<Department>(departmentsSnap),
            positions: mapSnapshot<Position>(positionsSnap),
            employees: accessibleEmployees,
            companyAdmins: mapSnapshot<CompanyAdmin>(companyAdminsSnap),
            superadmins: mapSnapshot<SuperAdmin>(superadminsSnap),
            companyObjectives: mapSnapshot<CompanyObjective>(companyObjectivesSnap),
            kpiCategories: mapSnapshot<KpiCategory>(kpiCategoriesSnap),
            kboCategories: mapSnapshot<KboCategory>(kboCategoriesSnap),
            kboSetups: mapSnapshot<KboSetup>(kboSetupsSnap),
            kpiSetups: mapSnapshot<KpiSetup>(kpiSetupsSnap),
            appraisalSetups: mapSnapshot<AppraisalSetup>(appraisalSetupsSnap),
            documentTemplates: mapSnapshot<DocumentTemplate>(documentTemplatesSnap),
            emailTemplates: mapSnapshot<EmailTemplate>(emailTemplatesSnap),
            whatsappTemplates: mapSnapshot<WhatsappTemplate>(whatsappTemplatesSnap),
            notificationTemplates: mapSnapshot<NotificationTemplate>(notificationTemplatesSnap),
            kpiData: mapSnapshot<KpiData>(kpiDataSnap),
            okrs: mapSnapshot<OKR>(okrsSnap),
            subscriptionPlans: mapSnapshot<SubscriptionPlan>(subscriptionPlansSnap),
            courses: mapSnapshot<Course>(coursesSnap),
            quizzes: mapSnapshot<LmsQuiz>(quizzesSnap),
            learningPrograms: mapSnapshot<LearningProgram>(learningProgramsSnap),
            aiTools: mapSnapshot<AiTool>(aiToolsSnap),
            mediaFiles: mapSnapshot<MediaFile>(mediaFilesSnap),
            collabSpaces: mapSnapshot<CollabSpace>(collabSpacesSnap),
            collabTasks: mapSnapshot<CollabTask>(collabTasksSnap),
            subscriptionLogs: mapSnapshot<SubscriptionLog>(subscriptionLogsSnap),
            kboAssessments: mapSnapshot<KboAssessment>(kboAssessmentsSnap),
            appraisalTasks: mapSnapshot<AppraisalTask>(appraisalTasksSnap),
            modulePricing: mapSnapshot<ModulePricing>(modulePricingSnap),
            addonPricing: mapSnapshot<AddonPricing>(addonPricingSnap),
            
            targetOverrides: mapSnapshot<TargetOverride>(targetOverridesSnap).filter(o => isSuperadmin || accessibleEmployeeIds.has(o.id.split('_')[0])),
            enrollments: mapSnapshot<any>(enrollmentsSnap)
                .filter(e => isSuperadmin || accessibleEmployeeIds.has(e.employeeId))
                .map(e => enrollmentWithMethods(e)),
            memos: mapSnapshot<Memo>(memosSnap).filter(m => isSuperadmin || m.senderId === currentUser.id || m.recipientId === currentUser.id),
        }));

        hasFetchedRef.current = true;
      } catch (error: any) {
        console.error("Error fetching master data:", error);
      } finally {
        setIsLoading(false);
      }
    }, [isAuthLoading, currentUser, userRole]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addDocAndUpdateState = useCallback(async <T extends { id: string }>(collectionName: string, docData: Omit<T, 'id'>, stateKey: keyof typeof data, silent: boolean = false): Promise<T | null> => {
    if (!db) return null;
    try {
        const docRef = await addDoc(collection(db, collectionName), { ...docData, createdAt: serverTimestamp(), createdBy: currentUser?.id });
        const newDoc = { id: docRef.id, ...docData } as T;
        setData(prev => ({...prev, [stateKey]: [...(prev[stateKey as keyof typeof data] as any[]), newDoc]}));
        if (!silent) toast({ title: "Data Disimpan" });
        return newDoc;
    } catch (e: any) { return null; }
  }, [toast, currentUser]);

  const updateDocAndUpdateState = useCallback(async <T extends { id: string }>(collectionName: string, docId: string, docData: Partial<T>, stateKey: keyof typeof data, silent: boolean = false) => {
    if (!db) return;
    try {
        const docRef = doc(db, collectionName, docId);
        await setDoc(docRef, { ...docData, updatedAt: serverTimestamp() }, { merge: true });
        setData(prev => {
            const list = prev[stateKey as keyof typeof data] as any[];
            const idx = list.findIndex(i => i.id === docId);
            if (idx > -1) {
                const newList = [...list];
                newList[idx] = { ...newList[idx], ...docData };
                return { ...prev, [stateKey]: newList };
            } else {
                return { ...prev, [stateKey]: [...list, { id: docId, ...docData }] };
            }
        });
        if (!silent) toast({ title: "Data Diperbarui" });
    } catch (e: any) { toast({ variant: "destructive", title: "Gagal Update", description: e.message }); }
  }, [toast]);

  const deleteDocsAndUpdateState = useCallback(async (collectionName: string, docIds: string[], stateKey: keyof typeof data) => {
    if (!db) return;
    try {
        const batch = writeBatch(db);
        docIds.forEach(id => batch.delete(doc(db, collectionName, id)));
        await batch.commit();
        setData(prev => ({
            ...prev,
            [stateKey]: (prev[stateKey as keyof typeof data] as any[]).filter((item: any) => !docIds.includes(item.id))
        }));
        toast({ title: "Data Dihapus" });
    } catch (e: any) { toast({ variant: "destructive", title: "Gagal Hapus", description: e.message }); }
  }, [toast]);

  const resetCompanySubscription = useCallback(async (companyId: string) => {
      if (!db || userRole !== 'superadmin') {
          toast({ variant: 'destructive', title: "Akses Ditolak", description: "Hanya Superadmin yang bisa melakukan reset." });
          return;
      }
      
      try {
          const companyRef = doc(db, 'companies', companyId);
          const companySnap = await getDoc(companyRef);
          
          if (!companySnap.exists()) throw new Error("Perusahaan tidak ditemukan.");
          const companyData = companySnap.data();

          const now = new Date();
          const expiry = addDays(now, 14);
          const batch = writeBatch(db);

          // 1. Reset profil utama perusahaan menggunakan stempel pembersihan eksplisit
          batch.update(companyRef, {
              subscriptionPlanId: 'default-trial',
              subscriptionActivationDate: now.toISOString(),
              subscriptionExpiryDate: expiry.toISOString(),
              moduleSubscriptions: deleteField(),
              usedTrials: [],
              customPrice: deleteField(),
              customUserLimit: 5,
              customManagementUserLimit: 2,
              customCompanyLimit: deleteField(),
              status: 'Aktif'
          });
          
          // 2. Catat audit log untuk reset manual ini
          const logRef = doc(collection(db, 'subscriptionLogs'));
          batch.set(logRef, {
              companyId: companyId,
              companyName: companyData.name,
              company: companyData.name,
              planName: 'RESET TO TRIAL (SYSTEM TEST)',
              action: 'TRIAL',
              amount: 0,
              startDate: now.toISOString(),
              endDate: expiry.toISOString(),
              performedBy: `Superadmin (${currentUser?.name || 'System'})`,
              timestamp: serverTimestamp()
          });

          await batch.commit();
          
          // Force refresh state agar UI langsung berubah
          await fetchData(true);
          
          toast({ title: "Reset Berhasil", description: `Seluruh status langganan ${companyData.name} telah dibersihkan.` });
      } catch (e: any) {
          console.error("[RESET_SUBSCRIPTION_ERROR]", e);
          toast({ variant: 'destructive', title: "Gagal Melakukan Reset", description: e.message });
      }
  }, [currentUser, fetchData, toast, userRole]);

  const value = {
    ...data,
    fetchData,
    isLoading,
    addCompany: (d) => addDocAndUpdateState<Company>('companies', d, 'companies'),
    updateCompany: (id, d) => updateDocAndUpdateState<Company>('companies', id, d, 'companies'),
    deleteCompany: (id) => deleteDocsAndUpdateState('companies', [id], 'companies'),
    resetCompanySubscription,
    addDepartment: (d) => addDocAndUpdateState<Department>('departments', d, 'departments'),
    updateDepartment: (id, d) => updateDocAndUpdateState<Department>('departments', id, d, 'departments'),
    deleteDepartments: (ids) => deleteDocsAndUpdateState('departments', ids, 'departments'),
    addPosition: (d) => addDocAndUpdateState<Position>('positions', d, 'positions'),
    updatePosition: (id, d) => updateDocAndUpdateState<Position>('positions', id, d, 'positions'),
    deletePositions: (ids) => deleteDocsAndUpdateState('positions', ids, 'positions'),
    updateEmployee: (id, d) => updateDocAndUpdateState<Employee>('employees', id, d, 'employees'),
    deleteEmployees: (ids) => deleteDocsAndUpdateState('employees', ids, 'employees'),
    updateCompanyAdmin: (id, d) => updateDocAndUpdateState<CompanyAdmin>('companyAdmins', id, d, 'companyAdmins'),
    deleteCompanyAdmins: (ids) => deleteDocsAndUpdateState('companyAdmins', ids, 'companyAdmins'),
    deleteSuperadmins: (ids) => deleteDocsAndUpdateState('superadmins', ids, 'superadmins'),
    addCompanyObjective: (d) => addDocAndUpdateState<CompanyObjective>('companyObjectives', d, 'companyObjectives'),
    updateCompanyObjective: (id, d) => updateDocAndUpdateState<CompanyObjective>('companyObjectives', id, d, 'companyObjectives'),
    deleteCompanyObjectives: (ids) => deleteDocsAndUpdateState('companyObjectives', ids, 'companyObjectives'),
    addKpiCategory: (d) => addDocAndUpdateState<KpiCategory>('kpiCategories', d, 'kpiCategories'),
    updateKpiCategory: (id, d) => updateDocAndUpdateState<KpiCategory>('kpiCategories', id, d, 'kpiCategories'),
    deleteKpiCategories: (ids) => deleteDocsAndUpdateState('kpiCategories', ids, 'kpiCategories'),
    addKboCategory: (d) => addDocAndUpdateState<KboCategory>('kboCategories', d, 'kboCategories'),
    updateKboCategory: (id, d) => updateDocAndUpdateState<KboCategory>('kboCategories', id, d, 'kboCategories'),
    deleteKboCategories: (ids) => deleteDocsAndUpdateState('kboCategories', ids, 'kboCategories'),
    addKboSetup: (d) => addDocAndUpdateState<KboSetup>('kboSetups', d, 'kboSetups'),
    updateKboSetup: (id, d) => updateDocAndUpdateState<KboSetup>('kboSetups', id, d, 'kboSetups'),
    deleteKboSetup: (id) => deleteDocsAndUpdateState('kboSetups', [id], 'kboSetups'),
    addAppraisalSetup: (d) => addDocAndUpdateState<AppraisalSetup>('appraisalSetups', d, 'appraisalSetups'),
    updateAppraisalSetup: (id, d) => updateDocAndUpdateState<AppraisalSetup>('appraisalSetups', id, d, 'appraisalSetups'),
    deleteAppraisalSetup: (id) => deleteDocsAndUpdateState('appraisalSetups', [id], 'appraisalSetups'),
    generateAppraisalTasks: async () => {},
    addKboAssessment: async (assessment) => {
        const id = `${assessment.setupId}_${assessment.subjectId}_${assessment.raterId}`;
        const ref = doc(db, 'kboAssessments', id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            await updateDoc(ref, { [`assessments.${assessment.kboSetupId}`]: { selections: assessment.selections, totalScore: assessment.totalScore, notes: assessment.notes || "" }, timestamp: serverTimestamp() });
        } else {
            await setDoc(ref, { ...assessment, assessments: { [assessment.kboSetupId]: { selections: assessment.selections, totalScore: assessment.totalScore, notes: assessment.notes || "" } }, timestamp: serverTimestamp() });
        }
    },
    deleteKboAssessment: async (assessmentId, kboSetupId) => {
        const ref = doc(db, 'kboAssessments', assessmentId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const currentAssessments = snap.data().assessments || {};
            delete currentAssessments[kboSetupId];
            if (Object.keys(currentAssessments).length === 0) await deleteDoc(ref);
            else await updateDoc(ref, { assessments: currentAssessments });
        }
    },
    addKpiSetup: (d, silent) => addDocAndUpdateState<KpiSetup>('kpiSetups', d, 'kpiSetups', silent),
    updateKpiSetup: (id, d, silent) => updateDocAndUpdateState<KpiSetup>('kpiSetups', id, d, 'kpiSetups', silent),
    deleteKpiSetup: (id) => deleteDocsAndUpdateState('kpiSetups', [id], 'kpiSetups'),
    addDocumentTemplate: (d) => addDocAndUpdateState<DocumentTemplate>('documentTemplates', d, 'documentTemplates'),
    updateDocumentTemplate: (id, d) => updateDocAndUpdateState<DocumentTemplate>('documentTemplates', id, d, 'documentTemplates'),
    deleteDocumentTemplate: (id) => deleteDocsAndUpdateState('documentTemplates', [id], 'documentTemplates'),
    addOrUpdateKpiData: async (d) => { await setDoc(doc(db, 'kpiData', d.id), { ...d, updatedAt: serverTimestamp() }, { merge: true }); },
    updateKpiData: (id, d) => updateDocAndUpdateState<KpiData>('kpiData', id, d, 'kpiData'),
    deleteKpiData: (ids) => deleteDocsAndUpdateState('kpiData', ids, 'kpiData'),
    addOkr: (d) => addDocAndUpdateState<OKR>('okrs', d, 'okrs'),
    updateOkr: (id, d) => updateDocAndUpdateState<OKR>('okrs', id, d, 'okrs'),
    deleteOkr: (id) => deleteDocsAndUpdateState('okrs', [id], 'okrs'),
    addSubscriptionPlan: (d) => addDocAndUpdateState<SubscriptionPlan>('subscriptionPlans', d, 'subscriptionPlans'),
    updateSubscriptionPlan: (id, d) => updateDocAndUpdateState<SubscriptionPlan>('subscriptionPlans', id, d, 'subscriptionPlans'),
    deleteSubscriptionPlan: (id) => deleteDocsAndUpdateState('subscriptionPlans', [id], 'subscriptionPlans'),
    addCourse: (d) => addDocAndUpdateState<Course>('lmsCourses', d, 'lmsCourses'),
    updateCourse: (id, d) => updateDocAndUpdateState<Course>('lmsCourses', id, d, 'lmsCourses'),
    deleteCourse: (id) => deleteDocsAndUpdateState('lmsCourses', [id], 'lmsCourses'),
    addQuiz: (d) => addDocAndUpdateState<LmsQuiz>('lmsQuizzes', d, 'lmsQuizzes'),
    updateQuiz: (id, d) => updateDocAndUpdateState<LmsQuiz>('lmsQuizzes', id, d, 'lmsQuizzes'),
    deleteQuiz: (id) => deleteDocsAndUpdateState('lmsQuizzes', [id], 'lmsQuizzes'),
    addLearningProgram: (d) => addDocAndUpdateState<LearningProgram>('learningPrograms', d, 'learningPrograms'),
    updateLearningProgram: (id, d) => updateDocAndUpdateState<LearningProgram>('learningPrograms', id, d, 'learningPrograms'),
    enrollToCourse: async (courseId, employeeId) => {
        const id = `${employeeId}_${courseId}`;
        const ref = doc(db, 'lmsEnrollments', id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            const newEnrollment = { id, courseId, employeeId, status: 'in-progress', progress: 0, topicStatus: {}, startedAt: new Date() };
            await setDoc(ref, newEnrollment);
            return enrollmentWithMethods(newEnrollment as any);
        }
        return enrollmentWithMethods(snap.data() as any);
    },
    updateEnrollment: async (id, d) => { await updateDoc(doc(db, 'lmsEnrollments', id), { ...d, updatedAt: serverTimestamp() }); },
    resetEnrollment: async (id) => { await deleteDoc(doc(db, 'lmsEnrollments', id)); fetchData(true); },
    addCollabSpace: (d) => addDocAndUpdateState<CollabSpace>('collabSpaces', d, 'collabSpaces'),
    updateCollabSpace: (id, d) => updateDocAndUpdateState<CollabSpace>('collabSpaces', id, d, 'collabSpaces'),
    deleteCollabSpace: (id) => deleteDocsAndUpdateState('collabSpaces', [id], 'collabSpaces'),
    addCollabTask: (d) => addDocAndUpdateState<CollabTask>('collabTasks', d, 'collabTasks'),
    updateCollabTask: (id, d) => updateDocAndUpdateState<CollabTask>('collabTasks', id, d, 'collabTasks'),
    deleteCollabTask: (id) => deleteDocsAndUpdateState('collabTasks', [id], 'collabTasks'),
    addEmailTemplate: (d) => addDocAndUpdateState<EmailTemplate>('emailTemplates', d, 'emailTemplates'),
    updateEmailTemplate: (id, d) => updateDocAndUpdateState<EmailTemplate>('emailTemplates', id, d, 'emailTemplates'),
    deleteEmailTemplate: (id) => deleteDocsAndUpdateState('emailTemplates', [id], 'emailTemplates'),
    addWhatsappTemplate: (d) => addDocAndUpdateState<WhatsappTemplate>('whatsappTemplates', d, 'whatsappTemplates'),
    updateWhatsappTemplate: (id, d) => updateDocAndUpdateState<WhatsappTemplate>('whatsappTemplates', id, d, 'whatsappTemplates'),
    deleteWhatsappTemplate: (id) => deleteDocsAndUpdateState('whatsappTemplates', [id], 'whatsappTemplates'),
    initializeDefaultEmailTemplates: async () => {},
    initializeDefaultWhatsappTemplates: async () => {},
    addAiTool: (d) => addDocAndUpdateState<AiTool>('aiTools', d, 'aiTools'),
    updateAiTool: (id, d) => updateDocAndUpdateState<AiTool>('aiTools', id, d, 'aiTools'),
    deleteAiTool: (id) => deleteDocsAndUpdateState('aiTools', [id], 'aiTools'),
    addMediaFile: (d) => addDocAndUpdateState<MediaFile>('mediaFiles', d, 'mediaFiles'),
    deleteMediaFile: (id) => deleteDocsAndUpdateState('mediaFiles', [id], 'mediaFiles'),
    addCollabSpace: (d) => addDocAndUpdateState<CollabSpace>('collabSpaces', d, 'collabSpaces'),
    updateCollabSpace: (id, d) => updateDocAndUpdateState<CollabSpace>('collabSpaces', id, d, 'collabSpaces'),
    deleteCollabSpace: (id) => deleteDocsAndUpdateState('collabSpaces', [id], 'collabSpaces'),
    addCollabTask: (d) => addDocAndUpdateState<CollabTask>('collabTasks', d, 'collabTasks'),
    updateCollabTask: (id, d) => updateDocAndUpdateState<CollabTask>('collabTasks', id, d, 'collabTasks'),
    deleteCollabTask: (id) => deleteDocsAndUpdateState('collabTasks', [id], 'collabTasks'),
    addMemo: (d) => addDocAndUpdateState<any>('memos', d, 'memos'),
    addSubscriptionLog: (d) => addDocAndUpdateState<SubscriptionLog>('subscriptionLogs', d, 'subscriptionLogs', true),
    updateModulePricing: (id, d) => updateDocAndUpdateState<ModulePricing>('modulePricing', id, d, 'modulePricing'),
    updateAddonPricing: (id, d) => updateDocAndUpdateState<AddonPricing>('addonPricing', id, d, 'addonPricing'),
  };

  return (
    <MasterDataContext.Provider value={value as any}>
      {children}
    </MasterDataContext.Provider>
  );
}
