"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import type { FormatTag } from "@/types";

type Props = {
  value: number[];                    // selected tag IDs
  onChange: (ids: number[]) => void;
};

export default function TagMultiSelect({ value, onChange }: Props) {
  const [tags, setTags] = useState<FormatTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadTags() {
    setLoading(true);
    const res = await apiGet<any>("/format-tags/");
    setTags(res.results ?? res);
    setLoading(false);
  }

  useEffect(() => { loadTags(); }, []);

  function toggle(id: number) {
    const exists = value.includes(id);
    onChange(exists ? value.filter(v => v !== id) : [...value, id]);
  }

  async function createTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setSaving(true);
    try {
      const created = await apiPost<FormatTag>("/format-tags/", { label: newLabel.trim() });
      setTags(prev => [...prev, created]);
      onChange([...value, created.id]);
      setNewLabel("");
      setShowNew(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="border rounded px-2 py-2 text-sm">Loading tags…</div>;
  }

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      <div className="flex flex-wrap gap-2">
        {value.length === 0 ? (
          <span className="text-gray-500 text-sm">No tags selected.</span>
        ) : (
          value.map(id => {
            const tag = tags.find(t => t.id === id);
            return (
              <span key={id} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-sm">
                {tag?.label ?? `#${id}`}
                <button onClick={() => toggle(id)} className="text-gray-500 hover:text-black">×</button>
              </span>
            );
          })
        )}
      </div>

      {/* All tags as checkboxes */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {tags.map(t => (
          <label key={t.id} className="flex items-center gap-2 border rounded px-2 py-1">
            <input
              type="checkbox"
              checked={value.includes(t.id)}
              onChange={() => toggle(t.id)}
            />
            <span className="text-sm">{t.label}</span>
          </label>
        ))}
        <button
          type="button"
          onClick={() => setShowNew(s => !s)}
          className="border-dashed border rounded px-2 py-1 text-sm text-blue-700"
        >
          {showNew ? "Cancel" : "+ Add tag…"}
        </button>
      </div>

      {/* New tag form */}
      {showNew && (
        <form onSubmit={createTag} className="flex gap-2">
          <input
            className="border px-2 py-2 rounded w-64"
            placeholder="e.g., NL MTT, PKO, Turbo"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            autoFocus
          />
          <button disabled={saving} className="bg-black text-white px-3 py-2 rounded">
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      )}
    </div>
  );
}
