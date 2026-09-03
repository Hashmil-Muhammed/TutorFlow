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
      setSession(res.data);
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
      setSession(res.data);
      setStatus('AI_REVIEWED');
    } catch (error) {
      alert('Failed to generate review. Ensure you have written notes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!session) return <div className="p-8">Loading session...</div>;

  const isCompleted = status === 'COMPLETED' || status === 'AI_REVIEWED';
  const parsedLessonPlan = session.aiLessonPlan ? JSON.parse(session.aiLessonPlan) : null;
  const parsedReview = session.aiReview ? JSON.parse(session.aiReview) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b px-4 py-3 flex justify-between items-center">
        <div>
          <button onClick={() => navigate('/tutor-dashboard')} className="text-gray-500 hover:text-blue-600 text-sm font-medium">
            &larr; Back to Dashboard
          </button>
          <h1 className="text-xl font-bold mt-1">Live Room: {session.topic}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-800' :
            status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 animate-pulse' :
            status === 'AI_REVIEWED' ? 'bg-purple-100 text-purple-800' :
            'bg-gray-200 text-gray-800'
          }`}>
            Status: {status}
          </span>
          
          {status === 'SCHEDULED' && (
            <button onClick={() => advanceState('IN_PROGRESS')} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 font-medium">
              Start Session
            </button>
          )}
          
          {status === 'IN_PROGRESS' && (
            <button onClick={() => advanceState('COMPLETED')} className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 font-medium">
              End Session
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col md:flex-row gap-6">
        
        {/* Left column: Info & AI Outputs */}
        <div className="w-full md:w-1/3 space-y-6">
          <div className="bg-white p-5 rounded-lg shadow-sm border">
            <h3 className="font-bold text-gray-800 mb-2 border-b pb-2">Student Info</h3>
            <p className="font-semibold text-lg">{session.studentProfile.user.name}</p>
            <p className="text-sm text-gray-600 mt-2"><span className="font-medium text-gray-800">Subject:</span> {session.studentProfile.subject}</p>
            <p className="text-sm text-gray-600"><span className="font-medium text-gray-800">Level:</span> {session.studentProfile.level}</p>
            
            <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-900 border border-blue-100">
              <span className="font-semibold block mb-1">Learning Goals:</span>
              {session.studentProfile.learningGoals}
            </div>
            
            <div className="mt-2 p-3 bg-red-50 rounded text-sm text-red-900 border border-red-100">
              <span className="font-semibold block mb-1">Weak Areas:</span>
              {session.studentProfile.weakAreas}
            </div>
          </div>

          {/* AI Lesson Plan Box */}
          {status === 'SCHEDULED' && !parsedLessonPlan && (
            <div className="bg-purple-50 p-5 rounded-lg shadow-sm border border-purple-100 text-center">
              <p className="text-sm text-purple-800 mb-3">Generate a personalized lesson plan for today's session based on the student's profile.</p>
              <button onClick={generateLessonPlan} disabled={isSaving} className="w-full bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700 font-medium disabled:opacity-50">
                {isSaving ? 'Generating...' : '✨ Generate AI Lesson Plan'}
              </button>
            </div>
          )}

          {parsedLessonPlan && (
            <div className="bg-purple-50 p-5 rounded-lg shadow-sm border border-purple-200">
              <h3 className="font-bold text-purple-900 mb-3 border-b border-purple-200 pb-2">✨ AI Lesson Plan</h3>
              <div className="text-sm text-purple-800 space-y-3">
                <div>
                  <strong className="block mb-1">Objectives:</strong>
                  <ul className="list-disc pl-4 space-y-1">
                    {parsedLessonPlan.objectives.map((o: string, i: number) => <li key={i}>{o}</li>)}
                  </ul>
                </div>
                <div>
                  <strong className="block mb-1">Outline:</strong>
                  <ul className="list-disc pl-4 space-y-1">
                    {parsedLessonPlan.outline.map((o: string, i: number) => <li key={i}>{o}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* AI Session Review Box */}
          {status === 'COMPLETED' && (
             <div className="bg-green-50 p-5 rounded-lg shadow-sm border border-green-100 text-center">
              <p className="text-sm text-green-800 mb-3">Generate a review and homework for the student based on your class notes.</p>
              <button onClick={generateReview} disabled={isSaving} className="w-full bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 font-medium disabled:opacity-50">
                {isSaving ? 'Generating...' : '✨ Generate AI Session Review'}
              </button>
            </div>
          )}

          {parsedReview && (
            <div className="bg-green-50 p-5 rounded-lg shadow-sm border border-green-200">
              <h3 className="font-bold text-green-900 mb-3 border-b border-green-200 pb-2">✨ AI Session Review</h3>
              <div className="text-sm text-green-800 space-y-3">
                <p><strong>Summary:</strong> {parsedReview.summary}</p>
                <div>
                  <strong className="block mb-1">Homework:</strong>
                  <ul className="list-disc pl-4 space-y-1">
                    {parsedReview.homework.map((o: string, i: number) => <li key={i}>{o}</li>)}
                  </ul>
                </div>
                <p><strong>Next Class:</strong> {parsedReview.suggestionForNextClass}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Notes */}
        <div className="w-full md:w-2/3 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-800 text-lg">Session Notes</h3>
            <span className="text-xs text-gray-500">
              {isSaving ? 'Saving...' : notes !== savedNotes ? 'Unsaved changes' : 'Saved to Cloud'}
            </span>
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
            className={`flex-1 w-full p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none ${
              status !== 'IN_PROGRESS' ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
            }`}
          />
          {isCompleted && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg text-center border text-gray-600">
              Session is {status}. Notes are locked and cannot be edited.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SessionLiveRoom;
