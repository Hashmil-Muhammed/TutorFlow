import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { useDebounce } from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';

const SessionLiveRoom: React.FC = () => {
  const { logout } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState('');
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [rightPanel, setRightPanel] = useState<'details' | 'student' | 'ai' | null>('details');

  const debouncedNotes = useDebounce(notes, 1000);
  const isFirstRender = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await api.get(`/sessions/${id}`);
        setSession(res.data);
        setNotes(res.data.notes || '');
        setSavedNotes(res.data.notes || '');
        setStatus(res.data.status);
      } catch (error) {
        console.error("Failed to load session", error);
        alert("Failed to load session");
      }
    };
    fetchSession();
  }, [id]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (debouncedNotes !== savedNotes && status === 'IN_PROGRESS') {
      const saveNotes = async () => {
        setIsSaving(true);
        try {
          await api.put(`/sessions/${id}/notes`, { notes: debouncedNotes });
          setSavedNotes(debouncedNotes);
        } catch (error) { console.error("Autosave failed", error); }
        finally { setIsSaving(false); }
      };
      saveNotes();
    }
  }, [debouncedNotes, id, savedNotes, status]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (notes !== savedNotes) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [notes, savedNotes]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'IN_PROGRESS' && session?.endTime && session?.startTime) {
      const durationMs = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
      let startedAt = localStorage.getItem(`session_start_${session.id}`);
      if (!startedAt) { startedAt = Date.now().toString(); localStorage.setItem(`session_start_${session.id}`, startedAt); }
      const updateTimer = () => { const elapsedMs = Date.now() - parseInt(startedAt as string); setTimeLeft(durationMs - elapsedMs); };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else { setTimeLeft(null); }
    return () => clearInterval(interval);
  }, [status, session]);

  const formatTimeLeft = (ms: number) => {
    const isNegative = ms < 0;
    const absMs = Math.abs(ms);
    const totalSeconds = Math.floor(absMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const formatted = `${hours > 0 ? hours.toString().padStart(2, '0') + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return isNegative ? `-${formatted}` : formatted;
  };

  const advanceState = async (newState: string) => {
    try {
      if (newState === 'COMPLETED' && notes !== savedNotes) {
        setIsSaving(true);
        await api.put(`/sessions/${id}/notes`, { notes });
        setSavedNotes(notes);
        setIsSaving(false);
      }
      const res = await api.put(`/sessions/${id}/state`, { newState });
      setStatus(res.data.status);
    } catch (error: any) { alert(error.response?.data?.error || "Failed to update state"); }
  };

  const generateLessonPlan = async () => {
    setIsSaving(true);
    try {
      const res = await api.post(`/ai/lesson-plan/${id}`);
      setSession((prev: any) => ({ ...prev, ...res.data }));
      setRightPanel('ai');
    } catch (error) { alert('Failed to generate lesson plan'); }
    finally { setIsSaving(false); }
  };

  const generateReview = async () => {
    setIsSaving(true);
    try {
      const res = await api.post(`/ai/session-review/${id}`);
      setSession((prev: any) => ({ ...prev, ...res.data }));
      setStatus('AI_REVIEWED');
      setRightPanel('ai');
    } catch (error) { alert('Failed to generate review. Ensure you have written notes.'); }
    finally { setIsSaving(false); }
  };

  const getAssetUrl = (url: string) => url.startsWith('http') ? url : `http://localhost:5000${url}`;

  const getDurationString = () => {
    if (!session?.startTime || !session?.endTime) return '';
    const durationMins = Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000);
    const h = Math.floor(durationMins / 60);
    const m = durationMins % 60;
    return `${h > 0 ? `${h} hr ` : ''}${m > 0 ? `${m} min` : ''}`.trim() || '0 min';
  };

  if (!session) return (
    <div className="flex w-full min-h-screen bg-[#ecedf4] items-center justify-center"
      style={{ backgroundImage: 'linear-gradient(rgba(150,150,200,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(150,150,200,0.15) 1px,transparent 1px)', backgroundSize: '32px 32px' }}>
      <div className="text-center">
        <div className="text-5xl font-kodchasan font-black mb-4">
          <span className="text-[#151313]">T</span><span className="text-[#ff5734]">F</span><span className="text-[#ff5734]">.</span>
        </div>
        <p className="text-slate-400 font-semibold animate-pulse tracking-widest text-xs uppercase">Loading session...</p>
      </div>
    </div>
  );

  const isCompleted = status === 'COMPLETED' || status === 'AI_REVIEWED';
  const parsedLessonPlan = session.aiLessonPlan ? JSON.parse(session.aiLessonPlan) : null;
  const parsedReview = session.aiReview ? JSON.parse(session.aiReview) : null;
  const statusColor = status === 'IN_PROGRESS' ? '#22c55e' : (status === 'COMPLETED' || status === 'AI_REVIEWED') ? '#151313' : '#ff5734';

  return (
    <div className="w-full min-h-screen bg-[#ecedf4] flex items-center justify-center p-3 md:p-5"
      style={{ backgroundImage: 'linear-gradient(rgba(150,150,200,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(150,150,200,0.15) 1px,transparent 1px)', backgroundSize: '32px 32px' }}>

      <div className="fixed top-4 right-5 text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase select-none z-10">TutorFlow • Live Session</div>
      <div className="fixed bottom-4 left-5 text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase select-none z-10">TF • Live Room</div>

      {/* Main tablet frame */}
      <div className="w-full max-w-[1200px] h-[calc(100vh-2.5rem)] bg-white rounded-[2rem] border-[3px] border-[#151313] shadow-2xl flex overflow-hidden relative">

        {/* Top status stripe */}
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[2rem] z-50 transition-colors duration-1000" style={{ backgroundColor: statusColor }} />

        {/* Left Icon Sidebar */}
        <aside className="w-14 bg-white border-r border-slate-100 flex flex-col items-center py-5 gap-2.5 shrink-0 z-20">
          <button onClick={() => navigate('/tutor-dashboard')} className="mb-3 cursor-pointer hover:opacity-60 transition-opacity" title="Dashboard">
            <span className="font-kodchasan font-black text-xl tracking-tight leading-none select-none">
              <span className="text-[#151313]">T</span><span className="text-[#ff5734]">F</span><span className="text-[#ff5734]">.</span>
            </span>
          </button>

          <SidebarBtn title="Back to Dashboard" active={false} onClick={() => navigate('/tutor-dashboard')}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </SidebarBtn>

          <SidebarBtn title="Session Details" active={rightPanel === 'details'} onClick={() => setRightPanel(p => p === 'details' ? null : 'details')}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </SidebarBtn>

          <SidebarBtn title="Student Profile" active={rightPanel === 'student'} onClick={() => setRightPanel(p => p === 'student' ? null : 'student')}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </SidebarBtn>

          <SidebarBtn title="AI Tools" active={rightPanel === 'ai'} onClick={() => setRightPanel(p => p === 'ai' ? null : 'ai')}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </SidebarBtn>

          <div className="flex-1" />

          <div title={isSaving ? 'Saving...' : notes !== savedNotes ? 'Unsaved' : 'Saved'}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isSaving ? 'bg-amber-100 text-amber-500' : notes !== savedNotes ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-500'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </div>

          <button onClick={logout} title="Sign Out" className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#ff5734] hover:bg-red-50 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </aside>

        {/* Canvas area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${status === 'IN_PROGRESS' ? 'bg-emerald-500 animate-pulse' : isCompleted ? 'bg-slate-400' : 'bg-[#ff5734]'}`} />
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Live Room</p>
                <h1 className="font-kodchasan font-bold text-[#151313] text-sm truncate leading-tight">{session.topic}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <span className={`px-2 py-1 rounded-lg text-[9px] font-bold tracking-widest uppercase ${status === 'SCHEDULED' ? 'bg-amber-100 text-amber-700' : status === 'IN_PROGRESS' ? 'bg-emerald-100 text-emerald-700' : status === 'AI_REVIEWED' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                {status.replace('_', ' ')}
              </span>
              {status === 'IN_PROGRESS' && timeLeft !== null && (
                <span className={`px-2 py-1 rounded-lg text-[9px] font-bold font-mono ${timeLeft > 0 ? 'bg-[#fccc42]/30 text-amber-800' : 'bg-red-100 text-red-600 animate-pulse'}`}>
                  ? {timeLeft > 0 ? formatTimeLeft(timeLeft) : 'TIME IS UP!'}
                </span>
              )}
              {status === 'SCHEDULED' && (
                <button onClick={() => advanceState('IN_PROGRESS')} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-emerald-500/20">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  Start Class
                </button>
              )}
              {status === 'IN_PROGRESS' && (
                <button onClick={() => advanceState('COMPLETED')} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#ff5734]/10 hover:bg-[#ff5734]/20 active:scale-95 text-[#ff5734] font-bold text-xs rounded-lg border border-[#ff5734]/30 transition-all">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" /></svg>
                  End Class
                </button>
              )}
            </div>
          </div>

          {/* Grid notes canvas */}
          <div className="flex-1 relative overflow-hidden"
            style={{ backgroundImage: 'linear-gradient(rgba(150,150,200,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(150,150,200,0.12) 1px,transparent 1px)', backgroundSize: '28px 28px', backgroundColor: '#fafbff' }}>
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={status !== 'IN_PROGRESS'}
              placeholder={status === 'SCHEDULED' ? '?  Start the class to begin typing your session notes...' : isCompleted ? '??  Session ended. Notes are locked.' : 'Type your notes here... (autosaves automatically)'}
              className={`absolute inset-0 w-full h-full p-7 bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-[#151313] placeholder:text-slate-300 font-medium text-[15px] no-scrollbar ${status !== 'IN_PROGRESS' ? 'cursor-not-allowed opacity-60' : ''}`}
              style={{ lineHeight: '28px', paddingTop: '14px' }}
            />
            {isCompleted && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md rounded-2xl px-5 py-2.5 border border-slate-200 shadow-lg text-slate-500 text-xs font-semibold flex items-center gap-2">
                <span>??</span> Session complete — notes are locked.
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="px-5 py-2.5 bg-white/80 backdrop-blur-sm border-t border-slate-100 flex items-center gap-3 shrink-0">
            <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg transition-all ${isSaving ? 'bg-amber-50 text-amber-500' : notes !== savedNotes ? 'bg-slate-50 text-slate-400' : 'bg-emerald-50 text-emerald-600'}`}>
              {isSaving && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
              {isSaving ? 'Saving...' : notes !== savedNotes ? 'Unsaved' : '? Saved'}
            </div>
            <span className="text-[9px] text-slate-300 font-medium">{notes.length > 0 ? `${notes.split(/\s+/).filter(Boolean).length} words` : 'Start typing...'}</span>
            <div className="flex-1" />
            {session.classAssetUrl && (
              <a href={getAssetUrl(session.classAssetUrl)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[9px] font-bold text-[#ff5734] bg-[#ff5734]/10 hover:bg-[#ff5734]/20 px-3 py-1.5 rounded-lg border border-[#ff5734]/20 transition-all active:scale-95">
                {session.classMode === 'RECORDING' ? '?? Open Video' : session.classMode === 'NOTES' ? '?? Open PDF' : '?? Open Link'} ?
              </a>
            )}
          </div>
        </div>

        {/* Right Panel */}
        {rightPanel && (
          <div className="w-[280px] border-l border-slate-100 bg-white flex flex-col overflow-hidden shrink-0">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <h2 className="font-bold text-[#151313] text-sm">
                {rightPanel === 'details' && 'Session'}
                {rightPanel === 'student' && 'Student'}
                {rightPanel === 'ai' && '? AI Tools'}
              </h2>
              <button onClick={() => setRightPanel(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all text-lg">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 no-scrollbar">

              {rightPanel === 'details' && (
                <>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Scheduled</p>
                    <p className="text-sm font-bold text-[#151313]">{new Date(session.startTime).toLocaleTimeString([], { timeStyle: 'short' })} – {new Date(session.endTime).toLocaleTimeString([], { timeStyle: 'short' })}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{new Date(session.startTime).toLocaleDateString()}</p>
                    <p className="text-[10px] text-[#ff5734] font-bold mt-1">Duration: {getDurationString()}</p>
                  </div>
                  {session.classMode && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Class Mode</p>
                      <p className="text-sm font-bold text-[#151313]">
                        {session.classMode === 'VIDEO_CALL' && '?? Live Video Call'}
                        {session.classMode === 'RECORDING' && '?? Recorded Video'}
                        {session.classMode === 'NOTES' && '?? Notes / Presentation'}
                      </p>
                    </div>
                  )}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Topic</p>
                    <p className="text-sm font-bold text-[#151313] font-kodchasan">{session.topic}</p>
                  </div>
                </>
              )}

              {rightPanel === 'student' && (
                <>
                  <div className="bg-[#151313] rounded-2xl p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#ff5734] flex items-center justify-center shrink-0">
                      <span className="text-white font-bold font-kodchasan text-base">{session.studentProfile.user.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm truncate">{session.studentProfile.user.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{session.studentProfile.subject} · {session.studentProfile.level}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[9px] font-bold text-[#ff5734] uppercase tracking-widest mb-2">Learning Goals</p>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">{session.studentProfile.learningGoals}</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-2">Weak Areas</p>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">{session.studentProfile.weakAreas}</p>
                  </div>
                </>
              )}

              {rightPanel === 'ai' && (
                <>
                  {status === 'SCHEDULED' && !parsedLessonPlan && (
                    <div className="bg-[#151313] rounded-2xl p-5 flex flex-col items-center text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ff5734] to-[#facb3b]" />
                      <div className="h-10 w-10 bg-white/10 rounded-2xl flex items-center justify-center text-xl mb-3">?</div>
                      <h4 className="font-bold text-white mb-1 font-kodchasan text-sm">Plan the Session</h4>
                      <p className="text-[11px] text-slate-400 mb-4 font-medium leading-relaxed">Generate a personalized lesson plan.</p>
                      <button onClick={generateLessonPlan} disabled={isSaving} className="w-full py-2 bg-[#ff5734] hover:bg-[#e04a2a] active:scale-95 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50">
                        {isSaving ? <span className="animate-pulse">Analyzing...</span> : 'Generate AI Lesson Plan'}
                      </button>
                    </div>
                  )}
                  {parsedLessonPlan && (
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-400" />
                      <p className="text-[9px] font-bold text-purple-500 uppercase tracking-widest mb-3">? AI Lesson Plan</p>
                      <div className="space-y-3 text-xs">
                        <div>
                          <strong className="block mb-1.5 text-[#151313] text-[9px] uppercase tracking-wider">Objectives</strong>
                          <ul className="space-y-1.5">{parsedLessonPlan.objectives.map((o: string, i: number) => (<li key={i} className="flex gap-2"><span className="text-[#ff5734] font-bold shrink-0">•</span><span className="text-slate-600 leading-relaxed">{o}</span></li>))}</ul>
                        </div>
                        <div className="pt-3 border-t border-slate-100">
                          <strong className="block mb-1.5 text-[#151313] text-[9px] uppercase tracking-wider">Outline</strong>
                          <ul className="space-y-1.5">{parsedLessonPlan.outline.map((o: string, i: number) => (<li key={i} className="flex gap-2"><span className="text-[#ff5734] font-bold shrink-0">•</span><span className="text-slate-600 leading-relaxed">{o}</span></li>))}</ul>
                        </div>
                      </div>
                    </div>
                  )}
                  {status === 'COMPLETED' && (
                    <div className="bg-[#151313] rounded-2xl p-5 flex flex-col items-center text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-[#facb3b]" />
                      <div className="h-10 w-10 bg-white/10 rounded-2xl flex items-center justify-center text-xl mb-3">??</div>
                      <h4 className="font-bold text-white mb-1 font-kodchasan text-sm">Wrap Up Class</h4>
                      <p className="text-[11px] text-slate-400 mb-4 font-medium leading-relaxed">Generate a review and homework.</p>
                      <button onClick={generateReview} disabled={isSaving} className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50">
                        {isSaving ? <span className="animate-pulse">Processing...</span> : 'Generate AI Review'}
                      </button>
                    </div>
                  )}
                  {parsedReview && (
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-[#facb3b]" />
                      <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-3">? AI Session Review</p>
                      <div className="space-y-3 text-xs">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong className="block mb-1 text-[#151313] text-[9px] uppercase tracking-wider">Summary</strong>
                          <p className="text-slate-600 leading-relaxed">{parsedReview.summary}</p>
                        </div>
                        <div>
                          <strong className="block mb-1.5 text-[#151313] text-[9px] uppercase tracking-wider">Homework</strong>
                          <ul className="space-y-1.5">{parsedReview.homework.map((o: string, i: number) => (<li key={i} className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">•</span><span className="text-slate-600 leading-relaxed">{o}</span></li>))}</ul>
                        </div>
                        <div className="bg-[#facb3b]/10 p-3 rounded-xl border border-[#facb3b]/30">
                          <strong className="block mb-1 text-amber-800 text-[9px] uppercase tracking-wider">?? Next Class Focus</strong>
                          <p className="text-amber-800 leading-relaxed">{parsedReview.suggestionForNextClass}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {status === 'AI_REVIEWED' && parsedReview && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
                      <p className="text-emerald-700 font-bold text-xs">?? Session fully reviewed!</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SidebarBtn: React.FC<{ children: React.ReactNode; title: string; active: boolean; onClick: () => void }> = ({ children, title, active, onClick }) => (
  <button onClick={onClick} title={title}
    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-[#fccc42] text-[#151313] shadow-md scale-105' : 'text-slate-400 hover:text-[#151313] hover:bg-slate-100'}`}>
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">{children}</svg>
  </button>
);

export default SessionLiveRoom;
