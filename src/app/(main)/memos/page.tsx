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
import { PlusCircle, Inbox, Send, Mail, Trash2, Reply } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { usePageContext } from "@/contexts/page-context";
import { useMasterData } from "@/contexts/master-data-context";
import type { Memo } from "@/types";
import { MemoComposerDialog } from "@/components/memos/memo-composer-dialog";
import { format, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

function MemoList({ memos, title, onReply }: { memos: Memo[], title: string, onReply: (memo: Memo) => void }) {
  if (memos.length === 0) {
    return (
      <Card className="shadow-lg border-dashed">
        <CardContent className="p-10 text-center text-muted-foreground">
          <p>Tidak ada {title.toLowerCase()}.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {memos.map(memo => (
        <Card key={memo.id} className="flex flex-col shadow-lg">
           <CardHeader className="p-4 bg-muted/50">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base font-semibold">{memo.subject}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {title === "Pesan Masuk" ? `Dari: ${memo.senderName}` : `Kepada: ${memo.recipientName}`}
                </CardDescription>
              </div>
              <div className="text-xs text-muted-foreground text-right flex-shrink-0 ml-4">
                  {memo.timestamp && typeof memo.timestamp.toDate === 'function' ? format(memo.timestamp.toDate(), "d MMM yyyy, HH:mm") : 'Baru saja'}
                  <p>{memo.timestamp && typeof memo.timestamp.toDate === 'function' ? formatDistanceToNow(memo.timestamp.toDate(), { addSuffix: true, locale: id }) : ''}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm whitespace-pre-wrap">{memo.message}</p>
          </CardContent>
          {title === "Pesan Masuk" && (
            <CardFooter className="p-4 pt-0 mt-auto">
                <Button variant="outline" size="sm" onClick={() => onReply(memo)}>
                    <Reply className="mr-2 h-4 w-4" />
                    Balas
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
          const timeA = a.timestamp && typeof a.timestamp.toMillis === 'function' ? a.timestamp.toMillis() : Date.now();
          const timeB = b.timestamp && typeof b.timestamp.toMillis === 'function' ? b.timestamp.toMillis() : Date.now();
          return timeB - timeA;
      });

    return {
      inbox: userMemos.filter(m => m.recipientId === currentUser.id),
      sent: userMemos.filter(m => m.senderId === currentUser.id),
    }
  }, [memos, currentUser]);

  const handleOpenComposer = (memoToReply?: Memo) => {
    if (memoToReply) {
        setReplyingToMemo(memoToReply);
    } else {
        setReplyingToMemo(null);
    }
    setComposerOpen(true);
  };


  if (!currentUser) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Memuat data pengguna...</p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      <Card className="shadow-lg border-t-4 border-primary">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <CardTitle className="font-headline text-2xl">Pusat Pesan Memo</CardTitle>
                    <CardDescription>
                        Kirim dan terima pesan internal di sini.
                    </CardDescription>
                </div>
            </div>
            <Button className="shadow-md" onClick={() => handleOpenComposer()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tulis Memo Baru
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inbox">
            <Inbox className="mr-2 h-4 w-4" />
            Pesan Masuk ({inbox.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Send className="mr-2 h-4 w-4" />
            Pesan Terkirim ({sent.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="mt-4">
          <MemoList memos={inbox} title="Pesan Masuk" onReply={handleOpenComposer} />
        </TabsContent>
        <TabsContent value="sent" className="mt-4">
          <MemoList memos={sent} title="Pesan Terkirim" onReply={() => {}} />
        </TabsContent>
      </Tabs>
    </div>
    <MemoComposerDialog 
        isOpen={isComposerOpen}
        onOpenChange={setComposerOpen}
        replyToMemo={replyingToMemo}
    />
    </>
  );
}
