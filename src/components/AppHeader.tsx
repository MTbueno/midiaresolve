"use client";
import { SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/50">
      <div className="container mx-auto flex h-16 max-w-screen-lg items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center space-x-2">
          <SlidersHorizontal className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">MidiaResolve</span>
        </Link>
      </div>
    </header>
  );
}
