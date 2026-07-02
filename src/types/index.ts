
// src/types/index.ts
import { z } from "zod";

export type UserRole = 'superadmin' | 'manajemen' | 'hr-manager' | 'department-head' | 'user' | null;

export type LoginStatus = "No Login" | "Invited" | "Active";

export type EmployeeLike = {
  company?: string | null;
  department?: string | null;
  position?: string | null;
  level?: Employee['level'] | null;
};

// Akun Karyawan Operasional (Staff, Supervisor, Dept Head)
export type Employee = {
  id: string; 
  authUid?: string; 
  name: string;
  email: string;
  phone?: string; 
  company: string; 
  position: string;
  department: string;
  level: 'Staff' | 'Supervisor' | 'Manager' | 'Direktur';
  reportsTo?: string; 
  joinDate: string;
  status: 'Aktif' | 'Tidak Aktif' | 'Menunggu Persetujuan';
  role: 'user'; 
  loginStatus: LoginStatus;
  fcmTokens?: string[]; 
};

// Akun Admin Perusahaan (Manajemen)
export type CompanyAdmin = {
  id: string;
  authUid: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: 'manajemen';
  status: 'Aktif' | 'Tidak Aktif';
  loginStatus: LoginStatus;
  createdAt: any;
};

// --- Modular Subscription Types ---
export type ModuleId = 'appraisal' | 'lms' | 'collabspace';

export type ModuleSubscription = {
    status: 'active' | 'inactive' | 'expired';
    type: 'trial' | 'paid' | 'custom';
    quota: number; // User limit specifically for this module
    expiryDate: string; // ISO Date
    activatedAt?: string;
    addons?: string[];
};

// --- Subscription History Logs ---
export type SubscriptionLogAction = 'TRIAL' | 'UPGRADE' | 'RENEW' | 'EXPIRED' | 'MANUAL_CHANGE';

export type SubscriptionLog = {
  id: string;
  companyId: string;
  companyName: string;
  company: string; 
  moduleId?: ModuleId; // Log specific module actions
  planId?: string; // Legacy support
  planName: string;
  action: SubscriptionLogAction;
  amount: number;
  startDate: any;
  endDate: any;
  performedBy: string; 
  timestamp: any;
};

// --- Communication Template Types ---
export type CommunicationCategory = 'registration' | 'password_reset' | 'activation' | 'kpi_reminder' | 'other';

export type EmailTemplate = {
    id: string;
    name: string;
    category: CommunicationCategory;
    subject: string;
    htmlContent: string;
    placeholders: string[];
    description: string;
    updatedAt?: any;
};

export type WhatsappTemplate = {
    id: string;
    name: string;
    category: CommunicationCategory;
    message: string;
    placeholders: string[];
    description: string;
    updatedAt?: any;
};

// --- CollabSpace Types ---
export type CollabSpaceStatus = 'active' | 'archived';

export type CollabSpaceList = {
    id: string;
    title: string;
};

export type CollabSpace = {
  id: string;
  name: string;
  description: string;
  company: string;
  color: string; 
  creatorId: string;
  creatorName: string;
  memberIds: string[];
  status: CollabSpaceStatus;
  createdAt: any;
  updatedAt?: any;
  lists?: CollabSpaceList[]; 
};

export type CollabTaskStatus = 'todo' | 'in-progress' | 'done' | 'cancelled' | 'postponed' | 'failed';
export type CollabTaskPriority = 'low' | 'medium' | 'high';
export type CollabTaskType = 'daily' | 'project';

export type CollabChecklistItem = {
    id: string;
    text: string;
    completed: boolean;
};

export type CollabTaskAttachment = {
    name: string;
    url: string;
    type: string;
};

export type CollabActivityLogEntry = {
  id: string;
  authorId: string;
  authorName: string;
  timestamp: any;
  action: string;
  type?: 'activity' | 'comment'; 
  mentions?: string[]; 
};

