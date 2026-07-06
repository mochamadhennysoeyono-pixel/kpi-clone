
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
    'manajemen-sistem': Sliders,
    'pusat-data': Layers,
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
    'pusat-holding': Network,
    '/holding-dashboard': BarChart3,
    '/holding-kpi-setup': Settings,
    '/holding-group-management': Users,
    '/holding-management': Network,
    '/collab-space': MonitorPlay,
    '/collab-space/management': Settings2,
    '/collab-space/reports': PieChart,
    'analisis-laporan': BarChart3,
    '/reports': PieChart,
    '/cycle-reports': Activity,
    '/appraisal-dashboard': BarChart3,
    '/kbo-appraisal': BadgeCheck,
    'manajemen-kpi': ClipboardCheck,
    'manajemen-kbo': ShieldCheck,
    'okr-management': Target,
    '/my-performance': UserCircle,
    '/input-achievement': FilePlus,
    '/setup-kpi': Settings,
    '/appraisal-settings': Settings,
    '/okr': Flag,
    '/okr/reports': LineChart,
    '/okr/progress': ClipboardCheck,
    'lms-portal': GraduationCap,
    'lms-user': BookOpen,
    'manajemen-pembelajaran': GraduationCap,
    '/lms/admin/dashboard': LayoutDashboard,
    '/lms/admin/courses': BookOpen,
    '/lms/admin/programs': Map,
    '/lms/admin/global-catalog': Library,
    '/lms/admin/quizzes': FileQuestion,
    '/lms/admin/reports': BarChart3,
    '/lms/user/my-learnings': BookOpen,
    'manajemen-dokumen': Files,
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
export function getActiveModuleFromPath(pathname: string): ModuleId | 'foundation' | 'holding' | null {
  if (
    pathname.startsWith('/action-center') || 
    pathname.startsWith('/reports') || 
    pathname.startsWith('/cycle-reports') || 
    pathname.startsWith('/appraisal') || 
    pathname.startsWith('/kbo-appraisal') || 
    pathname.startsWith('/input-achievement') || 
    pathname.startsWith('/setup-kpi') ||
    pathname.startsWith('/okr')
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
    activeModule?: ModuleId | 'foundation' | 'holding' | null
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
            { href: '/dashboard', label: 'Workbench Bisnis', iconName: '/dashboard' },
            {
                label: 'Manajemen Sistem',
                iconName: 'manajemen-sistem',
                subItems: [
                    { href: '/admin-management', label: 'Pusat Admin Super', iconName: '/admin-management' },
                    { href: '/company-admin-management', label: 'Portfolio Klien', iconName: '/company-admin-management' },
                    { href: '/subscription-management', label: 'Pricing Global', iconName: '/subscription-management' },
                    { href: '/subscription-logs', label: 'Live Audit Trail', iconName: '/subscription-logs' },
                    { href: '/group-management', label: 'Arsitektur Holding', iconName: '/group-management' },
                ]
            },
            {
                label: 'Pusat Data',
                iconName: 'pusat-data',
                subItems: [
                    { href: '/master-data/company', label: 'Data Perusahaan', iconName: '/master-data/company' },
                    { href: '/master-data/company-objectives', label: 'Objective Strategis', iconName: '/master-data/company-objectives' },
                    { href: '/master-data/departments', label: 'Departemen', iconName: '/master-data/departments' },
                    { href: '/master-data/positions', label: 'Matriks Jabatan', iconName: '/master-data/positions' },
                    { href: '/master-data/employees', label: 'Direktori Karyawan', iconName: '/master-data/employees' },
                    { href: '/master-data/hierarchy', label: 'Struktur Organisasi', iconName: '/master-data/hierarchy' },
                    { href: '/media-library', label: 'Aset Digital', iconName: '/media-library' },
                ]
            },
            {
                label: 'Pusat Holding',
                iconName: 'pusat-holding',
                subItems: [
                    { href: '/holding-dashboard', label: 'Dasbor Agregat', iconName: '/holding-dashboard' },
                    { href: '/holding-kpi-setup', label: 'Setup KPI Induk', iconName: '/holding-kpi-setup' },
                    { href: '/holding-group-management', label: 'Manajemen Unit', iconName: '/holding-group-management' },
                ]
            },
            {
                label: 'Modul Appraisal',
                iconName: 'manajemen-kpi',
                subItems: [
                    { href: '/appraisal-dashboard', label: 'Dashboard Appraisal', iconName: '/appraisal-dashboard' },
                    { href: '/setup-kpi', label: 'Manajemen KPI', iconName: '/setup-kpi' },
                    { href: '/master-data/kbo-competencies', label: 'Manajemen KBO', iconName: 'manajemen-kbo' },
                    { href: '/okr', label: 'Manajemen OKR', iconName: '/okr' },
                ]
            },
            {
                label: 'Modul LMS',
                iconName: 'manajemen-pembelajaran',
                subItems: [
                    { href: '/lms/admin/dashboard', label: 'Insight Belajar', iconName: '/lms/admin/dashboard' },
                    { href: '/lms/admin/courses', label: 'Kurikulum', iconName: '/lms/admin/courses' },
                    { href: '/lms/admin/programs', label: 'Program Jalur Belajar', iconName: '/lms/admin/programs' },
                    { href: '/lms/admin/global-catalog', label: 'Katalog Standar', iconName: '/lms/admin/global-catalog' },
                    { href: '/lms/admin/quizzes', label: 'Bank Soal Kuis', iconName: '/lms/admin/quizzes' },
                    { href: '/lms/admin/reports', label: 'Matriks Kelulusan', iconName: '/lms/admin/reports' },
                ]
            },
            {
                label: 'Modul CollabSpace',
                iconName: '/collab-space',
                subItems: [
                    { href: '/collab-space/management', label: 'Manajemen Ruangan', iconName: '/collab-space/management' },
                    { href: '/collab-space/reports', label: 'Analitik Tugas', iconName: '/collab-space/reports' },
                    { href: '/collab-space', label: 'Ruangan Saya', iconName: '/collab-space' },
                ]
            },
            {
                label: 'Pusat Dokumen',
                iconName: 'manajemen-dokumen',
                subItems: [
                    { href: '/document-management/templates', label: 'Library Template', iconName: '/document-management/templates' },
                    { href: '/document-management/contracts', label: 'Repositori Kontrak', iconName: '/document-management/contracts' },
                ]
            },
            { href: '/settings', label: 'Profil & Keamanan', iconName: '/settings' },
        ];
    }

    // --- MANAJEMEN & USER STRUCTURE (EXISTING) ---
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
            label: 'Pondasi Data', 
            iconName: 'pusat-data', 
            show: capabilities.isCompanyAdmin,
            moduleId: 'foundation',
            subItems: [
                { href: '/master-data/company-objectives', label: 'Objective Strategis', show: true, iconName: '/master-data/company-objectives', moduleId: 'foundation' },
                { href: '/master-data/departments', label: 'Departemen', show: true, iconName: '/master-data/departments', moduleId: 'foundation' },
                { href: '/master-data/positions', label: 'Matriks Jabatan', show: true, iconName: '/master-data/positions', moduleId: 'foundation' },
                { href: '/master-data/employees', label: 'Direktori Karyawan', show: true, iconName: '/master-data/employees', moduleId: 'foundation' },
                { href: '/master-data/hierarchy', label: 'Struktur Organisasi', show: true, iconName: '/master-data/hierarchy', moduleId: 'foundation' }, 
                { href: '/media-library', label: 'Aset Digital', show: true, iconName: '/media-library', moduleId: 'foundation' },
            ] 
        },

        { 
            label: 'Pusat Holding', 
            iconName: 'pusat-holding', 
            show: (capabilities.isCompanyAdmin && capabilities.isHolding),
            moduleId: 'holding',
            subItems: [
                { href: '/holding-dashboard', label: 'Dasbor Agregat', show: true, iconName: '/holding-dashboard', moduleId: 'holding' },
                { href: '/holding-kpi-setup', label: 'Setup KPI Induk', show: true, iconName: '/holding-kpi-setup', moduleId: 'holding' },
                { href: '/holding-group-management', label: 'Manajemen Unit', show: true, iconName: '/holding-group-management', moduleId: 'holding' },
            ] 
        },

        { 
            label: 'CollabSpace', 
            iconName: '/collab-space', 
            show: capabilities.canAccessCollabSpace,
            moduleId: 'collabspace',
            subItems: [
                { href: '/collab-space', label: 'Ruangan Saya', show: true, iconName: '/collab-space', moduleId: 'collabspace' },
                { href: '/collab-space/management', label: 'Manajemen Ruangan', show: capabilities.isCompanyAdmin, iconName: '/collab-space/management', moduleId: 'collabspace' },
                { href: '/collab-space/reports', label: 'Analitik Tugas', show: capabilities.isManager, iconName: '/collab-space/reports', moduleId: 'collabspace' },
            ]
        },

        {
            href: '/appraisal-dashboard',
            label: 'Dashboard Appraisal',
            iconName: 'analisis-laporan',
            show: capabilities.canAccessReports && (capabilities.isDeptHead || capabilities.isCompanyAdmin),
            moduleId: 'appraisal',
        },

        {
            label: 'Manajemen KPI',
            iconName: 'manajemen-kpi',
            show: capabilities.canAccessKpi,
            moduleId: 'appraisal',
            subItems: [
                { href: '/my-performance', label: 'Performa Saya', show: !capabilities.isCompanyAdmin, iconName: '/my-performance', moduleId: 'appraisal' },
                { href: '/input-achievement', label: 'Input Realisasi', show: true, iconName: '/input-achievement', moduleId: 'appraisal' },
                { href: '/master-data/kpi-categories', label: 'Kategori KPI', show: capabilities.isCompanyAdmin, iconName: '/master-data/kpi-categories', moduleId: 'appraisal' },
                { href: '/setup-kpi', label: 'Konfigurasi Setup', show: capabilities.isCompanyAdmin, iconName: '/setup-kpi', moduleId: 'appraisal' },
                { href: '/master-data/kpi-data', label: 'Arsip Pencapaian', show: capabilities.isCompanyAdmin, iconName: '/master-data/kpi-data', moduleId: 'appraisal' },
            ]
        },

        {
            label: 'Manajemen KBO',
            iconName: 'manajemen-kbo',
            show: capabilities.canAccessKbo && capabilities.isCompanyAdmin,
            moduleId: 'appraisal',
            subItems: [
                { href: '/master-data/kbo-categories', label: 'Kategori KBO', show: true, iconName: '/master-data/kbo-categories', moduleId: 'appraisal' },
                { href: '/master-data/kbo-competencies', label: 'Pustaka Kompetensi', show: true, iconName: '/master-data/kbo-competencies', moduleId: 'appraisal' },
                { href: '/appraisal-settings', label: 'Setup Matriks Rater', show: true, iconName: '/appraisal-settings', moduleId: 'appraisal' },
            ]
        },

        {
            label: 'OKR (Objectives)',
            iconName: 'okr-management',
            show: capabilities.canAccessOkr,
            moduleId: 'appraisal',
            subItems: [
                 { href: '/okr', label: 'Workspace OKR', show: capabilities.isCompanyAdmin, iconName: '/okr', moduleId: 'appraisal' },
                 { href: '/okr/progress', label: 'Update Progres', show: !capabilities.isCompanyAdmin && capabilities.isOkrParticipant, iconName: '/okr/progress', moduleId: 'appraisal' },
            ]
        },

        { 
            label: 'LMS Portal', 
            iconName: 'lms-user', 
            show: !capabilities.isCompanyAdmin && capabilities.canAccessLms,
            moduleId: 'lms',
            subItems: [
                { href: '/lms/user/my-learnings', label: 'Materi Belajar', show: true, iconName: '/lms/user/my-learnings', moduleId: 'lms' },
            ]
        },
        { 
            label: 'Akademi Manajemen', 
            iconName: 'manajemen-pembelajaran', 
            show: capabilities.canAccessLms && capabilities.isCompanyAdmin,
            moduleId: 'lms',
            subItems: [
                { href: '/lms/admin/dashboard', label: 'Insight Belajar', show: true, iconName: '/lms/admin/dashboard', moduleId: 'lms' },
                { href: '/lms/admin/courses', label: 'Kurikulum', show: true, iconName: '/lms/admin/courses', moduleId: 'lms' },
                { href: '/lms/admin/programs', label: 'Program Jalur Belajar', show: true, iconName: '/lms/admin/programs', moduleId: 'lms' },
                { href: '/lms/admin/global-catalog', label: 'Katalog Standar', show: true, iconName: '/lms/admin/global-catalog', moduleId: 'lms' },
                { href: '/lms/admin/quizzes', label: 'Bank Soal Kuis', show: true, iconName: '/lms/admin/quizzes', moduleId: 'lms' },
                { href: '/lms/admin/reports', label: 'Matriks Kelulusan', show: true, iconName: '/lms/admin/reports', moduleId: 'lms' },
            ]
        },

        {
            label: 'Pusat Dokumen',
            iconName: 'manajemen-dokumen',
            show: capabilities.canAccessDocs,
            moduleId: 'documents',
            subItems: [
                { href: '/document-management/templates', label: 'Library Template', show: true, iconName: '/document-management/templates', moduleId: 'documents' },
                { href: '/document-management/contracts', label: 'Repositori Kontrak', show: true, iconName: '/document-management/contracts', moduleId: 'documents' },
            ]
        },
        
        { href: '/subscription-status', label: 'Detail Langganan', show: capabilities.isCompanyAdmin, iconName: '/subscription-status', moduleId: 'billing' },
        { href: '/company-admin-management', label: 'Rekan Manajemen', show: capabilities.isCompanyAdmin, iconName: '/company-admin-management', moduleId: 'admin' },
        { href: '/settings', label: 'Profil & Keamanan', show: true, iconName: '/settings', moduleId: 'settings' },
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
    if (activeModule && userRole !== 'superadmin') {
        visibleItems = visibleItems.filter(item => {
            if ((item as any).moduleId === activeModule) return true;
            if (item.subItems && item.subItems.some(sub => (sub as any).moduleId === activeModule)) return true;
            return false;
        });
    }

    if (isMobile) {
        return visibleItems;
    }
    
    return visibleItems;
}
