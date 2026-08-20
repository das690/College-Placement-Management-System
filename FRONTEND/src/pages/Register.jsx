import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { validateEmail, validatePassword, validateConfirmPassword } from '../utils/validation';

const Register = () => {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'student', adminCode: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    
    // Client-side validation
    const validationErrors = {};

    if (!formData.name || formData.name.trim().length < 2) {
      validationErrors.name = 'Full name must be at least 2 characters.';
    }

    const emailErr = validateEmail(formData.email);
    if (emailErr) validationErrors.email = emailErr;

    const passErr = validatePassword(formData.password, 6);
    if (passErr) validationErrors.password = passErr;

    if (formData.role === 'admin' && (!formData.adminCode || formData.adminCode.trim() === '')) {
      validationErrors.adminCode = 'Admin Secret Passcode is required.';
    }

    const confirmErr = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (confirmErr) validationErrors.confirmPassword = confirmErr;

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await register(
        formData.name.trim(), 
        formData.email.trim(), 
        formData.password, 
        formData.role, 
        formData.role === 'admin' ? formData.adminCode.trim() : undefined
      );
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Failed to register. Please try again.');
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

        {serverError && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Full Name or Company Name</label>
            <input 
              type="text" 
              className={`w-full px-4 py-3 bg-white/20 border ${errors.name ? 'border-red-400 focus:ring-red-400' : 'border-white/10 focus:ring-blue-400'} rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:bg-white/30 transition-all`}
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
            {errors.name && (
              <p className="text-xs text-red-300 mt-1 font-semibold flex items-center gap-1">
                <span>✕</span> {errors.name}
              </p>
            )}
          </div>

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
            <label className="block text-sm font-medium text-gray-200 mb-1">Password</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Confirm Password</label>
            <input 
              type="password" 
              className={`w-full px-4 py-3 bg-white/20 border ${errors.confirmPassword ? 'border-red-400 focus:ring-red-400' : 'border-white/10 focus:ring-blue-400'} rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:bg-white/30 transition-all`}
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-300 mt-1 font-semibold flex items-center gap-1">
                <span>✕</span> {errors.confirmPassword}
              </p>
            )}
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
                  onChange={(e) => handleChange('role', e.target.value)}
                  className="hidden peer"
                />
                <div className="text-center px-2 py-2 rounded-xl border border-white/20 text-gray-300 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-500 transition-all text-sm font-medium">
                  Student
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="role" 
                  value="company" 
                  checked={formData.role === 'company'} 
                  onChange={(e) => handleChange('role', e.target.value)}
                  className="hidden peer"
                />
                <div className="text-center px-2 py-2 rounded-xl border border-white/20 text-gray-300 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-500 transition-all text-sm font-medium">
                  Company
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="role" 
                  value="admin" 
                  checked={formData.role === 'admin'} 
                  onChange={(e) => handleChange('role', e.target.value)}
                  className="hidden peer"
                />
                <div className="text-center px-2 py-2 rounded-xl border border-white/20 text-gray-300 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-500 transition-all text-sm font-medium">
                  Admin
                </div>
              </label>
            </div>
          </div>

          {/* Conditional Secret Code Input */}
          {formData.role === 'admin' && (
            <div className="animate-fade-in-down">
              <label className="block text-sm font-medium text-blue-300 mb-1">Admin Secret Passcode</label>
              <input 
                type="password" 
                className={`w-full px-4 py-3 bg-blue-900/30 border ${errors.adminCode ? 'border-red-400 focus:ring-red-400' : 'border-blue-500/50 focus:ring-blue-400'} rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 transition-all`}
                placeholder="Enter secret code (e.g. GUVI-ADMIN)"
                value={formData.adminCode}
                onChange={(e) => handleChange('adminCode', e.target.value)}
              />
              {errors.adminCode && (
                <p className="text-xs text-red-300 mt-1 font-semibold flex items-center gap-1">
                  <span>✕</span> {errors.adminCode}
                </p>
              )}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] mt-2 flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                <span>Creating Account...</span>
              </>
            ) : (
              'Create Account'
            )}
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