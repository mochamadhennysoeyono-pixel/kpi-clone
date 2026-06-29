// src/components/lms/course-entry-dialog.tsx
"use client";

import Link from 'next/link';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Course, Employee, Enrollment } from "@/types";
import { BookUp } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useMasterData } from '@/contexts/master-data-context';
import { useRouter } from 'next/navigation';

interface CourseEntryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  course: Course | null;
  currentUser: Employee | null;
}

// A simple markdown-to-HTML converter
function SimpleMarkdown({ text }: { text: string }) {
    const html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>') // Underline
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline">$1</a>') // Link
      .replace(/^\s*-\s+(.*)/gm, '<li>$1</li>') // Unordered list
      .replace(/^\s*\d+\.\s+(.*)/gm, '<li>$1</li>') // Ordered list (simplified)
      .replace(/(<li>.*<\/li>)/gs, (match) => { // Wrap lists
        const isOrdered = /1\.\s/.test(text);
        const listTag = isOrdered ? 'ol class="list-decimal list-inside"' : 'ul class="list-disc list-inside"';
        return `<${listTag}>${match}</ul>`;
      })
      .replace(/\n/g, '<br />');
  
    return <div className="text-sm text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
  }

export function CourseEntryDialog({ isOpen, onOpenChange, course, currentUser }: CourseEntryDialogProps) {
  const { enrollToCourse } = useMasterData();
  const router = useRouter();

  if (!course || !currentUser) return null;

  const handleStartLearning = () => {
    // This function will now find or create an enrollment.
    // The link will handle the navigation part.
    enrollToCourse(course.id, currentUser.id);
    onOpenChange(false);
    // Directly navigate, assuming enrollToCourse updates context in the background.
    router.push(`/lms/user/course/${course.id}`);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center items-center">
            {course.thumbnailUrl && (
                <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-4">
                    <Image 
                        src={course.thumbnailUrl} 
                        alt={course.title} 
                        fill 
                        style={{objectFit:"cover"}}
                        onError={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'}
                    />
                </div>
            )}
          <DialogTitle className="text-2xl font-bold">{course.title}</DialogTitle>
          <DialogDescription className="text-base">
            Halo <span className="font-semibold">{currentUser.name}</span>, Anda akan memulai kursus ini.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[200px] my-4 pr-4">
            <SimpleMarkdown text={course.description} />
        </ScrollArea>
        <div className="text-center font-semibold text-foreground">
            Selamat Belajar!
        </div>
        <DialogFooter className="sm:justify-center pt-4 gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Batal
            </Button>
          </DialogClose>
          <Button onClick={handleStartLearning}>
              <BookUp className="mr-2 h-4 w-4" />
              Mulai Belajar Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
