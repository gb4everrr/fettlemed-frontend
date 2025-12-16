// src/lib/features/auth/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define the Clinic interface that matches the data from the backend
interface Clinic {
  id: number;
  name: string;
  address: string;
  email: string;
  phone: string;
  timezone: string;
  brandColor: string;
  logoUrl: string;
  role: string;          // <--- NEW: The user's role in this specific clinic
  permissions: string[]; // <--- NEW: The calculated permissions list
  parent_clinic_id?: number | null;
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
    clinics?: Clinic[];
  } | null;
  token: string | null;
  error: string | null;
  
  // NEW STATE FIELDS FOR RBAC
  activeClinicId: number | null;
  activePermissions: string[];
}

const initialState: AuthState = {
  isLoading: false,
  isAuthenticated: false,
  user: null,
  token: null,
  error: null,
  activeClinicId: null,
  activePermissions: [],
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

      // --- NEW: AUTO-SELECT CLINIC CONTEXT ---
      // If the user belongs to clinics, automatically select the first one as active
      if (state.user?.clinics && state.user.clinics.length > 0) {
        const defaultClinic = state.user.clinics[0];
        state.activeClinicId = defaultClinic.id;
        state.activePermissions = defaultClinic.permissions || [];
      } else {
        state.activeClinicId = null;
        state.activePermissions = [];
      }
      // ---------------------------------------

      if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(action.payload.user));
          localStorage.setItem('token', action.payload.token);
      }
    },
    setActivePermissions: (state, action: PayloadAction<string[]>) => {
            state.activePermissions = action.payload;
        },
    authFailure: (state, action: PayloadAction<string | null>) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = action.payload;
      
      // Clear permissions on failure
      state.activeClinicId = null;
      state.activePermissions = [];

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
      
      // Clear permissions on logout
      state.activeClinicId = null;
      state.activePermissions = [];

      if (typeof window !== 'undefined') {
          localStorage.clear();
      }
    },
    
    // --- NEW: ACTION TO SWITCH CLINIC CONTEXT ---
    switchClinic: (state, action: PayloadAction<number>) => {
      const clinicId = action.payload;
      state.activeClinicId = clinicId;

      // Find the clinic in the user's list to retrieve its specific permissions
      const clinic = state.user?.clinics?.find((c) => c.id === clinicId);
      
      if (clinic) {
        state.activePermissions = clinic.permissions || [];
      } else {
        state.activePermissions = []; // Safety fallback
      }
    },
    // --------------------------------------------

    updateClinicSettings: (state, action) => {
      if (state.user && state.user.clinics) {
        // Find the specific clinic in the user's list and update it
        const index = state.user.clinics.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          // Merge the new settings (like brandColor) into the existing clinic data
          state.user.clinics[index] = { 
            ...state.user.clinics[index], 
            ...action.payload 
          };
        }
      }
    },
  },
});

export const { 
  authRequest, 
  authSuccess, 
  authFailure, 
  logout, 
  updateClinicSettings,
  switchClinic,
  setActivePermissions // Export the new action
} = authSlice.actions;

export default authSlice.reducer;