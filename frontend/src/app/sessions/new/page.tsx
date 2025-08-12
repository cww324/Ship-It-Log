'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/app/lib/api';

export default function NewSessionPage() {
  const r = useRouter();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/sessions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error('Failed to create session');
      const data = await res.json();
      r.push(`/sessions/${data.id}`);
    } catch (err) {
      alert('Could not create session.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Create Session</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          className="w-full border rounded p-2"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button className="px-4 py-2 rounded bg-black text-white" disabled={loading}>
          {loading ? 'Creating…' : 'Create Session'}
        </button>
      </form>
    </main>
  );
}
