
// src/app/(main)/collab-space/[spaceId]/page.tsx
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
    ChevronLeft, 
    MessageSquare, 
    ListTodo, 
    BellRing, 
    Calendar, 
    Files, 
    Users,
    LayoutGrid,
    X,
    Loader2,
    Search,
    User,
    CheckSquare,
    Briefcase
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CollabTaskView } from '@/components/collab/collab-task-view';
import { CollabChatView } from '@/components/collab/collab-chat-view';
import { CollabAnnouncementsView } from '@/components/collab/collab-announcements-view';
import { CollabScheduleView } from '@/components/collab/collab-schedule-view';
import { CollabDocumentsView } from '@/components/collab/collab-documents-view';
import { CollabDailyTaskView } from '@/components/collab/collab-daily-task-view';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { usePageContext } from '@/contexts/page-context';
import { useIsMobile } from '@/hooks/use-mobile';

type FeatureType = 'chat' | 'daily-tasks' | 'project' | 'announcements' | 'schedule' | 'documents' | 'dashboard';

const colorThemes: Record<string, { 
    header: string, 
    badge: string, 
    iconBg: string, 
    iconText: string, 
    hoverBg: string,
    accentText: string,
    accentBorder: string
}> = {
    'blue-500': { 
        header: 'bg-blue-600', 
        badge: 'bg-blue-500/20 text-blue-100',
        iconBg: 'bg-blue-50 dark:bg-blue-900/20', 
        iconText: 'text-blue-600', 
        hoverBg: 'group-hover:bg-blue-600',
        accentText: 'text-blue-600',
        accentBorder: 'border-blue-200'
    },
    'emerald-500': { 
        header: 'bg-emerald-600', 
        badge: 'bg-emerald-500/20 text-emerald-100',
        iconBg: 'bg-emerald-50 dark:bg-emerald-900/20', 
        iconText: 'text-emerald-600', 
        hoverBg: 'group-hover:bg-emerald-600',
        accentText: 'text-emerald-600',
        accentBorder: 'border-emerald-200'
    },
    'rose-500': { 
        header: 'bg-rose-600', 
        badge: 'bg-rose-500/20 text-rose-100',
        iconBg: 'bg-rose-50 dark:bg-blue-900/20', 
        iconText: 'text-rose-600', 
        hoverBg: 'group-hover:bg-rose-600',
        accentText: 'text-rose-600',
        accentBorder: 'border-rose-200'
    },
    'amber-500': { 
        header: 'bg-amber-600', 
        badge: 'bg-amber-500/20 text-amber-100',
        iconBg: 'bg-emerald-50 dark:bg-amber-900/20', 
        iconText: 'text-amber-600', 
        hoverBg: 'group-hover:bg-amber-600',
        accentText: 'text-amber-600',
        accentBorder: 'border-amber-200'
    },
    'violet-500': { 
        header: 'bg-violet-600', 
        badge: 'bg-violet-500/20 text-violet-100',
        iconBg: 'bg-violet-50 dark:bg-violet-900/20', 
        iconText: 'text-violet-600', 
        hoverBg: 'group-hover:bg-violet-600',
        accentText: 'text-violet-600',
        accentBorder: 'border-violet-200'
    },
    'sky-500': { 
        header: 'bg-sky-600', 
        badge: 'bg-sky-500/20 text-sky-100',
        iconBg: 'bg-sky-50 dark:bg-sky-900/20', 
        iconText: 'text-sky-600', 
        hoverBg: 'group-hover:bg-sky-600',
        accentText: 'text-violet-600',
        accentBorder: 'border-sky-200'
    },
};

