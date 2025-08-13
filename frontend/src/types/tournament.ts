export interface Tournament {
  id: number;
  name: string;
  site: number;  // Changed from site_id to match backend
  buy_in: number;
  prize_won: number;
  bounties_won: number;  // NEW: PKO bounties
  entries_used: number;
  rebuys: number;
  addons: number;  // Keep for legacy data
  start_time: string;
  end_time?: string | null;
  notes?: string;
  format_tags: number[];  // Changed from string[] to number[] to match backend
  // New fields from backend model
  type?: string;
  game?: string;
  speed?: string;
  table_size?: string;
  target_name?: string;
  seat_value?: number;
}