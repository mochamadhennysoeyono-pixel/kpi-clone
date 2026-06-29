// src/components/lms/quiz-simulation-dialog.tsx
"use client";

import { useState } from "react";
import type { LmsQuiz } from "@/types";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Check, X } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter
} from "../ui/card";
import { Progress } from "../ui/progress";

interface QuizSimulationDialogProps {
  quiz: LmsQuiz;
  onQuizComplete?: () => void;
}

export function QuizSimulationDialog({ quiz, onQuizComplete }: QuizSimulationDialogProps) {
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);

    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);

    const handleAnswerChange = (questionId: string, optionIndex: number) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };

    const handleSubmit = () => {
        let calculatedScore = 0;
        quiz.questions.forEach(q => {
            if (answers[q.id] === q.correctAnswer) {
                calculatedScore += q.points;
            }
        });
        const finalPercentageScore = totalPoints > 0 ? (calculatedScore / totalPoints) * 100 : 0;
        setScore(parseFloat(finalPercentageScore.toFixed(1)));
        setSubmitted(true);
    };

    const handleCloseOrContinue = () => {
        if (onQuizComplete) {
            onQuizComplete();
        }
        // Reset state for next use
        setAnswers({});
        setSubmitted(false);
        setScore(0);
    };
    
    if (!quiz) return null;

    const isPassed = score >= quiz.passingScore;

  return (
    <Card className="h-full w-full flex flex-col shadow-none border-0 bg-transparent">
        <CardHeader>
            <CardTitle>{quiz.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 py-0 px-0">
             <div className="space-y-6">
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
                        <h3 className="text-xl font-bold">{isPassed ? 'Simulasi Lulus!' : 'Simulasi Gagal'}</h3>
                        <p className="text-muted-foreground">Skor Anda (Simulasi)</p>
                        <p className="text-5xl font-bold my-2">{score}</p>
                        <div className="w-full max-w-sm mx-auto my-4">
                            <Progress value={score} className="h-3" />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>0</span>
                                <span>Skor Kelulusan: {quiz.passingScore}</span>
                                <span>100</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </CardContent>
         <CardFooter className="pt-6">
            {!submitted ? (
                <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={Object.keys(answers).length !== quiz.questions.length}
                    className="w-full"
                >
                    Selesaikan & Kirim Jawaban
                </Button>
            ) : (
                 <Button onClick={handleCloseOrContinue} className="w-full">
                    Lanjutkan Simulasi
                </Button>
            )}
        </CardFooter>
    </Card>
  );
}