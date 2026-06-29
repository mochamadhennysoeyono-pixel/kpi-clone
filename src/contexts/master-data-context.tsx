// src/contexts/master-data-context.tsx
"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase/client';
import type { Company, Department, Position, Employee, KpiCategory, KboCategory, KboSetup, AppraisalSetup, KpiSetup, KpiData, PerformanceStatus, TargetOverride, KboAssessment, AppraisalTask, SubscriptionPlan, LmsQuiz, Course, Enrollment, DocumentTemplate, OKR, NotificationTemplate, LearningProgram, CompanyObjective, AiTool, MediaFile, CollabSpace, CollabTask, CollabMessage, EmailTemplate, WhatsappTemplate, CommunicationCategory, SubscriptionLog, OkrStatus } from '@/types';
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

const normalizeName = (name?: string | null): string => {
  if (!name) return '';
  return name.replace(/\./g, '').trim().toLowerCase();
};

function sanitizeUndefined(obj: any): any {
    if (obj === null || obj === undefined) {
        return undefined;
    }

    if (Array.isArray(obj)) {
        return obj
            .map(v => sanitizeUndefined(v))
            .filter(v => v !== undefined);
    }

    if (typeof obj === 'object' && !(obj instanceof Date) && typeof obj.toDate !== 'function') {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = obj[key];
                if (value !== undefined) {
                    const sanitizedValue = sanitizeUndefined(value);
                    if (sanitizedValue !== undefined) {
                        newObj[key] = sanitizedValue;
                    }
                }
            }
        }
        return newObj;
    }

    return obj;
}


