// src/components/AuthStatusProvider.tsx
/*'use client';

import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/hooks'; 
import { rehydrateAuth } from '@/lib/features/auth/authSlice';

export default function AuthStatusProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const selectPersist = (state: any) => state._persist; 
  const _persist = useAppSelector(selectPersist);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const [isReduxRehydrated, setIsReduxRehydrated] = useState(false);
  const [hasRehydratedManually, setHasRehydratedManually] = useState(false);

  useEffect(() => {
    console.log('AuthStatusProvider: useEffect triggered. _persist:', _persist);
    console.log('AuthStatusProvider: Current auth state:', { user, isAuthenticated });
    
    // Check if _persist exists and _persist.rehydrated is true
    if (_persist && _persist.rehydrated) {
      console.log('AuthStatusProvider: Redux-persist has rehydrated');
      
      // If redux-persist rehydrated but we don't have user data, try manual rehydration
      if (!isAuthenticated && !user && !hasRehydratedManually) {
        console.log('AuthStatusProvider: No user data after persist rehydration, attempting manual rehydration');
        dispatch(rehydrateAuth());
        setHasRehydratedManually(true);
      }
      
      setIsReduxRehydrated(true);
      console.log('AuthStatusProvider: Redux store is ready!');
    } else {
      console.log('AuthStatusProvider: Redux store not yet rehydrated (or _persist is missing/false).');
    }
  }, [_persist, isAuthenticated, user, hasRehydratedManually, dispatch]);

  // Additional effect to handle cases where redux-persist might not be configured
  useEffect(() => {
    // If no _persist is available after a short delay, try manual rehydration
    const fallbackTimer = setTimeout(() => {
      if (!_persist && !hasRehydratedManually && !isAuthenticated) {
        console.log('AuthStatusProvider: No redux-persist detected, attempting manual rehydration');
        dispatch(rehydrateAuth());
        setHasRehydratedManually(true);
        setIsReduxRehydrated(true);
      }
    }, 1000);

    return () => clearTimeout(fallbackTimer);
  }, [_persist, hasRehydratedManually, isAuthenticated, dispatch]);

  if (!isReduxRehydrated) {
    console.log('AuthStatusProvider: Rendering global loading screen while Redux rehydrates.');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-700 text-lg font-inter">Loading application data...</p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-gray-500">
              <p>Redux Persist: {_persist ? 'Available' : 'Not Available'}</p>
              <p>Rehydrated: {_persist?.rehydrated ? 'Yes' : 'No'}</p>
              <p>Manual Rehydration: {hasRehydratedManually ? 'Done' : 'Pending'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  console.log('AuthStatusProvider: Redux is rehydrated. Rendering children.');
  return <>{children}</>;
}*/