// src/types/session.ts
import type { Tournament } from "./tournament";

export interface SessionTotals {
  buyins: number;
  prizes: number;
  net: number;
}

export interface Session {
  id: number;
  // Optional in list vs detail; include if your API returns it
  user?: number;

  start_time: string;              // ISO
  end_time: string | null;
  notes?: string | null;

  // For session detail view, tournaments should always be full objects
  tournaments: Tournament[];

  // You already return these flat totals on your index.ts Session
  total_buyins: number;
  total_prize: number;
  net: number;

  // Some serializers might return nested totals instead
  totals?: SessionTotals | null;
}

// Separate interface for session list view where tournaments might be IDs
export interface SessionListItem {
  id: number;
  user?: number;
  start_time: string;
  end_time: string | null;
  notes?: string | null;
  tournaments?: number[];
  total_buyins?: number;
  total_prize?: number;
  net?: number;
  totals?: SessionTotals | null;
}

// Put the helper here as requested
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
