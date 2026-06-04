import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api', // Points to your backend server
});

// This automatically attaches the token to every request if the user is logged in
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;