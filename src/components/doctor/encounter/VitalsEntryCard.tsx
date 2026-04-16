'use client';

import React from 'react';
import { Activity, Save, Loader2, Ban } from 'lucide-react';
// @ts-ignore
import Button from '@/components/ui/Button';
// @ts-ignore
import Input from '@/components/ui/Input';
// @ts-ignore
import Card from '@/components/ui/Card';

interface VitalsEntryCardProps {
  doctorVitals: any[];
  vitalsValues: { [key: string]: string };
  setVitalsValues: (values: any) => void;
  onSave: () => void;
  isSaving: boolean;
  isLoading: boolean;
  /** When true all inputs and the save button are disabled */
  isCancelled?: boolean;
}

export const VitalsEntryCard = ({
  doctorVitals,
  vitalsValues,
  setVitalsValues,
  onSave,
  isSaving,
  isLoading,
  isCancelled = false,
}: VitalsEntryCardProps) => {

  const handleChange = (vitalName: string, val: string) => {
    if (isCancelled) return;
    setVitalsValues({ ...vitalsValues, [vitalName]: val });
  };

  return (
    <Card className="shadow-sm border border-gray-200 h-full">
      <div className="p-5">
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <Activity className="w-4 h-4 mr-2 text-var(--color-primary-brand)" /> Record Vitals
          </h2>
          {isCancelled && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
              <Ban className="w-3 h-3" /> Read-only
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="text-center text-sm text-gray-400 py-4 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading configurations...
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {doctorVitals.map((v) => (
              <div key={v.id} className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">
                  {v.vitalConfig.vital_name} ({v.vitalConfig.unit})
                </label>
                <Input
                  id="vitals"
                  className={`h-9 w-full ${isCancelled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  value={vitalsValues[v.vitalConfig.vital_name] || ''}
                  onChange={(e: any) => handleChange(v.vitalConfig.vital_name, e.target.value)}
                  placeholder="--"
                  disabled={isCancelled}
                />
              </div>
            ))}
            
            <div className="flex items-center">
              <Button 
                size="sm" 
                shine
                onClick={onSave} 
                disabled={isSaving || isCancelled} 
                className={`w-full h-9 ${isCancelled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                title={isCancelled ? 'Cannot save vitals for a cancelled appointment' : undefined}
              >
                {isSaving ? 'Saving...' : 'Save Vitals'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};