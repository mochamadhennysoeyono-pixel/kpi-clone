
// src/components/layout/header.tsx
'use client';

import {useState, useEffect} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CircleUser,
  LogOut,
  Settings,
  LayoutGrid
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
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';


function LiveClock() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!currentTime) {
    return (
      <div className="w-48 h-5 bg-muted rounded animate-pulse" />
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
      <span>
        {format(currentTime, 'eeee,', {locale: id})}
      </span>
      <span className="text-muted-foreground">
        {format(currentTime, 'd MMMM yyyy, HH:mm:ss')}
      </span>
    </div>
  );
}

function DropdownLabel({ user }: { user: Employee | null }) {
    if (!user) return null;

    return (
      <DropdownMenuLabel className='font-normal'>
        <div className='flex flex-col space-y-1'>
            <p className='text-sm font-medium leading-none'>{user.name}</p>
            <p className='text-xs leading-none text-muted-foreground'>{user.email}</p>
        </div>
      </DropdownMenuLabel>
    );
}

export default function Header() {
  const { currentUser, userRole, logout } = useAuth();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const isPortal = pathname === '/portal';
  
  const handleLogout = () => {
    logout();
  };
  
  return (
    <header className={cn(
        "flex h-[65px] items-center justify-between gap-4 border-b px-4 sm:px-6 sticky top-0 z-50",
        "bg-background/80 backdrop-blur-lg",
        "no-print"
    )}>
        <div className="flex items-center gap-3">
          {(isMobile || isPortal) ? (
            <div className="flex items-center gap-3">
                <Image 
                    src="/logo.png" 
                    alt="Logo"
                    width={120}
                    height={32}
                />
                {!isPortal && <Separator orientation="vertical" className="h-6" />}
            </div>
          ) : (
            <SidebarTrigger />
          )}
        </div>

      <div className="hidden md:flex">
        {isPortal ? (
            <Badge variant="outline" className="h-9 px-4 rounded-xl gap-2 font-bold uppercase tracking-widest bg-primary/5 border-primary/20 text-primary">
                <LayoutGrid size={16} />
                Portal Modul KIPIAI
            </Badge>
        ) : <LiveClock />}
      </div>

      <div className='flex items-center gap-2'>
        <NotificationBell />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-full w-10 h-10 hover:bg-muted",
              )}
            >
              <CircleUser className="h-6 w-6" />
              <span className="sr-only">Buka menu pengguna</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownLabel user={currentUser} />
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4"/>
                  {userRole === 'superadmin' ? 'Pengaturan' : 'Profil'}
                </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Keluar</span>
              </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
