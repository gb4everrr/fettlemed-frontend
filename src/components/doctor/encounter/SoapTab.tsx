'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, ChevronRight, Lock, 
  Eye, EyeOff, History, Save, FileText
} from 'lucide-react';
// @ts-ignore
import Button from '@/components/ui/Button';
// @ts-ignore
import api from '@/services/api';

interface SoapTabProps {
  appointment: any;
  soapNotes: any;
  setSoapNotes: (val: any) => void;
  onSave: () => void;
  isSaving: boolean;
  user: any; 
  clinicId: number;
}

export const SoapTab = ({
  appointment,
  soapNotes,
  setSoapNotes,
  onSave,
  isSaving,
  user,
  clinicId
}: SoapTabProps) => {

  const canEdit = soapNotes?.permissions?.can_edit === true;
  const canViewPrivate = soapNotes?.permissions?.can_view_private === true;

  const [previousNotes, setPreviousNotes] = useState<any[]>([]);
  const [showPrevious, setShowPrevious] = useState(false);
  const [showPrivate, setShowPrivate] = useState(false); 
  const [historyModal, setHistoryModal] = useState<{show: boolean, field: string}>({ show: false, field: '' });
  const [historyData, setHistoryData] = useState<any[]>([]);

  useEffect(() => {
    const fetchPrevious = async () => {
       if(!appointment.clinic_patient_id || !appointment.clinic_doctor_id) return;
       try {
         const res = await api.get('/consultation-notes/context/previous', {
            params: {
                clinic_id: clinicId,
                patient_id: appointment.clinic_patient_id,
                doctor_id: appointment.clinic_doctor_id,
                current_appointment_id: appointment.id
            }
         });
         setPreviousNotes(res.data || []);
       } catch(err) { console.error("Prev notes error", err); }
    };
    fetchPrevious();
  }, [appointment.id]);

  const handleViewHistory = async (field: string) => {
      if(!soapNotes.id && !soapNotes.created_at) return alert("No history available yet.");
      
      try {
        const noteId = soapNotes.id || appointment.note_id;
        if(!noteId) return;

        const res = await api.get(`/consultation-notes/${noteId}/history`, { params: { clinic_id: clinicId } });
        setHistoryData(res.data);
        setHistoryModal({ show: true, field });
      } catch(err) { alert("Failed to load history or no changes found."); }
  };

  const formatClinicTime = (dateString: string | Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    }).format(date);
  };

  const toUTCDate = (d?: string | null) => {
    if (!d) return null;
    let s = d.trim();
    if (s.includes(" ") && !s.includes("T")) {
      s = s.replace(" ", "T");
    }
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const formatTime = (d: string) => {
    const dt = toUTCDate(d);
    return dt ? dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";
  };

  const formatDate = (d: string) => {
    const dt = toUTCDate(d);
    return dt ? dt.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "--";
  };

  return (
    <div className="space-y-6 pb-10 relative">
       
       {/* HISTORY MODAL OVERLAY */}
       {historyModal.show && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setHistoryModal({show:false, field:''})}>
               <div className="bg-white p-6 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-200" onClick={e => e.stopPropagation()}>
                   <div className="flex justify-between items-center mb-4 pb-3 border-b">
                       <h3 className="font-semibold text-lg flex items-center text-gray-800">
                           <History className="w-5 h-5 mr-2 text-var(--color-primary-brand)"/> Change History: <span className="text-var(--color-primary-brand) ml-1 capitalize">{historyModal.field}</span>
                       </h3>
                       <Button onClick={() => setHistoryModal({show:false, field:''})} shine variant="outline" className="text-gray-400 hover:text-gray-600">
                         X
                       </Button>
                   </div>
                   
                   <div className="space-y-4">
                       {historyData.length === 0 ? <p className="text-gray-400 text-center py-4">No changes recorded yet.</p> : 
                        historyData.map((h: any) => (
                           <div key={h.id} className="border-l-2 border-var(--color-primary-brand) pl-3 pb-2">
                               <div className="flex justify-between text-xs text-gray-500 mb-1">
                                   <span className="font-semibold">{formatDate(h.created_at)}</span>
                                   <span className="font-semibold">{formatTime(h.created_at)}</span>
                                   <span>{h.editor?.first_name} {h.editor?.last_name}</span>
                               </div>
                               <div className="text-sm bg-gray-50 p-3 rounded text-gray-700 whitespace-pre-wrap">
                                   {h[historyModal.field] ? h[historyModal.field] : <span className="text-gray-400">Empty</span>}
                               </div>
                           </div>
                       ))}
                   </div>
                   <div className="mt-4 text-right">
                       <Button size="sm" shine variant="outline" onClick={() => setHistoryModal({show:false, field:''})}>Close History</Button>
                   </div>
               </div>
           </div>
       )}

       {/* HEADER */}
       <div className="flex justify-between items-center pb-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
             <FileText className="w-5 h-5 text-var(--color-primary-brand)"/> Clinical Notes (SOAP)
          </h2>
          {canEdit && (
            <Button onClick={onSave} disabled={isSaving} shine className="bg-var(--color-primary-brand) hover:bg-var(--color-primary-brand) text-white flex">
                <Save className="w-4 h-4 mr-2"/> {isSaving ? 'Saving...' : 'Save Notes'}
            </Button>
          )}
       </div>

       {/* PREVIOUS SOAP NOTES */}
       <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
           <button 
             onClick={() => setShowPrevious(!showPrevious)}
             className="w-full flex items-center justify-between p-4 hover:bg-gray-100 transition-colors"
           >
               <span className="font-semibold text-gray-700 text-sm flex items-center">
                   {showPrevious ? <ChevronDown className="w-4 h-4 mr-2"/> : <ChevronRight className="w-4 h-4 mr-2"/>}
                   Previous SOAP Notes ({previousNotes.length})
               </span>
           </button>
           {showPrevious && (
               <div className="p-4 bg-white max-h-60 overflow-y-auto space-y-4 border-t border-gray-200">
                   {previousNotes.length === 0 ? <p className="text-sm text-gray-500 text-center">No previous notes with this doctor.</p> :
                    previousNotes.map((note: any) => (
                       <div key={note.id} className="bg-gray-50 rounded-lg p-4 text-sm hover:bg-gray-100 transition-colors">
                           <p className="font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-200 flex justify-between">
                               <span>{new Date(note.appointment.datetime_start).toLocaleDateString()}</span>
                               <span className="text-xs font-normal text-gray-500">ID: {note.id}</span>
                           </p>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                               <div className="bg-white p-3 rounded border border-gray-200">
                                 <span className="font-semibold text-xs text-var(--color-primary-brand) block mb-1">Subjective</span>
                                 <p className="text-gray-700">{note.subjective}</p>
                               </div>
                               <div className="bg-white p-3 rounded border border-gray-200">
                                 <span className="font-semibold text-xs text-var(--color-primary-brand) block mb-1">Objective</span>
                                 <p className="text-gray-700">{note.objective}</p>
                               </div>
                           </div>
                       </div>
                    ))}
               </div>
           )}
       </div>

       {/* SUBJECTIVE */}
       <div className="space-y-2">
           <div className="flex justify-between items-end">
               <label className="text-sm font-semibold text-gray-700">Subjective (Symptoms & History)</label>
               <button onClick={() => handleViewHistory('subjective')} className="text-xs text-var(--color-primary-brand) hover:underline flex items-center bg-blue-50 px-3 py-1 rounded-md">
                   <History className="w-3 h-3 mr-1"/> View Changes
               </button>
           </div>
           <textarea 
               className={`w-full p-4 rounded-lg border h-32 text-sm focus:ring-2 focus:ring-blue-500 transition-all ${!canEdit ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-300'}`}
               placeholder={canEdit ? "Enter patient's complaints, history, and symptoms..." : "Read-only mode."}
               value={soapNotes.subjective}
               onChange={(e) => canEdit && setSoapNotes({...soapNotes, subjective: e.target.value})}
               disabled={!canEdit}
           />
       </div>

       {/* OBJECTIVE */}
       <div className="space-y-2">
           <div className="flex justify-between items-end">
               <label className="text-sm font-semibold text-gray-700">Objective (Examination Findings)</label>
               <button onClick={() => handleViewHistory('objective')} className="text-xs text-var(--color-primary-brand) hover:underline flex items-center bg-blue-50 px-3 py-1 rounded-md">
                   <History className="w-3 h-3 mr-1"/> View Changes
               </button>
           </div>
           <textarea 
               className={`w-full p-4 rounded-lg border h-32 text-sm focus:ring-2 focus:ring-blue-500 transition-all ${!canEdit ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-300'}`}
               placeholder={canEdit ? "Enter physical exam findings, vitals interpretation, lab results..." : "Read-only mode."}
               value={soapNotes.objective}
               onChange={(e) => canEdit && setSoapNotes({...soapNotes, objective: e.target.value})}
               disabled={!canEdit}
           />
       </div>

       {/* PRIVATE OBSERVATIONS */}
       {canViewPrivate && (
           <div className={`p-4 rounded-xl border transition-all ${showPrivate ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
               <div className="flex justify-between items-center mb-3">
                   <div className="flex items-center gap-2">
                       <Lock className={`w-4 h-4 ${showPrivate ? 'text-yellow-600' : 'text-gray-400'}`}/>
                       <label className={`text-sm font-semibold ${showPrivate ? 'text-yellow-800' : 'text-gray-600'}`}>
                           Observations (Doctor's View Only)
                       </label>
                   </div>
                   
                   <button 
                     onClick={() => setShowPrivate(!showPrivate)}
                     className={`text-xs font-semibold flex items-center px-3 py-1.5 rounded-full transition-colors ${
                         showPrivate 
                         ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300' 
                         : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                     }`}
                   >
                       {showPrivate ? <><EyeOff className="w-3 h-3 mr-1"/> Hide Notes</> : <><Eye className="w-3 h-3 mr-1"/> Show Notes</>}
                   </button>
               </div>

               {showPrivate && (
                   <div>
                       <div className="flex justify-end mb-2">
                            <button onClick={() => handleViewHistory('observations_private')} className="text-xs text-yellow-600 hover:underline flex items-center">
                               <History className="w-3 h-3 mr-1"/> View Changes
                           </button>
                       </div>
                       <textarea 
                           className="w-full p-4 rounded-lg border border-yellow-300 bg-white h-24 text-sm focus:ring-2 focus:ring-yellow-500"
                           placeholder="Private personal notes... (Only visible to you)"
                           value={soapNotes.observations_private}
                           onChange={(e) => setSoapNotes({...soapNotes, observations_private: e.target.value})}
                       />
                       <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                           <Lock className="w-3 h-3"/> These notes are strictly private and not visible to other staff.
                       </p>
                   </div>
               )}
           </div>
       )}
    </div>
  );
};