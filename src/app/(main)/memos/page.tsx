
// src/app/(main)/memos/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Inbox, Send, Mail, Trash2, Reply, History, User } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { usePageContext } from "@/contexts/page-context";
import { useMasterData } from "@/contexts/master-data-context";
import type { Memo } from "@/types";
import { MemoComposerDialog } from "@/components/memos/memo-composer-dialog";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ResponsivePage } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function MemoList({ memos, title, onReply }: { memos: Memo[], title: string, onReply: (memo: Memo) => void }) {
  if (memos.length === 0) {
    return (
      <Card className="border-dashed bg-muted/5">
        <CardContent className="py-20 text-center text-muted-foreground">
          <p className="font-medium italic text-sm">Tidak ada {title.toLowerCase()}.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {memos.map(memo => (
        <Card key={memo.id} className="border-border/40 hover:shadow-md transition-all overflow-hidden bg-background">
           <CardHeader className="p-4 bg-muted/20 border-b">
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="size-9 border shadow-sm shrink-0">
                    <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">
                        {(title === "Pesan Masuk" ? memo.senderName : memo.recipientName).substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <CardTitle className="text-sm font-bold truncate text-slate-900">{memo.subject}</CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-tight truncate">
                        {title === "Pesan Masuk" ? `Dari: ${memo.senderName}` : `Kepada: ${memo.recipientName}`}
                    </CardDescription>
                </div>
              </div>
              <div className="text-right shrink-0">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 justify-end">
                      <History size={10} /> {memo.timestamp?.toDate ? formatDistanceToNow(memo.timestamp.toDate(), { addSuffix: true, locale: localeId }) : 'Baru saja'}
                  </p>
                  <p className="text-[10px] font-medium text-muted-foreground/60">{memo.timestamp?.toDate ? format(memo.timestamp.toDate(), "d MMM yy") : ''}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{memo.message}</p>
          </CardContent>
          {title === "Pesan Masuk" && (
            <CardFooter className="p-4 border-t bg-muted/5 flex justify-end">
                <Button variant="outline" size="sm" className="h-8 font-black text-[10px] uppercase tracking-widest gap-2" onClick={() => onReply(memo)}>
                    <Reply className="size-3.5" />
                    Balas Pesan
                </Button>
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
}


export default function MemosPage() {
  const { currentUser } = useAuth();
  const { setPageContext } = usePageContext();
  const { memos } = useMasterData();
  const [activeTab, setActiveTab] = useState("inbox");
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [replyingToMemo, setReplyingToMemo] = useState<Memo | null>(null);

  useEffect(() => {
    setPageContext("Pesan Memo", null);
  }, [setPageContext]);
  
  const { inbox, sent } = useMemo(() => {
    if (!currentUser) return { inbox: [], sent: [] };

    const userMemos = memos
      .filter(m => m.senderId === currentUser.id || m.recipientId === currentUser.id)
      .sort((a,b) => {
          const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : Date.now());
          const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : Date.now());
          return timeB - timeA;
      });

    return {
      inbox: userMemos.filter(m => m.recipientId === currentUser.id),
      sent: userMemos.filter(m => m.senderId === currentUser.id),
    }
  }, [memos, currentUser]);

  const handleOpenComposer = (memoToReply?: Memo) => {
    if (memoToReply) setReplyingToMemo(memoToReply);
    else setReplyingToMemo(null);
    setComposerOpen(true);
  };

  if (!currentUser) return null;

  return (
    <ResponsivePage>
        <PageHeader 
            title="Pusat Pesan Memo"
            description="Layanan komunikasi internal terpusat untuk pengiriman instruksi, pemberitahuan, dan pengumuman individu."
            icon={Mail}
            actions={
                <Button className="font-bold shadow-lg h-9 sm:h-10 active:scale-95 transition-all" onClick={() => handleOpenComposer()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tulis Memo Baru
                </Button>
            }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="w-full overflow-x-auto pb-2">
                <TabsList className="flex w-max sm:grid sm:w-full sm:grid-cols-2 max-w-[400px] bg-muted/30 p-1 rounded-xl mb-8">
                    <TabsTrigger value="inbox" className="text-[10px] font-black uppercase rounded-lg px-6">
                        <Inbox className="mr-2 h-4 w-4" />
                        Pesan Masuk ({inbox.length})
                    </TabsTrigger>
                    <TabsTrigger value="sent" className="text-[10px] font-black uppercase rounded-lg px-6">
                        <Send className="mr-2 h-4 w-4" />
                        Pesan Terkirim ({sent.length})
                    </TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="inbox" className="mt-0 border-none animate-in fade-in duration-300">
                <MemoList memos={inbox} title="Pesan Masuk" onReply={handleOpenComposer} />
            </TabsContent>
            <TabsContent value="sent" className="mt-0 border-none animate-in fade-in duration-300">
                <MemoList memos={sent} title="Pesan Terkirim" onReply={() => {}} />
            </TabsContent>
        </Tabs>

        <MemoComposerDialog 
            isOpen={isComposerOpen}
            onOpenChange={setComposerOpen}
            replyToMemo={replyingToMemo}
        />
    </ResponsivePage>
  );
}
