import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

console.log('API Base URL:', import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

// Add token to requests
api.interceptors.request.use((config) => {
  console.log('Making request:', config.method?.toUpperCase(), config.url);
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('Request failed:', error.message);
    console.error('Error details:', error.response || error);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
