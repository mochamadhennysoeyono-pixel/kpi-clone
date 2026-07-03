// src/components/layout/bottom-nav.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import {
  ListTodo,
  UserCog,
  Mail,
  Settings,
  LayoutGrid
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubMenu } from './submenu-context';
import { getNavItems, iconMap } from '@/lib/nav-items';
import { usePageContext } from '@/contexts/page-context';

export function BottomNav() {
  const pathname = usePathname();
  const { userRole, currentUser } = useAuth();
  const { employees, companies, subscriptionPlans } = useMasterData();
  const isMobile = useIsMobile();
  const { setActiveGroup, activeGroup } = useSubMenu();
  const { hideBottomNav } = usePageContext();

  const userCompany = React.useMemo(() => {
    if (!currentUser) return null;
    return companies.find(c => c.name === currentUser.company);
  }, [currentUser, companies]);

  const userSubscriptionPlan = React.useMemo(() => {
    if (!userCompany) return null;
    const relevantCompany = userCompany.parentId ? companies.find(c => c.id === userCompany.parentId) : userCompany;
    if (!relevantCompany) return null;
    return subscriptionPlans.find(p => p.id === relevantCompany.subscriptionPlanId);
  }, [userCompany, companies, subscriptionPlans]);

  const hasSubordinates = React.useMemo(() => {
    if (!currentUser) return false;
    return employees.some(e => e.reportsTo === currentUser.id);
  }, [currentUser, employees]);
  
  const handleMenuClick = () => {
    if (activeGroup) {
      setActiveGroup(null); // Close if already open
      return;
    }
    // Get the desktop navigation structure
    const allDesktopItems = getNavItems(userRole, hasSubordinates, userCompany, userSubscriptionPlan, false);
        
    const menuGroup = {
      label: 'Semua Menu',
      subItems: allDesktopItems,
    };
    setActiveGroup(menuGroup);
  };

  const bottomNavItems = React.useMemo(() => {
    if (userRole === 'superadmin') {
      return [
        { href: '/dashboard', label: 'Dashboard Admin', iconName: '/dashboard' },
        { href: '/appraisal-dashboard', label: 'Dashboard Appraisal', iconName: '/appraisal-dashboard' },
        { href: '/reports', label: 'Laporan Kinerja', iconName: '/reports' },
        { href: '/kbo-appraisal', label: 'Laporan KBO', iconName: '/kbo-appraisal' },
      ];
    }
    if (userRole === 'manajemen') {
        return [
            { href: '/reports', label: 'Laporan Tim', iconName: '/reports' },
            { href: '/appraisal-dashboard', label: 'Dashboard Appraisal', iconName: '/appraisal-dashboard' },
            { href: '/cycle-reports', label: 'Laporan Siklus', iconName: '/cycle-reports' },
            { href: '/kbo-appraisal', label: 'Laporan KBO', iconName: '/kbo-appraisal' },
        ];
    }
    // Default for user/manager
    return [
      { href: '/action-center', label: 'Beranda', iconName: '/action-center' },
      { href: '/my-performance', label: 'Performa', iconName: '/my-performance' },
      { href: '/lms/user/my-learnings', label: 'Pelatihan', iconName: 'lms-user' },
      { href: '/input-achievement', label: 'Input KPI', iconName: '/input-achievement' },
    ];
  }, [userRole]);


  // HIDE BOTTOM NAV ON PORTAL PAGE FOR MOBILE
  const isPortal = pathname === '/portal';

  if (!isMobile || hideBottomNav || isPortal) {
    return null;
  }
  
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] h-16 bg-background/80 backdrop-blur-sm border-t rounded-t-2xl">
        <div className="relative grid grid-cols-5 items-center h-full w-full p-1 gap-1">
            {bottomNavItems.slice(0, 2).map((item) => {
                const Icon = iconMap[item.iconName || 'default'] || ListTodo;
                const isActive = item.href && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
                
                return (
                    <Link key={item.href} href={item.href || '#'} className="flex flex-1 items-center justify-center w-full h-full">
                        <div
                            className={cn(
                                "relative flex flex-col items-center justify-center w-full h-full rounded-full text-xs transition-colors duration-300",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className="h-6 w-6" />
                        </div>
                     </Link>
                )
            })}
             
             <div className="col-start-3 flex justify-center">
                 <button onClick={handleMenuClick} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+8px)] w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg transform transition-transform duration-200 hover:scale-110">
                    <LayoutGrid className="h-7 w-7 text-primary-foreground" />
                </button>
             </div>

            {bottomNavItems.slice(2, 4).map((item) => {
                const Icon = iconMap[item.iconName || 'default'] || Settings;
                const isActive = item.href && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
                
                return (
                    <Link key={item.href} href={item.href || '#'} className="flex flex-1 items-center justify-center w-full h-full">
                        <div
                            className={cn(
                                "relative flex flex-col items-center justify-center w-full h-full rounded-full text-xs transition-colors duration-300",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className="h-6 w-6" />
                        </div>
                     </Link>
                )
            })}
        </div>
    </nav>
  );
}
