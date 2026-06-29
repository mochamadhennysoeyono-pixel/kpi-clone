// src/app/(main)/lms/user/my-programs/page.tsx
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Workflow } from "lucide-react";
import { Button } from '@/components/ui/button';

export default function MyLearningProgramsPage() {
    const { learningPrograms } = useMasterData();
    const { currentUser } = useAuth();

    const myPrograms = useMemo(() => {
        if (!currentUser || !learningPrograms) return [];

        return learningPrograms.filter(program => {
            if (program.status !== 'published') return false;

            const userCompany = currentUser.company;
            if (program.company !== userCompany && program.company !== 'Global') return false;

            const { departments, positions, levels, employees: specificEmployees } = program.targetAudience;

            if (!departments?.length && !positions?.length && !levels?.length && !specificEmployees?.length) {
                return currentUser.role === 'user';
            }

            if (specificEmployees?.includes(currentUser.id)) return true;

            if (!specificEmployees || specificEmployees.length === 0) {
                const departmentMatch = !departments?.length || departments.includes(currentUser.department);
                const positionMatch = !positions?.length || positions.includes(currentUser.position);
                const levelMatch = !levels?.length || levels.includes(currentUser.level);
                return departmentMatch && positionMatch && levelMatch;
            }
            return false;
        });

    }, [learningPrograms, currentUser]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <Workflow />
                        Program Pembelajaran Saya
                    </CardTitle>
                    <CardDescription>
                        Jelajahi alur pembelajaran terstruktur yang telah disiapkan untuk Anda.
                    </CardDescription>
                </CardHeader>
            </Card>
            
            {myPrograms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myPrograms.map(program => (
                        <Card key={program.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">{program.title}</CardTitle>
                                <p className="text-xs text-muted-foreground">{program.stages.length} Tahapan</p>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground line-clamp-3">{program.description}</p>
                            </CardContent>
                            <CardFooter>
                                <Button asChild className="w-full">
                                    <Link href={`/lms/user/program/${program.id}`}>
                                        Lihat Journey
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-10 text-center text-muted-foreground">
                        Anda tidak terdaftar dalam program pembelajaran apa pun saat ini.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
