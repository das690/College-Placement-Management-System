import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import { Toaster } from 'react-hot-toast'; 
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Navbar from './components/Navbar';

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <h2 className="text-xl font-semibold text-gray-300">Loading Application...</h2>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${user ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <Navbar /> 
      
      {/* NEW: The Toaster configured for Dark Mode */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1f2937', // Tailwind gray-800
            color: '#fff',
            border: '1px solid #374151', // Tailwind gray-700
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }} 
      />
      
      <main className={user ? "container mx-auto px-4 py-8 max-w-7xl" : "w-full"}>
        <Routes>
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
          <Route path="/reset-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* ========================================= */}
          {/*          MULTI-PAGE DASHBOARD ROUTES      */}
          {/* ========================================= */}
          
          {/* 1. Base Dashboard Route (Overview Analytics) */}
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard /> : <Navigate to="/login" />} 
          />

          {/* 2. Dynamic Sub-Page Route (Catches /dashboard/jobs, etc.) */}
          <Route 
            path="/dashboard/:view" 
            element={user ? <Dashboard /> : <Navigate to="/login" />} 
          />

        </Routes>
      </main>
    </div>
  );
}

export default App;