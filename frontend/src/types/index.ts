export interface Tournament {
  id: number;
  name: string;
  site: number;
  buy_in: string;
  prize_won: string;
  entries_used: number;
  rebuys: number;
  addons: number;
  start_time: string;
  end_time: string | null;
  type: "MTT" | "SAT";
  game: "NLHE" | "PLO" | "PLO5" | "PLO8" | "MIXED";
  speed: "regular" | "turbo" | "hyper" | "deepstack";
  table_size: "full" | "8max" | "6max" | "hu";
  target_name?: string;
  seat_value?: string | null;

  format_tags: number[];
}

export interface Session {
  id: number;
  user: number;
  start_time: string;
  end_time: string | null;
  notes: string;
  tournaments: Tournament[];
  total_buyins: number;
  total_prize: number;
  net: number;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Site {
  id: number;
  name: string;
  type: "online" | "live";
  notes: string;
}