export type CollabTask = {
  id: string;
  spaceId: string;
  title: string;
  description?: string;
  assigneeId?: string; 
  assigneeName?: string; 
  assigneeIds?: string[]; 
  labels?: string[];
  checklist?: CollabChecklistItem[];
  attachments?: CollabTaskAttachment[];
  coverColor?: string;
  dueDate?: any;
  status: CollabTaskStatus;
  priority: CollabTaskPriority;
  taskType: CollabTaskType; 
  startTime?: any; 
  endTime?: any; 
  createdAt: any;
  createdBy: string;
  isPrivate?: boolean;
  listId?: string; 
  activityLog?: CollabActivityLogEntry[];
  updatedAt?: any; 
  mentions?: string[]; 
  completedAt?: any;
};

export type CollabMessageType = 'chat' | 'announcement' | 'question' | 'answer';

export type CollabMessage = {
  id: string;
  spaceId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: CollabMessageType;
  timestamp: any;
  parentId?: string; 
  attachments?: string[];
  readBy?: string[]; 
  mentions?: string[]; 
};

// --- Media Library Types ---
export type MediaCategory = 'image' | 'video' | 'document' | 'other';

export type MediaFile = {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  type: string; 
  size: number;
  category: MediaCategory;
  company: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: any;
};

// --- Company Objective Type ---
export type CompanyObjective = {
  id: string;
  objectiveName: string;
  bscPerspective: 'Financial' | 'Customer & Market' | 'Internal Business Process' | 'Learning & Growth';
  strategicFocus: 'Growth' | 'Efficiency' | 'Quality' | 'Compliance';
  period: string; 
  company: string;
};


// --- OKR Types ---
export type OkrStatus = 'Draft' | 'Waiting for Approval' | 'Active' | 'Completed' | 'Overdue';
export type OkrPriority = 'Crucial' | 'Medium' | 'Normal';
export type KeyResultType = 'Percentage' | 'Numeric' | 'Milestone' | 'Binary';
export type OwnershipModel = 'single_owner' | 'split_ownership' | 'delegated';

export type Milestone = {
  id: string;
  text: string;
  completed: boolean;
  ownerId?: string; 
  ownerName?: string;
};

export type ChecklistItem = {
    id: string;
    text: string;
    completed: boolean;
    ownerId?: string; 
    ownerName?: string;
};

export type Contributor = {
    ownerId: string;
    ownerName: string;
    targetValue: number;
    currentValue: number;
};

export type ProgressUpdate = {
  id: string;
  date: any; 
  value: number; 
  notes: string;
  evidenceUrl?: string; 
  milestoneId?: string; 
  isDone?: boolean; 
};

export type KeyResult = {
  id: string;
  name: string;
  description: string;
  type: KeyResultType;
  ownershipModel: OwnershipModel;
  
  ownerId?: string;
  ownerName?: string;

  weight?: number;
  startValue: number;
  targetValue: number;
  currentValue: number; 
  unit?: string;

  milestones: Milestone[];
  checklist: ChecklistItem[];
  contributors: Contributor[];
  
  progressUpdates: ProgressUpdate[];
};

export type OkrComment = {
  id: string;
  authorId: string;
  authorName: string;
  timestamp: any; 
  comment: string;
  type: 'approval' | 'rejection' | 'progress' | 'general';
};

export type OkrFinalReview = {
  reviewerId: string;
  reviewerName: string;
  finalScore: number;
  feedback: string;
  reviewDate: any; 
};

export type OKR = {
  id: string;
  objective: string;
  description?: string;
  priority: OkrPriority;
  startDate: any; 
  endDate: any; 
  ownerId: string;
  ownerName: string;
  company: string;
  status: OkrStatus;
  progress: number;
  keyResults: KeyResult[];
  activityLog: OkrComment[];
  finalReview?: OkrFinalReview;
  approverId?: string;
  createdAt: any;
};


