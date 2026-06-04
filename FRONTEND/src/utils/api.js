import axios from 'axios';

// This tells React: "If we are live, use Render. If we are testing locally, use localhost."
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://college-placement-management-system-30p4.onrender.com/api',
});

// Attach token to requests
API.interceptors.request.use((req) => {
  if (localStorage.getItem('token')) {
    req.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
  }
  return req;
});

export default API;