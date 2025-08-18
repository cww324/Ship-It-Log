// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ShipIt Log",
  description: "Poker session tracker",
};



import LogoutButton from '@/components/LogoutButton';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="flex items-center justify-between p-3 border-b bg-white shadow-sm">
          <Link href="/" className="text-xl font-bold text-gray-900">
            ShipIt Log
          </Link>
          <LogoutButton />
        </header>
        {children}
      </body>
    </html>
  );
}