export type KpiCategory = {
  id: string;
  company: string; 
  code: string;
  name: string;
  description: string;
  status: 'Aktif' | 'Tidak Aktif';
};

export type KboCategory = {
  id: string;
  company: string; 
  name: string;
  description: string;
  status: 'Aktif' | 'Tidak Aktif';
}

export type KboRatingScaleItem = {
  level: number;
  name: string;
  percentage: number;
};

export type KboRatingScale = KboRatingScaleItem[];

export type KboDimension = {
  id: string; 
  dimension: string;
  definition: string;
  keyBehaviors: { value: string }[];
};

export type KboSetup = {
  id: string;
  company: string; 
  categoryName: string; 
  level?: 'Staff' | 'Supervisor' | 'Manager' | 'Direktur'; 
  department?: string; 
  position?: string; 
  dimensions: KboDimension[];
  ratingScale: KboRatingScale;
};


export type PerformanceStatus = "Melampaui Target" | "Mencapai Target" | "Perlu Peningkatan";
export type ApprovalStatus = "Menunggu Persetujuan" | "Disetujui";

export type KpiAchievement = {
  indicatorId: string;
  actual: number;
  keterangan?: string;
  linkBukti?: string;
  monthlyTargetOverride?: number;
  score?: number;
}

export type KpiData = {
  id: string; 
  employeeId: string;
  employeeName: string;
  company: string;
  department: string;
  position: string;
  level: 'Staff' | 'Supervisor' | 'Manager' | 'Direktur';
  reportsTo?: string;
  period: string;
  score: number;
  status: PerformanceStatus;
  achievements: KpiAchievement[];
  approvalStatus: ApprovalStatus;
  approvedBy?: string; 
  approvedAt?: string; 
};

export type KpiIndicatorCycle = 'Bulanan' | '3 Bulan' | '6 Bulan' | '1 Tahun';
export type CalculationMethod = 'Target Maksimal' | 'Target Minimal' | 'Target Mutlak' | 'Target Limit';

export type KpiIndicator = {
    id: string;
    code?: string;
    category: string;
    indicator: string;
    measurement: string;
    target: number;
    targetFormat: 'Numerik' | 'Persentase';
    unit: string;
    weight: number;
    cycle: KpiIndicatorCycle;
    calculationMethod?: CalculationMethod;
    rollup?: {
        enabled: boolean;
        method: 'SUM' | 'AVERAGE'; 
    };
    source?: {
        indicatorId: string;
        employeeId: string; 
    };
    targetOverrides?: {
      [employeeId: string]: number;
    };
    isCascaded?: boolean;
    targetAllocations?: {
      [companyName: string]: {
          target?: number;
          position?: string;
      };
    };
    reasoning?: string; 
};

export type KpiInputDeadlineConfig = {
  type: 'specific_date' | 'last_day' | 'relative_to_end';
  value: number; 
};

export type KpiSetup = {
    id: string;
    company: string; 
    position: string;
    department: string;
    level: 'Staff' | 'Supervisor' | 'Manager' | 'Direktur';
    status: 'Aktif' | 'Tidak Aktif';
    validFrom: string; 
    validFromDate?: Date;
    validTo: string; 
    validToDate?: Date;
    description: string;
    minAchievement?: number;
    kpiInputDeadline?: KpiInputDeadlineConfig;
    indicators: KpiIndicator[];
    pendingIndicators?: KpiIndicator[];
    isHolding?: boolean; 
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  title?: string;
  description: string;
  subscriptionDescription?: string;
  price: number;
  userLimit: number; 
  managementUserLimit: number; 
  companyLimit: number; 
  durationDays: number;
  status: 'Active' | 'Draft';
  benefitList?: string[];
  features: {
    allowHolding: boolean;
    allowKpi: boolean;
    allowKbo: boolean;
    allowReporting: boolean;
    allowLms: boolean;
    allowCollabSpace: boolean;
    allowOkr: boolean;
    allowAiFeatures: boolean;
    allowDocumentManagement: boolean;
  };
};

