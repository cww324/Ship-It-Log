'use client';
import { useRouter } from 'next/navigation';

export default function LogoutButton({ className = '' }: { className?: string }) {
  const r = useRouter();
  return (
    <button
      onClick={() => {
        localStorage.removeItem('token');
        r.push('/login');
      }}
      className={`px-3 py-2 rounded hover:bg-gray-100 ${className}`}
      aria-label="Log out"
    >
      Log out
    </button>
  );
}
