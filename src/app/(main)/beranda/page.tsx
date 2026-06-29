// src/app/(main)/beranda/page.tsx
"use client";

import { useMemo, type ReactNode, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, ChevronLeft, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useMasterData } from '@/contexts/master-data-context';
import { getNavItems, iconMap } from '@/lib/nav-items';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';
import { useSubMenu } from '@/components/layout/submenu-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';

interface MenuButtonProps {
  href?: string;
  label: string;
  iconName: string;
  onClick?: () => void;
  hasSubItems: boolean;
}

function MenuButton({ href, label, iconName, onClick, hasSubItems }: MenuButtonProps) {
  const IconComponent = iconMap[iconName] || iconMap['default'];
  const pathname = usePathname();
  const isActive = href && (pathname === href || (href !== '/' && pathname.startsWith(href)));
  
  const content = (
      <div className="flex flex-col items-center justify-start space-y-1.5 group" onClick={onClick}>
        <div className={cn(
          "flex items-center justify-center w-14 h-14 rounded-xl bg-background shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:scale-105",
          isActive && "ring-2 ring-primary"
        )}>
          {IconComponent && <IconComponent className="w-6 h-6 text-muted-foreground group-hover:text-primary" />}
        </div>
        <span className="text-[10px] text-center font-medium text-muted-foreground group-hover:text-foreground h-8">{label}</span>
      </div>
  );

  return href && !hasSubItems ? <Link href={href} className="w-full">{content}</Link> : <div className="cursor-pointer w-full">{content}</div>;
}

export default function BerandaPage() {
    const { logout, userRole, currentUser } = useAuth();
    const { employees, companies, subscriptionPlans, okrs } = useMasterData();
    const { setActiveGroup, setIconMap } = useSubMenu();
    const router = useRouter();
    const isMobile = useIsMobile();

    useEffect(() => {
        // Pass iconMap to the context so the overlay can use it
        setIconMap(iconMap);
    }, [setIconMap]);

    useEffect(() => {
      // If a non-mobile user lands here, redirect them to their default page.
      if (isMobile === false) { 
        if (userRole === 'superadmin') {
          router.replace('/dashboard');
        } else if (userRole === 'manajemen') {
          router.replace('/reports');
        } else {
          router.replace('/action-center');
        }
      }
    }, [isMobile, userRole, router]);

    const hasSubordinates = useMemo(() => {
        if (!currentUser) return false;
        return employees.some(e => e.reportsTo === currentUser.id);
    }, [currentUser, employees]);
    
    const userCompany = useMemo(() => {
        if (!currentUser) return null;
        return companies.find(c => c.name === currentUser.company);
    }, [currentUser, companies]);
    
    const userSubscriptionPlan = useMemo(() => {
        if (!userCompany) return null;
        const relevantCompany = userCompany.parentId ? companies.find(c => c.id === userCompany.parentId) : userCompany;
        if (!relevantCompany) return null;
        return subscriptionPlans.find(p => p.id === relevantCompany.subscriptionPlanId);
    }, [userCompany, companies, subscriptionPlans]);

    const navItems = useMemo(() => {
        return getNavItems(userRole, hasSubordinates, userCompany, userSubscriptionPlan, !!isMobile, currentUser, okrs);
    }, [userRole, hasSubordinates, userCompany, userSubscriptionPlan, isMobile, currentUser, okrs]);

    const menuButtons = useMemo(() => {
        if (!navItems || !Array.isArray(navItems)) return [];
        
        return navItems.map(item => ({
            ...item,
            href: item.href || undefined,
            label: item.label,
            iconName: item.iconName || item.href || 'default',
            hasSubItems: !!item.subItems && item.subItems.length > 0,
        }));
    }, [navItems]);
    
    const handleGroupClick = (item: any) => {
        if (item.hasSubItems) {
            setActiveGroup(item);
        }
    };
    
    // Render nothing on the server or on desktop while redirecting.
    if (isMobile !== true) {
      return null;
    }

    return (
        <div className="space-y-6">
            <div className="mb-4">
                <Badge variant="outline" className="text-sm font-normal py-1 px-3 bg-background/50 backdrop-blur-sm">
                    Selamat Datang, <span className="font-semibold ml-1">{currentUser?.name || 'Pengguna'}!</span>
                </Badge>
            </div>

            <Card className="overflow-hidden shadow-lg border-none bg-background/60 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="font-headline">Semua Menu</CardTitle>
                    <CardDescription>
                        Akses fitur {userSubscriptionPlan?.name || 'TRIAL'} yang tersedia untuk Anda.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-x-2 gap-y-3">
                        {menuButtons.map(item => (
                            <MenuButton
                                key={item.href || item.label}
                                href={item.href}
                                label={item.label}
                                iconName={item.iconName}
                                onClick={() => handleGroupClick(item)}
                                hasSubItems={item.hasSubItems}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-lg border-none bg-background/60 backdrop-blur-md">
                <CardContent className="p-4">
                     <Button variant="destructive" className="w-full justify-center gap-2 font-bold h-12 rounded-xl" onClick={logout}>
                        <LogOut className="h-5 w-5" />
                        Keluar
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
