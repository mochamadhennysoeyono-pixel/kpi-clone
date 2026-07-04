
// src/lib/nav-items.ts
import React from 'react';
import type { UserRole, Company, SubscriptionPlan, Employee, OKR, ModuleId } from "@/types";
import { 
    Gauge,
    House,
    SquaresFour,
    ShieldCheckered,
    UserPlus,
    ClipboardCheck,
    Crown,
    ClockCounterClockwise,
    GitMerge,
    Lightning,
    SlidersHorizontal,
    Database,
    Buildings,
    Graph,
    Briefcase,
    Users,
    GitFork,
    Folders,
    BookBookmark,
    Brain,
    ChartBar,
    Target,
    Image,
    TreeStructure,
    ProjectorScreen,
    ChartPie,
    Activity,
    UserCog,
    FilePlus,
    Settings,
    BellRinging,
    Flag,
    GraduationCap,
    BookOpen,
    Path,
    Books,
    Exam,
    Files,
    FileText,
    Envelope,
    ShoppingCart,
    CaretLeft,
    DotsThreeOutline,
    ListChecks
} from "@phosphor-icons/react";

export const iconMap: { [key: string]: React.ElementType } = {
    // --- Dashboard & Home ---
    '/dashboard': Gauge,
    '/action-center': House,
    '/portal': SquaresFour,
    '/beranda': House,

    // --- Manajemen Sistem (Superadmin) ---
    '/admin-management': ShieldCheckered,
    '/company-admin-management': UserPlus,
    '/activation-management': ClipboardCheck,
    '/subscription-management': Crown,
    '/subscription-logs': ClockCounterClockwise,
    '/group-management': GitMerge,
    '/feature-management': Lightning,
    'manajemen-sistem': SlidersHorizontal,
    'manajemen-fitur': Lightning,

    // --- Pondasi Data ---
    'pusat-data': Database,
    '/master-data/company': Buildings,
    '/master-data/departments': Graph,
    '/master-data/positions': Briefcase,
    '/master-data/employees': Users,
    '/master-data/hierarchy': GitFork,
    '/master-data/kpi-categories': Folders,
    '/master-data/kbo-categories': BookBookmark,
    '/master-data/kbo-competencies': Brain,
    '/master-data/kpi-data': Database,
    '/master-data/company-objectives': Target,
    '/media-library': Image,

    // --- Pusat Holding ---
    'pusat-holding': TreeStructure,
    '/holding-dashboard': ChartBar,
    '/holding-kpi-setup': Settings,
    '/holding-group-management': Users,
    '/holding-management': TreeStructure,

    // --- CollabSpace ---
    '/collab-space': ProjectorScreen,
    '/collab-space/management': Settings,
    '/collab-space/reports': ChartPie,

    // --- Analisis & Laporan ---
    'analisis-laporan': ChartBar,
    '/reports': ChartPie,
    '/cycle-reports': Activity,
    '/appraisal-dashboard': ChartBar,
    '/kbo-appraisal': ClipboardCheck,

    // --- Manajemen KPI ---
    'manajemen-kpi': ClipboardCheck,
    '/my-performance': UserCog,
    '/input-achievement': FilePlus,
    '/setup-kpi': Settings,

    // --- Manajemen KBO ---
    'manajemen-kbo': ClipboardCheck,
    '/appraisal-settings': Settings,

    // --- OKR ---
    'okr-management': Flag,
    '/okr': Flag,
    '/okr/reports': ChartBar,
    '/okr/progress': ListChecks,

    // --- LMS ---
    'lms-portal': GraduationCap,
    'lms-user': BookOpen,
    'manajemen-pembelajaran': GraduationCap,
    '/lms/admin/dashboard': Gauge,
    '/lms/admin/courses': BookOpen,
    '/lms/admin/programs': Path,
    '/lms/admin/global-catalog': Books,
    '/lms/admin/quizzes': Exam,
    '/lms/admin/reports': ChartBar,
    '/lms/user/my-learnings': BookOpen,

    // --- Dokumen ---
    'manajemen-dokumen': Files,
    '/document-management/templates': FileText,
    '/document-management/contracts': Files,

    // --- Lainnya ---
    '/subscription-status': Crown,
    '/subscription-plans': ShoppingCart,
    '/settings': Settings,
    '/memos': Envelope,
    'default': Folders,
    'more': DotsThreeOutline,
    'portal': CaretLeft,
};

