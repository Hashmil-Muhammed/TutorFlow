import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';

interface Student {
  id: string;
  subject: string;
  level: string;
  gender?: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  learningGoals: string;
  weakAreas: string;
}

interface Session {
  id: string;
  startTime: string;
  endTime: string;
  topic: string;
  status: string;
  studentId: string;
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

  const [activeTab, setActiveTab] = useState<'sessions' | 'students'>('sessions');

  // Add Student Form State
  const [newStudent, setNewStudent] = useState({ name: '', email: '', password: '', subject: '', level: '', learningGoals: '', weakAreas: '', gender: '' });
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [showOtherLevel, setShowOtherLevel] = useState(false);
  const [editStudentId, setEditStudentId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
  const [summaryStudentId, setSummaryStudentId] = useState<string | null>(null);
  
  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);

  const formatClass = (level: string) => {
    if (!level) return '';
    if (level === '+1' || level === '+2') return level + ' Std';
    const num = parseInt(level, 10);
    if (!isNaN(num) && num > 0 && num <= 12) {
      if (num === 1) return '1st Std';
      if (num === 2) return '2nd Std';
      if (num === 3) return '3rd Std';
      return num + 'th Std';
    }
    return level;
  };

  const getSubjectIllustration = (subject: string, index: number) => {
    let c = { img: '/illustrations/illustration_design.jpg', tagBg: 'bg-[#FCE166]', tagText: 'text-[#151313]', tagBorder: 'border border-transparent' };

    const normalizedSubject = (subject || '').trim().toLowerCase();

    switch (normalizedSubject) {
      case 'mathematics':
      case 'math':
        c = { img: '/illustrations/subject_math.jpg', tagBg: 'bg-[#d9cbf8]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]/30' };
        break;
      case 'physics':
        c = { img: '/illustrations/illustration_physics.jpg', tagBg: 'bg-[#d9cbf8]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]/30' };
        break;
      case 'chemistry':
        c = { img: '/illustrations/subject_chemistry.jpg', tagBg: 'bg-[#FCE166]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]' };
        break;
      case 'biology':
        c = { img: '/illustrations/subject_biology.jpg', tagBg: 'bg-[#151313]', tagText: 'text-[#FCE166]', tagBorder: 'border border-[#151313]' };
        break;
      case 'computer science':
      case 'cs':
        c = { img: '/illustrations/illustration_tech.jpg', tagBg: 'bg-[#d9cbf8]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]/30' };
        break;
      case 'english':
        c = { img: '/illustrations/illustration_writing.jpg', tagBg: 'bg-[#FCE166]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]' };
        break;
      // case 'malayalam':
      case 'hindi':
        c = { img: '/illustrations/subject_malayalam.jpg', tagBg: 'bg-[#151313]', tagText: 'text-[#FCE166]', tagBorder: 'border border-[#151313]' };
        break;
      case 'history':
        c = { img: '/illustrations/subject_history.jpg', tagBg: 'bg-[#d9cbf8]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]/30' };
        break;
      case 'geography':
        c = { img: '/illustrations/subject_geography.jpg', tagBg: 'bg-[#FCE166]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]' };
        break;
      case 'economics':
        c = { img: '/illustrations/illustration_design.jpg', tagBg: 'bg-[#151313]', tagText: 'text-[#FCE166]', tagBorder: 'border border-[#151313]' };
        break;
      default:
        const cardStyles = [
          { img: '/illustrations/illustration_writing.jpg', tagBg: 'bg-[#FCE166]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]' },
          { img: '/illustrations/illustration_psychology.jpg', tagBg: 'bg-[#151313]', tagText: 'text-[#FCE166]', tagBorder: 'border border-[#151313]' },
          { img: '/illustrations/illustration_tech.jpg', tagBg: 'bg-[#d9cbf8]', tagText: 'text-[#151313]', tagBorder: 'border border-[#151313]/30' },
          { img: '/illustrations/illustration_design.jpg', tagBg: 'bg-[#FCE166]', tagText: 'text-[#151313]', tagBorder: 'border border-transparent' }
        ];
        c = cardStyles[index % cardStyles.length];
    }
    return c;
  };

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Upcoming' | 'Today'>('All');
  const [studentFilter, setStudentFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'Earliest' | 'Latest'>('Latest');
  const [viewMode, setViewMode] = useState<'grid' | 'slider'>('slider');
  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 350;
      sliderRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  // Notification State
  const [notifications, setNotifications] = useState<{ id: string, message: string, time: string, isRead: boolean }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toastNotif, setToastNotif] = useState<string | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Hero parallax mouse effect
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroMouse, setHeroMouse] = useState({ x: 0, y: 0 });
  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;  // -1 to 1
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;  // -1 to 1
    setHeroMouse({ x, y });
  };
  const handleHeroMouseLeave = () => setHeroMouse({ x: 0, y: 0 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // AI Summary State
  const [progressSummaries, setProgressSummaries] = useState<Record<string, string>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({});
  const [errorSummaries, setErrorSummaries] = useState<Record<string, string>>({});

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
    // Poll for fresh session data every 30 seconds so notifications work live
    const pollInterval = setInterval(fetchData, 30000);
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
        const diffMinsStart = diffMsStart / 60000; // can be float

        // 5 min warning — fire when between 4.5 and 5.5 mins remaining
        if (diffMinsStart > 4.5 && diffMinsStart <= 5.5) {
          newNotifs.push({
            id: `start-soon-${session.id}`,
            message: `⏰ Class "${session.topic}" starts in 5 minutes!`,
            time: new Date().toISOString(),
            isRead: false
          });
        }

        // At exact start time — fire within a 1-minute window after start
        if (diffMsStart <= 0 && diffMsStart > -60000) {
          newNotifs.push({
            id: `start-now-${session.id}`,
            message: `🚀 Class "${session.topic}" is starting right now!`,
            time: new Date().toISOString(),
            isRead: false
          });
        }

        // Class ended — fire within 1-minute window after end time
        const diffMsEnd = endTime.getTime() - now.getTime();
        if (diffMsEnd <= 0 && diffMsEnd > -60000) {
          newNotifs.push({
            id: `end-${session.id}`,
            message: `✅ Class "${session.topic}" has ended. Don't forget to review!`,
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
          const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
          return unique;
        });
      }
    };

    if (sessions.length > 0) {
      checkNotifications();
      const interval = setInterval(checkNotifications, 30000); // check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [sessions]);

  const handleAddStudent = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    let studentResponse;

    if (editStudentId) {
      // Existing edit functionality — unchanged
      studentResponse = await api.put(`/students/${editStudentId}`, newStudent);
      setToastNotif("Student updated successfully");
    } else {
      // Create student first
      studentResponse = await api.post('/students', newStudent);

      // Send welcome email after student is successfully created
      try {
        await api.post('/students/send-welcome-email', {
          name: newStudent.name,
          email: newStudent.email,
          password: newStudent.password,
          subject: newStudent.subject,
          level: newStudent.level,
          gender: newStudent.gender,
          learningGoals: newStudent.learningGoals,
          weakAreas: newStudent.weakAreas
        });

        setToastNotif("Student added & email sent successfully");
      } catch (emailError: any) {
        console.error("Student created, but email failed:", emailError);

        setToastNotif(
          "Student added successfully, but email could not be sent"
        );
      }
    }

    setIsAddingStudent(false);
    setEditStudentId(null);

    setNewStudent({
      name: '',
      email: '',
      password: '',
      subject: '',
      level: '',
      learningGoals: '',
      weakAreas: '',
      gender: ''
    });

    setShowOtherLevel(false);
    fetchData();

    setTimeout(() => setToastNotif(null), 3000);

  } catch (error: any) {
    console.error("Error saving student", error);

    setToastNotif(
      error.response?.data?.error || 'Failed to save student'
    );

    setTimeout(() => setToastNotif(null), 3000);
  }
};

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this student? All their sessions will be deleted too.')) return;
    try {
      await api.delete(`/students/${id}`);
      setToastNotif("Student deleted successfully");
      setTimeout(() => setToastNotif(null), 3000);
      fetchData();
    } catch (error: any) {
      console.error("Error deleting student", error);
      setToastNotif(error.response?.data?.error || 'Failed to delete student');
      setTimeout(() => setToastNotif(null), 3000);
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
        setToastNotif("Class session updated successfully");
      } else {
        await api.post('/sessions/schedule', payload, { headers });
        const selectedStudent = students.find(s => s.id === newSession.studentId);
        const studentName = selectedStudent?.user?.name || 'Student';
        const notifMsg = `✅ Scheduled class "${newSession.topic}" sent to ${studentName} via email`;
        setToastNotif(notifMsg);
        setNotifications(prev => [
          { id: `scheduled-${Date.now()}`, message: notifMsg, time: new Date().toISOString(), isRead: false },
          ...prev
        ]);
        playNotificationSound();
      }
      setTimeout(() => setToastNotif(null), 4000);
      setIsScheduling(false);
      setEditSessionId(null);
      setNewSession({ studentId: '', topic: '', startTime: '', endTime: '', classMode: '', classAssetLink: '', classAssetFile: null });
      fetchData();
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
    (editStudentId ? true : newStudent.password.trim() !== '') &&
    newStudent.subject.trim() !== '' &&
    newStudent.level.trim() !== '' &&
    newStudent.learningGoals.trim() !== '' &&
    newStudent.weakAreas.trim() !== '' &&
    newStudent.gender.trim() !== '';

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this scheduled session?")) return;
    try {
      await api.delete(`/sessions/${id}`);
      fetchData();
    } catch (error) {
      console.error("Error deleting session", error);
      alert("Failed to delete session");
    }
  };

  const handleGenerateSummary = async (studentId: string) => {
    setSummaryStudentId(studentId);
    setLoadingSummaries(prev => ({ ...prev, [studentId]: true }));
    setErrorSummaries(prev => { const next = { ...prev }; delete next[studentId]; return next; });
    try {
      const res = await api.get(`/ai/progress-summary/${studentId}`);
      setProgressSummaries(prev => ({ ...prev, [studentId]: res.data.progressSummary }));
    } catch (error: any) {
      console.error("Error generating progress summary", error);
      const errorMsg = error.response?.data?.error || 'Failed to generate summary';
      setErrorSummaries(prev => ({ ...prev, [studentId]: errorMsg }));
      setToastNotif(errorMsg);
      setTimeout(() => setToastNotif(null), 3000);
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const completedSessionsCount = sessions.filter(s => s.status === 'COMPLETED' || s.status === 'AI_REVIEWED').length;
  const upcomingSessionsCount = sessions.filter(s => s.status === 'SCHEDULED' && new Date(s.endTime) > new Date()).length;

  // Calculate total hours
  const totalMs = sessions.filter(s => s.status === 'COMPLETED' || s.status === 'AI_REVIEWED').reduce((acc, curr) => {
    return acc + (new Date(curr.endTime).getTime() - new Date(curr.startTime).getTime());
  }, 0);
  const totalHours = Math.round(totalMs / (1000 * 60 * 60));

  // Profile Modal Data Formatting
  const uniqueSubjects = Array.from(new Set(students.map(s => s.subject)));
  const totalStudents = students.length;
  const missedCountOverall = sessions.filter(s => s.status === 'MISSED' || (s.status === 'SCHEDULED' && new Date(s.endTime).getTime() <= new Date().getTime())).length;
  const attendanceRate = completedSessionsCount + missedCountOverall > 0 
    ? Math.round((completedSessionsCount / (completedSessionsCount + missedCountOverall)) * 100) 
    : 100;

  return (
    <div className="w-full bg-[#F7F7F7]">

      {/* Modals for Forms */}
      {isScheduling && (
        <div className="fixed inset-0 bg-[#151313]/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-up">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-2xl shadow-2xl relative border-4 border-white/20">
            <button onClick={() => setIsScheduling(false)} className="absolute top-8 right-8 text-slate-400 hover:text-[#ff5734] transition-colors bg-slate-50 hover:bg-red-50 p-2 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 className="font-kodchasan text-4xl font-bold text-[#151313] mb-8 tracking-tight">{editSessionId ? 'Edit Lesson' : 'Plan Lesson'}</h3>
            {scheduleError && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold">{scheduleError}</div>}

            <form onSubmit={handleScheduleSession} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Form Fields using .taitor-input */}
              <div className="md:col-span-2">
                <select required className="taitor-input" value={newSession.studentId} onChange={e => setNewSession({ ...newSession, studentId: e.target.value })}>
                  <option value="" disabled>Choose a student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.user.name} ({s.subject})</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <input type="text" required className="taitor-input" placeholder="Lesson Topic (e.g. Index Laws)" value={newSession.topic} onChange={e => setNewSession({ ...newSession, topic: e.target.value })} />
              </div>
              <div>
                <input type="datetime-local" required className="taitor-input" value={newSession.startTime} onChange={e => setNewSession({ ...newSession, startTime: e.target.value })} />
              </div>
              <div>
                <input type="datetime-local" required className="taitor-input" value={newSession.endTime} onChange={e => setNewSession({ ...newSession, endTime: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <select className="taitor-input" value={newSession.classMode} onChange={e => setNewSession({ ...newSession, classMode: e.target.value })}>
                  <option value="" disabled>Select Format (Optional)</option>
                  <option value="VIDEO_CALL">Live Video Call</option>
                  <option value="RECORDING">Recorded Video</option>
                  <option value="NOTES">Static Notes</option>
                </select>
              </div>
              {newSession.classMode === 'VIDEO_CALL' && (
                <div className="md:col-span-2">
                  <input type="url" required className="taitor-input" placeholder="Meeting Link" value={newSession.classAssetLink} onChange={e => setNewSession({ ...newSession, classAssetLink: e.target.value })} />
                </div>
              )}
              {(newSession.classMode === 'RECORDING' || newSession.classMode === 'NOTES') && (
                <div className="md:col-span-2">
                  <input type="file" required className="taitor-input" accept={newSession.classMode === 'RECORDING' ? 'video/mp4' : 'application/pdf'} onChange={e => { if (e.target.files) setNewSession({ ...newSession, classAssetFile: e.target.files[0] }); }} />
                </div>
              )}
              <div className="md:col-span-2 mt-4 flex justify-end gap-3">
                <button type="submit" disabled={isSubmitting || !isScheduleFormValid} className="btn-taitor-primary px-12">
                  {isSubmitting ? 'Saving...' : 'Save Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddingStudent && (
        <div className="fixed inset-0 bg-[#151313]/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-up">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-2xl shadow-2xl relative border-4 border-white/20">
            <button onClick={() => setIsAddingStudent(false)} className="absolute top-8 right-8 text-slate-400 hover:text-[#ff5734] transition-colors bg-slate-50 hover:bg-red-50 p-2 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 className="font-kodchasan text-4xl font-bold text-[#151313] mb-8 tracking-tight">{editStudentId ? 'Edit Student' : 'Onboard Student'}</h3>
            <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" required placeholder="Full Name" className="taitor-input" value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} />
              <input type="email" required placeholder="Email Address" className="taitor-input" value={newStudent.email} onChange={e => setNewStudent({ ...newStudent, email: e.target.value })} />
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required={!editStudentId} minLength={6} placeholder={editStudentId ? "New Password (optional, min 6 chars)" : "Temporary Password (min 6 chars)"} className="taitor-input w-full pr-14" value={newStudent.password} onChange={e => setNewStudent({ ...newStudent, password: e.target.value })} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-white px-2 py-1 rounded">
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
              <select required className="taitor-input bg-white" value={newStudent.gender} onChange={e => setNewStudent({ ...newStudent, gender: e.target.value })}>
                <option value="" disabled>Select Gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
              <div>
                <select required className="taitor-input bg-white w-full" value={newStudent.subject} onChange={e => setNewStudent({ ...newStudent, subject: e.target.value })}>
                  <option value="" disabled>Select Subject</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="History">History</option>
                  <option value="Geography">Geography</option>
                  <option value="Economics">Economics</option>
                </select>
              </div>
              <div>
                <select required className="taitor-input bg-white w-full" value={showOtherLevel ? 'Other' : (newStudent.level && !['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].includes(newStudent.level) ? 'Other' : newStudent.level)} onChange={e => {
                  if (e.target.value === 'Other') {
                    setShowOtherLevel(true);
                    setNewStudent({ ...newStudent, level: '' });
                  } else {
                    setShowOtherLevel(false);
                    setNewStudent({ ...newStudent, level: e.target.value });
                  }
                }}>
                  <option value="" disabled>Select Class</option>
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
              {showOtherLevel && (
                <div className="md:col-span-2">
                  <input type="text" required placeholder="Type Class" className="taitor-input w-full" value={newStudent.level} onChange={e => setNewStudent({ ...newStudent, level: e.target.value })} />
                </div>
              )}
              <input type="text" required placeholder="Learning Goals" className="taitor-input" value={newStudent.learningGoals} onChange={e => setNewStudent({ ...newStudent, learningGoals: e.target.value })} />
              <input type="text" required placeholder="Weak Areas" className="taitor-input" value={newStudent.weakAreas} onChange={e => setNewStudent({ ...newStudent, weakAreas: e.target.value })} />
              <div className="md:col-span-2 mt-4 flex justify-end">
                <button type="submit" disabled={!isStudentFormValid} className="btn-taitor-primary px-12">{editStudentId ? 'Save Changes' : 'Add Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PROFILE & PERFORMANCE MODAL ── */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151313]/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh] p-8 animate-in fade-in zoom-in duration-300 border-4 border-white/20">
            
            {/* Close Button */}
            <button 
              onClick={() => setShowProfileModal(false)} 
              className="absolute top-6 right-6 w-10 h-10 bg-white border border-slate-200 hover:border-black rounded-full flex items-center justify-center text-slate-500 hover:text-black transition-colors shadow-sm hover:shadow-md z-10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Modal Header Profile Info */}
            <div className="flex items-center gap-5 mb-8">
              <div className="w-20 h-20 bg-[#151313] rounded-full text-white flex items-center justify-center font-bold text-4xl shadow-md overflow-hidden relative">
                <span className="absolute">{user?.name?.charAt(0) || 'T'}</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-[#151313] tracking-tight">{user?.name || 'Tutor'}</h2>
                <p className="text-slate-500 font-medium text-sm">{user?.email || 'tutor@tutorflow.com'}</p>
                <span className="inline-block mt-2 bg-[#ff5734]/10 text-[#ff5734] px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-[#ff5734]/20">Tutor Profile</span>
              </div>
            </div>

            {/* Modal Body / DB Summary */}
            <div className="overflow-y-auto no-scrollbar pb-4 flex-1">
              <h3 className="text-lg font-bold mb-4 text-[#151313]">Teaching Overview</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-amber-50/70 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                  <p className="text-3xl font-black text-[#151313] mb-1">{totalHours}</p>
                  <p className="text-[9px] uppercase font-bold text-amber-600 tracking-wider">Hours Taught</p>
                </div>
                <div className="bg-green-50/70 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                  <p className="text-3xl font-black text-[#151313] mb-1">{completedSessionsCount}</p>
                  <p className="text-[9px] uppercase font-bold text-green-600 tracking-wider">Classes Done</p>
                </div>
                <div className="bg-blue-50/70 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                  <p className="text-3xl font-black text-[#151313] mb-1">{totalStudents}</p>
                  <p className="text-[9px] uppercase font-bold text-blue-600 tracking-wider">Active Students</p>
                </div>
                <div className="bg-purple-50/70 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                  <p className="text-3xl font-black text-[#151313] mb-1">{attendanceRate}%</p>
                  <p className="text-[9px] uppercase font-bold text-purple-600 tracking-wider">Class Completion</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-8">
                <div className="border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span>📚</span> Subjects Taught
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
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 mt-auto"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout from TutorFlow
              </button>
              
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex w-full min-h-screen bg-[#151313]">

        {/* Dashboard Frame */}
        <div className="w-full h-screen bg-[#151313] flex overflow-hidden p-2 md:p-4">

          {/* Learnify Dark Left Sidebar */}
          <aside className="hidden md:flex flex-col w-12 md:w-16 bg-[#151313] py-6 items-center shrink-0 relative z-10 mr-2 md:mr-4">

            {/* Logo icon */}
            <div className="mb-10 flex items-center justify-center">
              <button onClick={() => window.location.reload()} className="cursor-pointer hover:opacity-70 transition-opacity" title="Refresh">
                <span className="font-kodchasan font-black text-3xl tracking-tight leading-none select-none">
                  <span className="text-white">T</span><span className="text-[#ff5734]">F</span><span className="text-[#ff5734]">.</span>
                </span>
              </button>
            </div>

            {/* Nav Icons */}
            <div className="flex flex-col gap-4 w-full px-3">
              <button
                onClick={() => setActiveTab('sessions')}
                className={`w-full aspect-square rounded-[1rem] flex items-center justify-center transition-all ${activeTab === 'sessions' ? 'bg-[#fccc42] text-black shadow-lg scale-110' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                title="My Lessons"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </button>

              <button
                onClick={() => setActiveTab('students')}
                className={`w-full aspect-square rounded-[1rem] flex items-center justify-center transition-all ${activeTab === 'students' ? 'bg-[#fccc42] text-black shadow-lg scale-110' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                title="Students"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </button>
            </div>

            <div className="mt-auto px-3 w-full">
              <button onClick={logout} className="w-full aspect-square rounded-[1rem] flex items-center justify-center text-slate-400 hover:text-[#ff5734] hover:bg-white/5 transition-all" title="Sign Out">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </aside>

          {/* Main Content Wrapper */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-white rounded-[2rem] shadow-inner relative z-0 no-scrollbar">

            {/* Top Header Area (Clean, no nav) */}
            <div className="relative z-40">
              {/* Seamless Fading Background */}
              <div
                className="absolute inset-0 bg-white/50 -bottom-8"
                style={{
                  maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
                }}
              ></div>

              <div className="relative px-6 pt-4 pb-2 md:px-12 md:pt-6 md:pb-4 flex items-center justify-between">

                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-500">Welcome to</span>
                  <h1 className="text-3xl font-bold text-[#ff5734] font-kodchasan tracking-tight">TutorFlow</h1>
                </div>

                <div className="flex items-center gap-4 md:gap-6">


                  {/* Notification Bell */}
                  <div className="relative" ref={notificationRef}>
                    <button onClick={() => setShowNotifications(!showNotifications)} className="relative w-10 h-10 flex items-center justify-center text-black hover:bg-slate-100 rounded-full border-2 border-slate-100 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                      {notifications.filter(n => !n.isRead).length > 0 && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-[#ff5734] rounded-full border-2 border-white"></span>
                      )}
                    </button>

                    {showNotifications && (
                      <div className="absolute right-0 mt-3 w-80 bg-white rounded-[2rem] shadow-2xl border border-slate-100 z-50 overflow-hidden text-left transform origin-top-right transition-all">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                          <h3 className="taitor-heading text-lg">NOTIFICATIONS</h3>
                          {notifications.filter(n => !n.isRead).length > 0 && (
                            <button onClick={() => setNotifications(notifications.map(n => ({ ...n, isRead: true })))} className="text-xs text-[#ff5734] font-bold hover:underline bg-red-50 px-2 py-1 rounded-full">Mark all read</button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto bg-slate-50 p-2 space-y-2">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-sm font-bold">ALL CAUGHT UP!</div>
                          ) : (
                            <>
                              {notifications.filter(n => !n.isRead).length > 0 && (
                                <div className="mb-2">
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 mb-1">New</h4>
                                  {notifications.filter(n => !n.isRead).map(n => (
                                    <div key={n.id} className="bg-white rounded-2xl p-4 mb-2 shadow-sm border border-slate-100 flex gap-3 items-start">
                                      <div className="w-2 h-2 bg-[#ff5734] rounded-full mt-1.5 flex-shrink-0"></div>
                                      <div>
                                        <p className="text-black font-semibold text-sm leading-tight">{n.message}</p>
                                        <p className="text-[10px] text-slate-400 mt-1.5 font-bold uppercase">{new Date(n.time).toLocaleTimeString([], { timeStyle: 'short' })}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {notifications.filter(n => n.isRead).length > 0 && (
                                <div>
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 mb-1 mt-3">Earlier</h4>
                                  {notifications.filter(n => n.isRead).map(n => (
                                    <div key={n.id} className="bg-white rounded-2xl p-4 mb-2 border border-slate-100 flex gap-3 items-start opacity-60">
                                      <div className="w-2 h-2 bg-slate-300 rounded-full mt-1.5 flex-shrink-0"></div>
                                      <div>
                                        <p className="text-slate-600 font-semibold text-sm leading-tight">{n.message}</p>
                                        <p className="text-[10px] text-slate-400 mt-1.5 font-bold uppercase">{new Date(n.time).toLocaleTimeString([], { timeStyle: 'short' })}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profile Pill - NOW CLICKABLE */}
                  <div 
                    onClick={() => setShowProfileModal(true)}
                    className="hidden sm:flex items-center gap-3 border-2 border-slate-100 pr-4 rounded-full pl-1 py-1 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-black rounded-full text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden relative">
                      <span className="absolute">{user?.name?.charAt(0)}</span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="font-bold text-xs leading-tight whitespace-nowrap max-w-[100px] truncate">{user?.name}</span>
                      <span className="text-[9px] text-[#ff5734] font-bold leading-tight uppercase tracking-wider">Tutor Profile</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <br />
            <br />
            {/* Content Area */}
            <div className="px-6 md:px-12 py-10">

              {/* Hero Title Section */}
              <div
                ref={heroRef}
                className="mb-12 lg:mb-16 relative flex items-center justify-between min-h-[200px]"
                onMouseMove={handleHeroMouseMove}
                onMouseLeave={handleHeroMouseLeave}
              >
                <h1
                  className="text-6xl md:text-7xl lg:text-[6rem] font-kodchasan font-bold text-[#151313] leading-[1.1] tracking-tight max-w-4xl z-10 transition-transform duration-200 ease-out"
                  style={{
                    transform: `translate(${heroMouse.x * -6}px, ${heroMouse.y * -4}px)`,
                    textShadow: heroMouse.x !== 0 ? `${heroMouse.x * 4}px ${heroMouse.y * 4}px 20px rgba(255,87,52,0.15)` : 'none'
                  }}
                >
                  Take your <span className="text-[#ff5734]">teaching</span><br />
                  to the next level
                </h1>

                {/* Hero Illustration */}
                <div
                  className="hidden md:block absolute right-8 lg:right-54 -top-16 w-[350px] lg:w-[450px] h-[350px] lg:h-[450px] select-none z-0 transition-transform duration-200 ease-out"
                  style={{
                    transform: `translate(${heroMouse.x * 18}px, ${heroMouse.y * 14}px) rotate(${heroMouse.x * 3}deg)`,
                  }}
                >

                  {/* Decorative faint background swirl */}
                  <svg className="absolute inset-0 w-full h-full text-[#f4f3f0] -z-10 transform scale-125" viewBox="0 0 200 200" fill="none">
                    <path d="M -20,100 C 50,20 150,180 220,100" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>

                  {/* Cloud SVG on the right - deeper parallax layer */}
                  <svg
                    className="absolute top-[45%] right-[-5%] w-28 h-28 text-black -z-10"
                    style={{ animation: 'float-reverse 5s ease-in-out infinite', transform: `translate(${heroMouse.x * 8}px, ${heroMouse.y * 6}px)` }}
                    viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="1"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 15.5c1.38 0 2.5-1.12 2.5-2.5 0-1.15-.78-2.14-1.85-2.42.18-1.55-.95-2.95-2.5-3.08-1.12-.1-2.17.5-2.65 1.5-1.05-1.02-2.75-1.02-3.8 0-.48-1-1.53-1.6-2.65-1.5-1.55.13-2.68 1.53-2.5 3.08-1.07.28-1.85 1.27-1.85 2.42 0 1.38 1.12 2.5 2.5 2.5h12.8z" />
                  </svg>

                  {/* Top Left Star */}
                  <svg
                    className="absolute top-[10%] left-[10%] w-12 h-12 text-[#facb3b] fill-current"
                    style={{ animation: 'float 4s ease-in-out infinite', transform: `translate(${heroMouse.x * -10}px, ${heroMouse.y * -8}px)` }}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>

                  {/* Top Right Star */}
                  <svg
                    className="absolute top-[15%] right-[10%] w-7 h-7 text-[#facb3b] fill-current"
                    style={{ animation: 'pulse-slow 3s ease-in-out infinite', transform: `translate(${heroMouse.x * 12}px, ${heroMouse.y * -10}px)` }}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>

                  {/* Bottom Left Sparkle/Diamond */}
                  <svg
                    className="absolute bottom-[20%] left-[25%] w-6 h-6 text-[#facb3b] fill-current"
                    style={{ animation: 'pulse-slow 4s ease-in-out infinite reverse', transform: `translate(${heroMouse.x * -6}px, ${heroMouse.y * 6}px)` }}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                  </svg>

                  {/* Main Character Image */}
                  <img
                    src="/illustrations/hero-pencil-nobg4.png"
                    alt="Tutor flying on pencil"
                    className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
                    style={{ animation: 'float 6s ease-in-out infinite' }}
                  />
                </div>
              </div>
              <br />
              <br />
              <br />
              <br />


              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <h2 className="taitor-heading text-5xl">{activeTab === 'sessions' ? 'MY LESSONS' : 'MY STUDENTS'}</h2>
                <button
                  onClick={() => {
                    if (activeTab === 'sessions') {
                      setIsScheduling(true);
                    } else {
                      setEditStudentId(null);
                      setNewStudent({ name: '', email: '', password: '', subject: '', level: '', learningGoals: '', weakAreas: '', gender: '' });
                      setShowOtherLevel(false);
                      setIsAddingStudent(true);
                    }
                  }}
                  className="btn-taitor-primary text-lg px-8"
                >
                  + New {activeTab === 'sessions' ? 'Lesson' : 'Student'}
                </button>
              </div>

              {/* Stats Row */}
              {activeTab === 'sessions' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <div className="taitor-stat-card">
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#d9cbf8] fill-current transform rotate-12">
                        <path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" />
                      </svg>
                      <span className="relative z-10 text-3xl transform -rotate-12 filter drop-shadow-sm">📖</span>
                    </div>
                    <div>
                      <h3 className="taitor-heading text-3xl">{completedSessionsCount} LESSONS</h3>
                      <p className="text-sm font-semibold text-slate-500">Completed</p>
                    </div>
                  </div>

                  <div className="taitor-stat-card">
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#faef8f] fill-current transform -rotate-6">
                        <path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" />
                      </svg>
                      <span className="relative z-10 text-3xl transform rotate-6 filter drop-shadow-sm">⏳</span>
                    </div>
                    <div>
                      <h3 className="taitor-heading text-3xl">{totalHours} HOURS</h3>
                      <p className="text-sm font-semibold text-slate-500">Total time spent</p>
                    </div>
                  </div>

                  <div className="taitor-stat-card">
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#f6baba] fill-current transform rotate-[15deg]">
                        <path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" />
                      </svg>
                      <span className="relative z-10 text-3xl transform -rotate-6 filter drop-shadow-sm">🧮</span>
                    </div>
                    <div>
                      <h3 className="taitor-heading text-3xl">{upcomingSessionsCount} LESSONS</h3>
                      <p className="text-sm font-semibold text-slate-500">Upcoming</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <div className="taitor-stat-card">
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#cbf8d9] fill-current transform rotate-12">
                        <path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" />
                      </svg>
                      <span className="relative z-10 text-3xl transform -rotate-12 filter drop-shadow-sm">👨‍🎓</span>
                    </div>
                    <div>
                      <h3 className="taitor-heading text-3xl">{students.length} STUDENTS</h3>
                      <p className="text-sm font-semibold text-slate-500">Active Students</p>
                    </div>
                  </div>

                  <div className="taitor-stat-card">
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#cbe9f8] fill-current transform -rotate-6">
                        <path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" />
                      </svg>
                      <span className="relative z-10 text-3xl transform rotate-6 filter drop-shadow-sm">📚</span>
                    </div>
                    <div>
                      <h3 className="taitor-heading text-3xl">{new Set(students.map(s => s.subject)).size} SUBJECTS</h3>
                      <p className="text-sm font-semibold text-slate-500">Currently Taught</p>
                    </div>
                  </div>

                  <div className="taitor-stat-card">
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#f8cbdb] fill-current transform rotate-[15deg]">
                        <path d="M50 2.5l11.1 11.1 15.7-1.5 6.5 14.4 13.9 7.4-4.8 15 4.8 15-13.9 7.4-6.5 14.4-15.7-1.5L50 97.5l-11.1-11.1-15.7 1.5-6.5-14.4-13.9-7.4 4.8-15-4.8-15 13.9-7.4 6.5-14.4 15.7 1.5z" />
                      </svg>
                      <span className="relative z-10 text-3xl transform -rotate-6 filter drop-shadow-sm">🗓️</span>
                    </div>
                    <div>
                      <h3 className="taitor-heading text-3xl">{sessions.length} CLASSES</h3>
                      <p className="text-sm font-semibold text-slate-500">Total sessions logged</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Controls (Styled like the New Courses tabs) */}
              <div className="flex flex-col sm:flex-row items-center justify-between mb-8">
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-2 border-slate-200 rounded-full pl-6 pr-12 py-2 text-sm font-semibold focus:outline-none focus:border-[#ff5734] transition-colors w-48 sm:w-64 bg-slate-50"
                    />
                    <button className="absolute right-1.5 w-8 h-8 bg-[#ff5734] rounded-full flex items-center justify-center text-white shadow-md hover:bg-[#e04523] transition-colors pointer-events-none">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                  </div>

                  {activeTab === 'sessions' ? (
                    <button
                      onClick={() => setFilterType(prev => prev === 'All' ? 'Upcoming' : prev === 'Upcoming' ? 'Today' : 'All')}
                      className="bg-white text-[#151313] border-2 border-slate-200 rounded-xl px-5 py-2 font-semibold text-sm hover:border-[#151313] transition-colors flex items-center gap-2">
                      Filter: {filterType}
                    </button>
                  ) : (
                    <div className="relative">
                      <select
                        value={studentFilter}
                        onChange={(e) => setStudentFilter(e.target.value)}
                        className="appearance-none bg-white text-[#151313] border-2 border-slate-200 rounded-xl pl-5 pr-10 py-2 font-semibold text-sm hover:border-[#151313] transition-colors focus:outline-none focus:border-[#ff5734] cursor-pointer"
                      >
                        <option value="All">Subject: All</option>
                        {Array.from(new Set(students.map(s => s.subject))).map(subj => (
                          <option key={subj} value={subj}>{subj}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#151313]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setSortBy(prev => prev === 'Earliest' ? 'Latest' : 'Earliest')}
                    className="bg-white text-[#151313] border-2 border-slate-200 rounded-xl px-5 py-2 font-semibold text-sm hover:border-[#151313] transition-colors flex items-center gap-2">
                    Sort: {sortBy}
                  </button>
                </div>

                <div className="flex items-center gap-3 mt-4 sm:mt-0">
                  <div className="flex bg-slate-100 rounded-xl p-1 mr-2">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-black' : 'text-slate-500 hover:text-black'}`}
                      title="Grid View">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    </button>
                    <button
                      onClick={() => setViewMode('slider')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'slider' ? 'bg-white shadow-sm text-black' : 'text-slate-500 hover:text-black'}`}
                      title="Slider View">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17l-5-5 5-5m6 10l5-5-5-5" /></svg>
                    </button>
                  </div>
                  <button onClick={() => scrollSlider('left')} className={`w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-black hover:border-black transition-colors ${viewMode === 'grid' ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={viewMode === 'grid'}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button onClick={() => scrollSlider('right')} className={`w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-black hover:border-black transition-colors ${viewMode === 'grid' ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={viewMode === 'grid'}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>

              {/* Dynamic Cards View */}
              <div ref={sliderRef} className={viewMode === 'slider' ? "flex gap-6 overflow-x-auto pb-4 pt-2 scroll-smooth snap-x snap-mandatory no-scrollbar items-stretch" : "flex flex-wrap gap-4 md:gap-6 items-stretch pt-2"}>
                {activeTab === 'sessions' && sessions
                  .filter(s => (s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS' || s.status === 'COMPLETED' || s.status === 'AI_REVIEWED'))
                  .filter(s => s.topic.toLowerCase().includes(searchTerm.toLowerCase()) || s.studentProfile.user.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .filter(s => {
                    if (filterType === 'All') return true;
                    const date = new Date(s.startTime);
                    const today = new Date();
                    if (filterType === 'Today') return date.toDateString() === today.toDateString();
                    if (filterType === 'Upcoming') return date.getTime() > today.getTime();
                    return true;
                  })
                  .sort((a, b) => {
                    const timeA = new Date(a.startTime).getTime();
                    const timeB = new Date(b.startTime).getTime();
                    return sortBy === 'Earliest' ? timeA - timeB : timeB - timeA;
                  })
                  .map((session, index) => {
                    const relatedStudent = students.find(st => st.id === session.studentId);
                    const subject = relatedStudent ? relatedStudent.subject : '';

                    const c = getSubjectIllustration(subject, index);

                    // Detect session state
                    const isCompleted = session.status === 'COMPLETED' || session.status === 'AI_REVIEWED';
                    const now = new Date().getTime();
                    const isOngoing = !isCompleted && new Date(session.startTime).getTime() <= now && new Date(session.endTime).getTime() > now;
                    const isExpired = !isCompleted && new Date(session.endTime).getTime() <= now;
                    const progressPercentage = isCompleted ? 100 : isExpired ? 100 : isOngoing ? 50 : 0;

                    // Formatting dates and duration
                    const startDate = new Date(session.startTime);
                    const endDate = new Date(session.endTime);
                    const durationMins = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

                    return (
                      <div key={session.id} className={`bg-cover bg-center rounded-[1.75rem] p-2 border flex flex-col relative h-[440px] hover:shadow-md hover:-translate-y-1 transition-all duration-300 shrink-0 snap-start w-[320px] md:w-[360px] ${isCompleted ? 'border-green-300 shadow-green-100 shadow-lg'
                        : isOngoing ? 'border-[#ff5734] shadow-orange-100 shadow-lg'
                          : isExpired ? 'border-slate-300'
                            : 'border-slate-200'
                        }`} style={{ backgroundImage: 'url(/illustrations/samedha.jpg)' }}>
                        {/* Completed / Expired / Ongoing Overlay Badge */}
                        {(isCompleted || isExpired || isOngoing) && (
                          <div className={`absolute inset-0 rounded-[1.75rem] z-20 flex items-center justify-center pointer-events-none ${isCompleted ? 'bg-green-900/20' : isOngoing ? 'bg-orange-500/10' : 'bg-black/20'
                            }`}>
                            <div className={`px-5 py-2 rounded-full text-sm font-black uppercase tracking-widest shadow-lg ${isCompleted ? 'bg-green-500 text-white' : isOngoing ? 'bg-[#ff5734] text-white animate-pulse' : 'bg-slate-700 text-white'
                              }`}>
                              {isCompleted ? '✓ Completed' : isOngoing ? '● Live Now' : 'Expired'}
                            </div>
                          </div>
                        )}
                        {/* Top Image Area */}
                        <div className="rounded-[1.25rem] h-[220px] relative overflow-hidden mb-5 border border-slate-100">
                          <img src={c.img} alt="Illustration" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="flex justify-between items-start p-3 z-10 relative">
                            <span className={`${c.tagBg} ${c.tagText} ${c.tagBorder} px-3 py-1 rounded-xl text-[11px] font-bold tracking-wide`}>
                              {session.studentProfile.user.name}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
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
                                }}
                                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/50 hover:bg-white/90 backdrop-blur-md transition-colors text-black border border-white/40 shadow-sm" title="Edit Session">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button onClick={() => handleDeleteSession(session.id)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/50 hover:bg-red-500 hover:text-white backdrop-blur-md transition-colors text-black border border-white/40 shadow-sm" title="Delete Session">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="px-2 flex-1 flex flex-col">
                          {/* Title */}
                          <h3 className="text-xl font-bold text-[#151313] font-kodchasan tracking-tight mb-4 leading-snug line-clamp-2">
                            {session.topic}
                          </h3>

                          {/* Schedule Details (Premium Dot Layout) */}
                          <div className="grid grid-cols-2 gap-y-3 gap-x-2 mb-5 text-[13px]">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                              <span className="text-slate-600 font-medium truncate">{startDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                              <span className="text-slate-600 font-medium truncate">{startDate.toLocaleTimeString([], { timeStyle: 'short' })} – {endDate.toLocaleTimeString([], { timeStyle: 'short' })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                              <span className="text-slate-600 font-medium truncate">{durationMins} mins</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></span>
                              <span className="text-slate-600 font-medium truncate">{session.studentProfile.user.name}</span>
                            </div>
                          </div>

                          {/* Progress/Time Area */}
                          <div className="mt-auto mb-6">
                            <div className="flex justify-between items-end mb-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${isCompleted ? 'text-green-500' : isOngoing ? 'text-[#ff5734]' : isExpired ? 'text-red-500' : 'text-slate-400'
                                }`}>{isCompleted ? 'Completed' : isOngoing ? 'Live Now' : isExpired ? 'Expired' : 'Upcoming'}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : isOngoing ? 'bg-[#ff5734]' : isExpired ? 'bg-red-500' : 'bg-[#ff5734]'
                                }`} style={{ width: `${progressPercentage}%` }}></div>
                            </div>
                          </div>

                          {/* Bottom Row: Continue */}
                          <div className="mt-auto pb-1">
                            <button
                              disabled={isExpired && !isCompleted}
                              onClick={() => { window.location.href = `/session/${session.id}`; }}
                              className={`w-[95%] block mx-auto font-bold py-3.5 px-6 rounded-[1.25rem] transition-all ${isCompleted
                                ? 'bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                                : isOngoing
                                  ? 'bg-[#ff5734] text-white hover:bg-[#e04523] shadow-md hover:shadow-lg hover:-translate-y-0.5 animate-pulse'
                                  : isExpired
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-[#151313] text-white hover:bg-[#ff5734] shadow-md hover:shadow-lg hover:-translate-y-0.5'
                                }`}
                            >
                              {isCompleted ? 'View Session' : isOngoing ? '● Join Class Now' : isExpired ? 'Class Expired' : 'Start Class'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {activeTab === 'students' && students
                  .filter(s => {
                    if (studentFilter === 'All') return true;
                    return s.subject.toLowerCase() === studentFilter.toLowerCase();
                  })
                  .filter(s => s.user.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.subject.toLowerCase().includes(searchTerm.toLowerCase()))
                  .sort((a, b) => {
                    return sortBy === 'Earliest' ? a.user.name.localeCompare(b.user.name) : b.user.name.localeCompare(a.user.name);
                  })
                  .map((student, index) => {

                    const isFemale = student.gender ? student.gender.toLowerCase() === 'female' : false;

                    // Get all students of same gender to find this student's index
                    const sameGenderStudents = students.filter(s => {
                      const sIsFemale = s.gender ? s.gender.toLowerCase() === 'female' : false;
                      return sIsFemale === isFemale;
                    }).sort((a, b) => a.id.localeCompare(b.id));

                    const genderIndex = sameGenderStudents.findIndex(s => s.id === student.id);

                    let avatarImg = '';
                    if (isFemale) {
                      // 11 female images (student_girl.jpg, student_girl_1.jpg to student_girl_10.jpg)
                      const imgNum = genderIndex % 11;
                      avatarImg = imgNum === 0 ? '/avatars/student_girl.jpg' : `/avatars/student_girl_${imgNum}.jpg`;
                    } else {
                      // 4 male images (student_boy.jpg, student_boy_1.jpg to student_boy_3.jpg)
                      const imgNum = genderIndex % 4;
                      avatarImg = imgNum === 0 ? '/avatars/student_boy.jpg' : `/avatars/student_boy_${imgNum}.jpg`;
                    }

                    const studentSessions = sessions.filter(s => s.studentProfile.id === student.id);
                    const now = new Date().getTime();
                    const attendedCount = studentSessions.filter(s => s.status === 'COMPLETED' || s.status === 'AI_REVIEWED').length;
                    const upcomingCount = studentSessions.filter(s => (s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS') && new Date(s.endTime).getTime() > now).length;
                    const missedCount = studentSessions.filter(s => s.status === 'MISSED' || (s.status === 'SCHEDULED' && new Date(s.endTime).getTime() <= now)).length;

                    const subjectC = getSubjectIllustration(student.subject, index);

                    return (
                      <div key={student.id} className="bg-cover bg-center rounded-[1.75rem] p-2 border border-slate-200 flex flex-col relative h-auto min-h-[550px] hover:shadow-md hover:-translate-y-1 transition-all duration-300 shrink-0 snap-start w-[320px] md:w-[360px]" style={{ backgroundImage: 'url(/illustrations/samedha.jpg)' }}>
                        {/* Top Image Area */}
                        <div className="rounded-[1.25rem] h-[160px] relative overflow-hidden mb-10 border border-slate-100 shrink-0">
                          <img src={subjectC.img} alt="Illustration" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                          {/* Top Right Action Buttons */}
                          <div className="absolute top-3 right-3 flex gap-1.5 z-10">
                            <button onClick={() => setHistoryStudentId(student.id)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/50 hover:bg-[#ff5734] hover:text-white backdrop-blur-md transition-colors text-black border border-white/40 shadow-sm" title="Session History">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                            <button
                              onClick={() => {
                                setEditStudentId(student.id);
                                setNewStudent({
                                  name: student.user.name,
                                  email: student.user.email,
                                  password: '',
                                  subject: student.subject,
                                  level: student.level,
                                  learningGoals: student.learningGoals,
                                  weakAreas: student.weakAreas,
                                  gender: student.gender || ''
                                });
                                setShowOtherLevel(!['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].includes(student.level));
                                setIsAddingStudent(true);
                              }}
                              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/50 hover:bg-white/90 backdrop-blur-md transition-colors text-black border border-white/40 shadow-sm" title="Edit Student">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteStudent(student.id)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/50 hover:bg-red-500 hover:text-white backdrop-blur-md transition-colors text-black border border-white/40 shadow-sm" title="Delete Student">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>

                        {/* Avatar Overlapping Bottom Left - Outside overflow-hidden */}
                        <div className="absolute top-[130px] left-5 w-20 h-20 rounded-full border-4 border-white overflow-hidden bg-slate-50 shadow-md z-20">
                          <img src={avatarImg} alt="Avatar" className="w-full h-full object-cover" />
                        </div>

                        <div className="px-3 flex-1 flex flex-col min-h-0">
                          <div className="flex justify-between items-start mb-4 shrink-0">
                            <div className="pt-2 flex-1">
                              <h3 className="text-2xl font-black text-[#151313] font-kodchasan tracking-tight mb-0.5 truncate max-w-[200px]">
                                {student.user.name}
                              </h3>
                              <p className="font-bold text-slate-400 text-xs truncate max-w-[200px] mb-1.5" title={student.user.email}>{student.user.email}</p>
                              <span className={`${subjectC.tagBg} ${subjectC.tagText} ${subjectC.tagBorder} px-2.5 py-0.5 rounded-lg text-[9px] font-black tracking-widest uppercase shadow-sm whitespace-nowrap inline-block`}>
                                {student.subject}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 pt-2 shrink-0">
                              <span className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm whitespace-nowrap">
                                {formatClass(student.level)}
                              </span>
                            </div>
                          </div>

                          {/* Stats Row (Pills Design) */}
                          <div className="grid grid-cols-3 gap-3 mb-5 shrink-0 px-2">
                            <div className="flex flex-col items-center bg-white/80 backdrop-blur-md rounded-2xl py-2.5 border border-white/60 shadow-sm hover:scale-105 transition-transform">
                              <span className="text-xl font-black text-[#151313] font-kodchasan">{attendedCount}</span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Completed</span>
                            </div>
                            <div className="flex flex-col items-center bg-white/80 backdrop-blur-md rounded-2xl py-2.5 border border-white/60 shadow-sm hover:scale-105 transition-transform">
                              <span className="text-xl font-black text-[#151313] font-kodchasan">{upcomingCount}</span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Upcoming</span>
                            </div>
                            <div className="flex flex-col items-center bg-red-50/90 backdrop-blur-md rounded-2xl py-2.5 border border-red-100/50 shadow-sm hover:scale-105 transition-transform">
                              <span className="text-xl font-black text-[#ff5734] font-kodchasan">{missedCount}</span>
                              <span className="text-[9px] font-bold text-[#ff5734] uppercase tracking-widest mt-0.5">Missed</span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="flex-1 flex flex-col justify-center mb-5 space-y-4 px-2">
                            <div>
                              <strong className="text-[#ff5734] flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mb-1.5 shrink-0">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Learning Goals
                              </strong>
                              <p className="font-bold text-slate-600 text-xs leading-relaxed line-clamp-2">{student.learningGoals}</p>
                            </div>
                            <div>
                              <strong className="text-[#3b82f6] flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mb-1.5 shrink-0">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                Weak Areas
                              </strong>
                              <p className="font-bold text-slate-600 text-xs leading-relaxed line-clamp-2">{student.weakAreas}</p>
                            </div>
                          </div>

                          {/* Bottom Area */}
                          <div className="mt-auto flex flex-col shrink-0 pb-1">
                            <button onClick={() => {
                              if (!progressSummaries[student.id]) {
                                handleGenerateSummary(student.id);
                              } else {
                                setSummaryStudentId(student.id);
                              }
                            }} disabled={loadingSummaries[student.id]} className="w-[95%] mx-auto bg-[#151313] text-white font-bold py-3.5 px-6 rounded-[1.25rem] hover:bg-[#ff5734] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2">
                              {loadingSummaries[student.id] ? 'Thinking...' : 'AI Summary'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {(activeTab === 'sessions' && sessions.filter(s => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS').length === 0) && (
                  <div className="col-span-full text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                    <h3 className="taitor-heading text-3xl text-slate-400">NO LESSONS FOUND</h3>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session History Modal */}
      {historyStudentId && (() => {
        const student = students.find(s => s.id === historyStudentId);
        if (!student) return null;

        const isFemale = student.gender ? student.gender.toLowerCase() === 'female' : false;
        const sameGenderStudents = students.filter(s => {
          const sIsFemale = s.gender ? s.gender.toLowerCase() === 'female' : false;
          return sIsFemale === isFemale;
        }).sort((a, b) => a.id.localeCompare(b.id));
        const genderIndex = sameGenderStudents.findIndex(s => s.id === student.id);

        let avatarImg = '';
        if (isFemale) {
          const imgNum = genderIndex % 11;
          avatarImg = imgNum === 0 ? '/avatars/student_girl.jpg' : `/avatars/student_girl_${imgNum}.jpg`;
        } else {
          const imgNum = genderIndex % 4;
          avatarImg = imgNum === 0 ? '/avatars/student_boy.jpg' : `/avatars/student_boy_${imgNum}.jpg`;
        }

        return (
          <div className="fixed inset-0 bg-[#151313]/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-up">
            <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-4xl shadow-2xl relative border-4 border-white/20 max-h-[90vh] flex flex-col">
              <button onClick={() => setHistoryStudentId(null)} className="absolute top-8 right-8 text-slate-400 hover:text-[#ff5734] transition-colors bg-slate-50 hover:bg-red-50 p-2 rounded-full z-10">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              <div className="flex items-center gap-4 mb-8 shrink-0 relative z-0">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-sm">
                  <img src={avatarImg} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-kodchasan text-3xl font-bold text-[#151313] tracking-tight">{student.user.name}'s History</h3>
                  <p className="text-slate-500 font-semibold">{student.subject} • {formatClass(student.level || '')}</p>
                </div>
              </div>
              <div className="p-6 overflow-y-auto bg-[#fafafa] flex-1">
                {sessions.filter(s => s.studentProfile.id === historyStudentId && (s.status === 'COMPLETED' || s.status === 'AI_REVIEWED' || s.status === 'MISSED')).length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-semibold">
                    <div className="text-6xl mb-4">📭</div>
                    No completed or missed sessions yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessions
                      .filter(s => s.studentProfile.id === historyStudentId && (s.status === 'COMPLETED' || s.status === 'AI_REVIEWED' || s.status === 'MISSED'))
                      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                      .map(session => (
                        <div key={session.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-slate-300 transition-colors">
                          <div>
                            <h4 className="font-bold text-[#151313] text-lg mb-1">{session.topic}</h4>
                            <p className="text-sm font-semibold text-slate-400">
                              {new Date(session.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(session.startTime).toLocaleTimeString([], { timeStyle: 'short' })}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${session.status === 'MISSED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {session.status}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* AI Summary Modal */}
      {summaryStudentId && (() => {
        const student = students.find(s => s.id === summaryStudentId);
        if (!student) return null;

        const isFemale = student.gender ? student.gender.toLowerCase() === 'female' : false;
        const sameGenderStudents = students.filter(s => {
          const sIsFemale = s.gender ? s.gender.toLowerCase() === 'female' : false;
          return sIsFemale === isFemale;
        }).sort((a, b) => a.id.localeCompare(b.id));
        const genderIndex = sameGenderStudents.findIndex(s => s.id === student.id);

        let avatarImg = '';
        if (isFemale) {
          const imgNum = genderIndex % 11;
          avatarImg = imgNum === 0 ? '/avatars/student_girl.jpg' : `/avatars/student_girl_${imgNum}.jpg`;
        } else {
          const imgNum = genderIndex % 4;
          avatarImg = imgNum === 0 ? '/avatars/student_boy.jpg' : `/avatars/student_boy_${imgNum}.jpg`;
        }

        const isLoading = loadingSummaries[summaryStudentId];
        const summary = progressSummaries[summaryStudentId];
        const error = errorSummaries[summaryStudentId];
        return (
          <div className="fixed inset-0 bg-[#151313]/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-up">
            <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-4xl shadow-2xl relative border-4 border-white/20 max-h-[90vh] flex flex-col">
              <button onClick={() => setSummaryStudentId(null)} className="absolute top-8 right-8 text-slate-400 hover:text-[#ff5734] transition-colors bg-slate-50 hover:bg-red-50 p-2 rounded-full z-10">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>

              {/* Top Banner (Student Full Details) */}
              <div className="bg-slate-50 rounded-3xl p-8 mb-6 flex flex-col md:flex-row gap-8 items-start border border-slate-100 shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md shrink-0">
                  <img src={avatarImg} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="md:col-span-2 flex flex-col items-start">
                    <h3 className="font-kodchasan text-3xl font-bold text-[#151313]">{student.user.name}</h3>
                    <p className="text-slate-500 font-bold mb-2">{student.user.email}</p>
                    <div className="flex gap-2">
                      <span className="bg-slate-800 text-white px-3 py-1 rounded-xl text-xs font-black tracking-widest uppercase shadow-sm">
                        {student.subject}
                      </span>
                      <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-xl text-xs font-black tracking-widest uppercase">
                        {formatClass(student.level)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[#ff5734] text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Learning Goals
                    </h4>
                    <p className="font-bold text-slate-700 text-sm leading-relaxed">{student.learningGoals}</p>
                  </div>
                  <div>
                    <h4 className="text-[#3b82f6] text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      Weak Areas
                    </h4>
                    <p className="font-bold text-slate-700 text-sm leading-relaxed">{student.weakAreas}</p>
                  </div>
                </div>
              </div>

              {/* AI Summary Section */}
              <div className="flex-1 overflow-y-auto bg-gradient-to-br from-[#fff4f1] to-white rounded-3xl p-8 border border-[#ffe0d8] flex flex-col relative">
                <div className="flex items-center gap-3 mb-6 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff5734] to-[#ff8c42] text-white flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <h3 className="font-kodchasan text-2xl font-bold text-[#151313]">AI Progress Summary</h3>
                </div>

                {isLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-[#ff5734] rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 font-bold animate-pulse">Generating insights...</p>
                  </div>
                ) : summary ? (
                  <div className="prose prose-sm max-w-none prose-p:text-slate-700 prose-p:font-semibold prose-p:leading-relaxed bg-white/50 rounded-2xl p-6 border border-white shadow-inner">
                    <p className="whitespace-pre-line text-base">{summary}</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-center">
                    {error ? (
                      <div className="mb-6 bg-red-50 text-red-600 px-6 py-4 rounded-2xl border border-red-100 max-w-md shadow-sm">
                        <strong className="block mb-1 text-lg">Unable to generate summary</strong>
                        <p className="text-sm font-semibold opacity-90">{error}</p>
                      </div>
                    ) : (
                      <p className="text-slate-500 font-bold mb-4">No summary generated yet.</p>
                    )}
                    <div className="flex justify-end gap-3 shrink-0">
                      <button onClick={() => setSummaryStudentId(null)} className="px-6 py-3 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 transition-colors">
                        Close
                      </button>
                      <button onClick={() => handleGenerateSummary(student.id)} className="bg-[#ff5734] text-white font-bold py-3 px-8 rounded-2xl hover:bg-[#e04523] transition-colors shadow-lg flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {isLoading ? 'Generating...' : 'Regenerate Summary'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast Notification */}
      {toastNotif && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up bg-[#1E1E1E] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
          <span className="text-xl">🔔</span>
          <p className="font-semibold text-sm">{toastNotif}</p>
        </div>
      )}
    </div>
  );
};

export default TutorDashboard;