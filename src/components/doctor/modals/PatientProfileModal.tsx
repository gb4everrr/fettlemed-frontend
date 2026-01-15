'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Building, Calendar, Phone, Mail, MapPin, 
  AlertTriangle, User, ExternalLink, Loader2,
  Search, ChevronLeft, ChevronRight, FileCheck,
  Activity, Pencil, CalendarPlus
} from 'lucide-react';
// @ts-ignore
import api from '@/services/api';
// @ts-ignore
import Button from '@/components/ui/Button';
// @ts-ignore
import Card from '@/components/ui/Card';
// @ts-ignore
import { VitalsCard } from '@/components/doctor/widgets/VitalsCard';
// @ts-ignore
import { AllergiesCard } from '@/components/doctor/widgets/AllergiesCard';
// @ts-ignore
import EditAppointmentModal from '@/components/doctor/modals/EditAppointmentModal';
// @ts-ignore
import { EditPatientModal } from '@/components/doctor/modals/EditPatientModal';
// @ts-ignore
import { NewAppointmentModal } from '@/components/doctor/modals/NewAppointmentModal';

interface PatientProfileModalProps {
    patientId: string | number;
    clinicId: number;
    onClose: () => void;
    user?: any;
}

// Roles that are allowed to see full history and book for other doctors
const PRIVILEGED_ROLES = ['OWNER', 'CLINIC_ADMIN', 'DOCTOR_OWNER', 'DOCTOR_PARTNER'];

