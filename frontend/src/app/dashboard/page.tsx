'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import type { Tournament, Site, FormatTag } from '@/types';

interface TournamentWithSession extends Tournament {
  session_id?: number;
  session_start_time?: string;
}

interface QuickBuyIn {
  amount: number;
  label: string;
  common: boolean;
}

const COMMON_BUYINS: QuickBuyIn[] = [
  { amount: 11, label: '$11', common: true },
  { amount: 22, label: '$22', common: true },
  { amount: 33, label: '$33', common: true },
  { amount: 55, label: '$55', common: true },
  { amount: 66, label: '$66', common: true },
  { amount: 109, label: '$109', common: true },
  { amount: 215, label: '$215', common: true },
  { amount: 530, label: '$530', common: false },
  { amount: 1050, label: '$1050', common: false },
];

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<TournamentWithSession[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedBuyIn, setSelectedBuyIn] = useState<number | null>(null);

  // Auth guard
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.replace('/login?next=/dashboard');
    } else {
      setReady(true);
    }
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Loading dashboard data...');
      
      // Load all tournaments across all sessions
      const [tournamentsRes, sitesRes] = await Promise.all([
        apiGet<TournamentWithSession[]>('/tournaments/'),
        apiGet<Site[]>('/sites/')
      ]);
      
      console.log('Tournaments response:', tournamentsRes);
      console.log('Sites response:', sitesRes);
      
      // Ensure we always set an array
      setTournaments(Array.isArray(tournamentsRes) ? tournamentsRes : []);
      setSites(Array.isArray(sitesRes) ? sitesRes : []);
      
      console.log('Dashboard data loaded successfully');
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set empty arrays on error
      setTournaments([]);
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) loadData();
  }, [ready, loadData]);

  const handleQuickAdd = async (buyIn: number) => {
    setSelectedBuyIn(buyIn);
    setShowModal(true);
  };

  const createQuickTournament = async (buyIn: number, siteName: string = 'PokerStars') => {
    try {
      console.log('Creating quick tournament with buy-in:', buyIn);
      
      // Find or create a session for today
      const today = new Date().toISOString().split('T')[0];
      console.log('Creating session for date:', today);
      
      const sessionRes = await apiPost<{id: number}>('/sessions/quick_session/', {
        date: today
      });
      console.log('Session created/found:', sessionRes);

      // Create tournament with minimal data
      const site = sites.find(s => s.name === siteName) || sites[0];
      if (!site) {
        throw new Error('No sites available. Please add a site first.');
      }
      
      const tournamentData = {
        name: `$${buyIn} Tournament`,
        site: site.id,
        buy_in: buyIn,
        start_time: new Date().toISOString(),
        type: 'MTT',
        game: 'NLHE',
        speed: 'regular',
        table_size: '8max'
      };
      console.log('Creating tournament with data:', tournamentData);

      const tournament = await apiPost<{id: number}>('/tournaments/', tournamentData);
      console.log('Tournament created:', tournament);
      
      // Link to session
      const linkData = {
        session: sessionRes.id,
        tournament: tournament.id
      };
      console.log('Linking tournament to session:', linkData);
      
      await apiPost('/session-tournaments/', linkData);
      console.log('Tournament linked to session successfully');

      // Refresh data
      await loadData();
      setShowModal(false);
      setSelectedBuyIn(null);
      
      console.log('Quick tournament creation completed successfully');
    } catch (error) {
      console.error('Failed to create quick tournament:', error);
      alert(`Failed to create tournament: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const calculateStats = () => {
    // Ensure tournaments is always an array
    const tournamentsArray = Array.isArray(tournaments) ? tournaments : [];
    
    const totalBuyins = tournamentsArray.reduce((sum, t) => sum + Number(t.buy_in || 0), 0);
    const totalPrizes = tournamentsArray.reduce((sum, t) => sum + Number(t.prize_won || 0) + Number(t.bounties_won || 0), 0);
    const net = totalPrizes - totalBuyins;
    const roi = totalBuyins > 0 ? ((net / totalBuyins) * 100) : 0;
    
    return { totalBuyins, totalPrizes, net, roi, count: tournamentsArray.length };
  };

  const stats = calculateStats();

  if (!ready) return <div className="p-6">Redirecting to login…</div>;

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with Quick Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Poker Dashboard</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Add Tournament
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.count}</div>
            <div className="text-gray-600">Tournaments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              ${stats.totalBuyins.toLocaleString()}
            </div>
            <div className="text-gray-600">Total Buy-ins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${stats.totalPrizes.toLocaleString()}
            </div>
            <div className="text-gray-600">Total Prizes</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${stats.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${stats.net.toLocaleString()}
            </div>
            <div className="text-gray-600">Net ({stats.roi.toFixed(1)}% ROI)</div>
          </div>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Add Tournament</h2>
        <div className="flex flex-wrap gap-2">
          {COMMON_BUYINS.filter(b => b.common).map(buyIn => (
            <button
              key={buyIn.amount}
              onClick={() => handleQuickAdd(buyIn.amount)}
              className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm font-medium"
            >
              + {buyIn.label}
            </button>
          ))}
          <button
            onClick={() => setShowModal(true)}
            className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm font-medium border-2 border-dashed border-gray-300"
          >
            + Custom
          </button>
        </div>
      </div>

      {/* Tournament Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Recent Tournaments</h2>
        </div>
        
        {loading ? (
          <div className="p-6">Loading tournaments...</div>
        ) : tournaments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No tournaments yet. Click a quick add button above to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tournament
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Site
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buy-in
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prize
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bounties
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(Array.isArray(tournaments) ? tournaments : []).slice(0, 50).map((tournament) => {
                  const net = Number(tournament.prize_won || 0) + Number(tournament.bounties_won || 0) - Number(tournament.buy_in || 0);
                  return (
                    <tr key={tournament.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(tournament.start_time).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{tournament.name}</div>
                        <div className="text-sm text-gray-500">{tournament.game} • {tournament.speed}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sites.find(s => s.id === tournament.site)?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${Number(tournament.buy_in || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${Number(tournament.prize_won || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${Number(tournament.bounties_won || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${net.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                        <button className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {selectedBuyIn ? `Add $${selectedBuyIn} Tournament` : 'Add Tournament'}
            </h3>
            
            {selectedBuyIn ? (
              <div className="space-y-4">
                <p>Quick add a ${selectedBuyIn} tournament?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => createQuickTournament(selectedBuyIn)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Add Tournament
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p>Choose a buy-in amount:</p>
                <div className="grid grid-cols-3 gap-2">
                  {COMMON_BUYINS.map(buyIn => (
                    <button
                      key={buyIn.amount}
                      onClick={() => createQuickTournament(buyIn.amount)}
                      className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm"
                    >
                      {buyIn.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}