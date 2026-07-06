
// src/lib/nav-items.ts
import type { UserRole, Company, SubscriptionPlan, Employee, OKR, ModuleId } from "@/types";
import { 
    LayoutDashboard,
    Home,
    LayoutGrid,
    ShieldCheck,
    UserCheck,
    CheckCircle,
    Crown,
    History,
    GitBranch,
    Zap,
    Sliders,
    Building2,
    BarChart3,
    Briefcase,
    Users,
    GitFork,
    Folder,
    BookMarked,
    BrainCircuit,
    PieChart,
    Target,
    Image,
    Network,
    MonitorPlay,
    Activity,
    Settings2,
    FilePlus,
    Settings,
    Flag,
    GraduationCap,
    BookOpen,
    Map,
    Library,
    FileQuestion,
    Files,
    FileText,
    ShoppingCart,
    ChevronLeft,
    MoreHorizontal,
    ClipboardCheck,
    UserCircle,
    LineChart,
    Inbox,
    Search,
    BadgeCheck,
    Layers,
    CalendarDays
} from "lucide-react";

/**
 * Map ikon menggunakan Lucide React (Outline style).
 * Sesuai standar Enterprise SaaS (Linear, Stripe).
 */
export const iconMap: { [key: string]: React.ElementType } = {
    '/dashboard': LayoutDashboard,
    '/action-center': Home,
    '/workspace': LayoutGrid,
    '/beranda': Home,
    '/admin-management': ShieldCheck,
    '/company-admin-management': UserCheck,
    '/activation-management': CheckCircle,
    '/subscription-management': Crown,
    '/subscription-logs': History,
    '/group-management': GitBranch,
    'sistem': Sliders,
    'data': Layers,
    '/master-data/company': Building2,
    '/master-data/departments': Network,
    '/master-data/positions': Briefcase,
    '/master-data/employees': Users,
    '/master-data/hierarchy': GitFork,
    '/master-data/kpi-categories': Folder,
    '/master-data/kbo-categories': BookMarked,
    '/master-data/kbo-competencies': BrainCircuit,
    '/master-data/kpi-data': Search,
    '/master-data/company-objectives': Target,
    '/media-library': Image,
    'holding': Network,
    '/holding-dashboard': BarChart3,
    '/holding-kpi-setup': Settings,
    '/holding-group-management': Users,
    '/holding-management': Network,
    '/collab-space': MonitorPlay,
    '/collab-space/management': Settings2,
    '/collab-space/reports': PieChart,
    'analisis': BarChart3,
    '/reports': PieChart,
    '/cycle-reports': Activity,
    '/appraisal-dashboard': BarChart3,
    '/kbo-appraisal': BadgeCheck,
    'kpi': ClipboardCheck,
    'kbo': ShieldCheck,
    'okr': Target,
    'appraisal': ClipboardCheck,
    '/my-performance': UserCircle,
    '/input-achievement': FilePlus,
    '/setup-kpi': Settings,
    '/appraisal-settings': Settings,
    '/okr': Flag,
    '/okr/reports': LineChart,
    '/okr/progress': ClipboardCheck,
    'lms': GraduationCap,
    'manajemen-pembelajaran': GraduationCap,
    '/lms/admin/dashboard': LayoutDashboard,
    '/lms/admin/courses': BookOpen,
    '/lms/admin/programs': Map,
    '/lms/admin/global-catalog': Library,
    '/lms/admin/quizzes': FileQuestion,
    '/lms/admin/reports': BarChart3,
    '/lms/user/my-learnings': BookOpen,
    'dokumen': Files,
    '/document-management/templates': FileText,
    '/document-management/contracts': Inbox,
    '/subscription-status': Crown,
    '/subscription-plans': ShoppingCart,
    '/settings': Settings,
    'default': Folder,
    'more': MoreHorizontal,
    'portal': ChevronLeft,
};

/**
 * Mendeteksi modul aktif berdasarkan path URL saat ini.
 */
