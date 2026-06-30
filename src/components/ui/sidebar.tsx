// src/components/ui/sidebar.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Menu, X } from "lucide-react";
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { getNavItems, iconMap } from '@/lib/nav-items';
import type { UserRole, Company, SubscriptionPlan, Employee, OKR } from "@/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react";
import { Button } from "./button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "./scroll-area";
import { useSidebar } from "@/contexts/sidebar-context";

/** AppSidebar component - mini expandable sidebar */
function MotionNav() {
  const { isOpen, setIsOpen } = useSidebar();
  const pathname = usePathname();
  const { currentUser, userRole, logout } = useAuth();
  const { employees, companies, subscriptionPlans, okrs } = useMasterData();
  const isMobile = useIsMobile();
  
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
  
  const navItems = getNavItems(userRole, hasSubordinates, userCompany, userSubscriptionPlan, !!isMobile, currentUser, okrs);
    
  return (
     <motion.nav
        initial={false}
        animate={isMobile ? { x: isOpen ? 0 : "-100%" } : { width: isOpen ? 260 : 72 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={cn(
          "flex flex-col h-screen sticky left-0 top-0 z-50 border-r bg-background",
          isMobile ? "fixed" : "relative"
        )}
        onMouseEnter={() => !isMobile && setIsOpen(true)}
      >
        <div className="flex items-center justify-between gap-3 px-3 py-3 h-[65px] flex-shrink-0">
          <div
              className="flex items-center justify-center"
              style={{ minWidth: 40, height: 40 }}
            >
              <AnimatePresence mode="wait">
                 {isOpen ? (
                    <motion.div
                      key="logo-open"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-between w-full"
                    >
                      <Image 
                        src="/logo.png" 
                        alt="Logo"
                        width={150} 
                        height={40}
                      />
                    </motion.div>
                ) : (
                    <motion.div
                      key="logo-closed"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                    >
                       <Image 
                        src="/favicon.png"
                        alt="Icon"
                        width={40} 
                        height={40}
                      />
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <ScrollArea className="flex-1 mt-4">
             <ul className="space-y-1 px-1">
                {navItems.map((item) => {
                    const Icon = iconMap[item.iconName || 'default'];
                    const isGroupActive = item.subItems ? item.subItems.some(sub => pathname.startsWith(sub.href)) : false;
                    const isActive = item.href ? pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)) : isGroupActive;

                    // --- REFACTORED: Use consistent dark style for active items --- //
                    const activeClasses = "bg-slate-900 text-white hover:bg-slate-800";
                    const inactiveClasses = "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700";

                    if (item.subItems && item.subItems.length > 0) {
                        return (
                            <li key={item.label}>
                                <Collapsible defaultOpen={isGroupActive}>
                                    <CollapsibleTrigger asChild>
                                        <button
                                            className={cn(
                                                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm w-full text-left transition-colors duration-200",
                                                isGroupActive ? activeClasses : inactiveClasses
                                            )}
                                        >
                                            <div className="flex h-8 w-8 items-center justify-center rounded-md">{<Icon />}</div>
                                            <AnimatePresence>
                                                {(isOpen || isMobile) && (
                                                    <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.12 }} className="flex-1">
                                                        {item.label}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                             {(isOpen || isMobile) && <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />}
                                        </button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <AnimatePresence>
                                        {(isOpen || isMobile) && (
                                          <motion.ul 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="ml-8 my-1 border-l border-slate-200 dark:border-slate-700"
                                          >
                                              {item.subItems.map(subItem => {
                                                  const isSubActive = pathname.startsWith(subItem.href);
                                                  return (
                                                      <li key={subItem.href}>
                                                          <Link href={subItem.href} className={cn(
                                                              "block pl-5 pr-3 py-1.5 text-sm rounded-r-md border-l-2 transition-colors duration-200",
                                                              isSubActive ? "text-slate-900 border-slate-900 font-semibold" : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200"
                                                          )}>
                                                              {subItem.label}
                                                          </Link>
                                                      </li>
                                                  )
                                              })}
                                          </motion.ul>
                                        )}
                                      </AnimatePresence>
                                    </CollapsibleContent>
                                </Collapsible>
                            </li>
                        );
                    }
                    
                    return (
                         <li key={item.href || item.label}>
                            <Link
                                href={item.href || '#'}
                                className={cn(
                                    `group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-200`,
                                    isActive ? activeClasses : inactiveClasses
                                )}
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-md">
                                    <Icon />
                                </div>
                                <AnimatePresence>
                                {(isOpen || isMobile) && (
                                    <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.12 }}>
                                    {item.label}
                                    </motion.span>
                                )}
                                </AnimatePresence>
                            </Link>
                        </li>
                    );
                })}
             </ul>
          </ScrollArea>
          
          {currentUser && (
            <div className="px-3 py-3 border-t flex-shrink-0">
                <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500 dark:text-slate-300">
                    <AnimatePresence>
                        {(isOpen || isMobile) && (
                             <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}>
                                <span className="block font-medium">{currentUser.name}</span>
                                <span className="block text-[11px] capitalize">{currentUser.role}</span>
                                 <span className="block text-[10px] text-muted-foreground">{currentUser.company}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <AnimatePresence>
                    {(isOpen || isMobile) && (
                    <motion.button
                        key="logout"
                        initial={{ opacity: 0, rotate: -10 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        exit={{ opacity: 0, rotate: -10 }}
                        onClick={() => logout()}
                        className="flex items-center gap-2 rounded-md px-2 py-1 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400"
                    >
                        <LogOut className="h-4 w-4"/>
                    </motion.button>
                    )}
                </AnimatePresence>
                </div>
            </div>
          )}
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={toggleSidebar} className="fixed inset-0 bg-black/60 z-40" />
                    <MotionNav />
                </React.Fragment>
            )}
        </AnimatePresence>
    );
  }

  return <MotionNav />;
}

/** SidebarTrigger - small clickable menu icon shown in header */
export function SidebarTrigger() {
  const { isOpen, setIsOpen } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsOpen(!isOpen)}
      className="rounded-full hover:bg-muted transition-colors duration-300"
      aria-label="Toggle Sidebar"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isOpen ? "x" : "menu"}
          initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </motion.div>
      </AnimatePresence>
    </Button>
  );
}
