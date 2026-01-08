import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, Save } from 'lucide-react';
import ConfigLayout from '../components/layouts/ConfigLayout';
import { utils, writeFile } from 'xlsx';

interface SlotTeamMatchResult {
  slot: number;
  teamName: string;
  kills: number | '';
  position: number | '';
  points: number;
}

interface SlotTeamMatch {
  type: 'semifinal' | 'final';
  matchNumber: number;
  slotTeams: SlotTeamMatchResult[];
}

interface TeamStanding {
  teamName: string;
  slot: number;
  matchesPlayed: number;
  boyaahCount: number;
  totalKills: number;
  totalPositionPoints: number;
  totalPoints: number;
}

const SlotTeamFinalResult: React.FC = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<SlotTeamMatch[]>([]);
  const [standings, setStandings] = useState<TeamStanding[]>([]);

  useEffect(() => {
    const loadData = () => {
      const gameConf = JSON.parse(localStorage.getItem('slotTeamGameConfig') || '{}');
      const savedMatches = localStorage.getItem('slotTeamMatchResults');

      if (savedMatches) {
        const parsedMatches = JSON.parse(savedMatches);
        setMatches(parsedMatches);
        calculateStandings(parsedMatches, gameConf);
      }
    };

    loadData();
  }, []);

  const calculateStandings = (matches: SlotTeamMatch[], config: any) => {
    const teamStandingsMap: { [key: string]: TeamStanding } = {};

    matches.forEach(match => {
      // Find the team with highest points (boyaah)
      let maxPoints = -1;
      let boyaahTeamName = '';
      
      match.slotTeams.forEach(team => {
        if (team.points > maxPoints) {
          maxPoints = team.points;
          boyaahTeamName = team.teamName;
        }
      });

      match.slotTeams.forEach(team => {
        const key = team.teamName;

        if (!teamStandingsMap[key]) {
          teamStandingsMap[key] = {
            teamName: team.teamName,
            slot: team.slot,
            matchesPlayed: 0,
            boyaahCount: 0,
            totalKills: 0,
            totalPositionPoints: 0,
            totalPoints: 0
          };
        }

        const kills = typeof team.kills === 'string' 
          ? (team.kills === '' ? 0 : parseInt(team.kills) || 0)
          : (team.kills || 0);
        
        const position = typeof team.position === 'string'
          ? (team.position === '' ? 0 : parseInt(team.position) || 0)
          : (team.position || 0);

        const positionPoints = position > 0 ? config.positionPoints?.[position] || 0 : 0;

        teamStandingsMap[key].matchesPlayed += 1;
        teamStandingsMap[key].totalKills += kills;
        teamStandingsMap[key].totalPositionPoints += positionPoints;
        teamStandingsMap[key].totalPoints += team.points;
        
        // Increment boyaah count if this team has highest points in match
        if (team.teamName === boyaahTeamName && maxPoints > 0) {
          teamStandingsMap[key].boyaahCount += 1;
        }
      });
    });

    const sortedStandings = Object.values(teamStandingsMap).sort((a, b) => 
      b.totalPoints - a.totalPoints
    );

    setStandings(sortedStandings);
  };

  const getPodiumData = () => {
    return standings.slice(0, 3);
  };

  const exportToExcel = () => {
    const dataToExport = standings.map((standing, index) => ({
      'Rank': index + 1,
      'Team Name': standing.teamName,
      'Slot': standing.slot,
      'Matches': standing.matchesPlayed,
      'Boyaah': standing.boyaahCount,
      'Kill Points': standing.totalKills * JSON.parse(localStorage.getItem('slotTeamGameConfig') || '{}').killPoints || 0,
      'Placement Points': standing.totalPositionPoints,
      'Total Points': standing.totalPoints
    }));

    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Standings');
    writeFile(workbook, `slot-team-standings-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getMedalEmoji = (position: number): string => {
    switch (position) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return '';
    }
  };

  return (
    <ConfigLayout title="Final Results - Slot & Team Calculator">
      <div className="space-y-8">
        {/* Podium Section */}
        {getPodiumData().length > 0 && (
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-400">
              🏆 Podium
            </h2>
            <div className="flex justify-center items-end gap-6 mb-6 flex-wrap">
              {/* Silver - 2nd Place */}
              {getPodiumData().length > 1 && (
                <div className="flex flex-col items-center">
                  <div className="text-8xl mb-2">🥈</div>
                  <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-lg p-4 w-48 text-center">
                    <p className="text-2xl font-bold text-white mb-2">
                      {getPodiumData()[1].teamName}
                    </p>
                    <p className="text-gray-400 mb-2">Slot {getPodiumData()[1].slot}</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {getPodiumData()[1].totalPoints}
                    </p>
                    <p className="text-xs text-gray-500">Total Points</p>
                  </div>
                </div>
              )}

              {/* Gold - 1st Place */}
              {getPodiumData().length > 0 && (
                <div className="flex flex-col items-center">
                  <div className="text-9xl mb-2">🥇</div>
                  <div className="backdrop-blur-md bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 rounded-lg p-4 w-48 text-center transform scale-105">
                    <p className="text-2xl font-bold text-white mb-2">
                      {getPodiumData()[0].teamName}
                    </p>
                    <p className="text-gray-400 mb-2">Slot {getPodiumData()[0].slot}</p>
                    <p className="text-3xl font-bold text-yellow-400">
                      {getPodiumData()[0].totalPoints}
                    </p>
                    <p className="text-xs text-gray-500">Total Points</p>
                  </div>
                </div>
              )}

              {/* Bronze - 3rd Place */}
              {getPodiumData().length > 2 && (
                <div className="flex flex-col items-center">
                  <div className="text-8xl mb-2">🥉</div>
                  <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-lg p-4 w-48 text-center">
                    <p className="text-2xl font-bold text-white mb-2">
                      {getPodiumData()[2].teamName}
                    </p>
                    <p className="text-gray-400 mb-2">Slot {getPodiumData()[2].slot}</p>
                    <p className="text-2xl font-bold text-orange-400">
                      {getPodiumData()[2].totalPoints}
                    </p>
                    <p className="text-xs text-gray-500">Total Points</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overall Standings Table */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-cyan-400">📊 Overall Standings</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead className="border-b-2 border-white/20">
                <tr className="bg-white/5">
                  <th className="px-4 py-3 text-left font-semibold">Rank</th>
                  <th className="px-4 py-3 text-left font-semibold">Team Name</th>
                  <th className="px-4 py-3 text-center font-semibold">Matches</th>
                  <th className="px-4 py-3 text-center font-semibold">Boyaah</th>
                  <th className="px-4 py-3 text-center font-semibold">Kill Pts</th>
                  <th className="px-4 py-3 text-center font-semibold">Placement Pts</th>
                  <th className="px-4 py-3 text-center font-semibold">Total Points</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((standing, index) => {
                  const gameConf = JSON.parse(localStorage.getItem('slotTeamGameConfig') || '{}');
                  const killPoints = standing.totalKills * (gameConf.killPoints || 1);
                  return (
                    <tr 
                      key={index} 
                      className={`border-b border-white/10 hover:bg-white/5 transition-colors ${
                        index === 0 ? 'bg-yellow-500/10' : index === 1 ? 'bg-gray-400/10' : index === 2 ? 'bg-orange-500/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-bold text-purple-400">
                        {index < 3 && getMedalEmoji(index)} #{index + 1}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">{standing.teamName}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{standing.matchesPlayed}</td>
                      <td className="px-4 py-3 text-center text-yellow-400 font-semibold">{standing.boyaahCount}</td>
                      <td className="px-4 py-3 text-center text-cyan-400">{killPoints}</td>
                      <td className="px-4 py-3 text-center text-orange-400">{standing.totalPositionPoints}</td>
                      <td className="px-4 py-3 text-center font-bold text-purple-400 text-lg">
                        {standing.totalPoints}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between gap-4 flex-wrap">
          <button
            onClick={() => navigate('/slot-team-match')}
            className="backdrop-blur-md bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-md transition-colors flex items-center"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Matches
          </button>

          <div className="flex gap-4 flex-wrap">
            <button
              onClick={exportToExcel}
              className="bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white px-6 py-3 rounded-md flex items-center transition-all hover:shadow-lg"
            >
              <Download size={18} className="mr-2" />
              Export to Excel
            </button>

            <button
              onClick={() => {
                // Save current matches
                localStorage.setItem('slotTeamMatchResults', JSON.stringify(matches));
                
                // Save standings to history
                const history = JSON.parse(localStorage.getItem('slotTeamHistory') || '[]');
                const newEntry = {
                  id: Date.now(),
                  date: new Date().toLocaleString(),
                  standings: standings,
                  matches: matches
                };
                history.push(newEntry);
                localStorage.setItem('slotTeamHistory', JSON.stringify(history));
                
                // Clear current match data
                localStorage.removeItem('slotTeamMatchResults');
                
                navigate('/games');
              }}
              className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white px-6 py-3 rounded-md flex items-center transition-all hover:shadow-lg"
            >
              <Save size={18} className="mr-2" />
              Save & Exit
            </button>
          </div>
        </div>
      </div>
    </ConfigLayout>
  );
};

export default SlotTeamFinalResult;
