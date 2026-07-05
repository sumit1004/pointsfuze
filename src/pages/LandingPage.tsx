import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { Zap, Trophy, Users, FileSpreadsheet, Download, History, Shield, Star, Clock } from 'lucide-react';
import '../styles/typing.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error logging out", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <Zap className="h-8 w-8 text-purple-500 animate-pulse" />
              <span className="font-bold text-xl tracking-wider">PointFuze</span>
            </div>
            
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#home" className="text-gray-300 hover:text-white transition-colors">Home</a>
                <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
                <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="text-sm font-medium text-white hover:text-cyan-400 transition-colors"
                  >
                    Dashboard
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => navigate('/login')}
                  className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 px-4 relative">
        <div className="absolute inset-0 bg-[url('/background.jpg')] bg-cover bg-center opacity-20 z-0"></div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-block p-4 bg-white/5 rounded-3xl backdrop-blur-sm border border-white/10 mb-6">
            <img src="/logos.png" alt="Logo" className="h-16 mx-auto animate-pulse drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            Professional Tournament Management & <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">Points Calculation Platform</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
            Manage tournaments, calculate standings, download professional leaderboards and organize esports tournaments effortlessly.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => navigate(user ? '/dashboard' : '/signup')}
              className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105"
            >
              Get Started
            </button>
            <a 
              href="#pricing"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all border border-white/10 hover:scale-105 inline-flex items-center justify-center"
            >
              View Pricing
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need to organize</h2>
            <p className="text-gray-400 text-lg">Powerful features designed for esports organizers and communities.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Tournament Management', icon: Trophy, desc: 'Create and manage multiple tournaments seamlessly.' },
              { title: 'Points Calculator', icon: Zap, desc: 'Auto-calculate points based on kills and placements.' },
              { title: 'Total Score Calculator', icon: Star, desc: 'Directly input total scores for rapid leaderboard generation.' },
              { title: 'Professional Templates', icon: Shield, desc: 'Export standings in premium HTML/Image templates.' },
              { title: 'Excel Import', icon: FileSpreadsheet, desc: 'Bulk import teams and rosters via Excel.' },
              { title: 'Excel Export', icon: Download, desc: 'Download comprehensive statistics and points tables.' },
              { title: 'Tournament History', icon: History, desc: 'Never lose a result with automatic cloud sync.' },
              { title: 'Fast Results', icon: Clock, desc: 'Real-time calculations that keep your community engaged.' }
            ].map((feature, i) => (
              <div key={i} className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700 hover:border-purple-500/50 transition-colors group">
                <div className="bg-purple-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/40 transition-colors">
                  <feature.icon className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400 text-lg">Choose the plan that fits your organization's needs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 flex flex-col">
              <h3 className="text-2xl font-bold mb-2 text-gray-300">Free</h3>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">$0</span>
                <span className="text-gray-500"> / forever</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center text-gray-300"><Zap className="w-5 h-5 text-green-400 mr-2" /> Up to 3 Tournaments</li>
                <li className="flex items-center text-gray-300"><Zap className="w-5 h-5 text-green-400 mr-2" /> Basic Templates</li>
                <li className="flex items-center text-gray-300"><Zap className="w-5 h-5 text-green-400 mr-2" /> Local Storage Only</li>
              </ul>
              <button 
                onClick={() => navigate('/signup')}
                className="w-full py-3 rounded-xl font-bold bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Get Started
              </button>
            </div>

            {/* Weekly */}
            <div className="bg-gradient-to-b from-purple-900/50 to-gray-900 border border-purple-500 rounded-3xl p-8 flex flex-col relative transform md:-translate-y-4 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2 text-purple-400">Weekly</h3>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">$4.99</span>
                <span className="text-gray-500"> / week</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center text-gray-100"><Zap className="w-5 h-5 text-purple-400 mr-2" /> Unlimited Tournaments</li>
                <li className="flex items-center text-gray-100"><Zap className="w-5 h-5 text-purple-400 mr-2" /> All Premium Templates</li>
                <li className="flex items-center text-gray-100"><Zap className="w-5 h-5 text-purple-400 mr-2" /> Cloud Database Sync</li>
                <li className="flex items-center text-gray-100"><Zap className="w-5 h-5 text-purple-400 mr-2" /> Excel Exports</li>
              </ul>
              <button 
                onClick={() => navigate('/signup')}
                className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 transition-opacity"
              >
                Subscribe Now
              </button>
            </div>

            {/* Monthly */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 flex flex-col">
              <h3 className="text-2xl font-bold mb-2 text-cyan-400">Monthly</h3>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">$14.99</span>
                <span className="text-gray-500"> / month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center text-gray-300"><Zap className="w-5 h-5 text-cyan-400 mr-2" /> Everything in Weekly</li>
                <li className="flex items-center text-gray-300"><Zap className="w-5 h-5 text-cyan-400 mr-2" /> Priority Support</li>
                <li className="flex items-center text-gray-300"><Zap className="w-5 h-5 text-cyan-400 mr-2" /> Early Access Features</li>
                <li className="flex items-center text-gray-300"><Zap className="w-5 h-5 text-cyan-400 mr-2" /> Save 25%</li>
              </ul>
              <button 
                onClick={() => navigate('/signup')}
                className="w-full py-3 rounded-xl font-bold bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700"
              >
                Subscribe Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} PointFuze. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
