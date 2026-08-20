import { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { toast } from 'react-hot-toast';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // On initial load, check if we saved a user session in localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        // Fetch latest profile from DB to ensure sync
        API.get('/users/me')
          .then(res => {
            const freshUser = { ...res.data, token };
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
          })
          .catch(err => {
            console.error("Failed to fetch fresh user profile from server:", err);
          });
      } catch (e) {
        console.error("Invalid stored user json:", e);
      }
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const res = await API.post('/users/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));
      setUser(res.data);
      toast.success(`Welcome back, ${res.data.name}!`);
      navigate('/dashboard'); 
      return res.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(msg);
      throw error;
    }
  };

  // Register function
  const register = async (name, email, password, role, adminCode) => {
    try {
      const res = await API.post('/users/register', { name, email, password, role, adminCode });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));
      setUser(res.data);
      toast.success(`Account created successfully! Welcome, ${res.data.name}.`);
      navigate('/dashboard');
      return res.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(msg);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};