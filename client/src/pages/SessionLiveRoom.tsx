import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { useDebounce } from '../hooks/useDebounce';

const SessionLiveRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState(''); // To track what is saved
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const debouncedNotes = useDebounce(notes, 1000);
  const isFirstRender = useRef(true);

  // Fetch session data
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

  // Handle Autosave with Debounce
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only save if notes changed and session is in progress
    if (debouncedNotes !== savedNotes && status === 'IN_PROGRESS') {
      const saveNotes = async () => {
        setIsSaving(true);
        try {
          await api.put(`/sessions/${id}/notes`, { notes: debouncedNotes });
          setSavedNotes(debouncedNotes);
        } catch (error) {
          console.error("Autosave failed", error);
        } finally {
          setIsSaving(false);
        }
      };
      saveNotes();
    }
  }, [debouncedNotes, id, savedNotes, status]);

  // Tab close protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (notes !== savedNotes) {
        e.preventDefault();
        e.returnValue = ''; // Shows the browser's default warning dialog
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [notes, savedNotes]);

  // Countdown Timer based on scheduled duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'IN_PROGRESS' && session?.endTime && session?.startTime) {
      const durationMs = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
      
      let startedAt = localStorage.getItem(`session_start_${session.id}`);
      if (!startedAt) {
        startedAt = Date.now().toString();
        localStorage.setItem(`session_start_${session.id}`, startedAt);
      }

      const updateTimer = () => {
        const elapsedMs = Date.now() - parseInt(startedAt as string);
        setTimeLeft(durationMs - elapsedMs);
      };
      
      updateTimer(); // Initialize immediately
      interval = setInterval(updateTimer, 1000);
    } else {
      setTimeLeft(null);
    }
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
      // If we are completing, force a final save of notes first
      if (newState === 'COMPLETED' && notes !== savedNotes) {
        setIsSaving(true);
        await api.put(`/sessions/${id}/notes`, { notes });
        setSavedNotes(notes);
        setIsSaving(false);
      }
      
      const res = await api.put(`/sessions/${id}/state`, { newState });
      setStatus(res.data.status);
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to update state");
    }
  };

  const generateLessonPlan = async () => {
    setIsSaving(true);
    try {
      const res = await api.post(`/ai/lesson-plan/${id}`);
      setSession((prev: any) => ({ ...prev, ...res.data }));
    } catch (error) {
      alert('Failed to generate lesson plan');
    } finally {
      setIsSaving(false);
    }
  };

  const generateReview = async () => {
    setIsSaving(true);
    try {
      const res = await api.post(`/ai/session-review/${id}`);
      setSession((prev: any) => ({ ...prev, ...res.data }));
      setStatus('AI_REVIEWED');
    } catch (error) {
      alert('Failed to generate review. Ensure you have written notes.');
    } finally {
      setIsSaving(false);
    }
  };

  const getAssetUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `http://localhost:5000${url}`;
  };

  const getDurationString = () => {
    if (!session?.startTime || !session?.endTime) return '';
    const durationMins = Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000);
    const durationHours = Math.floor(durationMins / 60);
    const durationRemainder = durationMins % 60;
    return `${durationHours > 0 ? `${durationHours} hr ` : ''}${durationRemainder > 0 ? `${durationRemainder} min` : ''}`.trim() || '0 min';
  };

  if (!session) return <div className="p-8 text-slate-500 font-medium text-center">Loading session...</div>;

  const isCompleted = status === 'COMPLETED' || status === 'AI_REVIEWED';
  const parsedLessonPlan = session.aiLessonPlan ? JSON.parse(session.aiLessonPlan) : null;
  const parsedReview = session.aiReview ? JSON.parse(session.aiReview) : null;

  return (
    <div className="min-h-screen relative z-10 flex flex-col pb-12">
      {/* Top indicator bar based on status */}
      <div className={`fixed top-0 left-0 w-full h-1.5 z-50 transition-colors duration-1000 ${
        status === 'IN_PROGRESS' ? 'bg-emerald-500' :
        status === 'COMPLETED' || status === 'AI_REVIEWED' ? 'bg-slate-800' :
        'bg-blue-600'
      }`}></div>

      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40 mb-8 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button onClick={() => navigate('/tutor-dashboard')} className="text-slate-500 hover:text-blue-600 text-sm font-semibold transition-colors flex items-center gap-1 mb-1">
              <span>←</span> Back to Dashboard
            </button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span className="text-blue-600">Live Room:</span> {session.topic}
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-widest uppercase border flex items-center gap-2 shadow-sm ${
              status === 'SCHEDULED' ? 'bg-amber-50 text-amber-600 border-amber-200' :
              status === 'IN_PROGRESS' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
              status === 'AI_REVIEWED' ? 'bg-purple-50 text-purple-600 border-purple-200' :
              'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {status === 'IN_PROGRESS' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
              {status.replace('_', ' ')}
            </div>

            {status === 'IN_PROGRESS' && timeLeft !== null && (
              <div className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-widest border flex items-center gap-2 shadow-sm ${
                timeLeft > 0 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-red-50 text-red-600 border-red-200 animate-pulse'
              }`}>
                <span>⏱️</span>
                {timeLeft > 0 ? formatTimeLeft(timeLeft) : 'TIME IS UP!'}
              </div>
            )}
            
            {status === 'SCHEDULED' && (
              <button onClick={() => advanceState('IN_PROGRESS')} className="btn-primary shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800">
                <span>▶</span> Start Class
              </button>
            )}
            
            {status === 'IN_PROGRESS' && (
              <button onClick={() => advanceState('COMPLETED')} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold py-2 px-5 rounded-xl transition-all flex items-center gap-2 shadow-sm active:scale-95">
                <span>■</span> End Class
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-8 animate-fade-in-up">
        
        {/* Left column: Info & AI Outputs */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          
          {/* Session Details Box */}
          <div className="premium-card p-6 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5">Session Details</h3>
            
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500">Scheduled Time</span>
                <div className="text-right">
                  <div className="text-slate-800 font-bold">{new Date(session.startTime).toLocaleTimeString([], {timeStyle: 'short'})} - {new Date(session.endTime).toLocaleTimeString([], {timeStyle: 'short'})}</div>
                  <div className="text-[11px] text-slate-500 font-medium">{new Date(session.startTime).toLocaleDateString()}</div>
                  <div className="text-[11px] text-blue-600 font-bold mt-0.5">Duration: {getDurationString()}</div>
                </div>
              </div>

              {session.classMode && (
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-500">Class Mode</span>
                  <span className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                    {session.classMode === 'VIDEO_CALL' && '📹 Live Video Call'}
                    {session.classMode === 'RECORDING' && '📼 Recorded Video'}
                    {session.classMode === 'NOTES' && '📄 Notes / Presentation'}
                  </span>
                </div>
              )}
              
              {session.classAssetUrl && (
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-500">Asset/Link</span>
                  <a href={getAssetUrl(session.classAssetUrl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 font-bold bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm hover:shadow active:scale-95">
                    {session.classMode === 'RECORDING' ? 'Open Video' : session.classMode === 'NOTES' ? 'Open PDF' : 'Open Link'} <span className="text-[11px]">↗</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="premium-card p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5">Student Profile</h3>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm">
                <span className="text-lg text-slate-600 font-bold">{session.studentProfile.user.name.charAt(0)}</span>
              </div>
              <div>
                <p className="font-bold text-lg text-slate-800 leading-tight">{session.studentProfile.user.name}</p>
                <p className="text-xs text-slate-500 font-medium">{session.studentProfile.subject} • {session.studentProfile.level}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1.5">Learning Goals</span>
                <p className="text-sm text-slate-700 font-medium">{session.studentProfile.learningGoals}</p>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-1.5">Weak Areas</span>
                <p className="text-sm text-slate-700 font-medium">{session.studentProfile.weakAreas}</p>
              </div>
            </div>
          </div>

          {/* AI Lesson Plan Box */}
          {status === 'SCHEDULED' && !parsedLessonPlan && (
            <div className="premium-card p-8 relative overflow-hidden group border-indigo-100 bg-indigo-50/30">
              <div className="relative flex flex-col items-center text-center">
                <div className="h-12 w-12 bg-white rounded-xl shadow-sm border border-indigo-100 flex items-center justify-center text-2xl mb-4">✨</div>
                <h4 className="font-bold text-slate-800 mb-2">Plan the Session</h4>
                <p className="text-sm text-slate-500 mb-6 font-medium">Generate a personalized lesson plan for today based on past data.</p>
                <button onClick={generateLessonPlan} disabled={isSaving} className="w-full btn-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20">
                  {isSaving ? <span className="animate-pulse">Analyzing Data...</span> : 'Generate AI Lesson Plan'}
                </button>
              </div>
            </div>
          )}

          {parsedLessonPlan && (
            <div className="premium-card p-6 border-indigo-100">
              <h3 className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-5 flex items-center gap-2">
                <span>✨ AI Lesson Plan</span>
                <span className="flex-1 h-px bg-slate-100"></span>
              </h3>
              <div className="text-sm text-slate-700 space-y-5">
                <div>
                  <strong className="block mb-2.5 text-slate-900 font-bold">Objectives:</strong>
                  <ul className="space-y-2.5">
                    {parsedLessonPlan.objectives.map((o: string, i: number) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="text-indigo-500 font-bold mt-0.5">•</span>
                        <span className="font-medium leading-relaxed">{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-5 border-t border-slate-100">
                  <strong className="block mb-2.5 text-slate-900 font-bold">Outline:</strong>
                  <ul className="space-y-2.5">
                    {parsedLessonPlan.outline.map((o: string, i: number) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="text-indigo-500 font-bold mt-0.5">•</span>
                        <span className="font-medium leading-relaxed">{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* AI Session Review Box */}
          {status === 'COMPLETED' && (
             <div className="premium-card p-8 relative overflow-hidden group border-emerald-100 bg-emerald-50/30">
              <div className="relative flex flex-col items-center text-center">
                <div className="h-12 w-12 bg-white rounded-xl shadow-sm border border-emerald-100 flex items-center justify-center text-2xl mb-4">🤖</div>
                <h4 className="font-bold text-slate-800 mb-2">Wrap Up Class</h4>
                <p className="text-sm text-slate-500 mb-6 font-medium">Generate a review and homework for the student based on your notes.</p>
                <button onClick={generateReview} disabled={isSaving} className="w-full btn-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20">
                  {isSaving ? <span className="animate-pulse">Processing...</span> : 'Generate AI Review'}
                </button>
              </div>
            </div>
          )}

          {parsedReview && (
            <div className="premium-card p-6 border-emerald-100">
              <h3 className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-5 flex items-center gap-2">
                <span>✨ AI Session Review</span>
                <span className="flex-1 h-px bg-slate-100"></span>
              </h3>
              <div className="text-sm text-slate-700 space-y-5">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <strong className="block mb-1.5 text-slate-900 font-bold">Summary:</strong> 
                  <p className="font-medium leading-relaxed">{parsedReview.summary}</p>
                </div>
                <div className="px-1">
                  <strong className="block mb-2.5 text-slate-900 font-bold">Homework:</strong>
                  <ul className="space-y-2.5">
                    {parsedReview.homework.map((o: string, i: number) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="text-emerald-500 font-bold mt-0.5">•</span>
                        <span className="font-medium leading-relaxed">{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                  <strong className="block mb-1.5 text-amber-900 font-bold flex items-center gap-2">
                    <span className="text-amber-500">💡</span> Next Class Focus:
                  </strong> 
                  <p className="font-medium leading-relaxed text-amber-800">{parsedReview.suggestionForNextClass}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Notes */}
        <div className="w-full lg:w-2/3 flex flex-col h-[calc(100vh-160px)] lg:h-auto min-h-[600px]">
          <div className="premium-card p-0 flex flex-col h-full overflow-hidden shadow-md">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <span className="text-blue-600">📝</span> Live Notes
              </h3>
              <div className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                {isSaving && <span className="flex w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>}
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isSaving ? 'text-amber-600' : notes !== savedNotes ? 'text-slate-500' : 'text-emerald-600'}`}>
                  {isSaving ? 'Saving...' : notes !== savedNotes ? 'Unsaved' : 'Saved to Cloud'}
                </span>
              </div>
            </div>
            
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={status !== 'IN_PROGRESS'}
              placeholder={
                status === 'SCHEDULED' ? "Start the session to begin typing notes..." :
                isCompleted ? "Session ended. Notes are locked." :
                "Type your session notes here... (Autosaves automatically)"
              }
              className={`flex-1 w-full p-8 bg-white border-none focus:ring-0 focus:outline-none resize-none text-slate-800 placeholder:text-slate-400 font-medium leading-relaxed text-[15px] ${
                status !== 'IN_PROGRESS' ? 'opacity-70 cursor-not-allowed bg-slate-50' : ''
              }`}
            />
            
            {isCompleted && (
              <div className="p-3 m-6 bg-slate-100 rounded-xl border border-slate-200 text-center text-slate-600 text-sm font-semibold flex items-center justify-center gap-2">
                <span>🔒</span> Session is completed. Notes are locked.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SessionLiveRoom;
