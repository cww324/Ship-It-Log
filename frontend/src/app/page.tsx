"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Client-only: check for token and bounce to /sessions if present
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      router.replace("/sessions");
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) return <div className="p-6">Loading…</div>;

  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-3xl font-semibold">Ship It Log</h1>
        <p className="text-gray-600">
          Track your poker sessions and tournaments. Sign in to get started.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a href="/login" className="bg-black text-white px-4 py-2 rounded hover:opacity-90">
            Sign in
          </a>
        </div>
      </div>
    </main>
  );
}
