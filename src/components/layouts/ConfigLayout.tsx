import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, PlusCircle, History as HistoryIcon } from 'lucide-react';

interface ConfigLayoutProps {
  title: string;
  onBack?: () => void; // Kept for compatibility but unused
  children: React.ReactNode;
}

const ConfigLayout: React.FC<ConfigLayoutProps> = ({ title, children }) => {
  const location = useLocation();
  
  return (
    <div className="min-h-screen relative text-gray-100 p-6 pt-4">
      <div className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat" 
        style={{ backgroundImage: 'url("/public/background.jpg")', zIndex: -1 }} />
      <div className="fixed inset-0 bg-black/70" style={{ zIndex: -1 }} />
      
      {/* Top Navbar */}
      <nav className="relative max-w-7xl mx-auto mb-8 bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-wrap justify-between items-center shadow-lg gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <Home size={18} /> <span className="font-semibold">Home</span>
          </Link>
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <LayoutDashboard size={18} /> <span className="font-semibold">Dashboard</span>
          </Link>
          <Link to="/tournament-history" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <HistoryIcon size={18} /> <span className="font-semibold">History</span>
          </Link>
        </div>
        
        {location.pathname === '/dashboard' && (
          <Link 
            to="/games" 
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white px-5 py-2 rounded-lg font-bold hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all"
          >
            <PlusCircle size={18} /> Create Tournament
          </Link>
        )}
      </nav>

      <div className="relative max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-cyan-400">
          {title}
        </h1>
        
        {children}
      </div>
    </div>
  );
};

export default ConfigLayout;
