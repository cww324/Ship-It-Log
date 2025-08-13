"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost, apiDelete, apiPut, tournamentRebuy, tournamentAddBounty, tournamentBust, tournamentFinish, sessionQuickTournament } from "@/lib/api";
import type { Session, FormatTag } from "@/types";
import SiteSelect from "@/components/SiteSelect";
import TagMultiSelect from "@/components/TagMultiSelect";

type EditTournamentForm = {
  name: string;
  buy_in: string;
  prize_won: string;
  bounties_won: string;
  entries_used: number;
  rebuys: number;
  notes: string;
};

type NewTournamentForm = {
  name: string;
  site: number | null;
  buy_in: string;
  prize_won: string;
  entries_used: number;
  rebuys: number;
  addons: number;
  start_time: string;
  notes: string;
  format_tags: number[];           // already there from tags
  // NEW single-choice fields:
  type: "MTT" | "SAT";
  game: "NLHE" | "PLO" | "PLO5" | "PLO8" | "MIXED";
  speed: "regular" | "turbo" | "hyper" | "deepstack";
  table_size: "full" | "8max" | "6max" | "hu";
  // Satellite-only (optional)
  target_name: string;
  seat_value: string;              // send as string; backend decimal is fine
};

const TYPE_OPTIONS = [
  { value: "MTT", label: "MTT" },
  { value: "SAT", label: "Satellite" },
] as const;

const GAME_OPTIONS = [
  { value: "NLHE", label: "NLHE" },
  { value: "PLO", label: "PLO" },
  { value: "PLO5", label: "PLO5" },
  { value: "PLO8", label: "PLO8" },
  { value: "MIXED", label: "Mixed" },
] as const;

const SPEED_OPTIONS = [
  { value: "regular", label: "Regular" },
  { value: "turbo", label: "Turbo" },
  { value: "hyper", label: "Hyper" },
  { value: "deepstack", label: "Deepstack" },
] as const;

const TABLE_OPTIONS = [
  { value: "8max", label: "8-max" },
  { value: "6max", label: "6-max" },
  { value: "full", label: "Full Ring" },
  { value: "hu", label: "Heads-up" },
] as const;


export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // for rendering tag labels under tournaments
  const [allTags, setAllTags] = useState<FormatTag[]>([]);

  // Edit tournament state
  const [editingTournament, setEditingTournament] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditTournamentForm>({
    name: '',
    buy_in: '',
    prize_won: '',
    bounties_won: '',
    entries_used: 1,
    rebuys: 0,
    notes: '',
  });