export function getActiveModuleFromPath(pathname: string): ModuleId | 'foundation' | 'holding' | 'billing' | 'admin' | 'settings' | null {
  if (
    pathname.startsWith('/action-center') || 
    pathname.startsWith('/reports') || 
    pathname.startsWith('/cycle-reports') || 
    pathname.startsWith('/appraisal') || 
    pathname.startsWith('/kbo-appraisal') || 
    pathname.startsWith('/input-achievement') || 
    pathname.startsWith('/setup-kpi') ||
    pathname.startsWith('/okr') ||
    pathname.startsWith('/master-data/kpi-') ||
    pathname.startsWith('/master-data/kbo-') ||
    pathname.startsWith('/appraisal-settings')
  ) {
    return 'appraisal';
  }
  
  if (pathname.startsWith('/lms')) {
    return 'lms';
  }
  
  if (pathname.startsWith('/collab-space')) {
    return 'collabspace';
  }
  
  if (pathname.startsWith('/master-data') || pathname.startsWith('/media-library')) {
    return 'foundation';
  }
  
  if (pathname.startsWith('/holding')) {
    return 'holding';
  }

  if (pathname.startsWith('/subscription-status')) return 'billing';
  if (pathname.startsWith('/company-admin-management')) return 'admin';
  if (pathname.startsWith('/settings')) return 'settings';

  return null;
}