export type Company = {
  id: string;
  name: string;
  businessField: string;
  address: string;
  status: 'Aktif' | 'Tidak Aktif' | 'Menunggu Persetujuan';
  parentId?: string;
  isHolding?: boolean;
  canBecomeHolding?: boolean;
  subscriptionPlanId?: string; 
  subscriptionActivationDate?: string; 
  subscriptionExpiryDate?: string; 
  customPrice?: number;
  customUserLimit?: number;
  customManagementUserLimit?: number;
  customCompanyLimit?: number;
  // --- New Modular Subscriptions ---
  moduleSubscriptions?: Record<ModuleId, ModuleSubscription>;
  usedTrials?: ModuleId[]; // Track modules already trialed
  features?: {
    hasAiKpiWizard?: boolean;
    hasPageAssistant?: boolean;
    hasFeedbackCoach?: boolean;
    hasKpiSuggestion?: boolean;
    hasScenarioPlanner?: boolean;
  };
};

export type Department = {
  id: string;
  name: string;
  company: string; 
};

export type UserOption = {
    id: string;
    name: string;
};

export type UserOptionValue = {
    id: string;
    name: string;
};

export type Position = {
  id: string;
  name: string;
  department: string;
  company: string; 
};

export type Notification = {
    id: string;
    recipientId: string; 
    senderName: string; 
    message: string; 
    category: string; 
    link: string; 
    timestamp: any; 
    isRead: boolean;
};

export type NotificationTemplate = {
  id: string;
  name: string;
  company: 'Global';
  triggerEventId: string;
  triggerCondition: 'before_start' | 'on_start' | 'on_end';
  triggerOffsetDays: number;
  channel: 'app' | 'email' | 'both';
  recipientTarget: 'subject' | 'supervisor' | 'management';
  subject: string;
  message: string;
  status: 'Active' | 'Draft';
  isDefault?: boolean;
};

export type TargetOverride = {
  id: string; 
  overrides: {
    [indicatorId: string]: number;
  };
};

export type RaterType = 'self' | 'supervisor' | 'peer' | 'subordinate';

export type KboComponent = {
  kboSetupIds?: string[];
  weight?: number;
};

export type AppraisalComponents = {
  kpiWeight: number;
  kboWeight: number;
  kbo: Record<string, KboComponent>;
};

export type RaterSelection = { id: string, name: string };

export type AppraisalRaterMapping = {
  isSubjectActive?: boolean; 
  selfEnabled?: boolean;
  supervisorId?: string | null;
  peers?: RaterSelection[];
  subordinates?: RaterSelection[];
};

export type IndividualWeightOverride = {
  kpiWeight: number;
  kboWeight: number;
  okrWeight: number;
};

export type AppraisalSetup = {
  id: string;
  company: string;
  period?: string; 
  periodStart?: string; 
  periodEnd?: string; 
  cycle: 'Bulanan' | 'Triwulan' | 'Semesteran' | 'Tahunan';
  status: 'Aktif' | 'Tidak Aktif';
  
  activeLevels: (keyof Employee['level'])[];

  componentsByLevel: {
    Direktur: AppraisalComponents;
    Manager: AppraisalComponents;
    Supervisor: AppraisalComponents;
    Staff: AppraisalComponents;
  };

  customRaterMappings?: {
    [kboSetupId: string]: {
      [subjectId: string]: AppraisalRaterMapping;
    }
  };

  individualWeightOverrides?: {
    [employeeId: string]: IndividualWeightOverride;
  };
};

export type KboAssessmentSelection = {
  [keyBehaviorId: string]: string; 
};

