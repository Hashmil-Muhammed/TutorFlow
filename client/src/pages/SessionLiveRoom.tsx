import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/axios";
import { useDebounce } from "../hooks/useDebounce";
import { useAuth } from "../context/AuthContext";

const SessionLiveRoom: React.FC = () => {
  const { logout } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<"notes" | "details" | "ai">("notes");
  const debouncedNotes = useDebounce(notes, 1000);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await api.get(`/sessions/${id}`);
        setSession(res.data);
        setNotes(res.data.notes || "");
        setSavedNotes(res.data.notes || "");
        setStatus(res.data.status);
      } catch (error) { console.error("Failed to load session", error); alert("Failed to load session"); }
    };
    fetchSession();
  }, [id]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (debouncedNotes !== savedNotes && status === "IN_PROGRESS") {
      const saveNotes = async () => {
        setIsSaving(true);
        try { await api.put(`/sessions/${id}/notes`, { notes: debouncedNotes }); setSavedNotes(debouncedNotes); }
        catch (error) { console.error("Autosave failed", error); }
        finally { setIsSaving(false); }
      };
      saveNotes();
    }
  }, [debouncedNotes, id, savedNotes, status]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (notes !== savedNotes) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [notes, savedNotes]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === "IN_PROGRESS" && session?.endTime && session?.startTime) {
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
    const isNeg = ms < 0;
    const abs = Math.abs(ms);
    const totalSec = Math.floor(abs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const fmt = `${h > 0 ? h.toString().padStart(2,"0")+":" : ""}${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
    return isNeg ? `-${fmt}` : fmt;
  };

  const advanceState = async (newState: string) => {
    try {
      if (newState === "COMPLETED" && notes !== savedNotes) {
        setIsSaving(true);
        await api.put(`/sessions/${id}/notes`, { notes });
        setSavedNotes(notes); setIsSaving(false);
      }
      const res = await api.put(`/sessions/${id}/state`, { newState });
      setStatus(res.data.status);
    } catch (error: any) { alert(error.response?.data?.error || "Failed to update state"); }
  };

  const generateLessonPlan = async () => {
    setIsSaving(true);
    try { const res = await api.post(`/ai/lesson-plan/${id}`); setSession((prev: any) => ({ ...prev, ...res.data })); setActivePanel("ai"); }
    catch (error) { alert("Failed to generate lesson plan"); }
    finally { setIsSaving(false); }
  };

  const generateReview = async () => {
    setIsSaving(true);
    try {
      const res = await api.post(`/ai/session-review/${id}`);
      setSession((prev: any) => ({ ...prev, ...res.data })); setStatus("AI_REVIEWED"); setActivePanel("ai");
    } catch (error) { alert("Failed to generate review. Ensure you have written notes."); }
    finally { setIsSaving(false); }
  };

  const getAssetUrl = (url: string) => url.startsWith("http") ? url : `http://localhost:5000${url}`;

  const getDurationString = () => {
    if (!session?.startTime || !session?.endTime) return "";
    const mins = Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000);
    const h = Math.floor(mins / 60); const m = mins % 60;
    return `${h > 0 ? `${h} hr ` : ""}${m > 0 ? `${m} min` : ""}`.trim() || "0 min";
  };

  if (!session) return (
    <div className="flex w-full min-h-screen bg-[#151313] items-center justify-center">
      <div className="text-center">
        <div className="text-5xl font-kodchasan font-black mb-4">
          <span className="text-white">T</span><span className="text-[#ff5734]">F</span><span className="text-[#ff5734]">.</span>
        </div>
        <p className="text-slate-400 font-semibold animate-pulse tracking-widest text-xs uppercase">Loading session...</p>
      </div>
    </div>
  );

  const isCompleted = status === "COMPLETED" || status === "AI_REVIEWED";
  const parsedLessonPlan = session.aiLessonPlan ? JSON.parse(session.aiLessonPlan) : null;
  const parsedReview = session.aiReview ? JSON.parse(session.aiReview) : null;

  const statusBadgeCls = status === "SCHEDULED" ? "text-[#d97706]" :
    status === "IN_PROGRESS" ? "text-emerald-600" :
    status === "AI_REVIEWED" ? "text-purple-600" : "text-slate-500 border-slate-200";

  const navBtnCls = (panel: string) => `w-full aspect-square rounded-[1rem] flex items-center justify-center transition-all ${activePanel === panel ? "bg-[#fccc42] text-black shadow-lg scale-110" : "text-slate-400 hover:text-white hover:bg-white/5"}`;
  const saveTagCls = `flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
  isSaving 
    ? "text-amber-600" 
    : notes !== savedNotes 
      ? "text-slate-400" 
      : "text-emerald-500"}`;

  return (
    <div className="flex w-full min-h-screen bg-[#151313]">
      <div className="w-full h-screen bg-[#151313] flex overflow-hidden p-2 md:p-3">

        {/* ── Dark Sidebar ── */}
        <aside className="hidden md:flex flex-col w-12 md:w-16 bg-[#151313] py-6 items-center shrink-0 relative z-10 mr-2 md:mr-3">
          <div className="mb-10 flex items-center justify-center">
            <button onClick={() => navigate("/tutor-dashboard")} className="cursor-pointer hover:opacity-70 transition-opacity" title="Back">
              <span className="font-kodchasan font-black text-3xl tracking-tight leading-none select-none">
                <span className="text-white">T</span><span className="text-[#ff5734]">F</span><span className="text-[#ff5734]">.</span>
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-4 w-full px-3">
            <button onClick={() => navigate("/tutor-dashboard")} className="w-full aspect-square rounded-[1rem] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all" title="Dashboard">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </button>

            <div className="w-6 h-[2px] bg-slate-800 mx-auto rounded-full shrink-0 my-1" />

            <button onClick={() => setActivePanel("notes")} className={navBtnCls("notes")} title="Live Notes">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>

            <button onClick={() => setActivePanel("details")} className={navBtnCls("details")} title="Session & Student">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </button>

            <button onClick={() => setActivePanel("ai")} className={navBtnCls("ai")} title="AI Lesson Plans & Review">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            </button>


          </div>

          <div className="mt-auto px-3 w-full">
            <button onClick={logout} className="w-full aspect-square rounded-[1rem] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all" title="Sign Out">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </aside>

        {/* ── White Main Panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f4f7f6] rounded-[2rem] shadow-inner relative z-0">

          {/* ── HEADER SECTION ── */}
          <div className="relative px-6 py-5 md:px-10 md:py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 bg-white border-b border-slate-200/60 z-40 shrink-0">
             
             {/* Left Side: Back + Title */}
             <div className="flex items-center gap-4 md:gap-5 min-w-0 w-full md:w-auto">
               <button onClick={() => navigate("/tutor-dashboard")} title="Back to Dashboard" className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 rounded-full transition-all shrink-0 shadow-sm group">
                  <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
               </button>
               
               <div className="h-8 w-px bg-slate-200 hidden sm:block shrink-0" />
               
               <div className="min-w-0 flex-1">
                  {/* <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff5734]"></span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Live Room</span>
                  </div> */}
                  <h1 className="font-kodchasan font-bold text-[#151313] text-xl md:text-2xl truncate leading-tight">{session.topic}</h1>
               </div>
             </div>

             {/* Right Side: Status + Actions */}
             <div className="flex items-center gap-3 shrink-0 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                <div className={`text-[11px] font-bold tracking-widest uppercase flex items-center gap-2 ${statusBadgeCls}`}>
                   {status === "IN_PROGRESS" && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                   {status.replace(/_/g, " ")}
                </div>

                {status === "IN_PROGRESS" && timeLeft !== null && (
                  <div className={`text-xs font-bold tracking-wider font-mono flex items-center gap-2 ${timeLeft > 0 ? "text-amber-700" : "text-red-600 animate-pulse"}`}>
                      {timeLeft > 0 ? formatTimeLeft(timeLeft) : "TIME IS UP!"}
                  </div>
                )}

                {status === "SCHEDULED" && (
                   <button onClick={() => advanceState("IN_PROGRESS")} className="flex items-center gap-2 px-5 py-2 bg-[#10b981] hover:bg-[#059669] active:scale-95 text-white font-bold text-sm rounded-xl transition-all shadow-sm whitespace-nowrap ml-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Start Class
                   </button>
                )}

                {status === "IN_PROGRESS" && (
                   <button onClick={() => advanceState("COMPLETED")} className="flex items-center gap-2 px-5 py-2 bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 font-bold text-sm rounded-xl transition-all shadow-sm whitespace-nowrap border border-red-100 ml-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 10h6v4H9z" /></svg>
                      End Class
                   </button>
                )}
             </div>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 pt-8 no-scrollbar bg-[#F7F7F7]">

            {/* ── NOTES PANEL ── */}
            {activePanel === "notes" && (
              <div className="h-full flex flex-col gap-6 max-w-7xl mx-auto w-full">

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* Card 1: Student */}
                  <div className="bg-white border border-slate-200/70 rounded-[1.5rem] p-4 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-0.5">
                    <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#d9cbf8] fill-current transform rotate-12"><path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" /></svg>
                      <span className="relative z-10 text-lg font-black font-kodchasan text-[#151313] drop-shadow-sm">{session.studentProfile?.user?.name?.charAt(0) || 'S'}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-kodchasan font-bold text-[#151313] text-[15px] truncate w-full leading-tight">{session.studentProfile?.user?.name}</h3>
                      <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider truncate mt-0.5">{session.studentProfile?.subject}</p>
                    </div>
                  </div>
                  
                  {/* Card 2: Duration */}
                  <div className="bg-white border border-slate-200/70 rounded-[1.5rem] p-4 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-0.5">
                    <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#faef8f] fill-current transform -rotate-6"><path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" /></svg>
                      <span className="relative z-10 text-xl drop-shadow-sm">⏳</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-kodchasan font-bold text-[#151313] text-[15px] leading-tight truncate">{getDurationString()}</h3>
                      <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Duration</p>
                    </div>
                  </div>

                  {/* Card 3: Start Time */}
                  <div className="bg-white border border-slate-200/70 rounded-[1.5rem] p-4 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-0.5">
                     <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                       <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#bae6fd] fill-current transform rotate-[15deg]"><path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" /></svg>
                       <span className="relative z-10 text-xl drop-shadow-sm">⏰</span>
                     </div>
                     <div className="min-w-0">
                       <h3 className="font-kodchasan font-bold text-[#151313] text-[15px] leading-tight truncate">{new Date(session.startTime).toLocaleTimeString([], { timeStyle: "short" })}</h3>
                       <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Start Time</p>
                     </div>
                  </div>

                  {/* Card 4: Status */}
                  <div className="bg-white border border-slate-200/70 rounded-[1.5rem] p-4 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-0.5">
                     <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                       <svg viewBox="0 0 100 100" className={`absolute inset-0 w-full h-full fill-current transform -rotate-12 ${status === "IN_PROGRESS" ? "text-[#a7f3d0]" : isCompleted ? "text-[#e2e8f0]" : "text-[#fecaca]"}`}><path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" /></svg>
                       <span className="relative z-10 text-xl drop-shadow-sm">{status === "IN_PROGRESS" ? "🔥" : isCompleted ? "✅" : "📅"}</span>
                     </div>
                     <div className="min-w-0">
                       <h3 className="font-kodchasan font-bold text-[#151313] text-[15px] leading-tight truncate">{status.replace(/_/g, " ")}</h3>
                       {status === "IN_PROGRESS" && timeLeft !== null ? (
                          <p className={`text-[9px] font-bold font-mono tracking-wider mt-0.5 ${timeLeft > 0 ? "text-amber-600" : "text-red-500 animate-pulse"}`}>
                             {timeLeft > 0 ? formatTimeLeft(timeLeft) : "OVERTIME!"}
                          </p>
                       ) : (
                          <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Status</p>
                       )}
                     </div>
                  </div>
                </div>

                {/* Notes Textarea Box */}
                <div className="flex-1 bg-white rounded-[1.5rem] shadow-sm flex flex-col overflow-hidden relative min-h-[350px] border border-slate-200/80 transition-all duration-300">
                  <div className="px-6 py-5 flex items-center justify-between z-10">
                    <h2 className="font-kodchasan font-bold text-[#151313] text-lg flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#151313] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Live Notes
                    </h2>
                    <div className={`text-sm font-bold ${saveTagCls}`}>
                      {isSaving ? "SAVING..." : notes !== savedNotes ? "UNSAVED" : "SAVED"}
                    </div>
                  </div>

                  <textarea
                    value={notes} onChange={(e) => setNotes(e.target.value)} disabled={status !== "IN_PROGRESS"}
                    placeholder={status === "SCHEDULED" ? "▶ Start the class to begin typing notes..." : isCompleted ? "🔒 Session ended. Notes are locked." : "Start typing..."}
                    className={`flex-1 w-full px-6 py-2 bg-white border-none focus:ring-0 focus:outline-none resize-none text-[#151313] placeholder:text-slate-200 font-medium leading-relaxed text-[15px] no-scrollbar transition-colors ${status !== "IN_PROGRESS" ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                  
                  <div className="px-6 py-5 flex items-center justify-between z-10">
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{notes.length > 0 ? `${notes.split(/\s+/).filter(Boolean).length} WORDS` : "START TYPING..."}</span>
                    {session.classAssetUrl && (
                      <a href={getAssetUrl(session.classAssetUrl)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[10px] font-bold text-[#ff5734] bg-white hover:bg-[#ff5734]/10 px-4 py-2 rounded-full border border-slate-200 hover:border-[#ff5734]/30 shadow-sm transition-all active:scale-95">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        {session.classMode === "RECORDING" ? "OPEN VIDEO" : session.classMode === "NOTES" ? "OPEN PDF" : "OPEN LINK"}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── DETAILS PANEL ── */}
            {activePanel === "details" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto w-full">

                {/* Session Details */}
                <div className="bg-white border border-slate-200/70 rounded-[1.5rem] p-6 md:p-8 shadow-sm relative overflow-hidden transition-all hover:-translate-y-1">
                  
                  {/* Header */}
                  <h4 className="font-kodchasan text-xl font-bold text-[#151313] mb-6 flex items-center gap-3">
                    <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#d9cbf8] fill-current transform rotate-12">
                        <path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" />
                      </svg>
                      <svg className="relative z-10 w-4 h-4 text-[#151313]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    Session Info
                  </h4>

                  <div className="space-y-3">
                    
                    {/* Topic */}
                    <div className="flex justify-between items-start bg-slate-50/50 p-4 rounded-2xl border border-slate-100 gap-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 shrink-0">Topic</span>
                      <span className="font-bold text-[#151313] text-sm text-right">{session.topic}</span>
                    </div>

                    {/* Schedule & Duration (Arrangement Fixed) */}
                    <div className="flex justify-between items-start bg-slate-50/50 p-4 rounded-2xl border border-slate-100 gap-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 shrink-0">Schedule</span>
                      <div className="text-right flex flex-col items-end">
                        <div className="font-bold text-[#151313] text-sm">
                          {new Date(session.startTime).toLocaleTimeString([], { timeStyle: "short" })} – {new Date(session.endTime).toLocaleTimeString([], { timeStyle: "short" })}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1">
                          {new Date(session.startTime).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-[#ff5734] font-bold mt-1.5  px-2 py-0.5 rounded-md inline-block">
                          Duration: {getDurationString()}
                        </div>
                      </div>
                    </div>

                    {/* Status (Arrangement Fixed) */}
                    <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 gap-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Status</span>
                      <div className={`text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 ${statusBadgeCls}`}>
                        {status === "IN_PROGRESS" && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                        {status.replace(/_/g, " ")}
                      </div>
                    </div>

                    {/* Mode */}
                    {session.classMode && (
                      <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 gap-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Mode</span>
                        <span className="font-bold text-[#151313] text-xs text-right">
                          {session.classMode === "VIDEO_CALL" ? "Live Video Call" : session.classMode === "RECORDING" ? "Recorded Video" : "Notes / Presentation"}
                        </span>
                      </div>
                    )}

                    {/* Asset */}
                    {session.classAssetUrl && (
                      <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 gap-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Asset</span>
                        <a href={getAssetUrl(session.classAssetUrl)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] font-bold text-[#ff5734] bg-white hover:bg-[#ff5734]/10 px-4 py-2 rounded-full border border-slate-200 hover:border-[#ff5734]/30 transition-all active:scale-95 shadow-sm shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open Link
                        </a>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="pt-4 flex gap-4">
                      {status === "SCHEDULED" && (
                        <button onClick={() => advanceState("IN_PROGRESS")} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-emerald-500/30">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Start Class
                        </button>
                      )}
                      {status === "IN_PROGRESS" && (
                        <button onClick={() => advanceState("COMPLETED")} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 active:scale-95 text-red-600 font-bold text-sm rounded-2xl transition-all shadow-sm border border-red-200 hover:border-red-300">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 10h6v4H9z" />
                          </svg>
                          End Class
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {/* Student Profile */}
                <div className="bg-white border border-slate-200/70 rounded-[1.5rem] p-6 md:p-8 shadow-sm relative overflow-hidden transition-all hover:-translate-y-1">
                  <h4 className="font-kodchasan text-xl font-bold text-[#151313] mb-6 flex items-center gap-3">
                    <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                       <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#facb3b] fill-current transform -rotate-6"><path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" /></svg>
                       <svg className="relative z-10 w-4 h-4 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    Student Profile
                  </h4>
                  <div className="flex items-center gap-5 mb-6 p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                    <div className="h-16 w-16 rounded-full bg-[#151313] flex items-center justify-center shadow-md shrink-0">
                      <span className="text-2xl text-white font-bold font-kodchasan">{session.studentProfile?.user?.name?.charAt(0)}</span>
                    </div>
                    <div>
                      <h2 className="font-kodchasan font-bold text-[#151313] text-xl leading-tight">{session.studentProfile?.user?.name}</h2>
                      <div className="flex gap-2 mt-2">
                        <span className="bg-[#facb3b]/20 text-amber-800 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">{session.studentProfile?.subject}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                      <span className="text-[9px] font-bold text-[#ff5734] uppercase tracking-widest block mb-2 flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Learning Goals</span>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">{session.studentProfile?.learningGoals}</p>
                    </div>
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest block mb-2 flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>Weak Areas</span>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">{session.studentProfile?.weakAreas}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── AI PANEL ── */}
            {activePanel === "ai" && (
              <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
                {status === "SCHEDULED" && !parsedLessonPlan && (
<div className="flex flex-col md:flex-row items-center gap-8 py-6">
  
  {/* Icon Section */}
  <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-slate-100 fill-current transform rotate-[15deg]">
      <path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" />
    </svg>
    <svg className="relative z-10 w-8 h-8 text-[#facb3b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  </div>

  {/* Text Section */}
  <div className="flex-1 text-center md:text-left">
    <h4 className="font-kodchasan font-bold text-[#151313] text-3xl mb-3">Plan the Session</h4>
    <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xl">
      Generate a personalized AI lesson plan based on student data and past session notes.
    </p>
  </div>

  {/* Button Section */}
  <button 
    onClick={generateLessonPlan} 
    disabled={isSaving} 
    className="px-8 py-4 bg-gradient-to-r from-[#ff5734] to-[#e04a2a] hover:from-[#e04a2a] hover:to-[#ff5734] active:scale-95 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-[#ff5734]/30 disabled:opacity-50 shrink-0 flex items-center gap-3"
  >
    {isSaving ? (
      <>
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Analyzing Data...
      </>
    ) : (
      "Generate AI Lesson Plan"
    )}
  </button>

</div>
                )}

                {parsedLessonPlan && (
                  <div className="bg-white border border-slate-200/70 rounded-[1.5rem] p-6 md:p-8 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                    <h4 className="font-kodchasan text-xl font-bold text-[#151313] mb-6 flex items-center gap-3">
                      <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                         <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-purple-100 fill-current transform -rotate-12"><path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" /></svg>
                         <svg className="relative z-10 w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                      </div>
                      AI Lesson Plan
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                        <strong className="block mb-5 text-[#ff5734] font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Objectives
                        </strong>
                        <ul className="space-y-4">
                          {parsedLessonPlan.objectives.map((o: string, i: number) => (
                            <li key={i} className="flex gap-3 items-start">
                              <span className="w-6 h-6 rounded-full bg-white border border-[#ff5734]/20 shadow-sm text-[#ff5734] flex items-center justify-center shrink-0 text-[10px] font-black"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></span>
                              <span className="text-sm font-semibold text-slate-700 leading-relaxed pt-0.5">{o}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                        <strong className="block mb-5 text-purple-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                           Outline
                        </strong>
                        <ul className="space-y-4">
                          {parsedLessonPlan.outline.map((o: string, i: number) => (
                            <li key={i} className="flex gap-3 items-start">
                              <span className="w-6 h-6 rounded-full bg-white border border-purple-200 shadow-sm text-purple-600 flex items-center justify-center shrink-0 text-[10px] font-black"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></span>
                              <span className="text-sm font-semibold text-slate-700 leading-relaxed pt-0.5">{o}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {status === "COMPLETED" && (
                  <div className="flex flex-col md:flex-row items-center gap-8 py-6">
                    
                    {/* Icon Section */}
                    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-slate-100 fill-current transform rotate-[15deg]">
                        <path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" />
                      </svg>
                      <svg className="relative z-10 w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>

                    {/* Text Section */}
                    <div className="flex-1 text-center md:text-left">
                      <h4 className="font-kodchasan font-bold text-[#151313] text-3xl mb-3">Wrap Up Class</h4>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xl">
                        Generate a personalized review, homework, and next-class suggestions from your session notes.
                      </p>
                    </div>

                    {/* Button Section */}
                    <button 
                      onClick={generateReview} 
                      disabled={isSaving} 
                      className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 shrink-0 flex items-center gap-3"
                    >
                      {isSaving ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        "Generate AI Review"
                      )}
                    </button>

                  </div>
                )}

                {parsedReview && (
                  <div className="bg-white border border-slate-200/70 rounded-[1.5rem] p-6 md:p-8 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                    <h4 className="font-kodchasan text-xl font-bold text-[#151313] mb-6 flex items-center gap-3">
                      <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                         <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-emerald-100 fill-current transform rotate-12"><path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" /></svg>
                         <svg className="relative z-10 w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      AI Session Review
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
                      <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                        <strong className="mb-5 text-[#ff5734] font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Summary
                        </strong>
                        <p className="text-sm font-medium leading-relaxed text-slate-700">{parsedReview.summary}</p>
                      </div>
                      <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex flex-col">
                        <strong className="mb-5 text-[#151313] font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                          Homework
                        </strong>
                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                          {parsedReview.homework.map((o: string, i: number) => (
                            <div key={i} className="flex gap-3 items-start">
                              <span className="w-6 h-6 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center shrink-0 text-[#151313] font-black text-[10px]">{i + 1}</span>
                              <span className="text-sm font-semibold leading-relaxed text-slate-700 pt-0.5">{o}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100/60">
                        <strong className="mb-5 text-amber-800 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          Next Focus
                        </strong>
                        <p className="text-sm font-medium leading-relaxed text-amber-800">{parsedReview.suggestionForNextClass}</p>
                      </div>
                    </div>
                  </div>
                )}

                {status === "AI_REVIEWED" && parsedReview && (
                  <div className="  p-8 text-center ">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-emerald-500">
                         <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                    </div>
                    <p className="font-kodchasan font-bold text-emerald-800 text-2xl">Session fully reviewed!</p>
                    <p className="text-base text-emerald-600 mt-2 font-medium">All done — notes, review, and homework generated.</p>
                  </div>
                )}

                {status === "IN_PROGRESS" && !parsedLessonPlan && !parsedReview && (
                  <div className="bg-white border border-slate-200/70 rounded-[1.5rem] p-12 text-center shadow-sm">
                    <div className="flex items-center justify-center mb-6">
                      <div className="h-20 w-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-sm">
                        <svg className="w-10 h-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      </div>
                    </div>
                    <h4 className="font-kodchasan font-bold text-[#151313] text-2xl mb-3">Class is Live!</h4>
                    <p className="text-slate-500 text-base font-medium max-w-md mx-auto">Head to the Notes tab to write your session notes. AI Review will be available when you end the class.</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionLiveRoom;