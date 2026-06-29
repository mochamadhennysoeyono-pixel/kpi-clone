
// src/components/collab/collab-chat-view.tsx
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '@/lib/firebase/client';
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    addDoc, 
    updateDoc,
    doc,
    serverTimestamp,
    limit,
    arrayUnion
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, MessageSquare, Check, CheckCheck, AtSign } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CollabMessage, CollabSpace, Employee } from '@/types';

interface CollabChatViewProps {
    space: CollabSpace;
}

function ChatText({ text, members }: { text: string, members: Employee[] }) {
    const parts = text.split(/(@\w+(?:\s\w+)*)/g);
    
    return (
        <div className="whitespace-pre-wrap leading-relaxed">
            {parts.map((part, i) => {
                if (part.startsWith('@')) {
                    const name = part.substring(1);
                    const isMember = members.some(m => m.name.toLowerCase().includes(name.toLowerCase()));
                    if (isMember) {
                        return <span key={i} className="font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1 rounded">{part}</span>;
                    }
                }
                return <span key={i}>{part}</span>;
            })}
        </div>
    );
}

export function CollabChatView({ space }: CollabChatViewProps) {
    const { currentUser } = useAuth();
    const { employees } = useMasterData();
    const [messages, setMessages] = useState<CollabMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    
    const [mentionSearch, setMentionSearch] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const spaceMembers = useMemo(() => employees.filter(e => space.memberIds.includes(e.id)), [employees, space.memberIds]);

    const filteredMentionMembers = useMemo(() => {
        if (mentionSearch === null) return [];
        return spaceMembers
            .filter(m => m.name.toLowerCase().includes(mentionSearch.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [spaceMembers, mentionSearch]);

    useEffect(() => {
        if (!space.id) return;

        const q = query(
            collection(db, "collabMessages"),
            where("spaceId", "==", space.id),
            where("type", "==", "chat"),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as CollabMessage));
            
            const sortedMsgs = msgs.sort((a, b) => {
                const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
                const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
                return timeA - timeB;
            });

            setMessages(sortedMsgs);
            setIsInitialLoading(false);
            
            if (currentUser) {
                sortedMsgs.forEach(msg => {
                    if (msg.senderId !== currentUser.id && (!msg.readBy || !msg.readBy.includes(currentUser.id))) {
                        updateDoc(doc(db, "collabMessages", msg.id), {
                            readBy: arrayUnion(currentUser.id)
                        });
                    }
                });
            }

            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTo({
                        top: scrollRef.current.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }, (error) => {
            console.error("Chat error:", error);
            setIsInitialLoading(false);
        });

        return () => unsubscribe();
    }, [space.id, currentUser]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        if (!inputRef.current) return;
        const cursorPos = inputRef.current.selectionStart || 0;
        const textBeforeCursor = inputText.slice(0, cursorPos);
        const textAfterCursor = inputText.slice(cursorPos);
        
        const newTextBefore = textBeforeCursor.replace(/@(\w*)$/, `@${member.name} `);
        setInputText(newTextBefore + textAfterCursor);
        setMentionSearch(null);
        
        setTimeout(() => {
            inputRef.current?.focus();
            const newPos = newTextBefore.length;
            inputRef.current?.setSelectionRange(newPos, newPos);
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

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim() || !currentUser || isLoading) return;

        setIsLoading(true);
        const textToSend = inputText.trim();
        setInputText("");

        const mentions = spaceMembers
            .filter(m => textToSend.toLowerCase().includes(`@${m.name.toLowerCase()}`))
            .map(m => m.id);

        try {
            await addDoc(collection(db, "collabMessages"), {
                spaceId: space.id,
                senderId: currentUser.id,
                senderName: currentUser.name,
                text: textToSend,
                type: 'chat',
                timestamp: serverTimestamp(),
                readBy: [currentUser.id],
                mentions
            });

            if (mentions.length > 0) {
                for (const mentionId of mentions) {
                    if (mentionId !== currentUser.id) {
                        await addDoc(collection(db, "notifications"), {
                            recipientId: mentionId,
                            senderName: currentUser.name,
                            message: `${currentUser.name} menyebut Anda dalam diskusi di ${space.name}.`,
                            link: `/collab-space/${space.id}`,
                            isRead: false,
                            timestamp: serverTimestamp()
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            setInputText(textToSend);
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
        <div className="flex flex-col h-full bg-background overflow-hidden relative border rounded-xl shadow-sm">
            <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
                <div className="space-y-6 pb-4">
                    {messages.length > 0 ? (
                        messages.map((msg, index) => {
                            const isMe = msg.senderId === currentUser?.id;
                            const prevMsg = messages[index - 1];
                            const isSameSender = prevMsg?.senderId === msg.senderId;
                            
                            const timeStr = msg.timestamp?.toDate 
                                ? format(msg.timestamp.toDate(), "HH:mm") 
                                : format(new Date(), "HH:mm");

                            const readCount = (msg.readBy || []).filter(uid => uid !== msg.senderId).length;

                            return (
                                <div 
                                    key={msg.id} 
                                    className={cn(
                                        "flex items-start gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300",
                                        isMe ? "flex-row-reverse" : "flex-row"
                                    )}
                                >
                                    {!isSameSender ? (
                                        <Avatar className="size-8 mt-1 shrink-0 border-2 border-background shadow-sm">
                                            <AvatarFallback className={cn(
                                                "text-[10px] font-black",
                                                isMe ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                            )}>
                                                {msg.senderName.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <div className="w-8 shrink-0" />
                                    )}

                                    <div className={cn(
                                        "flex flex-col gap-1 max-w-[75%]",
                                        isMe ? "items-end" : "items-start"
                                    )}>
                                        {!isSameSender && (
                                            <span className="text-[10px] font-bold text-muted-foreground px-1 uppercase tracking-tight">
                                                {isMe ? "Anda" : msg.senderName}
                                            </span>
                                        )}
                                        <div className={cn(
                                            "p-3 rounded-2xl text-sm shadow-sm border",
                                            isMe 
                                                ? "bg-primary text-primary-foreground border-primary rounded-tr-none" 
                                                : "bg-muted/50 text-foreground border-border/50 rounded-tl-none"
                                        )}>
                                            <ChatText text={msg.text} members={spaceMembers} />
                                        </div>
                                        <div className="flex items-center gap-2 px-1">
                                            <span className="text-[9px] text-muted-foreground opacity-60">
                                                {timeStr}
                                            </span>
                                            {isMe && (
                                                <div className="flex items-center">
                                                    {readCount > 0 ? (
                                                        <span className="text-[8px] font-bold text-blue-500 uppercase flex items-center gap-1">
                                                            <CheckCheck size={10} /> Dilihat {readCount} orang
                                                        </span>
                                                    ) : (
                                                        <Check size={10} className="text-muted-foreground" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-20 text-center space-y-3">
                            <div className="size-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
                                <MessageSquare className="size-8 text-muted-foreground/20" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-foreground/70">Belum ada obrolan</p>
                                <p className="text-xs text-muted-foreground">Mulai diskusi dengan tim Anda di sini.</p>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {mentionSearch !== null && filteredMentionMembers.length > 0 && (
                <div className="absolute bottom-20 left-4 right-4 z-50 bg-background border rounded-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
                    <div className="p-2 bg-muted/30 border-b flex items-center gap-2">
                        <AtSign size={12} className="text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Sebut Anggota Tim</span>
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
                                <Avatar className="size-6">
                                    <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
                                        {member.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold truncate">{member.name}</p>
                                    <p className="text-[9px] text-muted-foreground truncate">{member.position}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="p-4 bg-background border-t shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-5xl mx-auto">
                    <div className="relative flex-1">
                        <Input 
                            ref={inputRef}
                            placeholder="Ketik pesan... (Gunakan @ untuk mention)" 
                            className="bg-muted/20 h-11 pr-12 rounded-xl border-border/60 focus-visible:ring-primary/20 shadow-sm"
                            value={inputText}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                        />
                    </div>
                    <Button 
                        type="submit" 
                        size="icon" 
                        className="h-11 w-11 rounded-xl shadow-md transition-transform active:scale-95"
                        disabled={isLoading || !inputText.trim()}
                    >
                        {isLoading ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                    </Button>
                </form>
            </div>
        </div>
    );
}