export type KboAssessment = {
  id: string; 
  setupId: string;
  subjectId: string;
  raterId: string;
  company: string;
  companyLower: string; 
  assessments: {
    [kboSetupId: string]: {
      selections: KboAssessmentSelection;
      totalScore: number;
      notes?: string;
    };
  };
  timestamp: any; 
};

export type AppraisalTask = {
  id: string; 
  setupId: string;
  subjectId: string;
  subjectName: string;
  raterId: string;
  company: string;
  status: 'pending' | 'completed';
  periodStart: string; 
  periodEnd: string; 
  kboSetupId: string;
}

// --- LMS ---
export type TopicQuizQuestion = {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number; 
};

export type LmsTopic = {
  id: string;
  title: string;
  contentType: 'text' | 'video' | 'link';
  content: string; 
  description?: string; 
  hideVideoControls?: boolean;
  quiz?: TopicQuizQuestion;
  workbookUrl?: string;
};

export type LmsModule = {
  id: string;
  title: string;
  topics: LmsTopic[];
  preTestQuizId?: string; 
  postTestQuizId?: string; 
  passingScore?: number; 
  weight?: number; 
};

export type LmsQuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; 
  points: number;
};

export type LmsQuiz = {
  id: string;
  title: string;
  passingScore: number;
  questions: LmsQuizQuestion[];
  company: string; 
};

export type CourseTargetAudience = {
  departments?: string[];
  positions?: string[];
  levels?: ('Staff' | 'Supervisor' | 'Manager' | 'Direktur')[];
  employees?: string[]; 
};

export type Course = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  categories?: string[];
  status: 'draft' | 'published';
  targetAudience: CourseTargetAudience;
  modules: LmsModule[];
  preTestQuizId?: string;
  postTestQuizId?: string;
  postTestPassingScore?: number; 
  isProgram?: boolean; 
  createdBy: string;
  createdAt: any;
  company: string;
};

export type EnrollmentTopicStatus = {
  status: 'completed';
  completedAt: any; 
  quizPassed?: boolean;
};

export type EnrollmentModuleScore = {
    moduleId: string;
    preTestScore?: number;
    postTestScore?: number;
    finalScore: number; 
};

export interface Enrollment {
  id: string; 
  courseId: string;
  employeeId: string;
  status: 'not-started' | 'in-progress' | 'completed';
  progress: number; 
  preTestScore?: number;
  postTestScore?: number;
  moduleScores?: EnrollmentModuleScore[]; 
  totalTimeSpent?: number; 
  startedAt?: any;
  completedAt?: any;
  topicStatus: { [topicId: string]: EnrollmentTopicStatus };
  getFinalScore: (course: Course | null) => number;
};

export const enrollmentWithMethods = (enrollment: Omit<Enrollment, 'getFinalScore'>): Enrollment => ({
  ...enrollment,
  getFinalScore: function(course: Course | null): number {
    if (!course) return 0;
    
    if (course.isProgram && this.moduleScores) {
      const totalWeightedScore = this.moduleScores.reduce((acc, moduleScore) => {
        const moduleDetails = course.modules.find(m => m.id === moduleScore.moduleId);
        const weight = moduleDetails?.weight ?? 0;
        return acc + ((moduleScore.postTestScore ?? 0) * (weight / 100));
      }, 0);
      return totalWeightedScore;
    }
    
    const preTest = this.preTestScore ?? 0;
    const postTest = this.postTestScore ?? 0;
    return (postTest * 0.7) + (preTest * 0.3);
  },
});

// --- Document Management Types ---
export type DocumentCategory = "Kontrak Kerja" | "Surat Keputusan" | "Offering Letter" | "Job Description" | "Standard Operating Procedure" | "Memo Internal" | "Perjanjian Kerahasiaan" | "Lainnya";

export type Variable = {
    key: string;
    label: string;
    type: 'string' | 'number' | 'date';
};