const [form, setForm] = useState<NewTournamentForm>({
  name: "",
  site: null,
  buy_in: "33.00",
  prize_won: "0.00",
  entries_used: 1,
  rebuys: 0,
  addons: 0,
  start_time: "",
  notes: "",
  format_tags: [],
  // defaults if user picks nothing:
  type: "MTT",
  game: "NLHE",
  speed: "regular",
  table_size: "8max",
  target_name: "",
  seat_value: "",
});

  const tagMap = useMemo(() => {
    const m = new Map<number, string>();
    allTags.forEach(t => m.set(t.id, t.label));
    return m;
  }, [allTags]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [sess, tagRes] = await Promise.all([
        apiGet<Session>(`/sessions/${id}/`),
        apiGet<any>("/format-tags/")
      ]);
      setSession(sess);
      setAllTags(tagRes.results ?? tagRes);
    } catch (e: any) {
      setError(e.message ?? "Failed to load session.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

async function addTournament(e: React.FormEvent) {
  e.preventDefault();
  setError(null);
  if (!form.site) {
    setError("Please select or add a site first.");
    return;
  }
  setSaving(true);
  try {
    await apiPost(`/sessions/${id}/create_and_attach/`, {
      tournaments: [{
        name: form.name.trim(),
        site: Number(form.site),
        buy_in: form.buy_in,
        prize_won: form.prize_won,
        entries_used: Number(form.entries_used),
        rebuys: Number(form.rebuys),
        addons: Number(form.addons),
        start_time: form.start_time || new Date().toISOString(),
        end_time: null,
        notes: form.notes ?? "",
        format_tags: form.format_tags,

        // NEW single-choice fields:
        type: form.type,
        game: form.game,
        speed: form.speed,
        table_size: form.table_size,

        // Satellite-only fields:
        target_name: form.type === "SAT" ? form.target_name : "",
        seat_value: form.type === "SAT" && form.seat_value ? form.seat_value : null,
      }],
    });

    // reset a few fields, keep defaults
    setForm(f => ({
      ...f,
      name: "",
      prize_won: "0.00",
      rebuys: 0,
      addons: 0,
      notes: "",
      format_tags: [],
      target_name: "",
      seat_value: "",
    }));

    await load();
  } catch (e: any) {
    setError(e.message ?? "Failed to create & attach tournament.");
  } finally {
    setSaving(false);
  }
}

  // Quick action handlers
  async function handleRebuy(tournamentId: number) {
    setError(null);
    try {
      await tournamentRebuy(tournamentId);
      await load(); // Refresh session data
    } catch (e: any) {
      setError(e.message ?? "Failed to add rebuy.");
    }
  }

  async function handleAddBounty(tournamentId: number) {
    const bountyStr = prompt("Enter bounty amount won (e.g., 87.50):");
    if (bountyStr === null) return; // User cancelled
    
    const bounty = parseFloat(bountyStr);
    if (isNaN(bounty) || bounty <= 0) {
      setError("Invalid bounty amount");
      return;
    }

    setError(null);
    try {
      await tournamentAddBounty(tournamentId, bounty);
      await load(); // Refresh session data
    } catch (e: any) {
      setError(e.message ?? "Failed to add bounty.");
    }
  }

  async function handleBust(tournamentId: number) {
    if (!confirm("Mark this tournament as busted? This will set prize to $0.")) return;
    setError(null);
    try {
      await tournamentBust(tournamentId);
      await load(); // Refresh session data
    } catch (e: any) {
      setError(e.message ?? "Failed to bust tournament.");
    }
  }

  async function handleFinish(tournamentId: number) {
    const prizeStr = prompt("Enter prize amount won:");
    if (prizeStr === null) return; // User cancelled
    
    const prize = parseFloat(prizeStr);
    if (isNaN(prize) || prize < 0) {
      setError("Invalid prize amount");
      return;
    }

    setError(null);
    try {
      await tournamentFinish(tournamentId, prize);
      await load(); // Refresh session data
    } catch (e: any) {
      setError(e.message ?? "Failed to finish tournament.");
    }
  }

  async function handleQuickAdd() {
    const name = prompt("Tournament name (e.g., '$33 Monster Stack'):");
    if (!name) return;

    const buyinStr = prompt("Buy-in amount:");
    if (!buyinStr) return;

    const buyin = parseFloat(buyinStr);
    if (isNaN(buyin) || buyin < 0) {
      setError("Invalid buy-in amount");
      return;
    }

    // For now, use first available site or prompt user to select
    // In a real implementation, you'd want a site selector
    const siteId = 1; // This should be dynamic

    setError(null);
    try {
      await sessionQuickTournament(Number(id), {
        name: name.trim(),
        site: siteId,
        buy_in: buyin,
      });
      await load(); // Refresh session data
    } catch (e: any) {
      setError(e.message ?? "Failed to add tournament.");
    }
  }

  function startEditTournament(tournament: any) {
    setEditingTournament(tournament.id);
    setEditForm({
      name: tournament.name,
      buy_in: tournament.buy_in.toString(),
      prize_won: tournament.prize_won.toString(),
      bounties_won: tournament.bounties_won.toString(),
      entries_used: tournament.entries_used,
      rebuys: tournament.rebuys,
      notes: tournament.notes || '',
    });
  }

  function cancelEdit() {
    setEditingTournament(null);
    setEditForm({
      name: '',
      buy_in: '',
      prize_won: '',
      bounties_won: '',
      entries_used: 1,
      rebuys: 0,
      notes: '',
    });
  }

  async function saveEditTournament() {
    if (!editingTournament) return;
    
    setError(null);
    try {
      const updateData = {
        name: editForm.name.trim(),
        buy_in: parseFloat(editForm.buy_in),
        prize_won: parseFloat(editForm.prize_won),
        bounties_won: parseFloat(editForm.bounties_won),
        entries_used: editForm.entries_used,
        rebuys: editForm.rebuys,
        notes: editForm.notes,
      };

      await apiPut(`/tournaments/${editingTournament}/`, updateData);
      await load(); // Refresh session data
      cancelEdit();
    } catch (e: unknown) {
      const error = e as Error;
      setError(error?.message || 'Failed to update tournament');
    }
  }

  async function deleteTournament(tournamentId: number) {
    setError(null);
    try {
      await apiDelete(`/tournaments/${tournamentId}/`);
      await load();
    } catch (e: any) {
      setError(e.message ?? "Failed to delete tournament.");
    }
  }

  async function deleteSession() {
    if (!session) return;
    if (!confirm("Delete this session? This cannot be undone.")) return;
    setError(null);
    try {
      await apiDelete(`/sessions/${session.id}/`);
      router.push("/sessions");
    } catch (e: any) {
      setError(e.message ?? "Failed to delete session.");
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!session) {
    return (
      <div className="p-6">
        <a href="/sessions" className="text-blue-600 underline">&larr; Back</a>
        <div className="mt-4 text-red-600">Session not found.</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <a href="/sessions" className="text-blue-600 underline">&larr; Back</a>
        <button onClick={deleteSession} className="text-red-600 underline">Delete Session</button>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Session #{session.id}</h1>
        <div className="text-sm text-gray-600">
          {new Date(session.start_time).toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
        <Stat label="Total Buyins" value={session.total_buyins} />
        <Stat label="Total Prize" value={session.total_prize} />
        <Stat
          label="Net"
          value={session.net}
          accent={session.net > 0 ? "text-green-600" : session.net < 0 ? "text-red-600" : ""}
        />
      </div>

      <section>
        <h2 className="text-xl font-medium mb-3">Tournaments</h2>
        {session.tournaments.length === 0 ? (
          <div className="text-gray-600">No tournaments yet.</div>
        ) : (
          <ul className="space-y-3">
            {session.tournaments.map((t) => {
              const isActive = !t.end_time;
              const isEditing = editingTournament === t.id;
              
              return (
                <li key={t.id} className={`border rounded p-4 ${isActive ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                  {isEditing ? (
                    // Edit mode
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Edit Tournament</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={saveEditTournament}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="bg-gray-500 text-white px-3 py-1 rounded text-xs hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Name</label>
                          <input
                            type="text"
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={editForm.name}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Buy-in</label>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={editForm.buy_in}
                            onChange={(e) => setEditForm({...editForm, buy_in: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Prize Won</label>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={editForm.prize_won}
                            onChange={(e) => setEditForm({...editForm, prize_won: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Bounties Won</label>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={editForm.bounties_won}
                            onChange={(e) => setEditForm({...editForm, bounties_won: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Entries</label>
                          <input
                            type="number"
                            min="1"
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={editForm.entries_used}
                            onChange={(e) => setEditForm({...editForm, entries_used: parseInt(e.target.value) || 1})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Rebuys</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={editForm.rebuys}
                            onChange={(e) => setEditForm({...editForm, rebuys: parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Notes</label>
                        <textarea
                          className="w-full border rounded px-2 py-1 text-sm"
                          rows={2}
                          value={editForm.notes}
                          onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                        />
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{t.name}</div>
                          {isActive && (
                            <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-gray-600">
                            {new Date(t.start_time).toLocaleString()}
                          </div>
                          {isActive ? (
                            <div className="flex gap-2">
                              <button
                                className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                                onClick={() => handleRebuy(t.id)}
                              >
                                +Rebuy
                              </button>
                              <button
                                className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700"
                                onClick={() => handleAddBounty(t.id)}
                              >
                                +Bounty
                              </button>
                              <button
                                className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                                onClick={() => handleBust(t.id)}
                              >
                                Bust
                              </button>
                              <button
                                className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                                onClick={() => handleFinish(t.id)}
                              >
                                Finish
                              </button>
                            </div>
                          ) : (
                            <button
                              className="text-red-600 text-sm underline"
                              onClick={() => deleteTournament(t.id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-gray-600">Site #{t.site}</div>
                      <div className="text-sm">
                        Buy-in: {t.buy_in} • Entries: {t.entries_used} • Rebuys: {t.rebuys}
                        {t.bounties_won > 0 && ` • Bounties: $${t.bounties_won}`}
                      </div>
                      <div className="text-sm">
                        Prize: {t.prize_won}
                        {t.bounties_won > 0 && (
                          <span className="ml-2 text-green-600 font-medium">
                            (+ ${t.bounties_won} bounties)
                          </span>
                        )}
                        {t.end_time && (
                          <span className="ml-2 text-gray-500">
                            (Finished: {new Date(t.end_time).toLocaleString()})
                          </span>
                        )}
                      </div>

                      {/* Tag chips */}
                      {t.format_tags?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {t.format_tags.map((id) => (
                            <span key={id} className="inline-block bg-gray-100 px-2 py-1 rounded text-xs">
                              {tagMap.get(id) ?? `#${id}`}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {/* Edit button for active tournaments */}
                      {isActive && (
                        <div className="mt-3 pt-2 border-t border-gray-200">
                          <button
                            onClick={() => startEditTournament(t)}
                            className="text-blue-600 text-xs underline hover:text-blue-800"
                          >
                            Edit Tournament
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="border rounded p-4 max-w-3xl">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-medium">Add Tournament</div>
          <button
            onClick={handleQuickAdd}
            className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
          >
            Quick Add
          </button>
        </div>
        {error && <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
        <form onSubmit={addTournament} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name">
            <input className="border px-2 py-2 rounded w-full" placeholder="$33 Monster Stack"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Start Time (ISO)">
            <input className="border px-2 py-2 rounded w-full" placeholder="2025-08-11T16:00:00Z"
              value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </Field>
          <Field label="Site">
            <SiteSelect value={form.site} onChange={(siteId) => setForm({ ...form, site: siteId })} />
          </Field>
{/* Type */}
<Field label="Type">
  <select
    className="border px-2 py-2 rounded w-full"
    value={form.type}
    onChange={(e) => setForm({ ...form, type: e.target.value as NewTournamentForm["type"] })}
  >
    {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
</Field>

{/* Game */}
<Field label="Game">
  <select
    className="border px-2 py-2 rounded w-full"
    value={form.game}
    onChange={(e) => setForm({ ...form, game: e.target.value as NewTournamentForm["game"] })}
  >
    {GAME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
</Field>

{/* Speed */}
<Field label="Speed">
  <select
    className="border px-2 py-2 rounded w-full"
    value={form.speed}
    onChange={(e) => setForm({ ...form, speed: e.target.value as NewTournamentForm["speed"] })}
  >
    {SPEED_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
</Field>

{/* Table size */}
<Field label="Table size">
  <select
    className="border px-2 py-2 rounded w-full"
    value={form.table_size}
    onChange={(e) => setForm({ ...form, table_size: e.target.value as NewTournamentForm["table_size"] })}
  >
    {TABLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
</Field>

{/* Satellite-only fields */}
{form.type === "SAT" && (
  <>
    <Field label="Satellite target (optional)" full>
      <input
        className="border px-2 py-2 rounded w-full"
        placeholder="$215 Mystery Bounty"
        value={form.target_name}
        onChange={(e) => setForm({ ...form, target_name: e.target.value })}
      />
    </Field>
    <Field label="Seat value (optional)" >
      <input
        className="border px-2 py-2 rounded w-full"
        placeholder="215.00"
        value={form.seat_value}
        onChange={(e) => setForm({ ...form, seat_value: e.target.value })}
      />
    </Field>
  </>
)}



          <Field label="Buy-in">
            <input className="border px-2 py-2 rounded w-full"
              value={form.buy_in} onChange={(e) => setForm({ ...form, buy_in: e.target.value })} />
          </Field>
          <Field label="Prize Won">
            <input className="border px-2 py-2 rounded w-full"
              value={form.prize_won} onChange={(e) => setForm({ ...form, prize_won: e.target.value })} />
          </Field>
          <Field label="Entries Used">
            <input type="number" className="border px-2 py-2 rounded w-full"
              value={form.entries_used} onChange={(e) => setForm({ ...form, entries_used: Number(e.target.value) || 0 })} min={1} />
          </Field>
          <Field label="Rebuys">
            <input type="number" className="border px-2 py-2 rounded w-full"
              value={form.rebuys} onChange={(e) => setForm({ ...form, rebuys: Number(e.target.value) || 0 })} min={0} />
          </Field>
          <Field label="Addons">
            <input type="number" className="border px-2 py-2 rounded w-full"
              value={form.addons} onChange={(e) => setForm({ ...form, addons: Number(e.target.value) || 0 })} min={0} />
          </Field>

          <Field label="Format Tags" full>
            <TagMultiSelect
              value={form.format_tags}
              onChange={(ids) => setForm({ ...form, format_tags: ids })}
            />
          </Field>

          <Field label="Notes" full>
            <textarea className="border px-2 py-2 rounded w-full" rows={2}
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>

          <div className="md:col-span-2">
            <button disabled={saving} className="bg-black text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-60">
              {saving ? "Saving…" : "Create & Attach"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean; }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "md:col-span-2" : ""}`}>
      <span className="text-sm text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, accent = "" }: { label: string; value: number; accent?: string; }) {
  return (
    <div className="border rounded p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`text-2xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}