function FeatureIcon({ icon: Icon, label, onClick, theme, badgeCount }: { icon: any, label: string, onClick: () => void, theme: any, badgeCount?: number }) {
    return (
        <button 
            type="button"
            onClick={(e) => {
                e.preventDefault();
                onClick();
            }}
            className={cn(
                "flex flex-col items-center justify-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 group relative",
                "bg-background hover:bg-muted border-transparent hover:shadow-md active:scale-95"
            )}
        >
            {badgeCount && badgeCount > 0 ? (
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-red-500 text-white text-[9px] sm:text-[10px] font-black h-4 w-4 sm:h-5 sm:w-5 rounded-full flex items-center justify-center animate-bounce shadow-md ring-2 ring-background">
                    {badgeCount > 9 ? '9+' : badgeCount}
                </div>
            ) : null}
            <div className={cn(
                "p-3 sm:p-4 rounded-xl transition-all duration-300",
                theme.iconBg,
                theme.hoverBg,
                "group-hover:text-white group-hover:scale-110"
            )}>
                <Icon className={cn("size-6 sm:size-8", theme.iconText, "group-hover:text-white transition-colors")} />
            </div>
            <span className="font-bold text-[11px] sm:text-sm text-muted-foreground group-hover:text-foreground line-clamp-1">{label}</span>
        </button>
    );
}

