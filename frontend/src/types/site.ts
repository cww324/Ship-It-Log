// src/types/site.ts
export interface Site {
  id: number;
  name: string;
  type: "online" | "live";
  notes: string;
}
