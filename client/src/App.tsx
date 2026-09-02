import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import TutorDashboard from './pages/TutorDashboard';
import StudentDashboard from './pages/StudentDashboard';

const PrivateRoute = ({ children, role }: { children: JSX.Element, role: 'TUTOR' | 'STUDENT' }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === 'TUTOR' ? "/tutor-dashboard" : "/student-dashboard"} replace />;
  
  return children;
};

function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          user ? (
            <Navigate to={user.role === 'TUTOR' ? "/tutor-dashboard" : "/student-dashboard"} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      
      <Route 
        path="/login" 
        element={
          user ? (
            <Navigate to={user.role === 'TUTOR' ? "/tutor-dashboard" : "/student-dashboard"} replace />
          ) : (
            <Login />
          )
        } 
      />
      
      <Route 
        path="/tutor-dashboard" 
        element={
          <PrivateRoute role="TUTOR">
            <TutorDashboard />
          </PrivateRoute>
        } 
      />
      
      <Route 
        path="/student-dashboard" 
        element={
          <PrivateRoute role="STUDENT">
            <StudentDashboard />
          </PrivateRoute>
        } 
      />
    </Routes>
  );
}

export default App;
