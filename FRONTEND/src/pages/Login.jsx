import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(formData.email, formData.password);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center bg-[url('/4.jpg')] bg-cover bg-center bg-no-repeat relative">
      
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 w-full max-w-md p-10 bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2 tracking-wide">Welcome Back</h2>
          <p className="text-gray-200 text-sm">Sign in to your placement account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 bg-white/20 border border-white/10 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/30 transition-all"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-200">Password</label>
              <Link to="/reset-password" className="text-xs text-blue-300 hover:text-white transition-colors">
                Forgot Password?
              </Link>
            </div>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 bg-white/20 border border-white/10 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/30 transition-all"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-all transform hover:scale-[1.02]"
          >
            Sign In
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-300">
          Don't have an account? <Link to="/register" className="text-blue-300 hover:text-white font-medium">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;