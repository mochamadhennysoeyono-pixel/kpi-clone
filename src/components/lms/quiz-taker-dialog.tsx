// src/components/lms/quiz-taker-dialog.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "../ui/scroll-area";
import type { LmsQuiz, Enrollment, Course } from "@/types";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Loader2, Check, X, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Progress } from "../ui/progress";

interface QuizTakerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course;
  quiz: LmsQuiz;
  quizType: 'pre-test' | 'post-test' | 'module-pre-test' | 'module-post-test';
  moduleId?: string;
  enrollment: Enrollment;
  onSubmit: (updateData: Partial<Enrollment>, quizType: string, quizId: string, moduleId?: string) => Promise<void>;
}

export function QuizTakerDialog({ isOpen, onOpenChange, course, quiz, quizType, moduleId, enrollment, onSubmit }: QuizTakerDialogProps) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setAnswers({});
        setSubmitted(false);
        setScore(0);
    }
  }, [isOpen]);

  const totalPoints = useMemo(() => quiz.questions.reduce((sum, q) => sum + q.points, 0), [quiz.questions]);
  
  const { passingScore, isFinalTest } = useMemo(() => {
    if (!course) return { passingScore: 80, isFinalTest: false };
    if (quizType === 'post-test' && !course.isProgram) {
      return { passingScore: course.postTestPassingScore ?? 80, isFinalTest: true };
    }
    if (quizType === 'module-post-test' && course.isProgram) {
        const module = course.modules.find(m => m.id === moduleId);
        return { passingScore: module?.passingScore ?? 80, isFinalTest: false };
    }
    return { passingScore: 0, isFinalTest: false }; 
  }, [course, quizType, moduleId]);

  const handleAnswerChange = (questionId: string, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    let calculatedScore = 0;
    quiz.questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        calculatedScore += q.points;
      }
    });

    const finalPercentageScore = totalPoints > 0 ? (calculatedScore / totalPoints) * 100 : 0;
    setScore(parseFloat(finalPercentageScore.toFixed(1)));
    setSubmitted(true);
    setLoading(false);
  };
  
  const handleTryAgain = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
  };

  const handleFinish = async () => {
    const updateData: Partial<Enrollment> = {};
  
    if (quizType.startsWith('module-')) {
      if (moduleId) {
        let newModuleScores = [...(enrollment.moduleScores || [])];
        let moduleScoreEntry = newModuleScores.find(ms => ms.moduleId === moduleId);
  
        if (!moduleScoreEntry) {
          moduleScoreEntry = { moduleId: moduleId!, finalScore: 0 };
          newModuleScores.push(moduleScoreEntry);
        }
  
        if (quizType === 'module-pre-test') {
          moduleScoreEntry.preTestScore = score;
        }
        if (quizType === 'module-post-test') {
          moduleScoreEntry.postTestScore = score;
          moduleScoreEntry.finalScore = score;
        }
  
        updateData.moduleScores = newModuleScores;
      }
    } else { 
      if (quizType === 'pre-test') {
        updateData.preTestScore = score;
      }
      if (quizType === 'post-test') {
        updateData.postTestScore = score;
      }
    }
  
    await onSubmit(updateData, quizType, quiz.id, moduleId);
  };


  const isPassed = score >= passingScore;

  const dialogTitle = quizType.includes('pre') ? `Pre-Test: ${quiz.title}` : `Post-Test: ${quiz.title}`;
  const dialogDescription = quizType.includes('module-')
    ? `Selesaikan tes ini untuk menyelesaikan bab ini. Skor kelulusan: ${passingScore}%`
    : `Selesaikan tes ini untuk menyelesaikan kursus. Skor kelulusan: ${passingScore}%`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col h-[90vh]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-6">
            <div className="space-y-6 py-4">
              {!submitted ? (
                  quiz.questions.map((q, qIndex) => (
                      <div key={q.id} className="p-4 border rounded-lg space-y-3 bg-background">
                          <p className="font-semibold text-sm">
                              {qIndex + 1}. {q.question}
                          </p>
                          <RadioGroup onValueChange={(value) => handleAnswerChange(q.id, parseInt(value))}>
                              {q.options.map((option, oIndex) => (
                              <div key={oIndex} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                                  <RadioGroupItem value={String(oIndex)} id={`q${qIndex}-opt${oIndex}`} />
                                  <Label htmlFor={`q${qIndex}-opt${oIndex}`} className="font-normal cursor-pointer">
                                  {option}
                                  </Label>
                              </div>
                              ))}
                          </RadioGroup>
                      </div>
                  ))
              ) : (
                  <div className="py-4 flex flex-col items-center justify-center text-center">
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${isPassed ? 'bg-green-100' : 'bg-red-100'}`}>
                          {isPassed ? <Check className="h-12 w-12 text-green-600" /> : <X className="h-12 w-12 text-red-600" />}
                      </div>
                      <h3 className="text-xl font-bold">{isPassed ? 'Selamat, Anda Lulus!' : 'Skor Anda Belum Mencukupi'}</h3>
                      <p className="text-muted-foreground">Skor Akhir</p>
                      <p className="text-5xl font-bold my-2">{score}</p>
                      <div className="w-full max-w-sm mx-auto my-4">
                          <Progress value={score} className="h-3" />
                           <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>0</span>
                                <span>Skor Kelulusan: {passingScore}</span>
                                <span>100</span>
                            </div>
                      </div>
                      
                      {!isPassed && !quizType.includes('pre') && (
                        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm">
                           Anda tetap bisa melihat hasil belajar Anda, namun disarankan untuk melakukan remidi guna mendapatkan hasil maksimal.
                        </div>
                      )}
                  </div>
              )}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="border-t pt-4 pb-8 sm:pb-4 flex flex-col sm:flex-row gap-2">
          {!submitted ? (
              <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || Object.keys(answers).length !== quiz.questions.length}
                  className="w-full"
              >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Selesaikan & Kirim Jawaban
              </Button>
          ) : (
              <>
                 <Button type="button" onClick={handleFinish} className="w-full">
                    {quizType.includes('pre') ? 'Lanjutkan Materi' : 'Lihat Laporan Hasil'}
                 </Button>
                 {!isPassed && !quizType.includes('pre') && (
                    <Button type="button" variant="outline" onClick={handleTryAgain} className="w-full">
                       <RefreshCw className="mr-2 h-4 w-4" /> Coba Lagi Sekarang
                    </Button>
                 )}
              </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