export type DocumentTemplate = {
  id: string;
  name: string;
  category: DocumentCategory;
  sourceType?: 'internal' | 'external' | 'docx';
  externalUrl?: string;
  fileUrl?: string;
  fileName?: string;
  variables?: Variable[];
  company: string;
  contentHtml?: string;
  pages: DocumentPage[];
  headerLayout?: 'standard' | 'minimalist' | 'headerFocus';
  logoUrl?: string;
  companyInfo?: string;
  footerContent?: string;
  createdAt: any;
  createdBy: string;
  updatedAt?: any;
};

export type DocumentPage = {
  id: string;
  name: string;
  contentHtml: string;
};

export type Document = {
  id: string;
  title: string;
  category: string;
  employeeId: string;
  employeeName: string;
  company: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  uploadedBy: string; 
  uploadedAt: any; 
};


// --- Learning Program Types ---
export const ProgramActivityTypeSchema = z.enum([
  'LMS_COURSE',
  'LMS_QUIZ',
  'OFFLINE_EVENT',
  'ONLINE_MEETING',
  'SUBMISSION_TASK'
]);
export type ProgramActivityType = z.infer<typeof ProgramActivityTypeSchema>;

export const ProgramActivitySchema = z.object({
  id: z.string().default(() => `act_${Date.now()}`),
  title: z.string().min(1, "Judul aktivitas harus diisi."),
  type: ProgramActivityTypeSchema,
  resourceId: z.string().default(''),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  reminderDays: z.coerce.number().default(0),
  reminderType: z.enum(['NONE', 'APP', 'EMAIL', 'BOTH']).default('APP'),
  passingCriteria: z.object({
    score: z.coerce.number().min(0).max(100).default(80),
    attendance: z.boolean().default(false),
    approved: z.boolean().default(false),
  }).default({score: 80, attendance: false, approved: false}),
  onFail: z.object({
    action: z.enum(['RETRY', 'REDIRECT_TO_PROGRAM', 'FAIL_PROGRAM']),
    remedialProgramId: z.string().default(''),
  }).default({ action: 'RETRY', remedialProgramId: '' }),
});
export type ProgramActivity = z.infer<typeof ProgramActivitySchema>;

export const ProgramStageSchema = z.object({
  id: z.string().default(() => `stage_${Date.now()}`),
  title: z.string().min(1, "Judul tahapan harus diisi."),
  description: z.string().default(''),
  activities: z.array(ProgramActivitySchema).min(1, "Minimal harus ada satu aktivitas per tahap."),
});
export type ProgramStage = z.infer<typeof ProgramStageSchema>;

export const LearningProgramSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Nama program harus diisi."),
  description: z.string().default(''),
  company: z.string().min(1, "Perusahaan harus dipilih."),
  targetAudience: z.object({
    departments: z.array(z.string()).default([]),
    positions: z.array(z.string()).default([]),
    levels: z.array(z.string()).default([]),
    employees: z.array(z.string()).default([]),
  }).default({}),
  stages: z.array(ProgramStageSchema).min(1, "Minimal harus ada satu tahapan dalam program."),
  status: z.enum(['draft', 'published']).default('draft'),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
});
export type LearningProgram = z.infer<typeof LearningProgramSchema>;

export type ProgramFormValues = z.infer<typeof LearningProgramSchema>;

// --- AI Knowledge Base ---
export type KnowledgeItemType = 'System Prompt' | 'User Context Prompt' | 'Task Prompt' | 'Constraint / Rule' | 'Validation Rule' | 'Output Formatter';

export type KnowledgeItem = {
    id: string;
    type: KnowledgeItemType;
    content: string;
};

export type AiTool = {
  id: string;
  name: string;
  knowledgeItems: KnowledgeItem[];
  createdAt?: any;
  createdBy?: string;
};

// --- System Settings ---
export type ApiConfig = {
  id: 'apiConfig';
  googleAIApiKey: string;
};

