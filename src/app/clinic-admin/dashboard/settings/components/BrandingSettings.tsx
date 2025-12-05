'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Label } from '@radix-ui/react-label';
import { Upload, Trash2, CheckCircle, AlertCircle, RefreshCw, Save } from 'lucide-react';
import { generatePalette } from '@/lib/utils/colorUtils';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { updateClinicSettings } from '@/lib/features/auth/authSlice';
import api from '@/services/api';

export const BrandingSettings = () => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const clinic = user?.clinics?.[0];
  const defaultColor = '#2D5367';

  // --- STATE ---
  // 1. Color State (Functional)
  const [brandColor, setBrandColor] = useState(clinic?.brandColor || defaultColor);
  
  // 2. Logo State (UI Only for now)
  const [logoPreview, setLogoPreview] = useState<string | null>(clinic?.logoUrl || '/images/Fettle Universe.png'); 
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Palette for Live Preview
  const [palette, setPalette] = useState(generatePalette(brandColor));

  // --- EFFECTS ---
  useEffect(() => {
    setPalette(generatePalette(brandColor));
  }, [brandColor]);

  // --- HANDLERS ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setLogoPreview(objectUrl);
      setLogoFile(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id) return;
    
    setIsSubmitting(true);
    setFeedback(null);

    try {
      // FIX: Added the third argument containing params
      await api.put(`/clinic/${clinic.id}`, 
        { brandColor: brandColor }, 
        { params: { clinic_id: clinic.id } } // <--- This was missing
      );

      // 2. Update Redux
      dispatch(updateClinicSettings({ 
        id: clinic.id, 
        brandColor: brandColor 
      }));

      // 3. Update Visuals Immediately
      const root = document.documentElement;
      Object.entries(palette).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });

      setFeedback({ type: 'success', message: 'Settings saved successfully!' });
    } catch (error: any) {
      console.error(error);
      setFeedback({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card padding="lg" className="shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Visual Identity</h2>
        <p className="text-sm text-gray-500 mb-6 border-b border-gray-100 pb-4">
          Customize how your clinic appears to patients and on generated documents.
        </p>

        {feedback && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {feedback.type === 'success' ? <CheckCircle className="h-5 w-5"/> : <AlertCircle className="h-5 w-5"/>}
            <p className="text-sm font-medium">{feedback.message}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* --- LOGO SECTION --- */}
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-shrink-0">
              <Label className="block text-sm font-medium text-gray-700 mb-2">Clinic Logo</Label>
              <div 
                className="h-40 w-40 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group transition-all hover:border-[var(--color-primary-brand)]"
                style={{ borderColor: logoPreview ? brandColor : undefined }}
              >
                {logoPreview ? (
                  <div className="relative w-full h-full p-4">
                    <Image 
                      src={logoPreview} 
                      alt="Logo Preview" 
                      fill 
                      className="object-contain"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="text-white text-xs font-medium">Change</span>
                    </div>
                  </div>
                ) : (
                   <div className="text-center p-4">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-xs text-gray-400">No logo</span>
                   </div>
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex-grow max-w-lg">
              <h3 className="font-semibold text-gray-900">Upload Logo</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                This logo will appear on your dashboard header and all printable documents.
                <br />
                <span className="text-xs text-gray-400">Recommended size: 500x500px. Max file size: 2MB. JPG or PNG.</span>
              </p>

              <div className="flex gap-3">
                <div className="relative">
                    <Button type="button" variant="secondary" size="md" className="flex items-center">
                        <Upload className="h-4 w-4 mr-2 flex" /><span>Upload New</span>
                    </Button>
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
                {logoPreview && (
                  <Button type="button" variant="outline" size="md" onClick={handleRemoveLogo} className="text-red-600 hover:text-red-700 flex">
                    <Trash2 className="h-4 w-4 mr-2" /> Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8"></div>

          {/* --- COLOR SECTION --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Input Side */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Primary Brand Color</Label>
              <div className="flex items-center gap-3">
                <div 
                    className="relative overflow-hidden h-12 w-12 rounded-lg shadow-sm ring-1 ring-gray-200"
                    style={{ backgroundColor: brandColor }}
                >
                  <input 
                    type="color" 
                    value={brandColor} 
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="absolute -top-2 -left-2 h-16 w-16 cursor-pointer border-0 p-0 opacity-0"
                  />
                </div>
                <div className="flex-1">
                  <Input 
                    id="brand_color"
                    value={brandColor} 
                    onChange={(e) => setBrandColor(e.target.value)} 
                    placeholder="#000000"
                    className="font-mono uppercase tracking-widest"
                  />
                </div>
                <button 
                    type="button" 
                    onClick={() => setBrandColor(defaultColor)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Reset to default"
                >
                    <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                We use this color to generate your secondary accents automatically.
              </p>
            </div>
            
            {/* Live Preview Side */}
            <div 
                className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm transition-all duration-300"
                style={palette as React.CSSProperties}
            >
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">System Preview</span>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Primary Button</span>
                        <button 
                            type="button"
                            className="px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm transition-transform active:scale-95"
                            style={{ backgroundColor: 'var(--color-primary-brand)' }}
                        >
                            Save Changes
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Accent Link</span>
                        <div className="flex items-center gap-2 px-3 py-1 rounded bg-gray-50">
                             <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-secondary-brand)' }}></div>
                             <span className="text-sm font-medium" style={{ color: 'var(--color-secondary-brand)' }}>
                                Dashboard
                             </span>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 flex justify-end">
            <Button 
                type="submit" 
                variant="primary" 
                size="md" 
                disabled={isSubmitting} 
                shine
                style={{ 
                    backgroundColor: brandColor, 
                    borderColor: brandColor 
                }}
            >
              {isSubmitting ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};