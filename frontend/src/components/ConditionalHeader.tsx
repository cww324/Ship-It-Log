"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from './LogoutButton';

export default function ConditionalHeader() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setIsAuthenticated(!!token);
  }, []);

  // Don't show header on landing page, login, or register pages
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/register';
  
  if (isPublicPage || !isAuthenticated) {
    return null;
  }

  return (
    <header className="flex items-center justify-between p-3 border-b bg-white shadow-sm">
      <Link href="/dashboard" className="text-xl font-bold text-gray-900">
        ShipIt Log
      </Link>
      <LogoutButton />
    </header>
  );
}