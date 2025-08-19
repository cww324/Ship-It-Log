'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';

export default function LoginPage() {
  const r = useRouter();
  const q = useSearchParams();
  const next = q.get('next') || '/';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Already logged in? bounce to next
    if (localStorage.getItem('token')) r.replace(next);
  }, [r, next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password }),
      });

      if (!res.ok) {
        let msg = 'Login failed';
        try {
          const data = await res.json();
          msg = data?.detail || JSON.stringify(data);
        } catch {
          const txt = await res.text().catch(() => '');
          if (txt) msg = txt;
        }
        throw new Error(msg);
      }

      const data = await res.json();
      if (!data?.token) throw new Error('No token returned');
      localStorage.setItem('token', data.token);
      r.replace(next);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Login</h1>

      {error && (
        <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <div className="text-sm text-gray-700 mb-1">Username</div>
          <input
            className="w-full border rounded p-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>

        <label className="block">
          <div className="text-sm text-gray-700 mb-1">Password</div>
          <input
            type="password"
            className="w-full border rounded p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60 w-full"
        >
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <Link
          href={`/register${next !== '/sessions' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="text-blue-600 hover:underline"
        >
          Create account
        </Link>
      </div>
    </main>
  );
}
