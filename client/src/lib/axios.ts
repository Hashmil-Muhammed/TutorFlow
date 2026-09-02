import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Adjust in production
});

// Add a request interceptor to add the JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
