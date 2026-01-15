'use client';
import React, { useState, useEffect } from 'react';
import { Stethoscope, Plus, Trash2, AlertCircle, Save, Clock, User } from 'lucide-react';
// @ts-ignore
import api from '@/services/api';
import Button from '@/components/ui/Button';

export const DiagnosisTab = ({ appointment, user, clinicId }: any) => {
  const [list, setList] = useState<any[]>([]);
  const [comments, setComments] = useState('');
  const [permissions, setPermissions] = useState<{can_edit?: boolean}>({ can_edit: false });
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [savingComments, setSavingComments] = useState(false);

  const canEdit = permissions?.can_edit === true;

  useEffect(() => {
    if (appointment?.id && clinicId) {
        fetchData();
    }
  }, [appointment.id, clinicId]);

  const fetchData = async () => {
    try {
        const res = await api.get(`/diagnosis/appointment/${appointment.id}`, {
            params: { clinic_id: clinicId }
        });
        setList(res.data.list);
        setComments(res.data.comments || '');
        setPermissions(res.data.permissions);
    } catch(err) { 
        console.error("Failed to load diagnosis list", err); 
    }
  };

  const handleSearch = async (val: string) => {
    setSearch(val);
    if(val.length < 2) return setResults([]);
    try {
        const res = await api.get(`/diagnosis/catalog/search`, {
            params: { 
                query: val,
                clinic_id: clinicId
            }
        });
        setResults(res.data);
    } catch(err) { 
        console.error("Search failed", err); 
    }
  };

  const addDiagnosis = async (item: any) => {
    try {
        await api.post('/diagnosis/add', {
            appointment_id: appointment.id,
            diagnosis_catalog_id: item.id,
            description: item.name,
            code: item.snomed_code || item.icd_code,
            clinic_id: clinicId
        });
        setSearch('');
        setResults([]);
        fetchData();
    } catch(err) { alert("Failed to add diagnosis"); }
  };

  const removeDiagnosis = async (id: number) => {
    if(!confirm("Remove this diagnosis?")) return;
    try {
        await api.delete(`/diagnosis/${id}`, { 
            params: { clinic_id: clinicId }
        });
        fetchData();
    } catch(err) { alert("Failed to remove"); }
  };

  const saveComments = async () => {
    setSavingComments(true);
    try {
        await api.post('/diagnosis/comments', {
            appointment_id: appointment.id,
            comments,
            clinic_id: clinicId
        });
    } catch(err) { alert("Failed to save comments"); }
    finally { setSavingComments(false); }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* HEADER */}
      <div className="flex items-center gap-2 pb-4 border-b shrink-0">
        <Stethoscope className="w-5 h-5 text-var(--color-primary-brand)" />
        <h2 className="text-xl font-semibold text-gray-800">Diagnosis & Problems</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
          
          {/* CARD 1: DIAGNOSIS LIST */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden">
             <div className="p-4 bg-white border-b border-gray-200">
                 <h3 className="font-semibold text-gray-700 mb-3">Clinical Diagnosis</h3>
                 
                 {/* SEARCH BAR */}
                 {canEdit ? (
                     <div className="relative">
                         <input 
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-var(--color-primary-brand) outline-none"
                            placeholder="Search ICD-10 / SNOMED / Name..."
                            value={search}
                            onChange={e => handleSearch(e.target.value)}
                         />
                         {results.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-xl max-h-60 overflow-y-auto rounded-lg mt-1 z-50">
                                {results.map(d => (
                                    <div key={d.id} onClick={() => addDiagnosis(d)} className="p-3 hover:bg-var(--color-primary-brand) cursor-pointer border-b last:border-0">
                                        <div className="font-semibold text-sm text-gray-800">{d.name}</div>
                                        <div className="text-xs text-gray-500 flex gap-2 mt-1">
                                            {d.icd_code && <span className="bg-gray-100 px-2 py-0.5 rounded">ICD: {d.icd_code}</span>}
                                            {d.snomed_code && <span className="bg-var(--color-primary-brand) text-var(--color-primary-brand) px-2 py-0.5 rounded">SNOMED: {d.snomed_code}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                         )}
                     </div>
                 ) : (
                     <div className="text-xs text-gray-500 flex items-center gap-1 bg-gray-50 p-2 rounded-lg">
                        <AlertCircle className="w-3 h-3"/> View-only mode
                     </div>
                 )}
             </div>

             {/* ADDED LIST */}
             <div className="flex-1 overflow-y-auto p-0 bg-white">
                 {list.length === 0 ? (
                     <div className="p-10 text-center text-gray-400 text-sm">No diagnoses added.</div>
                 ) : (
                     <div className="divide-y divide-gray-100">
                         {list.map(item => (
                             <div key={item.id} className="p-4 hover:bg-gray-50 flex justify-between group transition-colors">
                                 <div>
                                     <p className="font-semibold text-gray-800 text-sm">{item.description}</p>
                                     <p className="text-xs text-var(--color-primary-brand) font-mono mt-0.5">{item.code || 'Uncoded'}</p>
                                     {/* AUDIT TRAIL */}
                                     <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                                        <span className="flex items-center gap-1"><User className="w-3 h-3"/> {item.added_by_name || 'System'}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(item.created_at).toLocaleTimeString()}</span>
                                     </div>
                                 </div>
                                 {canEdit && (
                                     <button onClick={() => removeDiagnosis(item.id)} className="text-gray-300 hover:text-red-500 self-center transition-colors">
                                         <Trash2 className="w-4 h-4"/>
                                     </button>
                                 )}
                             </div>
                         ))}
                     </div>
                 )}
             </div>
          </div>

          {/* CARD 2: COMMENTS / DIFFERENTIALS */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden">
              <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-700">Comments & Differentials</h3>
                  {canEdit && (
                      <Button 
                        shine
                        onClick={saveComments} 
                        disabled={savingComments}
                        className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                          <Save className="w-3 h-3"/> {savingComments ? 'Saving...' : 'Save Note'}
                      </Button>
                  )}
              </div>
              <textarea 
                  className="flex-1 w-full p-4 resize-none outline-none text-sm text-gray-700 focus:bg-blue-50/30 transition-colors bg-white"
                  placeholder={canEdit ? "Type clinical reasoning, differential diagnosis, or complex problem notes here..." : "No comments recorded."}
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  readOnly={!canEdit}
              />
              <div className="p-2 bg-gray-100 border-t text-[10px] text-gray-500 text-center">
                  Saved to Consultation Note
              </div>
          </div>

      </div>
    </div>
  );
};