export function getNavItems(
    userRole: UserRole, 
    hasSubordinates: boolean, 
    userCompany: Company | null | undefined, 
    subscriptionPlan: SubscriptionPlan | null | undefined, 
    isMobile: boolean, 
    currentUser?: Employee | null, 
    okrs?: OKR[],
    activeModule?: ModuleId | 'foundation' | 'holding' | 'billing' | 'admin' | 'settings' | null
) {
    if (!userRole) return [];

    const isOkrParticipant = (currentUser && okrs) ? okrs.some(okr =>
        okr.status === 'Active' && (
            okr.ownerId === currentUser.id ||
            okr.keyResults.some(kr =>
                (kr.ownershipModel === 'single_owner' && (kr.ownerId || okr.ownerId) === currentUser.id) ||
                (kr.ownershipModel === 'delegated' && (kr.milestones?.some(m => m.ownerId === currentUser.id) || kr.checklist?.some(c => c.ownerId === currentUser.id))) ||
                (kr.ownershipModel === 'split_ownership' && kr.contributors?.some(c => c.ownerId === currentUser.id))
            )
        )
    ) : false;

    // --- SUPERADMIN SPECIFIC STRUCTURE ---
    if (userRole === 'superadmin') {
        return [
            { href: '/dashboard', label: 'Workbench', iconName: '/dashboard', moduleId: 'workbench' },
            {
                label: 'Sistem',
                iconName: 'sistem',
                subItems: [
                    { href: '/admin-management', label: 'Admin', iconName: '/admin-management' },
                    { href: '/company-admin-management', label: 'Klien', iconName: '/company-admin-management' },
                    { href: '/subscription-management', label: 'Pricing', iconName: '/subscription-management' },
                    { href: '/subscription-logs', label: 'Log', iconName: '/subscription-logs' },
                    { href: '/group-management', label: 'Grup', iconName: '/group-management' },
                ]
            },
            {
                label: 'Data',
                iconName: 'data',
                subItems: [
                    { href: '/master-data/company', label: 'Klien', iconName: '/master-data/company' },
                    { href: '/master-data/company-objectives', label: 'Tujuan', iconName: '/master-data/company-objectives' },
                    { href: '/master-data/departments', label: 'Dept', iconName: '/master-data/departments' },
                    { href: '/master-data/positions', label: 'Jabatan', iconName: '/master-data/positions' },
                    { href: '/master-data/employees', label: 'Staff', iconName: '/master-data/employees' },
                    { href: '/master-data/hierarchy', label: 'Struktur', iconName: '/master-data/hierarchy' },
                    { href: '/media-library', label: 'Media', iconName: '/media-library' },
                ]
            },
            {
                label: 'Holding',
                iconName: 'holding',
                subItems: [
                    { href: '/holding-dashboard', label: 'Insight', iconName: '/holding-dashboard' },
                    { href: '/holding-kpi-setup', label: 'Setup', iconName: '/holding-kpi-setup' },
                    { href: '/holding-group-management', label: 'Unit', iconName: '/holding-group-management' },
                ]
            },
            {
                label: 'APPRAISAL',
                iconName: 'appraisal',
                subItems: [
                    { href: '/appraisal-dashboard', label: 'Analitik', iconName: '/appraisal-dashboard' },
                    { href: '/setup-kpi', label: 'KPI', iconName: '/setup-kpi' },
                    { href: '/master-data/kbo-competencies', label: 'KBO', iconName: 'manajemen-kbo' },
                    { href: '/okr', label: 'OKR', iconName: '/okr' },
                ]
            },
            {
                label: 'LMS',
                iconName: 'lms',
                subItems: [
                    { href: '/lms/admin/dashboard', label: 'Insight', iconName: '/lms/admin/dashboard' },
                    { href: '/lms/admin/courses', label: 'Kursus', iconName: '/lms/admin/courses' },
                    { href: '/lms/admin/programs', label: 'Program', iconName: '/lms/admin/programs' },
                    { href: '/lms/admin/quizzes', label: 'Kuis', iconName: '/lms/admin/quizzes' },
                    { href: '/lms/admin/reports', label: 'Laporan', iconName: '/lms/admin/reports' },
                ]
            },
            {
                label: 'Collab',
                iconName: '/collab-space',
                subItems: [
                    { href: '/collab-space/management', label: 'Manage', iconName: '/collab-space/management' },
                    { href: '/collab-space/reports', label: 'Laporan', iconName: '/collab-space/reports' },
                    { href: '/collab-space', label: 'Mine', iconName: '/collab-space' },
                ]
            },
            {
                label: 'Dokumen',
                iconName: 'dokumen',
                subItems: [
                    { href: '/document-management/templates', label: 'Template', iconName: '/document-management/templates' },
                    { href: '/document-management/contracts', label: 'Arsip', iconName: '/document-management/contracts' },
                ]
            },
            { href: '/settings', label: 'Settings', iconName: '/settings', moduleId: 'settings' },
        ];
    }

    // --- MANAJEMEN & USER STRUCTURE ---
    const capabilities = {
      isSuperAdmin: userRole === 'superadmin',
      isCompanyAdmin: userRole === 'manajemen',
      isDeptHead: hasSubordinates,
      isManager: userRole === 'manajemen' || hasSubordinates,
      isHolding: userCompany?.isHolding === true,
      canAccessKpi: true,
      canAccessKbo: true,
      canAccessOkr: true,
      canAccessLms: true,
      canAccessCollabSpace: true,
      canAccessDocs: true,
      canAccessReports: true,
      isOkrParticipant: isOkrParticipant,
    };
    
    const allNavItems = [
        { href: '/action-center', label: 'Beranda', show: !capabilities.isSuperAdmin && !capabilities.isCompanyAdmin, iconName: '/action-center', moduleId: 'appraisal' },
        { 
            label: 'Data', 
            iconName: 'data', 
            show: capabilities.isCompanyAdmin,
            moduleId: 'foundation',
            subItems: [
                { href: '/master-data/company-objectives', label: 'Tujuan', show: true, iconName: '/master-data/company-objectives', moduleId: 'foundation' },
                { href: '/master-data/departments', label: 'Dept', show: true, iconName: '/master-data/departments', moduleId: 'foundation' },
                { href: '/master-data/positions', label: 'Jabatan', show: true, iconName: '/master-data/positions', moduleId: 'foundation' },
                { href: '/master-data/employees', label: 'Staff', show: true, iconName: '/master-data/employees', moduleId: 'foundation' },
                { href: '/master-data/hierarchy', label: 'Struktur', show: true, iconName: '/master-data/hierarchy', moduleId: 'foundation' }, 
                { href: '/media-library', label: 'Media', show: true, iconName: '/media-library', moduleId: 'foundation' },
            ] 
        },

        { 
            label: 'Holding', 
            iconName: 'holding', 
            show: (capabilities.isCompanyAdmin && capabilities.isHolding),
            moduleId: 'holding',
            subItems: [
                { href: '/holding-dashboard', label: 'Insight', show: true, iconName: '/holding-dashboard', moduleId: 'holding' },
                { href: '/holding-kpi-setup', label: 'Setup', show: true, iconName: '/holding-kpi-setup', moduleId: 'holding' },
                { href: '/holding-group-management', label: 'Unit', show: true, iconName: '/holding-group-management', moduleId: 'holding' },
            ] 
        },

        { 
            label: 'Collab', 
            iconName: '/collab-space', 
            show: capabilities.canAccessCollabSpace,
            moduleId: 'collabspace',
            subItems: [
                { href: '/collab-space', label: 'Mine', show: true, iconName: '/collab-space', moduleId: 'collabspace' },
                { href: '/collab-space/management', label: 'Manage', show: capabilities.isCompanyAdmin, iconName: '/collab-space/management', moduleId: 'collabspace' },
                { href: '/collab-space/reports', label: 'Report', show: capabilities.isManager, iconName: '/collab-space/reports', moduleId: 'collabspace' },
            ]
        },

        {
            label: 'APPRAISAL',
            iconName: 'appraisal',
            show: capabilities.canAccessKpi || capabilities.canAccessKbo || capabilities.canAccessOkr,
            moduleId: 'appraisal',
            subItems: [
                { href: '/appraisal-dashboard', label: 'Analitik', show: capabilities.canAccessReports && (capabilities.isDeptHead || capabilities.isCompanyAdmin), iconName: 'analisis', moduleId: 'appraisal' },
                { href: '/setup-kpi', label: 'KPI', show: capabilities.canAccessKpi, iconName: 'kpi', moduleId: 'appraisal' },
                { href: '/master-data/kbo-competencies', label: 'KBO', show: capabilities.canAccessKbo && capabilities.isCompanyAdmin, iconName: 'kbo', moduleId: 'appraisal' },
                { href: '/okr', label: 'OKR', show: capabilities.canAccessOkr && capabilities.isCompanyAdmin, iconName: 'okr', moduleId: 'appraisal' },
                { href: '/okr/progress', label: 'Progres OKR', show: !capabilities.isCompanyAdmin && capabilities.isOkrParticipant, iconName: '/okr/progress', moduleId: 'appraisal' },
                { href: '/my-performance', label: 'Performa Saya', show: !capabilities.isCompanyAdmin && !capabilities.isSuperAdmin, iconName: '/my-performance', moduleId: 'appraisal' },
                { href: '/input-achievement', label: 'Input Realisasi', show: capabilities.canAccessKpi, iconName: '/input-achievement', moduleId: 'appraisal' },
            ]
        },

        { 
            label: 'LMS', 
            iconName: 'lms', 
            show: !capabilities.isCompanyAdmin && capabilities.canAccessLms,
            moduleId: 'lms',
            subItems: [
                { href: '/lms/user/my-learnings', label: 'Materi', show: true, iconName: '/lms/user/my-learnings', moduleId: 'lms' },
            ]
        },
        { 
            label: 'Akademi', 
            iconName: 'manajemen-pembelajaran', 
            show: capabilities.canAccessLms && capabilities.isCompanyAdmin,
            moduleId: 'lms',
            subItems: [
                { href: '/lms/admin/dashboard', label: 'Insight', show: true, iconName: '/lms/admin/dashboard', moduleId: 'lms' },
                { href: '/lms/admin/courses', label: 'Kursus', show: true, iconName: '/lms/admin/courses', moduleId: 'lms' },
                { href: '/lms/admin/programs', label: 'Program', show: true, iconName: '/lms/admin/programs', moduleId: 'lms' },
                { href: '/lms/admin/quizzes', label: 'Kuis', show: true, iconName: '/lms/admin/quizzes', moduleId: 'lms' },
                { href: '/lms/admin/reports', label: 'Laporan', show: true, iconName: '/lms/admin/reports', moduleId: 'lms' },
            ]
        },

        {
            label: 'Dokumen',
            iconName: 'dokumen',
            show: capabilities.canAccessDocs,
            moduleId: 'documents',
            subItems: [
                { href: '/document-management/templates', label: 'Template', show: true, iconName: '/document-management/templates', moduleId: 'documents' },
                { href: '/document-management/contracts', label: 'Arsip', show: true, iconName: '/document-management/contracts', moduleId: 'documents' },
            ]
        },
        
        { href: '/subscription-status', label: 'Billing', show: capabilities.isCompanyAdmin, iconName: '/subscription-status', moduleId: 'billing' },
        { href: '/company-admin-management', label: 'Admin', show: capabilities.isCompanyAdmin, iconName: '/company-admin-management', moduleId: 'admin' },
        { href: '/settings', label: 'Settings', iconName: '/settings', moduleId: 'settings' },
    ];

    let visibleItems = allNavItems
        .filter(item => (item as any).show !== false)
        .map(item => {
            if (item.subItems) {
                const visibleSubItems = item.subItems.filter(sub => (sub as any).show !== false);
                if (visibleSubItems.length === 0) return null;
                return { ...item, subItems: visibleSubItems };
            }
            return item;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

    // --- STRICT CONTEXTUAL FILTERING (Non-Superadmin) ---
    // Change: Always apply filtering for non-superadmins. 
    // If no activeModule is detected, only show "settings" or empty.
    if (userRole !== 'superadmin') {
        visibleItems = visibleItems.filter(item => {
            const itemModule = (item as any).moduleId;
            if (activeModule) {
                if (itemModule === activeModule) return true;
                if (item.subItems && item.subItems.some(sub => (sub as any).moduleId === activeModule)) return true;
            }
            // Fallback: Always allow settings and admin access for Manajemen
            if (itemModule === 'settings' || (itemModule === 'admin' && userRole === 'manajemen')) return true;
            return false;
        });
    }

    return visibleItems;
}
