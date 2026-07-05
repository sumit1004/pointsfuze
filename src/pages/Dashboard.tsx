import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ref, get, child } from 'firebase/database';
import { db } from '../lib/firebase';
import { Trophy, History, Download, Zap, PlusCircle, ArrowRight } from 'lucide-react';
import ConfigLayout from '../components/layouts/ConfigLayout';

const Dashboard: React.FC = () => {
  const { profile, stats, subscription, user } = useAuth();
  const navigate = useNavigate();
  const [recentTournaments, setRecentTournaments] = useState<any[]>([]);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        const dbRef = ref(db);
        const tourneySnapshot = await get(child(dbRef, `users/${user.uid}/tournaments`));
        if (tourneySnapshot.exists()) {
          const tData = tourneySnapshot.val();
          const tArray = Object.keys(tData).map(key => ({ id: key, ...tData[key] }));
          tArray.sort((a, b) => b.createdTime - a.createdTime);
          setRecentTournaments(tArray.slice(0, 5));
        }

        const historySnapshot = await get(child(dbRef, `users/${user.uid}/history`));
        if (historySnapshot.exists()) {
          const hData = historySnapshot.val();
          const hArray = Object.keys(hData).map(key => ({ id: key, ...hData[key] }));
          hArray.sort((a, b) => b.createdTime - a.createdTime);
          setRecentHistory(hArray);
        }
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleResumeTournament = (t: any) => {
    if (t.id) {
      localStorage.setItem('currentActiveTournamentId', t.id);
    }

    const mode = (t.mode || t.type || '').toLowerCase();
    
    if (mode.includes('total score')) {
      if (t.name) {
        localStorage.setItem('totalScoreTournamentDetails', JSON.stringify({
          name: t.name,
          date: t.date || new Date().toISOString().split('T')[0],
          type: t.type || 'League Match'
        }));
      }
      if (t.teams) {
        localStorage.setItem('totalScoreTeams', JSON.stringify(t.teams));
      }
      if (t.matches) {
        localStorage.setItem('totalScoreMatches', JSON.stringify(t.matches));
      }
      navigate('/total-score');
    } else if (mode.includes('slot') || mode.includes('team')) {
      if (t.matches) {
        localStorage.setItem('slotTeamMatchResults', JSON.stringify(t.matches));
      }
      navigate('/slot-team-match');
    } else {
      if (t.matches) {
        localStorage.setItem('matchResults', JSON.stringify(t.matches));
      }
      navigate('/match-calculator');
    }
  };

  return (
    <ConfigLayout title="Dashboard" onBack={() => navigate('/')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Section */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between shadow-2xl mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {profile?.name || 'Organizer'}!</h1>
            <p className="text-gray-400">Manage your tournaments and check your statistics.</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col items-center md:items-end">
            <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Plan</span>
            <div className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white px-4 py-1.5 rounded-full font-bold text-sm uppercase shadow-lg">
              {subscription?.plan || 'Free'}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-2xl flex items-center shadow-lg">
            <div className="bg-purple-500/20 p-4 rounded-xl mr-4">
              <Trophy className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Tournaments</p>
              <p className="text-2xl font-bold text-white">{stats?.tournamentCount || 0}</p>
            </div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-2xl flex items-center shadow-lg">
            <div className="bg-blue-500/20 p-4 rounded-xl mr-4">
              <Zap className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Matches</p>
              <p className="text-2xl font-bold text-white">{stats?.matchCount || 0}</p>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-2xl flex items-center shadow-lg">
            <div className="bg-green-500/20 p-4 rounded-xl mr-4">
              <History className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">History Saved</p>
              <p className="text-2xl font-bold text-white">{stats?.historyCount || 0}</p>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-2xl flex items-center shadow-lg">
            <div className="bg-orange-500/20 p-4 rounded-xl mr-4">
              <Download className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Downloads</p>
              <p className="text-2xl font-bold text-white">{stats?.downloadCount || 0}</p>
            </div>
          </div>
        </div>

        {/* Action & Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Active Tournaments List */}
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Active Tournaments</h2>
            </div>
            
            {loading ? (
              <div className="text-gray-500 text-center py-8">Loading...</div>
            ) : recentTournaments.length === 0 ? (
              <div className="text-gray-500 text-center py-8 bg-black/20 rounded-xl border border-dashed border-gray-700">
                No active tournaments found.
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                {recentTournaments.map(t => (
                  <div key={t.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors" onClick={() => handleResumeTournament(t)}>
                    <div className="flex justify-between mb-2">
                      <h3 className="font-bold text-white">{t.name || t.tournamentName || 'Unnamed Tournament'}</h3>
                      <span className="text-xs text-gray-400">{new Date(t.createdTime || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-400">
                      <span>Teams: {t.teamsCount || t.teams?.length || 0}</span>
                      <span className="text-purple-400">{t.mode || t.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed History List */}
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Completed History</h2>
              <button 
                onClick={() => navigate('/tournament-history')}
                className="flex items-center text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
              >
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            
            {loading ? (
              <div className="text-gray-500 text-center py-8">Loading...</div>
            ) : recentHistory.length === 0 ? (
              <div className="text-gray-500 text-center py-8 bg-black/20 rounded-xl border border-dashed border-gray-700">
                No history saved yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentHistory.map(h => (
                  <div key={h.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-bold text-white">{h.name || h.tournamentName}</h3>
                      <span className="text-xs text-gray-400">{new Date(h.createdTime || h.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-400">
                      <span>Matches: {h.totalMatches || h.matches?.length || 0}</span>
                      {h.winner && <span className="text-yellow-500">🏆 {h.winner}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </ConfigLayout>
  );
};

export default Dashboard;
