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
  tutor: {
    name: string;
    email: string;
  };
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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">TutorFlow <span className="text-sm font-normal text-gray-500 ml-2">Student Portal</span></h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 font-medium">Hello, {user?.name}</span>
              <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-medium">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Upcoming Sessions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-2">Upcoming Classes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingSessions.map(session => (
              <div key={session.id} className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-blue-500">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{session.topic}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${session.status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800 animate-pulse'}`}>
                    {session.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">Tutor: <span className="font-medium text-gray-900">{session.tutor.name}</span></p>
                <div className="text-sm text-gray-500 flex flex-col space-y-1">
                  <span>Start: {new Date(session.startTime).toLocaleString()}</span>
                  <span>End: {new Date(session.endTime).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {upcomingSessions.length === 0 && (
              <p className="text-gray-500 bg-gray-100 p-4 rounded-lg inline-block">No upcoming classes scheduled right now.</p>
            )}
          </div>
        </div>

        {/* Past Sessions & Homework */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-2">Completed Classes & Homework</h2>
          <div className="flex flex-col space-y-6">
            {pastSessions.map(session => {
              const aiReview = session.aiReview ? JSON.parse(session.aiReview) : null;
              
              return (
                <div key={session.id} className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-xl">{session.topic}</h3>
                      <p className="text-sm text-gray-500 mt-1">{new Date(session.startTime).toLocaleDateString()} with {session.tutor.name}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Read-only Notes */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h4 className="font-semibold text-gray-700 mb-2">Class Notes</h4>
                      <div className="text-gray-600 text-sm whitespace-pre-wrap">
                        {session.notes || "No notes were provided for this class."}
                      </div>
                    </div>

                    {/* AI Homework & Review */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                      <h4 className="font-semibold text-green-800 mb-2">Homework & AI Review</h4>
                      {aiReview ? (
                        <div className="text-sm text-green-900 space-y-3">
                          <p><strong>Summary:</strong> {aiReview.summary}</p>
                          <div>
                            <strong className="block mb-1">Homework Tasks:</strong>
                            <ul className="list-disc pl-4 space-y-1">
                              {aiReview.homework.map((hw: string, i: number) => (
                                <li key={i}>{hw}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-green-700 italic">Your tutor hasn't generated the homework for this class yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {pastSessions.length === 0 && (
              <p className="text-gray-500">You haven't completed any classes yet.</p>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default StudentDashboard;
