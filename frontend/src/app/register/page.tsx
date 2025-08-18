'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Already logged in? bounce to next
    if (localStorage.getItem('token')) router.replace(next);
  }, [router, next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    
    // Validation
    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }
    
    if (!formData.password) {
      setError('Password is required');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      if (!res.ok) {
        let msg = 'Registration failed';
        try {
          const data = await res.json();
          msg = data?.error || data?.detail || JSON.stringify(data);
        } catch {
          const txt = await res.text().catch(() => '');
          if (txt) msg = txt;
        }
        throw new Error(msg);
      }

      const data = await res.json();
      if (!data?.token) throw new Error('No token returned');
      
      // Store token and redirect
      localStorage.setItem('token', data.token);
      router.replace(next);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error?.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  function handleInputChange(field: keyof typeof formData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, [field]: e.target.value }));
      if (error) setError(null); // Clear error when user starts typing
    };
  }

  return (
    <main className="max-w-sm mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Account</h1>
        <p className="text-gray-600 mt-1">Start tracking your poker sessions</p>
      </div>

      {error && (
        <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Username *
          </label>
          <input
            type="text"
            className="w-full border rounded p-2"
            value={formData.username}
            onChange={handleInputChange('username')}
            autoComplete="username"
            placeholder="Choose a username"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Email (optional)
          </label>
          <input
            type="email"
            className="w-full border rounded p-2"
            value={formData.email}
            onChange={handleInputChange('email')}
            autoComplete="email"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Password *
          </label>
          <input
            type="password"
            className="w-full border rounded p-2"
            value={formData.password}
            onChange={handleInputChange('password')}
            autoComplete="new-password"
            placeholder="At least 6 characters"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Confirm Password *
          </label>
          <input
            type="password"
            className="w-full border rounded p-2"
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            autoComplete="new-password"
            placeholder="Repeat your password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-60 w-full hover:bg-green-700"
        >
          {busy ? 'Creating Account…' : 'Create Account'}
        </button>
      </form>

      <div className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link 
          href={`/login${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="text-blue-600 hover:underline"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}