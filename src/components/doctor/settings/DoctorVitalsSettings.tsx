'use client';

import React, { useState, useEffect, useMemo, DragEvent } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  Search, ArrowRight, X, Save, 
  Layers, ChevronDown, ChevronUp, AlertCircle, 
  CheckCircle, Lock, List as ListIcon
} from 'lucide-react';
import { setActivePermissions } from '@/lib/features/auth/authSlice';
import { getPermissionsForRole } from '@/config/roles';

// --- Configuration ---
const PRIVILEGED_ROLES = ['OWNER', 'CLINIC_ADMIN', 'DOCTOR_OWNER', 'DOCTOR_PARTNER'];

// --- Types ---
interface ClinicContext {
    id: number;
    name: string;
    role: string;
    clinicDoctorId: number;
}

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

// ----------------------------------------------------------------------
// SUB-COMPONENT: The Vitals Assignment Logic
// ----------------------------------------------------------------------
const DoctorVitalsAssignment = ({ 
    clinicId, 
    readOnly, 
    currentDoctorId,
    userProfile
}: { 
    clinicId: number, 
    readOnly: boolean, 
    currentDoctorId: number,
    userProfile: any 
}) => {
  // View State
  const [searchQuery, setSearchQuery] = useState('');

  // UI State
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

  // 1. Fetch Data
  useEffect(() => {
    if (clinicId) {
      // Fetch Templates
      api.get('/clinic-vitals/templates/all', { params: { clinic_id: clinicId } })
         .then(res => setTemplates(res.data || []))
         .catch(console.error);

      // Fetch Doctors Logic
      if (readOnly) {
   const myself: ClinicDoctor = {
       id: currentDoctorId,
       first_name: userProfile?.first_name || 'Me',
       last_name: userProfile?.last_name || '',
       specialization: userProfile?.specialization || 'General',
       email: userProfile?.email || ''
   };
   setDoctors([myself]);
   setSelectedDoctor(myself);
} else {
         api.get(`/clinic-user/clinic-doctor`, { params: { clinic_id: clinicId } })
            .then(res => setDoctors(res.data || []))
            .catch(err => {
                console.error("Failed to fetch doctors:", err);
                setErrorMessage("Could not load doctors list.");
            });
      }
    }
  }, [clinicId, readOnly, currentDoctorId, userProfile]);

  // 2. Fetch Assignments when Doctor Selected
  useEffect(() => {
    if (selectedDoctor && clinicId) {
      setSuccessMessage(null);
      setErrorMessage(null);

      api.get('/clinic-vitals/assignment-manager', { params: { clinic_id: clinicId, clinic_doctor_id: selectedDoctor.id } })
        .then(res => {
           const all = Array.isArray(res.data) ? res.data : [];
           const newAssigned: DoctorVitalAssignment[] = [];
           const newLibrary: ClinicVitalConfig[] = [];
           
           all.forEach((v: any) => {
              if (v.assignments && v.assignments.length > 0) {
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
        })
        .catch(err => {
            console.error(err);
            setErrorMessage("Failed to load assignments.");
            setAssigned([]); 
            setLibrary([]);
        });
    }
  }, [selectedDoctor, clinicId]);

  // Filter Logic
 const filteredDoctors = useMemo(() => {
    const filtered = doctors.filter(doc => 
      doc.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.last_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Sort: "Me" first (matching by clinicDoctorId), then alphabetically
    return filtered.sort((a, b) => {
      const isAMe = a.id === currentDoctorId;
      const isBMe = b.id === currentDoctorId;
      if (isAMe && !isBMe) return -1;
      if (!isAMe && isBMe) return 1;
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    });
}, [doctors, searchQuery, currentDoctorId]);

  const filteredLibrary = useMemo(() => library.filter(v => v.vital_name.toLowerCase().includes(vitalSearch.toLowerCase())), [library, vitalSearch]);
  const filteredTemplates = useMemo(() => templates.filter(t => t.template_name.toLowerCase().includes(templateSearch.toLowerCase())), [templates, templateSearch]);

  // Actions
  const handleDragStart = (e: DragEvent, id: number, type: 'vital' | 'template') => {
    if (readOnly) return;
    e.dataTransfer.setData("id", id.toString());
    e.dataTransfer.setData("type", type);
  };

  const handleDropAssigned = (e: DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const id = parseInt(e.dataTransfer.getData("id"));
    const type = e.dataTransfer.getData("type");
    
    let newAssigned = [...assigned];
    let newLibrary = [...library];
    
    if (type === 'template') {
        const template = templates.find(t => t.id === id);
        if (template) {
            template.members.forEach(m => {
                if (!newAssigned.find(a => a.vital_config_id === m.vital_config_id)) {
                    newAssigned.push({ ...m, sort_order: newAssigned.length });
                    newLibrary = newLibrary.filter(l => l.id !== m.vital_config_id);
                }
            });
        }
    } else {
        const vital = library.find(v => v.id === id);
        if (vital) {
            newAssigned.push({
                vital_config_id: vital.id,
                is_required: false,
                vitalConfig: vital,
                sort_order: newAssigned.length
            });
            newLibrary = newLibrary.filter(v => v.id !== id);
        }
    }
    setAssigned(newAssigned);
    setLibrary(newLibrary);
  };

  const handleRemove = (vitalId: number) => {
    if (readOnly) return;
    const removed = assigned.find(a => a.vital_config_id === vitalId);
    if (removed) {
        setAssigned(assigned.filter(a => a.vital_config_id !== vitalId));
        setLibrary([...library, removed.vitalConfig]);
    }
  };

  const handleSave = async () => {
    if (!selectedDoctor || readOnly) return;
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const payload = {
        clinic_id: clinicId,
        clinic_doctor_id: selectedDoctor.id,
        vital_assignments: assigned.map((a, idx) => ({
            vital_config_id: a.vital_config_id,
            is_required: a.is_required,
            sort_order: idx
        }))
    };

    try {
        await api.post('/clinic-vitals/doctor-assignments/assign', payload);
        setSuccessMessage("Configuration saved successfully.");
    } catch (err: any) {
        console.error(err);
        setErrorMessage(err.response?.data?.message || "Failed to save configuration.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-280px)]">
        {/* Left Col: Doctors */}
        <div className="lg:w-80 flex flex-col">
            <Card className="flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
    <h3 className="font-bold text-gray-800 flex items-center gap-2">
        <ListIcon className="h-4 w-4 text-gray-600" />
        Doctors
    </h3>
    <p className="text-xs text-gray-500 mt-0.5">Select to configure</p>
</div>
                
                {!readOnly && (
                    <div className="p-3 border-b bg-gray-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                            <Input 
                                id="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search doctors..."
                                className="pl-9 h-9 text-sm border-gray-200"
                            />
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {filteredDoctors.map((doc) => {
                        const isMe = doc.id === currentDoctorId;
                        const isSelected = selectedDoctor?.id === doc.id;
                        
                        return (
                            <div 
    key={doc.id}
    onClick={() => !readOnly && setSelectedDoctor(doc)}
    className={`p-3 rounded-lg border-2 transition-all ${
        isSelected
        ? 'bg-gray-50 border-gray-300 shadow-sm' 
        : 'hover:bg-gray-50 border-gray-100 hover:border-gray-200'
    } ${readOnly ? 'cursor-default' : 'cursor-pointer'} ${
        isMe ? 'ring-2 ring-gray-300' : ''
    }`}
>
    <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0 ${
            isMe ? 'bg-gray-600' :
            isSelected ? 'bg-gray-700' : 'bg-gray-400'
        }`}>
            {doc.first_name[0]}{doc.last_name[0]}
        </div>
        <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
                <p className={`text-sm font-semibold truncate ${isSelected ? 'text-gray-900' : 'text-gray-800'}`}>
                    Dr. {doc.first_name} {doc.last_name}
                </p>
                {isMe && (
                    <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-md">
                        YOU
                    </span>
                )}
            </div>
            <p className="text-xs text-gray-500 truncate">{doc.specialization}</p>
        </div>
    </div>
</div>
                        );
                    })}
                </div>
            </Card>
        </div>

        {/* Right Col: Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
            {!selectedDoctor ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                    <ArrowRight className="h-12 w-12 mb-3 opacity-30"/>
                    <p className="text-lg font-medium">Select a doctor to manage vitals</p>
                    <p className="text-sm mt-1">Choose from the list on the left</p>
                </div>
            ) : (
                <div className="flex flex-col h-full gap-4">
                    {/* Header */}
                   <Card className="p-4">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
            <h2 className="text-xl font-bold text-gray-900">Vitals Configuration</h2>
            <p className="text-sm text-gray-600 mt-0.5">
                Managing for <span className="font-semibold text-gray-900">Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</span>
            </p>
        </div>
                            {readOnly ? (
                                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                                    <Lock className="h-4 w-4" /> View Only
                                </div>
                            ) : (
                                <Button onClick={handleSave} disabled={isSaving} className=" flex gap-2 shadow-md" shine>
                                    {isSaving ? <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/> : <Save className="h-4 w-4"/>}
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            )}
                        </div>
                    </Card>

                    {/* Messages */}
                    {successMessage && (
                        <div className="bg-green-50 text-green-800 p-3 rounded-lg border border-green-200 text-sm flex items-center gap-2 font-medium">
                            <CheckCircle className="h-5 w-5 flex-shrink-0"/> {successMessage}
                        </div>
                    )}
                    {errorMessage && (
                        <div className="bg-red-50 text-red-800 p-3 rounded-lg border border-red-200 text-sm flex items-center gap-2 font-medium">
                            <AlertCircle className="h-5 w-5 flex-shrink-0"/> {errorMessage}
                        </div>
                    )}

                    {/* Drag & Drop Area */}
                    <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                        {/* 1. Droppable List */}
                        <div 
    className={`flex-1 flex flex-col rounded-xl border-2 border-dashed overflow-hidden ${
        readOnly ? 'bg-gray-50 border-gray-300' : 'bg-gray-50/50 border-gray-300 hover:border-gray-400'
    }`}
    onDragOver={(e) => !readOnly && e.preventDefault()}
    onDrop={handleDropAssigned}
>
    <div className="p-3 bg-white border-b flex justify-between items-center">
        <span className="text-sm font-bold text-gray-700">Assigned Vitals</span>
        <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded-md">{assigned.length}</span>
    </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {assigned.map((a, idx) => (
                                    <div key={a.vital_config_id} className="bg-white p-3 rounded-lg border-2 border-gray-100 hover:border-gray-300 shadow-sm flex items-center justify-between group transition-all">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <span className="text-gray-400 font-mono text-sm w-6 text-center font-bold flex-shrink-0">{idx + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{a.vitalConfig.vital_name}</p>
                                                <p className="text-xs text-gray-500">{a.vitalConfig.unit}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {a.is_required && <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-md font-bold">Required</span>}
                                            {!readOnly && (
                                                <button 
                                                    onClick={() => handleRemove(a.vital_config_id)} 
                                                    className="text-gray-300 hover:text-red-500 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-red-50"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {assigned.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                                        <Layers className="h-12 w-12 mb-3 opacity-20"/>
                                        <p className="font-medium">{readOnly ? 'No vitals assigned' : 'Drag items here'}</p>
                                        <p className="text-xs mt-1">from templates or library</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Source Lists */}
                        {!readOnly && (
                            <div className="w-80 flex flex-col gap-4 min-h-0 overflow-hidden">
                                {/* Templates */}
                                <div className={`bg-white border-2 border-gray-200 rounded-xl flex flex-col shadow-sm transition-all ${
                                    isTemplatesOpen ? 'flex-1' : 'flex-none'
                                }`}>
                                    <div 
    className="p-3 bg-gray-50 border-b flex justify-between items-center cursor-pointer select-none hover:bg-gray-100 transition-colors"
    onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
>
    <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
        <Layers className="h-4 w-4 text-gray-600"/> Templates
        <span className="px-1.5 py-0.5 bg-white text-gray-700 text-xs rounded-md font-bold border border-gray-200">{filteredTemplates.length}</span>
    </div>
    {isTemplatesOpen ? <ChevronUp className="h-5 w-5 text-gray-600"/> : <ChevronDown className="h-5 w-5 text-gray-600"/>}
</div>
                                    {isTemplatesOpen && (
                                        <>
                                            <div className="p-2 border-b bg-gray-50/50">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"/>
                                                    <Input 
                                                        id="template" 
                                                        value={templateSearch} 
                                                        onChange={e=>setTemplateSearch(e.target.value)} 
                                                        placeholder="Search..." 
                                                        className="h-8 text-xs pl-8 border-gray-200"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/30">
    {filteredTemplates.map(t => (
        <div 
            key={t.id}
            draggable
            onDragStart={(e) => handleDragStart(e, t.id, 'template')}
            className="p-2.5 rounded-lg border-2 border-gray-200 bg-white hover:border-gray-400 hover:shadow-md cursor-move group transition-all"
        >
            <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-800">{t.template_name}</span>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-md font-bold">{t.members.length}</span>
            </div>
        </div>
    ))}
                                                {filteredTemplates.length === 0 && (
                                                    <div className="text-center py-8 text-xs text-gray-400">
                                                        No templates found
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Library */}
                                <div className={`bg-white border-2 border-gray-200 rounded-xl flex flex-col shadow-sm transition-all ${
                                    isVitalsOpen ? 'flex-1' : 'flex-none'
                                }`}>
                                    <div 
    className="p-3 bg-gray-50 border-b flex justify-between items-center cursor-pointer select-none hover:bg-gray-100 transition-colors"
    onClick={() => setIsVitalsOpen(!isVitalsOpen)}
>
    <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
        <ListIcon className="h-4 w-4 text-gray-600"/> Vitals Library
        <span className="px-1.5 py-0.5 bg-white text-gray-700 text-xs rounded-md font-bold border border-gray-200">{filteredLibrary.length}</span>
    </div>
    {isVitalsOpen ? <ChevronUp className="h-5 w-5 text-gray-600"/> : <ChevronDown className="h-5 w-5 text-gray-600"/>}
</div>
                                    {isVitalsOpen && (
                                        <>
                                            <div className="p-2 border-b bg-gray-50/50">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"/>
                                                    <Input 
                                                        id="vitals" 
                                                        value={vitalSearch} 
                                                        onChange={e=>setVitalSearch(e.target.value)} 
                                                        placeholder="Search..." 
                                                        className="h-8 text-xs pl-8 border-gray-200"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/30">
    {filteredLibrary.map(v => (
        <div
            key={v.id}
            draggable
            onDragStart={(e) => handleDragStart(e, v.id, 'vital')}
            className="p-2.5 rounded-lg border-2 border-gray-200 bg-white hover:border-gray-400 hover:shadow-md cursor-move flex justify-between items-center transition-all"
        >
            <span className="text-sm font-semibold text-gray-800">{v.vital_name}</span>
            <span className="text-xs text-gray-500 font-medium">{v.unit}</span>
        </div>
    ))}
                                                {filteredLibrary.length === 0 && (
                                                    <div className="text-center py-8 text-xs text-gray-400">
                                                        No vitals available
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// MAIN WRAPPER
// ----------------------------------------------------------------------
export const DoctorVitalsSettings = () => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector(state => state.auth);
    
    // State
    const [clinics, setClinics] = useState<ClinicContext[]>([]);
    const [selectedClinic, setSelectedClinic] = useState<ClinicContext | null>(null);
    const [isBooting, setIsBooting] = useState(true);

    // 1. BOOT: Fetch doctor's clinics
    useEffect(() => {
        const bootContext = async () => {
            try {
                const { data } = await api.get('/doctor/my-clinics-details');
                const rawList = Array.isArray(data) ? data : (data?.data || []);
                
                const list = rawList.map((item: any) => ({
                    id: item.clinic?.id,
                    name: item.clinic?.name,
                    role: (item.assigned_role || item.role || 'DOCTOR_VISITING').toUpperCase(),
                    clinicDoctorId: item.id
                }));
                
                setClinics(list);
                if (list.length > 0) setSelectedClinic(list[0]);
            } catch (e) {
                console.error(e);
            } finally {
                setIsBooting(false);
            }
        };
        bootContext();
    }, []);

    // 2. PERMISSIONS
    const effectiveRole = selectedClinic?.role || 'DOCTOR_VISITING';
    const isReadOnly = !PRIVILEGED_ROLES.includes(effectiveRole);

    // Hydrate permissions
    useEffect(() => {
        if (!isBooting) {
            dispatch(setActivePermissions(getPermissionsForRole(effectiveRole)));
        }
    }, [effectiveRole, isBooting, dispatch]);

    if (isBooting) return (
        <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
            <p className="text-gray-500">Loading clinic context...</p>
        </div>
    );

    if (!selectedClinic) return (
        <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-md mx-auto">
                <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg">No Clinics Found</h3>
                <p className="text-gray-600 text-sm mt-2">You are not associated with any clinics yet.</p>
            </div>
        </Card>
    );

    return (
        <div className="space-y-4">
            {/* Clinic Selector */}
            {clinics.length > 1 && (
                <Card className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="text-sm font-bold text-gray-700 flex-shrink-0">
                            Clinic Context:
                        </label>
                        <div className="relative sm:w-80">
                        <select
                            value={selectedClinic.id}
                            onChange={(e) => {
                                const c = clinics.find(x => x.id === Number(e.target.value));
                                if(c) setSelectedClinic(c);
                            }}
                            className="w-full appearance-none bg-white border-2 border-gray-200 text-gray-800 font-semibold py-2 px-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm hover:border-gray-300 transition-colors"
                        >
                            {clinics.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                            <ChevronDown className="h-4 w-4" />
                        </div>
                    </div>
                    <span className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md font-semibold border border-gray-200">
                        {selectedClinic.role.replace('_', ' ')}
                    </span>
                </div>
            </Card>
        )}

        {/* Main Content */}
        <DoctorVitalsAssignment 
            clinicId={selectedClinic.id} 
            readOnly={isReadOnly} 
            currentDoctorId={selectedClinic.clinicDoctorId}
            userProfile={user}
        />
    </div>
);
};