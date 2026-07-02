// src/components/ui/sidebar.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, X, ChevronDown, Menu } from "lucide-react";
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { getNavItems, iconMap, getActiveModuleFromPath } from '@/lib/nav-items';
import type { Employee, OKR, ModuleId } from "@/types";
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
import { Separator } from "./separator";

/** AppSidebar component - mini expandable sidebar with White Glassmorphism */
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
  }, [companies, currentUser]);

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
        animate={isMobile ? { x: isOpen ? 0 : "-100%" } : { width: isOpen ? 280 : 88 }}
        transition={{ type: "spring", stiffness: 300, damping: 35 }}
        className={cn(
          "flex flex-col h-[calc(100vh-2rem)] sticky left-0 top-4 z-50 ml-4 mb-4",
          "bg-white/80 backdrop-blur-xl border border-white shadow-2xl rounded-[1.5rem] overflow-hidden",
          isMobile ? "fixed h-[calc(100vh-1rem)] top-2 ml-2" : "relative"
        )}
        onMouseEnter={() => !isMobile && setIsOpen(true)}
      >
        {/* Top Header Section: Now with Adaptive Logo */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-center min-h-[40px]">
            <AnimatePresence mode="wait">
              {isOpen || isMobile ? (
                <motion.div
                  key="full-logo"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Image 
                    src="/logo.png" 
                    alt="Logo" 
                    width={120} 
                    height={32} 
                    className="object-contain"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="favicon-logo"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Image 
                    src="/favicon.png" 
                    alt="Favicon" 
                    width={32} 
                    height={32} 
                    className="object-contain"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <AnimatePresence>
            {(isOpen || isMobile) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <Separator className="bg-slate-200/60 mx-6 w-auto mb-2" />

        <ScrollArea className="flex-1 px-4">
             <ul className="space-y-1.5 py-4">
                {activeModule && (isOpen || isMobile) && (
                    <li className="mb-6">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => router.push('/portal')}
                            className="w-full justify-start gap-3 font-black text-[10px] uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 h-11 rounded-2xl border border-primary/10"
                        >
                            <ChevronLeft size={16} className="stroke-[3px]" />
                            <span>PORTAL UTAMA</span>
                        </Button>
                    </li>
                )}

                {navItems.map((item) => {
                    const Icon = iconMap[item.iconName || 'default'];
                    const isGroupActive = item.subItems ? item.subItems.some(sub => pathname.startsWith(sub.href)) : false;
                    const isActive = item.href ? pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)) : isGroupActive;

                    const activeClasses = "bg-primary text-white shadow-lg";
                    const inactiveClasses = "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

                    if (item.subItems && item.subItems.length > 0) {
                        return (
                            <li key={item.label}>
                                <Collapsible defaultOpen={isGroupActive}>
                                    <CollapsibleTrigger asChild>
                                        <button
                                            className={cn(
                                                "group flex items-center gap-4 rounded-xl px-4 py-3 text-xs w-full text-left transition-all duration-300",
                                                isGroupActive ? "text-primary bg-primary/5 font-bold" : inactiveClasses
                                            )}
                                        >
                                            <div className="flex size-5 items-center justify-center shrink-0">
                                              <Icon size={20} className={cn("transition-colors", isGroupActive ? "text-primary" : "opacity-60")} />
                                            </div>
                                            <AnimatePresence>
                                                {(isOpen || isMobile) && (
                                                    <motion.span 
                                                      initial={{ opacity: 0, x: -10 }} 
                                                      animate={{ opacity: 1, x: 0 }} 
                                                      exit={{ opacity: 0, x: -10 }} 
                                                      className="flex-1 font-bold tracking-tight"
                                                    >
                                                        {item.label}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                             {(isOpen || isMobile) && <ChevronDown size={14} className="shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180 opacity-40" />}
                                        </button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <AnimatePresence>
                                        {(isOpen || isMobile) && (
                                          <motion.ul 
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="ml-6 my-1 border-l border-slate-200"
                                          >
                                              {item.subItems.map(subItem => {
                                                  const isSubActive = pathname.startsWith(subItem.href);
                                                  return (
                                                      <li key={subItem.href}>
                                                          <Link href={subItem.href} className={cn(
                                                              "block pl-6 pr-3 py-2 text-[11px] rounded-r-xl border-l-2 transition-all duration-300",
                                                              isSubActive ? "text-primary border-primary font-black bg-primary/5" : "text-slate-500 border-transparent hover:text-slate-900"
                                                          )}>
                                                              {subItem.label.toUpperCase()}
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
                                    `group flex items-center gap-4 rounded-xl px-4 py-3 text-xs transition-all duration-300 font-bold`,
                                    isActive ? activeClasses : inactiveClasses
                                )}
                            >
                                <div className="flex size-5 items-center justify-center shrink-0">
                                    <Icon size={20} className={cn(!isActive && "opacity-60")} />
                                </div>
                                <AnimatePresence>
                                {(isOpen || isMobile) && (
                                    <motion.span 
                                      initial={{ opacity: 0, x: -10 }} 
                                      animate={{ opacity: 1, x: 0 }} 
                                      exit={{ opacity: 0, x: -10 }}
                                      className="font-bold tracking-tight"
                                    >
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
          
          {/* Bottom Section: Integrated Profile & Logout */}
          {currentUser && (
            <div className="p-4 flex-shrink-0">
                <button
                    onClick={() => logout()}
                    className={cn(
                      "flex items-center gap-3 w-full rounded-2xl transition-all active:scale-95 border shadow-sm group overflow-hidden",
                      isOpen || isMobile ? "p-2 bg-slate-50 hover:bg-red-50 border-slate-200/60 hover:border-red-200" : "p-1 bg-transparent border-transparent justify-center"
                    )}
                >
                    <Avatar className={cn("size-10 border-2 border-white shadow-sm shrink-0", !isOpen && !isMobile && "size-12")}>
                      <AvatarFallback className="bg-primary text-white font-black text-sm">{userInitial}</AvatarFallback>
                    </Avatar>
                    
                    <AnimatePresence>
                        {(isOpen || isMobile) && (
                          <motion.div 
                            initial={{ opacity: 0, width: 0 }} 
                            animate={{ opacity: 1, width: "auto" }} 
                            exit={{ opacity: 0, width: 0 }}
                            className="flex-1 text-left min-w-0"
                          >
                            <p className="text-xs font-black text-slate-900 truncate leading-tight uppercase tracking-tight">{currentUser.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-slate-500 group-hover:text-red-600 transition-colors">
                                <LogOut size={10} className="shrink-0" />
                                <span className="text-[9px] font-black uppercase tracking-widest">LOG OUT</span>
                            </div>
                          </motion.div>
                        )}
                    </AnimatePresence>
                </button>
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={toggleSidebar} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
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
      className="rounded-xl hover:bg-slate-100 transition-colors duration-300"
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

