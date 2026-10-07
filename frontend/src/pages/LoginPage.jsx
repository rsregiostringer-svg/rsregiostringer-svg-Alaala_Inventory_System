import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Lock, User, ShieldAlert, Sparkles } from 'lucide-react';
import bgImage from '../assets/DONATION BOX (2).png';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div
      className="min-h-screen bg-[#F0F2F5] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url("${bgImage}")` }}
    >
      {/* Optional dark overlay to make text more readable against the background */}
      <div className="absolute inset-0 bg-slate-900/50 pointer-events-none" />

      {/* Background Ambient Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          {/* 
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-700/20 border border-[#0866FF]/50 items-center justify-center shadow-xl mb-4">
            <span className="font-serif font-black text-3xl text-blue-500">Alaala Funeraal Homes</span>
          </div> 
          */}
          <h1 className="text-2xl font-serif font-bold tracking-wider text-white">
            ALAALA FUNERAL HOMES
          </h1>
          <p className="text-xs uppercase tracking-widest text-white/90 font-medium mt-1">
            Operations & Inventory Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">System Authentication</h2>
          <p className="text-xs text-slate-300 mb-6">Enter your authorized credentials to access records.</p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-300">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-slate-200">
              <Input
                label={<span className="text-slate-200">Username</span>}
                id="username"
                type="text"
                icon={User}
                placeholder="e.g. admin or staff"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="!bg-slate-800/50 !border-slate-600/50 !text-white placeholder:!text-slate-400 focus:!bg-slate-800/80 focus:!border-blue-500 !shadow-inner backdrop-blur-md transition-all"
              />
            </div>

            <div className="text-slate-200">
              <Input
                label={<span className="text-slate-200">Password</span>}
                id="password"
                type="password"
                icon={Lock}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="!bg-slate-800/50 !border-slate-600/50 !text-white placeholder:!text-slate-400 focus:!bg-slate-800/80 focus:!border-blue-500 !shadow-inner backdrop-blur-md transition-all"
              />
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" loading={loading} className="w-full py-2.5 shadow-lg shadow-blue-600/20">
                Sign In to System
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Forgot password?{' '}
              <span className="text-blue-400 font-medium cursor-pointer hover:text-blue-300 transition-colors">
                Contact administrator
              </span>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-white/50 mt-8">
          &copy; {new Date().getFullYear()} Alaala Funeral Homes. All rights reserved.
        </p>
      </div>
    </div >
  );
}
