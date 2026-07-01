
// src/contexts/master-data-context.tsx
"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase/client';
import type { Company, Department, Position, Employee, CompanyAdmin, KpiCategory, KboCategory, KboSetup, AppraisalSetup, KpiSetup, KpiData, PerformanceStatus, TargetOverride, KboAssessment, AppraisalTask, SubscriptionPlan, LmsQuiz, Course, Enrollment, DocumentTemplate, OKR, NotificationTemplate, LearningProgram, CompanyObjective, AiTool, MediaFile, CollabSpace, CollabTask, CollabMessage, EmailTemplate, WhatsappTemplate, CommunicationCategory, SubscriptionLog, OkrStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './auth-context';
import { collection, getDocs, DocumentData as FsDocumentData, query, where, addDoc, doc, updateDoc, writeBatch, getDoc, runTransaction, documentId, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { DEFAULT_KPI_CATEGORIES, DEFAULT_KBO_CATEGORIES } from '@/lib/default-data';
import { findKpiSetup } from '@/lib/kpi-utils';
import { addDays, format, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { enrollmentWithMethods } from '@/types';


interface MasterDataContextType {
  companies: Company[];
  departments: Department[];
  positions: Position[];
  employees: Employee[];
  companyAdmins: CompanyAdmin[];
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
  updateEnrollmentInContext: (enrollmentId: string, updateData: Partial<Enrollment>) => void;
  addCompany: (company: Omit<Company, 'id'>) => Promise<Company | null>;
  updateCompany: (id: string, data: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
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
  addEmailTemplate: (template: Omit<EmailTemplate, 'id'>) => Promise<EmailTemplate | null>;
  updateEmailTemplate: (id: string, data: Partial<EmailTemplate>) => Promise<void>;
  deleteEmailTemplate: (id: string) => Promise<void>;
  initializeDefaultEmailTemplates: () => Promise<void>;
  addWhatsappTemplate: (template: Omit<WhatsappTemplate, 'id'>) => Promise<WhatsappTemplate | null>;
  updateWhatsappTemplate: (id: string, data: Partial<WhatsappTemplate>) => Promise<void>;
  deleteWhatsappTemplate: (id: string) => Promise<void>;
  initializeDefaultWhatsappTemplates: () => Promise<void>;
  addNotificationTemplate: (template: Omit<NotificationTemplate, 'id'>) => Promise<NotificationTemplate | null>;
  updateNotificationTemplate: (id: string, data: Partial<NotificationTemplate>) => Promise<void>;
  deleteNotificationTemplate: (id: string) => Promise<void>;
  addOrUpdateKpiData: (data: Partial<KpiData> & { id: string }) => Promise<void>;
  updateKpiData: (id: string, data: Partial<KpiData>) => Promise<void>;
  deleteKpiData: (ids: string[]) => Promise<void>;
  addOkr: (okr: Omit<OKR, 'id'>) => Promise<OKR | null>;
  updateOkr: (id: string, data: Partial<OKR>) => Promise<void>;
  deleteOkr: (id: string) => Promise<void>;
  updateOkrStatus: (id: string, status: OKR['status'], logMessage: string) => Promise<void>;
  addOrUpdateTargetOverride: (overrideDoc: TargetOverride) => Promise<void>;
  addSubscriptionPlan: (plan: Omit<SubscriptionPlan, 'id'>) => Promise<SubscriptionPlan | null>;
  updateSubscriptionPlan: (id: string, data: Partial<SubscriptionPlan>) => Promise<void>;
  deleteSubscriptionPlan: (id: string) => Promise<void>;
  addCourse: (course: Omit<Course, 'id'>) => Promise<Course | null>;
  updateCourse: (id: string, data: Partial<Course>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  duplicateCourseToGlobal: (course: Course) => Promise<void>;
  addQuiz: (quiz: Omit<LmsQuiz, 'id'>) => Promise<LmsQuiz | null>;
  updateQuiz: (id: string, data: Partial<LmsQuiz>) => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;
  addLearningProgram: (program: Omit<LearningProgram, 'id'>) => Promise<LearningProgram | null>;
  updateLearningProgram: (id: string, data: Partial<LearningProgram>) => Promise<void>;
  enrollToCourse: (courseId: string, employeeId: string) => Promise<Enrollment | null>;
  updateEnrollment: (enrollmentId: string, data: Partial<Enrollment>) => Promise<void>;
  resetEnrollment: (enrollmentId: string) => Promise<void>;
  addAiTool: (tool: Omit<AiTool, 'id'>) => Promise<AiTool | null>;
  updateAiTool: (id: string, data: Partial<AiTool>) => Promise<void>;
  deleteAiTool: (id: string) => Promise<void>;
  addMediaFile: (file: Omit<MediaFile, 'id'>) => Promise<MediaFile | null>;
  deleteMediaFile: (id: string) => Promise<void>;
  addCollabSpace: (space: Omit<CollabSpace, 'id'>) => Promise<CollabSpace | null>;
  updateCollabSpace: (id: string, data: Partial<CollabSpace>) => Promise<void>;
  deleteCollabSpace: (id: string) => Promise<void>;
  addCollabTask: (task: Omit<CollabTask, 'id'>) => Promise<CollabTask | null>;
  updateCollabTask: (id: string, data: Partial<CollabTask>) => Promise<void>;
  deleteCollabTask: (id: string) => Promise<void>;
  bulkUpdateCollabTasks: (taskIds: string[], data: Partial<CollabTask>) => Promise<void>;
  fetchData: (isSilent?: boolean) => Promise<void>;
  isLoading: boolean;
}

const MasterDataContext = createContext<MasterDataContextType | null>(null);

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (!context) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
}

const mapSnapshot = <T extends FsDocumentData>(snapshot: any): T[] => {
    return snapshot.docs.map((d: any) => ({ ...d.data(), id: d.id })) as T[];
}

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const { currentUser, userRole, isLoading: isAuthLoading } = useAuth();
  const [data, setData] = useState<{
    companies: Company[];
    departments: Department[];
    positions: Position[];
    employees: Employee[];
    companyAdmins: CompanyAdmin[];
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
  }>({
    companies: [], departments: [], positions: [], employees: [], companyAdmins: [], companyObjectives: [],
    kpiCategories: [], kboCategories: [], kboSetups: [], kpiSetups: [], appraisalSetups: [], documentTemplates: [], emailTemplates: [], whatsappTemplates: [], notificationTemplates: [], kpiData: [], okrs: [], targetOverrides: [], kboAssessments: [], appraisalTasks: [], subscriptionPlans: [], courses: [], quizzes: [], learningPrograms: [], enrollments: [], aiTools: [], mediaFiles: [], collabSpaces: [], collabTasks: [], collabMessages: [], subscriptionLogs: [],
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
        if (userRole === 'superadmin') {
            companyNamesToQuery = allCompanies.map(c => c.name);
        } else {
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

        const collectionsWithCompany = ['departments', 'positions', 'employees', 'companyAdmins', 'companyObjectives', 'kpiCategories', 'kboCategories', 'kboSetups', 'kpiSetups', 'appraisalSetups', 'documentTemplates', 'kpiData', 'okrs', 'lmsCourses', 'lmsQuizzes', 'learningPrograms', 'mediaFiles', 'emailTemplates', 'whatsappTemplates', 'collabSpaces', 'collabTasks', 'subscriptionLogs'];
        
        const snaps = await Promise.all(collectionsWithCompany.map(coll => 
            getDocs(query(collection(db, coll), where("company", "in", [...companyNamesToQuery, 'Global'])))
        ));

        const [departmentsSnap, positionsSnap, employeesSnap, companyAdminsSnap, companyObjectivesSnap, kpiCategoriesSnap, kboCategoriesSnap, kboSetupsSnap, kpiSetupsSnap, appraisalSetupsSnap, documentTemplatesSnap, kpiDataSnap, okrsSnap, coursesSnap, quizzesSnap, learningProgramsSnap, mediaFilesSnap, emailTemplatesSnap, whatsappTemplatesSnap, collabSpacesSnap, collabTasksSnap, subscriptionLogsSnap] = snaps;

        setData({
            companies: allCompanies,
            departments: mapSnapshot<Department>(departmentsSnap),
            positions: mapSnapshot<Position>(positionsSnap),
            employees: mapSnapshot<Employee>(employeesSnap),
            companyAdmins: mapSnapshot<CompanyAdmin>(companyAdminsSnap),
            companyObjectives: mapSnapshot<CompanyObjective>(companyObjectivesSnap),
            kpiCategories: mapSnapshot<KpiCategory>(kpiCategoriesSnap),
            kboCategories: mapSnapshot<KboCategory>(kboCategoriesSnap),
            kboSetups: mapSnapshot<KboSetup>(kboSetupsSnap),
            kpiSetups: mapSnapshot<KpiSetup>(kpiSetupsSnap),
            appraisalSetups: mapSnapshot<AppraisalSetup>(appraisalSetupsSnap),
            documentTemplates: mapSnapshot<DocumentTemplate>(documentTemplatesSnap),
            emailTemplates: mapSnapshot<EmailTemplate>(emailTemplatesSnap),
            whatsappTemplates: mapSnapshot<WhatsappTemplate>(whatsappTemplatesSnap),
            notificationTemplates: [],
            kpiData: mapSnapshot<KpiData>(kpiDataSnap),
            okrs: mapSnapshot<OKR>(okrsSnap),
            targetOverrides: [],
            kboAssessments: [],
            appraisalTasks: [],
            subscriptionPlans: [],
            courses: mapSnapshot<Course>(coursesSnap),
            quizzes: mapSnapshot<LmsQuiz>(quizzesSnap),
            learningPrograms: mapSnapshot<LearningProgram>(learningProgramsSnap),
            enrollments: [],
            aiTools: [],
            mediaFiles: mapSnapshot<MediaFile>(mediaFilesSnap),
            collabSpaces: mapSnapshot<CollabSpace>(collabSpacesSnap),
            collabTasks: mapSnapshot<CollabTask>(collabTasksSnap),
            collabMessages: [],
            subscriptionLogs: mapSnapshot<SubscriptionLog>(subscriptionLogsSnap),
        });

        hasFetchedRef.current = true;
      } catch (error: any) {
        console.error("Error fetching master data:", error);
      } finally {
        setIsLoading(false);
      }
    }, [isAuthLoading, currentUser, userRole, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addDocAndUpdateState = useCallback(async <T extends { id: string }>(collectionName: string, docData: Omit<T, 'id'>, stateKey: keyof typeof data, silent: boolean = false): Promise<T | null> => {
    if (!db) return null;
    try {
        const docRef = await addDoc(collection(db, collectionName), { ...docData, createdAt: serverTimestamp(), createdBy: currentUser?.id });
        const newDoc = { id: docRef.id, ...docData } as T;
        setData(prev => ({...prev, [stateKey]: [...prev[stateKey as keyof typeof data], newDoc]}));
        if (!silent) toast({ title: "Data Disimpan" });
        return newDoc;
    } catch (e: any) {
        return null;
    }
  }, [toast, currentUser]);

  const updateDocAndUpdateState = useCallback(async <T extends { id: string }>(collectionName: string, docId: string, docData: Partial<T>, stateKey: keyof typeof data, silent: boolean = false) => {
    if (!db) return;
    try {
        await updateDoc(doc(db, collectionName, docId), { ...docData, updatedAt: serverTimestamp() });
        setData(prev => {
            const list = prev[stateKey as keyof typeof data] as any[];
            const idx = list.findIndex(i => i.id === docId);
            if (idx > -1) {
                const newList = [...list];
                newList[idx] = { ...newList[idx], ...docData };
                return { ...prev, [stateKey]: newList };
            }
            return prev;
        });
        if (!silent) toast({ title: "Data Diperbarui" });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Gagal Update", description: e.message });
    }
  }, [toast]);

  const deleteDocsAndUpdateState = useCallback(async (collectionName: string, docIds: string[], stateKey: keyof typeof data) => {
    if (!db) return;
    try {
        const batch = writeBatch(db);
        docIds.forEach(id => batch.delete(doc(db, collectionName, id)));
        await batch.commit();
        setData(prev => ({
            ...prev,
            [stateKey]: prev[stateKey as keyof typeof data].filter((item: any) => !docIds.includes(item.id))
        }));
        toast({ title: "Data Dihapus" });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Gagal Hapus", description: e.message });
    }
  }, [toast]);

  const value: MasterDataContextType = {
    ...data,
    updateEnrollmentInContext: () => {},
    fetchData,
    isLoading,
    addCompany: (d) => addDocAndUpdateState<Company>('companies', d, 'companies'),
    updateCompany: (id, d) => updateDocAndUpdateState<Company>('companies', id, d, 'companies'),
    deleteCompany: (id) => deleteDocsAndUpdateState('companies', [id], 'companies'),

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
    addKboAssessment: async () => {},
    deleteKboAssessment: async () => {},
    addKpiSetup: (d) => addDocAndUpdateState<KpiSetup>('kpiSetups', d, 'kpiSetups'),
    updateKpiSetup: (id, d) => updateDocAndUpdateState<KpiSetup>('kpiSetups', id, d, 'kpiSetups'),
    deleteKpiSetup: (id) => deleteDocsAndUpdateState('kpiSetups', [id], 'kpiSetups'),
    
    addDocumentTemplate: (d) => addDocAndUpdateState<DocumentTemplate>('documentTemplates', d, 'documentTemplates'),
    updateDocumentTemplate: (id, d) => updateDocAndUpdateState<DocumentTemplate>('documentTemplates', id, d, 'documentTemplates'),
    deleteDocumentTemplate: (id) => deleteDocsAndUpdateState('documentTemplates', [id], 'documentTemplates'),
    
    addEmailTemplate: (d) => addDocAndUpdateState<EmailTemplate>('emailTemplates', d, 'emailTemplates'),
    updateEmailTemplate: (id, d) => updateDocAndUpdateState<EmailTemplate>('emailTemplates', id, d, 'emailTemplates'),
    deleteEmailTemplate: (id) => deleteDocsAndUpdateState('emailTemplates', [id], 'emailTemplates'),
    initializeDefaultEmailTemplates: async () => {},

    addWhatsappTemplate: (d) => addDocAndUpdateState<WhatsappTemplate>('whatsappTemplates', d, 'whatsappTemplates'),
    updateWhatsappTemplate: (id, d) => updateDocAndUpdateState<WhatsappTemplate>('whatsappTemplates', id, d, 'whatsappTemplates'),
    deleteWhatsappTemplate: (id) => deleteDocsAndUpdateState('whatsappTemplates', [id], 'whatsappTemplates'),
    initializeDefaultWhatsappTemplates: async () => {},

    addNotificationTemplate: (d) => addDocAndUpdateState<NotificationTemplate>('notificationTemplates', d, 'notificationTemplates'),
    updateNotificationTemplate: (id, d) => updateDocAndUpdateState<NotificationTemplate>('notificationTemplates', id, d, 'notificationTemplates'),
    deleteNotificationTemplate: (id) => deleteDocsAndUpdateState('notificationTemplates', [id], 'notificationTemplates'),

    addOrUpdateKpiData: async () => {},
    updateKpiData: (id, d) => updateDocAndUpdateState<KpiData>('kpiData', id, d, 'kpiData'),
    deleteKpiData: (ids) => deleteDocsAndUpdateState('kpiData', ids, 'kpiData'),
    
    addOkr: (d) => addDocAndUpdateState<OKR>('okrs', d, 'okrs'),
    updateOkr: (id, d) => updateDocAndUpdateState<OKR>('okrs', id, d, 'okrs'),
    updateOkrStatus: async () => {},
    deleteOkr: (id) => deleteDocsAndUpdateState('okrs', [id], 'okrs'),
    
    addSubscriptionPlan: (d) => addDocAndUpdateState<SubscriptionPlan>('subscriptionPlans', d, 'subscriptionPlans'),
    updateSubscriptionPlan: (id, d) => updateDocAndUpdateState<SubscriptionPlan>('subscriptionPlans', id, d, 'subscriptionPlans'),
    deleteSubscriptionPlan: (id) => deleteDocsAndUpdateState('subscriptionPlans', [id], 'subscriptionPlans'),
    
    addCourse: (d) => addDocAndUpdateState<Course>('lmsCourses', d, 'courses'),
    updateCourse: (id, d) => updateDocAndUpdateState<Course>('lmsCourses', id, d, 'courses'),
    deleteCourse: (id) => deleteDocsAndUpdateState('lmsCourses', [id], 'courses'),
    duplicateCourseToGlobal: async () => {},
    addQuiz: (d) => addDocAndUpdateState<LmsQuiz>('lmsQuizzes', d, 'quizzes'),
    updateQuiz: (id, d) => updateDocAndUpdateState<LmsQuiz>('lmsQuizzes', id, d, 'quizzes'),
    deleteQuiz: (id) => deleteDocsAndUpdateState('lmsQuizzes', [id], 'quizzes'),
    addLearningProgram: (d) => addDocAndUpdateState<LearningProgram>('learningPrograms', d, 'learningPrograms'),
    updateLearningProgram: (id, d) => updateDocAndUpdateState<LearningProgram>('learningPrograms', id, d, 'learningPrograms'),
    enrollToCourse: async () => null,
    updateEnrollment: async () => {},
    resetEnrollment: async () => {},
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
    bulkUpdateCollabTasks: async () => {},
  };

  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
}
