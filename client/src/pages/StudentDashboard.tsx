import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';

interface Session {
  id: string;
  startTime: string;
  endTime: string;
  topic: string;
  status: string;
  notes: string;
  aiReview: string | null;
  classMode?: string;
  classAssetUrl?: string;
  tutor: {
    name: string;
    email: string;
  };
}

const renderClassAsset = (session: Session) => {
  if (!session.classMode || !session.classAssetUrl) return null;

  const url = session.classAssetUrl.startsWith('http') ? session.classAssetUrl : `http://localhost:5000${session.classAssetUrl}`;

  if (session.classMode === 'VIDEO_CALL') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors w-full">
        🎥 Join Live Video Call
      </a>
    );
  }
  
  if (session.classMode === 'RECORDING') {
    return (
      <div className="mt-4 border border-glass-border rounded-xl overflow-hidden bg-black/50">
        <video controls src={url} className="w-full max-h-48 object-contain" />
      </div>
    );
  }

  if (session.classMode === 'NOTES') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors w-full border border-slate-600">
        📄 View/Download Attached Notes
      </a>
    );
  }

  return null;
}

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get('/sessions');
        setSessions(res.data);
      } catch (error) {
        console.error("Error fetching sessions", error);
      }
    };
    fetchSessions();
  }, []);

  const upcomingSessions = sessions.filter(s => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS');
  const pastSessions = sessions.filter(s => s.status === 'COMPLETED' || s.status === 'AI_REVIEWED');

  return (
    <div className="min-h-screen relative z-10 pb-20">
      {/* Background elements */}
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl z-[-1]"></div>
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 z-50"></div>

      <nav className="glass-panel border-x-0 border-t-0 rounded-none sticky top-0 z-40 mb-8 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <span className="text-sm font-bold text-white">TF</span>
              </div>
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                TutorFlow <span className="text-sm font-medium text-slate-500 ml-2 hidden sm:inline-block">Student Portal</span>
              </h1>
            </div>
            <div className="flex items-center space-x-6">
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <span className="text-xs text-slate-300 font-bold">{user?.name.charAt(0)}</span>
                </div>
                <span className="text-sm font-medium text-slate-300">Hello, {user?.name}</span>
              </div>
              <button onClick={logout} className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors">Sign Out</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-up">
        
        {/* Welcome Banner */}
        <div className="glass-panel p-8 mb-12 relative overflow-hidden border-cyan-500/20">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.name}! 👋</h2>
            <p className="text-slate-400 max-w-2xl">Check your upcoming classes, review past notes, and stay on top of your personalized homework assignments.</p>
          </div>
        </div>

        {/* Upcoming Sessions */}
        <section className="mb-16">
          <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span>📅 Upcoming Classes</span>
            <span className="flex-1 h-px bg-glass-border"></span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingSessions.map(session => (
              <div key={session.id} className="glass-panel p-5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-blue-500"></div>
                {session.status === 'IN_PROGRESS' && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/20 rounded-bl-full blur-xl group-hover:bg-cyan-500/40 transition-colors"></div>
                )}
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <h3 className="font-semibold text-lg text-white pr-2 line-clamp-1" title={session.topic}>{session.topic}</h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md whitespace-nowrap ${session.status === 'IN_PROGRESS' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                    {session.status === 'IN_PROGRESS' ? 'Live Now' : 'Scheduled'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mb-5 relative z-10">
                  <span className="text-slate-500 text-sm">👨‍🏫 Tutor:</span>
                  <p className="text-sm font-medium text-slate-300">{session.tutor.name}</p>
                </div>
                
                <div className="text-xs text-slate-400 flex flex-col space-y-1.5 relative z-10 bg-slate-900/50 p-3 rounded-lg border border-glass-border">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-500">▶</span>
                    <span>{new Date(session.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-500">■</span>
                    <span>{new Date(session.endTime).toLocaleTimeString([], { timeStyle: 'short' })}</span>
                  </div>
                </div>

                {/* Show Class Asset if Live */}
                {session.status === 'IN_PROGRESS' && (
                  <div className="relative z-10">
                    {renderClassAsset(session)}
                  </div>
                )}
              </div>
            ))}
            {upcomingSessions.length === 0 && (
              <div className="col-span-full glass-panel p-8 text-center flex flex-col items-center justify-center border-dashed">
                <span className="text-4xl mb-3 opacity-50">✨</span>
                <p className="text-slate-400 font-medium">No upcoming classes scheduled.</p>
                <p className="text-sm text-slate-500 mt-1">Enjoy your free time!</p>
              </div>
            )}
          </div>
        </section>

        {/* Past Sessions & Homework */}
        <section>
          <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span>📚 Completed Classes & Homework</span>
            <span className="flex-1 h-px bg-glass-border"></span>
          </h3>
          
          <div className="flex flex-col space-y-8">
            {pastSessions.map(session => {
              const aiReview = session.aiReview ? JSON.parse(session.aiReview) : null;
              
              return (
                <div key={session.id} className="glass-panel p-6 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                    <div>
                      <h3 className="font-bold text-xl text-white">{session.topic}</h3>
                      <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                        <span>📅 {new Date(session.startTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        <span className="text-slate-600">•</span>
                        <span>👨‍🏫 {session.tutor.name}</span>
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Completed
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    {/* Read-only Notes */}
                    <div className="bg-slate-900/60 p-5 rounded-xl border border-glass-border flex flex-col">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="text-brand-primary">📝</span> Class Notes
                      </h4>
                      <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed flex-1">
                        {session.notes || <span className="text-slate-500 italic">No notes were provided for this class.</span>}
                      </div>
                    </div>

                    {/* AI Homework & Review */}
                    <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 p-5 rounded-xl border border-emerald-500/20 flex flex-col">
                      <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span>✨ Homework & AI Review</span>
                      </h4>
                      {aiReview ? (
                        <div className="text-sm text-slate-300 space-y-4 flex-1">
                          <div>
                            <strong className="block mb-1 text-white">Summary:</strong>
                            <p className="text-slate-400">{aiReview.summary}</p>
                          </div>
                          <div>
                            <strong className="block mb-2 text-white">Homework Tasks:</strong>
                            <ul className="space-y-2">
                              {aiReview.homework.map((hw: string, i: number) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-emerald-400 mt-0.5">•</span>
                                  <span>{hw}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <p className="text-sm text-slate-500 italic border border-dashed border-slate-700 p-4 rounded-lg">Your tutor hasn't generated the homework for this class yet.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Show Class Asset if Completed */}
                  <div className="mt-6 relative z-10">
                    {renderClassAsset(session)}
                  </div>
                </div>
              );
            })}
            {pastSessions.length === 0 && (
              <div className="glass-panel p-8 text-center flex flex-col items-center justify-center border-dashed">
                <span className="text-4xl mb-3 opacity-50">📚</span>
                <p className="text-slate-400 font-medium">You haven't completed any classes yet.</p>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
};

export default StudentDashboard;
