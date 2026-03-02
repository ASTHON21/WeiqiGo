
import type { Metadata } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { LanguageProvider } from '@/context/language-context';
import { ThemeProvider } from '@/context/theme-context';
import { GlobalMenu } from '@/components/layout/GlobalMenu';

export const metadata: Metadata = {
  title: 'Weiqi Go',
  description: 'An elegant Go game with an AI opponent.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" translate="no">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Literata:opsz@7..72&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased min-h-screen bg-background')}>
        <FirebaseClientProvider>
          <ThemeProvider>
            <LanguageProvider>
              <GlobalMenu />
              <main>
                {children}
              </main>
              <Toaster />
            </LanguageProvider>
          </ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
