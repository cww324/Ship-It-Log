'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost, sessionQuickTournament } from '@/lib/api';
import SiteSelect from '@/components/SiteSelect';

export default function NewSessionPage() {
  const router = useRouter();
  const [step, setStep] = useState<'session' | 'tournament'>('session');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tournament form for quick start
  const [tournamentName, setTournamentName] = useState('');
  const [site, setSite] = useState<number | null>(null);
  const [buyIn, setBuyIn] = useState('');

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) router.replace('/login?next=/sessions/new');
  }, [router]);

  async function createSession() {
    setSaving(true);
    setError(null);

    try {
      const session = await apiPost<{id: number}>('/sessions/', {
        notes: notes || `Poker session started ${new Date().toLocaleDateString()}`
      });
      setSessionId(session.id);
      setStep('tournament');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error?.message || 'Failed to create session');
    } finally {
      setSaving(false);
    }
  }

  async function addTournamentAndStart() {
    if (!sessionId || !tournamentName || !site || !buyIn) {
      setError('Please fill in all tournament details');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await sessionQuickTournament(sessionId, {
        name: tournamentName.trim(),
        site: site,
        buy_in: parseFloat(buyIn),
      });
      router.push(`/sessions/${sessionId}`);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error?.message || 'Failed to add tournament');
    } finally {
      setSaving(false);
    }
  }

  async function skipTournament() {
    if (sessionId) {
      router.push(`/sessions/${sessionId}`);
    }
  }

  if (step === 'session') {
    return (
      <main className="max-w-xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Start New Poker Session</h1>
          <p className="text-gray-600 mt-2">Ready to track your poker play?</p>
        </div>

        {error && (
          <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <label className="block">
            <div className="text-sm text-gray-700 mb-1">Session Notes (optional)</div>
            <textarea
              className="w-full border rounded p-3"
              placeholder="e.g., Playing at Aria, feeling good today..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </label>

          <div className="flex gap-3">
            <button
              onClick={createSession}
              disabled={saving}
              className="flex-1 px-4 py-3 rounded bg-green-600 text-white font-medium disabled:opacity-60 hover:bg-green-700"
            >
              {saving ? 'Starting Session...' : 'Start Session'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/sessions')}
              className="px-4 py-3 rounded border hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add Your First Tournament</h1>
        <p className="text-gray-600 mt-2">What are you playing first?</p>
      </div>

      {error && (
        <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <label className="block">
          <div className="text-sm text-gray-700 mb-1">Tournament Name</div>
          <input
            type="text"
            className="w-full border rounded p-3"
            placeholder="e.g., $109 Sunday Special, $33 Monster Stack"
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
          />
        </label>

        <label className="block">
          <div className="text-sm text-gray-700 mb-1">Site</div>
          <SiteSelect value={site} onChange={setSite} />
        </label>

        <label className="block">
          <div className="text-sm text-gray-700 mb-1">Buy-in Amount</div>
          <input
            type="number"
            step="0.01"
            className="w-full border rounded p-3"
            placeholder="109.00"
            value={buyIn}
            onChange={(e) => setBuyIn(e.target.value)}
          />
        </label>

        <div className="flex gap-3">
          <button
            onClick={addTournamentAndStart}
            disabled={saving || !tournamentName || !site || !buyIn}
            className="flex-1 px-4 py-3 rounded bg-blue-600 text-white font-medium disabled:opacity-60 hover:bg-blue-700"
          >
            {saving ? 'Adding Tournament...' : 'Add Tournament & Start'}
          </button>
          <button
            onClick={skipTournament}
            disabled={saving}
            className="px-4 py-3 rounded border hover:bg-gray-50"
          >
            Skip for Now
          </button>
        </div>

        <p className="text-sm text-gray-500 text-center">
          You can always add tournaments later from the session page
        </p>
      </div>
    </main>
  );
}
