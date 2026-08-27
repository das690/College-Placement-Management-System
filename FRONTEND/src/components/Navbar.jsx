import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    // CHANGED: z-50 is now z-40 so modals can easily float above it!
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to={user ? "/dashboard" : "/"} className="text-2xl font-bold text-white tracking-tight">
              <span className="text-blue-500">Placement</span>Portal
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    Welcome, <span className="font-semibold text-white">{user.name}</span>
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    user.role === 'admin' 
                      ? 'bg-purple-950 text-purple-300 border-purple-800' 
                      : user.role === 'company' 
                      ? 'bg-blue-950 text-blue-300 border-blue-800' 
                      : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  }`}>
                    {user.role === 'admin' ? '👑 Admin' : user.role === 'company' ? '🏢 Company' : '🎓 Student'}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 text-sm font-medium text-red-400 hover:text-red-300 px-4 py-2 rounded-lg hover:bg-gray-800 border border-transparent hover:border-red-900/50 transition-all"
                >
                  <span>Sign Out</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Login
                </Link>
                <Link to="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all transform hover:-translate-y-0.5">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;