export const PatientProfileModal = ({ patientId, clinicId, onClose, user }: PatientProfileModalProps) => {
  const [patient, setPatient] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [myClinics, setMyClinics] = useState<any[]>([]); // Store doctor's clinic contexts
  const [clinicDoctors, setClinicDoctors] = useState<any[]>([]); // For booking appointment
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Summary');

const [activeModal, setActiveModal] = useState<'editPatient' | 'newAppointment' | null>(null);
  // Pagination & Filter
  const [apptSearch, setApptSearch] = useState('');
  const [apptPage, setApptPage] = useState(1);
  const APPTS_PER_PAGE = 5;

  // Convert IDs to string/number safely for widgets that are strict
  const safePatientId = String(patientId);
  const safeClinicId = Number(clinicId);

  // --- Fetch Patient Data with Hybrid History ---
  const fetchPatientData = async () => {
    if (!patientId || !user) return;
    setIsLoading(true);

    try {
        // Parallel Fetch: Patient Details + Doctor's Clinic Roles
        const [patientRes, clinicsRes] = await Promise.all([
            api.get(`/doctor/patient-details/${patientId}`),
            api.get('/doctor/my-clinics-details')
        ]);

        const basePatient = patientRes.data.patient;
        const myPersonalAppointments = patientRes.data.appointments || [];
        const clinicsList = clinicsRes.data || [];
        setMyClinics(clinicsList);

        // --- Logic to Find Patient's Clinic Name ---
        let patientClinicName = basePatient.clinic_name;
        if (!patientClinicName && basePatient.clinic_id) {
            const match = clinicsList.find((c: any) => c.clinic.id === basePatient.clinic_id);
            if (match) patientClinicName = match.clinic.name;
        }
        
        // Enrich patient object
        const enrichedPatient = {
            ...basePatient,
            clinic_name: patientClinicName || 'Unknown Clinic'
        };

        // --- Hybrid History Fetching (Privileged Roles) ---
        const privilegedClinicIds = clinicsList
            .filter((c: any) => {
                const role = (c.assigned_role || c.role || '').toUpperCase();
                return PRIVILEGED_ROLES.includes(role);
            })
            .map((c: any) => c.clinic.id);

        let fullClinicHistory: any[] = [];
        if (privilegedClinicIds.length > 0) {
            const adminPromises = privilegedClinicIds.map((clinicId: number) => 
                api.get('/appointments', { 
                    params: { 
                        clinic_id: clinicId, 
                        patient_profile_id: patientId 
                    } 
                }).then(res => res.data).catch(() => [])
            );
            
            const results = await Promise.all(adminPromises);
            fullClinicHistory = results.flat();
        }

        // --- Merge & Deduplicate Appointments ---
        const combinedRaw = [...myPersonalAppointments, ...fullClinicHistory];
        const uniqueMap = new Map();
        
        combinedRaw.forEach(appt => {
            if (!uniqueMap.has(appt.id)) {
                uniqueMap.set(appt.id, appt);
            } else {
                const existing = uniqueMap.get(appt.id);
                if (!existing.doctor && appt.doctor) {
                    uniqueMap.set(appt.id, appt);
                }
            }
        });

        const finalAppointments = Array.from(uniqueMap.values()).map((appt: any) => {
            let clinicObj = appt.clinic;
            if (!clinicObj && appt.clinic_id) {
                const found = clinicsList.find((c: any) => c.clinic.id === appt.clinic_id);
                if (found) clinicObj = found.clinic;
            }

            return {
                ...appt,
                clinic: clinicObj || { name: 'Unknown Clinic', timezone: 'UTC' },
                doctor: appt.doctor || (appt.clinic_doctor_id === user.id ? {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name
                } : { first_name: 'Unknown', last_name: 'Doctor' }),
                patient: appt.patient || enrichedPatient
            };
        });

        setPatient(enrichedPatient);
        setAppointments(finalAppointments);

    } catch (err) {
        console.error("Failed to load patient profile", err);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, user]);

  // --- Handle "Book Appointment" Click ---
  const handleOpenNewAppointment = async () => {
    if (!patient || !patient.clinic_id) {
        alert("This patient is not associated with a specific clinic context.");
        return;
    }

    const context = myClinics.find((c: any) => c.clinic.id === patient.clinic_id);
    const role = context ? (context.assigned_role || context.role || '').toUpperCase() : 'DOCTOR_VISITING';
    const isPrivileged = PRIVILEGED_ROLES.includes(role);

    if (isPrivileged) {
        try {
            const res = await api.get('/clinic-user/clinic-doctor', { 
                params: { clinic_id: patient.clinic_id } 
            });
            setClinicDoctors(res.data);
        } catch (e) {
            console.error("Failed to fetch clinic doctors", e);
            setClinicDoctors([{ 
                id: user.id, 
                first_name: user.first_name, 
                last_name: user.last_name 
            }]);
        }
    } else {
        setClinicDoctors([{ 
            id: user.id, 
            first_name: user.first_name, 
            last_name: user.last_name 
        }]);
    }

    setActiveModal('newAppointment');
  };

  // --- Derived Data ---
  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];
    if (apptSearch) {
      const q = apptSearch.toLowerCase();
      filtered = filtered.filter(a => 
        a.clinic?.name?.toLowerCase().includes(q) || 
        (a.doctor?.first_name + ' ' + a.doctor?.last_name).toLowerCase().includes(q)
      );
    }
    filtered.sort((a, b) => new Date(b.datetime_start).getTime() - new Date(a.datetime_start).getTime());
    return filtered;
  }, [appointments, apptSearch]);

  const paginatedAppointments = useMemo(() => {
    const start = (apptPage - 1) * APPTS_PER_PAGE;
    return filteredAppointments.slice(start, start + APPTS_PER_PAGE);
  }, [filteredAppointments, apptPage]);

  const totalApptPages = Math.ceil(filteredAppointments.length / APPTS_PER_PAGE);

  const vitalsHistory = useMemo(() => {
    const history: any[] = [];
    appointments.forEach(appt => {
        if (appt.vitals && appt.vitals.length > 0) {
            appt.vitals.forEach((v: any, idx: number) => {
                history.push({
                    id: v.id || parseInt(`${appt.id}${idx}`),
                    date: appt.datetime_start,
                    values: v.values
                });
            });
        }
    });
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments]);

  const latestVitals = vitalsHistory.length > 0 ? vitalsHistory[0] : null;

  const getStatusBadge = (status?: number) => {
    switch (status) {
        case 0: return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">Pending</span>;
        case 1: return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">Confirmed</span>;
        case 2: return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">Cancelled</span>;
        case 3: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">Completed</span>;
        default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">--</span>;
    }
  };

  if (!patientId) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col relative border border-gray-200">
        
