"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import type { SessionListItem } from "@/types";

export default function SessionsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SessionListItem[]>([]);

  // Auth guard with next param
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/login?next=/sessions");
    } else {
      setReady(true);
    }
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{results?: SessionListItem[]} | SessionListItem[]>("/sessions/");
      const list: SessionListItem[] = Array.isArray(res) ? res : res?.results ?? [];
      setItems(list);
    } catch (e: unknown) {
      const error = e as Error;
      setError(error?.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const ta = a.start_time ? new Date(a.start_time).getTime() : 0;
      const tb = b.start_time ? new Date(b.start_time).getTime() : 0;
      return tb - ta; // newest first
    });
  }, [items]);

  function formatWhen(iso?: string | null) {
    if (!iso) return "No timestamp";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "No timestamp" : d.toLocaleString();
  }

  function computeNet(s: SessionListItem): number {
    // Supports multiple serializer shapes:
    // 1) flat net field
    if (typeof s.net === "number") return s.net;
    // 2) totals.net nested
    if (typeof s.totals?.net === "number") return s.totals.net;
    // 3) total_prize - total_buyins
    const totalPrize = Number(s.total_prize ?? 0);
    const totalBuyins = Number(s.total_buyins ?? 0);
    return totalPrize - totalBuyins;
  }

  if (!ready) return <div className="p-6">Redirecting to login…</div>;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Sessions</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2 rounded border disabled:opacity-60"
            title="Reload"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <Link
            href="/sessions/new"
            className="bg-black text-white px-4 py-2 rounded hover:opacity-90"
          >
            New Session
          </Link>
        </div>
      </div>

      {loading && <div className="p-2">Loading…</div>}

      {error && (
        <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="ml-3 underline hover:opacity-80">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {sorted.length === 0 ? (
            <div className="border rounded p-4">
              <div className="font-medium mb-1">No sessions yet</div>
              <div className="text-gray-600">
                Click <span className="font-medium">New Session</span> to create your first one.
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {sorted.map((s) => {
                const net = computeNet(s);
                return (
                  <li
                    key={s.id}
                    className="border rounded p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">Session #{s.id}</div>
                      <div className="text-sm text-gray-600">{formatWhen(s.start_time)}</div>
                      {s.notes && (
                        <div className="text-sm text-gray-700 mt-1 line-clamp-2">
                          {s.notes}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm font-semibold ${
                          net >= 0 ? "text-green-700" : "text-red-700"
                        }`}
                        title="Net profit = prizes - buy-ins"
                      >
                        {net.toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                        })}
                      </div>
                      <Link
                        href={`/sessions/${s.id}`}
                        className="text-blue-600 underline text-sm"
                      >
                        Open
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
