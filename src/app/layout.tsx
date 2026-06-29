
import type { Metadata } from 'next';
import './globals.css';
import { Jost, Poppins } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ClientProviders } from './client-providers';
import Script from 'next/script';

const fontJost = Jost({
  subsets: ['latin'],
  variable: '--font-jost',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

const fontPoppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700'],
});


export const metadata: Metadata = {
  title: 'KIPIAI.ID by HRDKU',
  description: 'Aplikasi web untuk manajemen KPI (Indikator Kinerja Utama) karyawan.',
  manifest: '/manifest.json',
  icons: {
    icon: 'https://cdn.scalev.id/business_files/yVvqA_tsSzvt5_Yf2lNStxvP/1757745293765-k%20(8).webp',
    apple: 'https://cdn.scalev.id/business_files/yVvqA_tsSzvt5_Yf2lNStxvP/1757745293765-k%20(8).webp',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const midtransScriptUrl = process.env.MIDTRANS_IS_PRODUCTION === 'true' 
    ? 'https://app.midtrans.com/snap/snap.js' 
    : 'https://app.sandbox.midtrans.com/snap/snap.js';

  return (
    <html lang="id" suppressHydrationWarning className={cn(
        fontJost.variable,
        fontPoppins.variable
    )}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#3F51B5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KIPIAI" />
        <link rel="apple-touch-icon" href="https://cdn.scalev.id/business_files/yVvqA_tsSzvt5_Yf2lNStxvP/1757745293765-k%20(8).webp" />
      </head>
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
        {/* Load Midtrans Snap Script */}
        <Script 
            src={midtransScriptUrl} 
            data-client-key={process.env.MIDTRANS_CLIENT_KEY} 
            strategy="lazyOnload" 
        />
      </body>
    </html>
  );
}