{/* TOP BAR */}
<div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
    <div className="flex items-center gap-3">
        <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            title="Go Back"
        >
            <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Patient Profile</span>
    </div>
    <div className="flex items-center gap-2">
        {patient && (
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open(`/doctor/patients/${patient.id}`, '_blank')}
                className="text-xs flex items-center gap-2"
            >
                <ExternalLink className="w-3 h-3" /> Open Full Page
            </Button>
        )}
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
        </button>
    </div>
</div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-3 text-blue-500"/>
                    <p>Loading Patient Records...</p>
                </div>
            ) : patient ? (
                <div className="max-w-6xl mx-auto space-y-6">
                    
                    {/* HEADER CARD */}
                    <Card className="p-6 border-none shadow-sm bg-white overflow-hidden relative">
                        <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
                            <div className="flex gap-6 items-center">
                                <div className="h-24 w-24 flex-shrink-0 rounded-full bg-gradient-to-br from-gray-25 to-gray-50 flex items-center justify-center text-secondary text-3xl font-bold shadow-inner">
                                    {patient.first_name?.[0]}{patient.last_name?.[0]}
                                </div>
                                
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-1">
                                        {patient.first_name} {patient.last_name}
                                    </h1>
                                    <div className="flex items-center text-sm text-gray-500 mb-3">
                                        <Building className="h-4 w-4 mr-1.5 text-gray-400" />
                                        <span>Registered at: <strong className="text-gray-700">{patient.clinic_name}</strong></span>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                        <span>DOB: <strong className="text-gray-900">{patient.date_of_birth || '--/--/----'}</strong></span>
                                        <span className="text-gray-300">|</span>
                                        <span>Gender: <strong className="text-gray-900">{patient.gender || '--'}</strong></span>
                                        <span className="text-gray-300">|</span>
                                        <span>Phone: <strong className="text-gray-900">{patient.phone_number || '--'}</strong></span>
                                    </div>
                                </div>
                            </div>

                            {/* ACTION BUTTONS */}
                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
                               <Button 
                                variant="primary" 
                                size="md" 
                                className="flex items-center justify-center"
                                onClick={handleOpenNewAppointment}
                               >
                                 <CalendarPlus className="h-4 w-4 mr-2" /> Book Appointment
                               </Button>
                               
                               <Button 
                                variant="secondary" 
                                size="md" 
                                className="flex items-center justify-center"
                                onClick={() => setActiveModal('editPatient')}
                               >
                                 <Pencil className="h-4 w-4 mr-2" /> Edit Details
                               </Button>
                            </div>
                        </div>
                    </Card>

                    {/* TABS */}
                    <div className="border-b border-gray-200 bg-white px-0 rounded-t-xl -mb-6 relative z-10">
                        <nav className="flex space-x-8">
                            {['Summary', 'Visits', 'Vitals', 'Prescriptions', 'Documents'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* TAB CONTENT */}
                    <div className="pt-6">
                        {/* SUMMARY TAB */}
                        {activeTab === 'Summary' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card padding="lg" className="md:col-span-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                        <AlertTriangle className="h-5 w-5 text-amber-500 mr-2"/>Medical Alerts
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500 uppercase">Allergies</span>
                                            <div className="h-96">
                                                <AllergiesCard 
                                                    patientId={safePatientId} 
                                                    clinicId={safeClinicId} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <Card padding="lg" className="md:col-span-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                        <MapPin className="h-5 w-5 text-gray-500 mr-2"/>Contact Info
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <span className="text-gray-500 block text-xs uppercase font-semibold">Address</span>
                                            <span className="text-gray-800">{patient.address || 'No address'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs uppercase font-semibold mt-2">Emergency Contact</span>
                                            <span className="text-gray-800">{patient.emergency_contact || 'Not set'}</span>
                                        </div>
                                    </div>
                                </Card>

                                <Card padding="lg" className="md:col-span-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                        <Activity className="h-5 w-5 text-blue-600 mr-2"/>Latest Vitals
                                    </h3>
                                    {latestVitals ? (
                                      <div className="grid grid-cols-2 gap-4">
                                        {latestVitals.values.slice(0, 4).map((val: any, idx: number) => (
                                          <div key={idx}>
                                            <p className="text-xs text-gray-500 uppercase font-semibold">{val.vital_name}</p>
                                            <p className="font-medium text-gray-800 text-lg">{val.vital_value} <span className="text-xs text-gray-400">{val.unit}</span></p>
                                          </div>
                                        ))}
                                      </div>
                                    ) : <p className="text-gray-500 italic text-sm">No vitals recorded yet.</p>}
                                </Card>
                            </div>
                        )}

                        {/* VISITS TAB */}
                        {activeTab === 'Visits' && (
                          <div className="space-y-4">
                             {/* Toolbar */}
                             <div className="flex justify-between">
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search clinic or doctor..." 
                                        value={apptSearch}
                                        onChange={(e) => setApptSearch(e.target.value)}
                                        className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                             </div>

                             {/* Table */}
<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clinic</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
            {paginatedAppointments.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No appointments found.</td></tr>
            ) : (
                paginatedAppointments.map((appt) => (
                    <tr 
                        key={appt.id} 
                        className="hover:bg-gray-50 transition-colors"
                    >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-col">
                                <span className="font-medium">{new Date(appt.datetime_start).toLocaleDateString()}</span>
                                <span className="text-gray-500 text-xs">{new Date(appt.datetime_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            Dr. {appt.doctor?.first_name} {appt.doctor?.last_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {appt.clinic?.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(appt.status)}
                        </td>
                    </tr>
                ))
            )}
        </tbody>
    </table>
</div>

                             {/* Pagination */}
                             {totalApptPages > 1 && (
                                <div className="flex justify-center gap-2 mt-4">
                                    <button disabled={apptPage === 1} onClick={() => setApptPage(p => p - 1)} className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="h-4 w-4"/></button>
                                    <span className="py-2 text-sm text-gray-600">Page {apptPage} of {totalApptPages}</span>
                                    <button disabled={apptPage === totalApptPages} onClick={() => setApptPage(p => p + 1)} className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronRight className="h-4 w-4"/></button>
                                </div>
                             )}
                          </div>
                        )}

                        {/* VITALS TAB */}
                        {activeTab === 'Vitals' && (
                          <div>
                            <VitalsCard 
                                patientId={safePatientId} 
                                clinicId={safeClinicId} 
                            />
                          </div>
                        )}
                        
                        {/* PLACEHOLDER TABS */}
                        {['Prescriptions', 'Documents'].includes(activeTab) && (
                             <Card padding="lg" className="text-center py-12">
                                 <FileCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                 <p className="text-gray-500">No {activeTab.toLowerCase()} found.</p>
                             </Card>
                        )}
                    </div>
                </div>
            ) : (
                <div className="h-full flex items-center justify-center text-red-500">Failed to load patient data.</div>
            )}
        </div>
      </div>

      {/* --- NESTED MODALS --- */}

      {/* Edit Patient Details Modal */}
      {activeModal === 'editPatient' && patient && (
        <EditPatientModal 
            patient={patient}
            clinicId={patient.clinic_id}
            onClose={() => setActiveModal(null)}
            onPatientUpdated={fetchPatientData}
        />
      )}

      {/* Book New Appointment Modal */}
      {activeModal === 'newAppointment' && patient && (
        <NewAppointmentModal
            onClose={() => setActiveModal(null)}
            onRefreshList={fetchPatientData}
            clinicId={patient.clinic_id}
            clinicTimezone="UTC"
            doctors={clinicDoctors}
            patients={[patient]}
        />
      )}
    </div>
  );
};