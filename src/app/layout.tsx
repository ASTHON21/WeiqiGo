import type { Metadata } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { SidebarProvider, Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarHeader, SidebarTrigger } from '@/components/ui/sidebar';
import { History, Play } from 'lucide-react';
import Link from 'next/link';
import { Icons } from '@/components/icons';


export const metadata: Metadata = {
  title: 'Shadow Go',
  description: 'An elegant Go game with an AI opponent.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Literata:opsz@7..72&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased min-h-screen bg-background')}>
        <FirebaseClientProvider>
          <SidebarProvider defaultOpen={false}>
            <Sidebar collapsible="offcanvas">
              <SidebarHeader>
                <div className="flex items-center gap-2">
                  <Icons.Logo className="w-6 h-6 text-primary" />
                  <h1 className="text-xl font-semibold font-headline">Go Master</h1>
                </div>
              </SidebarHeader>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Link href="/game">
                    <SidebarMenuButton>
                      <Play />
                      <span>Play Game</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <Link href="/history">
                    <SidebarMenuButton>
                      <History />
                      <span>Game History</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </SidebarMenu>
            </Sidebar>
            <SidebarInset>
              <header className="flex h-14 shrink-0 items-center px-4 sticky top-0 z-10">
                <SidebarTrigger />
              </header>
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
