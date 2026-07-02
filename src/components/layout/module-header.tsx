"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { getNavItems, iconMap, getActiveModuleFromPath } from '@/lib/nav-items';
import { cn } from '@/lib/utils';
import { 
    ChevronLeft, 
    LayoutGrid, 
    Database, 
    ChevronDown,
    LogOut,
    Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const MODULE_NAMES: Record<string, string> = {
    'appraisal': 'Appraisal Module',
    'lms': 'LMS Module',
    'collabspace': 'CollabSpace'
};

export function ModuleHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { currentUser, userRole, logout } = useAuth();
    const { employees, companies, subscriptionPlans, okrs } = useMasterData();

    const activeModule = useMemo(() => {
        return getActiveModuleFromPath(pathname);
    }, [pathname]);

    const userCompany = useMemo(() => {
        if (!currentUser) return null;
        return companies.find(c => c.name === currentUser.company) || null;
    }, [currentUser, companies]);

    const userSubscriptionPlan = useMemo(() => {
        if (!userCompany) return null;
        const relevantCompany = userCompany.parentId ? (companies.find(c => c.id === userCompany.parentId) || userCompany) : userCompany;
        return subscriptionPlans.find(p => p.id === relevantCompany.subscriptionPlanId) || null;
    }, [userCompany, companies, subscriptionPlans]);

    const hasSubordinates = useMemo(() => {
        if (!currentUser) return false;
        return employees.some(e => e.reportsTo === currentUser.id);
    }, [currentUser, employees]);

    const navItems = useMemo(() => {
        return getNavItems(userRole, hasSubordinates, userCompany, userSubscriptionPlan, false, currentUser, okrs);
    }, [userRole, hasSubordinates, userCompany, userSubscriptionPlan, currentUser, okrs]);

    const moduleNav = useMemo(() => {
        if (!activeModule) return [];
        return navItems.filter((item: any) => {
            if (item.moduleId === activeModule) return true;
            if (item.subItems && item.subItems.some((sub: any) => sub.moduleId === activeModule)) return true;
            return false;
        });
    }, [navItems, activeModule]);

    const pondasiNav = useMemo(() => {
        return navItems.find((item: any) => item.label === 'Pondasi Data') || null;
    }, [navItems]);

    if (!activeModule) return null;

    return (
        <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4 sticky top-0 z-[100] shadow-sm no-print">
            <div className="flex items-center gap-4 w-full max-w-7xl mx-auto">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push('/portal')}
                    className="gap-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary transition-all active:scale-95 px-2"
                >
                    <ChevronLeft size={16} className="stroke-[3px]" />
                    <span className="hidden sm:inline">Portal</span>
                </Button>

                <Separator orientation="vertical" className="h-6 opacity-40" />

                <div className="flex items-center gap-3 shrink-0">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                        <LayoutGrid size={18} />
                    </div>
                    <span className="font-black text-xs uppercase tracking-widest hidden lg:inline-block">
                        {MODULE_NAMES[activeModule as string] || 'Modul'}
                    </span>
                </div>

                <div className="flex-1 overflow-x-auto no-scrollbar mx-4">
                    <nav className="flex items-center gap-1 min-w-max">
                        {moduleNav.map((item: any) => {
                            if (item.subItems) {
                                return (
                                    <DropdownMenu key={item.label}>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-9 px-3 gap-1.5 text-[11px] font-bold uppercase tracking-tight hover:bg-primary/5 text-foreground/70 data-[state=open]:text-primary">
                                                {item.label}
                                                <ChevronDown size={12} className="opacity-40" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-56 rounded-xl shadow-xl border-none p-2">
                                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground mb-1">{item.label}</DropdownMenuLabel>
                                            {item.subItems.map((sub: any) => {
                                                const SubIcon = iconMap[sub.iconName || sub.href || 'default'] || LayoutGrid;
                                                const isActive = pathname.startsWith(sub.href);
                                                return (
                                                    <DropdownMenuItem key={sub.href} asChild>
                                                        <Link href={sub.href} className={cn(
                                                            "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all",
                                                            isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted"
                                                        )}>
                                                            <SubIcon size={14} className={cn(isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                                                            <span className="text-xs font-semibold">{sub.label}</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                );
                                            })}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                );
                            }

                            const isActive = item.href === pathname;
                            const Icon = iconMap[item.iconName || item.href || 'default'] || LayoutGrid;
                            return (
                                <Link key={item.href || item.label} href={item.href || '#'}>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className={cn(
                                            "h-9 px-3 gap-2 text-[11px] font-bold uppercase tracking-tight rounded-lg transition-all",
                                            isActive ? "bg-primary text-primary-foreground shadow-md" : "text-foreground/70 hover:bg-primary/5"
                                        )}
                                    >
                                        <Icon size={14} className={isActive ? "text-primary-foreground" : "text-muted-foreground"} />
                                        {item.label}
                                    </Button>
                                </Link>
                            );
                        })}

                        {pondasiNav && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-9 px-3 gap-1.5 text-[11px] font-bold uppercase tracking-tight hover:bg-primary/5 text-foreground/70">
                                        <Database size={14} className="opacity-40" />
                                        Pondasi Data
                                        <ChevronDown size={12} className="opacity-40" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-64 rounded-xl shadow-xl border-none p-2">
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground mb-1">Master Data Perusahaan</DropdownMenuLabel>
                                    <DropdownMenuGroup>
                                        {(pondasiNav.subItems || []).map((sub: any) => {
                                            const SubIcon = iconMap[sub.iconName || sub.href || 'default'] || Database;
                                            const isActive = pathname.startsWith(sub.href);
                                            return (
                                                <DropdownMenuItem key={sub.href} asChild>
                                                    <Link href={sub.href} className={cn(
                                                        "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all",
                                                        isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted"
                                                    )}>
                                                        <SubIcon size={14} className={isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                                                        <span className="text-xs font-semibold">{sub.label}</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </nav>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-10 gap-3 px-2 rounded-xl hover:bg-muted shrink-0">
                            <div className="hidden sm:flex flex-col items-end">
                                <span className="text-xs font-black uppercase tracking-tight">{currentUser?.name?.split(' ')[0]}</span>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 leading-none">{userRole}</span>
                            </div>
                            <Avatar className="size-8 border shadow-sm">
                                <AvatarFallback className="text-[10px] font-black bg-primary text-white">
                                    {currentUser?.name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-2xl border-none p-2">
                        <DropdownMenuLabel className="p-3">
                            <p className="text-xs font-black uppercase tracking-widest text-primary mb-0.5">Akun Anda</p>
                            <p className="text-sm font-bold truncate">{currentUser?.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{currentUser?.email}</p>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="p-3 rounded-lg cursor-pointer">
                            <Link href="/settings" className="flex items-center gap-3">
                                <Settings size={14} className="text-muted-foreground" />
                                <span className="text-xs font-bold">Pengaturan Profil</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => logout()} className="p-3 rounded-lg cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <LogOut size={14} />
                            <span className="text-xs font-bold">Keluar Sistem</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}