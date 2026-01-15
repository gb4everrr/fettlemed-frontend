'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Plus, Save, Loader2, AlertCircle, Clock } from 'lucide-react';
// @ts-ignore
import Button from '@/components/ui/Button';
// @ts-ignore
import Input from '@/components/ui/Input';
// @ts-ignore
import api from '@/services/api';

// Helper to group vitals by Entry ID (for history list)
const groupVitalsByEntry = (flatVitals: any[]) => {
    // This assumes flatVitals is a list of entries, each containing an array of values
    // Based on clinicVitalsController.getPatientVitals, it returns entries with nested values.
    return flatVitals; 
};

export const VitalsCard = ({ appointmentId, patientId, clinicId, doctorId, recorderId }: any) => {
  const [loading, setLoading] = useState(true);
  const [vitalsHistory, setVitalsHistory] = useState<any[]>([]); // All past entries
  const [assignedConfigs, setAssignedConfigs] = useState<any[]>([]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<number, string>>({});

  const fetchData = async () => {
    if (!clinicId || !patientId) return; 

    try {
      setLoading(true);
      const [historyRes, assignmentRes] = await Promise.all([
        // Fetch FULL history for this patient
        api.get(`/clinic-vitals/entry/history/${patientId}?clinic_id=${clinicId}`),
        // Fetch configs
        doctorId ? api.get(`/clinic-vitals/doctor-assignments/${doctorId}?clinic_id=${clinicId}`) : { data: [] }
      ]);

      setVitalsHistory(historyRes.data || []);

      const assignments = assignmentRes.data || [];
      const mappedConfigs = assignments
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((a: any) => ({
            ...a.vitalConfig,
            is_required: a.is_required
        }));
      
      setAssignedConfigs(mappedConfigs);
    } catch (err) {
      console.error("Failed to load vitals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [appointmentId, clinicId, patientId]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const formattedVitals = Object.entries(formValues)
        .filter(([_, value]) => value && value.trim() !== '')
        .map(([configId, value]) => ({
          config_id: parseInt(configId),
          vital_value: value
        }));

      if (formattedVitals.length === 0) {
        alert("Enter at least one value.");
        setSubmitting(false);
        return;
      }

      await api.post('/clinic-vitals/entry/submit', {
        clinic_id: clinicId,
        clinic_patient_id: patientId,
        appointment_id: appointmentId,
        recorded_by_admin_id: recorderId,
        vitals: formattedVitals
      });

      setIsAdding(false);
      setFormValues({});
      fetchData(); 
    } catch (err) {
      alert("Error saving vitals.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-xs text-gray-500">Loading vitals history...</div>;

  return (
    <div className="space-y-6">
      
      {/* 1. ADD NEW SECTION */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex justify-between items-center">
            <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Current Visit Vitals
            </h3>
            {!isAdding && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-700 bg-white hover:bg-blue-100" onClick={() => setIsAdding(true)}>
                <Plus className="w-3 h-3 mr-1" /> Add New
            </Button>
            )}
        </div>

        <div className="p-4">
            {isAdding ? (
            <div className="animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-3 mb-4">
                {assignedConfigs.map((config: any) => (
                    <div key={config.id}>
                    <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                        {config.vital_name} ({config.unit})
                    </label>
                    <Input 
                    id="value"
                        className="h-8 text-sm"
                        placeholder="Value"
                        value={formValues[config.id] || ''}
                        onChange={(e: any) => setFormValues(prev => ({...prev, [config.id]: e.target.value}))}
                    />
                    </div>
                ))}
                </div>
                <div className="flex gap-2">
                <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                </div>
            </div>
            ) : (
                <div className="text-center py-2 text-gray-400 text-xs italic">
                    Click "Add New" to record vitals for this session.
                </div>
            )}
        </div>
      </div>

      {/* 2. HISTORY LIST SECTION (Requested Feature) */}
      <div>
         <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Previously Recorded</h4>
         <div className="space-y-3">
            {vitalsHistory.length > 0 ? (
                vitalsHistory.map((entry: any) => (
                    <div key={entry.id} className="bg-gray-50 border rounded-lg p-3 text-sm">
                        <div className="flex justify-between items-center mb-2 border-b pb-2">
                             <div className="flex items-center gap-2 text-gray-600 font-medium">
                                <Clock className="w-3 h-3" />
                                {new Date(entry.entry_date).toLocaleDateString()} 
                                <span className="text-xs text-gray-400">{entry.entry_time}</span>
                             </div>
                             {entry.appointment_id === appointmentId && (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded font-bold">CURRENT</span>
                             )}
                        </div>
                        <div className="grid grid-cols-2 gap-y-1 gap-x-4">
                            {entry.values && entry.values.map((val: any) => (
                                <div key={val.id} className="flex justify-between">
                                    <span className="text-gray-500 text-xs">{val.config?.vital_name}:</span>
                                    <span className="font-semibold text-gray-800">{val.vital_value} <span className="text-[10px]">{val.config?.unit}</span></span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-gray-400 text-xs italic px-1">No previous records found.</div>
            )}
         </div>
      </div>
    </div>
  );
};