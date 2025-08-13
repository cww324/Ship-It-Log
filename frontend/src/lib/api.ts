export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Token ${t}` } : {};
}

async function handleUnauthorized(res: Response) {
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      const next = encodeURIComponent(window.location.pathname);
      localStorage.removeItem("token");
      window.location.href = `/login?next=${next}`;
    }
    throw new Error("Unauthorized");
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { ...authHeaders() }, cache: "no-store" });
  await handleUnauthorized(res);
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  await handleUnauthorized(res);
  if (!res.ok) throw new Error(`POST ${path} failed`);
  return res.json();
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  await handleUnauthorized(res);
  if (!res.ok) throw new Error(`PUT ${path} failed`);
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers: { ...authHeaders() } });
  await handleUnauthorized(res);
  if (!res.ok) throw new Error(`DELETE ${path} failed`);
}

// for login (no token header)
export async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  const data = await res.json();
  return data.token as string;
}

// for registration (no token header)
export async function register(username: string, password: string, email?: string): Promise<{token: string, user: {id: number, username: string, email: string}}> {
  const res = await fetch(`${API_BASE}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, email: email || "" }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Registration failed");
  }
  const data = await res.json();
  return data;
}

// Tournament quick action response types
interface TournamentActionResponse {
  message: string;
  tournament_id: number;
  rebuys?: number;
  addons?: number;
  prize_won?: number;
  end_time?: string;
}

interface QuickTournamentResponse {
  message: string;
  tournament: {
    id: number;
    name: string;
    site: number;
    buy_in: number;
    prize_won: number;
    entries_used: number;
    rebuys: number;
    addons: number;
    start_time: string;
    end_time?: string | null;
    format_tags: number[];
  };
}

// Tournament quick actions
export async function tournamentRebuy(tournamentId: number): Promise<TournamentActionResponse> {
  return apiPost(`/tournaments/${tournamentId}/rebuy/`, {});
}

export async function tournamentAddBounty(tournamentId: number, bountyAmount: number): Promise<TournamentActionResponse> {
  return apiPost(`/tournaments/${tournamentId}/add_bounty/`, { bounty_amount: bountyAmount });
}

export async function tournamentBust(tournamentId: number): Promise<TournamentActionResponse> {
  return apiPost(`/tournaments/${tournamentId}/bust/`, {});
}

export async function tournamentFinish(tournamentId: number, prizeWon: number): Promise<TournamentActionResponse> {
  return apiPost(`/tournaments/${tournamentId}/finish/`, { prize_won: prizeWon });
}

// Session quick actions
export async function sessionQuickTournament(sessionId: number, data: {
  name: string;
  site: number;
  buy_in: number;
  notes?: string;
  type?: string;
  game?: string;
  speed?: string;
  table_size?: string;
}): Promise<QuickTournamentResponse> {
  return apiPost(`/sessions/${sessionId}/quick_tournament/`, data);
}

export async function getActiveTournaments(sessionId: number): Promise<QuickTournamentResponse['tournament'][]> {
  return apiGet(`/sessions/${sessionId}/active_tournaments/`);
}

export async function getCompletedTournaments(sessionId: number): Promise<QuickTournamentResponse['tournament'][]> {
  return apiGet(`/sessions/${sessionId}/completed_tournaments/`);
}