// --- AI Flow Schemas ---
export const SuggestKpiIndicatorsInputSchema = z.object({
  jobTitle: z.string().describe('Jabatan karyawan.'),
  department: z.string().describe('Departemen karyawan.'),
});
export type SuggestKpiIndicatorsInput = z.infer<typeof SuggestKpiIndicatorsInputSchema>;

export const SuggestKpiIndicatorsOutputSchema = z.object({
  kpiSuggestions: z
    .array(z.string())
    .describe('Daftar indikator KPI yang disarankan.'),
});
export type SuggestKpiIndicatorsOutput = z.infer<
  typeof SuggestKpiIndicatorsOutputSchema
>;

export const ChatMessageSchema = z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ConversationalAssistantInputSchema = z.object({
  pagePath: z.string().describe('Path URL dari halaman saat ini.'),
  pageTitle: z.string().describe('Judul dari halaman saat ini.'),
  userRole: z.string().describe('Peran pengguna yang bertanya.'),
  userName: z.string().describe('Nama pengguna yang bertanya.'),
  question: z.string().describe('Pertanyaan dari pengguna.'),
  history: z.array(ChatMessageSchema).describe('Riwayat percakapan sebelumnya.'),
});
export type ConversationalAssistantInput = z.infer<typeof ConversationalAssistantInputSchema>;

export const ConversationalAssistantOutputSchema = z.object({
  answer: z.string().describe('Jawaban yang dihasilkan AI dalam format Markdown sederhana.'),
});
export type ConversationalAssistantOutput = z.infer<typeof ConversationalAssistantOutputSchema>;

export const AchievementDetailSchema = z.object({
  indicatorName: z.string().describe('Nama indikator kinerja.'),
  category: z.string().describe('Kategori dari indikator ini.'),
  target: z.string().describe('Target bulanan untuk indikator ini.'),
  actual: z.string().describe('Pencapaian aktual untuk indikator ini.'),
  score: z.number().describe('Skor yang didapat untuk indikator ini.'),
  weight: z.number().describe('Bobot dari indikator ini.'),
});

export const KpiFeedbackInputSchema = z.object({
  employeeName: z.string().describe('Nama karyawan.'),
  overallScore: z.coerce.number().describe('Skor KPI total karyawan.'),
  performanceStatus: z.string().describe('Status kinerja keseluruhan (cth., Mencapai Target).'),
  achievements: z.array(AchievementDetailSchema).describe('Daftar rincian pencapaian per indikator.'),
});
export type KpiFeedbackInput = z.infer<typeof KpiFeedbackInputSchema>;

export const KpiFeedbackOutputSchema = z.object({
  feedback: z.string().describe('Umpan balik yang dihasilkan dalam format Markdown.'),
});
export type KpiFeedbackOutput = z.infer<typeof KpiFeedbackOutputSchema>;

export const KpiWizardInputSchema = z.object({
  phase: z.enum(["INTERVIEW", "DESIGN", "INITIALIZE"]),
  context: z.object({
    jobTitle: z.string(),
    department: z.string(),
    jobLevel: z.enum(['Staff', 'Supervisor', 'Manager', 'Direktur']),
    company: z.string(),
  }),
  companyObjectives: z.array(z.object({
    objectiveName: z.string(),
    bscPerspective: z.string(),
  })),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional(),
});
export type KpiWizardInput = z.infer<typeof KpiWizardInputSchema>;

export const InterviewPhaseOutputSchema = z.object({
  phase: z.literal("INTERVIEW"),
  responseText: z.string().describe("KIPI's next question or statement to the user."),
  nextInputType: z.enum(['textarea', 'checkbox_financial', 'radio_customer', 'none']).describe("The type of input field the UI should render for the user's next response."),
  isFinished: z.boolean().describe("Set to true only when all necessary information has been gathered."),
});
export type InterviewPhaseOutput = z.infer<typeof InterviewPhaseOutputSchema>;


