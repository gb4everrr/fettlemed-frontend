// src/services/api.ts
import axios from 'axios';

// Base URL for backend API
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001';

const API_BASE_URL = `${API_URL}/api`;
console.log("AXIOS IS CONFIGURED WITH BASE URL:", API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 1000000, // 1000 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    const { response } = error;
    
    if (response) {
      const { status, data } = response;
      
      // Handle authentication errors
      if (status === 401) {
        console.log('API: 401 Unauthorized - Logging out user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Only redirect if we're not already on the login page
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
          window.location.href = '/auth/login';
        }
        return Promise.reject(new Error('Unauthorized - Please log in again'));
      }
      
      // --- UPDATED: Handle 403 Forbidden (Permission Denied) ---
      if (status === 403) {
        console.log('API: 403 Forbidden - Access denied');
        
        const msg = data?.error || "You don't have permission to perform this action.";
        
        // Since you are not using hot-toast, we log it.
        // You can replace this with your own alert/notification logic.
        console.error("PERMISSION DENIED:", msg);
        
        // We reject the promise so the UI can still handle loading states
        return Promise.reject(new Error(msg));
      }
      // ---------------------------------------------------------
      
      // Handle server errors
      if (status >= 500) {
        const errorMessage = data?.message || data?.error || `Server error (${status}). Please try again.`;
        return Promise.reject(new Error(errorMessage));
      }
      
      // Handle client errors (4xx)
      if (status >= 400 && status < 500) {
        const errorMessage = data?.message || data?.error || `Request failed (${status})`;
        return Promise.reject(new Error(errorMessage));
      }
    } else if (error.code === 'ECONNABORTED') {
      const errorMessage = 'Request timeout. Please check your connection.';
      return Promise.reject(new Error(errorMessage));
    } else {
      const errorMessage = 'Network error. Please check your connection.';
      return Promise.reject(new Error(errorMessage));
    }
    
    return Promise.reject(error);
  }
);

export default api;