
// src/components/ui/sidebar.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CaretDown, SignOut, Folders } from "@phosphor-icons/react";
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { getNavItems, iconMap, getActiveModuleFromPath } from '@/lib/nav-items';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "./scroll-area";
import { useSidebar } from "@/contexts/sidebar-context";
import { Avatar, AvatarFallback } from "./avatar";

/** AppSidebar component - Enterprise Premium Expanding Sidebar */
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
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        className={cn(
          "flex flex-col h-screen sticky left-0 top-0 z-50 border-r bg-white no-print",
          isMobile ? "fixed w-[280px] h-full border-none shadow-2xl" : ""
        )}
        onMouseEnter={() => !isMobile && setIsOpen(true)}
        onMouseLeave={() => !isMobile && setIsOpen(false)}
      >
        {/* Header: Logo Area */}
        <div className="flex items-center px-6 flex-shrink-0 h-[65px] border-b border-[#E5E7EB]">
          <div className="flex items-center justify-center min-h-[32px] w-full">
            <AnimatePresence mode="wait">
              {isOpen || isMobile ? (
                <motion.div
                  key="full-logo"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-start w-full"
                >
                  <Image src="/logo.png" alt="Logo" width={110} height={28} priority className="object-contain" />
                </motion.div>
              ) : (
                <motion.div
                  key="mini-logo"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="size-10 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm"
                >
                  <Image src="/favicon.png" alt="Logo" width={24} height={24} priority />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation Area */}
        <ScrollArea className="flex-1 px-3">
             <ul className="space-y-8 mt-8"> {/* Increased group spacing (32px) */}
                {navItems.map((group, groupIdx) => {
                    // Detect groups by checking if item has subItems
                    const isGroup = !!group.subItems;

                    return (
                        <li key={group.label} className="space-y-1.5">
                            {isGroup ? (
                                <Collapsible defaultOpen={group.subItems?.some(sub => pathname.startsWith(sub.href))}>
                                    <CollapsibleTrigger asChild>
                                        <button
                                            className={cn(
                                                "group flex items-center gap-4 rounded-xl px-4 py-0 h-[56px] text-[14px] w-full text-left transition-all duration-200 ease-out",
                                                group.subItems?.some(sub => pathname.startsWith(sub.href)) 
                                                    ? "text-[#0F172A] bg-[#2563eb]/[0.06] font-semibold" 
                                                    : "text-[#64748B] font-medium hover:bg-slate-50 hover:text-[#0F172A]"
                                            )}
                                        >
                                            <div className="flex size-5 items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
                                              {React.createElement(iconMap[group.iconName || 'default'] || Folders, {
                                                  size: 22,
                                                  weight: "fill",
                                                  color: group.subItems?.some(sub => pathname.startsWith(sub.href)) ? "#2563eb" : "#94A3B8"
                                              })}
                                            </div>
                                            {(isOpen || isMobile) && (
                                                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 tracking-tight">
                                                    {group.label}
                                                </motion.span>
                                            )}
                                             {(isOpen || isMobile) && <CaretDown size={12} className="opacity-30 group-data-[state=open]:rotate-180 transition-transform" weight="bold" />}
                                        </button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        {(isOpen || isMobile) && (
                                          <ul className="ml-9 my-1 border-l border-[#E5E7EB] space-y-1">
                                              {group.subItems?.map(subItem => {
                                                  const isSubActive = pathname.startsWith(subItem.href);
                                                  return (
                                                      <li key={subItem.href}>
                                                          <Link href={subItem.href} className={cn(
                                                              "block pl-5 pr-3 py-2.5 text-[13px] tracking-tight transition-all duration-200",
                                                              isSubActive 
                                                                ? "text-[#2563eb] font-semibold" 
                                                                : "text-[#64748B] font-medium hover:text-[#0F172A] hover:translate-x-1"
                                                          )}>
                                                              {subItem.label}
                                                          </Link>
                                                      </li>
                                                  )
                                              })}
                                          </ul>
                                        )}
                                    </CollapsibleContent>
                                </Collapsible>
                            ) : (
                                <Link
                                    href={group.href || '#'}
                                    className={cn(
                                        "group flex items-center gap-4 rounded-xl px-4 py-0 h-[56px] text-[14px] transition-all duration-200 ease-out",
                                        (pathname === group.href || (group.href !== '/' && pathname.startsWith(group.href!)))
                                            ? "bg-[#2563eb]/[0.06] text-[#0F172A] font-semibold" 
                                            : "text-[#64748B] font-medium hover:bg-slate-50 hover:text-[#0F172A]"
                                    )}
                                >
                                    <div className="flex size-5 items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
                                        {React.createElement(iconMap[group.iconName || 'default'] || Folders, {
                                            size: 22,
                                            weight: "fill",
                                            color: (pathname === group.href || (group.href !== '/' && pathname.startsWith(group.href!))) ? "#2563eb" : "#94A3B8"
                                        })}
                                    </div>
                                    {(isOpen || isMobile) && (
                                        <span className="tracking-tight">
                                        {group.label}
                                        </span>
                                    )}
                                </Link>
                            )}
                        </li>
                    );
                })}
             </ul>
        </ScrollArea>
        
        {/* Footer: User Profile Area */}
        <div className="p-4 border-t border-[#E5E7EB] flex-shrink-0">
            <button
                onClick={() => logout()}
                className={cn(
                  "flex items-center gap-3 w-full rounded-xl transition-all duration-200 active:scale-95 group",
                  isOpen || isMobile ? "p-3 hover:bg-slate-50" : "justify-center"
                )}
            >
                <Avatar className="size-10 border border-[#E5E7EB] shrink-0 shadow-sm transition-transform group-hover:scale-105">
                  <AvatarFallback className="bg-slate-100 text-[#64748B] font-black text-xs">{userInitial}</AvatarFallback>
                </Avatar>
                
                {(isOpen || isMobile) && (
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[13px] font-bold text-[#0F172A] truncate tracking-tight">{currentUser?.name}</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-[#64748B] uppercase transition-colors group-hover:text-destructive tracking-widest">
                        <SignOut size={12} weight="bold" />
                        <span>Log Out</span>
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
                    <MotionNav />
                </React.Fragment>
            )}
        </AnimatePresence>
    );
  }

  return <MotionNav />;
}

export function SidebarTrigger() {
  const { isOpen, setIsOpen } = useSidebar();
  return (
    <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="hover:bg-slate-100 rounded-xl transition-colors">
      <Image src="/favicon.png" alt="Menu" width={20} height={20} className={cn("transition-transform duration-300", isOpen && "rotate-180")} />
    </Button>
  );
}
