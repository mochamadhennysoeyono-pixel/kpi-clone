// src/components/layout/notification-bell.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Circle, CheckCircle2, MoreHorizontal, Maximize2, Minimize2, X, AtSign, Target, ClipboardCheck, GraduationCap, Building, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase/client";
import { collection, query, where, onSnapshot, limit, doc, updateDoc } from "firebase/firestore";
import type { Notification } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Avatar, AvatarFallback } from "../ui/avatar";

const categoryIcons: Record<string, any> = {
    'KPI': ClipboardCheck,
    'OKR': Target,
    'CollabSpace': Building,
    'LMS': GraduationCap,
    'Sistem': Building,
    'Registrasi': UserPlus,
};

const categoryColors: Record<string, string> = {
    'KPI': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
    'OKR': 'bg-purple-100 text-purple-600 dark:bg-purple-900/30',
    'CollabSpace': 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30',
    'LMS': 'bg-amber-100 text-amber-600 dark:bg-amber-900/30',
    'Sistem': 'bg-rose-100 text-rose-600 dark:bg-rose-900/30',
    'Registrasi': 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30',
};

function NotificationItem({ notif, onClick }: { notif: Notification, onClick: (n: Notification) => void }) {
    const Icon = categoryIcons[notif.category] || Bell;
    const colorClass = categoryColors[notif.category] || 'bg-muted text-muted-foreground';
    
    return (
        <div 
            className={cn(
                "group flex items-start gap-4 p-4 cursor-pointer transition-all hover:bg-muted/50 border-b last:border-0 relative",
                !notif.isRead && "bg-primary/5"
            )}
            onClick={() => onClick(notif)}
        >
            <Avatar className="size-10 shrink-0 border shadow-sm">
                <AvatarFallback className="bg-muted text-[10px] font-black uppercase text-muted-foreground">
                    {notif.senderName.substring(0, 2)}
                </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-start gap-2">
                    <p className={cn(
                        "text-sm leading-tight text-foreground",
                        !notif.isRead ? "font-bold" : "font-medium opacity-80"
                    )}>
                        {notif.message}
                    </p>
                    {!notif.isRead && (
                        <div className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    )}
                </div>
                
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>{notif.timestamp ? formatDistanceToNow(notif.timestamp.toDate(), { addSuffix: true, locale: localeId }) : 'Baru saja'}</span>
                    <span>•</span>
                    <span className={cn("px-1.5 py-0.5 rounded", colorClass)}>{notif.category}</span>
                </div>
            </div>
        </div>
    );
}

export function NotificationBell() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", currentUser.id),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notifs: Notification[] = [];
      let count = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Notification;
        notifs.push({ ...data, id: doc.id });
        if (!data.isRead) {
          count++;
        }
      });
      
      notifs.sort((a, b) => {
        const dateA = a.timestamp?.toDate() || new Date(0);
        const dateB = b.timestamp?.toDate() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setNotifications(notifs);
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      const notifRef = doc(db, "notifications", notification.id);
      await updateDoc(notifRef, { isRead: true });
    }
    setOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const markAllAsRead = async () => {
      const unreadNotifs = notifications.filter(n => !n.isRead);
      for (const notif of unreadNotifs) {
          const notifRef = doc(db, "notifications", notif.id);
          await updateDoc(notifRef, { isRead: true });
      }
  };

  const mentionsCount = notifications.filter(n => !n.isRead && n.message.includes('@')).length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-muted transition-colors">
          <Bell className="h-5 w-5 text-foreground/70" />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-background"></span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className={cn(
            "p-0 overflow-hidden rounded-2xl shadow-2xl border-none gap-0 transition-all duration-300",
            isWide ? "w-[520px]" : "w-[380px]"
        )}
      >
        <div className="p-6 pb-4 flex items-center justify-between bg-background">
            <h2 className="text-xl font-headline font-bold">Notifications</h2>
            <div className="flex items-center gap-2">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsWide(!isWide);
                    }}
                >
                    {isWide ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpen(false);
                    }}
                >
                    <X size={18} />
                </Button>
            </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
            <div className="px-6 flex items-center justify-between border-b bg-background">
                <TabsList className="bg-transparent h-10 gap-6 p-0">
                    <TabsTrigger value="all" className="relative rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-widest text-muted-foreground data-[state=active]:text-foreground">
                        All {unreadCount > 0 && <span className="ml-1.5 size-4 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[9px]">{unreadCount}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="unread" className="relative rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-widest text-muted-foreground data-[state=active]:text-foreground">
                        Unread
                    </TabsTrigger>
                    <TabsTrigger value="mentions" className="relative rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 text-xs font-bold uppercase tracking-widest text-muted-foreground data-[state=active]:text-foreground">
                        Mentions {mentionsCount > 0 && <span className="ml-1.5 size-4 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[9px]">{mentionsCount}</span>}
                    </TabsTrigger>
                </TabsList>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-[10px] font-bold uppercase text-primary hover:bg-primary/5"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        markAllAsRead();
                    }}
                >
                    Mark all read
                </Button>
            </div>

            <ScrollArea className="h-[450px] bg-background">
                <TabsContent value="all" className="m-0">
                    {notifications.length > 0 ? (
                        notifications.map(n => <NotificationItem key={n.id} notif={n} onClick={handleNotificationClick} />)
                    ) : (
                        <EmptyState />
                    )}
                </TabsContent>
                <TabsContent value="unread" className="m-0">
                    {notifications.filter(n => !n.isRead).length > 0 ? (
                        notifications.filter(n => !n.isRead).map(n => <NotificationItem key={n.id} notif={n} onClick={handleNotificationClick} />)
                    ) : (
                        <EmptyState message="Semua notifikasi sudah dibaca." />
                    )}
                </TabsContent>
                <TabsContent value="mentions" className="m-0">
                    {notifications.filter(n => n.message.includes('@')).length > 0 ? (
                        notifications.filter(n => n.message.includes('@')).map(n => <NotificationItem key={n.id} notif={n} onClick={handleNotificationClick} />)
                    ) : (
                        <EmptyState message="Belum ada mention untuk Anda." />
                    )}
                </TabsContent>
            </ScrollArea>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState({ message = "Belum ada notifikasi baru." }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-10 text-center space-y-3 opacity-20">
            <Bell size={40} className="text-muted-foreground" />
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
}