export function MasterDataProvider({ children }: { children: ReactNode }) {
  const { currentUser, userRole, isLoading: isAuthLoading } = useAuth();
  const [data, setData] = useState<{
    companies: Company[];
    departments: Department[];
    positions: Position[];
    employees: Employee[];
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
    apiConfig: null;
  }>({
    companies: [], departments: [], positions: [], employees: [], companyObjectives: [],
    kpiCategories: [], kboCategories: [], kboSetups: [], kpiSetups: [], appraisalSetups: [], documentTemplates: [], emailTemplates: [], whatsappTemplates: [], notificationTemplates: [], kpiData: [], okrs: [], targetOverrides: [], kboAssessments: [], appraisalTasks: [], subscriptionPlans: [], courses: [], quizzes: [], learningPrograms: [], enrollments: [], aiTools: [], mediaFiles: [], collabSpaces: [], collabTasks: [], collabMessages: [], subscriptionLogs: [], apiConfig: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const { toast } = useToast();

  const fetchData = useCallback(async (isSilent = false) => {
      // Tunggu sampai AuthContext selesai menentukan status login (Loading Firebase Auth)
      if (isAuthLoading) {
        return;
      }
      
      // Jika Firebase Auth sudah selesai, tapi tidak ada user, baru matikan loading
      if (!currentUser || !userRole || !db) {
        setIsLoading(false);
        setData({
            companies: [], departments: [], positions: [], employees: [], companyObjectives: [],
            kpiCategories: [], kboCategories: [], kboSetups: [], kpiSetups: [], appraisalSetups: [], documentTemplates: [], emailTemplates: [], whatsappTemplates: [], notificationTemplates: [], kpiData: [], okrs: [], targetOverrides: [], kboAssessments: [], appraisalTasks: [], subscriptionPlans: [], courses: [], quizzes: [], learningPrograms: [], enrollments: [], aiTools: [], mediaFiles: [], collabSpaces: [], collabTasks: [], collabMessages: [], subscriptionLogs: [], apiConfig: null,
        });
        return;
      }

      // Jika ini fetch pertama (bukan silent update), nyalakan loading
      if (!hasFetchedRef.current && !isSilent) {
        setIsLoading(true);
      }

      try {
        const allCompaniesSnap = await getDocs(collection(db, 'companies'));
        const allCompanies = mapSnapshot<Company>(allCompaniesSnap).map(c => {
            if (c.subscriptionExpiryDate && c.status === 'Aktif') {
                const expiry = new Date(c.subscriptionExpiryDate);
                expiry.setHours(23, 59, 59, 999);
                if (expiry < new Date()) {
                    return { ...c, status: 'Tidak Aktif' };
                }
            }
            return c;
        });
        let companyNamesToQuery: string[] = [];
        let normalizedCompanyNamesToQuery: string[] = [];

        const isHoldingAdmin = userRole === 'manajemen' && allCompanies.some(c => c.name === currentUser.company && c.isHolding);

        if (userRole === 'superadmin') {
            companyNamesToQuery = allCompanies.map(c => c.name);
        } else if (isHoldingAdmin) {
            const getDescendantNames = (parentId: string): string[] => {
                const children = allCompanies.filter(c => c.parentId === parentId);
                return [
                    ...children.map(c => c.name),
                    ...children.flatMap(c => getDescendantNames(c.id)),
                ];
            };
            const userCompany = allCompanies.find(c => c.name === currentUser.company);
            companyNamesToQuery = userCompany ? [userCompany.name, ...getDescendantNames(userCompany.id)] : [];
        } else if (currentUser.company) {
            companyNamesToQuery = [currentUser.company];
        }

        normalizedCompanyNamesToQuery = companyNamesToQuery.map(normalizeName);
        
        let departmentsSnap, positionsSnap, employeesSnap, companyObjectivesSnap,
            kpiCategoriesSnap, kboCategoriesSnap, kboSetupsSnap, kpiSetupsSnap, appraisalSetupsSnap, kpiDataSnap, targetOverridesSnap, kboAssessmentsSnap, appraisalTasksSnap, subscriptionPlansSnap, coursesSnap, quizzesSnap, enrollmentsSnap, documentTemplatesSnap, emailTemplatesSnap, whatsappTemplatesSnap, okrsSnap, notificationTemplatesSnap, learningProgramsSnap, aiToolsSnap, mediaFilesSnap, collabSpacesSnap, collabTasksSnap, collabMessagesSnap, subscriptionLogsSnap;

        if (userRole === 'superadmin') {
            [departmentsSnap, positionsSnap, employeesSnap, companyObjectivesSnap, kpiCategoriesSnap, kboCategoriesSnap, kboSetupsSnap, kpiSetupsSnap, appraisalSetupsSnap, documentTemplatesSnap, emailTemplatesSnap, whatsappTemplatesSnap, kpiDataSnap, okrsSnap, targetOverridesSnap, kboAssessmentsSnap, appraisalTasksSnap, subscriptionPlansSnap, coursesSnap, quizzesSnap, enrollmentsSnap, notificationTemplatesSnap, learningProgramsSnap, aiToolsSnap, mediaFilesSnap, collabSpacesSnap, collabTasksSnap, collabMessagesSnap, subscriptionLogsSnap] = await Promise.all([
                getDocs(collection(db, 'departments')),
                getDocs(collection(db, 'positions')),
                getDocs(collection(db, 'employees')),
                getDocs(collection(db, 'companyObjectives')),
                getDocs(collection(db, 'kpiCategories')),
                getDocs(collection(db, 'kboCategories')),
                getDocs(collection(db, 'kboSetups')),
                getDocs(collection(db, 'kpiSetups')),
                getDocs(collection(db, 'appraisalSetups')),
                getDocs(collection(db, 'documentTemplates')),
                getDocs(collection(db, 'emailTemplates')),
                getDocs(collection(db, 'whatsappTemplates')),
                getDocs(collection(db, 'kpiData')),
                getDocs(collection(db, 'okrs')),
                getDocs(collection(db, 'targetOverrides')),
                getDocs(collection(db, 'kboAssessments')),
                getDocs(collection(db, 'appraisalTasks')),
                getDocs(collection(db, 'subscriptionPlans')),
                getDocs(collection(db, 'lmsCourses')),
                getDocs(collection(db, 'lmsQuizzes')),
                getDocs(collection(db, 'lmsEnrollments')),
                getDocs(collection(db, 'notificationTemplates')),
                getDocs(collection(db, 'learningPrograms')),
                getDocs(collection(db, 'aiTools')),
                getDocs(collection(db, 'mediaFiles')),
                getDocs(collection(db, 'collabSpaces')),
                getDocs(collection(db, 'collabTasks')),
                getDocs(collection(db, 'collabMessages')),
                getDocs(collection(db, 'subscriptionLogs')),
            ]);
        } else if (companyNamesToQuery.length > 0) {
            const collectionsWithCompany = ['departments', 'positions', 'employees', 'companyObjectives', 'kpiCategories', 'kboCategories', 'kboSetups', 'kpiSetups', 'appraisalSetups', 'documentTemplates', 'kpiData', 'okrs', 'lmsCourses', 'lmsQuizzes', 'learningPrograms', 'mediaFiles', 'emailTemplates', 'whatsappTemplates'];
            
            const queries = collectionsWithCompany.map(coll => 
                getDocs(query(collection(db, coll), where("company", "in", [...companyNamesToQuery, 'Global'])))
            );
            
            const kboAssessmentsQuery = getDocs(query(collection(db, 'kboAssessments'), where("companyLower", "in", normalizedCompanyNamesToQuery)));
            const collabSpacesQuery = getDocs(query(collection(db, 'collabSpaces'), where("company", "in", companyNamesToQuery)));
            const collabTasksQuery = getDocs(query(collection(db, 'collabTasks'), where("company", "in", companyNamesToQuery)));
            
            const companyIds = allCompanies.filter(c => companyNamesToQuery.includes(c.name)).map(c => c.id);
            const logsQuery = companyIds.length > 0 ? getDocs(query(collection(db, 'subscriptionLogs'), where("companyId", "in", companyIds))) : Promise.resolve({ docs: [], empty: true });

            const allManagedEmployeesQuery = query(collection(db, 'employees'), where('company', 'in', companyNamesToQuery));
            const allManagedEmployeesSnap = await getDocs(allManagedEmployeesQuery);
            const employeeIdsForEnrollmentQuery = allManagedEmployeesSnap.docs.map(doc => doc.id);
            
            let enrollmentDocs: FsDocumentData[] = [];
            if (employeeIdsForEnrollmentQuery.length > 0) {
                const chunks = [];
                for (let i = 0; i < employeeIdsForEnrollmentQuery.length; i += 30) {
                    chunks.push(employeeIdsForEnrollmentQuery.slice(i, i + 30));
                }
                const enrollmentPromises = chunks.map(chunk => 
                    getDocs(query(collection(db, 'lmsEnrollments'), where("employeeId", "in", chunk)))
                );
                const enrollmentResults = await Promise.all(enrollmentPromises);
                enrollmentDocs = enrollmentResults.flatMap(res => res.docs);
            }
             enrollmentsSnap = { docs: enrollmentDocs, empty: enrollmentDocs.length === 0, size: enrollmentDocs.length, forEach: enrollmentDocs.forEach.bind(enrollmentDocs) };
            
            const [
                departmentsRes, positionsRes, employeesRes, companyObjectivesRes, kpiCategoriesRes, kboCategoriesRes,
                kboSetupsRes, kpiSetupsRes, appraisalSetupsRes, documentTemplatesRes, kpiDataRes, okrsRes, coursesRes, quizzesRes, learningProgramsRes,
                mediaFilesRes, emailTemplatesRes, whatsappTemplatesRes, kboAssessmentsRes, collabSpacesRes, collabTasksRes, subscriptionLogsRes
            ] = await Promise.all([...queries, kboAssessmentsQuery, collabSpacesQuery, collabTasksQuery, logsQuery]);

            departmentsSnap = departmentsRes;
            positionsSnap = positionsRes;
            employeesSnap = employeesRes;
            companyObjectivesSnap = companyObjectivesRes;
            kpiCategoriesSnap = kpiCategoriesRes;
            kboCategoriesSnap = kboCategoriesRes;
            kboSetupsSnap = kboSetupsRes;
            kpiSetupsSnap = kpiSetupsRes;
            appraisalSetupsSnap = appraisalSetupsRes;
            documentTemplatesSnap = documentTemplatesRes;
            kpiDataSnap = kpiDataRes;
            okrsSnap = okrsRes;
            coursesSnap = coursesRes;
            quizzesSnap = quizzesRes;
            learningProgramsSnap = learningProgramsRes;
            mediaFilesSnap = mediaFilesRes;
            emailTemplatesSnap = emailTemplatesRes;
            whatsappTemplatesSnap = whatsappTemplatesRes;
            kboAssessmentsSnap = kboAssessmentsRes;
            collabSpacesSnap = collabSpacesRes;
            collabTasksSnap = collabTasksRes;
            subscriptionLogsSnap = subscriptionLogsRes;
            
            const spaceIds = collabSpacesRes.docs.map(d => d.id);
            if (spaceIds.length > 0) {
                const chunks = [];
                for (let i = 0; i < spaceIds.length; i += 30) {
                    chunks.push(spaceIds.slice(i, i + 30));
                }
                const msgPromises = chunks.map(chunk => 
                    getDocs(query(collection(db, 'collabMessages'), where("spaceId", "in", chunk)))
                );
                const msgResults = await Promise.all(msgPromises);
                const msgDocs = msgResults.flatMap(res => res.docs);
                collabMessagesSnap = { docs: msgDocs, empty: msgDocs.length === 0, size: msgDocs.length, forEach: msgDocs.forEach.bind(msgDocs) };
            } else {
                collabMessagesSnap = { docs: [], empty: true, size: 0, forEach: () => {} };
            }

            notificationTemplatesSnap = await getDocs(collection(db, 'notificationTemplates'));
            aiToolsSnap = await getDocs(collection(db, 'aiTools'));

            targetOverridesSnap = await getDocs(collection(db, 'targetOverrides'));
            appraisalTasksSnap = await getDocs(collection(db, 'appraisalTasks'));
            subscriptionPlansSnap = await getDocs(collection(db, 'subscriptionPlans'));
        }

        const employees = employeesSnap ? mapSnapshot<Employee>(employeesSnap) : [];
        const kpiSetups = kpiSetupsSnap ? mapSnapshot<KpiSetup>(kpiSetupsSnap) : [];
        const kpiDataListRaw = kpiDataSnap ? mapSnapshot<KpiData>(kpiDataSnap) : [];

        const kpiDataList = kpiDataListRaw.map(kd => {
            const employee = employees.find(e => e.id === kd.employeeId);
            const resolvedSetup = findKpiSetup(kpiSetups, employee, kd.period);
            const minAchievement = resolvedSetup?.minAchievement ?? 70;

            const getStatus = (score: number, minAch: number): PerformanceStatus => {
                const excellentThreshold = minAch * 1.1;
                if (score >= excellentThreshold) return "Melampaui Target";
                if (score >= minAch) return "Mencapai Target";
                return "Perlu Peningkatan";
            };

            return {
                ...kd,
                minAchievement,
                status: getStatus(kd.score, minAchievement),
                level: employee?.level || 'Staff',
                reportsTo: employee?.reportsTo || undefined,
            };
        });
        
        const customKpiCategories = kpiCategoriesSnap ? mapSnapshot<KpiCategory>(kpiCategoriesSnap) : [];
        const customKboCategories = kboCategoriesSnap ? mapSnapshot<KboCategory>(kboCategoriesSnap) : [];
        
        setData({
            companies: allCompanies,
            departments: departmentsSnap ? mapSnapshot<Department>(departmentsSnap) : [],
            positions: positionsSnap ? mapSnapshot<Position>(positionsSnap) : [],
            employees: employees,
            companyObjectives: companyObjectivesSnap ? mapSnapshot<CompanyObjective>(companyObjectivesSnap) : [],
            kpiCategories: customKpiCategories,
            kboCategories: customKboCategories,
            kboSetups: kboSetupsSnap ? mapSnapshot<KboSetup>(kboSetupsSnap) : [],
            kpiSetups: kpiSetups,
            appraisalSetups: appraisalSetupsSnap ? mapSnapshot<AppraisalSetup>(appraisalSetupsSnap) : [],
            documentTemplates: documentTemplatesSnap ? mapSnapshot<DocumentTemplate>(documentTemplatesSnap) : [],
            emailTemplates: emailTemplatesSnap ? mapSnapshot<EmailTemplate>(emailTemplatesSnap) : [],
            whatsappTemplates: whatsappTemplatesSnap ? mapSnapshot<WhatsappTemplate>(whatsappTemplatesSnap) : [],
            notificationTemplates: notificationTemplatesSnap ? mapSnapshot<NotificationTemplate>(notificationTemplatesSnap) : [],
            kpiData: kpiDataList,
            okrs: okrsSnap ? mapSnapshot<OKR>(okrsSnap) : [],
            targetOverrides: targetOverridesSnap ? mapSnapshot<TargetOverride>(targetOverridesSnap) : [],
            kboAssessments: kboAssessmentsSnap ? mapSnapshot<KboAssessment>(kboAssessmentsSnap) : [],
            appraisalTasks: appraisalTasksSnap ? mapSnapshot<AppraisalTask>(appraisalTasksSnap) : [],
            subscriptionPlans: subscriptionPlansSnap ? mapSnapshot<SubscriptionPlan>(subscriptionPlansSnap) : [],
            courses: coursesSnap ? mapSnapshot<Course>(coursesSnap) : [],
            quizzes: quizzesSnap ? mapSnapshot<LmsQuiz>(quizzesSnap) : [],
            learningPrograms: learningProgramsSnap ? mapSnapshot<LearningProgram>(learningProgramsSnap) : [],
            enrollments: enrollmentsSnap ? mapSnapshot<Omit<Enrollment, 'getFinalScore'>>(enrollmentsSnap).map(enrollmentWithMethods) : [],
            aiTools: aiToolsSnap ? mapSnapshot<AiTool>(aiToolsSnap) : [],
            mediaFiles: mediaFilesSnap ? mapSnapshot<MediaFile>(mediaFilesSnap) : [],
            collabSpaces: collabSpacesSnap ? mapSnapshot<CollabSpace>(collabSpacesSnap) : [],
            collabTasks: collabTasksSnap ? mapSnapshot<CollabTask>(collabTasksSnap) : [],
            collabMessages: collabMessagesSnap ? mapSnapshot<CollabMessage>(collabMessagesSnap) : [],
            subscriptionLogs: subscriptionLogsSnap ? mapSnapshot<SubscriptionLog>(subscriptionLogsSnap) : [],
            apiConfig: null,
        });

        hasFetchedRef.current = true;

      } catch (error: any) {
        console.error("Fatal error fetching master data:", error);
        if (error.code !== 'failed-precondition') {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Gagal Mengambil Data",
                description: `Tidak dapat memuat data aplikasi. Error: ${error.message}`,
            });
        }
         setData({
            companies: [], departments: [], positions: [], employees: [], companyObjectives: [],
            kpiCategories: [], kboCategories: [], kboSetups: [], kpiSetups: [], appraisalSetups: [], documentTemplates: [], emailTemplates: [], whatsappTemplates: [], notificationTemplates: [], kpiData: [], okrs: [], targetOverrides: [], kboAssessments: [], appraisalTasks: [], subscriptionPlans: [], courses: [], quizzes: [], learningPrograms: [], enrollments: [], aiTools: [], mediaFiles: [], collabSpaces: [], collabTasks: [], collabMessages: [], subscriptionLogs: [], apiConfig: null,
        });
      } finally {
        setIsLoading(false);
      }
    }, [isAuthLoading, currentUser, userRole, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addOrUpdateKpiData = useCallback(async (kpiEntry: Partial<KpiData> & { id: string }) => {
    if (!db) return;
    const kpiRef = doc(db, 'kpiData', kpiEntry.id);
    try {
        await runTransaction(db, async (transaction) => {
            const kpiSnap = await transaction.get(kpiRef);
            if (kpiSnap.exists()) {
                transaction.update(kpiRef, kpiEntry);
            } else {
                transaction.set(kpiRef, kpiEntry);
            }
        });

        const submissionTemplates = data.notificationTemplates.filter(
            t => t.triggerEventId === 'kpi_submission_event' && t.status === 'Active'
        );

        if (submissionTemplates.length > 0) {
            const subjectEmployee = data.employees.find(e => e.id === kpiEntry.employeeId);
            if (!subjectEmployee) return;

            for (const template of submissionTemplates) {
                let recipients: Employee[] = [];

                if (template.recipientTarget === 'subject') {
                    recipients.push(subjectEmployee);
                } else if (template.recipientTarget === 'supervisor') {
                    if (subjectEmployee.reportsTo) {
                        const supervisor = data.employees.find(e => e.id === subjectEmployee.reportsTo);
                        if (supervisor) recipients.push(supervisor);
                    }
                } else if (template.recipientTarget === 'management') {
                    const managementUsers = data.employees.filter(
                        e => e.company === subjectEmployee.company && e.role === 'manajemen'
                    );
                    recipients.push(...managementUsers);
                }
                
                const uniqueRecipients = [...new Map(recipients.map(item => [item['id'], item])).values()];

                for (const recipient of uniqueRecipients) {
                    const context = {
                        nama_pengguna: recipient.name,
                        nama_subjek: subjectEmployee.name,
                        nama_departemen: subjectEmployee.department,
                        periode: format(parse(kpiEntry.period!, 'yyyy-MM', new Date()), 'LLLL yyyy', { locale: localeId }),
                    };

                    const renderTemplate = (templateStr: string, ctx: Record<string, string>): string => {
                        let rendered = templateStr;
                        for (const [key, value] of Object.entries(ctx)) {
                            rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
                        }
                        return rendered;
                    };
                    
                    const subject = renderTemplate(template.subject, context);
                    const message = renderTemplate(template.message, context);

                    if (template.channel === 'app' || template.channel === 'both') {
                        await addDoc(collection(db, 'notifications'), {
                            recipientId: recipient.id,
                            senderName: 'Sistem KPI',
                            category: 'KPI',
                            message: subject,
                            link: `/reports`,
                            isRead: false,
                            timestamp: serverTimestamp()
                        });
                    }
                    
                    if ((template.channel === 'email' || template.channel === 'both') && recipient.email) {
                        await addDoc(collection(db, 'mail'), {
                            to: [recipient.email],
                            message: { subject, html: message }
                        });
                    }
                }
            }
        }
        
        await fetchData(true);
    } catch (e: any) {
        console.error("Error in addOrUpdateKpiData transaction:", e);
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: e.message });
        throw e;
    }
  }, [toast, data.notificationTemplates, data.employees, fetchData]);

  const addOrUpdateTargetOverride = useCallback(async (overrideDoc: TargetOverride) => {
    if (!db) return;
    const overrideRef = doc(db, 'targetOverrides', overrideDoc.id);
    try {
      await setDoc(overrideRef, overrideDoc, { merge: true });
      setData(prev => {
        const existingIndex = prev.targetOverrides.findIndex(o => o.id === overrideDoc.id);
        if (existingIndex > -1) {
          const newOverrides = [...prev.targetOverrides];
          newOverrides[existingIndex] = { ...newOverrides[existingIndex], ...overrideDoc };
          return { ...prev, targetOverrides: newOverrides };
        } else {
          return { ...prev, targetOverrides: [...prev.targetOverrides, overrideDoc] };
        }
      });
    } catch (e: any) {
      console.error("Error in addOrUpdateTargetOverride:", e);
      toast({ variant: "destructive", title: "Gagal Menyimpan Override", description: e.message });
      throw e;
    }
  }, [toast]);
  

  const updateEnrollmentInContext = useCallback((enrollmentId: string, updateData: Partial<Enrollment>) => {
    setData(prev => {
        const enrollmentIndex = prev.enrollments.findIndex(e => e.id === enrollmentId);
        if (enrollmentIndex === -1) {
            console.warn(`Enrollment with ID ${enrollmentId} not found in context for update.`);
            return prev;
        }
        const updatedEnrollments = [...prev.enrollments];
        const updatedEnrollment = { ...updatedEnrollments[enrollmentIndex], ...updateData };
        updatedEnrollments[enrollmentIndex] = enrollmentWithMethods(updatedEnrollment as Omit<Enrollment, 'getFinalScore'>);
        
        return { ...prev, enrollments: updatedEnrollments };
    });
  }, []);

    const addDocAndUpdateState = useCallback(async <T extends { id: string }>(collectionName: string, docData: Omit<T, 'id'>, stateKey: keyof typeof data, silent: boolean = false): Promise<T | null> => {
        if (!db) return null;
        try {
            // Priority: use createdAt if provided in docData, otherwise use serverTimestamp()
            const docRef = await addDoc(collection(db, collectionName), { 
                createdAt: serverTimestamp(), 
                ...docData, 
                createdBy: currentUser?.id 
            });
            const newDoc = { id: docRef.id, ...docData } as T;
            setData(prev => ({...prev, [stateKey]: [...prev[stateKey as keyof typeof data], newDoc]}));
            if (!silent) {
                toast({ title: "Data Berhasil Disimpan", description: `Data baru telah ditambahkan.` });
            }
            return newDoc;
        } catch (e: any) {
            console.error(`Error adding ${collectionName}:`, e);
            if (!silent) {
                console.error(e);
                toast({ variant: "destructive", title: "Gagal Menyimpan", description: e.message || "Terjadi kesalahan saat menyimpan data ke server." });
            }
            return null;
        }
    }, [toast, currentUser]);
    
    const setDocAndUpdateState = useCallback(async <T extends { id: string }>(collectionName: string, docData: T, stateKey: keyof typeof data, silent: boolean = false): Promise<T | null> => {
        if (!db) return null;
        try {
            await setDoc(doc(db, collectionName, docData.id), docData);
            setData(prev => {
                const existingIndex = prev[stateKey as keyof typeof data].findIndex((item: any) => item.id === docData.id);
                if (existingIndex > -1) {
                    const updatedItems = [...prev[stateKey as keyof typeof data]];
                    updatedItems[existingIndex] = docData;
                    return {...prev, [stateKey]: updatedItems};
                }
                return {...prev, [stateKey]: [...prev[stateKey as keyof typeof data], docData]};
            });
            if (!silent) {
                toast({ title: "Data Berhasil Disimpan", description: `Data telah diperbarui.` });
            }
            return docData;
        } catch (e: any) {
            console.error(`Error setting ${collectionName}:`, e);
            if (!silent) {
                console.error(e);
                toast({ variant: "destructive", title: "Gagal Menyimpan", description: e.message || "Terjadi kesalahan saat menyimpan data." });
            }
            return null;
        }
    }, [toast, data]);

    
    const updateDocAndUpdateState = useCallback(async <T extends { id: string }>(collectionName: string, docId: string, docData: Partial<T>, stateKey: keyof typeof data, silent: boolean = false) => {
      if (!db) return;
      const docRef = doc(db, collectionName, docId);
  
      try {
          const dataToUpdate: { [key: string]: any } = sanitizeUndefined({ ...docData, updatedAt: serverTimestamp() });
          
          if (collectionName === 'companies' && 'subscriptionPlanId' in dataToUpdate) {
              const newPlan = data.subscriptionPlans.find(p => p.id === dataToUpdate.subscriptionPlanId);
              const companySnap = await getDoc(docRef);
              const companyData = companySnap.data() as Company;

              if (newPlan) {
                  const newActivationDate = new Date();
                  dataToUpdate.subscriptionActivationDate = newActivationDate.toISOString();
                  dataToUpdate.subscriptionExpiryDate = addDays(newActivationDate, newPlan.durationDays).toISOString();
                  
                  dataToUpdate.customPrice = null;
                  dataToUpdate.customUserLimit = null;
                  dataToUpdate.customManagementUserLimit = null;
                  dataToUpdate.customCompanyLimit = null;

                  // Create History Log
                  const logRef = collection(db, 'subscriptionLogs');
                  await addDoc(logRef, {
                      companyId: docId,
                      companyName: companyData.name,
                      planId: newPlan.id,
                      planName: newPlan.name,
                      action: 'MANUAL_CHANGE',
                      amount: newPlan.price,
                      startDate: dataToUpdate.subscriptionActivationDate,
                      endDate: dataToUpdate.subscriptionExpiryDate,
                      performedBy: currentUser?.name || 'Superadmin',
                      timestamp: serverTimestamp(),
                  });
              }
          }
  
          // Optimistic state update
          setData(prev => {
             const existingList = prev[stateKey as keyof typeof data] as any[];
             const idx = existingList.findIndex((item: any) => item.id === docId);
             if (idx > -1) {
                 const newList = [...existingList];
                 newList[idx] = { ...newList[idx], ...docData };
                 return { ...prev, [stateKey]: newList };
             }
             return prev;
          });

          await updateDoc(docRef, dataToUpdate);
          
          if (!silent) {
              toast({ title: "Data Berhasil Diperbarui" });
          }
      } catch (e: any) {
          console.error(`Error updating ${collectionName}:`, e);
          if (!silent) {
               console.error(e);
               toast({ variant: "destructive", title: "Gagal Memperbarui", description: e.message || "Terjadi kesalahan saat memperbarui data." });
          }
          // Revert on error? Usually fetching again is safer
          await fetchData(true);
      }
  }, [toast, data.subscriptionPlans, fetchData, currentUser]);
    
    const deleteDocsAndUpdateState = useCallback(async (collectionName: string, docIds: string[], stateKey: keyof typeof data) => {
        if (!db) return;
        try {
            const batch = writeBatch(db);
            docIds.forEach(id => {
                batch.delete(doc(db, collectionName, id));
            });
            await batch.commit();
            setData(prev => ({
                ...prev,
                [stateKey]: prev[stateKey as keyof typeof data].filter((item: any) => !docIds.includes(item.id))
            }));
            toast({ title: "Data Dihapus", description: `${docIds.length} data telah berhasil dihapus.` });
        } catch (e: any) {
             console.error(`Error deleting from ${collectionName}:`, e);
             console.error(e);
             toast({ variant: "destructive", title: "Gagal Menghapus", description: e.message || "Terjadi kesalahan saat menghapus data." });
        }
    }, [toast]);

    const addOkr = useCallback(async (okr: Omit<OKR, 'id'>) => {
        const newOkrData = await addDocAndUpdateState<OKR>('okrs', okr, 'okrs', true);
        if (newOkrData && newOkrData.status === 'Active' && currentUser) {
            await addDoc(collection(db, "notifications"), {
                recipientId: newOkrData.ownerId,
                senderName: currentUser.name,
                category: 'OKR',
                message: `Anda ditunjuk sebagai owner untuk OKR baru: "${newOkrData.objective}"`,
                link: `/okr/${newOkrData.id}`,
                isRead: false,
                timestamp: serverTimestamp()
            });
        }
        return newOkrData;
    }, [addDocAndUpdateState, currentUser]);

    const updateOkr = useCallback(async (id: string, okrData: Partial<OKR>) => {
        const originalOkr = data.okrs.find(o => o.id === id);
        await updateDocAndUpdateState<OKR>('okrs', id, okrData, 'okrs', true);
        
        if (originalOkr && okrData.status === 'Active' && originalOkr.status !== 'Active' && currentUser) {
            await addDoc(collection(db, "notifications"), {
                recipientId: originalOkr.ownerId,
                senderName: currentUser.name,
                category: 'OKR',
                message: `OKR Anda "${originalOkr.objective}" telah disetujui and sekarang aktif.`,
                link: `/okr/${id}`,
                isRead: false,
                timestamp: serverTimestamp()
            });
        }
    }, [updateDocAndUpdateState, data.okrs, currentUser]);

    const deleteOkr = useCallback(async (id: string) => {
        await deleteDocsAndUpdateState('okrs', [id], 'okrs');
    }, [deleteDocsAndUpdateState]);

    const updateOkrStatus = useCallback(async (id: string, status: OKR['status'], logMessage: string) => {
        const okrRef = doc(db, 'okrs', id);
        try {
            await runTransaction(db, async (transaction) => {
                const okrDoc = await transaction.get(okrRef);
                if (!okrDoc.exists()) {
                    throw "OKR tidak ditemukan.";
                }
                const currentData = okrDoc.data() as OKR;
                const newActivityLog = [...(currentData.activityLog || []), {
                    id: `log_${Date.now()}`,
                    authorId: currentUser?.id,
                    authorName: currentUser?.name,
                    timestamp: serverTimestamp(),
                    comment: logMessage,
                    type: status === 'Active' ? 'approval' : 'rejection',
                }];

                transaction.update(okrRef, { status: status, activityLog: newActivityLog });
                
                // Local update in state after transaction succeeds
                setData(prev => ({
                    ...prev,
                    okrs: prev.okrs.map(o => o.id === id ? { ...o, status, activityLog: newActivityLog } : o)
                }));
            });
        } catch (e: any) {
            console.error("Error updating OKR status:", e);
            toast({ variant: 'destructive', title: 'Gagal Memperbarui Status OKR', description: e.message });
        }
    }, [currentUser, toast]);
    
  const generateAppraisalTasks = useCallback(async (setup: AppraisalSetup, kboSetupId: string) => {
    if (!setup.id) return;
  
    const newTasks = new Map<string, AppraisalTask>();
    if (setup.status === 'Aktif') {
      const allCompanyEmployees = data.employees.filter(e => e.company === setup.company && e.status === 'Aktif');
      const customMappings = setup.customRaterMappings || {};
  
      for (const subject of allCompanyEmployees) {
            const subjectCustomMap = customMappings[kboSetupId]?.[subject.id] || {};
    
            if (subjectCustomMap.isSubjectActive) {
                const allRatersForSubject = new Set<Employee>();
                if (subjectCustomMap.hasOwnProperty('selfEnabled') ? subjectCustomMap.selfEnabled : false) {
                  allRatersForSubject.add(subject);
                }
        
                if (subjectCustomMap.hasOwnProperty('supervisorId')) {
                  if (subjectCustomMap.supervisorId) {
                    const supervisor = data.employees.find(e => e.id === subjectCustomMap.supervisorId);
                    if (supervisor) allRatersForSubject.add(supervisor);
                  }
                } else if (subject.reportsTo) {
                  const defaultSupervisor = data.employees.find(e => e.id === subject.reportsTo);
                  if (defaultSupervisor) allRatersForSubject.add(defaultSupervisor);
                }
        
                if (subjectCustomMap.hasOwnProperty('peers')) {
                  subjectCustomMap.peers?.forEach(p => {
                    const peer = data.employees.find(e => e.id === p.id);
                    if (peer) allRatersForSubject.add(peer);
                  });
                }
        
                if (subjectCustomMap.hasOwnProperty('subordinates')) {
                  subjectCustomMap.subordinates?.forEach(s => {
                    const subordinate = data.employees.find(e => e.id === subject.id);
                    if (subordinate) allRatersForSubject.add(subordinate);
                  });
                }

                allRatersForSubject.forEach(rater => {
                  const taskId = `${setup.id!}_${subject.id}_${rater.id}_${kboSetupId}`;
                  if (!newTasks.has(taskId)) {
                    newTasks.set(taskId, {
                      id: taskId, setupId: setup.id!, subjectId: subject.id, subjectName: subject.name,
                      raterId: rater.id, company: setup.company, status: 'pending',
                      periodStart: setup.periodStart || setup.period || 'N/A',
                      periodEnd: setup.periodEnd || setup.period || 'N/A',
                      kboSetupId: kboSetupId,
                    });
                  }
                });
            }
      }
    }
  
    const oldTasksQuery = query(collection(db, 'appraisalTasks'), where('setupId', '==', setup.id), where('kboSetupId', '==', kboSetupId));
    const oldTasksSnap = await getDocs(oldTasksQuery);
    const oldTaskIds = new Set<string>();
    oldTasksSnap.forEach(doc => oldTaskIds.add(doc.id));
  
    const batch = writeBatch(db);
  
    oldTaskIds.forEach(taskId => {
      if (!newTasks.has(taskId)) {
        batch.delete(doc(db, 'appraisalTasks', taskId));
      }
    });
  
    newTasks.forEach((task, taskId) => {
        batch.set(doc(db, 'appraisalTasks', taskId), task);
    });
  
    try {
      await batch.commit();
      
      for (const [taskId, task] of newTasks) {
          if (!oldTaskIds.has(taskId)) {
              await addDoc(collection(db, "notifications"), {
                  recipientId: task.raterId,
                  senderName: 'Sistem KBO',
                  category: 'KBO',
                  message: `Anda memiliki tugas penilaian kompetensi baru untuk ${task.subjectName}`,
                  link: `/kbo-assessment-form?setupId=${task.setupId}&subjectId=${task.subjectId}&raterId=${task.raterId}&kboSetupIds=${task.kboSetupId}`,
                  isRead: false,
                  timestamp: serverTimestamp()
              });
          }
      }

      await fetchData(true);
    } catch (e: any) {
      console.error('Error syncing appraisal tasks:', e);
      toast({ variant: 'destructive', title: 'Gagal Sinkronisasi Tugas', description: e.message });
    }
  }, [data.employees, toast, fetchData]);


  const addKboAssessment = useCallback(async (assessment: Omit<KboAssessment, 'id'>) => {
    try {
        const assessmentId = `${assessment.setupId}_${assessment.subjectId}_${assessment.raterId}`;
        const assessmentRef = doc(db, 'kboAssessments', assessmentId);
        const kboSetupId = assessment.kboSetupId;
        const companyName = data.employees.find(e => e.id === assessment.subjectId)?.company || 'Unknown';
        
        const dataToSet: Partial<KboAssessment> = {
            setupId: assessment.setupId,
            subjectId: assessment.subjectId,
            raterId: assessment.raterId,
            assessments: {
                [kboSetupId]: {
                    selections: assessment.selections,
                    totalScore: assessment.totalScore,
                    notes: assessment.notes,
                }
            },
            timestamp: serverTimestamp(),
            company: companyName,
            companyLower: normalizeName(companyName),
        };
        
        await setDoc(assessmentRef, dataToSet, { merge: true });

        const taskId = `${assessment.setupId}_${assessment.subjectId}_${assessment.raterId}_${assessment.kboSetupId}`;
        const taskRef = doc(db, "appraisalTasks", taskId);
        await updateDoc(taskRef, { status: 'completed' });
        
        await fetchData(true);

    } catch (error: any) {
       console.error("Error in addKboAssessment:", error);
       toast({ variant: "destructive", title: "Gagal Menyimpan Penilaian", description: error.message });
       throw error;
    }
  }, [fetchData, toast, data.employees]);

  const deleteKboAssessment = useCallback(async (assessmentId: string, kboSetupId: string) => {
    const assessmentRef = doc(db, 'kboAssessments', assessmentId);
    
    const [setupId, subjectId, raterId] = assessmentId.split('_');
    const taskId = `${setupId}_${subjectId}_${raterId}_${kboSetupId}`;
    const taskRef = doc(db, 'appraisalTasks', taskId);
    
    try {
        await runTransaction(db, async (transaction) => {
            const assessmentDoc = await transaction.get(assessmentRef);
            const taskDoc = await transaction.get(taskRef);

            if (assessmentDoc.exists()) {
                const currentData = assessmentDoc.data();
                if (currentData.assessments && currentData.assessments[kboSetupId]) {
                    delete currentData.assessments[kboSetupId];
                    if (Object.keys(currentData.assessments).length === 0) {
                        transaction.delete(assessmentRef);
                    } else {
                        transaction.update(assessmentRef, { assessments: currentData.assessments });
                    }
                }
            }

            if (taskDoc.exists()){
              transaction.update(taskRef, { status: 'pending' });
            }
        });
        
        await fetchData(true);
    } catch (error: any) {
        console.error("Error resetting assessment:", error);
        toast({ variant: 'destructive', title: 'Gagal Mereset Penilaian', description: error.message });
    }
  }, [fetchData, toast]);
  
  const addLearningProgram = useCallback(async (program: Omit<LearningProgram, 'id'>) => {
      const newProgram = await addDocAndUpdateState<LearningProgram>('learningPrograms', program, 'learningPrograms', true);
      if (newProgram && newProgram.status === 'published' && currentUser) {
          const targetEmployees = data.employees.filter(e => {
              if (newProgram.company !== 'Global' && e.company !== newProgram.company) return false;
              return true;
          });
          
          for (const emp of targetEmployees) {
              await addDoc(collection(db, "notifications"), {
                  recipientId: emp.id,
                  senderName: 'LMS Academy',
                  category: 'LMS',
                  message: `Program pembelajaran baru tersedia: "${newProgram.title}"`,
                  link: `/lms/user/program/${newProgram.id}`,
                  isRead: false,
                  timestamp: serverTimestamp()
              });
          }
      }
      return newProgram;
  }, [addDocAndUpdateState, currentUser, data.employees]);

  const updateLearningProgram = useCallback(async (id: string, data: Partial<LearningProgram>) => {
      await updateDocAndUpdateState<LearningProgram>('learningPrograms', id, data, 'learningPrograms', true);
  }, [updateDocAndUpdateState]);

  const duplicateCourseToGlobal = useCallback(async (course: Course) => {
    const { id, createdBy, createdAt, ...originalCourse } = course;
  
    try {
        const batch = writeBatch(db);
        const quizIdMap = new Map<string, string>();
  
        const duplicateQuizIfNeeded = async (quizId: string) => {
            if (!quizId) return undefined;
            if (quizIdMap.has(quizId)) return quizIdMap.get(quizId);
  
            const originalQuiz = data.quizzes.find(q => q.id === quizId);
            if (originalQuiz) {
                const { id: originalQuizId, ...quizData } = originalQuiz;
                const newQuizRef = doc(collection(db, 'lmsQuizzes'));
                batch.set(newQuizRef, { ...quizData, company: "Global" });
                quizIdMap.set(quizId, newQuizRef.id);
                return newQuizRef.id;
            }
            return undefined;
        };
  
        const newPreTestQuizId = await duplicateQuizIfNeeded(originalCourse.preTestQuizId || '');
        const newPostTestQuizId = await duplicateQuizIfNeeded(originalCourse.postTestQuizId || '');
        
        const newCourseRef = doc(collection(db, 'lmsCourses'));
        const newCourseData: Omit<Course, 'id'> = {
            ...originalCourse,
            company: "Global",
            status: "published",
            targetAudience: {},
            preTestQuizId: newPreTestQuizId,
            postTestQuizId: newPostTestQuizId,
            createdBy: currentUser?.id || 'superadmin',
            createdAt: serverTimestamp(),
        };

        batch.set(newCourseRef, newCourseData);
        await batch.commit();

        await fetchData(true);
        toast({
            title: "Kursus Digandakan ke Global",
            description: `Kursus "${course.title}" telah berhasil diduplikasi ke Katalog Global.`,
        });
    } catch (e: any) {
        console.error("Error duplicating course to global:", e);
        toast({
            variant: "destructive",
            title: "Gagal Menggandakan",
            description: e.message || "Terjadi kesalahan saat memproses.",
        });
    }
  }, [currentUser, data.quizzes, fetchData, toast]);

    const enrollToCourse = useCallback(async (courseId: string, employeeId: string): Promise<Enrollment | null> => {
        const enrollmentId = `${courseId}_${employeeId}`;
        const enrollmentRef = doc(db, 'lmsEnrollments', enrollmentId);
        try {
            const docSnap = await getDoc(enrollmentRef);
            if (docSnap.exists()) {
                return enrollmentWithMethods({ id: docSnap.id, ...docSnap.data() } as Omit<Enrollment, 'getFinalScore'>);
            } else {
                const course = data.courses.find(c => c.id === courseId);
                if (!course) throw new Error("Kursus tidak ditemukan.");

                const newEnrollmentData: Omit<Enrollment, 'id' | 'getFinalScore'> = {
                    courseId,
                    employeeId,
                    status: 'in-progress',
                    progress: 0,
                    startedAt: serverTimestamp(),
                    topicStatus: {},
                };
                await setDoc(enrollmentRef, newEnrollmentData);
                const createdEnrollment = enrollmentWithMethods({ ...newEnrollmentData, id: enrollmentId, startedAt: new Date() });
                setData(prev => ({ ...prev, enrollments: [...prev.enrollments, createdEnrollment] }));
                toast({ title: "Anda Telah Terdaftar", description: `Anda telah memulai kursus "${course.title}".` });
                return createdEnrollment;
            }
        } catch (e: any) {
            console.error("Error enrolling to course:", e);
            toast({ variant: "destructive", title: "Gagal Mendaftar", description: e.message });
            return null;
        }
    }, [toast, data.courses]);
    
    const updateEnrollment = useCallback(async (enrollmentId: string, updateData: Partial<Enrollment>) => {
      const enrollmentRef = doc(db, 'lmsEnrollments', enrollmentId);
      try {
        const sanitizedData = sanitizeUndefined(updateData);
        await updateDoc(enrollmentRef, sanitizedData);
        
        updateEnrollmentInContext(enrollmentId, updateData);

      } catch (e: any) {
        console.error("Error updating enrollment:", e);
      }
    }, [updateEnrollmentInContext]);

  const resetEnrollment = useCallback(async (enrollmentId: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, 'lmsEnrollments', enrollmentId));
        setData(prev => ({
            ...prev,
            enrollments: prev.enrollments.filter(e => e.id !== enrollmentId),
        }));
        toast({ title: "Progres Direset", description: "Progres peserta telah berhasil direset." });
    } catch (e: any) {
        console.error("Error resetting enrollment:", e);
        toast({ variant: "destructive", title: "Gagal Mereset", description: e.message });
    }
  }, [toast]);
  
  const addAiTool = useCallback(
    (tool: Omit<AiTool, 'id'>) => addDocAndUpdateState<AiTool>('aiTools', { ...tool, createdAt: serverTimestamp(), createdBy: currentUser?.id }, 'aiTools', true),
    [addDocAndUpdateState, currentUser]
  );
  const updateAiTool = useCallback(
    (id: string, toolData: Partial<AiTool>) => updateDocAndUpdateState<AiTool>('aiTools', id, toolData, 'aiTools', true),
    [updateDocAndUpdateState]
  );
  const deleteAiTool = useCallback(
    (id: string) => deleteDocsAndUpdateState('aiTools', [id], 'aiTools'),
    [deleteDocsAndUpdateState]
  );

  const addMediaFile = useCallback(
    (file: Omit<MediaFile, 'id'>) => addDocAndUpdateState<MediaFile>('mediaFiles', file, 'mediaFiles', true),
    [addDocAndUpdateState]
  );
  const deleteMediaFile = useCallback(
    (id: string) => deleteDocsAndUpdateState('mediaFiles', [id], 'mediaFiles'),
    [deleteDocsAndUpdateState]
  );

  const addCollabSpace = useCallback(
    (space: Omit<CollabSpace, 'id'>) => addDocAndUpdateState<CollabSpace>('collabSpaces', space, 'collabSpaces', true),
    [addDocAndUpdateState]
  );
  const updateCollabSpace = useCallback(
    (id: string, data: Partial<CollabSpace>) => updateDocAndUpdateState<CollabSpace>('collabSpaces', id, data, 'collabSpaces', true),
    [updateDocAndUpdateState]
  );
  const deleteCollabSpace = useCallback(
    (id: string) => deleteDocsAndUpdateState('collabSpaces', [id], 'collabSpaces'),
    [deleteDocsAndUpdateState]
  );

  const addCollabTask = useCallback(
    async (task: Omit<CollabTask, 'id'>) => {
        const newTask = await addDocAndUpdateState<CollabTask>('collabTasks', task, 'collabTasks', true);
        if (newTask && newTask.assigneeIds && currentUser) {
            for (const assigneeId of newTask.assigneeIds) {
                if (assigneeId !== currentUser.id) {
                    await addDoc(collection(db, "notifications"), {
                        recipientId: assigneeId,
                        senderName: currentUser.name,
                        category: 'CollabSpace',
                        message: `Anda diberikan tugas baru: "${newTask.title}" di CollabSpace.`,
                        link: `/collab-space/${newTask.spaceId}`,
                        isRead: false,
                        timestamp: serverTimestamp()
                    });
                }
            }
        }
        return newTask;
    },
    [addDocAndUpdateState, currentUser]
  );
  const updateCollabTask = useCallback(
    (id: string, taskData: Partial<CollabTask>) => updateDocAndUpdateState<CollabTask>('collabTasks', id, taskData, 'collabTasks', true),
    [updateDocAndUpdateState]
  );
  const deleteCollabTask = useCallback(
    (id: string) => deleteDocsAndUpdateState('collabTasks', [id], 'collabTasks'),
    [deleteDocsAndUpdateState]
  );

  const bulkUpdateCollabTasks = useCallback(async (taskIds: string[], updateData: Partial<CollabTask>) => {
    if (!db) return;
    const batch = writeBatch(db);
    const sanitizedData = sanitizeUndefined({ ...updateData, updatedAt: serverTimestamp() });
    
    taskIds.forEach(id => {
        const docRef = doc(db, 'collabTasks', id);
        batch.update(docRef, sanitizedData);
    });

    try {
        await batch.commit();
        // Optimistic local update
        setData(prev => ({
            ...prev,
            collabTasks: prev.collabTasks.map(t => taskIds.includes(t.id) ? { ...t, ...updateData } : t)
        }));
        toast({ title: "Update Berhasil", description: `${taskIds.length} tugas telah diperbarui.` });
    } catch (e: any) {
        console.error("Bulk task update failed:", e);
        toast({ variant: 'destructive', title: "Gagal Memperbarui", description: e.message });
    }
  }, [toast]);

  const initializeDefaultEmailTemplates = useCallback(async () => {
    if (!db) return;
    setIsLoading(true);
    const batch = writeBatch(db);
    
    const htmlWrapper = (content: string) => `
        <div style="background-color: #f4f7ff; padding: 40px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e1e8ff;">
                <tr>
                    <td style="padding: 30px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #f0f4ff;">
                        <img src="https://firebasestorage.googleapis.com/v0/b/kpi-dev-vjyoo.firebasestorage.app/o/media_library%2FPT%20Hrdku%20Reksa%20Talenta%2F1774954983502_k%20(21).png?alt=media&token=220f0c3a-e4b1-4e5c-b623-d55b43d659fc" alt="KIPIAI.ID" style="height: 50px; width: auto; display: block; margin: 0 auto;">
                    </td>
                </tr>
                <tr>
                    <td style="padding: 40px 40px 30px 40px;">
                        ${content}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 30px; text-align: center; background-color: #f9faff; color: #8792a2; font-size: 12px; font-weight: 500; letter-spacing: 0.5px;">
                        &copy; ${new Date().getFullYear()} KIPIAI.ID by HRDKU • Performa Dalam Genggaman
                    </td>
                </tr>
            </table>
        </div>
    `;

    const defaults: Omit<EmailTemplate, 'id'>[] = [
        {
            name: "Registrasi Perusahaan Baru",
            category: "registration",
            subject: "Selamat Datang di KIPIAI, {{company_name}}!",
            htmlContent: htmlWrapper(`
                <h2 style="margin: 0 0 20px; font-size: 20px; color: #1a1f36; font-weight: 700;">Halo {{nama_pengguna}},</h2>
                <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4f566b;">
                    Selamat! Perusahaan Anda, <strong>{{company_name}}</strong>, telah berhasil didaftarkan di sistem KIPIAI.
                </p>
                <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4f566b;">
                    Saat ini akun Anda sedang dalam proses verifikasi oleh tim kami. Kami akan menginformasikan kembali segera setelah akun Anda aktif dan siap digunakan.
                </p>
                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #4f566b;">
                    Terima kasih telah mempercayakan manajemen performa Anda kepada kami.
                </p>
            `),
            placeholders: ["nama_pengguna", "company_name"],
            description: "Email otomatis saat perusahaan baru mendaftar (menunggu aktivasi)."
        },
        {
            name: "Aktivasi Akun Perusahaan",
            category: "activation",
            subject: "Akun Perusahaan {{company_name}} Telah Aktif!",
            htmlContent: htmlWrapper(`
                <h2 style="margin: 0 0 20px; font-size: 20px; color: #1a1f36; font-weight: 700;">Halo {{nama_pengguna}},</h2>
                <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4f566b;">
                    Kabar gembira! Akun manajemen untuk <strong>{{company_name}}</strong> telah diaktifkan oleh tim Superadmin.
                </p>
                <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.6; color: #4f566b;">
                    Anda sekarang dapat login and mulai mengelola data karyawan serta KPI perusahaan Anda melalui dashboard utama.
                </p>
                <div style="text-align: center; margin: 35px 0;">
                    <a href="{{link}}" style="background-color: #22c55e; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);">
                        Masuk ke Dashboard
                    </a>
                </div>
            `),
            placeholders: ["nama_pengguna", "company_name", "link"],
            description: "Email yang dikirim saat Superadmin menyetujui aktivasi perusahaan baru."
        },
        {
            name: "Pembaruan Kata Sandi (Undangan)",
            category: "password_reset",
            subject: "Undangan Bergabung di KIPIAI.ID",
            htmlContent: htmlWrapper(`
                <h2 style="margin: 0 0 20px; font-size: 20px; color: #1a1f36; font-weight: 700;">Halo {{nama_pengguna}},</h2>
                <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4f566b;">
                    Anda telah didaftarkan sebagai pengguna di sistem manajemen performa KIPIAI.ID.
                </p>
                <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.6; color: #4f566b;">
                    Untuk dapat mengakses akun Anda, silakan buat kata sandi baru melalui tombol di bawah ini:
                </p>
                <div style="text-align: center; margin: 35px 0;">
                    <a href="{{link}}" style="background-color: #3b82f6; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                        Atur Kata Sandi Sekarang
                    </a>
                </div>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #8792a2;">
                    Tautan ini akan kedaluwarsa dalam 24 jam demi keamanan akun Anda.
                </p>
            `),
            placeholders: ["nama_pengguna", "link"],
            description: "Email yang dikirim untuk mengundang karyawan baru atau mereset sandi via SMTP."
        }
    ];

    try {
        for (const t of defaults) {
            const existing = data.emailTemplates.find(et => et.category === t.category);
            if (existing) {
                const docRef = doc(db, 'emailTemplates', existing.id);
                batch.update(docRef, { ...t, updatedAt: serverTimestamp() });
            } else {
                const docRef = doc(collection(db, 'emailTemplates'));
                batch.set(docRef, { ...t, updatedAt: serverTimestamp() });
            }
        }
        await batch.commit();
        await fetchData(true);
        toast({ title: "Inisialisasi Berhasil", description: "Template email default telah diperbarui/dibuat." });
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Gagal Inisialisasi", description: e.message });
    } finally {
        setIsLoading(false);
    }
  }, [fetchData, toast, data.emailTemplates]);

  const initializeDefaultWhatsappTemplates = useCallback(async () => {
    if (!db) return;
    setIsLoading(true);
    const batch = writeBatch(db);
    
    const defaults: Omit<WhatsappTemplate, 'id'>[] = [
        {
            name: "Pendaftaran Berhasil (Trial)",
            category: "registration",
            message: "*SELAMAT DATANG DI KIPIAI.ID!* 🤖🚀\n\nHalo Kak *{{nama_pengguna}}*,\n\nTerima kasih telah mendaftarkan *{{company_name}}* di platform manajemen performa kami.\n\nAkun Anda telah *AKTIF* otomatis dengan paket *TRIAL 14 HARI*. Anda memiliki akses penuh ke fitur KPI, KBO, dan CollabSpace.\n\n*Informasi Akun:*\n- Website: https://app.kipiai.id\n- Status: Aktif (Trial)\n\nSemoga KIPIAI membantu meningkatkan performa tim Anda! 😉👍",
            placeholders: ["nama_pengguna", "company_name"],
            description: "Pesan WA otomatis saat perusahaan baru berhasil mendaftar (Trial)."
        },
        {
            name: "Notifikasi Admin: Registrasi Baru",
            category: "other",
            message: "*NOTIFIKASI PENDAFTARAN BARU* 🚀\n\nHalo Admin, ada perusahaan baru pendaftar (Auto-Active):\n\n🏢 Perusahaan: *{{company_name}}*\n👤 Nama Admin: *{{nama_pengguna}}*\n📧 Email: *{{email}}*\n📱 No. HP: *{{telepon}}*",
            placeholders: ["nama_pengguna", "company_name", "email", "telepon"],
            description: "Pesan WA ke nomor admin memberitahu ada pendaftar baru."
        }
    ];

    try {
        for (const t of defaults) {
            const existing = data.whatsappTemplates.find(wt => wt.name === t.name);
            if (existing) {
                const docRef = doc(db, 'whatsappTemplates', existing.id);
                batch.update(docRef, { ...t, updatedAt: serverTimestamp() });
            } else {
                const docRef = doc(collection(db, 'whatsappTemplates'));
                batch.set(docRef, { ...t, updatedAt: serverTimestamp() });
            }
        }
        await batch.commit();
        await fetchData(true);
        toast({ title: "Inisialisasi WA Berhasil" });
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Gagal Inisialisasi WA", description: e.message });
    } finally {
        setIsLoading(false);
    }
  }, [fetchData, toast, data.whatsappTemplates]);


  const value: MasterDataContextType = {
    ...data,
    updateEnrollmentInContext,
    fetchData,
    isLoading,
    addCompany: (d: Omit<Company, 'id'>) => addDocAndUpdateState<Company>('companies', d, 'companies'),
    updateCompany: (id: string, d: Partial<Company>) => updateDocAndUpdateState<Company>('companies', id, d, 'companies'),
    deleteCompany: async (id: string) => {
        await deleteDocsAndUpdateState('companies', [id], 'companies');
    },

    addDepartment: (d: Omit<Department, 'id'>) => addDocAndUpdateState<Department>('departments', d, 'departments'),
    updateDepartment: (id: string, d: Partial<Omit<Department, 'id'>>) => updateDocAndUpdateState<Department>('departments', id, d, 'departments'),
    deleteDepartments: (ids: string[]) => deleteDocsAndUpdateState('departments', ids, 'departments'),

    addPosition: (d: Omit<Position, 'id'>) => addDocAndUpdateState<Position>('positions', d, 'positions'),
    updatePosition: (id: string, d: Partial<Omit<Position, 'id'>>) => updateDocAndUpdateState<Position>('positions', id, d, 'positions'),
    deletePositions: (ids: string[]) => deleteDocsAndUpdateState('positions', ids, 'positions'),
    
    updateEmployee: (id: string, d: Partial<Omit<Employee, 'id'>>) => updateDocAndUpdateState<Employee>('employees', id, d, 'employees'),
    deleteEmployees: (ids: string[]) => deleteDocsAndUpdateState('employees', ids, 'employees'),

    addCompanyObjective: (d: Omit<CompanyObjective, 'id'>) => addDocAndUpdateState<CompanyObjective>('companyObjectives', d, 'companyObjectives'),
    updateCompanyObjective: (id: string, data: Partial<CompanyObjective>) => updateDocAndUpdateState<CompanyObjective>('companyObjectives', id, data, 'companyObjectives'),
    deleteCompanyObjectives: (ids: string[]) => deleteDocsAndUpdateState('companyObjectives', ids, 'companyObjectives'),

    addKpiCategory: (d: Omit<KpiCategory, 'id'>) => addDocAndUpdateState<KpiCategory>('kpiCategories', d, 'kpiCategories'),
    updateKpiCategory: (id: string, d: Partial<KpiCategory>) => updateDocAndUpdateState<KpiCategory>('kpiCategories', id, d, 'kpiCategories'),
    deleteKpiCategories: (ids: string[]) => deleteDocsAndUpdateState('kpiCategories', ids, 'kpiCategories'),

    addKboCategory: (d: Omit<KboCategory, 'id'> & {id: string}) => setDocAndUpdateState<KboCategory>('kboCategories', d, 'kboCategories'),
    updateKboCategory: (id: string, d: Partial<KboCategory>) => updateDocAndUpdateState<KboCategory>('kboCategories', id, d, 'kboCategories'),
    deleteKboCategories: (ids: string[]) => deleteDocsAndUpdateState('kboCategories', ids, 'kboCategories'),

    addKboSetup: (d: Omit<KboSetup, 'id'>) => addDocAndUpdateState<KboSetup>('kboSetups', d, 'kboSetups'),
    updateKboSetup: (id: string, d: Partial<KboSetup>) => updateDocAndUpdateState<KboSetup>('kboSetups', id, d, 'kboSetups'),
    deleteKboSetup: (id: string) => deleteDocsAndUpdateState('kboSetups', [id], 'kboSetups'),

    addAppraisalSetup: (d: Omit<AppraisalSetup, 'id'>) => addDocAndUpdateState<AppraisalSetup>('appraisalSetups', d, 'appraisalSetups'),
    updateAppraisalSetup: (id: string, d: Partial<AppraisalSetup>) => updateDocAndUpdateState<AppraisalSetup>('appraisalSetups', id, d, 'appraisalSetups', true),
    deleteAppraisalSetup: async (setupId: string) => {
      try {
        const batch = writeBatch(db);
        const tasksQuery = query(collection(db, 'appraisalTasks'), where('setupId', '==', setupId));
        const tasksSnapshot = await getDocs(tasksQuery);
        tasksSnapshot.forEach(doc => batch.delete(doc.ref));
        
        batch.delete(doc(db, 'appraisalSetups', setupId));
        
        await batch.commit();
        await fetchData(true);
      } catch (error: any) {
        console.error("Error deleting appraisal setup and tasks:", error);
        toast({ variant: 'destructive', title: 'Gagal Menghapus', description: error.message });
      }
    },

    generateAppraisalTasks,
    addKboAssessment,
    deleteKboAssessment,
    addKpiSetup: (d: Omit<KpiSetup, 'id'>, silent?: boolean) => addDocAndUpdateState<KpiSetup>('kpiSetups', d, 'kpiSetups', silent),
    updateKpiSetup: (id: string, d: Partial<KpiSetup>, silent?: boolean) => updateDocAndUpdateState<KpiSetup>('kpiSetups', id, d, 'kpiSetups', silent),
    deleteKpiSetup: (id: string) => deleteDocsAndUpdateState('kpiSetups', [id], 'kpiSetups'),
    
    addDocumentTemplate: (template: Omit<DocumentTemplate, 'id'>) => addDocAndUpdateState<DocumentTemplate>('documentTemplates', template, 'documentTemplates'),
    updateDocumentTemplate: (id: string, data: Partial<DocumentTemplate>) => updateDocAndUpdateState<DocumentTemplate>('documentTemplates', id, data, 'documentTemplates'),
    deleteDocumentTemplate: (id: string) => deleteDocsAndUpdateState('documentTemplates', [id], 'documentTemplates'),
    
    addEmailTemplate: (template: Omit<EmailTemplate, 'id'>) => addDocAndUpdateState<EmailTemplate>('emailTemplates', template, 'emailTemplates'),
    updateEmailTemplate: (id: string, data: Partial<EmailTemplate>) => updateDocAndUpdateState<EmailTemplate>('emailTemplates', id, data, 'emailTemplates'),
    deleteEmailTemplate: (id: string) => deleteDocsAndUpdateState('emailTemplates', [id], 'emailTemplates'),
    initializeDefaultEmailTemplates,

    addWhatsappTemplate: (template: Omit<WhatsappTemplate, 'id'>) => addDocAndUpdateState<WhatsappTemplate>('whatsappTemplates', template, 'whatsappTemplates'),
    updateWhatsappTemplate: (id: string, data: Partial<WhatsappTemplate>) => updateDocAndUpdateState<WhatsappTemplate>('whatsappTemplates', id, data, 'whatsappTemplates'),
    deleteWhatsappTemplate: (id: string) => deleteDocsAndUpdateState('whatsappTemplates', [id], 'whatsappTemplates'),
    initializeDefaultWhatsappTemplates,

    addNotificationTemplate: (template: Omit<NotificationTemplate, 'id'>) => addDocAndUpdateState<NotificationTemplate>('notificationTemplates', template, 'notificationTemplates'),
    updateNotificationTemplate: (id: string, data: Partial<NotificationTemplate>) => updateDocAndUpdateState<NotificationTemplate>('notificationTemplates', id, data, 'notificationTemplates'),
    deleteNotificationTemplate: (id: string) => deleteDocsAndUpdateState('notificationTemplates', [id], 'notificationTemplates'),

    addOrUpdateKpiData,
    addOrUpdateTargetOverride,
    updateKpiData: (id: string, d: Partial<KpiData>) => updateDocAndUpdateState<KpiData>('kpiData', id, d, 'kpiData'),
    deleteKpiData: (ids: string[]) => deleteDocsAndUpdateState('kpiData', ids, 'kpiData'),
    
    addOkr,
    updateOkr,
    updateOkrStatus,
    deleteOkr,
    
    addSubscriptionPlan: (plan: Omit<SubscriptionPlan, 'id'>) => addDocAndUpdateState<SubscriptionPlan>('subscriptionPlans', plan, 'subscriptionPlans'),
    updateSubscriptionPlan: (id: string, data: Partial<SubscriptionPlan>) => updateDocAndUpdateState<SubscriptionPlan>('subscriptionPlans', id, data, 'subscriptionPlans'),
    deleteSubscriptionPlan: (id: string) => deleteDocsAndUpdateState('subscriptionPlans', [id], 'subscriptionPlans'),
    
    addCourse: async (course: Omit<Course, 'id'>) => {
      const doc = await addDocAndUpdateState<Course>('lmsCourses', course, 'courses', true);
      return doc;
    },
    updateCourse: async (id: string, data: Partial<Course>) => {
      const docRef = doc(db, 'lmsCourses', id);
      await setDoc(docRef, data, { merge: true });
      setData(prev => ({
          ...prev,
          courses: prev.courses.map(c => c.id === id ? { ...c, ...data } : c)
      }));
      toast({ title: 'Kursus Diperbarui', description: 'Perubahan pada kursus telah disimpan.' });
    },
    deleteCourse: async (id: string) => {
      await deleteDocsAndUpdateState('lmsCourses', [id], 'courses');
    },
    duplicateCourseToGlobal: (course: Course) => duplicateCourseToGlobal(course),
    addQuiz: async (quiz: Omit<LmsQuiz, 'id'>) => {
        const doc = await addDocAndUpdateState<LmsQuiz>('lmsQuizzes', quiz, 'quizzes', true);
        return doc;
    },
    updateQuiz: async (id: string, data: Partial<LmsQuiz>) => {
      await updateDocAndUpdateState<LmsQuiz>('lmsQuizzes', id, data, 'quizzes', true);
    },
    deleteQuiz: async (id: string) => {
      await deleteDocsAndUpdateState('lmsQuizzes', [id], 'quizzes');
    },
    addLearningProgram,
    updateLearningProgram,
    enrollToCourse,
    updateEnrollment,
    resetEnrollment,
    addAiTool,
    updateAiTool,
    deleteAiTool,
    addMediaFile,
    deleteMediaFile,
    addCollabSpace,
    updateCollabSpace,
    deleteCollabSpace,
    addCollabTask,
    updateCollabTask,
    deleteCollabTask,
    bulkUpdateCollabTasks,
  };

  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
}
