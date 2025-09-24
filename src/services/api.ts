// src/services/api.ts
import axios from 'axios';

// Base URL for your backend API
// ENSURE THIS IS CORRECT: It should point to the root of your API, usually ends with /api
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 1000000, // 10 seconds timeout
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
    
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      headers: config.headers,
      data: config.data
    });
    
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
    console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      data: response.data
    });
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
      
      // Handle forbidden errors
      if (status === 403) {
        console.log('API: 403 Forbidden - Access denied');
        return Promise.reject(new Error('Access denied'));
      }
      
      // Handle server errors with more context
      if (status >= 500) {
        console.error('API: Server Error', {
          status,
          url: error.config?.url,
          method: error.config?.method,
          requestData: error.config?.data,
          responseData: data
        });
        
        const errorMessage = data?.message || `Server error (${status}). Please try again.`;
        return Promise.reject(new Error(errorMessage));
      }
      
      // Handle client errors (4xx)
      if (status >= 400 && status < 500) {
        const errorMessage = data?.message || `Request failed (${status})`;
        return Promise.reject(new Error(errorMessage));
      }
    } else if (error.code === 'ECONNABORTED') {
      // Handle timeout
      const errorMessage = 'Request timeout. Please check your connection.';
      return Promise.reject(new Error(errorMessage));
    } else {
      // Handle network errors
      const errorMessage = 'Network error. Please check your connection.';
      return Promise.reject(new Error(errorMessage));
    }
    
    return Promise.reject(error);
  }
);

export default api;