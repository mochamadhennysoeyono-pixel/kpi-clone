
// src/components/ui/sidebar.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ChevronLeft, Menu } from "lucide-react";
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { getNavItems, iconMap, getActiveModuleFromPath } from '@/lib/nav-items';
import { IconTokens } from '@/lib/icon-tokens';
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "./scroll-area";
import { useSidebar } from "@/contexts/sidebar-context";
import { Avatar, AvatarFallback } from "./avatar";
import { Button } from "./button";

/** AppSidebar component - Enterprise Premium Flat Expanding Sidebar */
function MotionNav() {
  const { isOpen, setIsOpen } = useSidebar();
  const pathname = usePathname();
  const { currentUser, userRole, logout } = useAuth();
  const { employees, companies, subscriptionPlans, okrs } = useMasterData();
  const isMobile = useIsMobile();
  
  const activeModule = getActiveModuleFromPath(pathname);

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
  
  const navItems = getNavItems(userRole, hasSubordinates, userCompany, userSubscriptionPlan, !!isMobile, currentUser, okrs, activeModule);

  const userInitial = currentUser?.name?.substring(0, 1).toUpperCase() || 'U';
    
  return (
     <motion.nav
        initial={false}
        animate={isMobile ? { x: 0 } : { width: isOpen ? 280 : 80 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className={cn(
          "flex flex-col h-screen sticky left-0 top-0 z-50 border-r bg-white no-print",
          isMobile ? "fixed w-[280px] h-full border-none shadow-2xl" : "border-[#E5E7EB]"
        )}
        onMouseEnter={() => !isMobile && setIsOpen(true)}
      >
        {/* Header: Logo area */}
        <div className="flex items-center px-[13px] sm:px-[20px] flex-shrink-0 h-[65px] border-b border-[#E5E7EB] overflow-hidden">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 min-w-0">
                <AnimatePresence mode="wait">
                {isOpen || isMobile ? (
                    <motion.div
                        key="full-logo"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-start shrink-0"
                    >
                        <Image src="/logo.png" alt="Logo" width={110} height={28} priority className="object-contain" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="mini-logo"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="size-10 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm shrink-0"
                    >
                        <Image src="/favicon.png" alt="Logo" width={24} height={24} priority />
                    </motion.div>
                )}
                </AnimatePresence>
            </div>

            {(isOpen || isMobile) && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                    }}
                    className="size-8 rounded-lg hover:bg-slate-100 shrink-0 ml-auto hidden md:flex"
                >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                </Button>
            )}
          </div>
        </div>

        <ScrollArea className={cn(
            "flex-1 transition-all duration-200",
            (isOpen || isMobile) ? "px-[20px]" : "px-[13px]"
        )}>
             <div className="space-y-[32px] mt-[32px] pb-10">
                {navItems.map((group) => {
                    const hasSubItems = group.subItems && group.subItems.length > 0;
                    
                    const isAppraisalDashboard = group.href === '/appraisal-dashboard';
                    const isAppraisalActive = isAppraisalDashboard && (
                        pathname.startsWith('/appraisal-dashboard') || 
                        pathname.startsWith('/reports') || 
                        pathname.startsWith('/cycle-reports') || 
                        pathname.startsWith('/kbo-appraisal') || 
                        pathname.startsWith('/okr/reports')
                    );

                    const isActive = !hasSubItems && (
                        isAppraisalActive || 
                        pathname === group.href || 
                        (group.href !== '/' && pathname.startsWith(group.href!))
                    );

                    const IconComponent = iconMap[group.iconName || 'default'] || Folder;

                    return (
                        <div key={group.label} className="space-y-2">
                            {/* Main Item or Group Header */}
                            {group.href ? (
                                <Link
                                    href={group.href}
                                    className={cn(
                                        "group flex items-center rounded-[12px] h-[48px] text-[14px] transition-all duration-[180ms] ease-out",
                                        (isOpen || isMobile) ? "px-[16px] gap-[14px]" : "px-0 justify-center",
                                        isActive
                                            ? "bg-[#F3F4F6] text-[#111827] font-bold" 
                                            : "text-[#475569] font-medium hover:bg-[#F9FAFB] hover:text-[#334155]"
                                    )}
                                >
                                    <div className="flex size-[20px] items-center justify-center shrink-0">
                                        <IconComponent 
                                            size={isMobile ? IconTokens.size.mobile : IconTokens.size.desktop}
                                            strokeWidth={IconTokens.strokeWidth}
                                            color={isActive ? IconTokens.color.active : IconTokens.color.default}
                                        />
                                    </div>
                                    {(isOpen || isMobile) && (
                                        <span className="tracking-tight truncate">{group.label}</span>
                                    )}
                                </Link>
                            ) : (
                                <div className={cn(
                                    "flex items-center rounded-[12px] h-[40px] text-[14px]",
                                    (isOpen || isMobile) ? "px-[16px] gap-[14px]" : "px-0 justify-center"
                                )}>
                                     <div className="flex size-[20px] items-center justify-center shrink-0 opacity-40">
                                        <IconComponent 
                                            size={isMobile ? IconTokens.size.mobile : IconTokens.size.desktop}
                                            strokeWidth={IconTokens.strokeWidth}
                                        />
                                    </div>
                                    {(isOpen || isMobile) && (
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 truncate">
                                            {group.label}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Sub Items (Always visible if flat) */}
                            {hasSubItems && (isOpen || isMobile) && (
                                <ul className="ml-[26px] mt-[4px] border-l border-[#E5E7EB] space-y-[4px]">
                                    {group.subItems?.map(subItem => {
                                        const isSubActive = pathname.startsWith(subItem.href);
                                        return (
                                            <li key={subItem.href}>
                                                <Link href={subItem.href} className={cn(
                                                    "block pl-[24px] pr-3 py-[8px] text-[13px] tracking-tight transition-all duration-[180ms] ease-out",
                                                    isSubActive 
                                                        ? "text-[#2563eb] font-bold border-l-2 border-[#2563eb] -ml-[1px] bg-blue-50/50" 
                                                        : "text-[#64748B] font-medium hover:text-[#334155] hover:translate-x-1"
                                                )}>
                                                    {subItem.label}
                                                </Link>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </div>
                    );
                })}
             </div>
        </ScrollArea>
        
        <div className="p-[20px] border-t border-[#E5E7EB] flex-shrink-0">
            <button
                onClick={() => logout()}
                className={cn(
                  "flex items-center gap-3 w-full rounded-[12px] transition-all duration-[180ms] active:scale-95 group",
                  isOpen || isMobile ? "p-3 hover:bg-slate-50" : "justify-center"
                )}
            >
                <Avatar className="size-10 border border-[#E5E7EB] shrink-0 shadow-sm transition-transform group-hover:scale-105">
                  <AvatarFallback className="bg-slate-100 text-[#64748B] font-black text-xs">{userInitial}</AvatarFallback>
                </Avatar>
                
                {(isOpen || isMobile) && (
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[13px] font-bold text-[#111827] truncate tracking-tight">{currentUser?.name}</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-[#475569] transition-colors group-hover:text-destructive tracking-widest">
                        <LogOut size={12} strokeWidth={2.5} />
                        <span>LOG OUT</span>
                    </div>
                  </div>
                )}
            </button>
        </div>
    </motion.nav>
  )
}

export function AppSidebar() {
  const { isOpen, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
        <AnimatePresence>
            {isOpen && (
                <React.Fragment key="sidebar-mobile">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={toggleSidebar} 
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" 
                    />
                    <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", stiffness: 400, damping: 40 }}
                        className="fixed top-0 left-0 h-full z-[101]"
                    >
                        <motion.nav
                            initial={false}
                            className={cn(
                                "flex flex-col h-screen sticky left-0 top-0 z-50 border-r bg-white no-print fixed w-[280px] h-full border-none shadow-2xl"
                            )}
                        >
                            <MotionNav />
                        </motion.nav>
                    </motion.div>
                </React.Fragment>
            )}
        </AnimatePresence>
    );
  }

  return <MotionNav />;
}

export function SidebarTrigger() {
  const { isOpen, toggleSidebar } = useSidebar();
  return (
    <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hover:bg-slate-100 rounded-xl transition-colors">
      <Menu size={20} className={cn("transition-transform duration-300", isOpen && "rotate-90")} />
    </Button>
  );
}
