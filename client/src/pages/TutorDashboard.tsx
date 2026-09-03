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
}

const TutorDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  
  // Add Student Form State
  const [newStudent, setNewStudent] = useState({ name: '', email: '', password: '', subject: '', level: '', learningGoals: '', weakAreas: '' });
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // Schedule Session Form State
  const [newSession, setNewSession] = useState({ studentId: '', startTime: '', endTime: '', topic: '' });
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

  const handleScheduleSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError('');
    try {
      await api.post('/sessions/schedule', newSession);
      setIsScheduling(false);
      setNewSession({ studentId: '', startTime: '', endTime: '', topic: '' });
      fetchData(); // Refresh list
    } catch (error: any) {
      setScheduleError(error.response?.data?.error || 'Failed to schedule session');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">TutorFlow</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Tutor: {user?.name}</span>
              <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-medium">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Sessions Section */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Upcoming Sessions</h2>
            <button 
              onClick={() => setIsScheduling(!isScheduling)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              {isScheduling ? 'Cancel' : '+ Schedule Session'}
            </button>
          </div>

          {isScheduling && (
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
              <h3 className="text-lg font-medium mb-4">Schedule New Session</h3>
              {scheduleError && <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded">{scheduleError}</div>}
              <form onSubmit={handleScheduleSession} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                  <select 
                    required
                    className="w-full border p-2 rounded"
                    value={newSession.studentId}
                    onChange={e => setNewSession({...newSession, studentId: e.target.value})}
                  >
                    <option value="">Select Student</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.user.name} - {s.subject}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                  <input type="text" required className="w-full border p-2 rounded" value={newSession.topic} onChange={e => setNewSession({...newSession, topic: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input type="datetime-local" required className="w-full border p-2 rounded" value={newSession.startTime} onChange={e => setNewSession({...newSession, startTime: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input type="datetime-local" required className="w-full border p-2 rounded" value={newSession.endTime} onChange={e => setNewSession({...newSession, endTime: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Schedule</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map(session => (
              <div key={session.id} className="bg-white p-5 rounded-xl shadow-sm border">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{session.topic}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${session.status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                    {session.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">Student: <span className="font-medium text-gray-900">{session.studentProfile.user.name}</span></p>
                <div className="text-sm text-gray-500 flex flex-col space-y-1">
                  <span>Start: {new Date(session.startTime).toLocaleString()}</span>
                  <span>End: {new Date(session.endTime).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-gray-500">No sessions scheduled.</p>}
          </div>
        </div>

        {/* Students Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">My Students</h2>
            <button 
              onClick={() => setIsAddingStudent(!isAddingStudent)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
            >
              {isAddingStudent ? 'Cancel' : '+ Add Student'}
            </button>
          </div>

          {isAddingStudent && (
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
              <h3 className="text-lg font-medium mb-4">Add New Student</h3>
              <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Name" required className="border p-2 rounded" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                <input type="email" placeholder="Email" required className="border p-2 rounded" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} />
                <input type="password" placeholder="Temporary Password" required className="border p-2 rounded" value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})} />
                <input type="text" placeholder="Subject (e.g. Math)" required className="border p-2 rounded" value={newStudent.subject} onChange={e => setNewStudent({...newStudent, subject: e.target.value})} />
                <input type="text" placeholder="Level (e.g. Grade 10)" required className="border p-2 rounded" value={newStudent.level} onChange={e => setNewStudent({...newStudent, level: e.target.value})} />
                <input type="text" placeholder="Learning Goals" required className="border p-2 rounded" value={newStudent.learningGoals} onChange={e => setNewStudent({...newStudent, learningGoals: e.target.value})} />
                <input type="text" placeholder="Weak Areas" required className="border p-2 rounded" value={newStudent.weakAreas} onChange={e => setNewStudent({...newStudent, weakAreas: e.target.value})} />
                <div className="md:col-span-2">
                  <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">Save Student</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {students.map(student => (
              <div key={student.id} className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-green-500">
                <h3 className="font-bold text-lg mb-1">{student.user.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{student.user.email}</p>
                <div className="text-sm">
                  <p><span className="font-medium text-gray-700">Subject:</span> {student.subject}</p>
                  <p><span className="font-medium text-gray-700">Level:</span> {student.level}</p>
                </div>
              </div>
            ))}
            {students.length === 0 && <p className="text-gray-500">No students added yet.</p>}
          </div>
        </div>

      </main>
    </div>
  );
};

export default TutorDashboard;
