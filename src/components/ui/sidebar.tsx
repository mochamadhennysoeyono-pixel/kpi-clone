
// src/components/ui/sidebar.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, X, ChevronDown, Menu, ChevronLeft } from "lucide-react";
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

/** AppSidebar component - mini expandable sidebar with Seamless White Aesthetic */
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
        animate={isMobile ? { x: isOpen ? 0 : "-100%" } : { width: isOpen ? 280 : 88 }}
        transition={{ type: "spring", stiffness: 300, damping: 35 }}
        className={cn(
          "flex flex-col h-[calc(100vh-2rem)] sticky left-0 top-4 z-50 ml-4 mb-4",
          "bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] overflow-hidden",
          isMobile ? "fixed h-[calc(100vh-1rem)] top-2 ml-2" : "relative"
        )}
        onMouseEnter={() => !isMobile && setIsOpen(true)}
      >
        {/* Top Header Section */}
        <div className="flex items-center justify-between px-6 pt-7 pb-6 flex-shrink-0">
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
                className="size-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <ScrollArea className="flex-1 px-4">
             <ul className="space-y-1.5 pb-10">
                {/* MOD: Portal link is only for non-superadmins */}
                {activeModule && userRole !== 'superadmin' && (isOpen || isMobile) && (
                    <li className="mb-6 px-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => router.push('/portal')}
                            className="w-full justify-start gap-3 font-black text-[10px] uppercase tracking-widest text-primary bg-slate-50 hover:bg-slate-100 h-11 rounded-2xl border border-slate-100"
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

                    const activeClasses = "bg-primary text-white shadow-md";
                    const inactiveClasses = "text-slate-500 hover:bg-slate-50 hover:text-slate-900";

                    if (item.subItems && item.subItems.length > 0) {
                        return (
                            <li key={item.label}>
                                <Collapsible defaultOpen={isGroupActive}>
                                    <CollapsibleTrigger asChild>
                                        <button
                                            className={cn(
                                                "group flex items-center gap-4 rounded-xl px-4 py-3 text-xs w-full text-left transition-all duration-300",
                                                isGroupActive ? "text-primary bg-slate-50 font-bold" : inactiveClasses
                                            )}
                                        >
                                            <div className="flex size-5 items-center justify-center shrink-0">
                                              <Icon size={20} className={cn("transition-colors", isGroupActive ? "text-primary" : "opacity-70")} />
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
                                             {(isOpen || isMobile) && <ChevronDown size={14} className="shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180 opacity-30" />}
                                        </button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <AnimatePresence>
                                        {(isOpen || isMobile) && (
                                          <motion.ul 
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="ml-6 my-1 border-l border-slate-100"
                                          >
                                              {item.subItems.map(subItem => {
                                                  const isSubActive = pathname.startsWith(subItem.href);
                                                  return (
                                                      <li key={subItem.href}>
                                                          <Link href={subItem.href} className={cn(
                                                              "block pl-6 pr-3 py-2 text-[11px] rounded-r-xl border-l-2 transition-all duration-300",
                                                              isSubActive ? "text-primary border-primary font-black bg-slate-50" : "text-slate-400 border-transparent hover:text-slate-900"
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
                                    <Icon size={20} className={cn(!isActive && "opacity-70")} />
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
                      "flex items-center gap-3 w-full rounded-2xl transition-all active:scale-95 border border-slate-100 shadow-sm group overflow-hidden",
                      isOpen || isMobile ? "p-2 bg-slate-50 hover:bg-red-50 hover:border-red-100" : "p-1 bg-transparent border-transparent justify-center"
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
                            <div className="flex items-center gap-1.5 mt-0.5 text-slate-400 group-hover:text-red-500 transition-colors">
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
  const isMobile = useIsMobile();

  // On mobile, we don't show the sidebar trigger anymore because the header shows the logo
  if (isMobile) return null;

  // On desktop, we hide the trigger if the sidebar is already open
  if (isOpen) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsOpen(!isOpen)}
      className="rounded-xl hover:bg-slate-100 transition-colors duration-300"
      aria-label="Toggle Sidebar"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
