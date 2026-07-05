// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { PushNotificationManager } from "@/components/layout/push-notification-manager";
import Script from "next/script";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

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
      className={cn(inter.variable)} 
      suppressHydrationWarning
    >
      <body className={cn("font-sans antialiased", inter.className)}>
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
      </body>
    </html>
  );
}
