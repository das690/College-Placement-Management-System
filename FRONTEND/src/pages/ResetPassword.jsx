import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../utils/api';

const ResetPassword = () => {
  // Grab the token right out of the URL!
  const { token } = useParams(); 
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);

    try {
      // Send the new password and the token to the backend
      const res = await API.put(`/users/reset-password/${token}`, { password });
      setMessage(res.data.message || 'Password reset successful!');
      
      // Send them back to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. The token might be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center bg-[url('/4.jpg')] bg-cover bg-center bg-no-repeat relative">
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 w-full max-w-md p-10 bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl">
        
        <div className="text-center mb-8 mt-4">
          <h2 className="text-3xl font-bold text-white mb-2 tracking-wide">New Password</h2>
          <p className="text-gray-200 text-sm">Enter your new secure password below</p>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-400/50 rounded-xl text-green-200 text-sm text-center">
            {message} <br /> Redirecting to login...
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">New Password</label>
            <input 
              type="password" 
              required
              minLength="6"
              className="w-full px-4 py-3 bg-white/20 border border-white/10 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/30 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Confirm New Password</label>
            <input 
              type="password" 
              required
              minLength="6"
              className="w-full px-4 py-3 bg-white/20 border border-white/10 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/30 transition-all"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !!message}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] flex justify-center"
          >
            {loading ? 'Saving...' : 'Save New Password'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-300">
          <Link to="/login" className="text-blue-300 hover:text-white font-medium">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;