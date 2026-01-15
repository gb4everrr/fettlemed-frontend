'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useRouter, useParams } from 'next/navigation';
import { VitalsCard } from '@/components/doctor/widgets/VitalsCard';
import { 
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck,
  Activity,
  MapPin,
  AlertTriangle,
  Building,
  Pencil,
  CalendarPlus,
  Stethoscope
} from 'lucide-react';

// --- Import Modals ---
import  EditAppointmentModal  from '@/components/doctor/modals/EditAppointmentModal';
import { EditPatientModal } from '@/components/doctor/modals/EditPatientModal';
import { NewAppointmentModal } from '@/components/doctor/modals/NewAppointmentModal'; // Reusing Clinic Modal

import { AllergiesCard } from '@/components/doctor/widgets/AllergiesCard';

// Roles that are allowed to see full history and book for other doctors
const PRIVILEGED_ROLES = ['OWNER', 'CLINIC_ADMIN', 'DOCTOR_OWNER', 'DOCTOR_PARTNER'];

export default function DoctorPatientProfilePage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id || params?.patientId;
  const patientId = Array.isArray(rawId) ? rawId[0] : rawId as string;
  const { user } = useAppSelector((state: any) => state.auth);

  // --- State ---
  const [patient, setPatient] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [myClinics, setMyClinics] = useState<any[]>([]); // Store doctor's clinic contexts
  const [clinicDoctors, setClinicDoctors] = useState<any[]>([]); // For booking appointment
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [activeTab, setActiveTab] = useState('Summary');
  
  // Modal State
  const [activeModal, setActiveModal] = useState<'editAppointment' | 'editPatient' | 'newAppointment' | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  // Pagination & Filter
  const [apptSearch, setApptSearch] = useState('');
  const [apptPage, setApptPage] = useState(1);
  const APPTS_PER_PAGE = 5;

  // --- 1. Fetch Patient & Context Data ---
  const fetchPatientData = async () => {
    if (!patientId || !user) return;
    setIsLoading(true);
    setError(null);

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
        // If the API doesn't return clinic_name directly on patient, find it in the doctor's clinic list
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
            // Only fetch if the patient actually belongs to one of these clinics, or just fetch all 
            // relevant intersections to be safe
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
                // Prefer objects with populated doctor/patient details
                const existing = uniqueMap.get(appt.id);
                if (!existing.doctor && appt.doctor) {
                    uniqueMap.set(appt.id, appt);
                }
            }
        });

        const finalAppointments = Array.from(uniqueMap.values()).map((appt: any) => {
            // Resolve Clinic Object
            let clinicObj = appt.clinic;
            if (!clinicObj && appt.clinic_id) {
                const found = clinicsList.find((c: any) => c.clinic.id === appt.clinic_id);
                if (found) clinicObj = found.clinic;
            }

            return {
                ...appt,
                clinic: clinicObj || { name: 'Unknown Clinic', timezone: 'UTC' },
                // Fallback for doctor object
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

    } catch (err: any) {
        console.error('Failed to fetch patient data:', err);
        setError(err.response?.data?.error || 'Failed to load patient profile.');
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, user]);


  // --- 2. Handle "Book Appointment" Click ---
  const handleOpenNewAppointment = async () => {
    if (!patient || !patient.clinic_id) {
        alert("This patient is not associated with a specific clinic context.");
        return;
    }

    // Determine Doctor's Role in this specific Patient's Clinic
    const context = myClinics.find((c: any) => c.clinic.id === patient.clinic_id);
    const role = context ? (context.assigned_role || context.role || '').toUpperCase() : 'DOCTOR_VISITING';
    const isPrivileged = PRIVILEGED_ROLES.includes(role);

    if (isPrivileged) {
        // If Owner/Partner, fetch ALL doctors for that clinic so they can schedule for anyone
        try {
            const res = await api.get('/clinic-user/clinic-doctor', { 
                params: { clinic_id: patient.clinic_id } 
            });
            setClinicDoctors(res.data);
        } catch (e) {
            console.error("Failed to fetch clinic doctors", e);
            // Fallback to self
            setClinicDoctors([{ 
                id: user.id, 
                first_name: user.first_name, 
                last_name: user.last_name 
            }]);
        }
    } else {
        // If Visiting, strictly restrict list to Self
        setClinicDoctors([{ 
            id: user.id, 
            first_name: user.first_name, 
            last_name: user.last_name 
        }]);
    }

    setActiveModal('newAppointment');
  };


  // --- 3. Derived Data for UI ---
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


  // --- Render ---

  if (isLoading) {
    return (
      <DoctorDashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DoctorDashboardLayout>
    );
  }

  if (error || !patient) {
    return (
      <DoctorDashboardLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-red-600 text-lg mb-4">{error || 'Patient not found.'}</p>
          <Button variant="primary" onClick={() => router.back()}>Go Back</Button>
        </div>
      </DoctorDashboardLayout>
    );
  }

  const displayName = `${patient.first_name} ${patient.last_name}`;

  return (
    <DoctorDashboardLayout headerText={displayName}>
      <div className="p-6 md:p-8 font-inter min-h-screen">
        
        {/* HEADER */}
        <Card padding="lg" className="mb-8 shadow-sm border-gray-200">
          <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
            <div className="flex gap-6 items-center">
              <div className="h-24 w-24 flex-shrink-0 rounded-full bg-gradient-to-br from-gray-25 to-gray-50 flex items-center justify-center text-secondary text-3xl font-bold shadow-inner">
                {patient.first_name[0]}{patient.last_name[0]}
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{displayName}</h1>
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
                shine
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
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-8">
            {['Summary', 'Visits', 'Vitals', 'Prescriptions', 'Documents'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button> 
            ))}
          </nav>
        </div>

        {/* CONTENT: SUMMARY */}
        {activeTab === 'Summary' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card padding="lg" className="md:col-span-1">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><AlertTriangle className="h-5 w-5 text-amber-500 mr-2"/>Medical Alerts</h3>
                <div className="space-y-4">
                    <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase">Allergies</span>
                        {patient && (
                            <div className="h-96">
                                <AllergiesCard 
                                    patientId={patientId} 
                                    clinicId={patient.clinic_id} 
                                />
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <Card padding="lg" className="md:col-span-1">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><MapPin className="h-5 w-5 text-gray-500 mr-2"/>Contact Info</h3>
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
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Activity className="h-5 w-5 text-blue-600 mr-2"/>Latest Vitals</h3>
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

        {/* CONTENT: VISITS */}
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
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {paginatedAppointments.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No appointments found.</td></tr>
                        ) : (
                            paginatedAppointments.map((appt) => (
                                <tr 
                                    key={appt.id} 
                                    onClick={() => { setSelectedAppointment(appt); setActiveModal('editAppointment'); }}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
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
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-blue-600 hover:text-blue-900 font-medium">View</button>
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

        {/* CONTENT: VITALS (Simplified Grid) */}
        {activeTab === 'Vitals' && (
          <div >
             {patient && (
        <div >
            <VitalsCard 
                patientId={patientId} 
                clinicId={patient.clinic_id} 
            />
        </div>
    )}</div>
        )}
        
        {/* Placeholder Tabs */}
        {['Prescriptions', 'Documents'].includes(activeTab) && (
             <Card padding="lg" className="text-center py-12">
                 <FileCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                 <p className="text-gray-500">No {activeTab.toLowerCase()} found.</p>
             </Card>
        )}

      </div>

      {/* --- MODALS --- */}

      {/* 1. Edit Appointment Modal */}
      {activeModal === 'editAppointment' && selectedAppointment && (
        <EditAppointmentModal
            appointment={selectedAppointment}
            onClose={() => setActiveModal(null)}
            onRefreshList={fetchPatientData}
            clinicId={selectedAppointment.clinic_id}
            clinicName={selectedAppointment.clinic?.name || 'Clinic'}
            clinicTimezone={selectedAppointment.clinic?.timezone || 'UTC'}
            user={user}
            role="doctor"
        />
      )}

      {/* 2. Edit Patient Details Modal */}
      {activeModal === 'editPatient' && patient && (
        <EditPatientModal 
            patient={patient}
            clinicId={patient.clinic_id}
            onClose={() => setActiveModal(null)}
            onPatientUpdated={fetchPatientData}
        />
      )}

      {/* 3. Book New Appointment Modal */}
      {activeModal === 'newAppointment' && patient && (
        <NewAppointmentModal
            onClose={() => setActiveModal(null)}
            onRefreshList={fetchPatientData}
            clinicId={patient.clinic_id}
            clinicTimezone="UTC" // Default or fetch from context
            doctors={clinicDoctors}
            patients={[patient]} // Pre-fill with ONLY this patient
        />
      )}

    </DoctorDashboardLayout>
  );
}