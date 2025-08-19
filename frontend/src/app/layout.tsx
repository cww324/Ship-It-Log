// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import ConditionalHeader from '@/components/ConditionalHeader';

export const metadata: Metadata = {
  title: "ShipIt Log",
  description: "Poker session tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConditionalHeader />
        {children}
      </body>
    </html>
  );
}
