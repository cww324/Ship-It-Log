"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { exportToCSV, exportToJSON, exportSessionReport } from "@/lib/export";
import type { Tournament, Site, SessionListItem, FormatTag } from "@/types";

interface TournamentWithSession extends Tournament {
  session_id?: number;
  session_start_time?: string;
}

type TabType = 'dashboard' | 'sessions';

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [tournaments, setTournaments] = useState<TournamentWithSession[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [formatTags, setFormatTags] = useState<FormatTag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<number | null>(null);

  // Auth guard
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  const loadData = useCallback(async () => {
    if (!ready) return;
    
    setLoading(true);
    try {
      const [tournamentsRes, sessionsRes, sitesRes, tagsRes] = await Promise.all([
        apiGet<{results?: TournamentWithSession[]} | TournamentWithSession[]>('/tournaments/'),
        apiGet<{results?: SessionListItem[]} | SessionListItem[]>('/sessions/'),
        apiGet<{results?: Site[]} | Site[]>('/sites/'),
        apiGet<{results?: FormatTag[]} | FormatTag[]>('/format-tags/')
      ]);
      
      const tournamentsList: TournamentWithSession[] = Array.isArray(tournamentsRes) ? tournamentsRes : tournamentsRes?.results ?? [];
      setTournaments(tournamentsList);
      const sessionsList: SessionListItem[] = Array.isArray(sessionsRes) ? sessionsRes : sessionsRes?.results ?? [];
      setSessions(sessionsList);
      const sitesList: Site[] = Array.isArray(sitesRes) ? sitesRes : sitesRes?.results ?? [];
      setSites(sitesList);
      const tagsList: FormatTag[] = Array.isArray(tagsRes) ? tagsRes : tagsRes?.results ?? [];
      setFormatTags(tagsList);
    } catch (error) {
      console.error('Failed to load data:', error);
      setTournaments([]);
      setSessions([]);
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, [ready]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const computeSessionNet = (s: SessionListItem): number => {
    if (typeof s.net === "number") return s.net;
    if (typeof s.totals?.net === "number") return s.totals.net;
    const totalPrize = Number(s.total_prize ?? 0);
    const totalBuyins = Number(s.total_buyins ?? 0);
    return totalPrize - totalBuyins;
  };

  const calculateStats = () => {
    const tournamentsArray = Array.isArray(tournaments) ? tournaments : [];
    const totalBuyins = tournamentsArray.reduce((sum, t) => sum + Number(t.buy_in || 0), 0);
    const totalPrizes = tournamentsArray.reduce((sum, t) => sum + Number(t.prize_won || 0) + Number(t.bounties_won || 0), 0);
    const net = totalPrizes - totalBuyins;
    const roi = totalBuyins > 0 ? ((net / totalBuyins) * 100) : 0;
    
    // Calculate win rate (tournaments with prize > 0)
    const wins = tournamentsArray.filter(t => Number(t.prize_won || 0) > 0).length;
    const winRate = tournamentsArray.length > 0 ? (wins / tournamentsArray.length) * 100 : 0;
    
    return { 
      totalBuyins, 
      totalPrizes, 
      net, 
      roi, 
      count: tournamentsArray.length,
      wins,
      winRate,
      sessionsCount: sessions.length
    };
  };

  const stats = calculateStats();

  const calculateOnlineVsLive = () => {
    const tournamentsArray = Array.isArray(tournaments) ? tournaments : [];
    
    let onlineProfit = 0;
    let liveProfit = 0;
    let onlineCount = 0;
    let liveCount = 0;
    
    tournamentsArray.forEach(tournament => {
      const buyIn = Number(tournament.buy_in || 0);
      const prize = Number(tournament.prize_won || 0);
      const bounties = Number(tournament.bounties_won || 0);
      const net = prize + bounties - buyIn;
      
      // Find the site to determine if it's online or live
      const site = sites.find(s => s.id === tournament.site);
      if (site?.type === 'live') {
        liveProfit += net;
        liveCount++;
      } else {
        onlineProfit += net;
        onlineCount++;
      }
    });
    
    return { onlineProfit, liveProfit, onlineCount, liveCount };
  };

  const calculateSessionExtremes = () => {
    let bestSession = 0;
    let worstSession = 0;
    
    sessions.forEach(session => {
      const net = computeSessionNet(session);
      if (net > bestSession) bestSession = net;
      if (net < worstSession) worstSession = net;
    });
    
    return { bestSession, worstSession };
  };

  const onlineVsLive = calculateOnlineVsLive();
  const sessionExtremes = calculateSessionExtremes();

  const handleExport = (type: 'csv' | 'json' | 'sessions') => {
    try {
      // Convert SessionListItem[] to Session[] for export compatibility
      const sessionsForExport = sessions.map(session => ({
        ...session,
        tournaments: [] as Tournament[], // Empty array since we don't have full tournament objects in list view
        total_buyins: session.total_buyins || 0,
        total_prize: session.total_prize || 0,
        net: session.net || 0,
        start_time: session.start_time,
        end_time: session.end_time
      }));

      const exportData = {
        tournaments,
        sessions: sessionsForExport,
        summary: {
          totalTournaments: stats.count,
          totalBuyins: stats.totalBuyins,
          totalPrizes: stats.totalPrizes,
          netProfit: stats.net,
          roi: stats.roi,
          winRate: stats.winRate
        }
      };
      
      switch (type) {
        case 'csv':
          exportToCSV(exportData);
          break;
        case 'json':
          exportToJSON(exportData);
          break;
        case 'sessions':
          exportSessionReport(sessionsForExport);
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (!ready) return <div className="p-6">Loading...</div>;

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Poker Dashboard</h1>
          <p className="text-gray-600">Track your poker sessions and analyze performance</p>
        </div>
        <button
          onClick={() => router.push('/sessions/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium"
        >
          + Add Session
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'sessions', label: 'Sessions' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => router.push('/analytics')}
              className="py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm"
            >
              Analytics
            </button>
          </nav>
          
          {/* Export Dropdown */}
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleExport(e.target.value as 'csv' | 'json' | 'sessions');
                  e.target.value = ''; // Reset selection
                }
              }}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
              defaultValue=""
            >
              <option value="" disabled>Export Data</option>
              <option value="csv">Export Tournaments (CSV)</option>
              <option value="json">Export All Data (JSON)</option>
              <option value="sessions">Export Sessions (CSV)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-2xl font-bold text-green-600">+${stats.net.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Profit</div>
                  <div className="text-xs text-gray-500">{stats.roi.toFixed(1)}% ROI</div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Win Rate</div>
                  <div className="text-xs text-gray-500">{stats.wins} wins</div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-2xl font-bold">${(stats.totalPrizes / Math.max(1, stats.count)).toFixed(0)}</div>
                  <div className="text-sm text-gray-600">Avg Cash-out</div>
                  <div className="text-xs text-gray-500">per tournament</div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-2xl font-bold">{stats.sessionsCount}</div>
                  <div className="text-sm text-gray-600">Sessions</div>
                  <div className="text-xs text-gray-500">{stats.count} tournaments</div>
                </div>
              </div>

              {/* Performance Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-3">Online vs Live</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Online ({onlineVsLive.onlineCount} tournaments)</span>
                      <span className={`font-medium ${onlineVsLive.onlineProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {onlineVsLive.onlineProfit >= 0 ? '+' : ''}${onlineVsLive.onlineProfit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Live ({onlineVsLive.liveCount} tournaments)</span>
                      <span className={`font-medium ${onlineVsLive.liveProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {onlineVsLive.liveProfit >= 0 ? '+' : ''}${onlineVsLive.liveProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-3">Session Extremes</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Best Win</span>
                      <span className="text-green-600 font-medium">+${sessionExtremes.bestSession.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Worst Loss</span>
                      <span className="text-red-600 font-medium">${sessionExtremes.worstSession.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Sessions */}
              <div className="bg-white rounded-lg border">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-lg font-semibold">Recent Sessions</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Game</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Buy-in</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cash-out</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sessions.slice(0, 5).map((session) => {
                        const net = computeSessionNet(session);
                        const sessionTournaments = Array.isArray(session.tournaments) ? session.tournaments : [];
                        const tournamentCount = sessionTournaments.length;
                        const gameDisplay = tournamentCount > 0 ? `${tournamentCount} Tournaments` : 'No Tournaments';
                        
                        return (
                          <tr key={session.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {session.start_time ? new Date(session.start_time).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                Online
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{gameDisplay}</td>
                            <td className="px-4 py-3 text-sm text-right">${Number(session.total_buyins || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right">${Number(session.total_prize || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={`font-medium ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {net >= 0 ? '+' : ''}${net.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {session.start_time && session.end_time
                                ? `${Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / (1000 * 60 * 60))}h`
                                : 'N/A'
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Search sessions..."
                  className="flex-1 border rounded-lg px-3 py-2"
                />
                <select className="border rounded-lg px-3 py-2">
                  <option>All Types</option>
                  <option>Online</option>
                  <option>Live</option>
                </select>
                <select className="border rounded-lg px-3 py-2">
                  <option>All Games</option>
                  <option>NLHE</option>
                  <option>PLO</option>
                </select>
              </div>

              {/* Sessions Table */}
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Game</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Buy-in</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cash-out</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Duration</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sessions.map((session) => {
                        const net = computeSessionNet(session);
                        const sessionTournaments = Array.isArray(session.tournaments) ? session.tournaments : [];
                        const tournamentCount = sessionTournaments.length;
                        
                        // For now, show tournament count and basic info since tournaments might be IDs
                        const gameDisplay = tournamentCount > 0 ? `${tournamentCount} Tournaments` : 'No Tournaments';
                        const siteDisplay = 'Various Sites'; // Will be properly calculated once we get full tournament objects
                        const sessionType = 'Online' as const; // Default for now
                        
                        return (
                          <tr key={session.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {session.start_time ? new Date(session.start_time).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {sessionType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{gameDisplay}</td>
                            <td className="px-4 py-3 text-sm">{siteDisplay}</td>
                            <td className="px-4 py-3 text-sm text-right">${Number(session.total_buyins || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right">${Number(session.total_prize || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={`font-medium ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {net >= 0 ? '+' : ''}${net.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {session.start_time && session.end_time
                                ? `${Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / (1000 * 60 * 60))}h`
                                : 'N/A'
                              }
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => router.push(`/sessions/${session.id}`)}
                                className="text-blue-600 hover:text-blue-900 text-sm"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </>
      )}
    </main>
  );
}