export const DesignPhaseOutputSchema = z.object({
  phase: z.literal("DESIGN"),
  suggestions: z.array(z.object({
    indicator: z.string().describe('The specific and measurable Key Performance Indicator.'),
    category: z.enum(["Financial", "Customer & Market", "Internal Business Process", "Learning & Growth"]),
    measurement: z.string().describe('How to measure this KPI.'),
    target: z.coerce.number().describe('A suggested numerical target for a standard cycle (e.g., yearly).'),
    targetFormat: z.enum(['Numerik', 'Persentase']),
    unit: z.string().describe('The unit of measurement (e.g., "Juta Rupiah", "%", "Hari", "Poin").'),
    cycle: z.enum(['Bulanan', '3 Bulan', '6 Bulan', '1 Tahun']).default('Bulanan'),
    reasoning: z.string().describe('A brief explanation of why this KPI is relevant based on the inputs.'),
  })).describe('A list of detailed KPI suggestions.'),
});
export type DesignPhaseOutput = z.infer<typeof DesignPhaseOutputSchema>;

export const PageContextInputSchema = z.object({
  pagePath: z.string().describe('Path URL dari halaman saat ini, contoh: /reports'),
  pageTitle: z.string().describe('Judul dari halaman saat ini, contoh: Laporan Tim'),
  userRole: z.string().describe('Peran pengguna yang sedang melihat halaman, contoh: atasan, superadmin'),
  userName: z.string().describe('Nama pengguna yang sedang berinteraksi.'),
});
export type PageContextInput = z.infer<typeof PageContextInputSchema>;

export const PageExplanationOutputSchema = z.object({
  explanation: z.string().describe('Penjelasan singkat dan ramah yang dihasilkan AI dalam format Markdown sederhana.'),
});
export type PageExplanationOutput = z.infer<typeof PageExplanationOutputSchema>;

export const KpiInfoSchema = z.object({
  indicator: z.string().describe('Nama indikator KPI.'),
  category: z.string().describe('Kategori dari KPI ini.'),
  target: z.string().describe('Target saat ini untuk indikator ini.'),
  weight: z.number().describe('Bobot dari KPI ini dalam persen.'),
  averageScore: z.number().describe('Skor rata-rata tim untuk KPI ini pada periode terakhir.'),
});

export const ScenarioPlannerInputSchema = z.object({
  scenarioDescription: z.string().describe('Skenario "bagaimana jika" yang diajukan oleh pengguna/manajer.'),
  teamContext: z.array(KpiInfoSchema).describe('Daftar KPI yang relevan untuk tim yang sedang dianalisis.'),
});
export type ScenarioPlannerInput = z.infer<typeof ScenarioPlannerInputSchema>;

export const ScenarioPlannerOutputSchema = z.object({
  analysis: z.string().describe('Analisis yang dihasilkan dalam format Markdown.'),
});
export type ScenarioPlannerOutput = z.infer<typeof ScenarioPlannerOutputSchema>;

export const SituationalAwarenessInputSchema = z.object({
  userName: z.string().describe('Nama pengguna yang sedang berinteraksi.'),
  pageTitle: z.string().describe('Judul halaman yang sedang dilihat pengguna.'),
  situationDescription: z.string().describe('Deskripsi singkat tentang apa yang sedang dilihat atau dilakukan pengguna.'),
  data: z.record(z.any()).optional().describe('Data numerik atau tekstual yang relevan with situasi tersebut. Contoh: { "averageScore": 85, "remainingTarget": 215000000 }'),
});
export type SituationalAwarenessInput = z.infer<typeof SituationalAwarenessInputSchema>;

export const CustomSituationalAwarenessOutputSchema = z.object({
  comment: z.string().describe('Komentar singkat, proaktif, dan ramah yang dihasilkan AI dalam format Markdown sederhana.'),
});
export type SituationalAwarenessOutput = z.infer<typeof CustomSituationalAwarenessOutputSchema>;
