
// src/components/ui/sidebar.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CaretLeft, CaretDown, SignOut, Layout, Folders } from "@phosphor-icons/react";
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { getNavItems, iconMap, getActiveModuleFromPath, getIconColor } from '@/lib/nav-items';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "./button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "./scroll-area";
import { useSidebar } from "@/contexts/sidebar-context";
import { Avatar, AvatarFallback } from "./avatar";

/** AppSidebar component - Mini Expanding Sidebar */
function MotionNav() {
  const { isOpen, setIsOpen } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
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
        animate={isMobile ? { x: isOpen ? 0 : "-100%" } : { width: isOpen ? 260 : 80 }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        className={cn(
          "flex flex-col h-screen sticky left-0 top-0 z-50 border-r bg-white no-print",
          isMobile ? "fixed h-full border-none shadow-2xl" : ""
        )}
        onMouseEnter={() => !isMobile && setIsOpen(true)}
        onMouseLeave={() => !isMobile && setIsOpen(false)}
      >
        <div className="flex items-center justify-between px-6 py-8 flex-shrink-0 h-[65px]">
          <div className="flex items-center justify-center min-h-[32px]">
            <AnimatePresence mode="wait">
              {isOpen || isMobile ? (
                <motion.div
                  key="full-logo"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  className="flex items-center gap-2"
                >
                  <Image src="/logo.png" alt="Logo" width={110} height={28} priority />
                </motion.div>
              ) : (
                <motion.div
                  key="mini-logo"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="size-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-stripe"
                >
                  <Image src="/favicon.png" alt="Logo" width={24} height={24} priority />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <ScrollArea className="flex-1 px-3">
             <ul className="space-y-1.5 mt-6">
                {navItems.map((item) => {
                    const RawIcon = iconMap[item.iconName || 'default'] || Folders;
                    const Icon = RawIcon;
                    const isGroupActive = item.subItems ? item.subItems.some(sub => pathname.startsWith(sub.href)) : false;
                    const isActive = item.href ? pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)) : isGroupActive;
                    const iconColor = getIconColor(item.href || item.label);

                    if (item.subItems && item.subItems.length > 0) {
                        return (
                            <li key={item.label}>
                                <Collapsible defaultOpen={isGroupActive}>
                                    <CollapsibleTrigger asChild>
                                        <button
                                            className={cn(
                                                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm w-full text-left transition-all",
                                                isGroupActive ? "text-primary bg-primary/5 font-bold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                            )}
                                        >
                                            <div className="flex size-5 items-center justify-center shrink-0 transition-transform group-hover:scale-125">
                                              {Icon && <Icon size={22} weight="fill" color={iconColor} className="opacity-100" />}
                                            </div>
                                            {(isOpen || isMobile) && (
                                                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 font-bold tracking-tight text-[11px]">
                                                    {item.label}
                                                </motion.span>
                                            )}
                                             {(isOpen || isMobile) && <CaretDown size={12} className="opacity-30 group-data-[state=open]:rotate-180 transition-transform" weight="bold" />}
                                        </button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        {(isOpen || isMobile) && (
                                          <ul className="ml-7 my-1 border-l border-slate-100 space-y-0.5">
                                              {item.subItems.map(subItem => {
                                                  const isSubActive = pathname.startsWith(subItem.href);
                                                  return (
                                                      <li key={subItem.href}>
                                                          <Link href={subItem.href} className={cn(
                                                              "block pl-4 pr-3 py-2 text-[11px] font-bold tracking-tight transition-all",
                                                              isSubActive ? "text-primary bg-primary/5 font-black" : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"
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
                            </li>
                        );
                    }
                    
                    return (
                         <li key={item.href || item.label}>
                            <Link
                                href={item.href || '#'}
                                className={cn(
                                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all`,
                                    isActive ? "bg-white border border-slate-100 shadow-md font-bold ring-1 ring-primary/5" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <div className="flex size-5 items-center justify-center shrink-0 transition-transform group-hover:scale-125">
                                    {Icon && <Icon size={22} weight="fill" color={iconColor} className="opacity-100" />}
                                </div>
                                {(isOpen || isMobile) && (
                                    <span className="font-bold tracking-tight text-[11px]">
                                    {item.label}
                                    </span>
                                )}
                            </Link>
                        </li>
                    );
                })}
             </ul>
        </ScrollArea>
        
        <div className="p-4 border-t border-slate-50 flex-shrink-0">
            <button
                onClick={() => logout()}
                className={cn(
                  "flex items-center gap-3 w-full rounded-xl transition-all active:scale-95 group",
                  isOpen || isMobile ? "p-2 hover:bg-slate-50" : "justify-center"
                )}
            >
                <Avatar className="size-9 border border-slate-100 shrink-0 shadow-sm">
                  <AvatarFallback className="bg-primary/5 text-primary font-black text-[10px]">{userInitial}</AvatarFallback>
                </Avatar>
                
                {(isOpen || isMobile) && (
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[11px] font-black text-slate-900 truncate tracking-tight">{currentUser?.name}</p>
                    <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase group-hover:text-destructive transition-colors tracking-widest">
                        <SignOut size={10} weight="bold" />
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={toggleSidebar} className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100]" />
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
    <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="hover:bg-slate-50 rounded-xl">
      <Layout size={20} weight="bold" className="text-slate-600" />
    </Button>
  );
}
