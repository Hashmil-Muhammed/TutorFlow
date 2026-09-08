import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';

const Login: React.FC = () => {
  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState<'student' | 'tutor'>('student');
  const [isSignup, setIsSignup] = useState(false);

  // Mouse Parallax State for Hero
  const [heroMouse, setHeroMouse] = useState({ x: 0, y: 0 });

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tutorName, setTutorName] = useState('');
  const [studyArea, setStudyArea] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Mouse Move Handler for Parallax Effect
  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setHeroMouse({ x, y });
  };

  const handleHeroMouseLeave = () => {
    setHeroMouse({ x: 0, y: 0 });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isSignup && activeTab === 'tutor') {
        // --- SIGNUP LOGIC ---
        if (password !== confirmPassword) {
          setError('Passwords do not match!');
          setIsLoading(false);
          return;
        }

        // Mocking Signup API Call (Adjust the endpoint according to your backend)
        await api.post('/auth/register', {
          email,
          password,
          name: tutorName,
          subject: studyArea,
          role: 'TUTOR'
        });

        setSuccessMsg('Account created successfully! Please log in.');
        setIsSignup(false); // Switch back to login
        setPassword('');
        setConfirmPassword('');

      } else {
        // --- LOGIN LOGIC ---
        const res = await api.post('/auth/login', { email, password });
        login(res.data.token, res.data.user);

        if (res.data.user.role === 'TUTOR') {
          navigate('/tutor-dashboard');
        } else {
          navigate('/student-dashboard');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${isSignup ? 'register' : 'login'}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to switch tabs cleanly
  const switchTab = (tab: 'student' | 'tutor') => {
    setActiveTab(tab);
    setIsSignup(false);
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen bg-[#fdc864] font-sans overflow-x-hidden selection:bg-[#F1714B] selection:text-white flex flex-col">
      <br />

      {/* ── NAVBAR ── */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-6 max-w-7xl mx-auto relative z-20 w-full">
        <div className="hidden lg:flex gap-8 text-[13px] font-bold text-[#1C1D21] tracking-wide">
          <a href="#" className="hover:text-[#F1714B] transition-colors"></a>
          <a href="#" className="hover:text-[#F1714B] transition-colors"></a>
          <a href="#" className="hover:text-[#F1714B] transition-colors"></a>
        </div>
        <div className="font-kodchasan font-black text-2xl tracking-tighter text-[#1C1D21] lg:absolute lg:left-1/2 lg:-translate-x-1/2 mt-4 md:mt-0">
          <h1 className="text-4xl font-bold text-[#F1714B] font-kodchasan tracking-tight">TutorFlow</h1>
        </div>
      </nav>

      {/* ── HERO SECTION (SS1) ── */}
      <section 
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
        className="max-w-7xl mx-auto px-6 md:px-12 pt-8 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10 w-full"
      >

        {/* Hero Left Content */}
        <div className="pt-10 flex flex-col items-start z-20">
{/* Tag & Squiggly Line with Parallax Effect */}
          <div 
            className="relative mb-8 ml-8 transition-transform duration-200 ease-out pointer-events-none"
            style={{
              transform: `translate(${heroMouse.x * -16}px, ${heroMouse.y * -12}px) rotate(${heroMouse.x * 6}deg)`
            }}
          >
            <svg
              className="absolute -top-3 -right-20 w-28 h-28 text-[#1C1D21]"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
            >
              {/* Dotted Flight Trail with Loop */}
              <path
                d="M 10 95 C 10 65, 25 55, 38 65 C 48 75, 38 90, 26 82 C 18 76, 30 55, 48 58 C 65 60, 68 38, 70 32"
                strokeWidth="2"
                strokeDasharray="3 3"
                strokeLinecap="round"
              />

              {/* Paper Airplane */}
              <g transform="translate(68, 12) rotate(10) scale(0.9)">
                <path d="M 28 2 L 2 16 L 14 20 L 28 2 Z" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <path d="M 28 2 L 14 20 L 16 28 L 20 22 L 28 2 Z" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <path d="M 14 20 L 28 2" strokeWidth="2" strokeLinecap="round" />
              </g>
            </svg>
          </div>

          {/* Heading with Synced Parallax */}
          <h1 
            className="font-kodchasan text-[3.5rem] md:text-[5rem] lg:text-[5.5rem] font-black text-[#1C1D21] leading-[1.05] tracking-tight mb-6 mt-8 md:mt-12 transition-transform duration-200 ease-out"
            style={{
              transform: `translate(${heroMouse.x * -10}px, ${heroMouse.y * -7}px)`,
              textShadow: heroMouse.x !== 0 ? `${heroMouse.x * 6}px ${heroMouse.y * 6}px 24px rgba(241,113,75,0.25)` : 'none'
            }}
          >
            Where great <span className="text-[#F1714B]">minds</span> meet top tutors
          </h1>

          <p className="text-[13px] md:text-sm font-semibold text-[#1C1D21]/80 max-w-sm mb-10 leading-relaxed"></p>

          <button
            onClick={() => {
              document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-[#F1714B] text-white px-9 py-4 rounded-full font-bold text-[15px] shadow-[0_5px_0_#B83B1A] active:translate-y-[5px] active:shadow-none transition-all cursor-pointer"
          >
            Join TutorFlow
          </button>
        </div>

        {/* Hero Right - Illustration Image */}
        <div className="relative h-[550px] mt-8 md:mt-12 hidden md:flex items-center justify-center pointer-events-none w-full">
          <img
            src="/illustrations/image.png"
            alt="Learning Illustration"
            className="w-full h-full object-contain mix-blend-multiply scale-150 translate-y-1.5"
          />
        </div>
      </section>

      {/* ── FEATURES & LOGIN FORM SECTION ── */}
      <section id="login-section" className="bg-[#cff2e9] w-full flex-grow pt-20 px-6 md:px-12 relative z-20 flex flex-col justify-between">

        {/* Background Squiggle Right */}
        <svg
          className="absolute top-20 right-22 w-50 h-20 text-[#3B6FB6]"
          viewBox="0 0 100 80"
          fill="none"
          stroke="currentColor"
        >
          <path d="M 12 68 C 18 64 23 54 20 44 C 16 34 2 38 4 52 C 6 64 25 72 37 62 C 48 52 46 26 34 20 C 22 14 18 36 29 48 C 42 62 62 66 75 50 C 88 34 85 10 70 6 C 56 2 54 26 68 36 C 78 44 88 40 94 30" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <br />
        <div className="max-w-7xl mx-auto w-full">
          {/* ── HEADER SECTION ── */}
          <div className="text-center mb-24 md:mb-28 relative z-10 flex flex-col items-center w-full mt-10">
            <h2 className="font-kodchasan text-[2.75rem] md:text-[4.5rem] font-black text-[#1C1D21] leading-[1.1] tracking-tight mb-6">
              Join the biggest <br className="hidden md:block" />
              <span className="relative inline-block">
                community
                <svg className="absolute -bottom-2 md:-bottom-3 left-0 w-[110%] -ml-[5%] h-3 md:h-4 text-[#F1714B]" viewBox="0 0 100 15" preserveAspectRatio="none" fill="none" stroke="currentColor">
                  <path d="M 2 10 Q 20 2 45 10 T 98 10" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span> of learning
            </h2>
            <p className="text-[13px] md:text-[15px] font-semibold text-slate-500 max-w-2xl leading-relaxed px-4">
              Everyone agrees with the fact that learning management systems are a tremendous way to expand learners' knowledge base and help staff enhance their skills.
            </p>
          </div>

          {/* Form & Cards Grid Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 mt-6 mb-20">

            {/* ── LOGIN FORM CARD WRAPPER ── */}
            <div className="relative lg:col-span-2 w-full max-w-[580px] lg:justify-self-start pt-12 md:pt-14">

              {/* ── STICKY TOP TABS (Student & Tutor) ── */}
              <div className="absolute top-0 right-4 md:right-8 flex gap-1.5 z-0">
                <button
                  type="button"
                  onClick={() => switchTab('student')}
                  className={`px-6 py-3.5 md:px-8 md:py-4 rounded-t-2xl font-black text-xs md:text-sm uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'student'
                      ? 'bg-white text-[#1C1D21] h-[calc(100%+4px)] z-20 shadow-[-5px_-5px_15px_rgba(28,29,33,0.03)]'
                      : 'bg-[#1C1D21]/5 text-[#1C1D21]/50 hover:bg-[#1C1D21]/10 mt-2 z-0'
                    }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => switchTab('tutor')}
                  className={`px-6 py-3.5 md:px-8 md:py-4 rounded-t-2xl font-black text-xs md:text-sm uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'tutor'
                      ? 'bg-white text-[#1C1D21] h-[calc(100%+4px)] z-20 shadow-[5px_-5px_15px_rgba(28,29,33,0.03)]'
                      : 'bg-[#1C1D21]/5 text-[#1C1D21]/50 hover:bg-[#1C1D21]/10 mt-2 z-0'
                    }`}
                >
                  Tutor
                </button>
              </div>

              {/* ── CARD CONTENT ── */}
              <div className="bg-white rounded-[2.5rem] p-8 md:p-12 relative shadow-xl shadow-[#1C1D21]/5 flex flex-col items-center w-full z-10 border-[3px] border-transparent hover:border-[#1C1D21]/5 transition-all">

                <div className="relative z-10 w-full flex flex-col items-center text-center">
                  {/* Header Text */}
                  <div className="mb-8 w-full mt-2">
                    <h3 className="font-kodchasan text-3xl md:text-4xl font-black text-[#1C1D21] tracking-tight mb-2">
                      {isSignup ? 'Apply as Tutor' : `${activeTab === 'tutor' ? 'Tutor' : 'Student'} Login`}
                    </h3>
                    <p className="text-sm font-semibold text-slate-500 leading-relaxed max-w-md mx-auto">
                      {isSignup
                        ? 'Join our community of expert educators today.'
                        : 'Welcome back! Access your lessons, track your progress, and continue learning.'}
                    </p>
                  </div>

                  {/* Form */}
                  <form className="space-y-5 w-full text-left" onSubmit={handleAuth}>

                    {error && (
                      <div className="bg-rose-50 text-rose-600 border-2 border-rose-200 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2.5">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {error}
                      </div>
                    )}

                    {successMsg && (
                      <div className="bg-emerald-50 text-emerald-600 border-2 border-emerald-200 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2.5">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {successMsg}
                      </div>
                    )}

                    <div className="space-y-4 w-full">

                      {/* -- Signup Specific Fields (Only for Tutor Signup) -- */}
                      {isSignup && activeTab === 'tutor' && (
                        <>
                          <div>
                            <label className="block text-xs font-black text-[#1C1D21] mb-2 uppercase tracking-wider">
                              Full Name
                            </label>
                            <input
                              type="text"
                              required
                              className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-2xl text-[#1C1D21] font-bold text-sm transition-all outline-none border-2 border-transparent focus:border-[#F1714B] focus:ring-4 focus:ring-[#F1714B]/10 placeholder:text-slate-400"
                              placeholder="John Doe"
                              value={tutorName}
                              onChange={(e) => setTutorName(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-black text-[#1C1D21] mb-2 uppercase tracking-wider">
                              Study Area
                            </label>
                            <div className="relative">
                              <select
                                required
                                className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-2xl text-[#1C1D21] font-bold text-sm transition-all outline-none border-2 border-transparent focus:border-[#F1714B] focus:ring-4 focus:ring-[#F1714B]/10 appearance-none cursor-pointer"
                                value={studyArea}
                                onChange={e => setStudyArea(e.target.value)}
                              >
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
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* -- Common Fields -- */}
                      <div>
                        <label className="block text-xs font-black text-[#1C1D21] mb-2 uppercase tracking-wider" htmlFor="email">
                          Email address
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-2xl text-[#1C1D21] font-bold text-sm transition-all outline-none border-2 border-transparent focus:border-[#F1714B] focus:ring-4 focus:ring-[#F1714B]/10 placeholder:text-slate-400 placeholder:font-semibold"
                          placeholder={activeTab === 'tutor' ? "tutor@tutorflow.com" : "student@tutorflow.com"}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-[#1C1D21] mb-2 uppercase tracking-wider" htmlFor="password">
                          Password
                        </label>
                        <div className="relative flex items-center">
                          <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            className={`w-full px-5 py-4 pr-12 bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-2xl text-[#1C1D21] font-bold text-sm transition-all outline-none border-2 border-transparent focus:border-[#F1714B] focus:ring-4 focus:ring-[#F1714B]/10 placeholder:text-slate-400 placeholder:font-semibold ${!showPassword ? 'tracking-[0.2em]' : 'tracking-normal'
                              }`}
                            placeholder={showPassword ? "Enter password" : "••••••••"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 text-slate-400 hover:text-[#1C1D21] transition-colors p-1 cursor-pointer bg-white rounded-full shadow-sm"
                          >
                            {showPassword ? (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* -- Confirm Password (Only for Signup) -- */}
                      {isSignup && activeTab === 'tutor' && (
                        <div>
                          <label className="block text-xs font-black text-[#1C1D21] mb-2 uppercase tracking-wider">
                            Confirm Password
                          </label>
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            className={`w-full px-5 py-4 bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-2xl text-[#1C1D21] font-bold text-sm transition-all outline-none border-2 border-transparent focus:border-[#F1714B] focus:ring-4 focus:ring-[#F1714B]/10 placeholder:text-slate-400 ${!showPassword ? 'tracking-[0.2em]' : 'tracking-normal'
                              }`}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-4 bg-[#F1714B] text-white font-bold text-[15px] rounded-full shadow-[0_5px_0_#B83B1A] transition-all flex justify-center items-center gap-2 active:translate-y-[5px] active:shadow-none cursor-pointer ${isLoading ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          isSignup ? 'Sign Up' : 'Sign In'
                        )}
                      </button>
                    </div>

                    {/* Toggle Signup / Login link (Only for Tutor Tab) */}
                    {activeTab === 'tutor' && (
                      <div className="text-center mt-6 pt-4 border-t-2 border-slate-100 border-dashed">
                        {isSignup ? (
                          <p className="text-sm font-semibold text-slate-500">
                            Already have an account?{' '}
                            <button type="button" onClick={() => setIsSignup(false)} className="text-[#F1714B] font-bold hover:underline cursor-pointer">
                              Log in
                            </button>
                          </p>
                        ) : (
                          <p className="text-sm font-semibold text-slate-500">
                            New here?{' '}
                            <button type="button" onClick={() => setIsSignup(true)} className="text-[#F1714B] font-bold hover:underline cursor-pointer">
                              Apply as Tutor
                            </button>
                          </p>
                        )}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>

            {/* ── ILLUSTRATION COLUMN (Right Side) ── */}
            <div className="flex items-center justify-center relative w-full h-full min-h-[580px] overflow-visible">
              <img
                src="/illustrations/image2.png"
                alt="TutorFlow Feature Illustration"
                className="w-full min-w-[550px] max-w-[800px] lg:scale-125 h-auto object-contain select-none pointer-events-none drop-shadow-md transition-transform duration-300"
              />
            </div>

          </div>
        </div>
      </section>

      {/* ── FOOTER (Placed explicitly at the very end of the page wrapper) ── */}
      {/* <footer className="w-full relative z-20 mt-auto bg-[#cff2e9] pb-6 px-6 md:px-12">
        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest text-center sm:text-left">
            © 2026 Hashmil Muhammed <span className="hidden sm:inline mx-1 text-slate-400">•</span> All rights reserved
          </p>
          <img
            src="/illustrations/logo-transparent-dark.png"
            alt="#MIL Logo"
            className="h-7 md:h-9 w-auto object-contain hover:opacity-100 transition-opacity cursor-pointer"
          />
        </div>
      </footer> */}
    </div>
  );
};

export default Login;