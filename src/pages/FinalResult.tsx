import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfigLayout from '../components/layouts/ConfigLayout';
import { Download, ArrowLeft, Trophy } from 'lucide-react';
import { utils, writeFile } from 'xlsx';

interface Player {
  name: string;
  uid: string;
  inGameName: string;
  kills: number | '';
}

interface TeamScore {
  teamName: string;
  players: Player[];
  position: number | '';
  points: number;
}

interface TeamTotalScore {
  teamName: string;
  matches: number;
  totalKills: number;
  totalPoints: number;
  totalPositionPoints: number;
  boyaahCount: number;
}

interface Match {
  type: 'semifinal' | 'final';
  matchNumber: number;
  teams: TeamScore[];
}

const FinalResult: React.FC = () => {
  const navigate = useNavigate();
  const [finalResults, setFinalResults] = useState<TeamTotalScore[]>([]);
  const [semifinals, setSemifinals] = useState<Match[]>([]);
  const [finals, setFinals] = useState<Match[]>([]);

  const getOverallMVP = (matches: Match[]) => {
    interface PlayerTotal {
      name: string;
      inGameName: string;
      teamName: string;
      totalKills: number;
    }

    const playerKills: { [key: string]: PlayerTotal } = {};

    matches.forEach(match => {
      match.teams.forEach(team => {
        team.players.forEach(player => {
          const playerKillCount = typeof player.kills === 'string' 
            ? (player.kills === '' ? 0 : parseInt(player.kills) || 0)
            : (player.kills || 0);
          
          const playerKey = `${player.name}_${player.uid}`;
          if (!playerKills[playerKey]) {
            playerKills[playerKey] = {
              name: player.name,
              inGameName: player.inGameName,
              teamName: team.teamName,
              totalKills: 0
            };
          }
          playerKills[playerKey].totalKills += playerKillCount;
        });
      });
    });

    const playerArray = Object.values(playerKills);
    if (playerArray.length === 0) return [];

    const maxKills = Math.max(...playerArray.map(p => p.totalKills));
    return playerArray.filter(p => p.totalKills === maxKills);
  };

  useEffect(() => {
    const calculateResults = () => {
      const matches = JSON.parse(localStorage.getItem('matchResults') || '[]') as Match[];
      const gameConfig = JSON.parse(localStorage.getItem('globalGameConfig') || '{}');
      
      // Split matches by type
      const semiMatches = matches.filter(m => m.type === 'semifinal');
      const finalMatches = matches.filter(m => m.type === 'final');
      
      setSemifinals(semiMatches);
      setFinals(finalMatches);

      // Calculate total scores
      const teamScores: { [key: string]: TeamTotalScore } = {};

      matches.forEach(match => {
        match.teams.forEach(team => {
          if (!teamScores[team.teamName]) {
            teamScores[team.teamName] = {
              teamName: team.teamName,
              matches: 0,
              totalKills: 0,
              totalPoints: 0,
              totalPositionPoints: 0,
              boyaahCount: 0
            };
          }

          // Calculate total kills from all players in this team
          const teamKills = team.players.reduce((sum, player) => {
            const killCount = typeof player.kills === 'string' 
              ? (player.kills === '' ? 0 : parseInt(player.kills) || 0)
              : (player.kills || 0);
            return sum + killCount;
          }, 0);

          // Get position points
          const positionPoints = team.position && team.position > 0 ? gameConfig.positionPoints[team.position] || 0 : 0;
          
          // Count boyaah (when position points are 12, meaning 1st place)
          const boyaah = positionPoints === 12 ? 1 : 0;

          teamScores[team.teamName].totalKills += teamKills;
          teamScores[team.teamName].totalPoints += team.points;
          teamScores[team.teamName].totalPositionPoints += positionPoints;
          teamScores[team.teamName].boyaahCount += boyaah;
          teamScores[team.teamName].matches += 1;
        });
      });

      const results = Object.values(teamScores)
        .map(team => ({
          ...team,
          avgPoints: Number((team.totalPoints / team.matches).toFixed(2))
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints);

      setFinalResults(results);
      localStorage.setItem('finalResults', JSON.stringify(results));
    };

    calculateResults();
  }, []);

  const downloadResults = () => {
    const workbook = utils.book_new();

    // Add overall standings sheet
    const overallData = finalResults.map((team, index) => ({
      'Overall Rank': index + 1,
      Team: team.teamName,
      'Matches Played': team.matches,
      'Total Kills': team.totalKills,
      'Position Points': team.totalPositionPoints,
      'Total Points': team.totalPoints,
      'Boyaahs': team.boyaahCount > 0 ? `x${team.boyaahCount}` : '0'
    }));
    const overallSheet = utils.json_to_sheet(overallData);
    utils.book_append_sheet(workbook, overallSheet, 'Overall Standings');

    // Add individual semi-final matches
    if (semifinals.length > 0) {
      semifinals.forEach((match) => {
        const matchData = match.teams
          .sort((a, b) => b.points - a.points)
          .map((team, index) => {
            const teamKills = team.players.reduce((sum, player) => {
              const killCount = typeof player.kills === 'string' 
                ? (player.kills === '' ? 0 : parseInt(player.kills) || 0)
                : (player.kills || 0);
              return sum + killCount;
            }, 0);
            return {
              Rank: index + 1,
              Team: team.teamName,
              Kills: teamKills,
              Position: team.position || '-',
              Points: team.points
            };
          });
        const matchSheet = utils.json_to_sheet(matchData);
        utils.book_append_sheet(workbook, matchSheet, `Semi-Final ${match.matchNumber}`);
      });
    }

    // Add individual final matches
    if (finals.length > 0) {
      finals.forEach((match) => {
        const matchData = match.teams
          .sort((a, b) => b.points - a.points)
          .map((team, index) => {
            const teamKills = team.players.reduce((sum, player) => {
              const killCount = typeof player.kills === 'string' 
                ? (player.kills === '' ? 0 : parseInt(player.kills) || 0)
                : (player.kills || 0);
              return sum + killCount;
            }, 0);
            return {
              Rank: index + 1,
              Team: team.teamName,
              Kills: teamKills,
              Position: team.position || '-',
              Points: team.points
            };
          });
        const matchSheet = utils.json_to_sheet(matchData);
        utils.book_append_sheet(workbook, matchSheet, `Final ${match.matchNumber}`);
      });
    }

    // Get tournament name from config or use default
    const tournamentName = JSON.parse(localStorage.getItem('tournamentConfig') || '{}').tournamentName || 'Tournament';
    writeFile(workbook, `${tournamentName}_Complete_Results.xlsx`);
  };

  const handleSaveToHistory = () => {
    try {
      const historyData = JSON.parse(localStorage.getItem('tournamentHistory') || '[]');
      const tournamentConfig = JSON.parse(localStorage.getItem('tournamentConfig') || '{}');
      const matches = JSON.parse(localStorage.getItem('matchResults') || '[]');
      
      const tournamentData = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        name: tournamentConfig.tournamentName || 'Tournament',
        standings: finalResults,
        matches: matches,
        type: 'regular'
      };

      historyData.push(tournamentData);
      localStorage.setItem('tournamentHistory', JSON.stringify(historyData));
      
      // Clear current match data after saving
      localStorage.removeItem('matchResults');
      
      alert('Tournament results saved to history!');
    } catch (error) {
      console.error('Error saving to history:', error);
      alert('Failed to save tournament to history');
    }
  };

  return (
    <ConfigLayout title="Final Tournament Results">
      <div className="space-y-6 px-4 sm:px-6 pb-32 sm:pb-6"> {/* Increased bottom padding for mobile */}
        {/* Podium Section for Top 3 */}
        {finalResults.length > 0 && (
          <div className="relative h-64 sm:h-80 mb-8">
            {/* Second Place */}
            <div className="absolute left-4 sm:left-1/4 bottom-0 w-24 sm:w-48 flex flex-col items-center">
              <div className="relative">
                <Trophy size={32} className="text-gray-300 mb-2" />
                <span className="absolute -top-12 text-2xl sm:text-4xl font-bold text-gray-300">2</span>
              </div>
              <div className="w-full bg-gray-700 rounded-t-lg p-2 sm:p-4 text-center h-32 sm:h-48">
                <div className="text-sm sm:text-xl font-bold text-gray-300 truncate">{finalResults[1]?.teamName}</div>
                <div className="text-lg sm:text-3xl font-bold text-purple-400">{finalResults[1]?.totalPoints}</div>
                <div className="text-xs sm:text-sm text-gray-400">points</div>
              </div>
            </div>

            {/* First Place */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-28 sm:w-56 flex flex-col items-center">
              <div className="relative">
                <Trophy size={48} className="text-yellow-400 mb-2" />
                <span className="absolute -top-12 text-3xl sm:text-5xl font-bold text-yellow-400">1</span>
              </div>
              <div className="w-full bg-gradient-to-b from-purple-600 to-purple-800 rounded-t-lg p-2 sm:p-4 text-center h-40 sm:h-64">
                <div className="text-base sm:text-2xl font-bold text-white truncate">{finalResults[0]?.teamName}</div>
                <div className="text-xl sm:text-4xl font-bold text-yellow-400">{finalResults[0]?.totalPoints}</div>
                <div className="text-xs sm:text-sm text-white/80">points</div>
              </div>
            </div>

            {/* Third Place */}
            <div className="absolute right-4 sm:right-1/4 bottom-0 w-24 sm:w-48 flex flex-col items-center">
              <div className="relative">
                <Trophy size={24} className="text-orange-400 mb-2" />
                <span className="absolute -top-12 text-2xl sm:text-4xl font-bold text-orange-400">3</span>
              </div>
              <div className="w-full bg-gray-700 rounded-t-lg p-2 sm:p-4 text-center h-28 sm:h-40">
                <div className="text-sm sm:text-lg font-bold text-gray-300 truncate">{finalResults[2]?.teamName}</div>
                <div className="text-lg sm:text-2xl font-bold text-orange-400">{finalResults[2]?.totalPoints}</div>
                <div className="text-xs sm:text-sm text-gray-400">points</div>
              </div>
            </div>
          </div>
        )}

        {/* Standings Table/Cards */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-4 sm:p-6 mb-24 sm:mb-6"> {/* Increased margin bottom for mobile */}
          <h2 className="text-xl sm:text-2xl font-bold text-purple-400 mb-4">Complete Standings</h2>
          
          {/* Mobile View - Cards */}
          <div className="sm:hidden space-y-3">
            {finalResults.map((team, index) => (
              <div key={team.teamName} 
                className={`${
                  index < 3 ? 'bg-gradient-to-r from-purple-900/50 to-purple-800/50' : 'bg-white/5'
                } rounded-lg p-4`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm text-gray-400">Rank #{index + 1}</div>
                    <div className="text-lg font-bold text-white">{team.teamName}</div>
                  </div>
                  <div className="bg-black/20 rounded p-2">
                    <div className="text-gray-400">Matches</div>
                    <div className="text-white font-bold">{team.matches}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-400">{team.totalPoints}</div>
                    <div className="text-xs text-gray-400">total points</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-black/20 rounded p-2">
                    <div className="text-gray-400">Kills</div>
                    <div className="text-white font-bold">{team.totalKills}</div>
                  </div>
                  <div className="bg-black/20 rounded p-2">
                    <div className="text-gray-400">Pos Points</div>
                    <div className="text-white font-bold">{team.totalPositionPoints}</div>
                  </div>
                  <div className="bg-black/20 rounded p-2">
                    <div className="text-gray-400">Boyaahs</div>
                    <div className="text-yellow-400 font-bold">
                      {team.boyaahCount > 0 ? `x${team.boyaahCount} 🏆` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-gray-300 border-b border-white/10">
                  <th className="text-left py-3 px-4">#</th>
                  <th className="text-left py-3 px-4">Team</th>
                  <th className="text-left py-3 px-4">Matches</th>
                  <th className="text-left py-3 px-4">Kills</th>
                  <th className="text-left py-3 px-4">Pos Points</th>
                  <th className="text-left py-3 px-4">Points</th>
                  <th className="text-left py-3 px-4">Boyaahs</th>
                </tr>
              </thead>
              <tbody>
                {finalResults.map((team, index) => (
                  <tr key={team.teamName} 
                    className={`${
                      index < 3 ? 'bg-purple-900/20' : 'hover:bg-white/5'
                    } border-b border-white/5 transition-colors`}
                  >
                    <td className="py-3 px-4 font-bold">{index + 1}</td>
                    <td className="py-3 px-4 font-semibold text-white">{team.teamName}</td>
                    <td className="py-3 px-4">{team.matches}</td>
                    <td className="py-3 px-4">{team.totalKills}</td>
                    <td className="py-3 px-4">{team.totalPositionPoints}</td>
                    <td className="py-3 px-4 font-bold text-purple-400">{team.totalPoints}</td>
                    <td className="py-3 px-4 text-yellow-400 font-bold">
                      {team.boyaahCount > 0 ? `x${team.boyaahCount} 🏆` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Final MVP Section - Compact */}
        {(() => {
          const allMatches = [...semifinals, ...finals];
          const mvpPlayers = getOverallMVP(allMatches);
          return mvpPlayers.length > 0 ? (
            <div className="backdrop-blur-md bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/50 rounded-lg p-3 sm:p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={20} className="text-yellow-400" />
                <h3 className="text-lg sm:text-xl font-bold text-yellow-400">Tournament MVP</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {mvpPlayers.map((player, idx) => (
                  <div key={idx} className="bg-black/40 rounded-lg p-3 border border-yellow-400/30 hover:border-yellow-400/60 transition-all">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{player.inGameName}</p>
                        <p className="text-xs text-gray-400 truncate">{player.name}</p>
                        <p className="text-xs text-purple-300 font-semibold mt-1 truncate">{player.teamName}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-yellow-400">{player.totalKills}</div>
                        <p className="text-xs text-gray-400 whitespace-nowrap">Kills</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 sm:relative sm:mt-6 bg-gray-900/80 backdrop-blur-md sm:bg-transparent sm:backdrop-blur-none border-t border-white/10 sm:border-0 z-10"> {/* Added z-index */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 p-4 sm:p-0">
            <button
              onClick={() => navigate('/match-calculator')}
              className="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-md w-full sm:w-auto"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back to Calculator
            </button>
            <div className="flex gap-3 sm:gap-4">
              <button
                onClick={handleSaveToHistory}
                className="flex items-center justify-center flex-1 sm:flex-none backdrop-blur-md bg-purple-500/20 border border-purple-500/20 
                hover:bg-purple-500/30 text-white px-6 py-3 rounded-lg transition-all 
                duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
              >
                <Trophy size={18} className="mr-2" />
                Save to History
              </button>
              <button
                onClick={downloadResults}
                className="flex items-center justify-center flex-1 sm:flex-none bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white px-6 py-3 rounded-md"
              >
                <Download size={18} className="mr-2" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </ConfigLayout>
  );
};

export default FinalResult;
