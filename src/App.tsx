import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import Games from './pages/Games';
import AllGamesConfig from './pages/AllGamesConfig';
import MatchCalculator from './pages/MatchCalculator';
import FinalResult from './pages/FinalResult';
import TournamentHistory from './pages/TournamentHistory';
import SlotTeamConfig from './pages/SlotTeamConfig';
import SlotTeamMatch from './pages/SlotTeamMatch';
import SlotTeamFinalResult from './pages/SlotTeamFinalResult';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/games" element={<Games />} />
        <Route path="/all-games-config" element={<AllGamesConfig />} />
        <Route path="/match-calculator" element={<MatchCalculator />} />
        <Route path="/final-result" element={<FinalResult />} />
        <Route path="/tournament-history" element={<TournamentHistory />} />
        <Route path="/slot-team-config" element={<SlotTeamConfig />} />
        <Route path="/slot-team-match" element={<SlotTeamMatch />} />
        <Route path="/slot-team-final-result" element={<SlotTeamFinalResult />} />
        <Route path="*" element={<Navigate to="/games" replace />} />
      </Routes>
    </Router>
  );
}

export default App;