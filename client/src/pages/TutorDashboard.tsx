import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';

interface Student {
  id: string;
  subject: string;
  level: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface Session {
  id: string;
  startTime: string;
  endTime: string;
  topic: string;
  status: string;
  studentProfile: {
    id: string;
    user: {
      name: string;
    }
  };
  classMode?: string;
  classAssetUrl?: string;
}

const TutorDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  
  // Add Student Form State
  const [newStudent, setNewStudent] = useState({ name: '', email: '', password: '', subject: '', level: '', learningGoals: '', weakAreas: '' });
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<{id: string, message: string, time: string, isRead: boolean}[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toastNotif, setToastNotif] = useState<string | null>(null);

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log("Audio play failed");
    }
  };

  const [newSession, setNewSession] = useState({ 
    studentId: '', 
    topic: '', 
    startTime: '', 
    endTime: '',
    classMode: '',
    classAssetLink: '',
    classAssetFile: null as File | null
  });
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  const fetchData = async () => {
    try {
      const [studentRes, sessionRes] = await Promise.all([
        api.get('/students'),
        api.get('/sessions')
      ]);
      setStudents(studentRes.data);
      setSessions(sessionRes.data);
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      const newNotifs: any[] = [];

      sessions.filter(s => s.status === 'SCHEDULED').forEach(session => {
        const startTime = new Date(session.startTime);
        const diffMs = startTime.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        // 5 min warning
        if (diffMins > 0 && diffMins <= 5) {
          newNotifs.push({
            id: `start-soon-${session.id}`,
            message: `Class "${session.topic}" starts in ${diffMins} minutes!`,
            time: new Date().toISOString(),
            isRead: false
          });
        }
        
        // At exact time (or up to 1 min past)
        if (diffMins === 0) {
          newNotifs.push({
            id: `start-now-${session.id}`,
            message: `Class "${session.topic}" is starting right now!`,
            time: new Date().toISOString(),
            isRead: false
          });
        }
        
        // Expired (End time passed and not started)
        const endTime = new Date(session.endTime);
        if (now.getTime() > endTime.getTime()) {
           newNotifs.push({
            id: `expired-${session.id}`,
            message: `Class "${session.topic}" was missed and has expired.`,
            time: new Date().toISOString(),
            isRead: false
          });
        }
      });
      
      if (newNotifs.length > 0) {
        setNotifications(prev => {
          // Check if these are truly new (not in prev) to avoid repeating toasts
          const trulyNew = newNotifs.filter(n => !prev.some(p => p.id === n.id));
          if (trulyNew.length > 0) {
            playNotificationSound();
            setToastNotif(trulyNew[0].message);
            setTimeout(() => setToastNotif(null), 4000);
          }
          const combined = [...newNotifs, ...prev];
          // Remove duplicates based on ID
          const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
          return unique;
        });
      }
    };

    if (sessions.length > 0) {
      checkNotifications(); // Initial check
      const interval = setInterval(checkNotifications, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [sessions]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/students', newStudent);
      setIsAddingStudent(false);
      setNewStudent({ name: '', email: '', password: '', subject: '', level: '', learningGoals: '', weakAreas: '' });
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Error adding student", error);
      alert('Failed to add student');
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScheduleSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError('');
    setIsSubmitting(true);
    try {
      let payload: any;
      let headers: any = {};
      
      if (newSession.classMode === 'RECORDING' || newSession.classMode === 'NOTES') {
        payload = new FormData();
        payload.append('studentId', newSession.studentId);
        payload.append('topic', newSession.topic);
        payload.append('startTime', newSession.startTime);
        payload.append('endTime', newSession.endTime);
        payload.append('classMode', newSession.classMode);
        if (newSession.classAssetFile) {
          payload.append('classAssetFile', newSession.classAssetFile);
        }
        headers = { 'Content-Type': 'multipart/form-data' };
      } else {
        payload = {
          studentId: newSession.studentId,
          topic: newSession.topic,
          startTime: newSession.startTime,
          endTime: newSession.endTime,
          classMode: newSession.classMode,
          classAssetLink: newSession.classAssetLink
        };
      }

      if (editSessionId) {
        await api.put(`/sessions/${editSessionId}`, payload, { headers });
      } else {
        await api.post('/sessions/schedule', payload, { headers });
      }
      setIsScheduling(false);
      setEditSessionId(null);
      setNewSession({ studentId: '', topic: '', startTime: '', endTime: '', classMode: '', classAssetLink: '', classAssetFile: null });
      fetchData(); // Refresh list
    } catch (error: any) {
      setScheduleError(error.response?.data?.error || 'Failed to schedule session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isScheduleFormValid = 
    newSession.studentId !== '' &&
    newSession.topic.trim() !== '' &&
    newSession.startTime !== '' &&
    newSession.endTime !== '' &&
    (
      newSession.classMode === '' ||
      (newSession.classMode === 'VIDEO_CALL' && newSession.classAssetLink.trim() !== '') ||
      ((newSession.classMode === 'RECORDING' || newSession.classMode === 'NOTES') && newSession.classAssetFile !== null)
    );

  const isStudentFormValid = 
    newStudent.name.trim() !== '' &&
    newStudent.email.trim() !== '' &&
    newStudent.password.trim() !== '' &&
    newStudent.subject.trim() !== '' &&
    newStudent.level.trim() !== '' &&
    newStudent.learningGoals.trim() !== '' &&
    newStudent.weakAreas.trim() !== '';

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this scheduled session?")) return;
    try {
      await api.delete(`/sessions/${id}`);
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Error deleting session", error);
      alert("Failed to delete session");
    }
  };

  return (
    <div className="min-h-screen relative z-10 pb-20">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40 mb-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-[72px]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20">
                <span className="text-sm font-bold text-white tracking-wider">TF</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">TutorFlow</h1>
            </div>
            <div className="flex items-center space-x-6">
              
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors relative"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <span className="absolute top-1 right-1.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                      <button onClick={() => setNotifications(notifications.map(n => ({...n, isRead: true})))} className="text-xs text-blue-600 font-semibold hover:underline">Mark all read</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm font-medium">No new notifications</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`p-3 border-b border-slate-50 text-sm ${n.isRead ? 'bg-white opacity-70' : 'bg-blue-50/30'}`}>
                            <p className="text-slate-800 font-medium">{n.message}</p>
                            <p className="text-[10px] text-slate-500 mt-1 font-semibold">{new Date(n.time).toLocaleTimeString([], {timeStyle: 'short'})}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-sm font-semibold text-slate-600">{user?.name}</span>
              </div>
              <button onClick={logout} className="text-sm text-slate-500 hover:text-red-500 font-semibold transition-colors">Sign Out</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-up">
        
        {/* Sessions Section */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Upcoming Sessions</h2>
              <p className="text-slate-500 mt-1.5 font-medium text-sm">Manage your schedule and live classes</p>
            </div>
            <button 
              onClick={() => setIsScheduling(!isScheduling)}
              className={isScheduling ? "btn-secondary" : "btn-primary"}
            >
              {isScheduling ? 'Cancel' : '+ Schedule Session'}
            </button>
          </div>

          {isScheduling && (
            <div className="premium-card p-8 mb-10 animate-fade-in-up">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="text-blue-600">📅</span> {editSessionId ? 'Edit Session' : 'Schedule a Class'}
              </h3>
              {scheduleError && <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium">{scheduleError}</div>}
              
              <form onSubmit={handleScheduleSession} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-1">
                  <label className="label-text">Select Student</label>
                  <select 
                    required
                    className="input-field appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010l5%205%205-5%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:calc(100%-1rem)_center]"
                    value={newSession.studentId}
                    onChange={e => setNewSession({...newSession, studentId: e.target.value})}
                  >
                    <option value="" disabled className="text-slate-500">Choose a student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.user.name} ({s.subject})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="label-text">Class Topic</label>
                  <input type="text" required className="input-field" placeholder="e.g. Algebra Variables" value={newSession.topic} onChange={e => setNewSession({...newSession, topic: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="label-text">Start Time</label>
                  <input 
                    type="datetime-local" 
                    required 
                    className="input-field" 
                    min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    value={newSession.startTime} 
                    onChange={e => {
                      const newStartTime = e.target.value;
                      let newEndTime = newSession.endTime;
                      if (newEndTime && newEndTime < newStartTime) {
                        newEndTime = '';
                      }
                      setNewSession({...newSession, startTime: newStartTime, endTime: newEndTime});
                    }} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="label-text">End Time</label>
                  <input 
                    type="datetime-local" 
                    required 
                    className="input-field" 
                    min={newSession.startTime || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    value={newSession.endTime} 
                    onChange={e => {
                      const newEndTime = e.target.value;
                      if (newSession.startTime && newEndTime < newSession.startTime) {
                        alert("End time cannot be before the start time!");
                        return; 
                      }
                      setNewSession({...newSession, endTime: newEndTime});
                    }} 
                  />
                </div>
                
                <div className="space-y-1 md:col-span-2">
                  <label className="label-text">Class Mode</label>
                  <select 
                    className="input-field appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010l5%205%205-5%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:calc(100%-1rem)_center]"
                    value={newSession.classMode}
                    onChange={e => setNewSession({...newSession, classMode: e.target.value, classAssetLink: '', classAssetFile: null})}
                  >
                    <option value="" disabled className="text-slate-500">Select class mode (optional)</option>
                    <option value="VIDEO_CALL">Live Video Call</option>
                    <option value="RECORDING">Recorded Video</option>
                    <option value="NOTES">Static Notes / Presentation</option>
                  </select>
                </div>

                {newSession.classMode === 'VIDEO_CALL' && (
                  <div className="space-y-1 md:col-span-2 animate-fade-in-up">
                    <label className="label-text">Meeting Link (Zoom, Meet, etc.)</label>
                    <input 
                      type="url" 
                      required 
                      className="input-field" 
                      placeholder="https://meet.google.com/..." 
                      value={newSession.classAssetLink} 
                      onChange={e => setNewSession({...newSession, classAssetLink: e.target.value})} 
                    />
                  </div>
                )}

                {(newSession.classMode === 'RECORDING' || newSession.classMode === 'NOTES') && (
                  <div className="space-y-1 md:col-span-2 animate-fade-in-up">
                    <label className="label-text">Upload File ({newSession.classMode === 'RECORDING' ? 'MP4' : 'PDF'})</label>
                    <input 
                      type="file" 
                      required 
                      accept={newSession.classMode === 'RECORDING' ? 'video/mp4' : 'application/pdf'}
                      className="input-field py-2.5 bg-white" 
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setNewSession({...newSession, classAssetFile: e.target.files[0]});
                        }
                      }} 
                    />
                  </div>
                )}

                <div className="md:col-span-2 pt-6 border-t border-slate-100 flex justify-end gap-3 mt-2">
                  {editSessionId && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditSessionId(null);
                        setIsScheduling(false);
                        setNewSession({ studentId: '', topic: '', startTime: '', endTime: '', classMode: '', classAssetLink: '', classAssetFile: null });
                      }} 
                      className="btn-secondary w-full md:w-auto px-8"
                    >
                      Cancel
                    </button>
                  )}
                  <button type="submit" disabled={isSubmitting || !isScheduleFormValid} className="btn-primary w-full md:w-auto px-10 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmitting ? 'Saving...' : (editSessionId ? 'Update Schedule' : 'Confirm Schedule')}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.filter(s => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS').map(session => {
              const isExpired = session.status === 'SCHEDULED' && new Date(session.endTime) < new Date();
              return (
              <div 
                key={session.id} 
                onClick={() => { if (!isExpired) window.location.href = `/session/${session.id}`; }}
                className={`premium-card-interactive p-6 relative group flex flex-col justify-between ${isExpired ? 'opacity-70 bg-slate-50' : 'cursor-pointer'}`}
              >
                {session.status === 'IN_PROGRESS' && (
                  <div className="absolute -top-1 -right-1 w-20 h-20 bg-emerald-500/10 rounded-bl-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
                )}
                <div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <h3 className="font-bold text-[19px] text-slate-800 group-hover:text-blue-600 transition-colors pr-2 line-clamp-1 leading-tight tracking-tight" title={session.topic}>{session.topic}</h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditSessionId(session.id);
                          setNewSession({
                            studentId: session.studentProfile.id,
                            topic: session.topic,
                            startTime: new Date(new Date(session.startTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                            endTime: new Date(new Date(session.endTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                            classMode: session.classMode || '',
                            classAssetLink: session.classAssetUrl?.startsWith('http') ? session.classAssetUrl : '',
                            classAssetFile: null
                          });
                          setIsScheduling(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors flex items-center justify-center"
                        title="Edit Session"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex items-center justify-center"
                        title="Delete Session"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 mb-5 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm">
                        <span className="text-[11px] font-bold text-slate-600">{session.studentProfile.user.name.charAt(0)}</span>
                      </div>
                      <p className="text-sm text-slate-600 font-semibold">{session.studentProfile.user.name}</p>
                    </div>
                    
                    {session.classMode && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200/60 inline-flex items-center gap-1 shadow-sm">
                          {session.classMode === 'VIDEO_CALL' && '📹 Live Video'}
                          {session.classMode === 'RECORDING' && '📼 Recorded'}
                          {session.classMode === 'NOTES' && '📄 Notes'}
                        </span>
                        {session.classAssetUrl && (
                          <span className="text-[11px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md border border-blue-100 shadow-sm" title="Has attachment/link">
                            📎 Attached
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 relative z-10">
                  <div className="flex justify-between items-end">
                    <div className="text-sm font-semibold text-slate-700 flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">📅</span>
                        <span className={isExpired ? 'line-through text-slate-400' : ''}>{new Date(session.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">🕒</span>
                        <span className={isExpired ? 'line-through text-slate-400' : ''}>{new Date(session.startTime).toLocaleTimeString([], { timeStyle: 'short' })} - {new Date(session.endTime).toLocaleTimeString([], { timeStyle: 'short' })}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-md shadow-sm border ${
                      session.status === 'IN_PROGRESS' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                      isExpired ? 'bg-red-50 text-red-600 border-red-200' :
                      'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {session.status === 'IN_PROGRESS' ? 'Live Now' : isExpired ? 'Expired' : 'Scheduled'}
                    </span>
                  </div>
                </div>
              </div>
            )})}
            {sessions.filter(s => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS').length === 0 && (
              <div className="col-span-full premium-card p-12 text-center flex flex-col items-center justify-center border-dashed border-slate-300 bg-slate-50/50">
                <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                  <span className="text-3xl">☕</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800">No upcoming sessions</h3>
                <p className="text-sm text-slate-500 mt-1.5 font-medium max-w-xs">Take a break or schedule a new class to get started.</p>
              </div>
            )}
          </div>
        </section>

        {/* Students Section */}
        <section className="mb-20">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Student Roster</h2>
              <p className="text-slate-500 mt-1.5 font-medium text-sm">Manage your active students</p>
            </div>
            <button 
              onClick={() => setIsAddingStudent(!isAddingStudent)}
              className={isAddingStudent ? "btn-secondary" : "btn-primary"}
            >
              {isAddingStudent ? 'Cancel' : '+ Add Student'}
            </button>
          </div>

          {isAddingStudent && (
            <div className="premium-card p-8 mb-10 animate-fade-in-up">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="text-indigo-600">👤</span> Onboard New Student
              </h3>
              <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-1"><label className="label-text">Full Name</label><input type="text" required className="input-field" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} /></div>
                <div className="space-y-1"><label className="label-text">Email Address</label><input type="email" required className="input-field" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} /></div>
                <div className="space-y-1"><label className="label-text">Temporary Password</label><input type="password" required className="input-field" value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})} /></div>
                <div className="space-y-1"><label className="label-text">Subject Focus</label><input type="text" placeholder="e.g. Advanced Calculus" required className="input-field" value={newStudent.subject} onChange={e => setNewStudent({...newStudent, subject: e.target.value})} /></div>
                <div className="space-y-1 md:col-span-2"><label className="label-text">Academic Level</label><input type="text" placeholder="e.g. University Year 1" required className="input-field" value={newStudent.level} onChange={e => setNewStudent({...newStudent, level: e.target.value})} /></div>
                <div className="space-y-1"><label className="label-text">Primary Learning Goals</label><input type="text" required className="input-field" value={newStudent.learningGoals} onChange={e => setNewStudent({...newStudent, learningGoals: e.target.value})} /></div>
                <div className="space-y-1"><label className="label-text">Known Weak Areas</label><input type="text" required className="input-field" value={newStudent.weakAreas} onChange={e => setNewStudent({...newStudent, weakAreas: e.target.value})} /></div>
                <div className="md:col-span-2 pt-6 border-t border-slate-100 flex justify-end mt-2">
                  <button type="submit" disabled={!isStudentFormValid} className="btn-primary w-full md:w-auto px-10 disabled:opacity-50 disabled:cursor-not-allowed">Create Profile</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map(student => (
              <div key={student.id} className="premium-card p-0 flex flex-col overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <h3 className="font-bold text-[19px] text-slate-800 leading-tight tracking-tight">{student.user.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium">{student.user.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Subject</p>
                      <p className="text-sm text-slate-700 font-semibold truncate" title={student.subject}>{student.subject}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Level</p>
                      <p className="text-sm text-slate-700 font-semibold truncate" title={student.level}>{student.level}</p>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-2">
                    <button 
                      onClick={async () => {
                        try {
                          const btn = document.getElementById(`btn-ai-${student.id}`);
                          if(btn) btn.innerHTML = '<span class="animate-pulse">Analyzing...</span>';
                          const res = await api.get(`/ai/progress-summary/${student.id}`);
                          alert(res.data.progressSummary);
                          if(btn) btn.innerHTML = '✨ AI Progress Summary';
                        } catch(e: any) {
                          alert(e.response?.data?.error || "Failed to generate");
                          const btn = document.getElementById(`btn-ai-${student.id}`);
                          if(btn) btn.innerHTML = '✨ AI Progress Summary';
                        }
                      }}
                      id={`btn-ai-${student.id}`}
                      className="w-full bg-indigo-50 text-indigo-700 border border-indigo-100 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-100 hover:border-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      ✨ AI Progress Summary
                    </button>
                  </div>
                </div>

                {/* Progress View / History */}
                <div className="bg-slate-50 p-5 border-t border-slate-100 mt-auto">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span>Past Sessions</span>
                    <span className="flex-1 h-px bg-slate-200"></span>
                  </h4>
                  {sessions.filter(s => s.studentId === student.id && (s.status === 'COMPLETED' || s.status === 'AI_REVIEWED')).length > 0 ? (
                    <ul className="text-xs space-y-2 max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                      {sessions.filter(s => s.studentId === student.id && (s.status === 'COMPLETED' || s.status === 'AI_REVIEWED'))
                        .sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                        .map(s => (
                          <li key={s.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm transition-colors hover:border-slate-300">
                            <span className="truncate w-36 text-slate-700 font-medium" title={s.topic}>{s.topic}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{new Date(s.startTime).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                          </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-slate-400 text-center py-3 font-medium">No history yet.</div>
                  )}
                </div>
              </div>
            ))}
            {students.length === 0 && (
              <div className="col-span-full premium-card p-12 text-center flex flex-col items-center justify-center border-dashed border-slate-300 bg-slate-50/50">
                <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                  <span className="text-3xl">👥</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Your roster is empty</h3>
                <p className="text-sm text-slate-500 mt-1.5 font-medium max-w-xs">Add a student to get started.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Toast Notification */}
      {toastNotif && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700">
          <span className="text-xl">🔔</span>
          <p className="font-medium text-sm">{toastNotif}</p>
        </div>
      )}
    </div>
  );
};

export default TutorDashboard;
