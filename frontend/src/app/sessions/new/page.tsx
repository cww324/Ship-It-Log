'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';

export default function NewSessionPage() {
  const r = useRouter();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/sessions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to create session');
      }
      const data = await res.json();
      r.push(`/sessions/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Create Session</h1>

      {error && (
        <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <div className="text-sm text-gray-700 mb-1">Notes (optional)</div>
          <textarea
            className="w-full border rounded p-2"
            placeholder="Anything you want to remember about this session…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </label>

        <div className="flex gap-3">
          <button
            disabled={saving}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create Session'}
          </button>
          <button
            type="button"
            onClick={() => r.push('/sessions')}
            className="px-4 py-2 rounded border"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
