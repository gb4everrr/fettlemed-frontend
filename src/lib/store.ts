// src/lib/store.ts
import { configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import authReducer from '@/lib/features/auth/authSlice'; 
import uiReducer from '@/lib/features/ui/uiSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer, 
      ui: uiReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];