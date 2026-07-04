// src/components/layout/header.tsx
'use client';

import {useState, useEffect} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CircleUser,
  LogOut,
  Settings,
  LayoutGrid,
  ChevronLeft,
  Menu
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {format} from 'date-fns';
import {id} from 'date-fns/locale';
import { useAuth, type Employee } from '@/contexts/auth-context';
import Image from 'next/image';
import { NotificationBell } from './notification-bell';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/sidebar-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

function LiveClock() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!currentTime) {
    return (
      <div className="w-48 h-5 bg-white/5 rounded animate-pulse" />
    );
  }

  return (
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
      <span className="text-foreground/80">
        {format(currentTime, 'eeee,', {locale: id})}
      </span>
      <span className="tabular-nums">
        {format(currentTime, 'd MMMM yyyy, HH:mm:ss')}
      </span>
    </div>
  );
}

export default function Header() {
  const { currentUser, userRole, logout } = useAuth();
  const isMobile = useIsMobile();
  const { isOpen, setIsOpen } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const isPortal = pathname === '/portal';
  
  return (
    <header className={cn(
        "flex h-[65px] items-center justify-between gap-4 border-b px-4 sm:px-8 sticky top-0 z-50",
        "bg-background/80 backdrop-blur-xl",
        "no-print"
    )}>
        <div className="flex items-center gap-3">
          {isMobile ? (
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
                    <Menu className="size-5" />
                </Button>
                <Image src="/logo.png" alt="Logo" width={90} height={24} className="brightness-200" priority />
            </div>
          ) : (
            <div className="flex items-center gap-4">
                {!isOpen && (
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} className="hover:bg-white/5">
                        <Menu className="size-5" />
                    </Button>
                )}
                {userRole !== 'superadmin' && !isPortal && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push('/portal')}
                        className="gap-2 font-semibold text-xs text-primary hover:text-white hover:bg-primary transition-all px-3 h-8 border border-primary/20 rounded-lg"
                    >
                        <ChevronLeft size={14} className="stroke-[3px]" />
                        Portal
                    </Button>
                )}
            </div>
          )}
        </div>

      <div className="hidden md:flex">
        {isPortal ? (
            <Badge variant="outline" className="h-7 px-3 rounded-lg gap-2 font-semibold text-[11px] bg-primary/5 border-primary/20 text-primary">
                <LayoutGrid size={12} />
                Portal Utama Perfom
            </Badge>
        ) : <LiveClock />}
      </div>

      <div className='flex items-center gap-3'>
        <NotificationBell />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 hover:bg-white/5 border border-white/5">
              <CircleUser className="h-5 w-5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card border-border shadow-2xl">
            <DropdownMenuLabel className="p-3">
                <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Akun Saya</p>
                <p className="text-sm font-bold truncate">{currentUser?.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{currentUser?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem asChild className="p-3 cursor-pointer">
                <Link href="/settings" className="flex items-center gap-3">
                  <Settings size={14} className="opacity-60"/>
                  <span className="text-xs font-bold">Pengaturan</span>
                </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={() => logout()} className="p-3 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut size={14} className="mr-3" />
                  <span className="text-xs font-bold">Keluar</span>
              </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
