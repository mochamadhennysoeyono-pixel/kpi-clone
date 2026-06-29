// src/components/collab/collab-qa-view.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { HelpCircle, MessageSquare, Send, Loader2, Calendar, User, Search, Reply, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CollabMessage, CollabSpace } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface CollabQAViewProps {
    space: CollabSpace;
}

export function CollabQAView({ space }: CollabQAViewProps) {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [messages, setMessages] = useState<CollabMessage[]>([]);
    const [questionText, setQuestionText] = useState("");
    const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // 1. Real-time Q&A Listener
    useEffect(() => {
        if (!space.id) return;

        const q = query(
            collection(db, "collabMessages"),
            where("spaceId", "==", space.id),
            limit(200)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as CollabMessage));
            
            setMessages(msgs);
            setIsInitialLoading(false);
        }, (error) => {
            console.error("Q&A error:", error);
            setIsInitialLoading(false);
        });

        return () => unsubscribe();
    }, [space.id]);

    // 2. Data Processing: Root Questions and their Answers
    const questions = useMemo(() => {
        const rootQuestions = messages
            .filter(m => m.type === 'question')
            .sort((a, b) => {
                const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
                const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
                return timeB - timeA; // Newest questions first
            });

        return rootQuestions.map(q => {
            const answers = messages
                .filter(m => m.type === 'answer' && m.parentId === q.id)
                .sort((a, b) => {
                    const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
                    const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
                    return timeA - timeB; // Oldest answers first (chronological)
                });
            return { ...q, answers };
        });
    }, [messages]);

    const filteredQuestions = useMemo(() => {
        if (!searchTerm) return questions;
        const lower = searchTerm.toLowerCase();
        return questions.filter(q => 
            q.text.toLowerCase().includes(lower) || 
            q.senderName.toLowerCase().includes(lower)
        );
    }, [questions, searchTerm]);

    // 3. Handlers
    const handlePostQuestion = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!questionText.trim() || !currentUser || isLoading) return;

        setIsLoading(true);
        try {
            await addDoc(collection(db, "collabMessages"), {
                spaceId: space.id,
                senderId: currentUser.id,
                senderName: currentUser.name,
                text: questionText.trim(),
                type: 'question',
                timestamp: serverTimestamp(),
            });
            setQuestionText("");
            toast({ title: "Pertanyaan Terkirim", description: "Tim akan membantu menjawab pertanyaanmu." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Gagal Mengirim", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePostAnswer = async (questionId: string) => {
        const text = answerTexts[questionId]?.trim();
        if (!text || !currentUser || isLoading) return;

        setIsLoading(true);
        try {
            await addDoc(collection(db, "collabMessages"), {
                spaceId: space.id,
                senderId: currentUser.id,
                senderName: currentUser.name,
                text: text,
                type: 'answer',
                parentId: questionId,
                timestamp: serverTimestamp(),
            });
            setAnswerTexts(prev => ({ ...prev, [questionId]: "" }));
            toast({ title: "Jawaban Terkirim" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Gagal Menjawab", description: error.message });
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
        <div className="flex flex-col h-full gap-6 animate-fade-in pb-10">
            {/* Header Tools */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 shrink-0">
                <div className="md:col-span-8">
                    <Card className="border-primary/20 shadow-sm overflow-hidden">
                        <CardHeader className="py-2 px-4 bg-primary/5">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                                <HelpCircle size={14} /> Ajukan Pertanyaan Ke Tim
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="flex items-end gap-2 p-3">
                                <Textarea 
                                    placeholder="Apa yang ingin kamu ketahui atau diskusikan?"
                                    className="min-h-[60px] text-sm resize-none bg-muted/20 border-none focus-visible:ring-1"
                                    value={questionText}
                                    onChange={(e) => setQuestionText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.ctrlKey) handlePostQuestion();
                                    }}
                                />
                                <Button 
                                    size="icon" 
                                    className="size-10 shrink-0 shadow-md" 
                                    onClick={handlePostQuestion}
                                    disabled={!questionText.trim() || isLoading}
                                >
                                    <Send size={18} />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-4 relative flex items-center">
                    <Search className="absolute left-4 size-4 text-muted-foreground" />
                    <Input 
                        placeholder="Cari pertanyaan..." 
                        className="pl-11 h-full bg-background border-border/40 shadow-sm rounded-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Questions Feed */}
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-6">
                        {filteredQuestions.length > 0 ? (
                            filteredQuestions.map((q) => {
                                const dateStr = q.timestamp?.toDate 
                                    ? format(q.timestamp.toDate(), "d MMM, HH:mm", { locale: localeId }) 
                                    : "Baru saja";

                                return (
                                    <div key={q.id} className="space-y-3">
                                        {/* Question Card */}
                                        <Card className="border-border/60 shadow-sm overflow-hidden bg-background">
                                            <CardHeader className="py-3 px-4 flex flex-row items-center gap-3 bg-muted/10 border-b border-border/40">
                                                <Avatar className="size-8 border-2 border-background">
                                                    <AvatarFallback className="bg-primary text-white text-[10px] font-black">
                                                        {q.senderName.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold truncate">{q.senderName}</p>
                                                    <p className="text-[9px] text-muted-foreground font-medium uppercase mt-0.5 flex items-center gap-1">
                                                        <Clock size={10} /> {dateStr}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className="text-[9px] font-black uppercase h-5 bg-background shadow-sm border-primary/20 text-primary">
                                                    Pertanyaan
                                                </Badge>
                                            </CardHeader>
                                            <CardContent className="p-5 text-sm font-semibold leading-relaxed text-foreground/90">
                                                {q.text}
                                            </CardContent>
                                            
                                            {/* Answer Section Internal */}
                                            {q.answers.length > 0 && (
                                                <div className="bg-muted/5 border-t border-border/40 px-5 py-4 space-y-4">
                                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                                        <MessageSquare size={12} /> {q.answers.length} Jawaban Diterima
                                                    </p>
                                                    <div className="space-y-4">
                                                        {q.answers.map((ans) => {
                                                            const ansDate = ans.timestamp?.toDate ? format(ans.timestamp.toDate(), "HH:mm", { locale: localeId }) : "Baru saja";
                                                            return (
                                                                <div key={ans.id} className="flex items-start gap-3 animate-in slide-in-from-left-2 duration-300">
                                                                    <Avatar className="size-6 shrink-0 ring-1 ring-border">
                                                                        <AvatarFallback className="bg-muted text-[8px] font-bold text-muted-foreground">
                                                                            {ans.senderName.substring(0, 2).toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex-1 min-w-0 bg-background p-3 rounded-xl border border-border/40 shadow-sm relative">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className="text-[10px] font-bold text-foreground/70 uppercase">{ans.senderName}</span>
                                                                            <span className="text-[8px] text-muted-foreground">{ansDate}</span>
                                                                        </div>
                                                                        <p className="text-xs text-foreground/80 leading-relaxed">{ans.text}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Quick Reply Input */}
                                            <CardFooter className="p-3 border-t border-border/40 bg-muted/10">
                                                <div className="flex items-center gap-2 w-full">
                                                    <Input 
                                                        placeholder="Ketik jawaban Anda..." 
                                                        className="h-9 text-xs bg-background border-border/60 focus-visible:ring-primary/20"
                                                        value={answerTexts[q.id] || ""}
                                                        onChange={(e) => setAnswerTexts(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handlePostAnswer(q.id);
                                                        }}
                                                    />
                                                    <Button 
                                                        size="sm" 
                                                        className="h-9 px-3 gap-2 font-bold text-[10px] uppercase tracking-wider"
                                                        onClick={() => handlePostAnswer(q.id)}
                                                        disabled={!answerTexts[q.id]?.trim() || isLoading}
                                                    >
                                                        {isLoading ? <Loader2 className="size-3 animate-spin" /> : <Reply size={14} />}
                                                        Jawab
                                                    </Button>
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-24 text-center space-y-4">
                                <div className="size-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
                                    <HelpCircle className="size-10 text-muted-foreground/20" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-base text-foreground/70">Belum Ada Diskusi</p>
                                    <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                                        Ada keraguan atau butuh bantuan teknis? Ajukan pertanyaan pertama Anda kepada tim di ruangan ini.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
