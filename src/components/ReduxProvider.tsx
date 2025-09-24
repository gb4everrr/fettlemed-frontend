// src/components/ReduxProvider.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import { makeStore } from '@/lib/store';
import authReducer from '@/lib/features/auth/authSlice';
import {
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';

// Configure persistence for the auth slice
const persistConfig = {
  key: 'authFettlemed', // A unique key for your persisted state in localStorage
  version: 1,
  storage,
  whitelist: ['auth'], // Only persist the 'auth' slice
};

const rootReducer = (state: any, action: any) => {
  return {
    auth: authReducer(state ? state.auth : undefined, action),
  };
};

const persistedAuthRootReducer = persistReducer(persistConfig, rootReducer);

// Global singletons for the client-side store and persistor
let storeSingleton: ReturnType<typeof makeStore> | undefined;
let persistorSingleton: ReturnType<typeof persistStore> | undefined;

function getClientStore() {
  if (!storeSingleton) {
    console.log('ReduxProvider: getClientStore - Creating new store singleton.');
    const store = makeStore();
    store.replaceReducer(persistedAuthRootReducer as any);
    storeSingleton = store;
    persistorSingleton = persistStore(storeSingleton); // Create persistor here as well
  }
  return storeSingleton;
}

function getClientPersistor() {
    if (!persistorSingleton) {
        getClientStore(); // This will ensure storeSingleton and persistorSingleton are initialized
    }
    return persistorSingleton!;
}


export default function ReduxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isStoreReady, setIsStoreReady] = useState(false);

  const store = getClientStore();
  const persistor = getClientPersistor();

  useEffect(() => {
    console.log('ReduxProvider: useEffect triggered. Store:', store ? 'initialized' : 'null', 'Persistor:', persistor ? 'initialized' : 'null');
    
    if (persistor) {
      // Subscribe to the persistor's state to detect rehydration completion
      const unsubscribe = persistor.subscribe(() => {
        const { _persist } = store.getState() as any;
        console.log('ReduxProvider: Persistor subscription callback. _persist.rehydrated:', _persist?.rehydrated);
        if (_persist && _persist.rehydrated) {
          setIsStoreReady(true);
          console.log('ReduxProvider: Store rehydrated successfully! setIsStoreReady(true).');
          unsubscribe(); // Unsubscribe after successful rehydration
        }
      });

      // Also check immediately if already rehydrated (e.g., on fast refresh in dev mode)
      const { _persist } = store.getState() as any;
      if (_persist && _persist.rehydrated) {
          setIsStoreReady(true);
          console.log('ReduxProvider: Store already rehydrated on mount. setIsStoreReady(true).');
          unsubscribe(); // Unsubscribe immediately if already rehydrated
      } else {
        console.log('ReduxProvider: Store not yet rehydrated on mount. Waiting for subscription...');
      }

      // Cleanup on component unmount
      return () => {
        console.log('ReduxProvider: useEffect cleanup. Unsubscribing from persistor.');
        unsubscribe();
      };
    } else {
      console.error('ReduxProvider: Persistor is null or undefined. Redux persistence might be failing.');
    }
  }, [store, persistor]); // Depend on store and persistor instances


  // Render a loading state until the Redux store is fully initialized and rehydrated
  if (!isStoreReady) {
    console.log('ReduxProvider: Rendering loading state because !isStoreReady.');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-700 text-lg font-inter">Loading application data...</p>
      </div>
    );
  }

  console.log('ReduxProvider: Rendering children because isStoreReady is true.');
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}