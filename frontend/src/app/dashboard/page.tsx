"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { exportToCSV, exportToJSON, exportSessionReport } from "@/lib/export";
import type { Tournament, Site, SessionListItem, SessionAccordion, FormatTag, Session } from "@/types";
import type { FilterState } from "@/types/filters";
import { DEFAULT_FILTER_STATE, filtersToQueryParams } from "@/types/filters";
import PokerFilters from "@/components/PokerFilters";

interface TournamentWithSession extends Tournament {
  session_id?: number;
  session_start_time?: string;
}

interface SessionWithTournaments {
  id: number;
  user?: number;
  start_time: string;
  end_time: string | null;
  notes?: string | null;
  tournaments?: number[] | Tournament[]; // Can be either IDs or full objects
  tournaments_details?: Tournament[];
  expanded?: boolean;
  total_buyins?: number;
  total_prize?: number;
  net?: number;
  totals?: { net: number; buyins: number; prizes: number } | null;
  // Add accordion fields as optional for compatibility
  tournament_count?: number;
  total_winnings?: number;
  net_profit?: number;
  main_sites?: string[];
}

type TabType = 'dashboard' | 'sessions';

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [tournaments, setTournaments] = useState<TournamentWithSession[]>([]);
  const [sessions, setSessions] = useState<SessionWithTournaments[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [formatTags, setFormatTags] = useState<FormatTag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<number | null>(null);
  const [loadingTournaments, setLoadingTournaments] = useState<Set<number>>(new Set());
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionsPerPage] = useState(25);
  const [totalSessions, setTotalSessions] = useState(0);
  const [hasMoreSessions, setHasMoreSessions] = useState(true);

  // Auth guard
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  const loadData = useCallback(async (page: number = 1) => {
    if (!ready) return;
    
    setLoading(true);
    try {
      // Convert filters to query parameters
      const filterParams = filtersToQueryParams(filters);
      
      // For tournaments (stats calculation): Load ALL tournaments without pagination
      const tournamentsQueryString = new URLSearchParams({
        ...filterParams,
        no_pagination: 'true'
      }).toString();
      
      // For sessions (display): Use pagination limit
      const sessionsLimit = page === 1 ? 50 : sessionsPerPage;
      const sessionsQueryString = new URLSearchParams({
        limit: sessionsLimit.toString(),
        ...filterParams
      }).toString();
      
      // Debug logging
      console.log('🔍 Dashboard Filter Debug:', {
        filters,
        filterParams,
        tournamentsQuery: `/tournaments/?${tournamentsQueryString}`,
        sessionsQuery: `/sessions/accordion_view/?${sessionsQueryString}`
      });
      
      const [tournamentsRes, sessionsRes, sitesRes, tagsRes] = await Promise.all([
        apiGet<{results?: TournamentWithSession[]} | TournamentWithSession[]>(`/tournaments/?${tournamentsQueryString}`),
        apiGet<SessionAccordion[]>(`/sessions/accordion_view/?${sessionsQueryString}`),
        apiGet<{results?: Site[]} | Site[]>('/sites/'),
        apiGet<{results?: FormatTag[]} | FormatTag[]>('/format-tags/')
      ]);
      
      const tournamentsList: TournamentWithSession[] = Array.isArray(tournamentsRes) ? tournamentsRes : tournamentsRes?.results ?? [];
      
      // Debug logging
      console.log('🔍 Tournaments loaded:', {
        count: tournamentsList.length,
        sampleTournaments: tournamentsList.slice(0, 3),
        totalBuyins: tournamentsList.reduce((sum, t) => sum + Number(t.buy_in || 0), 0),
        totalPrizes: tournamentsList.reduce((sum, t) => sum + Number(t.prize_won || 0) + Number(t.bounties_won || 0), 0)
      });
      
      setTournaments(tournamentsList);
      
      // Use accordion view data which has proper tournament counts
      const sessionsList: SessionAccordion[] = Array.isArray(sessionsRes) ? sessionsRes : [];
      const sessionsWithExpanded: SessionWithTournaments[] = sessionsList.map(session => ({
        id: session.id,
        user: session.user,
        start_time: session.start_time,
        end_time: session.end_time,
        notes: session.notes,
        expanded: false,
        // Map accordion data to SessionWithTournaments format
        tournaments: session.tournaments || [],
        total_buyins: session.total_buyins || 0,
        total_prize: session.total_winnings || 0,
        net: session.net_profit || 0,
        tournament_count: session.tournament_count,
        total_winnings: session.total_winnings,
        net_profit: session.net_profit,
        main_sites: session.main_sites
      }));
      
      if (page === 1) {
        setSessions(sessionsWithExpanded);
      } else {
        // Merge sessions and remove duplicates by ID
        setSessions(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const newSessions = sessionsWithExpanded.filter(s => !existingIds.has(s.id));
          return [...prev, ...newSessions];
        });
      }
      
      // Check if there are more sessions
      setHasMoreSessions(sessionsList.length === sessionsLimit);
      setTotalSessions(prev => page === 1 ? sessionsList.length : prev + sessionsList.length);
      
      const sitesList: Site[] = Array.isArray(sitesRes) ? sitesRes : sitesRes?.results ?? [];
      setSites(sitesList);
      const tagsList: FormatTag[] = Array.isArray(tagsRes) ? tagsRes : tagsRes?.results ?? [];
      setFormatTags(tagsList);
    } catch (error) {
      console.error('Failed to load data:', error);
      if (page === 1) {
        setTournaments([]);
        setSessions([]);
        setSites([]);
      }
    } finally {
      setLoading(false);
    }
  }, [ready, sessionsPerPage, filters]);

  useEffect(() => {
    loadData(1);
    setCurrentPage(1);
  }, [loadData]);

  const loadMoreSessions = useCallback(async () => {
    if (!hasMoreSessions || loading) return;
    const nextPage = currentPage + 1;
    await loadData(nextPage);
    setCurrentPage(nextPage);
  }, [currentPage, hasMoreSessions, loading, loadData]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const computeSessionNet = (s: SessionWithTournaments): number => {
    // First try direct net value
    if (typeof s.net === "number") return s.net;
    if (typeof s.net_profit === "number") return s.net_profit;
    if (typeof s.totals?.net === "number") return s.totals.net;
    
    // Calculate from totals
    const totalPrize = Number(s.total_prize ?? s.total_winnings ?? 0);
    const totalBuyins = Number(s.total_buyins ?? 0);
    return totalPrize - totalBuyins;
  };

  const calculateStats = () => {
    // Use the filtered tournaments data that's already loaded based on current filters
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
    // Use the filtered tournaments data that's already loaded based on current filters
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
    let bestSessionId = null;
    let worstSessionId = null;
    
    sessions.forEach(session => {
      const net = computeSessionNet(session);
      if (net > bestSession) {
        bestSession = net;
        bestSessionId = session.id;
      }
      if (net < worstSession) {
        worstSession = net;
        worstSessionId = session.id;
      }
    });
    
    return { bestSession, worstSession, bestSessionId, worstSessionId };
  };

  const calculateTournamentExtremes = () => {
    const tournamentStats = new Map();
    
    // Use the filtered tournaments data that's already loaded based on current filters
    const tournamentsArray = Array.isArray(tournaments) ? tournaments : [];
    
    // Group tournaments by name and calculate stats
    tournamentsArray.forEach(tournament => {
      const name = tournament.name;
      if (!tournamentStats.has(name)) {
        tournamentStats.set(name, {
          name,
          entries: [],
          totalProfit: 0,
          totalBuyins: 0
        });
      }
      
      const stats = tournamentStats.get(name);
      const buyIn = Number(tournament.buy_in || 0);
      const prize = Number(tournament.prize_won || 0);
      const bounties = Number(tournament.bounties_won || 0);
      const profit = prize + bounties - buyIn;
      
      stats.entries.push({ profit, buyIn });
      stats.totalProfit += profit;
      stats.totalBuyins += buyIn;
    });
    
    // Filter tournaments with 10+ entries and calculate ROI
    const qualifiedTournaments = Array.from(tournamentStats.values())
      .filter(stats => stats.entries.length >= 10)
      .map(stats => ({
        ...stats,
        roi: stats.totalBuyins > 0 ? (stats.totalProfit / stats.totalBuyins) * 100 : 0,
        entryCount: stats.entries.length
      }));
    
    if (qualifiedTournaments.length === 0) {
      return { bestTournament: null, worstTournament: null };
    }
    
    // Find best and worst by ROI
    const bestTournament = qualifiedTournaments.reduce((best, current) =>
      current.roi > best.roi ? current : best
    );
    
    const worstTournament = qualifiedTournaments.reduce((worst, current) =>
      current.roi < worst.roi ? current : worst
    );
    
    return { bestTournament, worstTournament };
  };

  const onlineVsLive = calculateOnlineVsLive();
  const sessionExtremes = calculateSessionExtremes();
  const tournamentExtremes = calculateTournamentExtremes();

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

  // Function to toggle session expansion and load tournaments
  const toggleSessionExpansion = async (sessionId: number) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    if (session.expanded) {
      // Collapse the session
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, expanded: false } : s
      ));
    } else {
      // Expand the session and load tournaments if not already loaded
      if (!session.tournaments_details) {
        setLoadingTournaments(prev => new Set([...prev, sessionId]));
        try {
          // Fetch full session details to get tournaments
          const fullSession = await apiGet<Session>(`/sessions/${sessionId}/`);
          setSessions(prev => prev.map(s =>
            s.id === sessionId
              ? { ...s, expanded: true, tournaments_details: fullSession.tournaments || [] }
              : s
          ));
        } catch (error) {
          console.error('Failed to load session tournaments:', error);
        } finally {
          setLoadingTournaments(prev => {
            const newSet = new Set(prev);
            newSet.delete(sessionId);
            return newSet;
          });
        }
      } else {
        // Just expand if tournaments are already loaded
        setSessions(prev => prev.map(s =>
          s.id === sessionId ? { ...s, expanded: true } : s
        ));
      }
    }
  };

  // Function to delete a tournament
  const deleteTournament = async (tournamentId: number, sessionId: number) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;
    
    try {
      await apiDelete(`/tournaments/${tournamentId}/`);
      // Remove tournament from the session's tournaments_details
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? {
              ...s,
              tournaments_details: s.tournaments_details?.filter(t => t.id !== tournamentId) || []
            }
          : s
      ));
      // Reload data to update totals
      await loadData();
    } catch (error) {
      console.error('Failed to delete tournament:', error);
    }
  };

  if (!ready) return <div className="p-6">Loading...</div>;

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6 min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Poker Dashboard</h1>
          <p className="text-gray-300">Track your poker sessions and analyze performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/sessions/new')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            + Add Session
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 border border-gray-600"
          >
            <span>⚙️</span>
            Settings
          </button>
        </div>
      </div>

      {/* Filters */}
      <PokerFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        sites={sites}
        formatTags={formatTags}
        className="mb-6"
      />

      {/* Navigation Tabs */}
      <div className="border-b border-gray-600">
        <div className="flex items-center justify-between">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'sessions', label: 'Sessions' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => router.push('/analytics')}
              className="py-2 px-1 border-b-2 border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500 font-medium text-sm transition-colors"
            >
              Analytics
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="py-2 px-1 border-b-2 border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500 font-medium text-sm transition-colors flex items-center gap-1"
            >
              <span>⚙️</span>
              Settings
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
              className="border border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-800 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        <div className="p-8 text-center text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-lg border border-gray-700 shadow-lg">
                  <div className="text-2xl font-bold text-emerald-400">+${stats.net.toLocaleString()}</div>
                  <div className="text-sm text-gray-300 font-medium">Total Profit</div>
                  <div className="text-xs text-gray-400">{stats.roi.toFixed(1)}% ROI</div>
                </div>
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-lg border border-gray-700 shadow-lg">
                  <div className="text-2xl font-bold text-blue-400">{stats.winRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-300 font-medium">ITM%</div>
                  <div className="text-xs text-gray-400">{stats.wins} cashes</div>
                </div>
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-lg border border-gray-700 shadow-lg">
                  <div className="text-2xl font-bold text-purple-400">{stats.roi.toFixed(1)}%</div>
                  <div className="text-sm text-gray-300 font-medium">Total ROI</div>
                  <div className="text-xs text-gray-400">{stats.count} tournaments</div>
                </div>
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-lg border border-gray-700 shadow-lg">
                  <div className="text-2xl font-bold text-orange-400">$2,450</div>
                  <div className="text-sm text-gray-300 font-medium">Total Rake</div>
                  <div className="text-xs text-gray-400 cursor-pointer hover:text-blue-400">Click for breakdown</div>
                </div>
              </div>

              {/* Performance Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-lg border border-gray-700 shadow-lg">
                  <h3 className="text-lg font-semibold mb-3 text-white">Online vs Live</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Online ({onlineVsLive.onlineCount} tournaments)</span>
                      <span className={`font-semibold ${onlineVsLive.onlineProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {onlineVsLive.onlineProfit >= 0 ? '+' : ''}${onlineVsLive.onlineProfit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Live ({onlineVsLive.liveCount} tournaments)</span>
                      <span className={`font-semibold ${onlineVsLive.liveProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {onlineVsLive.liveProfit >= 0 ? '+' : ''}${onlineVsLive.liveProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-lg border border-gray-700 shadow-lg">
                  <h3 className="text-lg font-semibold mb-3 text-white">📈 Performance Highlights</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Best Day:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-semibold">+${sessionExtremes.bestSession.toLocaleString()}</span>
                        {sessionExtremes.bestSessionId && (
                          <button
                            onClick={() => router.push(`/sessions/${sessionExtremes.bestSessionId}`)}
                            className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500 px-2 py-1 rounded transition-colors"
                          >
                            View Session
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Worst Day:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 font-semibold">${sessionExtremes.worstSession.toLocaleString()}</span>
                        {sessionExtremes.worstSessionId && (
                          <button
                            onClick={() => router.push(`/sessions/${sessionExtremes.worstSessionId}`)}
                            className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500 px-2 py-1 rounded transition-colors"
                          >
                            View Session
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {tournamentExtremes.bestTournament && (
                      <>
                        <hr className="border-gray-600" />
                        <div className="space-y-2">
                          <div className="text-sm">
                            <div className="font-medium text-white">Best Tournament:</div>
                            <div className="text-gray-300">{tournamentExtremes.bestTournament.name} ({tournamentExtremes.bestTournament.entryCount} entries)</div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-emerald-400 font-semibold">
                                +${tournamentExtremes.bestTournament.totalProfit.toLocaleString()} • ROI: {tournamentExtremes.bestTournament.roi.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {tournamentExtremes.worstTournament && (
                      <div className="space-y-2">
                        <div className="text-sm">
                          <div className="font-medium text-white">Worst Tournament:</div>
                          <div className="text-gray-300">{tournamentExtremes.worstTournament.name} ({tournamentExtremes.worstTournament.entryCount} entries)</div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-red-400 font-semibold">
                              ${tournamentExtremes.worstTournament.totalProfit.toLocaleString()} • ROI: {tournamentExtremes.worstTournament.roi.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {!tournamentExtremes.bestTournament && (
                      <>
                        <hr className="border-gray-600" />
                        <div className="text-xs text-gray-400 text-center py-2">
                          Tournament analysis available after 10+ entries in same tournament
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Sessions with Accordion */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700 shadow-lg">
                <div className="px-4 py-3 border-b border-gray-600">
                  <h3 className="text-lg font-semibold text-white">Recent Sessions</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tournaments</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Buy-in</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Cash-out</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Profit</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-600">
                      {sessions.filter(session => {
                        // Filter out sessions with no tournaments and no meaningful data
                        const hasValidData = (session.total_buyins || 0) > 0 || (session.total_prize || 0) > 0 ||
                                           (session.tournament_count && session.tournament_count > 0);
                        return hasValidData;
                      }).slice(0, 12).map((session) => {
                        const net = computeSessionNet(session);
                        const tournamentCount = session.tournament_count || (Array.isArray(session.tournaments) ? session.tournaments.length : 0);
                        const gameDisplay = tournamentCount > 0 ? `${tournamentCount} Tournament${tournamentCount !== 1 ? 's' : ''}` : 'No Tournaments';
                        const isLoading = loadingTournaments.has(session.id);
                        
                        return (
                          <React.Fragment key={session.id}>
                            <tr
                              className="hover:bg-gray-700 cursor-pointer transition-colors"
                              onClick={() => toggleSessionExpansion(session.id)}
                            >
                              <td className="px-3 py-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className={`transform transition-transform text-gray-400 ${session.expanded ? 'rotate-90' : ''}`}>
                                    ▶
                                  </span>
                                  <span className="text-white font-medium">
                                    {session.start_time ? new Date(session.start_time).toLocaleDateString() : 'N/A'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm">
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-900 text-blue-300">
                                  Online
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-300">{gameDisplay}</td>
                              <td className="px-3 py-2 text-sm text-right font-medium text-gray-200">${Number(session.total_buyins || 0).toLocaleString()}</td>
                              <td className="px-3 py-2 text-sm text-right font-medium text-gray-200">${Number(session.total_prize || 0).toLocaleString()}</td>
                              <td className="px-3 py-2 text-sm text-right">
                                <span className={`font-semibold ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {net >= 0 ? '+' : ''}${net.toLocaleString()}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/sessions/${session.id}`);
                                  }}
                                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                            
                            {/* Expanded Tournament Details */}
                            {session.expanded && (
                              <tr>
                                <td colSpan={7} className="px-3 py-0">
                                  <div className="bg-gray-700 border-t border-gray-600 p-4">
                                    {isLoading ? (
                                      <div className="text-center text-gray-300 py-4">Loading tournaments...</div>
                                    ) : session.tournaments_details && session.tournaments_details.length > 0 ? (
                                      <div className="space-y-3">
                                        <h4 className="font-semibold text-white mb-3">Tournaments in this session:</h4>
                                        {session.tournaments_details.map((tournament) => {
                                          const tournamentNet = Number(tournament.prize_won || 0) + Number(tournament.bounties_won || 0) - Number(tournament.buy_in || 0);
                                          return (
                                            <div key={tournament.id} className="bg-gray-600 rounded-lg border border-gray-500 p-3 flex items-center justify-between shadow-sm">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                  <div className="font-semibold text-white">{tournament.name}</div>
                                                  {tournament.format_tags && tournament.format_tags.length > 0 && (
                                                    <div className="flex gap-1">
                                                      {tournament.format_tags.map((tagId) => {
                                                        const tag = formatTags.find(t => t.id === tagId);
                                                        return tag ? (
                                                          <span key={tagId} className="inline-block bg-gray-700 text-gray-200 px-2 py-1 rounded text-xs font-medium">
                                                            {tag.label}
                                                          </span>
                                                        ) : null;
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="text-sm text-gray-300 mt-1">
                                                  Buy-in: ${tournament.buy_in} • Prize: ${tournament.prize_won}
                                                  {tournament.bounties_won > 0 && ` • Bounties: $${tournament.bounties_won}`}
                                                  • Net: <span className={`font-semibold ${tournamentNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {tournamentNet >= 0 ? '+' : ''}${tournamentNet.toLocaleString()}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <button
                                                  onClick={() => router.push(`/sessions/${session.id}`)}
                                                  className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1 border border-blue-500 rounded transition-colors"
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  onClick={() => deleteTournament(tournament.id, session.id)}
                                                  className="text-red-400 hover:text-red-300 text-sm px-2 py-1 border border-red-500 rounded transition-colors"
                                                >
                                                  Delete
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-center text-gray-300 py-4">No tournaments in this session</div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {sessions.filter(session => {
                  const hasValidData = (session.total_buyins || 0) > 0 || (session.total_prize || 0) > 0 ||
                                     (session.tournament_count && session.tournament_count > 0);
                  return hasValidData;
                }).length > 12 && (
                  <div className="px-4 py-3 border-t border-gray-600 bg-gray-700">
                    <button
                      onClick={() => setActiveTab('sessions')}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                    >
                      View All Sessions →
                    </button>
                  </div>
                )}
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
                  className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <select className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option>All Types</option>
                  <option>Online</option>
                  <option>Live</option>
                </select>
                <select className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option>All Games</option>
                  <option>NLHE</option>
                  <option>PLO</option>
                </select>
              </div>

              {/* Sessions Table with Accordion */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700 overflow-hidden shadow-lg">
                <div className="max-h-[600px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Tournaments</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Location</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Buy-in</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Cash-out</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Profit</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-600">
                      {sessions.filter(session => {
                        // Filter out sessions with no tournaments and no meaningful data
                        const hasValidData = (session.total_buyins || 0) > 0 || (session.total_prize || 0) > 0 ||
                                           (session.tournament_count && session.tournament_count > 0);
                        return hasValidData;
                      }).map((session) => {
                        const net = computeSessionNet(session);
                        const tournamentCount = session.tournament_count || (Array.isArray(session.tournaments) ? session.tournaments.length : 0);
                        const isLoading = loadingTournaments.has(session.id);
                        
                        const gameDisplay = tournamentCount > 0 ? `${tournamentCount} Tournament${tournamentCount !== 1 ? 's' : ''}` : 'No Tournaments';
                        const siteDisplay = session.main_sites && session.main_sites.length > 0 ? session.main_sites.join(', ') : 'Various Sites';
                        const sessionType = 'Online' as const; // Default for now
                        
                        return (
                          <React.Fragment key={session.id}>
                            <tr
                              className="hover:bg-gray-700 cursor-pointer transition-colors"
                              onClick={() => toggleSessionExpansion(session.id)}
                            >
                              <td className="px-4 py-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className={`transform transition-transform text-gray-400 ${session.expanded ? 'rotate-90' : ''}`}>
                                    ▶
                                  </span>
                                  <span className="text-white font-medium">
                                    {session.start_time ? new Date(session.start_time).toLocaleDateString() : 'N/A'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-900 text-blue-300">
                                  {sessionType}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300">{gameDisplay}</td>
                              <td className="px-4 py-3 text-sm text-gray-300">{siteDisplay}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-200">${Number(session.total_buyins || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-200">${Number(session.total_prize || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-right">
                                <span className={`font-semibold ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {net >= 0 ? '+' : ''}${net.toLocaleString()}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/sessions/${session.id}`);
                                  }}
                                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                            
                            {/* Expanded Tournament Details */}
                            {session.expanded && (
                              <tr>
                                <td colSpan={8} className="px-4 py-0">
                                  <div className="bg-gray-700 border-t border-gray-600 p-4">
                                    {isLoading ? (
                                      <div className="text-center text-gray-300 py-4">Loading tournaments...</div>
                                    ) : session.tournaments_details && session.tournaments_details.length > 0 ? (
                                      <div className="space-y-3">
                                        <h4 className="font-semibold text-white mb-3">Tournaments in this session:</h4>
                                        {session.tournaments_details.map((tournament) => {
                                          const tournamentNet = Number(tournament.prize_won || 0) + Number(tournament.bounties_won || 0) - Number(tournament.buy_in || 0);
                                          return (
                                            <div key={tournament.id} className="bg-gray-600 rounded-lg border border-gray-500 p-3 flex items-center justify-between shadow-sm">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                  <div className="font-semibold text-white">{tournament.name}</div>
                                                  {tournament.format_tags && tournament.format_tags.length > 0 && (
                                                    <div className="flex gap-1">
                                                      {tournament.format_tags.map((tagId) => {
                                                        const tag = formatTags.find(t => t.id === tagId);
                                                        return tag ? (
                                                          <span key={tagId} className="inline-block bg-gray-700 text-gray-200 px-2 py-1 rounded text-xs font-medium">
                                                            {tag.label}
                                                          </span>
                                                        ) : null;
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="text-sm text-gray-300 mt-1">
                                                  Buy-in: ${tournament.buy_in} • Prize: ${tournament.prize_won}
                                                  {tournament.bounties_won > 0 && ` • Bounties: $${tournament.bounties_won}`}
                                                  • Net: <span className={`font-semibold ${tournamentNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {tournamentNet >= 0 ? '+' : ''}${tournamentNet.toLocaleString()}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <button
                                                  onClick={() => router.push(`/sessions/${session.id}`)}
                                                  className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1 border border-blue-500 rounded transition-colors"
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  onClick={() => deleteTournament(tournament.id, session.id)}
                                                  className="text-red-400 hover:text-red-300 text-sm px-2 py-1 border border-red-500 rounded transition-colors"
                                                >
                                                  Delete
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-center text-gray-300 py-4">No tournaments in this session</div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                <div className="px-4 py-3 border-t border-gray-600 bg-gray-700 flex items-center justify-between">
                  <div className="text-sm text-gray-300">
                    Showing {sessions.filter(session => {
                      const hasValidData = (session.total_buyins || 0) > 0 || (session.total_prize || 0) > 0 ||
                                         (session.tournament_count && session.tournament_count > 0);
                      return hasValidData;
                    }).length} sessions
                  </div>
                  
                  {hasMoreSessions && (
                    <button
                      onClick={loadMoreSessions}
                      disabled={loading}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      {loading ? 'Loading...' : 'Load More Sessions'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </>
      )}
    </main>
  );
}