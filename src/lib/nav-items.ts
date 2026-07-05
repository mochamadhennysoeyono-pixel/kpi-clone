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
    '/portal': LayoutGrid,
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
    '/my-performance': UserCircle,
    '/input-achievement': FilePlus,
    '/setup-kpi': Settings,
    'manajemen-kbo': ShieldCheck,
    '/appraisal-settings': Settings,
    'okr-management': Flag,
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

    const capabilities = {
      isSuperAdmin: userRole === 'superadmin',
      isCompanyAdmin: userRole === 'manajemen',
      isDeptHead: hasSubordinates,
      isRegularUser: userRole === 'user' && !hasSubordinates,
      isManager: userRole === 'manajemen' || hasSubordinates,
      isHolding: userCompany?.isHolding === true,
      canBecomeHolding: userCompany?.canBecomeHolding === true,
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
        { href: '/dashboard', label: 'Dashboard Admin', show: capabilities.isSuperAdmin, iconName: '/dashboard' },
        {
            label: 'Manajemen Sistem',
            iconName: 'manajemen-sistem',
            show: capabilities.isSuperAdmin,
            subItems: [
                { href: '/admin-management', label: 'Manajemen Admin Super', show: true, iconName: '/admin-management' },
                { href: '/company-admin-management', label: 'Manajemen Admin Klien', show: true, iconName: '/company-admin-management' },
                { href: '/subscription-management', label: 'Manajemen Langganan', show: true, iconName: '/subscription-management' },
                { href: '/subscription-logs', label: 'Pusat Log Langganan', show: true, iconName: '/subscription-logs' },
                { href: '/group-management', label: 'Manajemen Holding', show: true, iconName: '/group-management' },
            ]
        },

        { 
            label: 'Pondasi Data', 
            iconName: 'pusat-data', 
            show: capabilities.isSuperAdmin || capabilities.isCompanyAdmin,
            moduleId: 'foundation',
            subItems: [
                { href: '/master-data/company', label: 'Data Perusahaan', show: capabilities.isSuperAdmin, iconName: '/master-data/company', moduleId: 'foundation' },
                { href: '/master-data/company-objectives', label: 'Objective Perusahaan', show: true, iconName: '/master-data/company-objectives', moduleId: 'foundation' },
                { href: '/master-data/departments', label: 'Departemen', show: true, iconName: '/master-data/departments', moduleId: 'foundation' },
                { href: '/master-data/positions', label: 'Jabatan', show: true, iconName: '/master-data/positions', moduleId: 'foundation' },
                { href: '/master-data/employees', label: 'Data Karyawan', show: true, iconName: '/master-data/employees', moduleId: 'foundation' },
                { href: '/master-data/hierarchy', label: 'Struktur Organisasi', show: true, iconName: '/master-data/hierarchy', moduleId: 'foundation' }, 
                { href: '/media-library', label: 'Media Library', show: true, iconName: '/media-library', moduleId: 'foundation' },
            ] 
        },

        { 
            label: 'Pusat Holding', 
            iconName: 'pusat-holding', 
            show: (capabilities.isCompanyAdmin && capabilities.isHolding) || capabilities.isSuperAdmin,
            moduleId: 'holding',
            subItems: [
                { href: '/holding-dashboard', label: 'Dasbor Agregat', show: true, iconName: '/holding-dashboard', moduleId: 'holding' },
                { href: '/holding-kpi-setup', label: 'Pengaturan KPI Induk', show: true, iconName: '/holding-kpi-setup', moduleId: 'holding' },
                { href: '/holding-group-management', label: 'Manajemen Grup', show: true, iconName: '/holding-group-management', moduleId: 'holding' },
            ] 
        },

        { 
            label: 'CollabSpace', 
            iconName: '/collab-space', 
            show: capabilities.canAccessCollabSpace,
            moduleId: 'collabspace',
            subItems: [
                { href: '/collab-space', label: 'Ruangan Saya', show: true, iconName: '/collab-space', moduleId: 'collabspace' },
                { href: '/collab-space/management', label: 'Manajemen Ruangan', show: capabilities.isCompanyAdmin || capabilities.isSuperAdmin, iconName: '/collab-space/management', moduleId: 'collabspace' },
                { href: '/collab-space/reports', label: 'Laporan Tugas', show: capabilities.isManager || capabilities.isSuperAdmin, iconName: '/collab-space/reports', moduleId: 'collabspace' },
            ]
        },

        {
            label: 'Analisis & Laporan',
            iconName: 'analisis-laporan',
            show: capabilities.canAccessReports && (capabilities.isDeptHead || capabilities.isCompanyAdmin || capabilities.isSuperAdmin),
            moduleId: 'appraisal',
            subItems: [
                 { href: '/reports', label: 'Laporan Kinerja Tim', show: capabilities.canAccessKpi, iconName: '/reports', moduleId: 'appraisal' },
                 { href: '/cycle-reports', label: 'Laporan Siklus', show: capabilities.canAccessKpi, iconName: '/cycle-reports', moduleId: 'appraisal' },
                 { href: '/appraisal-dashboard', label: 'Dasbor Appraisal', show: true, iconName: '/appraisal-dashboard', moduleId: 'appraisal' },
                 { href: '/kbo-appraisal', label: 'Laporan Penilaian KBO', show: capabilities.canAccessKbo, iconName: '/kbo-appraisal', moduleId: 'appraisal' },
            ]
        },

        {
            label: 'Manajemen KPI',
            iconName: 'manajemen-kpi',
            show: capabilities.canAccessKpi,
            moduleId: 'appraisal',
            subItems: [
                { href: '/my-performance', label: 'Performa Saya', show: !capabilities.isSuperAdmin && !capabilities.isCompanyAdmin, iconName: '/my-performance', moduleId: 'appraisal' },
                { href: '/input-achievement', label: 'Input Pencapaian', show: !capabilities.isSuperAdmin, iconName: '/input-achievement', moduleId: 'appraisal' },
                { href: '/master-data/kpi-categories', label: 'Kategori KPI', show: capabilities.isCompanyAdmin || capabilities.isSuperAdmin, iconName: '/master-data/kpi-categories', moduleId: 'appraisal' },
                { href: '/setup-kpi', label: 'Pengaturan KPI', show: capabilities.isCompanyAdmin || capabilities.isSuperAdmin, iconName: '/setup-kpi', moduleId: 'appraisal' },
                { href: '/master-data/kpi-data', label: 'Data Pencapaian', show: capabilities.isCompanyAdmin || capabilities.isSuperAdmin, iconName: '/master-data/kpi-data', moduleId: 'appraisal' },
            ]
        },

        {
            label: 'Manajemen KBO',
            iconName: 'manajemen-kbo',
            show: capabilities.canAccessKbo && (capabilities.isCompanyAdmin || capabilities.isSuperAdmin),
            moduleId: 'appraisal',
            subItems: [
                { href: '/master-data/kbo-categories', label: 'Kategori KBO', show: true, iconName: '/master-data/kbo-categories', moduleId: 'appraisal' },
                { href: '/master-data/kbo-competencies', label: 'Pustaka Kompetensi', show: true, iconName: '/master-data/kbo-competencies', moduleId: 'appraisal' },
                { href: '/appraisal-settings', label: 'Pengaturan Appraisal', show: true, iconName: '/appraisal-settings', moduleId: 'appraisal' },
            ]
        },

        {
            label: 'OKR (Objectives)',
            iconName: 'okr-management',
            show: capabilities.canAccessOkr,
            moduleId: 'appraisal',
            subItems: [
                 { href: '/okr', label: 'Workspace OKR', show: capabilities.isSuperAdmin || capabilities.isCompanyAdmin, iconName: '/okr', moduleId: 'appraisal' },
                 { href: '/okr/reports', label: 'Laporan OKR', show: capabilities.isSuperAdmin || capabilities.isCompanyAdmin, iconName: '/okr/reports', moduleId: 'appraisal' },
                 { href: '/okr/progress', label: 'Progres Project', show: !capabilities.isSuperAdmin && !capabilities.isCompanyAdmin && capabilities.isOkrParticipant, iconName: '/okr/progress', moduleId: 'appraisal' },
            ]
        },

        { 
            label: 'LMS Portal', 
            iconName: 'lms-user', 
            show: !capabilities.isCompanyAdmin && !capabilities.isSuperAdmin && capabilities.canAccessLms,
            moduleId: 'lms',
            subItems: [
                { href: '/lms/user/my-learnings', label: 'Kursus Saya', show: true, iconName: '/lms/user/my-learnings', moduleId: 'lms' },
            ]
        },
        { 
            label: 'Manajemen Pembelajaran', 
            iconName: 'manajemen-pembelajaran', 
            show: capabilities.canAccessLms && (capabilities.isSuperAdmin || capabilities.isCompanyAdmin),
            moduleId: 'lms',
            subItems: [
                { href: '/lms/admin/dashboard', label: 'Dasbor Admin', show: true, iconName: '/lms/admin/dashboard', moduleId: 'lms' },
                { href: '/lms/admin/courses', label: 'Manajemen Kursus', show: true, iconName: '/lms/admin/courses', moduleId: 'lms' },
                { href: '/lms/admin/programs', label: 'Program Pembelajaran', show: capabilities.isSuperAdmin, iconName: '/lms/admin/programs', moduleId: 'lms' },
                { href: '/lms/admin/global-catalog', label: 'Katalog Global', show: true, iconName: '/lms/admin/global-catalog', moduleId: 'lms' },
                { href: '/lms/admin/quizzes', label: 'Bank Soal', show: true, iconName: '/lms/admin/quizzes', moduleId: 'lms' },
                { href: '/lms/admin/reports', label: 'Laporan Belajar', show: true, iconName: '/lms/admin/reports', moduleId: 'lms' },
            ]
        },

        {
            label: 'Manajemen Dokumen',
            iconName: 'manajemen-dokumen',
            show: capabilities.canAccessDocs,
            moduleId: 'documents',
            subItems: [
                { href: '/document-management/templates', label: 'Template Dokumen', show: true, iconName: '/document-management/templates', moduleId: 'documents' },
                { href: '/document-management/contracts', label: 'Kontrak Kerja', show: true, iconName: '/document-management/contracts', moduleId: 'documents' },
            ]
        },
        
        { href: '/subscription-status', label: 'Status Paket', show: capabilities.isCompanyAdmin, iconName: '/subscription-status', moduleId: 'billing' },
        { href: '/company-admin-management', label: 'Manajemen Admin', show: capabilities.isCompanyAdmin, iconName: '/company-admin-management', moduleId: 'admin' },
        { href: '/settings', label: 'Pengaturan', show: true, iconName: '/settings', moduleId: 'settings' },
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
            // Show if main item matches module
            if ((item as any).moduleId === activeModule) return true;
            // Show if any subitem matches module
            if (item.subItems && item.subItems.some(sub => (sub as any).moduleId === activeModule)) return true;
            
            // Allow essential navigation items to always appear if needed, 
            // but the user requested ONLY Pondasi Data when in that section.
            return false;
        });
    }

    if (isMobile) {
        return visibleItems;
    }
    
    const roleForSorting = hasSubordinates ? 'department-head' : userRole;
    const sortOrder: { [key: string]: string[] } = {
      superadmin: [
        '/dashboard', 
        'Manajemen Sistem', 
        'Pondasi Data', 
        'Pusat Holding',
        'CollabSpace',
        'OKR (Objectives)',
        'Analisis & Laporan', 
        'Manajemen KPI', 
        'Manajemen KBO', 
        'Manajemen Pembelajaran', 
        'Manajemen Dokumen',
        '/settings'
      ],
      manajemen: [
        'Pondasi Data', 
        'Pusat Holding', 
        'CollabSpace', 
        'Analisis & Laporan', 
        'Manajemen KPI', 
        'Manajemen KBO', 
        'OKR (Objectives)', 
        'Manajemen Pembelajaran', 
        'Manajemen Dokumen',
        '/subscription-status',
        '/company-admin-management',
        '/settings'
      ],
      "department-head": [
        '/action-center', 'Pondasi Data', 'CollabSpace', 'Analisis & Laporan', 'Manajemen KPI', 'OKR (Objectives)', 'LMS Portal', '/settings'
      ],
      user: [
        '/action-center', 'CollabSpace', 'Manajemen KPI', 'OKR (Objectives)', 'LMS Portal', '/settings'
      ]
    };
    
    const currentSortOrder = sortOrder[roleForSorting as keyof typeof sortOrder] || sortOrder.user;

    return [...visibleItems].sort((a,b) => {
       const aKey = a.href || a.label;
       const bKey = b.href || b.label;
       const indexA = currentSortOrder.indexOf(aKey);
       const indexB = currentSortOrder.indexOf(bKey);
       
       const finalIndexA = indexA === -1 ? 999 : indexA;
       const finalIndexB = indexB === -1 ? 999 : indexB;
       
       return finalIndexA - finalIndexB;
   });
}
