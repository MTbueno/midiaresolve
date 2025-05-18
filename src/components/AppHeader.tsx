
"use client";
import { SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/50">
      <div className="container mx-auto flex h-20 max-w-screen-lg items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <Link href="/" className="flex items-center space-x-2">
            <SlidersHorizontal className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg tracking-tight">MidiaResolve</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">Design by Murillo Bueno</p>
        </div>
      </div>
    </header>
  );
}
