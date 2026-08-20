import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { validateEmail, validatePassword } from '../utils/validation';

const Login = () => {
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    const emailErr = validateEmail(formData.email);
    const passErr = validatePassword(formData.password, 6);

    const validationErrors = {};
    if (emailErr) validationErrors.email = emailErr;
    if (passErr) validationErrors.password = passErr;

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await login(formData.email.trim(), formData.password);
    } catch (err) {
      // Handled in AuthContext toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center bg-[url('/4.jpg')] bg-cover bg-center bg-no-repeat relative">
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 w-full max-w-md p-10 bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2 tracking-wide">Welcome Back</h2>
          <p className="text-gray-200 text-sm">Sign in to your placement account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Email Address</label>
            <input 
              type="email" 
              className={`w-full px-4 py-3 bg-white/20 border ${errors.email ? 'border-red-400 focus:ring-red-400' : 'border-white/10 focus:ring-blue-400'} rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:bg-white/30 transition-all`}
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
            {errors.email && (
              <p className="text-xs text-red-300 mt-1 font-semibold flex items-center gap-1">
                <span>✕</span> {errors.email}
              </p>
            )}
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
              className={`w-full px-4 py-3 bg-white/20 border ${errors.password ? 'border-red-400 focus:ring-red-400' : 'border-white/10 focus:ring-blue-400'} rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:bg-white/30 transition-all`}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
            />
            {errors.password && (
              <p className="text-xs text-red-300 mt-1 font-semibold flex items-center gap-1">
                <span>✕</span> {errors.password}
              </p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                <span>Signing In...</span>
              </>
            ) : (
              'Sign In'
            )}
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