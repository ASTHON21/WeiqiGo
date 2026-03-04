
'use client';

import { usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Menu, Home, Info } from 'lucide-react';
import Link from 'next/link';

/**
 * 全局导航菜单组件
 * 自动根据当前路径决定是否显示。
 * 在进入具体的博弈对局（在线、练习、阅览）时隐藏，以保证沉浸感。
 */
export function GlobalMenu() {
  const pathname = usePathname();

  // 定义需要隐藏菜单的对局路径模式
  const isGameActive = 
    (pathname.startsWith('/game/online/') && pathname !== '/game/online/lobby') ||
    pathname === '/game/practice' ||
    pathname === '/game/viewer';

  if (isGameActive) {
    return null;
  }

  return (
    <div className="absolute top-4 left-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="bg-background/80 backdrop-blur-sm border-2">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem asChild>
            <Link href="/" className="w-full cursor-pointer flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span>主页 (Home)</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/about" className="w-full cursor-pointer flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>关于 (About)</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
