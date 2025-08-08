export interface Tournament {
  id: number;
  name: string;
  site_id: number;
  buy_in: number;
  prize_won: number;
  entries_used: number;
  rebuys: number;
  addons: number;
  start_time: string;
  end_time?: string | null;
  notes?: string;
  format_tags: string[];
}