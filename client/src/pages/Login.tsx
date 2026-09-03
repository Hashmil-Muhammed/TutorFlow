import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
      
      if (res.data.user.role === 'TUTOR') {
        navigate('/tutor-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm z-[-1]"></div>
      
      <div className="max-w-md w-full space-y-8 glass-panel p-10 animate-fade-in-up relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-secondary/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-2xl font-bold text-white">TF</span>
            </div>
          </div>
          <h2 className="text-center text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            Welcome to TutorFlow
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Log in to manage your premium learning sessions
          </p>
        </div>
        
        <form className="mt-8 space-y-6 relative z-10" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="label-text" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label-text" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full btn-primary flex justify-center items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-glass-border">
            <p className="text-xs text-slate-400 text-center mb-3 uppercase tracking-wider font-semibold">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 p-3 rounded-lg border border-glass-border text-center cursor-pointer hover:border-brand-primary/50 transition-colors" onClick={() => {setEmail('tutor@tutorflow.com'); setPassword('password123');}}>
                <p className="text-xs font-semibold text-brand-primary">Tutor</p>
                <p className="text-[10px] text-slate-400 truncate">tutor@tutorflow.com</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-glass-border text-center cursor-pointer hover:border-brand-secondary/50 transition-colors" onClick={() => {setEmail('student@tutorflow.com'); setPassword('password123');}}>
                <p className="text-xs font-semibold text-brand-secondary">Student</p>
                <p className="text-[10px] text-slate-400 truncate">student@tutorflow.com</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
