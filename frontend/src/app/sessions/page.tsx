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

  // Auth guard with next param
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/login?next=/sessions");
    } else {
      setReady(true);
    }
  }, [router]);

  // Load sessions once authed
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/sessions/");
      // tolerate both array and paginated {results: []}
      const list: Session[] = Array.isArray(res) ? res : res?.results ?? [];
      setItems(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ready) load();
  }, [ready]);

  if (!ready) return <div className="p-6">Redirecting to login…</div>;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Sessions</h1>
        <Link
          href="/sessions/new"
          className="bg-black text-white px-4 py-2 rounded hover:opacity-90"
        >
          New Session
        </Link>
      </div>

      {loading && <div className="p-2">Loading…</div>}

      {error && (
        <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={load}
            className="ml-3 underline hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="text-gray-600 border rounded p-4">
              No sessions yet. Click <span className="font-medium">New Session</span> to create one.
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((s) => (
                <li key={s.id} className="border rounded p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">Session #{s.id}</div>
                    {s.start_time && (
                      <div className="text-sm text-gray-600">
                        {new Date(s.start_time).toLocaleString()}
                      </div>
                    )}
                    {s.notes && (
                      <div className="text-sm text-gray-700 mt-1 line-clamp-2">{s.notes}</div>
                    )}
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
        </>
      )}
    </main>
  );
}
