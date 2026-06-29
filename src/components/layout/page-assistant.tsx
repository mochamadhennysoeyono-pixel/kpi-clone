// src/components/layout/page-assistant.tsx
"use client";

import { useState, useMemo, useRef, useEffect, FormEvent, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "../ui/button";
import { Bot, Loader2, Send, X } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useMasterData } from '@/contexts/master-data-context';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { usePageContext } from '@/contexts/page-context';
import { runGetPageExplanation } from '@/actions/pageAssistant.action';
import { runAskAssistant } from '@/actions/conversationalAssistant.action';
import type { ChatMessage } from '@/types';


// A simple markdown-to-HTML converter with emoji support
function SimpleMarkdown({ text }: { text: string }) {
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>')     // Italic
    .replace(/\n/g, '<br />')
    .replace(/<br \/>(\s*<br \/>)+/g, '<br />'); // Newlines
  return <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function PageAssistant() {
    const pathname = usePathname();
    const { userRole, currentUser } = useAuth();
    const { employees, companies } = useMasterData();
    const { pageTitle } = usePageContext();

    const { toast } = useToast();
    
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [welcomeBubble, setWelcomeBubble] = useState<{show: boolean, text: string}>({show: false, text: ''});
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const lastPathname = useRef<string>(pathname);

    const isManager = useMemo(() => {
        if (!currentUser || (userRole !== 'user' && userRole !== 'manajemen')) return false;
        return employees.some(e => e.reportsTo === currentUser.id);
    }, [currentUser, userRole, employees]);

    const displayRole = useMemo(() => {
        if (userRole === 'superadmin') return 'Super Admin';
        if (userRole === 'manajemen') return 'Admin Perusahaan';
        if (isManager) return 'Atasan/Manajer Tim';
        return 'Karyawan';
    }, [userRole, isManager]);

    const userCompany = useMemo(() => {
        if (!currentUser) return null;
        return companies.find(c => c.name === currentUser.company);
    }, [currentUser, companies]);

    const showAssistant = useMemo(() => {
        if (userRole === 'superadmin') return true;
        return !!userCompany?.features?.hasPageAssistant;
    }, [userRole, userCompany]);
    
    const pageContextMemo = useMemo(() => {
        return { 
            pagePath: pathname, 
            pageTitle: pageTitle || 'Halaman Tanpa Judul', 
            userRole: displayRole, 
            userName: currentUser?.name || 'Pengguna',
        };
    }, [pathname, pageTitle, displayRole, currentUser]);
    
    useEffect(() => {
        const getGreeting = async () => {
            if (!pageTitle || !showAssistant) return;
            
            lastPathname.current = pathname;
            const bubbleDismissedThisPage = sessionStorage.getItem(`kipiBubbleDismissed_${pathname}`);
            if (bubbleDismissedThisPage) {
                setWelcomeBubble({show: false, text: ''});
                return;
            }

            try {
                const result = await runGetPageExplanation(pageContextMemo);
                if (result.success && result.data?.explanation) {
                    setWelcomeBubble({ show: true, text: result.data.explanation });
                }
            } catch (error) {
                console.error("Error getting page greeting:", error);
                setWelcomeBubble({ show: false, text: '' });
            }
        };

        const timer = setTimeout(getGreeting, 1500);
        return () => clearTimeout(timer);

    }, [pageTitle, pathname, pageContextMemo, showAssistant]);


    const handleDismissWelcomeBubble = () => {
        setWelcomeBubble({show: false, text: ''});
        sessionStorage.setItem(`kipiBubbleDismissed_${pathname}`, 'true');
    };
    
    const getInitialGreeting = useCallback(async () => {
        setLoading(true);
        try {
            const result = await runAskAssistant({
                pagePath: pageContextMemo.pagePath,
                pageTitle: pageContextMemo.pageTitle,
                userRole: pageContextMemo.userRole,
                userName: pageContextMemo.userName,
                question: 'Perkenalkan dirimu dan apa yang harus aku lakukan di halaman ini.',
                history: [],
            });
            if(result.success && result.data?.answer) {
              setHistory(prev => [...prev, { role: 'model', content: result.data.answer }]);
            } else {
              throw new Error(result.error);
            }
        } catch (error) {
            console.error("Error getting initial greeting:", error);
            setHistory(prev => [...prev, { role: 'model', content: `Maaf ${pageContextMemo.userName}, KIPI sedang mengalami sedikit gangguan. Ada yang bisa KIPI bantu? 🤔` }]);
        } finally {
            setLoading(false);
        }
    }, [pageContextMemo]);
    
    const handleFirstTimeIntroduction = useCallback(() => {
        const introMessage = `Halo Bro ${pageContextMemo.userName}! 👋\n\nKenalin, aku KIPI 🤖, asisten AI pribadimu di aplikasi ini.\n\nTugasku bantuin kamu biar makin jago pakai aplikasi ini, jawab pertanyaanmu, dan kasih panduan.\n\nYuk, kita mulai!`;
        setHistory([{ role: 'model', content: introMessage }]);
        sessionStorage.setItem('kipiIntroduced', 'true');
        setTimeout(getInitialGreeting, 1000);
    }, [pageContextMemo.userName, getInitialGreeting]);


    const handleOpen = useCallback((open: boolean) => {
        setIsOpen(open);
        if (open && welcomeBubble.show) {
            handleDismissWelcomeBubble();
        }
        if (open && history.length === 0) {
            const hasBeenIntroduced = sessionStorage.getItem('kipiIntroduced') === 'true';
            if (!hasBeenIntroduced) {
                 handleFirstTimeIntroduction();
            } else {
                getInitialGreeting();
            }
        }
    }, [welcomeBubble.show, history.length, getInitialGreeting, handleFirstTimeIntroduction]);

    useEffect(() => {
        if (isOpen && pageTitle && pageTitle !== 'Halaman Tanpa Judul' && pathname !== lastPathname.current) {
            lastPathname.current = pathname;
            setHistory([]);
            getInitialGreeting();
        }
    }, [pageTitle, pathname, isOpen, getInitialGreeting]);
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!userInput.trim()) return;

        const newUserMessage: ChatMessage = { role: 'user', content: userInput };
        const currentHistory = [...history, newUserMessage];
        setHistory(currentHistory);
        setUserInput('');
        setLoading(true);

        try {
            const result = await runAskAssistant({
                pagePath: pageContextMemo.pagePath,
                pageTitle: pageContextMemo.pageTitle,
                userRole: pageContextMemo.userRole,
                userName: pageContextMemo.userName,
                question: userInput,
                history: currentHistory,
            });
            if(result.success && result.data?.answer) {
              setHistory([...currentHistory, { role: 'model', content: result.data.answer }]);
            } else {
              throw new Error(result.error || 'Gagal merespon.');
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Asisten AI Gagal Merespon",
                description: error.message
            });
            setHistory(history);
        } finally {
            setLoading(false);
        }
    }
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [history, loading]);
    
    if (['/login', '/register', '/activate', '/'].includes(pathname) || !showAssistant) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-40 hidden md:flex">
            {welcomeBubble.show && !isOpen && (
                <div className="absolute bottom-full right-0 mb-3 w-72 animate-fade-in">
                     <div className="bg-background border rounded-lg p-3 shadow-lg relative">
                         <button onClick={handleDismissWelcomeBubble} className="absolute top-1 right-1 p-1 text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />
                         </button>
                        <SimpleMarkdown text={welcomeBubble.text} />
                        <div className="absolute bottom-[-10px] right-5 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-border"></div>
                        <div className="absolute bottom-[-9px] right-5 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-background"></div>
                    </div>
                </div>
            )}
             <Popover open={isOpen} onOpenChange={handleOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="default"
                        size="icon"
                        className="h-14 w-14 rounded-full shadow-2xl"
                    >
                        <Bot className="h-7 w-7" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="w-96 flex flex-col h-[70vh] max-h-[600px] p-0 mb-2">
                    <div className="font-semibold text-sm flex items-center gap-2 p-4 border-b">
                        <Bot className="h-5 w-5 text-primary" />
                        Asisten AI "KIPI" 🤖
                    </div>
                    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                        <div className="space-y-4">
                            {history.map((msg, index) => (
                                <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : '')}>
                                    {msg.role === 'model' && <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-1" />}
                                    <div className={cn(
                                        "p-3 rounded-lg max-w-[85%]",
                                        msg.role === 'model' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                                    )}>
                                        <SimpleMarkdown text={msg.content} />
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex items-start gap-3">
                                    <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                                    <div className="p-3 rounded-lg bg-muted flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">KIPI sedang mengetik...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t bg-background">
                        <form onSubmit={handleSubmit} className="flex items-center gap-2">
                            <Input 
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Tanya KIPI di sini..."
                                className="flex-1"
                                disabled={loading}
                            />
                            <Button type="submit" size="icon" disabled={loading || !userInput.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
