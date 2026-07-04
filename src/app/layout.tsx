// src/app/layout.tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { PushNotificationManager } from "@/components/layout/push-notification-manager";
import Script from "next/script";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Perfom - Sistem HRIS Terintegrasi",
  description: "Perfom adalah solusi HRIS terintegrasi untuk mengelola sumber daya manusia, mulai dari data karyawan, kehadiran, hingga penilaian kinerja.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const snapUrl = isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  const clientKey = process.env.MIDTRANS_CLIENT_KEY || "Mid-client-MpjNTjYjtHljjjQ9";

  return (
    <html 
      lang="id" 
      className={cn(GeistSans.variable, GeistMono.variable)} 
      suppressHydrationWarning
    >
      <body className={cn("font-sans antialiased", GeistSans.className)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
            <PushNotificationManager />
          </AuthProvider>
        </ThemeProvider>
        
        <Script 
          src={snapUrl} 
          data-client-key={clientKey}
          strategy="beforeInteractive"
        />

        {/* Global SVG Gradients for Industrial Polish */}
        <svg width="0" height="0" className="absolute invisible pointer-events-none">
          <defs>
            <linearGradient id="brand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#090e1a" /> {/* Deep Navy */}
              <stop offset="100%" stopColor="#0062ff" /> {/* Electric Blue */}
            </linearGradient>
          </defs>
        </svg>
      </body>
    </html>
  );
}
