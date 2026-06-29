
// src/app/(main)/lms/admin/global-catalog/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Course } from "@/types";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Library } from "lucide-react";
import { CourseFormSheet } from "@/components/lms/course-form-sheet";
import Image from "next/image";

export default function LmsGlobalCatalogPage() {
  const { courses, addCourse, updateCourse } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const [isFormSheetOpen, setFormSheetOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | undefined>(undefined);
  const [isCloning, setIsCloning] = useState(false);

  // Corrected logic: Always show courses marked as 'Global'
  const globalCourses = useMemo(() => {
    if (!courses) return [];
    return courses.filter(c => c.company === 'Global' && c.status === 'published');
  }, [courses]);
  
  const handleAddToMyCompany = (course: Course) => {
    setSelectedCourse(course);
    setIsCloning(true);
    setFormSheetOpen(true);
  };
  
  const handleAddGlobalCourse = () => {
    const globalCourseTemplate: Partial<Course> = {
        company: 'Global',
        status: 'draft',
        targetAudience: {} // Global courses don't have specific targets
    };
    setSelectedCourse(globalCourseTemplate as Course);
    setIsCloning(false); // It's a new course, not a clone
    setFormSheetOpen(true);
  }

  const handleSaveCourse = async (data: Omit<Course, 'id' | 'createdBy' | 'createdAt'> & { id?: string }) => {
    // If it's a clone, the company will be the user's company.
    // If it's a new global course, the company will be 'Global'.
    const company = isCloning ? currentUser?.company || '' : data.company;
    
    // When cloning, it's always a new course, so we remove the ID.
    const courseData: Omit<Course, 'id'> = {
      ...data,
      company: company,
      createdBy: currentUser?.id || '',
      createdAt: new Date(),
      status: 'draft', // Cloned/new courses start as draft
    };
    delete (courseData as Partial<Course>).id;
    
    await addCourse(courseData);
  };

  const buttonText = userRole === 'superadmin' ? 'Tambahkan ke Perusahaan Saya' : 'Tambahkan & Sesuaikan';

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Library />
                Katalog Kursus Global
              </CardTitle>
              <CardDescription>
                Jelajahi dan tambahkan kursus standar yang telah disiapkan ke dalam daftar kursus perusahaan Anda.
              </CardDescription>
            </div>
            {userRole === 'superadmin' && (
                <Button onClick={handleAddGlobalCourse}>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Tambah Kursus Global
                </Button>
            )}
          </CardHeader>
          <CardContent>
            {globalCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {globalCourses.map(course => (
                        <Card key={course.id} className="flex flex-col overflow-hidden">
                            {course.thumbnailUrl && (
                                <div className="relative aspect-video w-full">
                                <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover" />
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">{course.title}</CardTitle>
                                <div className="flex flex-wrap gap-1 pt-1">
                                {course.categories?.map(cat => <Badge key={cat} variant="secondary">{cat}</Badge>)}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground line-clamp-3">{course.description}</p>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={() => handleAddToMyCompany(course)} className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                {buttonText}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                 <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Tidak ada kursus global yang tersedia saat ini.</p>
                 </div>
            )}
          </CardContent>
        </Card>
      </div>
      <CourseFormSheet
        isOpen={isFormSheetOpen}
        onOpenChange={setFormSheetOpen}
        course={selectedCourse}
        isCloning={isCloning}
        onSave={handleSaveCourse}
      />
    </>
  );
}
