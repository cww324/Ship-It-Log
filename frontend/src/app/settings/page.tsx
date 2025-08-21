"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import type { Site, FormatTag } from "@/types";

interface TournamentTemplate {
  id: number;
  name: string;
  site: number;
  buy_in: number;
  game: string;
  speed: string;
  table_size: string;
  format_tags: number[];
  notes?: string;
  schedule?: string;
  user: number;
}

interface CustomSite {
  id: number;
  name: string;
  type: 'online' | 'live';
  logo_url?: string;
  user: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'sites' | 'templates'>('sites');
  
  // Data states
  const [sites, setSites] = useState<Site[]>([]);
  const [templates, setTemplates] = useState<TournamentTemplate[]>([]);
  const [formatTags, setFormatTags] = useState<FormatTag[]>([]);
  
  // Form states
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingSite, setEditingSite] = useState<CustomSite | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TournamentTemplate | null>(null);
  
  const [siteForm, setSiteForm] = useState({
    name: '',
    type: 'online' as 'online' | 'live',
    logo_url: ''
  });
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    site: null as number | null,
    buy_in: '33.00',
    game: 'NLHE',
    speed: 'regular',
    table_size: '8max',
    format_tags: [] as number[],
    notes: '',
    schedule: ''
  });

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
      const [sitesRes, tagsRes] = await Promise.all([
        apiGet<{results?: Site[]} | Site[]>('/sites/'),
        apiGet<{results?: FormatTag[]} | FormatTag[]>('/format-tags/')
      ]);
      
      setSites(Array.isArray(sitesRes) ? sitesRes : sitesRes.results ?? []);
      setFormatTags(Array.isArray(tagsRes) ? tagsRes : tagsRes.results ?? []);
      
      // TODO: Load tournament templates when API is ready
      setTemplates([]);
    } catch (error) {
      console.error('Failed to load settings data:', error);
    } finally {
      setLoading(false);
    }
  }, [ready]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSite) {
        // Update existing site
        await apiPut(`/sites/${editingSite.id}/`, siteForm);
      } else {
        // Create new site
        await apiPost('/sites/', siteForm);
      }
      
      await loadData();
      setShowSiteForm(false);
      setEditingSite(null);
      setSiteForm({ name: '', type: 'online', logo_url: '' });
    } catch (error) {
      console.error('Failed to save site:', error);
    }
  };

  const handleDeleteSite = async (siteId: number) => {
    if (!confirm('Are you sure you want to delete this site?')) return;
    
    try {
      await apiDelete(`/sites/${siteId}/`);
      await loadData();
    } catch (error) {
      console.error('Failed to delete site:', error);
    }
  };

  const startEditSite = (site: Site) => {
    setEditingSite(site as unknown as CustomSite);
    setSiteForm({
      name: site.name,
      type: site.type as 'online' | 'live',
      logo_url: ''
    });
    setShowSiteForm(true);
  };

  if (!ready) return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
      <p className="mt-4 text-blue-200">Loading...</p>
    </div>
  </div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              <span>←</span>
              Back to Dashboard
            </button>
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-2xl">⚙️</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Settings</h1>
              <p className="text-gray-300">Customize your poker tracking experience</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏢</span>
                <div>
                  <div className="text-2xl font-bold text-white">{sites.length}</div>
                  <div className="text-gray-300 text-sm">Poker Sites</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <div className="text-2xl font-bold text-white">{templates.length}</div>
                  <div className="text-gray-300 text-sm">Templates</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏷️</span>
                <div>
                  <div className="text-2xl font-bold text-white">{formatTags.length}</div>
                  <div className="text-gray-300 text-sm">Format Tags</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Section Navigation */}
        <div className="flex space-x-1 mb-8 bg-black/20 rounded-xl p-1">
          <button
            onClick={() => setActiveSection('sites')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeSection === 'sites'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            🏢 Poker Sites
          </button>
          <button
            onClick={() => setActiveSection('templates')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeSection === 'templates'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            🎯 Tournament Templates
          </button>
        </div>

        {/* Sites Section */}
        {activeSection === 'sites' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Poker Sites Management</h2>
              <button
                onClick={() => {
                  setShowSiteForm(true);
                  setEditingSite(null);
                  setSiteForm({ name: '', type: 'online', logo_url: '' });
                }}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                + Add New Site
              </button>
            </div>

            {/* Site Form */}
            {showSiteForm && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">
                  {editingSite ? 'Edit Site' : 'Add New Site'}
                </h3>
                <form onSubmit={handleSiteSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Site Name</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-black/30 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., PokerStars, Aria Casino"
                        value={siteForm.name}
                        onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                      <select
                        className="w-full bg-black/30 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={siteForm.type}
                        onChange={(e) => setSiteForm({ ...siteForm, type: e.target.value as 'online' | 'live' })}
                      >
                        <option value="online">Online</option>
                        <option value="live">Live Casino</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all"
                    >
                      {editingSite ? 'Update Site' : 'Add Site'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSiteForm(false);
                        setEditingSite(null);
                      }}
                      className="bg-gray-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sites List */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                  <p className="mt-2 text-gray-300">Loading sites...</p>
                </div>
              ) : sites.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏢</div>
                  <h3 className="text-lg font-medium text-white mb-2">No custom sites yet</h3>
                  <p className="text-gray-400 mb-6">Add your favorite poker sites and casinos to get started.</p>
                </div>
              ) : (
                sites.map((site) => (
                  <div key={site.id} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {site.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-white">{site.name}</div>
                        <div className="text-sm text-gray-400 capitalize">{site.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditSite(site)}
                        className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 border border-blue-500 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSite(site.id)}
                        className="text-red-400 hover:text-red-300 text-sm px-3 py-1 border border-red-500 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Templates Section */}
        {activeSection === 'templates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Tournament Templates</h2>
              <button
                onClick={() => setShowTemplateForm(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                + Add New Template
              </button>
            </div>

            {/* Coming Soon Message */}
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-white mb-2">Tournament Templates Coming Soon</h3>
              <p className="text-gray-400 mb-6">
                Create templates for your regular tournaments like &quot;$33 Big Halula every Tuesday&quot;
                to quickly add them to your sessions.
              </p>
              <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-6 py-3 rounded-xl font-medium inline-block">
                Feature in Development
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}