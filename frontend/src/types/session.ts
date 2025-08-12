export interface Session {
  id: number;
  start_time: string;  // ISO
  end_time?: string | null;
  notes?: string;
  tournaments: number[]; // or Tournament[] once we wire population
}