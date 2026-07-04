// src/app/layout.tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { PushNotificationManager } from "@/components/layout/push-notification-manager";
import Script from "next/script";

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
  // Determine Midtrans Snap URL based on environment
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const snapUrl = isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  const clientKey = process.env.MIDTRANS_CLIENT_KEY || "Mid-client-MpjNTjYjtHljjjQ9";

  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
            <PushNotificationManager />
          </AuthProvider>
        </ThemeProvider>
        
        {/* Load Midtrans Snap Script */}
        <Script 
          src={snapUrl} 
          data-client-key={clientKey}
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
