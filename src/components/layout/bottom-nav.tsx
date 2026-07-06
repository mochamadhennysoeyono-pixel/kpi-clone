
// src/components/layout/bottom-nav.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import {
  LayoutGrid,
  MoreHorizontal,
  Folder
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubMenu } from './submenu-context';
import { getNavItems, getActiveModuleFromPath, iconMap } from '@/lib/nav-items';
import { usePageContext } from '@/contexts/page-context';
import { IconTokens } from '@/lib/icon-tokens';

export function BottomNav() {
  const pathname = usePathname();
  const { userRole, currentUser } = useAuth();
  const { employees, companies, subscriptionPlans, okrs } = useMasterData();
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
  
  const activeModule = React.useMemo(() => getActiveModuleFromPath(pathname), [pathname]);

  const handleMoreClick = () => {
    if (activeGroup) {
      setActiveGroup(null);
      return;
    }
    // Get all items for the current context to show in the overlay
    const allContextualItems = getNavItems(userRole, hasSubordinates, userCompany, userSubscriptionPlan, false, currentUser, okrs, activeModule);
    const menuGroup = {
      label: 'More Actions',
      subItems: allContextualItems,
    };
    setActiveGroup(menuGroup);
  };

  // --- DYNAMIC CONTEXTUAL ITEMS (ISOLATED BY MODULE) ---
  const finalItems = React.useMemo(() => {
    if (!userRole) return [];

    // 1. SUPERADMIN: Access global quick actions
    if (userRole === 'superadmin') {
      return [
        { href: '/dashboard', label: 'Workbench', icon: iconMap['/dashboard'] },
        { href: '/appraisal-dashboard', label: 'Analitik', icon: iconMap['/appraisal-dashboard'] },
        { type: 'action' as const },
        { href: '/master-data/company', label: 'Klien', icon: iconMap['/master-data/company'] },
        { href: '/settings', label: 'Settings', icon: iconMap['/settings'] },
      ];
    }

    // 2. MANAJEMEN & USER: Isolated Context + Workspace Anchor at the end
    const rawItems = getNavItems(userRole, hasSubordinates, userCompany, userSubscriptionPlan, false, currentUser, okrs, activeModule);
    
    let itemsToDisplay: any[] = [];
    
    if (activeModule && userRole !== 'superadmin') {
        // FLATTEN LOGIC: Break group down so sub-items appear as main buttons in bottom nav
        rawItems.forEach((item: any) => {
            if (item.subItems) {
                const relevantSubs = item.subItems.filter((s: any) => s.moduleId === activeModule);
                itemsToDisplay.push(...relevantSubs);
            } else if (item.moduleId === activeModule) {
                itemsToDisplay.push(item);
            }
        });
        
        const seen = new Set();
        itemsToDisplay = itemsToDisplay.filter(item => {
            if (!item.href) return true;
            if (seen.has(item.href)) return false;
            seen.add(item.href);
            return true;
        });
    } else {
        itemsToDisplay = [...rawItems];
    }

    let itemsToRender: any[] = [];
    let showMore = false;

    // Rule: If module menu > 4, take 3 first, add More, then Exit.
    if (itemsToDisplay.length > 4) {
        itemsToRender = itemsToDisplay.slice(0, 3).map(item => ({
            href: item.href,
            label: item.label,
            icon: iconMap[item.iconName || item.href || 'default'] || Folder
        }));
        showMore = true;
    } else {
        itemsToRender = itemsToDisplay.map(item => ({
            href: item.href,
            label: item.label,
            icon: iconMap[item.iconName || item.href || 'default'] || Folder
        }));
    }

    if (showMore) {
        itemsToRender.push({ 
            type: 'more' as any, 
            label: 'More', 
            icon: MoreHorizontal as any,
            onClick: handleMoreClick
        });
    }

    // Always add Exit/Workspace at the end (5th position)
    itemsToRender.push({ 
        href: '/workspace', 
        label: 'Exit', 
        icon: LayoutGrid 
    });

    return itemsToRender;

  }, [userRole, activeModule, hasSubordinates, currentUser, companies, subscriptionPlans, okrs]);

  const handleMenuClick = () => {
    if (activeGroup) {
      setActiveGroup(null);
      return;
    }
    const allDesktopItems = getNavItems(userRole, hasSubordinates, userCompany, userSubscriptionPlan, false, currentUser, okrs, activeModule);
    const menuGroup = {
      label: 'Navigator',
      subItems: allDesktopItems,
    };
    setActiveGroup(menuGroup);
  };

  if (!isMobile || hideBottomNav || pathname === '/workspace') {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] h-[72px] bg-white/95 backdrop-blur-xl border-t border-slate-100 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.06)] no-print">
        <div className="relative grid grid-cols-5 items-center h-full w-full px-2">
            {finalItems.map((item: any, idx) => {
                if (item.type === 'action') {
                    return (
                        <div key="action-center-btn" className="flex justify-center -translate-y-4">
                            <button 
                                onClick={handleMenuClick} 
                                className="size-14 bg-[#111827] text-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/20 ring-4 ring-white transition-transform active:scale-90"
                            >
                                <LayoutGrid size={26} strokeWidth={2} />
                            </button>
                        </div>
                    );
                }

                if (item.type === 'more') {
                    return (
                        <button 
                            key="more-btn"
                            onClick={item.onClick}
                            className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95 group text-slate-400"
                        >
                            <div className="p-1.5 rounded-lg transition-all duration-300">
                                <item.icon 
                                  size={IconTokens.size.mobile} 
                                  strokeWidth={IconTokens.strokeWidth} 
                                  color={IconTokens.color.default}
                                />
                            </div>
                            <span className="text-[9px] font-black tracking-tight uppercase">
                                {item.label}
                            </span>
                        </button>
                    );
                }

                const isActive = item.href && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
                const Icon = item.icon || Folder;

                return (
                    <Link 
                        key={item.href || item.label} 
                        href={item.href || '#'}
                        className={cn(
                            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95 group",
                            idx === 4 && userRole !== 'superadmin' && "text-primary"
                        )}
                    >
                        <div className={cn(
                            "p-1.5 rounded-lg transition-all duration-300",
                            isActive ? "bg-[#F3F4F6]" : "bg-transparent"
                        )}>
                            <Icon 
                              size={IconTokens.size.mobile} 
                              strokeWidth={isActive ? 2.5 : IconTokens.strokeWidth} 
                              color={isActive ? IconTokens.color.active : IconTokens.color.default}
                            />
                        </div>
                        <span className={cn(
                            "text-[9px] font-black tracking-tight uppercase",
                            isActive ? "text-[#2563eb]" : "text-slate-400"
                        )}>
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </div>
    </nav>
  );
}
