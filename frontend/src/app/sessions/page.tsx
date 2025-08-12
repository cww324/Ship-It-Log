"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import type { Session } from "@/types";

export default function SessionsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Session[]>([]);

  // Auth guard
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/login?next=/sessions");
    } else {
      setReady(true);
    }
  }, [router]);

  // Load sessions once authed
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet<{ results: Session[] }>("/sessions/");
        if (!cancelled) setItems(res.results ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Failed to load sessions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ready]);

  if (!ready) return <div className="p-6">Redirecting to login…</div>;
  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Sessions</h1>
        <Link
          href="/sessions/new"
          className="bg-black text-white px-4 py-2 rounded hover:opacity-90"
        >
          New Session
        </Link>
      </div>

      {error && (
        <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
      )}

      {items.length === 0 ? (
        <div className="text-gray-600">No sessions yet.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.id} className="border rounded p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">Session #{s.id}</div>
                <div className="text-sm text-gray-600">
                  {new Date(s.start_time).toLocaleString()}
                </div>
              </div>
              <Link
                href={`/sessions/${s.id}`}
                className="text-blue-600 underline text-sm"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