export default function CollabSpaceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const isMobile = useIsMobile();
    const { currentUser } = useAuth();
    const { collabSpaces, collabTasks, collabMessages, employees } = useMasterData();
    const { setHideBottomNav } = usePageContext();
    const [activeFeature, setActiveFeature] = useState<FeatureType>('dashboard');
    const [lastSeen, setLastSeen] = useState<Record<string, number>>({});
    const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
    const [memberSearch, setMemberSearch] = useState("");

    const spaceId = params.spaceId as string;
    const space = useMemo(() => collabSpaces.find(s => s.id === spaceId), [collabSpaces, spaceId]);

    const spaceMembers = useMemo(() => {
        if (!space) return [];
        return employees
            .filter(e => space.memberIds.includes(e.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [space, employees]);

    const filteredMembers = useMemo(() => {
        if (!memberSearch) return spaceMembers;
        return spaceMembers.filter(m => 
            m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
            m.position.toLowerCase().includes(memberSearch.toLowerCase())
        );
    }, [spaceMembers, memberSearch]);

    // Handle bottom nav visibility on mobile chat and daily-tasks
    useEffect(() => {
        if (isMobile && (activeFeature === 'chat' || activeFeature === 'daily-tasks')) {
            setHideBottomNav(true);
        } else {
            setHideBottomNav(false);
        }
        return () => setHideBottomNav(false);
    }, [isMobile, activeFeature, setHideBottomNav]);

    // Track "Last Seen" for badges
    useEffect(() => {
        const key = `collab_last_seen_${spaceId}_${currentUser?.id}`;
        const stored = localStorage.getItem(key);
        if (stored) setLastSeen(JSON.parse(stored));
    }, [spaceId, currentUser?.id]);

    const updateLastSeen = (feature: FeatureType) => {
        const newSeen = { ...lastSeen, [feature]: Date.now() };
        setLastSeen(newSeen);
        const key = `collab_last_seen_${spaceId}_${currentUser?.id}`;
        localStorage.setItem(key, JSON.stringify(newSeen));
    };

    const handleFeatureClick = (feature: FeatureType) => {
        setActiveFeature(feature);
        updateLastSeen(feature);
    };

    const activeTheme = useMemo(() => {
        if (!space) return colorThemes['blue-500'];
        return colorThemes[space.color] || colorThemes['blue-500'];
    }, [space]);

    // Badge Counts Calculation
    const badges = useMemo(() => {
        if (!spaceId || !collabMessages || !collabTasks) return { chat: 0, daily: 0, project: 0, announcements: 0 };
        
        const spaceMsgs = collabMessages.filter(m => m.spaceId === spaceId);
        const spaceTasks = collabTasks.filter(t => t.spaceId === spaceId);

        const getUnread = (items: any[], type: FeatureType) => {
            const lastTime = lastSeen[type] || 0;
            return items.filter(i => {
                const updated = i.updatedAt?.toDate ? i.updatedAt.toDate().getTime() : (i.timestamp?.toDate ? i.timestamp.toDate().getTime() : (i.createdAt?.toDate ? i.createdAt.toDate().getTime() : 0));
                return updated > lastTime && i.senderId !== currentUser?.id && i.createdBy !== currentUser?.id;
            }).length;
        };

        return {
            chat: getUnread(spaceMsgs.filter(m => m.type === 'chat'), 'chat'),
            daily: getUnread(spaceTasks.filter(t => t.taskType === 'daily'), 'daily-tasks'),
            project: getUnread(spaceTasks.filter(t => t.taskType !== 'daily'), 'project'),
            announcements: getUnread(spaceMsgs.filter(m => m.type === 'announcement'), 'announcements'),
        };
    }, [spaceId, collabMessages, collabTasks, lastSeen, currentUser?.id]);

    const features = [
        { id: 'chat', label: 'Diskusi Chat', icon: MessageSquare, badge: badges.chat },
        { id: 'daily-tasks', label: 'Tugas Harian', icon: CheckSquare, badge: badges.daily },
        { id: 'project', label: 'Kolaborasi Proyek', icon: Briefcase, badge: badges.project },
        { id: 'announcements', label: 'Pengumuman', icon: BellRing, badge: badges.announcements },
        { id: 'schedule', label: 'Jadwal Proyek', icon: Calendar },
        { id: 'documents', label: 'File & Dokumen', icon: Files },
    ];

    const currentFeatureData = useMemo(() => features.find(f => f.id === activeFeature), [activeFeature]);
    const ActiveIcon = currentFeatureData?.icon;

    if (!space) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>Memuat data ruangan...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "flex flex-col h-full min-w-0 animate-fade-in",
            (activeFeature !== 'chat' && activeFeature !== 'daily-tasks') && "space-y-4 sm:space-y-6 pb-20 md:pb-6"
        )}>
            {/* Header Breadcrumb */}
            <div className={cn(
                "flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0",
                (activeFeature === 'chat') && "p-4 border-b bg-background"
            )}>
                <div className="flex items-center gap-2">
                    <button onClick={() => {
                        if (activeFeature === 'dashboard') router.push('/collab-space');
                        else setActiveFeature('dashboard');
                    }} className="-ml-2 h-8 px-2 text-muted-foreground text-xs flex items-center hover:bg-muted rounded-md transition-colors">
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        {activeFeature === 'dashboard' ? 'Ruangan' : 'Dash'}
                    </button>
                    <Separator orientation="vertical" className="h-4" />
                    <h1 className="font-bold text-sm text-foreground truncate max-w-[120px] sm:max-w-none">{space.name}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        type="button" 
                        onClick={() => setIsMembersDialogOpen(true)}
                        className="h-7 px-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
                    >
                        <Users className="size-3 text-primary" />
                        <span className="text-[10px] uppercase font-black text-foreground/70">
                            {space.memberIds.length} <span className="hidden sm:inline">Anggota</span>
                        </span>
                    </button>
                </div>
            </div>

            {/* Dashboard Header Card */}
            {activeFeature === 'dashboard' && (
                <Card className={cn("text-primary-foreground shadow-lg border-none overflow-hidden relative flex-shrink-0", activeTheme.header)}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <LayoutGrid size={120} />
                    </div>
                    <CardHeader className="relative z-10 p-5 sm:p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1 min-w-0 pr-4">
                                <CardTitle className="text-lg sm:text-2xl font-headline leading-tight truncate">{space.name}</CardTitle>
                                <CardDescription className="text-primary-foreground/80 line-clamp-2 text-xs sm:text-sm">
                                    {space.description}
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" className={cn("border-none backdrop-blur-md shrink-0 text-[10px]", activeTheme.badge)}>
                                {space.status === 'active' ? 'Aktif' : 'Arsip'}
                            </Badge>
                        </div>
                    </CardHeader>
                </Card>
            )}

            {/* Content Area */}
            {activeFeature === 'dashboard' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 animate-fade-in">
                    {features.map(f => (
                        <FeatureIcon 
                            key={f.id}
                            icon={f.icon}
                            label={f.label}
                            theme={activeTheme}
                            badgeCount={f.badge}
                            onClick={() => handleFeatureClick(f.id as FeatureType)}
                        />
                    ))}
                </div>
            ) : (
                <div className={cn(
                    "flex flex-col min-h-0",
                    (activeFeature === 'chat' || activeFeature === 'daily-tasks') ? "h-[calc(100dvh-130px)] md:h-[calc(100vh-160px)]" : "flex-1"
                )}>
                    {(activeFeature !== 'chat' && activeFeature !== 'daily-tasks') && (
                        <div className={cn(
                            "flex items-center justify-between p-2 px-4 rounded-xl border flex-shrink-0 mb-4",
                            "bg-muted/50 shadow-sm",
                            activeTheme.accentBorder
                        )}>
                            <div className="flex items-center gap-2">
                                <div className={cn("p-1.5 rounded-lg", activeTheme.iconBg)}>
                                    {ActiveIcon && <ActiveIcon className={cn("size-3.5", activeTheme.iconText)} />}
                                </div>
                                <span className={cn("text-[9px] sm:text-[10px] font-black uppercase tracking-widest", activeTheme.accentText)}>
                                    {activeFeature.replace('-', ' ')}
                                </span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleFeatureClick('dashboard')} className="hover:bg-background h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs">
                                <X className="size-3 sm:size-3.5 mr-1.5" /> Tutup
                            </Button>
                        </div>
                    )}
                    
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        {activeFeature === 'project' && (
                            <CollabTaskView space={space} />
                        )}
                        {activeFeature === 'daily-tasks' && (
                            <CollabDailyTaskView space={space} onBackToDashboard={() => handleFeatureClick('dashboard')} />
                        )}
                        {activeFeature === 'chat' && (
                            <CollabChatView space={space} />
                        )}
                        {activeFeature === 'announcements' && (
                            <CollabAnnouncementsView space={space} />
                        )}
                        {activeFeature === 'schedule' && (
                            <CollabScheduleView space={space} />
                        )}
                        {activeFeature === 'documents' && (
                            <CollabDocumentsView space={space} />
                        )}
                    </div>
                </div>
            )}

            {/* Members Dialog */}
            <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
                <DialogContent className="sm:max-w-md h-[550px] max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none gap-0">
                    <div className="p-6 pb-4 border-b shrink-0 bg-background">
                        <DialogHeader className="p-0">
                            <DialogTitle className="flex items-center gap-2 text-xl font-headline font-bold">
                                <Users size={24} className="text-primary" />
                                Anggota Ruangan
                            </DialogTitle>
                            <DialogDescription className="text-sm">
                                Daftar personil di ruangan <strong>{space.name}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    
                    <div className="p-4 border-b bg-muted/20 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input 
                                placeholder="Cari nama atau jabatan..." 
                                className="pl-10 h-11 bg-background border-border/60 focus-visible:ring-primary/20 shadow-sm rounded-xl"
                                value={memberSearch}
                                onChange={(e) => setMemberSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-background p-2">
                        <div className="space-y-1">
                            {filteredMembers.map(member => {
                                const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                const isCreator = member.id === space.creatorId;

                                return (
                                    <div key={member.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted/50 transition-all group">
                                        <Avatar className="size-11 border-2 border-background shadow-md group-hover:scale-105 transition-transform">
                                            <AvatarFallback className="text-xs font-black bg-primary/10 text-primary">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">{member.name}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mt-0.5">{member.position}</p>
                                        </div>
                                        {isCreator && (
                                            <Badge variant="secondary" className="text-[8px] font-black uppercase h-5 px-2 bg-amber-100 text-amber-700 border-none rounded-full shadow-sm shrink-0">
                                                Kreator
                                            </Badge>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="p-4 border-t bg-muted/10 shrink-0">
                        <Button 
                            variant="outline" 
                            className="w-full font-black text-xs uppercase tracking-widest h-11 rounded-xl shadow-sm border-border/60 hover:bg-background" 
                            onClick={() => setIsMembersDialogOpen(false)}
                        >
                            Tutup
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

