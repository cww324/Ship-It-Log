"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost, apiDelete, apiPut, tournamentRebuy, tournamentAddBounty, tournamentBust, tournamentFinish, sessionQuickTournament } from "@/lib/api";
import type { Session, FormatTag, Site, Tournament } from "@/types";
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
  format_tags: number[];
  type: "MTT" | "SAT";
  game: "NLHE" | "PLO" | "PLO5" | "PLO8" | "MIXED";
  speed: "regular" | "turbo" | "hyper" | "deepstack";
  table_size: "full" | "8max" | "6max" | "hu";
  target_name: string;
  seat_value: string;
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
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);

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

  const siteMap = useMemo(() => {
    const m = new Map<number, string>();
    sites.forEach(s => m.set(s.id, s.name));
    return m;
  }, [sites]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [sess, tagRes, sitesRes] = await Promise.all([
        apiGet<Session>(`/sessions/${id}/`),
        apiGet<{results?: FormatTag[]} | FormatTag[]>("/format-tags/"),
        apiGet<{results?: Site[]} | Site[]>("/sites/")
      ]);
      setSession(sess);
      setAllTags(Array.isArray(tagRes) ? tagRes : tagRes.results ?? []);
      setSites(Array.isArray(sitesRes) ? sitesRes : sitesRes.results ?? []);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to load session.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

  // Calculate session duration
  const sessionDuration = useMemo(() => {
    if (!session?.start_time) return "N/A";
    const start = new Date(session.start_time);
    const end = session.end_time ? new Date(session.end_time) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }, [session]);

  // Calculate active and completed tournaments
  const tournamentStats = useMemo(() => {
    if (!session) return { active: 0, completed: 0 };
    const active = session.tournaments.filter(t => !t.end_time).length;
    const completed = session.tournaments.filter(t => t.end_time).length;
    return { active, completed };
  }, [session]);

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
          type: form.type,
          game: form.game,
          speed: form.speed,
          table_size: form.table_size,
          target_name: form.type === "SAT" ? form.target_name : "",
          seat_value: form.type === "SAT" && form.seat_value ? form.seat_value : null,
        }],
      });

      // reset form
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
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to create & attach tournament.");
    } finally {
      setSaving(false);
    }
  }

  // Quick action handlers
  async function handleRebuy(tournamentId: number) {
    setError(null);
    try {
      await tournamentRebuy(tournamentId);
      await load();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to add rebuy.");
    }
  }

  async function handleAddBounty(tournamentId: number) {
    const bountyStr = prompt("Enter bounty amount won (e.g., 87.50):");
    if (bountyStr === null) return;
    
    const bounty = parseFloat(bountyStr);
    if (isNaN(bounty) || bounty <= 0) {
      setError("Invalid bounty amount");
      return;
    }

    setError(null);
    try {
      await tournamentAddBounty(tournamentId, bounty);
      await load();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to add bounty.");
    }
  }

  async function handleBust(tournamentId: number) {
    if (!confirm("Mark this tournament as busted? This will set prize to $0.")) return;
    setError(null);
    try {
      await tournamentBust(tournamentId);
      await load();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to bust tournament.");
    }
  }

  async function handleFinish(tournamentId: number) {
    const prizeStr = prompt("Enter prize amount won:");
    if (prizeStr === null) return;
    
    const prize = parseFloat(prizeStr);
    if (isNaN(prize) || prize < 0) {
      setError("Invalid prize amount");
      return;
    }

    setError(null);
    try {
      await tournamentFinish(tournamentId, prize);
      await load();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to finish tournament.");
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

    const siteId = sites.length > 0 ? sites[0].id : 1;

    setError(null);
    try {
      await sessionQuickTournament(Number(id), {
        name: name.trim(),
        site: siteId,
        buy_in: buyin,
      });
      await load();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to add tournament.");
    }
  }

  function startEditTournament(tournament: Tournament) {
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

      // Debug logging
      console.log('🔍 Tournament Edit Debug:', {
        tournamentId: editingTournament,
        updateData,
        apiUrl: `/tournaments/${editingTournament}/`
      });

      await apiPut(`/tournaments/${editingTournament}/`, updateData);
      await load();
      cancelEdit();
    } catch (e: unknown) {
      const error = e as Error;
      console.error('🚨 Tournament Edit Error:', {
        error: error.message,
        tournamentId: editingTournament,
        updateData: {
          name: editForm.name.trim(),
          buy_in: parseFloat(editForm.buy_in),
          prize_won: parseFloat(editForm.prize_won),
          bounties_won: parseFloat(editForm.bounties_won),
          entries_used: editForm.entries_used,
          rebuys: editForm.rebuys,
          notes: editForm.notes,
        }
      });
      setError(error?.message || 'Failed to update tournament');
    }
  }

  async function deleteTournament(tournamentId: number) {
    if (!confirm("Are you sure you want to delete this tournament?")) return;
    setError(null);
    try {
      await apiDelete(`/tournaments/${tournamentId}/`);
      await load();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to delete tournament.");
    }
  }

  async function deleteSession() {
    if (!session) return;
    if (!confirm("Delete this session? This cannot be undone.")) return;
    setError(null);
    try {
      await apiDelete(`/sessions/${session.id}/`);
      router.push("/dashboard");
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to delete session.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Session Not Found</h1>
          <p className="text-gray-300 mb-6">The session you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              <span>←</span>
              Back to Dashboard
            </button>
            <button
              onClick={deleteSession}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              <span>🗑️</span>
              Delete Session
            </button>
          </div>

          {/* Session Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="mb-4 lg:mb-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">Session #{session.id}</h1>
                {tournamentStats.active > 0 && (
                  <div className="flex items-center gap-2 bg-emerald-900 text-emerald-300 px-3 py-1 rounded-full text-sm font-medium border border-emerald-700">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    LIVE SESSION
                  </div>
                )}
              </div>
              <p className="text-gray-300 flex items-center gap-2">
                <span>📅</span>
                {new Date(session.start_time).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Buy-ins"
              value={`$${session.total_buyins.toLocaleString()}`}
              icon="💰"
              color="blue"
            />
            <StatCard
              label="Total Prizes"
              value={`$${session.total_prize.toLocaleString()}`}
              icon="🏆"
              color="purple"
            />
            <StatCard
              label="Net Profit"
              value={`${session.net >= 0 ? '+' : ''}$${session.net.toLocaleString()}`}
              icon={session.net >= 0 ? "📈" : "📉"}
              color={session.net >= 0 ? "emerald" : "red"}
            />
            <StatCard
              label="Duration"
              value={sessionDuration}
              icon="⏱️"
              color="gray"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tournaments Section */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-600">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    🏆 Tournaments
                  </h2>
                  <div className="text-sm text-gray-300">
                    {tournamentStats.active} Active • {tournamentStats.completed} Completed
                  </div>
                </div>
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-6 bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                {session.tournaments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎯</div>
                    <h3 className="text-lg font-medium text-white mb-2">No tournaments yet</h3>
                    <p className="text-gray-300 mb-6">Start tracking your poker session by adding your first tournament.</p>
                    <button
                      onClick={handleQuickAdd}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Add Your First Tournament
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {session.tournaments.map((tournament) => (
                      <TournamentCard
                        key={tournament.id}
                        tournament={tournament}
                        isEditing={editingTournament === tournament.id}
                        editForm={editForm}
                        setEditForm={setEditForm}
                        tagMap={tagMap}
                        siteMap={siteMap}
                        onEdit={startEditTournament}
                        onSave={saveEditTournament}
                        onCancel={cancelEdit}
                        onDelete={deleteTournament}
                        onRebuy={handleRebuy}
                        onAddBounty={handleAddBounty}
                        onBust={handleBust}
                        onFinish={handleFinish}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Add Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 overflow-hidden sticky top-6">
              <div className="px-6 py-4 border-b border-gray-600">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  ⚡ Quick Add Tournament
                </h3>
              </div>

              <div className="p-6">
                {!showAdvancedForm ? (
                  <QuickAddForm
                    form={form}
                    setForm={setForm}
                    onSubmit={addTournament}
                    onAdvanced={() => setShowAdvancedForm(true)}
                    onQuickAdd={handleQuickAdd}
                    saving={saving}
                  />
                ) : (
                  <AdvancedAddForm
                    form={form}
                    setForm={setForm}
                    onSubmit={addTournament}
                    onSimple={() => setShowAdvancedForm(false)}
                    saving={saving}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for stat cards
function StatCard({ label, value, icon, color }: {
  label: string;
  value: string;
  icon: string;
  color: 'blue' | 'purple' | 'emerald' | 'red' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-900 border-blue-700 text-blue-300',
    purple: 'bg-purple-900 border-purple-700 text-purple-300',
    emerald: 'bg-emerald-900 border-emerald-700 text-emerald-300',
    red: 'bg-red-900 border-red-700 text-red-300',
    gray: 'bg-gray-700 border-gray-600 text-gray-300',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium text-gray-300">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

// Component for tournament cards
function TournamentCard({ tournament, isEditing, editForm, setEditForm, tagMap, siteMap, onEdit, onSave, onCancel, onDelete, onRebuy, onAddBounty, onBust, onFinish }: {
  tournament: Tournament;
  isEditing: boolean;
  editForm: EditTournamentForm;
  setEditForm: (form: EditTournamentForm) => void;
  tagMap: Map<number, string>;
  siteMap: Map<number, string>;
  onEdit: (tournament: Tournament) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: number) => void;
  onRebuy: (id: number) => void;
  onAddBounty: (id: number) => void;
  onBust: (id: number) => void;
  onFinish: (id: number) => void;
}) {
  const isActive = !tournament.end_time;
  const net = Number(tournament.prize_won || 0) + Number(tournament.bounties_won || 0) - Number(tournament.buy_in || 0);

  if (isEditing) {
    return (
      <div className="bg-gradient-to-br from-blue-800 to-blue-900 border-2 border-blue-600 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-white">Edit Tournament</h4>
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Name</label>
            <input
              type="text"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={editForm.name}
              onChange={(e) => setEditForm({...editForm, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Buy-in</label>
            <input
              type="number"
              step="0.01"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={editForm.buy_in}
              onChange={(e) => setEditForm({...editForm, buy_in: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Prize Won</label>
            <input
              type="number"
              step="0.01"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={editForm.prize_won}
              onChange={(e) => setEditForm({...editForm, prize_won: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Bounties Won</label>
            <input
              type="number"
              step="0.01"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={editForm.bounties_won}
              onChange={(e) => setEditForm({...editForm, bounties_won: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Entries</label>
            <input
              type="number"
              min="1"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={editForm.entries_used}
              onChange={(e) => setEditForm({...editForm, entries_used: parseInt(e.target.value) || 1})}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Rebuys</label>
            <input
              type="number"
              min="0"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={editForm.rebuys}
              onChange={(e) => setEditForm({...editForm, rebuys: parseInt(e.target.value) || 0})}
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-300 mb-1">Notes</label>
          <textarea
            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={2}
            value={editForm.notes}
            onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`border-2 rounded-lg p-6 transition-all hover:shadow-lg ${
      isActive
        ? 'border-emerald-600 bg-gradient-to-br from-emerald-800 to-emerald-900'
        : 'border-gray-600 bg-gradient-to-br from-gray-700 to-gray-800 hover:border-gray-500'
    }`}>
      {/* Tournament Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-gray-500'}`}></div>
            <h3 className="font-bold text-white text-lg">{tournament.name}</h3>
            {isActive && (
              <span className="bg-emerald-700 text-emerald-300 px-2 py-1 rounded-full text-xs font-medium border border-emerald-600">
                ACTIVE
              </span>
            )}
          </div>
          <div className="text-sm text-gray-300 mb-2">
            {siteMap.get(tournament.site) || `Site #${tournament.site}`} • {tournament.game || 'NLHE'} • {tournament.speed || 'Regular'} • {tournament.table_size || '8-max'}
          </div>
          <div className="text-sm text-gray-300">
            Buy-in: <span className="font-medium text-white">${tournament.buy_in}</span> •
            Prize: <span className="font-medium text-white">${tournament.prize_won}</span>
            {tournament.bounties_won > 0 && (
              <> • Bounties: <span className="font-medium text-emerald-400">${tournament.bounties_won}</span></>
            )}
            {tournament.rebuys > 0 && (
              <> • Rebuys: <span className="font-medium text-white">{tournament.rebuys}</span></>
            )}
          </div>
          <div className="text-sm">
            Net: <span className={`font-bold ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {net >= 0 ? '+' : ''}${net.toLocaleString()}
            </span>
          </div>
        </div>
        
        <div className="text-xs text-gray-400">
          {new Date(tournament.start_time).toLocaleString()}
        </div>
      </div>

      {/* Format Tags */}
      {tournament.format_tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tournament.format_tags.map((tagId: number) => (
            <span key={tagId} className="inline-block bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs font-medium border border-gray-500">
              {tagMap.get(tagId) ?? `#${tagId}`}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {isActive ? (
          <>
            <button
              onClick={() => onRebuy(tournament.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              +Rebuy
            </button>
            <button
              onClick={() => onAddBounty(tournament.id)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              +Bounty
            </button>
            <button
              onClick={() => onBust(tournament.id)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              Bust
            </button>
            <button
              onClick={() => onFinish(tournament.id)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              Finish
            </button>
            <button
              onClick={() => onEdit(tournament)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              Edit
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onEdit(tournament)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(tournament.id)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              Delete
            </button>
          </>
        )}
      </div>

      {tournament.end_time && (
        <div className="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-400">
          Finished: {new Date(tournament.end_time).toLocaleString()}
        </div>
      )}
    </div>
  );
}

// Quick Add Form Component
function QuickAddForm({ form, setForm, onSubmit, onAdvanced, onQuickAdd, saving }: {
  form: NewTournamentForm;
  setForm: (form: NewTournamentForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onAdvanced: () => void;
  onQuickAdd: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Tournament Name</label>
        <input
          type="text"
          className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="$33 Monster Stack"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3">
          <label className="block text-sm font-medium text-gray-300 mb-2">Site</label>
          <SiteSelect
            value={form.site}
            onChange={(siteId) => setForm({ ...form, site: siteId })}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Buy-in</label>
          <input
            type="number"
            step="0.01"
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="33.00"
            value={form.buy_in}
            onChange={(e) => setForm({ ...form, buy_in: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={onSubmit}
          disabled={saving || !form.name || !form.site}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {saving ? "Adding..." : "Add New MTT"}
        </button>
        
        <button
          type="button"
          onClick={onQuickAdd}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-2 px-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Quick Add
        </button>
        
        <button
          type="button"
          onClick={onAdvanced}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
        >
          Advanced Form
        </button>
      </div>
    </div>
  );
}

// Advanced Add Form Component
function AdvancedAddForm({ form, setForm, onSubmit, onSimple, saving }: {
  form: NewTournamentForm;
  setForm: (form: NewTournamentForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSimple: () => void;
  saving: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Tournament Name</label>
        <input
          type="text"
          className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="$33 Monster Stack"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Site</label>
        <SiteSelect value={form.site} onChange={(siteId) => setForm({ ...form, site: siteId })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
          <select
            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as NewTournamentForm["type"] })}
          >
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Game</label>
          <select
            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={form.game}
            onChange={(e) => setForm({ ...form, game: e.target.value as NewTournamentForm["game"] })}
          >
            {GAME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Speed</label>
          <select
            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={form.speed}
            onChange={(e) => setForm({ ...form, speed: e.target.value as NewTournamentForm["speed"] })}
          >
            {SPEED_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Table Size</label>
          <select
            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={form.table_size}
            onChange={(e) => setForm({ ...form, table_size: e.target.value as NewTournamentForm["table_size"] })}
          >
            {TABLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Buy-in</label>
          <input
            type="number"
            step="0.01"
            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={form.buy_in}
            onChange={(e) => setForm({ ...form, buy_in: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Prize Won</label>
          <input
            type="number"
            step="0.01"
            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={form.prize_won}
            onChange={(e) => setForm({ ...form, prize_won: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Format Tags</label>
        <TagMultiSelect
          value={form.format_tags}
          onChange={(ids) => setForm({ ...form, format_tags: ids })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
        <textarea
          className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <button
          type="submit"
          disabled={saving || !form.name || !form.site}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:bg-gray-600 text-white py-2 px-4 rounded font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {saving ? "Creating..." : "Create Tournament"}
        </button>
        <button
          type="button"
          onClick={onSimple}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded font-medium transition-colors"
        >
          Simple Form
        </button>
      </div>
    </form>
  );
}
