import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfigLayout from '../components/layouts/ConfigLayout';
import { Download, ArrowLeft, Trophy } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import html2canvas from 'html2canvas';

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
  tournamentName?: string;
  tournamentDate?: string;
}

const FinalResult: React.FC = () => {
  const navigate = useNavigate();
  const [finalResults, setFinalResults] = useState<TeamTotalScore[]>([]);
  const [semifinals, setSemifinals] = useState<Match[]>([]);
  const [finals, setFinals] = useState<Match[]>([]);
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentDate, setTournamentDate] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);

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

      // Get tournament info from first match
      if (matches.length > 0) {
        setTournamentName(matches[0].tournamentName || '');
        setTournamentDate(matches[0].tournamentDate || '');
      }

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

    // Get tournament name from state or use default
    const finalTournamentName = tournamentName || 'Tournament';
    writeFile(workbook, `${finalTournamentName}_Complete_Results.xlsx`);
  };

  const handleSaveToHistory = () => {
    try {
      const historyData = JSON.parse(localStorage.getItem('tournamentHistory') || '[]');

      const tournamentData = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        name: tournamentName || 'Tournament',
        standings: finalResults,
        matches: JSON.parse(localStorage.getItem('matchResults') || '[]'),
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

  const downloadPointsTableTemplate = async (templateId: number) => {
    const rows = finalResults.map((team, index) => {
      let medalColor = '';
      if (index === 0) medalColor = '#FFD700'; // Gold
      else if (index === 1) medalColor = '#C0C0C0'; // Silver
      else if (index === 2) medalColor = '#CD7F32'; // Bronze

      return `
      <tr style="${index < 3 ? `background-color: rgba(${index === 0 ? '255,215,0' : index === 1 ? '192,192,192' : '205,127,50'}, 0.15);` : ''}">
        <td style="font-weight: bold; color: ${medalColor || '#000000ff'};">${index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}</td>
        <td style="font-weight: 600;">${team.teamName}</td>
        <td style="text-align: center;">${team.boyaahCount > 0 ? `x${team.boyaahCount}` : '—'}</td>
        <td style="text-align: center;">${team.totalKills}</td>
        <td style="text-align: center; font-weight: 500;">${team.totalPositionPoints}</td>
        <td style="text-align: center; font-weight: bold; font-size: 16px;">${team.totalPoints}</td>    
      </tr>
    `}).join('');

    const formattedDate = new Date(tournamentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let htmlContent = '';

    if (templateId === 1) {
      // Template 1: Professional Corporate
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${tournamentName} - Points Table</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              font-family: 'Segoe UI', 'Arial', sans-serif;
              background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
              color: #222;
              padding: 40px 20px;
              min-height: 100vh;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              background: #ffffffff;
              border-radius: 12px;
              padding: 60px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 50px;
              padding-bottom: 30px;
              border-bottom: 3px solid #1f2937;
            }
            .tournament-title {
              font-size: 48px;
              font-weight: 800;
              color: #1f2937;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .tournament-date {
              font-size: 16px;
              color: #6b7280;
              font-weight: 500;
              margin-bottom: 5px;
            }
            .badge {
              display: inline-block;
              
              color: black;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 25px;
              font-weight: 700;
              margin-top: 15px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 30px;
            }
            th {
              background: #1f2937;
              color: white;
              padding: 16px;
              text-align: left;
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              border: none;
            }
            td {
              padding: 16px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 15px;
              color: #374151;
            }
            tr:last-child td {
              border-bottom: none;
            }
            tr:hover {
              background: #000000ff;
            }
            @media (max-width: 768px) {
              .container { padding: 30px 20px; }
              .tournament-title { font-size: 32px; }
              th, td { padding: 12px 8px; font-size: 14px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="tournament-title">${tournamentName}</div>
              <div class="badge">Overall STANDINGS</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 60px;">RANK</th>
                  <th>TEAM</th>
                  <th style="width: 100px; text-align: center;">BOYAAHS</th>
                  <th style="width: 100px; text-align: center;">KILLS</th>
                  <th style="width: 100px; text-align: center;">POS PTS</th>
                  <th style="width: 100px; text-align: center;">TOTAL PTS</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;
    } else if (templateId === 2) {
      // Template 2: Gaming Victory
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${tournamentName} - Points Table</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              font-family: 'Arial', sans-serif;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
              color: #fff;
              padding: 40px 20px;
              min-height: 100vh;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              background: rgba(22, 33, 62, 0.95);
              border: 3px solid #00d4ff;
              border-radius: 8px;
              padding: 60px;
              box-shadow: 0 0 40px rgba(0, 212, 255, 0.3), inset 0 0 40px rgba(0, 212, 255, 0.05);
            }
            .header {
              text-align: center;
              margin-bottom: 50px;
              padding-bottom: 30px;
              border-bottom: 2px solid #00d4ff;
            }
            .tournament-title {
              font-size: 52px;
              font-weight: 900;
              // background: linear-gradient(90deg, #00d4ff 0%, #0099ff 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 3px;
            }
           
            .badge {
                 display: inline-block;
              
              color: black;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 25px;
              font-weight: 700;
              margin-top: 15px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 30px;
            }
            th {
              background: linear-gradient(90deg, #00d4ff, #0099ff);
              color: #1a1a2e;
              padding: 16px;
              text-align: left;
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            td {
              padding: 16px;
              border-bottom: 1px solid rgba(0, 212, 255, 0.2);
              font-size: 15px;
            }
            tr:last-child td {
              border-bottom: none;
            }
            tr:hover {
              background: rgba(0, 212, 255, 0.1);
            }
            @media (max-width: 768px) {
              .container { padding: 30px 20px; }
              .tournament-title { font-size: 36px; }
              th, td { padding: 12px 8px; font-size: 14px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="tournament-title"> ${tournamentName}</div>
        <div class="badge">Overall STANDINGS</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 80px;">RANK</th>
                  <th>TEAM</th>
                  <th style="width: 100px; text-align: center;">BOYAAHS</th>
                  <th style="width: 100px; text-align: center;">KILLS</th>
                  <th style="width: 100px; text-align: center;">POS PTS</th>
                  <th style="width: 100px; text-align: center;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;
    } else if (templateId === 3) {
      // Template 3: Esports Championship
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${tournamentName} - Points Table</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              font-family: 'Arial Black', sans-serif;
              background: linear-gradient(135deg, #0a0e27 0%, #1a1a3e 100%);
              color: #fff;
              padding: 40px 20px;
              min-height: 100vh;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
              border: 2px solid #f97316;
              border-radius: 4px;
              padding: 60px;
              box-shadow: 0 0 60px rgba(249, 115, 22, 0.4);
            }
            .header {
              text-align: center;
              margin-bottom: 50px;
              padding-bottom: 30px;
              border-bottom: 3px solid #f97316;
            }
            .tournament-title {
              font-size: 56px;
              font-weight: 900;
              color: #f97316;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 3px;
              text-shadow: 0 0 20px rgba(249, 115, 22, 0.5);
            }
            .tournament-date {
              font-size: 16px;
              color: #fbbf24;
              font-weight: 600;
            }
            .badge {
              display: inline-block;
              // background: #f97316;
              color: white;
              padding: 10px 24px;
              border-radius: 2px;
              font-size: 25px;
              font-weight: 900;
              margin-top: 15px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 30px;
            }
            th {
              background: #f97316;
              color: white;
              padding: 18px;
              text-align: left;
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            td {
              padding: 16px 18px;
              border-bottom: 1px solid #374151;
              font-size: 15px;
            }
            tr:last-child td {
              border-bottom: none;
            }
            tr:hover {
              background: rgba(249, 115, 22, 0.1);
            }
            @media (max-width: 768px) {
              .container { padding: 30px 20px; }
              .tournament-title { font-size: 40px; }
              th, td { padding: 12px 10px; font-size: 14px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="tournament-title"> ${tournamentName}</div>
   <div class="badge">Overall STANDINGS</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 80px;">RANK</th>
                  <th>TEAM</th>
                  <th style="width: 100px; text-align: center;">BOYAAHS</th>
                  <th style="width: 100px; text-align: center;">KILLS</th>
                  <th style="width: 100px; text-align: center;">POS PTS</th>
                  <th style="width: 100px; text-align: center;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;
    } else if (templateId === 4) {
      // Template 4: Elite Tournament
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${tournamentName} - Points Table</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              font-family: 'Georgia', serif;
              background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
              color: #fff;
              padding: 40px 20px;
              min-height: 100vh;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              background: #1f1f1f;
              border: 3px solid #d4af37;
              border-radius: 0px;
              padding: 60px;
              box-shadow: 0 0 50px rgba(212, 175, 55, 0.3), inset 0 0 30px rgba(212, 175, 55, 0.05);
            }
            .header {
              text-align: center;
              margin-bottom: 50px;
              padding-bottom: 40px;
              border-bottom: 3px solid #d4af37;
            }
            .tournament-title {
              font-size: 54px;
              font-weight: 900;
              color: #d4af37;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 4px;
              font-style: italic;
            }
           
            .badge {
              display: inline-block;
              // background: #d4af37;
              color: #ffffffff;
              padding: 12px 28px;
              border-radius: 0px;
              font-size: 25px;
              font-weight: 900;
              margin-top: 20px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 35px;
            }
            th {
              background: #d4af37;
              color: #1f1f1f;
              padding: 18px;
              text-align: left;
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            td {
              padding: 16px 18px;
              border-bottom: 2px solid #333;
              font-size: 15px;
            }
            tr:last-child td {
              border-bottom: none;
            }
            tr:hover {
              background: rgba(212, 175, 55, 0.08);
            }
            @media (max-width: 768px) {
              .container { padding: 30px 20px; }
              .tournament-title { font-size: 38px; }
              th, td { padding: 12px 10px; font-size: 14px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="tournament-title"> ${tournamentName}</div>
<div class="badge">Overall STANDINGS</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 80px;">RANK</th>
                  <th>TEAM</th>
                  <th style="width: 100px; text-align: center;">BOYAAHS</th>
                  <th style="width: 100px; text-align: center;">KILLS</th>
                  <th style="width: 100px; text-align: center;">POS PTS</th>
                  <th style="width: 100px; text-align: center;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;
    }

    // Create a temporary container and render HTML to image
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#fff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${tournamentName}-Points-Table-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate template image');
    } finally {
      document.body.removeChild(tempDiv);
      setShowTemplateModal(false);
    }
  };

  return (
    <ConfigLayout title="Final Tournament Results">
      <div className="space-y-6 px-4 sm:px-6 pb-32 sm:pb-6">
        {/* Tournament Info Section */}
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

        {/* Standings Table/Cards */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-4 sm:p-6 mb-24 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-purple-400 mb-4">Complete Standings</h2>

          {/* Mobile View - Cards */}
          <div className="sm:hidden space-y-3">
            {finalResults.map((team, index) => (
              <div key={team.teamName}
                className={`${index < 3 ? 'bg-gradient-to-r from-purple-900/50 to-purple-800/50' : 'bg-white/5'
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
                    <div className="text-gray-400">Boyaahs</div>
                    <div className="text-yellow-400 font-bold">
                      {team.boyaahCount > 0 ? `x${team.boyaahCount} 🏆` : '—'}
                    </div>
                  </div>
                  <div className="bg-black/20 rounded p-2">
                    <div className="text-gray-400">Total Kills</div>
                    <div className="text-cyan-400 font-bold">{team.totalKills}</div>
                  </div>
                  <div className="bg-black/20 rounded p-2">
                    <div className="text-gray-400">Pos Points</div>
                    <div className="text-white font-bold">{team.totalPositionPoints}</div>
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
                  <th className="text-left py-3 px-4">Boyaahs</th>
                  <th className="text-left py-3 px-4">Total Kills</th>
                  <th className="text-left py-3 px-4">Pos Points</th>
                  <th className="text-left py-3 px-4">Points</th>
                </tr>
              </thead>
              <tbody>
                {finalResults.map((team, index) => (
                  <tr key={team.teamName}
                    className={`${index < 3 ? 'bg-purple-900/20' : 'hover:bg-white/5'
                      } border-b border-white/5 transition-colors`}
                  >
                    <td className="py-3 px-4 font-bold">{index + 1}</td>
                    <td className="py-3 px-4 font-semibold text-white">{team.teamName}</td>
                    <td className="py-3 px-4">{team.matches}</td>
                    <td className="py-3 px-4 text-yellow-400 font-bold">
                      {team.boyaahCount > 0 ? `x${team.boyaahCount} 🏆` : '—'}
                    </td>
                    <td className="py-3 px-4 text-cyan-400">{team.totalKills}</td>
                    <td className="py-3 px-4">{team.totalPositionPoints}</td>
                    <td className="py-3 px-4 font-bold text-purple-400">{team.totalPoints}</td>
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
        <div className="fixed bottom-0 left-0 right-0 sm:relative sm:mt-6 bg-gray-900/80 backdrop-blur-md sm:bg-transparent sm:backdrop-blur-none border-t border-white/10 sm:border-0 z-10">
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
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center justify-center flex-1 sm:flex-none backdrop-blur-md bg-blue-500/20 border border-blue-500/20 
                hover:bg-blue-500/30 text-white px-6 py-3 rounded-lg transition-all 
                duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20"
              >
                <Download size={18} className="mr-2" />
                Download Template
              </button>
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
                Download Excel
              </button>
            </div>
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
                      <div className="grid grid-cols-3 gap-1 w-full">
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
                      <div className="grid grid-cols-3 gap-1 w-full">
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
                      <div className="grid grid-cols-3 gap-1 w-full">
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
                      <div className="grid grid-cols-3 gap-1 w-full">
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

export default FinalResult;
