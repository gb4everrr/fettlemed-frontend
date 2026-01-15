'use client';
import React, { useState, useEffect } from 'react';
import { Pill, Search, Plus, Trash2, Clock, AlertCircle } from 'lucide-react';
// @ts-ignore
import api from '@/services/api';
import Button from '@/components/ui/Button';

export const MedsTab = ({ appointment, user, clinicId }: any) => {
  const [meds, setMeds] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<{can_edit?: boolean}>({ can_edit: false });
  
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const [form, setForm] = useState({ 
    drug_catalog_id: null, 
    drug_name: '', 
    dose: '', 
    frequency: '', 
    duration: '', 
    instructions: '' 
  });

  const canEdit = permissions?.can_edit === true;

  useEffect(() => {
    if (appointment?.id && clinicId) {
        fetchMeds();
    }
  }, [appointment.id, clinicId]);

  const fetchMeds = async () => {
    try {
        const res = await api.get(`/prescriptions/appointment/${appointment.id}`, {
            params: { clinic_id: clinicId }
        });
        setMeds(res.data.meds || []);
        if (res.data.permissions) {
            setPermissions(res.data.permissions);
        }
    } catch (err) {
        console.error("Failed to load meds", err);
    }
  };

  const handleSearch = async (val: string) => {
    setSearch(val);
    setForm({ ...form, drug_name: val }); 
    if(val.length < 2) return setSearchResults([]);
    
    try {
        const res = await api.get(`/prescriptions/catalog/search`, {
            params: { 
                query: val,
                clinic_id: clinicId
            }
        });
        setSearchResults(res.data);
    } catch (err) {
        console.error("Search failed", err);
    }
  };

  const selectDrug = (drug: any) => {
    setForm({
      ...form,
      drug_catalog_id: drug.id,
      drug_name: drug.name,
      dose: drug.strength || '',
      instructions: drug.form || ''
    });
    setSearch(drug.name);
    setSearchResults([]);
  };

  const addMed = async () => {
    if(!form.drug_name) return;
    try {
        await api.post('/prescriptions/add', { 
            ...form, 
            appointment_id: appointment.id,
            clinic_id: clinicId 
        });
        
        setForm({ drug_catalog_id: null, drug_name: '', dose: '', frequency: '', duration: '', instructions: '' });
        setSearch('');
        fetchMeds();
    } catch (err) {
        console.error(err);
        alert("Failed to add medication");
    }
  };

  const deleteMed = async (id: number) => {
    if(!confirm("Remove this medicine?")) return;
    try {
        await api.delete(`/prescriptions/${id}`, {
            params: { clinic_id: clinicId }
        });
        fetchMeds();
    } catch (err) {
        alert("Failed to delete");
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-2 pb-4 border-b shrink-0">
        <Pill className="w-5 h-5 text-var(--color-primary-brand)" />
        <h2 className="text-xl font-semibold text-gray-800">Prescription</h2>
      </div>

      {/* ADD FORM */}
      {canEdit ? (
        <div className=" p-5 rounded-xl border border-emerald-100 relative z-20 shrink-0">
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-4 relative">
              <label className="text-xs font-semibold text-emerald-800 mb-1 block">Drug Name</label>
              <input 
                className="w-full p-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-200 outline-none" 
                placeholder="Search brand or generic..." 
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 w-[150%] bg-white border border-gray-200 shadow-xl max-h-60 overflow-y-auto rounded-lg mt-1 z-50">
                  {searchResults.map(d => (
                    <div key={d.id} onClick={() => selectDrug(d)} className="p-3 hover:bg-emerald-50 cursor-pointer border-b last:border-0">
                      <div className="font-semibold text-sm text-gray-800">{d.name}</div>
                      <div className="text-xs text-gray-500">{d.generic_name} • {d.strength}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-2">
               <label className="text-xs font-semibold text-emerald-800 mb-1 block">Dose</label>
               <input className="w-full p-3 rounded-lg border border-gray-300 text-sm focus:ring-emerald-200 focus:ring-2 outline-none" placeholder="500mg" value={form.dose} onChange={e=>setForm({...form, dose:e.target.value})} />
            </div>
            <div className="col-span-2">
               <label className="text-xs font-semibold text-emerald-800 mb-1 block">Freq</label>
               <input className="w-full p-3 rounded-lg border border-gray-300 text-sm focus:ring-emerald-200 focus:ring-2 outline-none" placeholder="1-0-1" value={form.frequency} onChange={e=>setForm({...form, frequency:e.target.value})} />
            </div>
            <div className="col-span-2">
               <label className="text-xs font-semibold text-emerald-800 mb-1 block">Duration</label>
               <input className="w-full p-3 rounded-lg border border-gray-300 text-sm focus:ring-emerald-200 focus:ring-2 outline-none" placeholder="5 Days" value={form.duration} onChange={e=>setForm({...form, duration:e.target.value})} />
            </div>
            <div className="col-span-2">
               <Button shine onClick={addMed} className="w-full bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700 font-semibold text-sm flex justify-center items-center gap-1 shadow-sm transition-colors">
                 <Plus className="w-4 h-4"/> ADD
               </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-500 flex items-center gap-2 border border-gray-200">
           <AlertCircle className="w-4 h-4" /> View-only: Only the assigned doctor can prescribe medications.
        </div>
      )}

      {/* MEDICATION LIST */}
      <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 bg-white border-b border-gray-200 font-semibold text-gray-700 text-sm flex justify-between items-center">
           <span>Medication List</span>
           <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">{meds.length}</span>
        </div>
        <div className="overflow-y-auto flex-1 p-0 bg-white">
          {meds.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Pill className="w-8 h-8 mb-2 opacity-20"/>
                <p className="text-sm">No medications added.</p>
             </div>
          ) : (
             <table className="w-full text-left text-sm">
               <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                 <tr>
                   <th className="p-3 pl-4 font-semibold">Drug Name</th>
                   <th className="p-3 font-semibold">Dose</th>
                   <th className="p-3 font-semibold">Frequency</th>
                   <th className="p-3 font-semibold">Duration</th>
                   <th className="p-3 text-right font-semibold">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {meds.map(m => (
                   <tr key={m.id} className="hover:bg-gray-50 group transition-colors">
                     <td className="p-3 pl-4 font-semibold text-gray-800">
                        {m.drug_name}
                        {m.instructions && <div className="text-xs text-gray-500 font-normal mt-0.5">{m.instructions}</div>}
                     </td>
                     <td className="p-3 text-gray-600">{m.dose}</td>
                     <td className="p-3">
                        <span className="px-2 py-1 bg-blue-50 text-var(--color-primary-brand) rounded text-xs font-semibold border border-blue-100">
                            {m.frequency}
                        </span>
                     </td>
                     <td className="p-3 text-gray-600">{m.duration}</td>
                     <td className="p-3 text-right">
                        {canEdit && (
                          <button 
                            onClick={() => deleteMed(m.id)} 
                            className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors"
                            title="Remove Medication"
                          >
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          )}
        </div>
      </div>
    </div>
  );
};