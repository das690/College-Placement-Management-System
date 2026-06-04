import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  // NEW: Added adminCode to the state
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student', adminCode: '' });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // NEW: Pass the adminCode to the context
      await register(formData.name, formData.email, formData.password, formData.role, formData.adminCode);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center bg-[url('/4.jpg')] bg-cover bg-center bg-no-repeat relative py-8">
      
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 w-full max-w-md p-10 bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl my-auto">
        
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-6 left-6 text-gray-300 hover:text-white flex items-center gap-2 transition-colors group"
        >
          <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>

        <div className="text-center mb-6 mt-4">
          <h2 className="text-3xl font-bold text-white mb-2 tracking-wide">Create Account</h2>
          <p className="text-gray-200 text-sm">Join the placement portal today</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Full Name or Company Name</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-3 bg-white/20 border border-white/10 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/30 transition-all"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

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
            <label className="block text-sm font-medium text-gray-200 mb-1">Password</label>
            <input 
              type="password" 
              required
              minLength="6"
              className="w-full px-4 py-3 bg-white/20 border border-white/10 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/30 transition-all"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">I am registering as a:</label>
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="role" 
                  value="student" 
                  checked={formData.role === 'student'} 
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="hidden peer"
                />
                <div className="text-center px-2 py-2 rounded-xl border border-white/20 text-gray-300 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-500 transition-all text-sm">
                  Student
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="role" 
                  value="company" 
                  checked={formData.role === 'company'} 
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="hidden peer"
                />
                <div className="text-center px-2 py-2 rounded-xl border border-white/20 text-gray-300 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-500 transition-all text-sm">
                  Company
                </div>
              </label>
              {/* NEW: Admin Radio Button */}
              <label className="flex-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="role" 
                  value="admin" 
                  checked={formData.role === 'admin'} 
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="hidden peer"
                />
                <div className="text-center px-2 py-2 rounded-xl border border-white/20 text-gray-300 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-500 transition-all text-sm">
                  Admin
                </div>
              </label>
            </div>
          </div>

          {/* NEW: Conditional Secret Code Input */}
          {formData.role === 'admin' && (
            <div className="animate-fade-in-down">
              <label className="block text-sm font-medium text-blue-300 mb-1">Admin Secret Passcode</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-3 bg-blue-900/30 border border-blue-500/50 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                placeholder="Enter secret code"
                value={formData.adminCode}
                onChange={(e) => setFormData({...formData, adminCode: e.target.value})}
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] mt-2 flex justify-center items-center"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-300">
          Already have an account? <Link to="/login" className="text-blue-300 hover:text-white font-medium">Sign in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;