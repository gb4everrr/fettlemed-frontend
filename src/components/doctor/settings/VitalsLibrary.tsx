// src/app/clinic-admin/dashboard/settings/components/VitalsLibrary.tsx
'use client';

import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Label } from '@radix-ui/react-label';
import { Edit, Trash2, List, Plus, Activity, RefreshCw } from 'lucide-react';

interface ClinicVitalConfig {
  id: number;
  clinic_id: number;
  vital_name: string;
  data_type: string;
  unit: string;
  is_active: boolean;
  is_required: boolean;
}

interface VitalsLibraryProps {
  clinicId: number;
}

export const VitalsLibrary: React.FC<VitalsLibraryProps> = ({ clinicId }) => {
  const [vitals, setVitals] = useState<ClinicVitalConfig[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Form State
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [formState, setFormState] = useState({
    vital_name: '',
    data_type: 'number',
    unit: '',
    is_required: false,
  });

  const fetchVitals = async () => {
    setIsFetching(true);
    try {
      const response = await api.get(`/clinic-vitals/library/all`, {
        params: { clinic_id: clinicId },
      });
      setVitals(response.data);
    } catch (err) {
      console.error('Failed to fetch vitals:', err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (clinicId) fetchVitals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const resetForm = () => {
    setFormState({ vital_name: '', data_type: 'number', unit: '', is_required: false });
    setIsEditing(null);
    setFormError(null);
  };

  const handleEdit = (vital: ClinicVitalConfig) => {
    setFormState({
      vital_name: vital.vital_name,
      data_type: vital.data_type,
      unit: vital.unit,
      is_required: vital.is_required,
    });
    setIsEditing(vital.id);
    setFormError(null);
  };

  const handleDelete = async (vitalId: number) => {
    if (!window.confirm('Delete this vital? This will remove it from all future assignments.')) return;
    try {
      await api.delete(`/clinic-vitals/library/delete/${vitalId}`, {
        params: { clinic_id: clinicId },
      });
      setVitals(prev => prev.filter(v => v.id !== vitalId));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete vital.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const payload = { ...formState, clinic_id: clinicId };

    try {
      if (isEditing) {
        await api.put(`/clinic-vitals/library/update/${isEditing}`, payload);
      } else {
        await api.post('/clinic-vitals/library/create', payload);
      }
      resetForm();
      fetchVitals();
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.error || 'Failed to save configuration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      
      {/* --- Column 1: Editor Form --- */}
      <div className="lg:col-span-1">
        <Card padding="lg" className="shadow-sm border border-gray-100 sticky top-6">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
             {isEditing ? <Edit className="h-5 w-5 text-blue-600"/> : <Plus className="h-5 w-5 text-primary"/>}
             <h3 className="font-bold text-gray-800">
               {isEditing ? 'Edit Vital Config' : 'Add to Library'}
             </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 text-red-700 text-xs rounded-md">
                {formError}
              </div>
            )}
            
            <Input
              id="vital_name"
              label="Vital Name"
              value={formState.vital_name}
              onChange={e => setFormState({...formState, vital_name: e.target.value})}
              required
            />

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1 block">Data Type</Label>
              <select
                value={formState.data_type}
                onChange={e => setFormState({...formState, data_type: e.target.value})}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
              >
                <option value="number">Number</option>
                <option value="text">Text</option>
                <option value="boolean">Yes/No</option>
              </select>
            </div>

            <Input
              id="unit"
              label="Unit (Optional)"
              value={formState.unit}
              onChange={e => setFormState({...formState, unit: e.target.value})}
            />

            <div className="flex items-center space-x-2 py-2">
              <input
                id="is_required"
                type="checkbox"
                checked={formState.is_required}
                onChange={e => setFormState({...formState, is_required: e.target.checked})}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="is_required" className="text-sm text-gray-700 cursor-pointer select-none">
                Required by Default
              </Label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                type="submit" 
                shine
                variant="primary" 
                className="flex-1" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update Vital' : 'Add Vital')}
              </Button>
              
              {isEditing && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={resetForm}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-500 border border-gray-100">
            <p className="font-semibold mb-1 text-gray-700">Note:</p>
            Adding vitals here makes them available for all doctors. You can assign specific subsets to doctors in the "Vitals Assignment" tab.
          </div>
        </Card>
      </div>

      {/* --- Column 2: List View --- */}
      <div className="lg:col-span-2">
        <Card className="shadow-sm border border-gray-100 h-full min-h-[500px] flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-2">
               <Activity className="h-5 w-5 text-primary" />
               <h3 className="font-bold text-gray-700">Library Items</h3>
            </div>
            <div className="flex items-center gap-3">
               <span className="text-xs font-medium px-2 py-1 bg-white border rounded text-gray-500">
                  {vitals.length} Total
               </span>
               <button onClick={fetchVitals} className="text-gray-400 hover:text-[var(--color-primary-brand)] transition-colors">
                  <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
               </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-20rem)]">
            {vitals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                 <List className="h-12 w-12 mb-3 opacity-20" />
                 <p>No vitals configured.</p>
                 <p className="text-sm">Use the form to create your first vital.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {vitals.map((v) => (
                  <li key={v.id} className="p-4 flex items-center justify-between hover:bg-gray-50 group transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-gray-25 to-gray-50 flex items-center justify-center text-secondary mr-4 shadow-inner">
                          {v.vital_name[0]}
                       </div>
                       <div>
                          <p className="font-semibold text-gray-900">
                             {v.vital_name}
                             {v.unit && <span className="text-gray-400 font-normal text-sm ml-1">({v.unit})</span>}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                             <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize border border-gray-200">
                                {v.data_type}
                             </span>
                             {v.is_required && (
                                <span className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100">
                                   Required
                                </span>
                             )}
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => handleEdit(v)}
                         className="text-blue-600 hover:bg-blue-50"
                       >
                          <Edit className="h-4 w-4" />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => handleDelete(v.id)}
                         className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                       >
                          <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};