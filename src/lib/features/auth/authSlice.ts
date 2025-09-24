// src/lib/features/auth/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define the Clinic interface that matches the data from the backend
interface Clinic {
  id: number;
  name: string;
  address: string;
  email: string;
  phone: string;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: {
    id: number;
    email: string;
    role: 'doctor' | 'clinic_admin' | 'patient' | null;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    profileSetupComplete: boolean;
    clinics?: Clinic[]; // CORRECTED: Now an array of Clinic objects
  } | null;
  token: string | null;
  error: string | null;
}

const initialState: AuthState = {
  isLoading: false,
  isAuthenticated: false,
  user: null,
  token: null,
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authRequest: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    authSuccess: (state, action: PayloadAction<{ user: AuthState['user']; token: string }>) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
      if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(action.payload.user));
          localStorage.setItem('token', action.payload.token);
      }
    },
    authFailure: (state, action: PayloadAction<string | null>) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = action.payload;
      if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
      }
    },
    logout: (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = null;
      if (typeof window !== 'undefined') {
          localStorage.clear();
      }
    },
  },
});

export const { authRequest, authSuccess, authFailure, logout } = authSlice.actions;

export default authSlice.reducer;