export const getActiveModuleFromPath = (path: string): ModuleId | null => {
    if (path.startsWith('/action-center') || 
        path.startsWith('/my-performance') || 
        path.startsWith('/input-achievement') || 
        path.startsWith('/reports') || 
        path.startsWith('/setup-kpi') ||
        path.startsWith('/appraisal') ||
        path.startsWith('/okr') ||
        path.startsWith('/kbo-appraisal')
    ) return 'appraisal';
    
    if (path.startsWith('/lms')) return 'lms';
    if (path.startsWith('/collab-space')) return 'collabspace';
    if (path.startsWith('/master-data') || path.startsWith('/media-library')) return 'foundation';
    if (path.startsWith('/holding-dashboard') || path.startsWith('/holding-kpi-setup') || path.startsWith('/holding-group-management')) return 'holding';
    
    return null;
};

export function getNavItems(
    userRole: UserRole, 
    hasSubordinates: boolean, 
    userCompany: Company | null | undefined, 
    subscriptionPlan: SubscriptionPlan | null | undefined, 
    isMobile: boolean, 
    currentUser?: Employee | null, 
    okrs?: OKR[],
    activeModule?: ModuleId | null
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
                { href: '/activation-management', label: 'Aktivasi Perusahaan', show: true, iconName: '/activation-management' },
                { href: '/subscription-management', label: 'Manajemen Langganan', show: true, iconName: '/subscription-management' },
                { href: '/subscription-logs', label: 'Pusat Log Langganan', show: true, iconName: '/subscription-logs' },
                { href: '/group-management', label: 'Manajemen Holding', show: true, iconName: '/group-management' },
                { href: '/feature-management', label: 'Manajemen Fitur', show: true, iconName: 'manajemen-fitur' },
            ]
        },

        { 
            label: 'Pondasi Data', 
            iconName: 'pusat-data', 
            show: capabilities.isSuperAdmin || capabilities.isCompanyAdmin,
            moduleId: 'foundation',
            subItems: [
                { href: '/master-data/company', label: 'Data Perusahaan', show: capabilities.isSuperAdmin, iconName: '/master-data/company', moduleId: 'foundation' },
                { href: '/master-data/company-objectives', label: 'Objective Perusahaan', show: capabilities.isSuperAdmin || capabilities.isCompanyAdmin, iconName: '/master-data/company-objectives', moduleId: 'foundation' },
                { href: '/master-data/departments', label: 'Departemen', show: capabilities.isSuperAdmin || capabilities.isCompanyAdmin, iconName: '/master-data/departments', moduleId: 'foundation' },
                { href: '/master-data/positions', label: 'Jabatan', show: capabilities.isSuperAdmin || capabilities.isCompanyAdmin, iconName: '/master-data/positions', moduleId: 'foundation' },
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
            subItems: [
                { href: '/document-management/templates', label: 'Template Dokumen', show: true, iconName: '/document-management/templates' },
                { href: '/document-management/contracts', label: 'Kontrak Kerja', show: true, iconName: '/document-management/contracts' },
            ]
        },
        
        { href: '/subscription-status', label: 'Status Paket', show: capabilities.isCompanyAdmin, iconName: '/subscription-status' },
        { href: '/company-admin-management', label: 'Manajemen Admin', show: capabilities.isCompanyAdmin, iconName: '/company-admin-management' },
    ];

    let visibleItems = allNavItems
        .filter(item => (item as any).show)
        .map(item => {
            if (item.subItems) {
                const visibleSubItems = item.subItems.filter(sub => (sub as any).show);
                if (visibleSubItems.length === 0) return null;
                return { ...item, subItems: visibleSubItems };
            }
            return item;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

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
        'Manajemen Dokumen'
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
        '/company-admin-management'
      ],
      "department-head": [
        '/action-center', 'Pondasi Data', 'CollabSpace', 'Analisis & Laporan', 'Manajemen KPI', 'OKR (Objectives)', 'LMS Portal'
      ],
      user: [
        '/action-center', 'CollabSpace', 'Manajemen KPI', 'OKR (Objectives)', 'LMS Portal'
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
