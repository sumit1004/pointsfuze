import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, Save, FileSpreadsheet } from 'lucide-react';
import ConfigLayout from '../components/layouts/ConfigLayout';
import { utils, writeFile } from 'xlsx';
import html2canvas from 'html2canvas';
import { useAuth } from '../context/AuthContext';
import { saveHistoryToDb, saveTournamentToDb, incrementDownloadStat } from '../lib/db';

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
  tournamentName?: string;
  tournamentDate?: string;
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
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentDate, setTournamentDate] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const loadData = () => {
      const gameConf = JSON.parse(localStorage.getItem('slotTeamGameConfig') || '{}');
      const savedMatches = localStorage.getItem('slotTeamMatchResults');

      if (savedMatches) {
        const parsedMatches = JSON.parse(savedMatches);
        setMatches(parsedMatches);
        
        // Get tournament info from first match
        if (parsedMatches.length > 0) {
          setTournamentName(parsedMatches[0].tournamentName || '');
          setTournamentDate(parsedMatches[0].tournamentDate || '');
        }
        
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

    if (user) {
      incrementDownloadStat(user.uid, false);
    }
  };

  const downloadPointsTableTemplate = async (templateId: number) => {
    const gameConfig = JSON.parse(localStorage.getItem('slotTeamGameConfig') || '{}');
    const killPoints = gameConfig.killPoints || 5;
    
    const rows = standings.map((team, index) => {
      let medalColor = '';
      if (index === 0) medalColor = '#FFD700';
      else if (index === 1) medalColor = '#C0C0C0';
      else if (index === 2) medalColor = '#CD7F32';

      const killPointsTotal = team.totalKills * killPoints;
      return `<tr style="${index < 3 ? `background-color: rgba(${index === 0 ? '255,215,0' : index === 1 ? '192,192,192' : '205,127,50'}, 0.15);` : ''}">
        <td style="font-weight: bold; color: ${medalColor || '#000000ff'};">${index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}</td>
        <td style="font-weight: 600;">${team.teamName}</td>
        <td style="text-align: center;">${team.boyaahCount}</td>
        <td style="text-align: center; font-weight: 500;">${killPointsTotal}</td>
        <td style="text-align: center; font-weight: 500;">${team.totalPositionPoints}</td>
        <td style="text-align: center; font-weight: bold; font-size: 16px;">${team.totalPoints}</td>
      </tr>`;
    }).join('');

    let htmlContent = '';

    if (templateId === 1) {
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${tournamentName || 'Tournament'} - Points Table</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { font-family: 'Segoe UI', 'Arial', sans-serif; background: #ffffff; padding: 40px 20px; }
            .container { max-width: 1200px; margin: 0 auto; background: #ffffff; }
            .header { text-align: center; margin-bottom: 50px; }
            .tournament-title { font-size: 48px; font-weight: 800; color: #1f2937; }
            .badge { font-size: 25px; font-weight: 800; margin-top: 15px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #1f2937; color: white; padding: 16px; text-transform: uppercase; }
            td { padding: 16px; border-bottom: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="tournament-title">${tournamentName}</div>
              <div class="badge">Overall STANDINGS</div>
            </div>
            <table>
              <thead><tr><th>RANK</th><th>TEAM</th><th>BOYAAHS</th><th>KILL PTS</th><th>POS PTS</th><th>TOTAL PTS</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </body>
        </html>
      `;
    } else if (templateId === 2) {
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { background: #1a1a2e; color: #fff; font-family: sans-serif; padding: 40px; }
            .container { background: #16213e; border: 3px solid #00d4ff; padding: 60px; }
            th { background: #00d4ff; color: #1a1a2e; }
            td { border-bottom: 1px solid #00d4ff; }
          </style>
        </head>
        <body>
          <div class="container">
            <div style="text-align: center; font-size: 52px; font-weight: 900;">${tournamentName}</div>
            <table>
              <thead><tr><th>RANK</th><th>TEAM</th><th>BOYAAHS</th><th>KILL PTS</th><th>POS PTS</th><th>TOTAL</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </body>
        </html>
      `;
    } else if (templateId === 3) {
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { background: #0a0e27; color: #fff; font-family: sans-serif; padding: 40px; }
            .container { background: #1f2937; border: 2px solid #f97316; padding: 60px; }
            th { background: #f97316; color: white; }
          </style>
        </head>
        <body>
          <div class="container">
            <div style="text-align: center; font-size: 56px; font-weight: 900;">${tournamentName}</div>
            <table>
              <thead><tr><th>RANK</th><th>TEAM</th><th>BOYAAHS</th><th>KILL PTS</th><th>POS PTS</th><th>TOTAL</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </body>
        </html>
      `;
    } else if (templateId === 4) {
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { background: #0f0f0f; color: #fff; font-family: serif; padding: 40px; }
            .container { background: #1f1f1f; border: 3px solid #d4af37; padding: 60px; }
            th { background: #d4af37; color: #000; }
          </style>
        </head>
        <body>
          <div class="container">
            <div style="text-align: center; font-size: 54px; font-weight: 900; color: #d4af37;">${tournamentName}</div>
            <table>
              <thead><tr><th>RANK</th><th>TEAM</th><th>BOYAAHS</th><th>KILL PTS</th><th>POS PTS</th><th>TOTAL</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </body>
        </html>
      `;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, { scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${tournamentName}-Standings.png`;
      link.click();
      if (user) {
        incrementDownloadStat(user.uid, false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      document.body.removeChild(tempDiv);
      setShowTemplateModal(false);
    }
  };

  return (
    <ConfigLayout title="Final Results - Slot & Team Calculator">
      <div className="space-y-8">
        {(tournamentName || tournamentDate) && (
          <div className="backdrop-blur-md bg-gradient-to-r from-purple-600/20 to-purple-800/20 border border-purple-400/30 rounded-lg p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                {tournamentName && (
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{tournamentName}</h1>
                )}
                {tournamentDate && (
                  <p className="text-gray-300 text-lg">📅 {new Date(tournamentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                )}
              </div>
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
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-purple-400">
                        #{index + 1}
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
        <div className="flex justify-end gap-4 flex-wrap">

          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md flex items-center transition-colors"
            >
              <Download size={18} className="mr-2" />
              Download Template
            </button>

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
                  matches: matches,
                  tournamentName: tournamentName
                };
                history.push(newEntry);
                localStorage.setItem('slotTeamHistory', JSON.stringify(history));
                
                if (user) {
                  saveTournamentToDb(user.uid, {
                    name: tournamentName || 'Tournament',
                    date: newEntry.date,
                    mode: 'Slot & Teams',
                    status: 'completed'
                  });

                  saveHistoryToDb(user.uid, {
                    tournamentName: tournamentName,
                    date: newEntry.date,
                    mode: 'Slot & Teams',
                    totalMatches: matches.length,
                    winner: standings[0]?.teamName || '',
                    pointsTable: standings
                  });
                }

                // Clear current match data
                localStorage.removeItem('slotTeamMatchResults');
                
                navigate('/dashboard');
              }}
              className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white px-6 py-3 rounded-md flex items-center transition-all hover:shadow-lg"
            >
              <Save size={18} className="mr-2" />
              Save & Exit
            </button>
          </div>
        </div>
      </div>

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-900 to-purple-800 px-6 py-6 border-b border-white/10">
              <h2 className="text-3xl font-bold text-white">Choose Your Template</h2>
              <p className="text-purple-200 text-sm mt-1">Select and download your tournament standings in your preferred style</p>
            </div>

            {/* Templates Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Template 1: Professional Corporate */}
              <div 
                onClick={() => downloadPointsTableTemplate(1)}
                className="cursor-pointer group"
              >
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden border-2 border-gray-300 hover:border-gray-400 transition-all duration-300 hover:shadow-xl hover:scale-105">
                  {/* Preview */}
                  <div className="aspect-video bg-white p-4 flex flex-col justify-center items-center border-b border-gray-300">
                    <div className="text-center w-full">
                      <h3 className="text-gray-800 font-bold text-lg mb-1">Tournament Name</h3>
                      <div className="w-full h-12 bg-gray-700 rounded mb-2"></div>
                      <div className="grid grid-cols-4 gap-1 w-full">
                        <div className="h-6 bg-gray-200 rounded"></div>
                        <div className="h-6 bg-gray-200 rounded"></div>
                        <div className="h-6 bg-gray-200 rounded"></div>
                        <div className="h-6 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                  {/* Details */}
                  <div className="p-4 bg-gray-50">
                    <h3 className="font-bold text-gray-800 mb-2">Professional Corporate</h3>
                    <button className="w-full bg-gray-700 hover:bg-gray-800 text-white py-2 rounded font-semibold text-sm transition-colors">
                      Download
                    </button>
                  </div>
                </div>
              </div>

              {/* Template 2: Gaming Victory */}
              <div 
                onClick={() => downloadPointsTableTemplate(2)}
                className="cursor-pointer group"
              >
                <div className="bg-gradient-to-br from-blue-950 to-blue-900 rounded-lg overflow-hidden border-2 border-cyan-400 hover:border-cyan-300 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-105">
                  {/* Preview */}
                  <div className="aspect-video bg-blue-900 bg-opacity-50 p-4 flex flex-col justify-center items-center border-b border-cyan-400">
                    <div className="text-center w-full">
                      <h3 className="text-cyan-400 font-bold text-lg mb-1"> Tournament Name</h3>
                      <div className="w-full h-1 bg-cyan-400 mb-3"></div>
                      <div className="grid grid-cols-4 gap-1 w-full">
                        <div className="h-6 bg-cyan-400/30 rounded"></div>
                        <div className="h-6 bg-cyan-400/30 rounded"></div>
                        <div className="h-6 bg-cyan-400/30 rounded"></div>
                        <div className="h-6 bg-cyan-400/30 rounded"></div>
                      </div>
                    </div>
                  </div>
                  {/* Details */}
                  <div className="p-4 bg-blue-950">
                    <h3 className="font-bold text-cyan-400 mb-2">Gaming Victory</h3>
                    <button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded font-semibold text-sm transition-colors">
                      Download
                    </button>
                  </div>
                </div>
              </div>

              {/* Template 3: Esports Championship */}
              <div 
                onClick={() => downloadPointsTableTemplate(3)}
                className="cursor-pointer group"
              >
                <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-lg overflow-hidden border-2 border-orange-500 hover:border-orange-400 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105">
                  {/* Preview */}
                  <div className="aspect-video bg-gray-800 p-4 flex flex-col justify-center items-center border-b border-orange-500">
                    <div className="text-center w-full">
                      <h3 className="text-orange-500 font-black text-lg mb-1"> TOURNAMENT NAME</h3>
                      <div className="w-full h-1 bg-orange-500 mb-3"></div>
                      <div className="grid grid-cols-4 gap-1 w-full">
                        <div className="h-6 bg-orange-500/30 rounded"></div>
                        <div className="h-6 bg-orange-500/30 rounded"></div>
                        <div className="h-6 bg-orange-500/30 rounded"></div>
                        <div className="h-6 bg-orange-500/30 rounded"></div>
                      </div>
                    </div>
                  </div>
                  {/* Details */}
                  <div className="p-4 bg-gray-900">
                    <h3 className="font-bold text-orange-500 mb-2">Esports Championship</h3>
                    <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded font-semibold text-sm transition-colors">
                      Download
                    </button>
                  </div>
                </div>
              </div>

              {/* Template 4: Elite Tournament */}
              <div 
                onClick={() => downloadPointsTableTemplate(4)}
                className="cursor-pointer group"
              >
                <div className="bg-gradient-to-br from-black to-gray-900 rounded-lg overflow-hidden border-2 border-yellow-600 hover:border-yellow-400 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/30 hover:scale-105">
                  {/* Preview */}
                  <div className="aspect-video bg-black p-4 flex flex-col justify-center items-center border-b border-yellow-600">
                    <div className="text-center w-full">
                      <h3 className="text-yellow-600 font-black italic text-lg mb-1"> TOURNAMENT NAME</h3>
                      <div className="w-full h-1 bg-yellow-600 mb-3"></div>
                      <div className="grid grid-cols-4 gap-1 w-full">
                        <div className="h-6 bg-yellow-600/30 rounded"></div>
                        <div className="h-6 bg-yellow-600/30 rounded"></div>
                        <div className="h-6 bg-yellow-600/30 rounded"></div>
                        <div className="h-6 bg-yellow-600/30 rounded"></div>
                      </div>
                    </div>
                  </div>
                  {/* Details */}
                  <div className="p-4 bg-black">
                    <h3 className="font-bold text-yellow-600 mb-2">Elite Tournament</h3>
                    
                    <button className="w-full bg-yellow-700 hover:bg-yellow-800 text-white py-2 rounded font-semibold text-sm transition-colors">
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-950 border-t border-white/10 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfigLayout>
  );
};

export default SlotTeamFinalResult;
