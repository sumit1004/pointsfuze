import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';

import Games from './pages/Games';
import AllGamesConfig from './pages/AllGamesConfig';
import MatchCalculator from './pages/MatchCalculator';
import FinalResult from './pages/FinalResult';
import TournamentHistory from './pages/TournamentHistory';
import SlotTeamConfig from './pages/SlotTeamConfig';
import SlotTeamMatch from './pages/SlotTeamMatch';
import SlotTeamFinalResult from './pages/SlotTeamFinalResult';
import TotalScore from './pages/TotalScore';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/games" element={<ProtectedRoute><Games /></ProtectedRoute>} />
          <Route path="/all-games-config" element={<ProtectedRoute><AllGamesConfig /></ProtectedRoute>} />
          <Route path="/match-calculator" element={<ProtectedRoute><MatchCalculator /></ProtectedRoute>} />
          <Route path="/final-result" element={<ProtectedRoute><FinalResult /></ProtectedRoute>} />
          <Route path="/tournament-history" element={<ProtectedRoute><TournamentHistory /></ProtectedRoute>} />
          <Route path="/slot-team-config" element={<ProtectedRoute><SlotTeamConfig /></ProtectedRoute>} />
          <Route path="/slot-team-match" element={<ProtectedRoute><SlotTeamMatch /></ProtectedRoute>} />
          <Route path="/slot-team-final-result" element={<ProtectedRoute><SlotTeamFinalResult /></ProtectedRoute>} />
          <Route path="/total-score" element={<ProtectedRoute><TotalScore /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;