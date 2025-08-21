"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LandingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setIsAuthenticated(!!token);
  }, []);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
        <p className="mt-2 text-blue-200">Loading...</p>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SL</span>
            </div>
            <span className="text-white text-xl font-bold">ShipIt Log</span>
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Track Your Poker
              <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Journey
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Professional poker session tracking with advanced analytics, 
              real-time tournament management, and comprehensive performance insights.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  Start Tracking Free
                </Link>
                <Link
                  href="/login"
                  className="border-2 border-gray-400 text-gray-300 px-8 py-4 rounded-xl font-semibold text-lg hover:border-white hover:text-white transition-all duration-200"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Hero Image/Demo */}
          <div className="relative max-w-5xl mx-auto">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
              <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="ml-4 text-gray-400 text-sm">ShipIt Log Dashboard</span>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="text-3xl font-bold">+$12,450</div>
                    <div className="text-green-100">Total Profit</div>
                    <div className="text-sm text-green-200">24.3% ROI</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="text-3xl font-bold">67.2%</div>
                    <div className="text-blue-100">Win Rate</div>
                    <div className="text-sm text-blue-200">156 wins</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="text-3xl font-bold">89</div>
                    <div className="text-purple-100">Sessions</div>
                    <div className="text-sm text-purple-200">232 tournaments</div>
                  </div>
                </div>
                <div className="bg-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">Recent Sessions</h3>
                    <span className="text-green-400 text-sm">Live Session Active</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { date: "Today", profit: "+$450", tournaments: "3 tournaments" },
                      { date: "Yesterday", profit: "-$120", tournaments: "2 tournaments" },
                      { date: "Dec 15", profit: "+$890", tournaments: "5 tournaments" },
                    ].map((session, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-600 last:border-b-0">
                        <div>
                          <div className="text-white font-medium">{session.date}</div>
                          <div className="text-gray-400 text-sm">{session.tournaments}</div>
                        </div>
                        <div className={`font-semibold ${session.profit.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                          {session.profit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-6 py-20 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Everything You Need to
              <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Dominate the Tables
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Professional-grade tools designed for serious poker players who want to track, 
              analyze, and improve their game.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "📊",
                title: "Advanced Analytics",
                description: "Deep dive into your performance with comprehensive charts, ROI tracking, and variance analysis."
              },
              {
                icon: "⚡",
                title: "Real-Time Tracking",
                description: "Log tournaments instantly during live sessions with quick-add buttons and mobile optimization."
              },
              {
                icon: "🎯",
                title: "Session Management",
                description: "Organize tournaments into sessions, track live games, and manage your poker schedule efficiently."
              },
              {
                icon: "📈",
                title: "Performance Insights",
                description: "Identify your most profitable games, sites, and time periods with detailed breakdowns."
              },
              {
                icon: "💰",
                title: "Bankroll Tracking",
                description: "Monitor your poker bankroll with profit/loss tracking, ROI calculations, and goal setting."
              },
              {
                icon: "🏆",
                title: "Tournament History",
                description: "Complete tournament database with filtering, search, and export capabilities for tax reporting."
              }
            ].map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-200 hover:transform hover:-translate-y-1">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Future Leaderboard Section */}
      <section className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-12 border border-gray-700">
            <div className="mb-8">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Coming Soon:
                <span className="block bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  Global Leaderboards
                </span>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Compete with poker players worldwide. Compare your stats, climb the rankings, 
                and showcase your skills on our global leaderboards.
              </p>
            </div>
            
            <div className="bg-black/30 rounded-2xl p-8 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">🥇</div>
                  <div className="text-yellow-400 font-bold text-lg">ROI Leaders</div>
                  <div className="text-gray-400">Top performing players</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">🔥</div>
                  <div className="text-orange-400 font-bold text-lg">Hot Streaks</div>
                  <div className="text-gray-400">Current winning runs</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">💎</div>
                  <div className="text-blue-400 font-bold text-lg">Volume Kings</div>
                  <div className="text-gray-400">Most active grinders</div>
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <Link 
                href="/register" 
                className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Join the Waitlist
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-20 bg-gradient-to-r from-blue-600 to-purple-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Level Up Your Game?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of poker players who are already using ShipIt Log to track their sessions 
            and maximize their profits.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  Start Free Today
                </Link>
                <Link
                  href="/login"
                  className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-200"
                >
                  Already Have an Account?
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/40 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SL</span>
              </div>
              <span className="text-white text-xl font-bold">ShipIt Log</span>
            </div>
            <div className="text-gray-400 text-center md:text-right">
              <p>&copy; 2024 ShipIt Log. All rights reserved.</p>
              <p className="text-sm mt-1">Professional poker session tracking made simple.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
