"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import type { Site } from "@/types";

type Props = {
  value: number | null;
  onChange: (siteId: number | null) => void;
};

const NEW_VALUE = "__new__";

export default function SiteSelect({ value, onChange }: Props) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"select" | "new">("select");

  // new site fields
  const [name, setName] = useState("");
  const [type, setType] = useState<"online" | "live">("online");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSites() {
    setLoading(true);
    const res = await apiGet<any>("/sites/");
    setSites(res.results ?? res);
    setLoading(false);
  }

  useEffect(() => { loadSites(); }, []);

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === NEW_VALUE) {
      setMode("new");
      return;
    }
    onChange(val ? Number(val) : null);
  }

  // NOTE: not a <form> submit anymore (avoid nested forms)
  async function createSite() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await apiPost<Site>("/sites/", { name: name.trim(), type, notes });
      setSites((prev) => [...prev, created]);
      onChange(created.id);        // auto-select the new site
      setMode("select");
      setName("");
      setNotes("");
      setType("online");
    } catch (e: any) {
      setError(e?.message ?? "Failed to create site.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="border rounded px-2 py-1">Loading sites…</div>;

  if (mode === "new") {
    return (
      <div className="border rounded p-3 space-y-2">
        <div className="font-medium">Add Site</div>

        {error && (
          <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-sm">Name</span>
          <input
            className="border px-2 py-1 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm">Type</span>
          <select
            className="border px-2 py-1 rounded"
            value={type}
            onChange={(e) => setType(e.target.value as "online" | "live")}
          >
            <option value="online">Online</option>
            <option value="live">Live</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm">Notes (optional)</span>
          <input
            className="border px-2 py-1 rounded"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={createSite}
            disabled={saving}
            className="bg-black text-white px-3 py-2 rounded disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Site"}
          </button>
          <button
            type="button"
            onClick={() => setMode("select")}
            className="border px-3 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <select className="border px-2 py-1 rounded" value={value ?? ""} onChange={handleSelect}>
      <option value="">Select site…</option>
      {sites.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name} ({s.type})
        </option>
      ))}
      <option value={NEW_VALUE}>+ Add site…</option>
    </select>
  );
}
