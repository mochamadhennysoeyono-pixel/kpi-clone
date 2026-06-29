// src/components/collab/collab-announcements-view.tsx
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase/client';
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    addDoc, 
    serverTimestamp,
    limit
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Megaphone, Send, Loader2, Calendar, BellRing, AtSign } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CollabMessage, CollabSpace, Employee } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface CollabAnnouncementsViewProps {
    space: CollabSpace;
}

function HighlightText({ text, members }: { text: string, members: Employee[] }) {
    const parts = text.split(/(@\w+(?:\s\w+)*)/g);
    return (
        <div className="whitespace-pre-wrap">
            {parts.map((part, i) => {
                if (part.startsWith('@')) {
                    const name = part.substring(1);
                    const isMember = members.some(m => m.name.toLowerCase().includes(name.toLowerCase()));
                    if (isMember) {
                        return <span key={i} className="font-bold text-primary bg-primary/10 px-1 rounded">{part}</span>;
                    }
                }
                return <span key={i}>{part}</span>;
            })}
        </div>
    );
}

export function CollabAnnouncementsView({ space }: CollabAnnouncementsViewProps) {
    const { currentUser, userRole } = useAuth();
    const { employees } = useMasterData();
    const { toast } = useToast();
    const [announcements, setAnnouncements] = useState<CollabMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const [mentionSearch, setMentionSearch] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const spaceMembers = useMemo(() => employees.filter(e => space.memberIds.includes(e.id)), [employees, space.memberIds]);

    const filteredMentionMembers = useMemo(() => {
        if (mentionSearch === null) return [];
        return spaceMembers
            .filter(m => m.name.toLowerCase().includes(mentionSearch.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [spaceMembers, mentionSearch]);

    const canPost = useMemo(() => {
        if (!currentUser) return false;
        return (
            userRole === 'superadmin' || 
            userRole === 'manajemen' || 
            currentUser.id === space.creatorId
        );
    }, [currentUser, userRole, space.creatorId]);

    useEffect(() => {
        if (!space.id) return;

        const q = query(
            collection(db, "collabMessages"),
            where("spaceId", "==", space.id),
            where("type", "==", "announcement"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as CollabMessage));
            
            const sortedMsgs = msgs.sort((a, b) => {
                const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
                const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
                return timeB - timeA;
            });

            setAnnouncements(sortedMsgs);
            setIsInitialLoading(false);
        }, (error) => {
            console.error("Announcements error:", error);
            setIsInitialLoading(false);
        });

        return () => unsubscribe();
    }, [space.id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart || 0;
        setInputText(value);

        const textBeforeCursor = value.slice(0, cursorPos);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

        if (mentionMatch) {
            setMentionSearch(mentionMatch[1]);
            setMentionIndex(0);
        } else {
            setMentionSearch(null);
        }
    };

    const insertMention = (member: Employee) => {
        if (!textareaRef.current) return;
        const cursorPos = textareaRef.current.selectionStart || 0;
        const textBeforeCursor = inputText.slice(0, cursorPos);
        const textAfterCursor = inputText.slice(cursorPos);
        
        const newTextBefore = textBeforeCursor.replace(/@(\w*)$/, `@${member.name} `);
        setInputText(newTextBefore + textAfterCursor);
        setMentionSearch(null);
        
        setTimeout(() => {
            textareaRef.current?.focus();
            const newPos = newTextBefore.length;
            textareaRef.current?.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (mentionSearch !== null && filteredMentionMembers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex(prev => (prev + 1) % filteredMentionMembers.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex(prev => (prev - 1 + filteredMentionMembers.length) % filteredMentionMembers.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(filteredMentionMembers[mentionIndex]);
            } else if (e.key === 'Escape') {
                setMentionSearch(null);
            }
        }
    };

    const handlePostAnnouncement = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim() || !currentUser || isLoading) return;

        setIsLoading(true);
        const textToPost = inputText.trim();
        setInputText("");

        const mentions = spaceMembers
            .filter(m => textToPost.toLowerCase().includes(`@${m.name.toLowerCase()}`))
            .map(m => m.id);

        try {
            await addDoc(collection(db, "collabMessages"), {
                spaceId: space.id,
                senderId: currentUser.id,
                senderName: currentUser.name,
                text: textToPost,
                type: 'announcement',
                timestamp: serverTimestamp(),
                mentions
            });

            for (const memberId of space.memberIds) {
                if (memberId !== currentUser.id) {
                    await addDoc(collection(db, "notifications"), {
                        recipientId: memberId,
                        senderName: currentUser.name,
                        category: 'CollabSpace',
                        message: `Pengumuman baru di ruangan ${space.name}: "${textToPost.substring(0, 50)}..."`,
                        link: `/collab-space/${space.id}`,
                        isRead: false,
                        timestamp: serverTimestamp()
                    });
                }
            }

            toast({ title: "Pengumuman Diterbitkan" });
        } catch (error: any) {
            setInputText(textToPost);
            toast({ variant: 'destructive', title: "Gagal Menerbitkan", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    if (isInitialLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-6 animate-fade-in">
            {canPost && (
                <Card className="border-primary/20 shadow-sm shrink-0 relative">
                    <CardHeader className="py-3 px-4 bg-primary/5">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-primary">
                            <Megaphone className="size-3.5" />
                            Buat Pengumuman Baru
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <Textarea 
                            ref={textareaRef}
                            placeholder="Ketik informasi penting... (Gunakan @ untuk mention)"
                            className="min-h-[100px] text-sm resize-none bg-muted/20 border-none focus-visible:ring-1"
                            value={inputText}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                        />
                        
                        {mentionSearch !== null && filteredMentionMembers.length > 0 && (
                            <div className="absolute bottom-full left-4 right-4 z-50 bg-background border rounded-lg shadow-2xl overflow-hidden mb-2 animate-in slide-in-from-bottom-2">
                                <div className="p-2 bg-muted/30 border-b flex items-center gap-2">
                                    <AtSign size={12} className="text-primary" />
                                    <span className="text-[10px] font-black uppercase text-muted-foreground">Sebut Anggota</span>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {filteredMentionMembers.map((member, idx) => (
                                        <button
                                            key={member.id}
                                            className={cn(
                                                "flex items-center gap-3 w-full p-2 text-left hover:bg-muted transition-colors",
                                                idx === mentionIndex && "bg-primary/5 border-l-2 border-primary"
                                            )}
                                            onClick={() => insertMention(member)}
                                        >
                                            <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                {member.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="text-xs font-bold">{member.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="p-4 pt-0 justify-end">
                        <Button onClick={handlePostAnnouncement} disabled={isLoading || !inputText.trim()} size="sm" className="font-bold gap-2">
                            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                            Siarkan Sekarang
                        </Button>
                    </CardFooter>
                </Card>
            )}

            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-4 pb-10">
                        {announcements.length > 0 ? (
                            announcements.map((ann) => (
                                <Card key={ann.id} className="border-border/60 hover:shadow-md transition-all group overflow-hidden">
                                    <CardHeader className="py-3 px-4 flex flex-row items-center gap-3 bg-muted/30">
                                        <Avatar className="size-8 border-2 border-background">
                                            <AvatarFallback className="bg-primary text-white text-[10px] font-black">
                                                {ann.senderName.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate">{ann.senderName}</p>
                                            <div className="flex items-center gap-3 text-[9px] text-muted-foreground font-medium uppercase mt-0.5">
                                                <span className="flex items-center gap-1"><Calendar className="size-2.5" /> {ann.timestamp?.toDate ? format(ann.timestamp.toDate(), "d MMM yyyy, HH:mm", { locale: localeId }) : "Baru saja"}</span>
                                                <span className="flex items-center gap-1 text-primary"><BellRing className="size-2.5" /> Pemberitahuan</span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-5 text-sm leading-relaxed text-foreground/90">
                                        <HighlightText text={ann.text} members={spaceMembers} />
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="py-20 text-center space-y-4">
                                <div className="size-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
                                    <Megaphone className="size-10 text-muted-foreground/20" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-base text-foreground/70">Papan Pengumuman Kosong</p>
                                    <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">Informasi penting akan muncul di sini.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
