// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ShipIt Log",
  description: "Poker session tracker",
};



import LogoutButton from '@/components/LogoutButton';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="flex items-center justify-end p-3 border-b">
          <LogoutButton />
        </header>
        {children}
      </body>
    </html>
  );
}
