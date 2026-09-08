import React, { useState, useEffect, useRef } from 'react';
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
  tutor: { name: string; email: string };
  studentProfile?: { subject: string; level: string };
}

const getIllustration = (subject: string, index: number) => {
  const s = (subject || '').trim().toLowerCase();
  if (s === 'mathematics' || s === 'math')
    return { img: '/illustrations/subject_math.jpg', tagBg: 'bg-[#d9cbf8]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]/30' };
  if (s === 'physics')
    return { img: '/illustrations/illustration_physics.jpg', tagBg: 'bg-[#d9cbf8]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]/30' };
  if (s === 'chemistry')
    return { img: '/illustrations/subject_chemistry.jpg', tagBg: 'bg-[#FCE166]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]' };
  if (s === 'biology')
    return { img: '/illustrations/subject_biology.jpg', tagBg: 'bg-[#151313]', tagText: 'text-[#FCE166]', tagBorder: 'border border-[#151313]' };
  if (s === 'computer science' || s === 'cs')
    return { img: '/illustrations/illustration_tech.jpg', tagBg: 'bg-[#d9cbf8]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]/30' };
  if (s === 'english')
    return { img: '/illustrations/illustration_writing.jpg', tagBg: 'bg-[#FCE166]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]' };
  if (s === 'history')
    return { img: '/illustrations/subject_history.jpg', tagBg: 'bg-[#d9cbf8]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]/30' };
  if (s === 'geography')
    return { img: '/illustrations/subject_geography.jpg', tagBg: 'bg-[#FCE166]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]' };
  const fallbacks = [
    { img: '/illustrations/illustration_writing.jpg', tagBg: 'bg-[#FCE166]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]' },
    { img: '/illustrations/illustration_psychology.jpg', tagBg: 'bg-[#151313]', tagText: 'text-[#FCE166]', tagBorder: 'border border-[#151313]' },
    { img: '/illustrations/illustration_tech.jpg', tagBg: 'bg-[#d9cbf8]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]/30' },
    { img: '/illustrations/illustration_design.jpg', tagBg: 'bg-[#FCE166]', tagText: 'text-[#151313]', tagBorder: 'border border-transparent' },
  ];
  return fallbacks[index % fallbacks.length];
};

