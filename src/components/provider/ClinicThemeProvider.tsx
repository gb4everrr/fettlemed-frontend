'use client';

import React, { useEffect } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { generatePalette } from '@/lib/utils/colorUtils'; // Ensure you created this helper file from the previous step

export default function ClinicThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAppSelector((state) => state.auth);
  
  const savedColor = user?.clinics?.[0]?.brandColor || '#2D5367';

  useEffect(() => {
    // 2. Generate the palette (Light, Dark, Hover shades)
    const palette = generatePalette(savedColor);
    const root = document.documentElement;

    // 3. Inject CSS variables into the HTML root
    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [savedColor]); // Re-run if the user's color changes

  return <>{children}</>;
}