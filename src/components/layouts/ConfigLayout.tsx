import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutDashboard, PlusCircle, History as HistoryIcon, ArrowLeft } from 'lucide-react';

interface ConfigLayoutProps {
  title: string;
  onBack?: () => void; // Kept for compatibility but unused
  children: React.ReactNode;
}

const ConfigLayout: React.FC<ConfigLayoutProps> = ({ title, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
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
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all backdrop-blur-md border border-white/5 shadow-md flex items-center justify-center group"
            title="Go Back"
          >
            <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-cyan-400">
            {title}
          </h1>
        </div>
        
        {children}
      </div>
    </div>
  );
};

export default ConfigLayout;