type ActiveTab = 'classes' | 'notes' | 'homework' | 'summary' | 'history';

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('classes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Upcoming' | 'Completed' | 'Expired'>('All');
  const [sortBy, setSortBy] = useState<'Earliest' | 'Latest'>('Latest');
  const [viewMode, setViewMode] = useState<'grid' | 'slider'>('slider');
  
  // State for Profile Modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // State for Class Notes Modal
  const [selectedNoteSession, setSelectedNoteSession] = useState<Session | null>(null);
  
  // State for Homework & Summary Modals
  const [selectedHomeworkSession, setSelectedHomeworkSession] = useState<Session | null>(null);
  const [selectedSummarySession, setSelectedSummarySession] = useState<Session | null>(null);

  // State for Upcoming Class Modal
  const [selectedUpcomingSession, setSelectedUpcomingSession] = useState<Session | null>(null);

  // Notification state
  const [notifications, setNotifications] = useState<{ id: string; message: string; time: string; isRead: boolean }[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [, setToastNotif] = useState<string | null>(null);

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("AudioContext failed", e);
    }
  };
  
  // Initialize completed homework IDs from localStorage to keep them on refresh
  const [completedHomeworkIds, setCompletedHomeworkIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('completedHomeworkIds');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Save to localStorage whenever completedHomeworkIds changes
  useEffect(() => {
    localStorage.setItem('completedHomeworkIds', JSON.stringify(completedHomeworkIds));
  }, [completedHomeworkIds]);

  const sliderRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroMouse, setHeroMouse] = useState({ x: 0, y: 0 });

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setHeroMouse({ x: ((e.clientX - rect.left) / rect.width - 0.5) * 2, y: ((e.clientY - rect.top) / rect.height - 0.5) * 2 });
  };

  const scrollSlider = (dir: 'left' | 'right') => {
    sliderRef.current?.scrollBy({ left: dir === 'left' ? -360 : 360, behavior: 'smooth' });
  };

  const handleMarkHomework = (id: string) => {
    setCompletedHomeworkIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  const fetchSessions = async () => {
    try {
      const r = await api.get('/sessions');
      setSessions(r.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSessions();
    const pollInterval = setInterval(fetchSessions, 15000);
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      const newNotifs: any[] = [];

      sessions.filter(s => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS').forEach(session => {
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        const diffMsStart = startTime.getTime() - now.getTime();
        const diffMinsStart = diffMsStart / 60000;

        // 5 min warning
        if (diffMinsStart > 4.5 && diffMinsStart <= 5.5) {
          newNotifs.push({
            id: `start-soon-${session.id}`,
            message: `⏰ Class "${session.topic}" starts in 5 minutes!`,
            time: new Date().toISOString(),
            isRead: false
          });
        }

        // Exact start time
        if (diffMsStart <= 0 && diffMsStart > -60000) {
          newNotifs.push({
            id: `start-now-${session.id}`,
            message: `🚀 Class "${session.topic}" is starting right now! Click to join.`,
            time: new Date().toISOString(),
            isRead: false
          });
        }

        // Class ended
        const diffMsEnd = endTime.getTime() - now.getTime();
        if (diffMsEnd <= 0 && diffMsEnd > -60000) {
          newNotifs.push({
            id: `end-${session.id}`,
            message: `✅ Class "${session.topic}" has ended.`,
            time: new Date().toISOString(),
            isRead: false
          });
        }
      });

      if (newNotifs.length > 0) {
        setNotifications(prev => {
          const trulyNew = newNotifs.filter(n => !prev.some(p => p.id === n.id));
          if (trulyNew.length > 0) {
            playNotificationSound();
            setToastNotif(trulyNew[0].message);
            setTimeout(() => setToastNotif(null), 4000);
          }
          const combined = [...newNotifs, ...prev];
          return Array.from(new Map(combined.map(item => [item.id, item])).values());
        });
      }
    };

    if (sessions.length > 0) {
      checkNotifications();
      const interval = setInterval(checkNotifications, 20000);
      return () => clearInterval(interval);
    }
  }, [sessions]);

  const getAssetUrl = (url: string) => url.startsWith('http') ? url : `http://localhost:5000${url}`;

  const parseReview = (raw: string | null): any => {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return null; }
  };

  const renderAsset = (session: Session) => {
    if (!session.classMode || !session.classAssetUrl) return null;
    const url = getAssetUrl(session.classAssetUrl);
    if (session.classMode === 'VIDEO_CALL') return (
      <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-[#ff5734] hover:bg-[#e04a2a] text-white font-bold py-3 px-6 rounded-[1.25rem] transition-all text-sm shadow-md active:scale-95">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" /></svg>
        Join Video Call
      </a>
    );
    if (session.classMode === 'RECORDING') return (
      <div className="rounded-xl overflow-hidden border border-slate-200"><video controls src={url} className="w-full max-h-32 object-cover" /></div>
    );
    if (session.classMode === 'NOTES') return (
      <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-[#151313] hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-[1.25rem] transition-all text-sm active:scale-95">📄 View Class Notes</a>
    );
    return null;
  };

  const completedSessions = sessions.filter(s => s.status === 'COMPLETED' || s.status === 'AI_REVIEWED');
  const upcomingCount = sessions.filter(s => s.status === 'SCHEDULED' && new Date(s.endTime) > new Date()).length;
  const totalHours = Math.round(completedSessions.reduce((acc, s) => acc + new Date(s.endTime).getTime() - new Date(s.startTime).getTime(), 0) / 3600000);

  const classesFiltered = sessions
    .filter(s => s.topic.toLowerCase().includes(searchTerm.toLowerCase()) || s.tutor.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(s => {
      const now = new Date();
      const isCompleted = s.status === 'COMPLETED' || s.status === 'AI_REVIEWED';
      const isExpired = !isCompleted && new Date(s.endTime) <= now;
      const isUpcoming = !isCompleted && !isExpired && new Date(s.startTime) > now;
      if (filterType === 'All') return true;
      if (filterType === 'Upcoming') return isUpcoming || s.status === 'IN_PROGRESS';
      if (filterType === 'Completed') return isCompleted;
      if (filterType === 'Expired') return isExpired;
      return true;
    })
    .sort((a, b) => {
      const ta = new Date(a.startTime).getTime(), tb = new Date(b.startTime).getTime();
      return sortBy === 'Earliest' ? ta - tb : tb - ta;
    });

  const homeworkSessions = completedSessions.filter(s => s.aiReview);
  const summarySessions = completedSessions.filter(s => s.aiReview);

  // Derived DB stats for Profile Modal
  const uniqueTutors = [...new Set(sessions.map(s => s.tutor.name))];
  const uniqueSubjects = [...new Set(sessions.map(s => s.studentProfile?.subject).filter(Boolean))] as string[];
  const attendanceRate = sessions.length ? Math.round((completedSessions.length / sessions.length) * 100) : 0;

  // Reusable View Controls component for all tabs
  const renderViewControls = () => (
    <div className="flex items-center gap-3 mt-4 sm:mt-0">
      <div className="flex bg-slate-100 rounded-xl p-1 mr-2">
        <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-black' : 'text-slate-500 hover:text-black'}`} title="Grid">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
        </button>
        <button onClick={() => setViewMode('slider')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'slider' ? 'bg-white shadow-sm text-black' : 'text-slate-500 hover:text-black'}`} title="Slider">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17l-5-5 5-5m6 10l5-5-5-5" /></svg>
        </button>
      </div>
      <button onClick={() => scrollSlider('left')} disabled={viewMode === 'grid'} className={`w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-black hover:border-black transition-colors ${viewMode === 'grid' ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button onClick={() => scrollSlider('right')} disabled={viewMode === 'grid'} className={`w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-black hover:border-black transition-colors ${viewMode === 'grid' ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );

  const SidebarTab = ({ tab, title, children }: { tab: ActiveTab; title: string; children: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`w-full aspect-square rounded-[1rem] flex items-center justify-center transition-all ${activeTab === tab ? 'bg-[#fccc42] text-black shadow-lg scale-110' : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div className="w-full bg-[#F7F7F7]">
      <div className="flex w-full min-h-screen bg-[#151313]">
        <div className="w-full h-screen bg-[#151313] flex overflow-hidden p-2 md:p-4">

          {/* ── Dark Left Sidebar ── */}
          <aside className="hidden md:flex flex-col w-12 md:w-16 bg-[#151313] py-6 items-center shrink-0 relative z-10 mr-2 md:mr-4">
            <div className="mb-10 flex items-center justify-center">
              <button onClick={() => window.location.reload()} className="cursor-pointer hover:opacity-70 transition-opacity" title="Refresh">
                <span className="font-kodchasan font-black text-3xl tracking-tight leading-none select-none">
                  <span className="text-white">T</span><span className="text-[#ff5734]">F</span><span className="text-[#ff5734]">.</span>
                </span>
              </button>
            </div>
            <div className="flex flex-col gap-4 w-full px-3">
              <SidebarTab tab="classes" title="My Classes">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </SidebarTab>
              <SidebarTab tab="notes" title="Class Notes">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </SidebarTab>
              <SidebarTab tab="homework" title="Homework">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </SidebarTab>
              <SidebarTab tab="summary" title="AI Summary">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </SidebarTab>
              <SidebarTab tab="history" title="History">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </SidebarTab>
            </div>
            <div className="mt-auto px-3 w-full">
              <button onClick={logout} className="w-full aspect-square rounded-[1rem] flex items-center justify-center text-slate-400 hover:text-[#ff5734] hover:bg-white/5 transition-all" title="Sign Out">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </aside>

          {/* ── White Main Content ── */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-white rounded-[2rem] shadow-inner relative z-0 no-scrollbar">

            {/* Header */}
            <div className="relative z-40">
              <div className="absolute inset-0 bg-white/50 -bottom-8" style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)' }} />
              <div className="relative px-6 pt-4 pb-2 md:px-12 md:pt-6 md:pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-500">Welcome to</span>
                  <h1 className="text-3xl font-bold text-[#ff5734] font-kodchasan tracking-tight">TutorFlow</h1>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Notification Bell */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifMenu(!showNotifMenu)}
                      className="w-10 h-10 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-600 hover:border-[#ff5734] hover:text-[#ff5734] transition-all relative"
                      title="Notifications"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9" />
                      </svg>
                      {notifications.some(n => !n.isRead) && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-[#ff5734] rounded-full border-2 border-white animate-pulse" />
                      )}
                    </button>

                    {/* Dropdown Menu */}
                    {showNotifMenu && (
                      <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">Notifications</h4>
                          {notifications.length > 0 && (
                            <button
                              onClick={() => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))}
                              className="text-[10px] text-[#ff5734] font-bold hover:underline"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 no-scrollbar">
                          {notifications.length === 0 ? (
                            <p className="text-xs text-slate-400 font-medium py-4 text-center">No new notifications</p>
                          ) : (
                            notifications.map(n => (
                              <div key={n.id} className={`p-2.5 rounded-xl text-xs font-semibold ${n.isRead ? 'bg-slate-50 text-slate-500' : 'bg-orange-50/60 text-slate-800 border border-orange-100'}`}>
                                <p>{n.message}</p>
                                <span className="text-[9px] text-slate-400 font-normal mt-1 block">{new Date(n.time).toLocaleTimeString([], { timeStyle: 'short' })}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Button to open Student Profile Modal */}
                  <button 
                    onClick={() => setShowProfileModal(true)} 
                    className="hidden sm:flex items-center gap-3 border-2 border-slate-100 pr-4 rounded-full pl-1 py-1 hover:border-[#ff5734] hover:shadow-sm transition-all text-left group"
                  >
                    <div className="w-8 h-8 bg-black group-hover:bg-[#ff5734] transition-colors rounded-full text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden relative">
                      <span className="absolute">{user?.name?.charAt(0) || 'S'}</span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="font-bold text-xs leading-tight whitespace-nowrap max-w-[100px] truncate text-slate-800 group-hover:text-black">{user?.name || 'Student'}</span>
                      <span className="text-[9px] text-slate-400 font-semibold leading-tight">@student</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
            <br />
            <br />

            <div className="px-6 md:px-12 py-10">

              {/* ── SHARED HERO (all tabs) ── */}
              <div ref={heroRef} className="mb-12 lg:mb-16 relative flex items-center justify-between min-h-[200px]"
                onMouseMove={handleHeroMouseMove} onMouseLeave={() => setHeroMouse({ x: 0, y: 0 })}>
                <h1 className="text-6xl md:text-7xl lg:text-[6rem] font-kodchasan font-bold text-[#151313] leading-[1.1] tracking-tight max-w-4xl z-10 transition-transform duration-200 ease-out"
                  style={{ transform: `translate(${heroMouse.x * -6}px, ${heroMouse.y * -4}px)`, textShadow: heroMouse.x !== 0 ? `${heroMouse.x * 4}px ${heroMouse.y * 4}px 20px rgba(255,87,52,0.15)` : 'none' }}>
                  Keep up your <span className="text-[#ff5734]">learning  </span>journey
                </h1>
                <div className="hidden md:block absolute right-8 lg:right-54 -top-16 w-[350px] lg:w-[450px] h-[350px] lg:h-[450px] select-none z-0 transition-transform duration-200 ease-out"
                  style={{ transform: `translate(${heroMouse.x * 18}px, ${heroMouse.y * 14}px) rotate(${heroMouse.x * 3}deg)` }}>
                  <svg className="absolute inset-0 w-full h-full text-[#f4f3f0] -z-10 transform scale-125" viewBox="0 0 200 200" fill="none"><path d="M -20,100 C 50,20 150,180 220,100" stroke="currentColor" strokeWidth="2" fill="none" /><circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
                  <svg className="absolute top-[10%] left-[10%] w-12 h-12 text-[#facb3b] fill-current" style={{ animation: 'float 4s ease-in-out infinite', transform: `translate(${heroMouse.x * -10}px, ${heroMouse.y * -8}px)` }} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  <svg className="absolute top-[15%] right-[10%] w-7 h-7 text-[#facb3b] fill-current" style={{ animation: 'pulse-slow 3s ease-in-out infinite', transform: `translate(${heroMouse.x * 12}px, ${heroMouse.y * -10}px)` }} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  <svg className="absolute bottom-[20%] left-[25%] w-6 h-6 text-[#facb3b] fill-current" style={{ animation: 'pulse-slow 4s ease-in-out infinite reverse', transform: `translate(${heroMouse.x * -6}px, ${heroMouse.y * 6}px)` }} viewBox="0 0 24 24"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" /></svg>
                  <img src="/illustrations/hero-pencil-nobg2.png" alt="Student" className="w-full h-full object-contain relative z-10 drop-shadow-2xl" style={{ animation: 'float 6s ease-in-out infinite' }} />
                </div>
              </div>

              <br />
              <br />
              <br />
              <br />
              <br />
              <br />

              {/* ── SHARED STATS (all tabs) ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="taitor-stat-card">
                  <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#d9cbf8] fill-current transform rotate-12"><path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" /></svg>
                    <span className="relative z-10 text-3xl transform -rotate-12 filter drop-shadow-sm">📖</span>
                  </div>
                  <div><h3 className="taitor-heading text-3xl">{completedSessions.length} LESSONS</h3><p className="text-sm font-semibold text-slate-500">Completed</p></div>
                </div>
                <div className="taitor-stat-card">
                  <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#faef8f] fill-current transform -rotate-6"><path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" /></svg>
                    <span className="relative z-10 text-3xl transform rotate-6 filter drop-shadow-sm">⏳</span>
                  </div>
                  <div><h3 className="taitor-heading text-3xl">{totalHours} HOURS</h3><p className="text-sm font-semibold text-slate-500">Total time spent</p></div>
                </div>
                <div className="taitor-stat-card">
                  <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#f6baba] fill-current transform rotate-[15deg]"><path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" /></svg>
                    <span className="relative z-10 text-3xl transform -rotate-6 filter drop-shadow-sm">🧮</span>
                  </div>
                  <div><h3 className="taitor-heading text-3xl">{upcomingCount} LESSONS</h3><p className="text-sm font-semibold text-slate-500">Upcoming</p></div>
                </div>
              </div>
{/*  */}
              {/* ── MY CLASSES TAB ── */}
              {activeTab === 'classes' && (
                <>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <h2 className="taitor-heading text-5xl">MY CLASSES</h2>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                    <div className="flex flex-wrap gap-3">
                      <div className="relative flex items-center">
                        <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                          className="border-2 border-slate-200 rounded-full pl-6 pr-12 py-2 text-sm font-semibold focus:outline-none focus:border-[#ff5734] transition-colors w-48 sm:w-64 bg-slate-50" />
                        <button className="absolute right-1.5 w-8 h-8 bg-[#ff5734] rounded-full flex items-center justify-center text-white shadow-md hover:bg-[#e04523] transition-colors pointer-events-none">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </button>
                      </div>
                      <button onClick={() => setFilterType(p => p === 'All' ? 'Upcoming' : p === 'Upcoming' ? 'Completed' : p === 'Completed' ? 'Expired' : 'All')}
                        className="bg-white text-[#151313] border-2 border-slate-200 rounded-xl px-5 py-2 font-semibold text-sm hover:border-[#151313] transition-colors">
                        Filter: {filterType}
                      </button>
                      <button onClick={() => setSortBy(p => p === 'Earliest' ? 'Latest' : 'Earliest')}
                        className="bg-white text-[#151313] border-2 border-slate-200 rounded-xl px-5 py-2 font-semibold text-sm hover:border-[#151313] transition-colors">
                        Sort: {sortBy}
                      </button>
                    </div>
                    {/* View Controls shared function used here */}
                    {renderViewControls()}
                  </div>

                  <div ref={sliderRef} className={viewMode === 'slider' ? 'flex gap-6 overflow-x-auto pb-4 pt-2 scroll-smooth snap-x snap-mandatory no-scrollbar items-stretch' : 'flex flex-wrap gap-4 md:gap-6 items-stretch pt-2'}>
                    {classesFiltered.map((session, index) => {
                      const isCompleted = session.status === 'COMPLETED' || session.status === 'AI_REVIEWED';
                      const now = new Date().getTime();
                      const isOngoing = !isCompleted && new Date(session.startTime).getTime() <= now && new Date(session.endTime).getTime() > now;
                      const isExpired = !isCompleted && new Date(session.endTime).getTime() <= now;
                      const progressPct = isCompleted ? 100 : isExpired ? 100 : isOngoing ? 50 : 0;

                      const startDate = new Date(session.startTime);
                      const endDate = new Date(session.endTime);
                      const durationMins = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
                      const subject = session.studentProfile?.subject || '';
                      const c = getIllustration(subject, index);

                      return (
                        <div key={session.id}
                          onClick={() => setSelectedUpcomingSession(session)}
                          className={`bg-cover bg-center rounded-[1.75rem] p-2 border flex flex-col relative h-[440px] hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 shrink-0 snap-start w-[320px] md:w-[360px] cursor-pointer group ${isCompleted ? 'border-green-300 shadow-green-100 shadow-lg' : isOngoing ? 'border-[#ff5734] shadow-orange-100 shadow-lg' : isExpired ? 'border-slate-300' : 'border-slate-200'}`}>
                          {(isCompleted || isExpired || isOngoing) && (
                            <div className={`absolute inset-0 rounded-[1.75rem] z-20 flex items-center justify-center pointer-events-none ${isCompleted ? 'bg-green-900/20' : isOngoing ? 'bg-orange-500/10' : 'bg-black/20'}`}>
                              <div className={`px-5 py-2 rounded-full text-sm font-black uppercase tracking-widest shadow-lg ${isCompleted ? 'bg-green-500 text-white' : isOngoing ? 'bg-[#ff5734] text-white animate-pulse' : 'bg-slate-700 text-white'}`}>
                                {isCompleted ? '✓ Completed' : isOngoing ? '● Live Now' : 'Expired'}
                              </div>
                            </div>
                          )}
                          <div className="rounded-[1.25rem] h-[220px] relative overflow-hidden mb-5 border border-slate-100">
                            <img src={c.img} alt="Illustration" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="flex justify-between items-start p-3 z-10 relative">
                              <span className={`${c.tagBg} ${c.tagText} ${c.tagBorder} px-3 py-1 rounded-xl text-[11px] font-bold tracking-wide`}>
                                {session.studentProfile?.subject || user?.name}
                              </span>
                            </div>
                          </div>
                          <div className="px-2 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-[#151313] font-kodchasan tracking-tight mb-4 leading-snug line-clamp-2 group-hover:text-[#ff5734] transition-colors">{session.topic}</h3>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-2 mb-5 text-[13px]">
                              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" /><span className="text-slate-600 font-medium truncate">{startDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span></div>
                              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" /><span className="text-slate-600 font-medium truncate">{startDate.toLocaleTimeString([], { timeStyle: 'short' })} – {endDate.toLocaleTimeString([], { timeStyle: 'short' })}</span></div>
                              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" /><span className="text-slate-600 font-medium truncate">{durationMins} mins</span></div>
                              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" /><span className="text-slate-600 font-medium truncate">👨‍🏫 {session.tutor.name}</span></div>
                            </div>
                            <div className="mt-auto mb-6">
                              <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isCompleted ? 'text-green-500' : isOngoing ? 'text-[#ff5734]' : isExpired ? 'text-red-500' : 'text-slate-400'}`}>
                                  {isCompleted ? 'Completed' : isOngoing ? 'Live Now' : isExpired ? 'Expired' : 'Scheduled'}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : isOngoing ? 'bg-[#ff5734]' : isExpired ? 'bg-red-400' : 'bg-[#ff5734]'}`} style={{ width: `${progressPct}%` }} />
                              </div>
                            </div>
                            <div className="mt-auto pb-1">
                              {isOngoing && session.classMode && session.classAssetUrl ? renderAsset(session) : (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedUpcomingSession(session); }}
                                  className={`w-[95%] block mx-auto font-bold py-3.5 px-6 rounded-[1.25rem] text-center transition-all text-sm ${isCompleted ? 'bg-green-500 text-white' : isOngoing ? 'bg-[#ff5734] text-white animate-pulse' : isExpired ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#151313] hover:bg-[#ff5734] text-white'}`}
                                >
                                  {isCompleted ? 'View Session' : isOngoing ? '● Join Class Now' : isExpired ? 'Class Expired' : 'View Class Details'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {classesFiltered.length === 0 && (
                      <div className="w-full py-20 text-center"><span className="text-5xl block mb-4 opacity-30">✨</span><p className="text-slate-400 font-bold text-lg">No classes found.</p></div>
                    )}
                  </div>
                </>
              )}

              {/* ── HOMEWORK TAB ── */}
              {activeTab === 'homework' && (
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
                    <div>
                      <h2 className="taitor-heading text-5xl mb-2">HOMEWORK</h2>
                      <p className="text-slate-500 font-semibold">Tasks assigned by your tutor via AI session review.</p>
                    </div>
                    {/* View Controls shared function used here */}
                    {renderViewControls()}
                  </div>
                  {homeworkSessions.length === 0 ? (
                    <div className="py-20 text-center"><span className="text-5xl block mb-4 opacity-30">📝</span><p className="text-slate-400 font-bold text-lg">No homework yet.</p><p className="text-sm text-slate-400 mt-1">Homework appears after your tutor generates an AI review.</p></div>
                  ) : (
                    <div ref={sliderRef} className={viewMode === 'slider' ? 'flex gap-6 overflow-x-auto pb-4 pt-2 scroll-smooth snap-x snap-mandatory no-scrollbar items-stretch' : 'flex flex-wrap gap-4 md:gap-6 items-stretch pt-2'}>
                      {homeworkSessions.map((session) => {
                        const review = parseReview(session.aiReview);
                        if (!review) return null;
                        
                        const isHwCompleted = completedHomeworkIds.includes(session.id);
                        
                        return (
                          <div key={session.id}
                            onClick={() => setSelectedHomeworkSession(session)}
                            className={`shrink-0 snap-start bg-cover bg-center rounded-[1.75rem] p-3 border flex flex-col relative h-[440px] hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 w-[320px] md:w-[360px] cursor-pointer group ${isHwCompleted ? 'border-green-300 shadow-green-50 shadow-lg' : 'border-slate-200'}`}
                            style={{ backgroundImage: 'url(/illustrations/samedha.jpg)' }}>
                            
                            <div className="px-3 pt-4 pb-3 flex-1 flex flex-col justify-between overflow-hidden">
                              <div>
                                <h3 className="text-xl font-bold text-[#151313] font-kodchasan tracking-tight mb-2 line-clamp-1 group-hover:text-[#ff5734] transition-colors">{session.topic}</h3>
                                <p className="text-xs text-slate-500 font-semibold mb-3">👨‍🏫 {session.tutor.name} • {new Date(session.startTime).toLocaleDateString()}</p>
                                
                                <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-100 mb-3 h-[180px] overflow-hidden relative">
                                  <p className="text-[10px] font-bold text-[#ff5734] uppercase tracking-wider mb-2">Assigned Tasks ({review.homework.length})</p>
                                  <div className="space-y-2">
                                    {review.homework.slice(0, 3).map((hw: string, idx: number) => (
                                      <div key={idx} className="flex gap-2 items-start">
                                        <span className="w-4 h-4 rounded-full bg-[#151313] flex items-center justify-center shrink-0 mt-0.5 text-[#FCE166] font-black text-[9px]">{idx + 1}</span>
                                        <span className="text-xs font-semibold text-slate-700 leading-snug line-clamp-2">{hw}</span>
                                      </div>
                                    ))}
                                    {review.homework.length > 3 && (
                                      <p className="text-[11px] font-bold text-[#ff5734] pt-1">+ {review.homework.length - 3} more tasks...</p>
                                    )}
                                  </div>
                                  <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />
                                </div>
                              </div>

                              <div className="mt-auto space-y-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedHomeworkSession(session); }}
                                  className="w-full bg-[#151313] group-hover:bg-[#ff5734] text-white font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-sm"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                  View Full Homework
                                </button>
                                
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleMarkHomework(session.id); }}
                                  disabled={isHwCompleted}
                                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                                    isHwCompleted 
                                      ? 'bg-green-500 text-white cursor-default' 
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                  }`}
                                >
                                  {isHwCompleted ? (
                                    <>
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                      Completed
                                    </>
                                  ) : (
                                    'Mark as Complete'
                                  )}
                                </button>
                              </div>
                              
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ── CLASS NOTES TAB ── */}
              {activeTab === 'notes' && (
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
                    <div>
                      <h2 className="taitor-heading text-5xl mb-2">CLASS NOTES</h2>
                      <p className="text-slate-500 font-semibold">Saved notes & materials from your completed class sessions.</p>
                    </div>
                    {renderViewControls()}
                  </div>

                  {completedSessions.filter(s => s.notes || s.classAssetUrl).length === 0 ? (
                    <div className="py-20 text-center">
                      <span className="text-5xl block mb-4 opacity-30">📝</span>
                      <p className="text-slate-400 font-bold text-lg">No class notes available yet.</p>
                      <p className="text-sm text-slate-400 mt-1">Notes will appear here after your tutor completes or adds notes to your sessions.</p>
                    </div>
                  ) : (
                    <div ref={sliderRef} className={viewMode === 'slider' ? 'flex gap-6 overflow-x-auto pb-4 pt-2 scroll-smooth snap-x snap-mandatory no-scrollbar items-stretch' : 'flex flex-wrap gap-4 md:gap-6 items-stretch pt-2'}>
                      {completedSessions.filter(s => s.notes || s.classAssetUrl).map((session, i) => {
                        const subject = session.studentProfile?.subject || '';
                        const c = getIllustration(subject, i);

                        return (
                          <div 
                            key={session.id}
                            onClick={() => setSelectedNoteSession(session)}
                            className="shrink-0 snap-start bg-cover bg-center rounded-[1.75rem] p-3 border border-slate-200 flex flex-col relative h-[440px] hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 w-[320px] md:w-[360px] cursor-pointer group"
                            style={{ backgroundImage: 'url(/illustrations/samedha.jpg)' }}
                          >
                            {/* Card Illustration */}
                            <div className="rounded-[1.25rem] h-[180px] relative overflow-hidden mb-4 border border-slate-100 bg-white">
                              <img src={c.img} alt="Illustration" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="flex justify-between items-start p-3 z-10 relative">
                                <span className={`${c.tagBg} ${c.tagText} ${c.tagBorder} px-3 py-1 rounded-xl text-[11px] font-bold tracking-wide`}>
                                  {session.studentProfile?.subject || 'Class Note'}
                                </span>
                                <span className="bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-bold">
                                  {new Date(session.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </div>

                            {/* Card Content */}
                            <div className="px-2 flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="text-xl font-bold text-[#151313] font-kodchasan tracking-tight mb-2 line-clamp-1 group-hover:text-[#ff5734] transition-colors">{session.topic}</h3>
                                <p className="text-xs text-slate-500 font-semibold mb-3">👨‍🏫 {session.tutor.name}</p>

                                <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-100 mb-3 h-[110px] overflow-hidden relative">
                                  <p className="text-[10px] font-bold text-[#ff5734] uppercase tracking-wider mb-1">Notes Preview</p>
                                  <p className="text-xs text-slate-700 font-medium leading-relaxed line-clamp-4">
                                    {session.notes || "Class materials available for view."}
                                  </p>
                                  <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />
                                </div>
                              </div>

                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedNoteSession(session); }}
                                className="w-full bg-[#151313] group-hover:bg-[#ff5734] text-white font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-sm"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                View Full Class Notes
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ── SUMMARY TAB ── */}
              {activeTab === 'summary' && (
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
                    <div>
                      <h2 className="taitor-heading text-5xl mb-2">AI SUMMARIES</h2>
                      <p className="text-slate-500 font-semibold">Your session summaries and next class focus from AI review.</p>
                    </div>
                    {/* View Controls shared function used here */}
                    {renderViewControls()}
                  </div>
                  {summarySessions.length === 0 ? (
                    <div className="py-20 text-center"><span className="text-5xl block mb-4 opacity-30">✨</span><p className="text-slate-400 font-bold text-lg">No summaries yet.</p><p className="text-sm text-slate-400 mt-1">AI summaries appear after your tutor generates a session review.</p></div>
                  ) : (
                    <div ref={sliderRef} className={viewMode === 'slider' ? 'flex gap-6 overflow-x-auto pb-4 pt-2 scroll-smooth snap-x snap-mandatory no-scrollbar items-stretch' : 'flex flex-wrap gap-4 md:gap-6 items-stretch pt-2'}>
                      {summarySessions.map((session) => {
                        const review = parseReview(session.aiReview);
                        if (!review) return null;
                        
                        return (
                          <div key={session.id}
                            onClick={() => setSelectedSummarySession(session)}
                            className="shrink-0 snap-start bg-cover bg-center rounded-[1.75rem] p-3 border flex flex-col relative h-[440px] hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 w-[320px] md:w-[360px] border-purple-200 cursor-pointer group"
                            style={{ backgroundImage: 'url(/illustrations/samedha.jpg)' }}>
                            
                            <div className="px-3 pt-4 pb-3 flex-1 flex flex-col justify-between overflow-hidden">
                              <div>
                                <h3 className="text-xl font-bold text-[#151313] font-kodchasan tracking-tight mb-2 line-clamp-1 group-hover:text-[#ff5734] transition-colors">{session.topic}</h3>
                                <p className="text-xs text-slate-500 font-semibold mb-3">👨‍🏫 {session.tutor.name} • {new Date(session.startTime).toLocaleDateString()}</p>
                                
                                <div className="space-y-2 mb-3">
                                  <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-100 h-[100px] overflow-hidden relative">
                                    <h4 className="text-[9px] font-bold text-[#ff5734] uppercase tracking-widest mb-1">✨ Summary</h4>
                                    <p className="text-xs font-medium text-slate-700 leading-relaxed line-clamp-3">{review.summary}</p>
                                    <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />
                                  </div>
                                  <div className="bg-[#facb3b]/10 rounded-xl p-3 border border-[#facb3b]/30 h-[75px] overflow-hidden relative">
                                    <h4 className="text-[9px] font-bold text-amber-700 uppercase tracking-widest mb-1">💡 Next Focus</h4>
                                    <p className="text-xs font-medium text-amber-800 leading-relaxed line-clamp-2">{review.suggestionForNextClass}</p>
                                  </div>
                                </div>
                              </div>

                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedSummarySession(session); }}
                                className="w-full bg-[#151313] group-hover:bg-[#ff5734] text-white font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-sm mt-auto"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                View Full AI Summary
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ── HISTORY TAB ── */}
              {activeTab === 'history' && (
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
                    <div>
                      <h2 className="taitor-heading text-5xl mb-2">SESSION HISTORY</h2>
                      <p className="text-slate-500 font-semibold">Full timeline of all attended sessions with details.</p>
                    </div>
                    {/* View Controls shared function used here */}
                    {renderViewControls()}
                  </div>
                  {sessions.length === 0 ? (
                    <div className="py-20 text-center"><span className="text-5xl block mb-4 opacity-30">📚</span><p className="text-slate-400 font-bold text-lg">No sessions found.</p></div>
                  ) : (
                    <div ref={sliderRef} className={viewMode === 'slider' ? 'flex gap-6 overflow-x-auto pb-4 pt-2 scroll-smooth snap-x snap-mandatory no-scrollbar items-stretch' : 'flex flex-wrap gap-4 md:gap-6 items-stretch pt-2'}>
                      {[...sessions].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).map((session, i) => {
                        const isCompleted = session.status === 'COMPLETED' || session.status === 'AI_REVIEWED';
                        const isLive = session.status === 'IN_PROGRESS';
                        const isExpired = !isCompleted && !isLive && new Date(session.endTime) < new Date();
                        const durationMins = Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000);
                        const subject = session.studentProfile?.subject || '';
                        const c = getIllustration(subject, i);

                        return (
                          <div key={session.id}
                            className={`shrink-0 snap-start bg-cover bg-center rounded-[1.75rem] p-2 border flex flex-col relative h-[440px] hover:shadow-md hover:-translate-y-1 transition-all duration-300 w-[320px] md:w-[360px] ${isCompleted ? 'border-green-300' : isLive ? 'border-[#ff5734]' : isExpired ? 'border-slate-300' : 'border-slate-200'}`}
                            style={{ backgroundImage: 'url(/illustrations/samedha.jpg)' }}>
                            {(isCompleted || isExpired || isLive) && (
                              <div className={`absolute inset-0 rounded-[1.75rem] z-20 flex items-center justify-center pointer-events-none ${isCompleted ? 'bg-green-900/10' : isLive ? 'bg-orange-500/10' : 'bg-black/10'}`}>
                                <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm ${isCompleted ? 'bg-green-500 text-white' : isLive ? 'bg-[#ff5734] text-white animate-pulse' : 'bg-slate-700 text-white'}`}>
                                  {isCompleted ? '✓ Completed' : isLive ? '● Live' : 'Expired'}
                                </div>
                              </div>
                            )}
                            <div className="rounded-[1.25rem] h-[180px] relative overflow-hidden mb-4 border border-slate-100 bg-white">
                              <img src={c.img} alt="Illustration" className="absolute inset-0 w-full h-full object-cover" />
                              <div className="flex justify-between items-start p-3 z-10 relative">
                                <span className={`${c.tagBg} ${c.tagText} ${c.tagBorder} px-3 py-1 rounded-xl text-[11px] font-bold tracking-wide`}>
                                  {session.studentProfile?.subject || 'History'}
                                </span>
                              </div>
                            </div>
                            <div className="px-2 flex-1 flex flex-col">
                              <h3 className="text-xl font-bold text-[#151313] font-kodchasan tracking-tight mb-3 line-clamp-2">{session.topic}</h3>
                              <div className="grid grid-cols-2 gap-y-2 gap-x-2 mb-4 text-[12px]">
                                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" /><span className="text-slate-600 font-medium truncate">{new Date(session.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span></div>
                                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" /><span className="text-slate-600 font-medium truncate">{new Date(session.startTime).toLocaleTimeString([], { timeStyle: 'short' })} – {new Date(session.endTime).toLocaleTimeString([], { timeStyle: 'short' })}</span></div>
                                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" /><span className="text-slate-600 font-medium truncate">{durationMins} mins</span></div>
                                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" /><span className="text-slate-600 font-medium truncate">👨‍🏫 {session.tutor.name}</span></div>
                              </div>
                              <div className="mt-auto mb-2">
                                {isCompleted && session.notes ? (
                                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 h-[70px] overflow-hidden">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Session Notes</p>
                                    <p className="text-[11px] text-slate-600 font-medium leading-tight line-clamp-2">{session.notes}</p>
                                  </div>
                                ) : (
                                  <div className={`rounded-xl p-3 border h-[70px] flex flex-col justify-center ${isCompleted ? 'bg-green-50/80 border-green-100' : 'bg-slate-50/80 border-slate-100'}`}>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">AI Review</p>
                                    <p className={`font-bold text-sm ${session.aiReview ? 'text-green-600' : 'text-slate-400'}`}>{session.aiReview ? '✓ Done' : 'Pending'}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ── PROFILE & PERFORMANCE MODAL ── */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151313]/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh] p-8 animate-in fade-in zoom-in duration-300">
            
            {/* Close Button */}
            <button 
              onClick={() => setShowProfileModal(false)} 
              className="absolute top-6 right-6 w-10 h-10 bg-white border border-slate-200 hover:border-black rounded-full flex items-center justify-center text-slate-500 hover:text-black transition-colors shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Modal Header Profile Info */}
            <div className="flex items-center gap-5 mb-8">
              <div className="w-20 h-20 bg-[#151313] rounded-full text-white flex items-center justify-center font-bold text-4xl shadow-md">
                <span>{user?.name?.charAt(0) || 'S'}</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-[#151313] tracking-tight">{user?.name || 'Alice'}</h2>
                <p className="text-slate-500 font-medium text-sm">{user?.email || 'student@tutorflow.com'}</p>
                <span className="inline-block mt-2 bg-red-50 text-red-500 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">Student Profile</span>
              </div>
            </div>

            {/* Modal Body / DB Summary */}
            <div className="overflow-y-auto no-scrollbar pb-4">
              <h3 className="text-lg font-bold mb-4 text-[#151313]">Overall Performance Summary</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-amber-50/70 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                  <p className="text-3xl font-black text-[#151313] mb-1">{totalHours}</p>
                  <p className="text-[9px] uppercase font-bold text-amber-600 tracking-wider">Total Hours</p>
                </div>
                <div className="bg-green-50/70 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                  <p className="text-3xl font-black text-[#151313] mb-1">{completedSessions.length}</p>
                  <p className="text-[9px] uppercase font-bold text-green-600 tracking-wider">Classes Done</p>
                </div>
                <div className="bg-red-50/70 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                  <p className="text-3xl font-black text-[#151313] mb-1">{upcomingCount}</p>
                  <p className="text-[9px] uppercase font-bold text-red-500 tracking-wider">Upcoming</p>
                </div>
                <div className="bg-purple-50/70 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                  <p className="text-3xl font-black text-[#151313] mb-1">{attendanceRate}%</p>
                  <p className="text-[9px] uppercase font-bold text-purple-600 tracking-wider">Attendance</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span>👩‍🏫</span> My Tutors
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {uniqueTutors.length > 0 ? uniqueTutors.map((t, i) => (
                      <span key={i} className="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-100">
                        {t}
                      </span>
                    )) : <span className="text-sm text-slate-400 font-medium">No tutors assigned yet.</span>}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span>📚</span> Enrolled Subjects
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {uniqueSubjects.length > 0 ? uniqueSubjects.map((s, i) => (
                      <span key={i} className="bg-[#151313] text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
                        {s}
                      </span>
                    )) : <span className="text-sm text-slate-400 font-medium">No subjects found.</span>}
                  </div>
                </div>
              </div>

              {/* Logout Button inside Modal */}
              <button 
                onClick={logout} 
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout from TutorFlow
              </button>
              
            </div>
          </div>
        </div>
      )}

      {/* ── CLASS NOTES POPUP MODAL ── */}
      {selectedNoteSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151313]/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[85vh] p-8 animate-in fade-in zoom-in duration-300 border-4 border-white/20">
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedNoteSession(null)} 
              className="absolute top-6 right-6 w-10 h-10 bg-white border border-slate-200 hover:border-black rounded-full flex items-center justify-center text-slate-500 hover:text-black transition-colors shadow-sm hover:shadow-md z-10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Modal Header */}
            <div className="mb-6 border-b border-slate-100 pb-4 pr-12">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#ff5734] px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-[#ff5734]/20">
                  {selectedNoteSession.studentProfile?.subject || 'Class Notes'}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  • {new Date(selectedNoteSession.startTime).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-[#151313] tracking-tight">{selectedNoteSession.topic}</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">👨‍🏫 Tutor: <span className="font-bold text-slate-700">{selectedNoteSession.tutor.name}</span> ({selectedNoteSession.tutor.email})</p>
            </div>

            {/* Modal Body / Full Notes */}
            <div className="overflow-y-auto no-scrollbar flex-1 pr-1">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-6">
                <h3 className="text-xs font-bold text-[#ff5734] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>📄</span> Full Lesson Notes & Overview
                </h3>
                <div className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedNoteSession.notes || "No text notes added for this class."}
                </div>
              </div>

              {/* Class Asset File / Link if attached */}
              {selectedNoteSession.classAssetUrl && (
                <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm mb-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span>📎</span> Attached Learning Material
                  </h4>
                  {renderAsset(selectedNoteSession)}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedNoteSession(null)}
                className="bg-[#151313] hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl transition-all text-xs"
              >
                Close Notes
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── HOMEWORK POPUP MODAL ── */}
      {selectedHomeworkSession && (() => {
        const review = parseReview(selectedHomeworkSession.aiReview);
        const isHwCompleted = completedHomeworkIds.includes(selectedHomeworkSession.id);
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151313]/60 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[85vh] p-8 animate-in fade-in zoom-in duration-300 border-4 border-white/20">
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedHomeworkSession(null)} 
                className="absolute top-6 right-6 w-10 h-10 bg-white border border-slate-200 hover:border-black rounded-full flex items-center justify-center text-slate-500 hover:text-black transition-colors shadow-sm hover:shadow-md z-10"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Modal Header */}
              <div className="mb-6 border-b border-slate-100 pb-4 pr-12">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#ff5734] px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-[#ff5734]/20">
                    {selectedHomeworkSession.studentProfile?.subject || 'Homework Tasks'}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    • {new Date(selectedHomeworkSession.startTime).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-[#151313] tracking-tight">{selectedHomeworkSession.topic}</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">👨‍🏫 Assigned by: <span className="font-bold text-slate-700">{selectedHomeworkSession.tutor.name}</span></p>
              </div>

              {/* Modal Body / Full Homework Tasks */}
              <div className="overflow-y-auto no-scrollbar flex-1 pr-1">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-6">
                  <h3 className="text-xs font-bold text-[#ff5734] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span>📝</span> Assigned Homework Tasks ({review?.homework?.length || 0})
                  </h3>
                  <div className="space-y-3">
                    {review?.homework?.map((hw: string, idx: number) => (
                      <div key={idx} className="flex gap-3 items-start bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <span className="w-6 h-6 rounded-full bg-[#151313] flex items-center justify-center shrink-0 mt-0.5 text-[#FCE166] font-black text-xs">{idx + 1}</span>
                        <span className="text-sm font-semibold text-slate-800 leading-relaxed">{hw}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <button
                  onClick={() => { handleMarkHomework(selectedHomeworkSession.id); }}
                  disabled={isHwCompleted}
                  className={`py-3 px-6 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                    isHwCompleted
                      ? 'bg-green-500 text-white cursor-default'
                      : 'bg-[#ff5734] hover:bg-[#e04a2a] text-white shadow-md active:scale-95'
                  }`}
                >
                  {isHwCompleted ? '✓ Marked as Completed' : 'Mark Homework as Completed'}
                </button>
                <button
                  onClick={() => setSelectedHomeworkSession(null)}
                  className="bg-[#151313] hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl transition-all text-xs"
                >
                  Close Window
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── UPCOMING CLASS DETAILS POPUP MODAL ── */}
      {selectedUpcomingSession && (() => {
        const session = selectedUpcomingSession;
        const now = new Date();
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        const isOngoing = startTime <= now && endTime > now;
        const isCompleted = session.status === 'COMPLETED' || session.status === 'AI_REVIEWED';
        const isExpired = !isCompleted && endTime <= now;
        const durationMins = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
        const diffMs = startTime.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);

        let countdownText = '';
        if (isOngoing) countdownText = '🔴 Class is happening right now!';
        else if (isExpired || isCompleted) countdownText = 'This class has ended.';
        else if (diffDays > 0) countdownText = `Starts in ${diffDays}d ${diffHrs % 24}h`;
        else if (diffHrs > 0) countdownText = `Starts in ${diffHrs}h ${diffMins % 60}m`;
        else countdownText = `Starts in ${diffMins} minutes`;

        const subject = session.studentProfile?.subject || '';
        const level = session.studentProfile?.level || '';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151313]/60 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[85vh] p-8 animate-in fade-in zoom-in duration-300 border-4 border-white/20">
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedUpcomingSession(null)} 
                className="absolute top-6 right-6 w-10 h-10 bg-white border border-slate-200 hover:border-black rounded-full flex items-center justify-center text-slate-500 hover:text-black transition-colors shadow-sm hover:shadow-md z-10"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Modal Header */}
              <div className="mb-6 border-b border-slate-100 pb-4 pr-12">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${isOngoing ? 'text-[#ff5734] border-[#ff5734]/20' : isCompleted ? 'text-green-600 border-green-200' : isExpired ? 'text-slate-500 border-slate-200' : 'text-[#ff5734] border-[#ff5734]/20'}`}>
                    {isOngoing ? '● Live Now' : isCompleted ? '✓ Completed' : isExpired ? 'Expired' : subject || 'Upcoming Class'}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    • {startTime.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-[#151313] tracking-tight">{session.topic}</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  👨‍🏫 Tutor: <span className="font-bold text-slate-700">{session.tutor.name}</span> ({session.tutor.email})
                </p>
                <p className={`text-xs font-bold mt-2 ${isOngoing ? 'text-[#ff5734]' : isCompleted ? 'text-green-600' : isExpired ? 'text-slate-400' : 'text-blue-600'}`}>
                  {countdownText}
                </p>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-4">

                {/* Email notice */}
                <div className=" border border-blue-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                  <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-xs text-blue-700 font-semibold leading-snug">
                    This class information was sent to your registered email address. Check your inbox for the full details, including any attachments or links from your tutor. Please use the attached materials or links to join the class at the correct scheduled time.
                  </p>
                </div>

                {/* Schedule Details */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <h3 className="text-xs font-bold text-[#ff5734] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span>📅</span> Class Schedule
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl p-3 border border-slate-100">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Date</p>
                      <p className="font-bold text-[#151313] text-sm">{startTime.toLocaleDateString([], { weekday: 'short', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-100">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Time</p>
                      <p className="font-bold text-[#151313] text-sm">{startTime.toLocaleTimeString([], { timeStyle: 'short' })} – {endTime.toLocaleTimeString([], { timeStyle: 'short' })}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-100">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Duration</p>
                      <p className="font-bold text-[#151313] text-sm">{durationMins} minutes</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-100">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Subject</p>
                      <p className="font-bold text-[#151313] text-sm">{subject || '—'}{level ? ` · ${level}` : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Tutor Info */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <h3 className="text-xs font-bold text-[#ff5734] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span>👨‍🏫</span> Tutor Details
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#151313] rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {session.tutor.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-[#151313] text-sm">{session.tutor.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{session.tutor.email}</p>
                    </div>
                  </div>
                </div>

                {/* Session Notes */}
                {session.notes && (
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <h3 className="text-xs font-bold text-[#ff5734] uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span>📄</span> Session Notes
                    </h3>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{session.notes}</p>
                  </div>
                )}

                {/* Join Link / Asset */}
                {session.classAssetUrl && session.classMode ? (
                  <div className={`rounded-2xl p-5 border ${isOngoing ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
                    <h3 className="text-xs font-bold text-[#ff5734] uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span>🔗</span> {isOngoing ? 'Join Class Now' : 'Class Resource'}
                    </h3>
                    {isOngoing && (
                      <p className="text-xs text-orange-700 font-semibold mb-3">Your tutor has set up the class. Click below to join!</p>
                    )}
                    {renderAsset(session)}
                  </div>
                ) : !isExpired && !isCompleted ? (
                  <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
                    <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <span>⏳</span> Waiting for Class Link
                    </h3>
                    <p className="text-xs text-amber-700 font-semibold">
                      Your tutor hasn't added a join link yet. Check your email closer to class time or contact your tutor at <span className="underline">{session.tutor.email}</span>.
                    </p>
                  </div>
                ) : null}

              </div>

              {/* Modal Footer */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <a
                  href={`mailto:${session.tutor.email}`}
                  className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#ff5734] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Email Tutor
                </a>
                <button 
                  onClick={() => setSelectedUpcomingSession(null)}
                  className="bg-[#151313] hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl transition-all text-xs"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── AI SUMMARY POPUP MODAL ── */}
      {selectedSummarySession && (() => {
        const review = parseReview(selectedSummarySession.aiReview);
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151313]/60 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[85vh] p-8 animate-in fade-in zoom-in duration-300 border-4 border-white/20">
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedSummarySession(null)} 
                className="absolute top-6 right-6 w-10 h-10 bg-white border border-slate-200 hover:border-black rounded-full flex items-center justify-center text-slate-500 hover:text-black transition-colors shadow-sm hover:shadow-md z-10"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Modal Header */}
              <div className="mb-6 border-b border-slate-100 pb-4 pr-12">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#ff5734] px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-[#ff5734]/20">
                    {selectedSummarySession.studentProfile?.subject || 'AI Review'}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    • {new Date(selectedSummarySession.startTime).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-[#151313] tracking-tight">{selectedSummarySession.topic}</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">👨‍🏫 Session Review by: <span className="font-bold text-slate-700">{selectedSummarySession.tutor.name}</span></p>
              </div>

              {/* Modal Body / Full AI Summary */}
              <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-4">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <h3 className="text-xs font-bold text-[#ff5734] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span>✨</span> Class Summary
                  </h3>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {review?.summary || "No summary details generated."}
                  </p>
                </div>

                <div className="bg-[#facb3b]/10 rounded-2xl p-6 border border-[#facb3b]/30">
                  <h3 className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span>💡</span> Suggestion & Focus For Next Class
                  </h3>
                  <p className="text-sm font-medium text-amber-900 leading-relaxed whitespace-pre-wrap">
                    {review?.suggestionForNextClass || "No suggestions provided."}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setSelectedSummarySession(null)}
                  className="bg-[#151313] hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl transition-all text-xs"
                >
                  Close Summary
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default StudentDashboard;