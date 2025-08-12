const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

function authHeaders() {
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
