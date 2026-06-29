// src/app/(auth)/activate/page.tsx
"use client";

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const name = searchParams.get('name');
  const company = searchParams.get('company');
  const email = searchParams.get('email');

  if (!name || !company || !email) {
    // Redirect to login if params are missing
    if (typeof window !== 'undefined') {
      router.replace('/login');
    }
    return null;
  }

  const adminPhoneNumber = "+6281234599171";
  const message = `Halo admin, saya mau aktivasi akun dengan detail data:\n- Nama Perusahaan: ${company}\n- Nama: ${name}\n- Email: ${email}`;
  const whatsappUrl = `https://wa.me/${adminPhoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background/50 py-12">
      <Card className="mx-auto max-w-md w-full shadow-2xl text-center">
        <CardHeader className="space-y-4">
           <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-10 w-10 text-green-500" />
                <CardTitle className="text-3xl font-headline">
                  Pendaftaran Berhasil!
                </CardTitle>
            </div>
          <CardDescription>
             Akun Anda telah berhasil dibuat. Langkah terakhir adalah aktivasi oleh Superadmin kami.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className='text-left text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg'>
                <p><strong>Nama:</strong> {name}</p>
                <p><strong>Perusahaan:</strong> {company}</p>
                <p><strong>Email:</strong> {email}</p>
            </div>
          <p className="text-sm">
            Silakan hubungi admin kami melalui WhatsApp untuk mempercepat proses aktivasi. Cukup klik tombol di bawah ini.
          </p>
          <Button asChild className="w-full">
            <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageSquare className="mr-2 h-5 w-5" />
              Hubungi Admin via WhatsApp
            </Link>
          </Button>
          <div className="mt-4 text-center text-sm">
            Sudah diaktivasi?{' '}
            <Link href="/login" className="underline font-semibold">
              Masuk di sini
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default function ActivatePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ActivateContent />
        </Suspense>
    );
}