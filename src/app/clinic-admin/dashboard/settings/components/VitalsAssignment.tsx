// src/app/clinic-admin/dashboard/settings/components/VitalsAssignment.tsx
'use client';

import React, { useState, useEffect, useMemo, DragEvent } from 'react';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  Search, List, Grid, ArrowRight, MoveVertical, 
  X, Save, Layers, ChevronDown, ChevronUp, 
  AlertCircle, CheckCircle, Info 
} from 'lucide-react';

// --- Types ---
interface ClinicDoctor {
  id: number;
  first_name: string;
  last_name: string;
  specialization: string;
  email: string;
}

interface ClinicVitalConfig {
  id: number;
  vital_name: string;
  unit: string;
  is_required: boolean;
}

interface DoctorVitalAssignment {
  vital_config_id: number;
  is_required: boolean;
  vitalConfig: ClinicVitalConfig;
  sort_order: number;
}

interface TemplateMember {
    vital_config_id: number;
    is_required: boolean;
    vitalConfig: ClinicVitalConfig;
}

interface VitalTemplate {
    id: number;
    template_name: string;
    members: TemplateMember[];
}

export const VitalsAssignment = ({ clinicId }: { clinicId: number }) => {
  // View State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [searchQuery, setSearchQuery] = useState('');

  // UI State for Assignment View
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(true);
  const [isVitalsOpen, setIsVitalsOpen] = useState(true);
  
  // Search States
  const [templateSearch, setTemplateSearch] = useState('');
  const [vitalSearch, setVitalSearch] = useState('');

  // Data State
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<ClinicDoctor | null>(null);
  
  // Assignment Data
  const [library, setLibrary] = useState<ClinicVitalConfig[]>([]);
  const [templates, setTemplates] = useState<VitalTemplate[]>([]);
  const [assigned, setAssigned] = useState<DoctorVitalAssignment[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // --- 1. Fetch Doctors & Templates ---
  useEffect(() => {
    if (clinicId) {
      api.get(`/clinic-user/clinic-doctor`, { params: { clinic_id: clinicId } })
         .then(res => setDoctors(res.data))
         .catch(console.error);

      api.get('/clinic-vitals/templates/all', { params: { clinic_id: clinicId } })
         .then(res => setTemplates(res.data))
         .catch(console.error);
    }
  }, [clinicId]);

  // --- 2. Filter & Paginate Doctors ---
  const filteredDoctors = useMemo(() => {
    return doctors.filter(doc => 
      doc.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [doctors, searchQuery]);

  const paginatedDoctors = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDoctors.slice(start, start + itemsPerPage);
  }, [filteredDoctors, currentPage]);

  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);

  // --- Filtered Library & Templates ---
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => t.template_name.toLowerCase().includes(templateSearch.toLowerCase()));
  }, [templates, templateSearch]);

  const filteredLibrary = useMemo(() => {
    return library.filter(v => v.vital_name.toLowerCase().includes(vitalSearch.toLowerCase()));
  }, [library, vitalSearch]);


  // --- 3. Fetch Assignments (When Doctor Selected) ---
  useEffect(() => {
    if (selectedDoctor) {
      // Reset alerts
      setSuccessMessage(null);
      setErrorMessage(null);

      api.get('/clinic-vitals/assignment-manager', { params: { clinic_id: clinicId, clinic_doctor_id: selectedDoctor.id } })
        .then(res => {
           const all = res.data;
           const newAssigned: DoctorVitalAssignment[] = [];
           const newLibrary: ClinicVitalConfig[] = [];
           all.forEach((v: any) => {
              if (v.assignments?.length) {
                newAssigned.push({ 
                    vital_config_id: v.id, 
                    is_required: v.assignments[0].is_required, 
                    vitalConfig: v, 
                    sort_order: v.assignments[0].sort_order 
                });
              } else {
                newLibrary.push(v);
              }
           });
           setAssigned(newAssigned.sort((a,b) => a.sort_order - b.sort_order));
           setLibrary(newLibrary);
        });
    }
  }, [selectedDoctor, clinicId]);

  // --- 4. Logic: Drag & Drop ---
  
  // type: 'vital' | 'template'
  const handleDragStart = (e: DragEvent, id: number, type: 'vital' | 'template') => {
    e.dataTransfer.setData("id", id.toString());
    e.dataTransfer.setData("type", type);
  };
  
  const handleDropAssigned = (e: DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-50/50');
    
    const id = parseInt(e.dataTransfer.getData("id"));
    const type = e.dataTransfer.getData("type");

    let newAssigned = [...assigned];
    let newLibrary = [...library];
    let hasChanged = false;

    if (type === 'template') {
        const template = templates.find(t => t.id === id);
        if (template) {
            template.members.forEach(m => {
                // Check if already assigned
                if (!newAssigned.find(a => a.vital_config_id === m.vital_config_id)) {
                    // Add to assigned
                    newAssigned.push({
                        vital_config_id: m.vital_config_id,
                        is_required: m.is_required,
                        sort_order: newAssigned.length,
                        vitalConfig: m.vitalConfig
                    });
                    // Remove from library
                    newLibrary = newLibrary.filter(l => l.id !== m.vital_config_id);
                    hasChanged = true;
                }
            });
        }
    } else {
        // Individual Vital Drop
        const vital = library.find(v => v.id === id);
        if (vital) {
            newAssigned.push({ 
                vital_config_id: vital.id, 
                is_required: vital.is_required, 
                vitalConfig: vital, 
                sort_order: newAssigned.length 
            });
            newLibrary = newLibrary.filter(v => v.id !== id);
            hasChanged = true;
        }
    }

    if (hasChanged) {
        setAssigned(newAssigned);
        setLibrary(newLibrary);
    }
  };
  
  const handleDropLibrary = (e: DragEvent) => {
    // Only accepts vitals being dragged BACK to library
    const type = e.dataTransfer.getData("type");
    if (type !== 'vital') return;

    const id = parseInt(e.dataTransfer.getData("id"));
    const vital = assigned.find(v => v.vital_config_id === id);
    if (vital) {
       setLibrary([...library, vital.vitalConfig]);
       setAssigned(assigned.filter(v => v.vital_config_id !== id));
    }
  };

  const save = async () => {
    if (!selectedDoctor) return;
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await api.post('/clinic-vitals/doctor-assignments/assign', {
        clinic_id: clinicId,
        clinic_doctor_id: selectedDoctor.id,
        vital_assignments: assigned.map((v, i) => ({ vital_config_id: v.vital_config_id, is_required: v.is_required, sort_order: i }))
      });
      setSuccessMessage('Configurations saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) { 
        console.error(e);
        setErrorMessage(e.response?.data?.error || 'Failed to save configuration');
    } finally { 
        setIsSaving(false); 
    }
  };

  // --- VIEW: Doctor List (Unchanged) ---
  if (!selectedDoctor) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h2 className="text-xl font-bold text-gray-800">Doctor Vitals</h2>
              <p className="text-sm text-gray-500">Select a doctor to configure their specific vital collection requirements.</p>
           </div>
           
           <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                 <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}><List className="h-4 w-4"/></button>
                 <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}><Grid className="h-4 w-4"/></button>
              </div>
           </div>
        </div>

        <div className="relative">
          <Input 
            id="search"
             placeholder="Search by name or specialization..." 
             icon={<Search className="h-4 w-4"/>} 
             value={searchQuery}
             onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>

        {/* --- Grid View --- */}
        {viewMode === 'grid' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedDoctors.map(doc => (
                 <Card key={doc.id} padding="md" className="hover:border-[var(--color-primary-brand)]  cursor-pointer transition-all hover:shadow-md" onClick={() => setSelectedDoctor(doc)}>
                    <div className="flex items-start justify-between">
                       <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-gray-25 to-gray-50 flex items-center justify-center text-secondary mr-4 shadow-inner">
                             {doc.first_name[0]}
                          </div>
                          <div>
                             <h3 className="font-bold text-gray-800">Dr. {doc.first_name} {doc.last_name}</h3>
                             <p className="text-xs text-gray-500">{doc.specialization}</p>
                          </div>
                       </div>
                       <ArrowRight className="h-5 w-5 text-gray-300" />
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                       <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {doc.email}
                       </span>
                       <span className="text-xs text-secondary font-medium">Configure</span>
                    </div>
                 </Card>
              ))}
           </div>
        )}

        {/* --- List View --- */}
        {viewMode === 'list' && (
           <Card className="overflow-hidden">
              <table className="w-full text-sm text-left">
                 <thead className=" text-gray-500 font-medium border-b">
                    <tr>
                       <th className="px-6 py-3">Doctor</th>
                       <th className="px-6 py-3">Specialization</th>
                       <th className="px-6 py-3">Email</th>
                       <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {paginatedDoctors.map(doc => (
                       <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedDoctor(doc)}>
                          <td className="px-6 py-4 font-medium text-gray-900">Dr. {doc.first_name} {doc.last_name}</td>
                          <td className="px-6 py-4 text-gray-500">{doc.specialization}</td>
                          <td className="px-6 py-4 text-gray-500">{doc.email}</td>
                          <td className="px-6 py-4 text-right text-secondary font-medium">Configure &rarr;</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </Card>
        )}

        {/* --- Pagination --- */}
        {totalPages > 1 && (
           <div className="flex justify-between items-center pt-4">
              <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
              <div className="flex gap-2">
                 <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                 <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
              </div>
           </div>
        )}
      </div>
    );
  }

  // --- VIEW: Assignment (Drag & Drop) ---
  return (
    <div className="animate-in fade-in duration-300 space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" shine size="sm" onClick={() => setSelectedDoctor(null)} className="text-gray-500 flex">
               <ArrowRight className="h-4 w-4 mr-1 rotate-180"/> <span>Back</span>
            </Button>
            <div>
               <h2 className="text-xl font-bold text-gray-800">Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</h2>
               <p className="text-sm text-gray-500">Drag templates or individual vitals to assign.</p>
            </div>
          </div>

          <Button variant="primary" size="md" onClick={save} disabled={isSaving} shine className ="flex">
             <Save className="h-4 w-4 mr-2 " />
             <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </Button>
       </div>

       {/* Alerts */}
       {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
             <AlertCircle className="h-5 w-5 mr-2" /> {errorMessage}
          </div>
       )}
       {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
             <CheckCircle className="h-5 w-5 mr-2" /> {successMessage}
          </div>
       )}

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-250px)]">
          
          {/* LEFT: Assigned Column */}
          <div className="flex flex-col h-full">
             <div className="bg-gray-100 p-3 rounded-t-lg border border-gray-100 flex justify-between items-center">
                <h4 className="font-bold text-secondary flex items-center gap-2">
                   <MoveVertical className="h-4 w-4"/> Assigned Vitals
                </h4>
                <span className="text-xs bg-white px-2 py-0.5 rounded text-secondary font-medium">{assigned.length} items</span>
             </div>
             <div 
               className="flex-1 bg-gray-50 border border-gray-200 border-t-0 rounded-b-lg p-4 overflow-y-auto space-y-2 transition-colors"
               onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-50/50'); }}
               onDragLeave={e => e.currentTarget.classList.remove('bg-blue-50/50')}
               onDrop={(e) => handleDropAssigned(e)}
             >
                {assigned.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
                      <p>No vitals assigned.</p>
                      <p className="text-sm">Drag from library to add.</p>
                   </div>
                )}
                {assigned.map((v, i) => (
                   <div 
                     key={v.vital_config_id} 
                     draggable 
                     onDragStart={e => handleDragStart(e, v.vital_config_id, 'vital')} 
                     className="bg-white p-3 rounded-md shadow-sm border border-gray-200 cursor-move hover:shadow-md flex justify-between items-center group"
                   >
                      <div className="flex items-center gap-3">
                         <span className="text-gray-300 font-mono text-xs">{i + 1}</span>
                         <span className="font-medium text-gray-800">{v.vitalConfig.vital_name}</span>
                         {v.vitalConfig.unit && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{v.vitalConfig.unit}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">{v.is_required ? 'Req' : 'Opt'}</div>
                         <button 
                           onClick={() => { setLibrary([...library, v.vitalConfig]); setAssigned(assigned.filter(x => x.vital_config_id !== v.vital_config_id)); }}
                           className="text-gray-300 hover:text-red-500 p-1 transition-all"
                         >
                            <X className="h-4 w-4" />
                         </button>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          {/* RIGHT: Library Column (Split Top/Bottom) */}
          <div className="flex flex-col h-full gap-4 overflow-hidden">
             
             {/* SECTION 1: TEMPLATES (Top) */}
             <div className="flex flex-col flex-[0.8] min-h-[200px] border border-gray-200 rounded-lg overflow-hidden bg-white">
                <div 
                   className="bg-gray-100 p-3 flex justify-between items-center cursor-pointer hover:bg-gray-200 transition-colors"
                   onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
                >
                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                        <Layers className="h-4 w-4"/> Vital Templates
                    </h4>
                    {isTemplatesOpen ? <ChevronUp className="h-4 w-4 text-gray-500"/> : <ChevronDown className="h-4 w-4 text-gray-500"/>}
                </div>
                
                {isTemplatesOpen && (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="p-2 border-b border-gray-100">
                             <Input 
                                id="search-templates" 
                                placeholder="Search templates..." 
                                
                                value={templateSearch}
                                onChange={(e) => setTemplateSearch(e.target.value)}
                             />
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50">
                            {filteredTemplates.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No templates found.</p>}
                            {filteredTemplates.map(t => (
                                <div 
                                    key={t.id}
                                    draggable
                                    onDragStart={e => handleDragStart(e, t.id, 'template')}
                                    className="relative bg-white p-3 rounded border border-blue-100 shadow-sm cursor-grab hover:shadow-md hover:border-blue-300 transition-all group"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-gray-800 text-sm">{t.template_name}</span>
                                        <Info className="h-3 w-3 text-blue-400" />
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        <span className="text-xs text-gray-400">{t.members?.length || 0} vitals inside</span>
                                    </div>

                                    {/* Hover Preview Tooltip */}
                                    <div className="absolute left-0 top-full mt-2 z-10 w-full bg-gray-800 text-white text-xs p-3 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                                        <p className="font-bold mb-1 border-b border-gray-600 pb-1">Contains:</p>
                                        <ul className="space-y-1">
                                            {t.members.map((m, idx) => (
                                                <li key={idx} className="flex justify-between">
                                                    <span>{m.vitalConfig.vital_name}</span>
                                                    <span className="opacity-70">{m.is_required ? '(Req)' : ''}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
             </div>

             {/* SECTION 2: INDIVIDUAL VITALS (Bottom) */}
             <div className="flex flex-col flex-1 min-h-[200px] border border-gray-200 rounded-lg overflow-hidden bg-white">
                <div 
                   className="bg-gray-100 p-3 flex justify-between items-center cursor-pointer hover:bg-gray-200 transition-colors"
                   onClick={() => setIsVitalsOpen(!isVitalsOpen)}
                >
                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                        <List className="h-4 w-4"/> Individual Vitals
                    </h4>
                    {isVitalsOpen ? <ChevronUp className="h-4 w-4 text-gray-500"/> : <ChevronDown className="h-4 w-4 text-gray-500"/>}
                </div>

                {isVitalsOpen && (
                    <div 
                        className="flex flex-col h-full overflow-hidden"
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleDropLibrary}
                    >
                        <div className="p-2 border-b border-gray-100">
                             <Input 
                                id="search-vitals" 
                                placeholder="Search vitals..." 
                                value={vitalSearch}
                                onChange={(e) => setVitalSearch(e.target.value)}
                             />
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50">
                            {filteredLibrary.length === 0 && <p className="text-xs text-gray-400 text-center py-4">All vitals assigned or none found.</p>}
                            {filteredLibrary.map(v => (
                                <div 
                                    key={v.id} 
                                    draggable 
                                    onDragStart={e => handleDragStart(e, v.id, 'vital')} 
                                    className="bg-white p-2.5 rounded border border-gray-200 cursor-move hover:bg-gray-50 hover:border-gray-300 transition-colors flex justify-between items-center"
                                >
                                    <span className="text-sm font-medium text-gray-700">{v.vital_name}</span>
                                    <span className="text-xs text-gray-400">{v.unit}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
             </div>

          </div>
       </div>
    </div>
  );
};