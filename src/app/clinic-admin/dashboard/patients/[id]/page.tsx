// src/app/clinic-admin/dashboard/patients/[id]/page.tsx
'use client';

import React, { useState, useEffect, use, useMemo } from 'react';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import { useRouter } from 'next/navigation';
import { 
  Pencil, 
  CalendarPlus, 
  AlertCircle,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  FileCheck,
  Activity
} from 'lucide-react';

// --- Import DatePicker ---
import DatePicker from '@/components/ui/DatePicker';

// --- Import Modals ---
import { NewAppointmentModal } from '@/components/clinic/modals/NewAppointmentModal';
import { EditPatientModal } from '@/components/clinic/modals/EditPatientModal';
import { EditAppointmentModal } from '@/components/clinic/modals/EditAppointmentModal'; 

// --- Interfaces ---
interface ClinicPatient {
  id: number;
  clinic_id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  emergency_contact: string | null;
  patient_code: string | null;
  clinic_notes: string | null;
  registered_at: string;
  date_of_birth?: string;
  gender?: string;
  allergies?: string[];
  chronic_conditions?: string[];
}

interface VitalRecord {
  id: number;
  vital_value: string;
  config: {
    vital_name: string;
    unit: string;
  };
}

interface VitalsEntry {
  id: number;
  entry_date: string;
  entry_time: string;
  values: VitalRecord[];
}

interface Appointment {
  id: number;
  clinic_id: number;
  clinic_patient_id: number;
  clinic_doctor_id: number;
  slot_id: number;
  datetime_start: string;
  datetime_end: string;
  status: number;
  notes: string | null;
  doctor?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  patient?: { 
    id: number;
    first_name: string;
    last_name: string;
  };
}

interface ClinicDoctor {
    id: number;
    first_name: string;
    last_name: string;
}

type ModalType = 'appointment' | 'editPatient' | 'viewAppointment' | null;
type TabType = 'Summary' | 'Visits' | 'Vitals' | 'Prescriptions' | 'Documents' | 'Insurance' | 'Consents';

export default function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAppSelector((state: any) => state.auth);
  const clinicId = user?.clinics?.[0]?.id;
  const clinicTimezone = user?.clinics?.[0]?.timezone || 'Asia/Kolkata';

  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  // --- Data State ---
  const [patient, setPatient] = useState<ClinicPatient | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<VitalsEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]); 

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<TabType>('Summary');
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Filters & Pagination State ---
  
  // Appointments Filters
  const [apptSearch, setApptSearch] = useState('');
  const [apptStatusFilter, setApptStatusFilter] = useState('all');
  const [apptStartDate, setApptStartDate] = useState<Date | null>(null);
  const [apptEndDate, setApptEndDate] = useState<Date | null>(null);
  const [apptSort, setApptSort] = useState<'asc' | 'desc'>('desc');
  const [apptPage, setApptPage] = useState(1);
  const APPTS_PER_PAGE = 5;

  // Vitals Filters
  const [vitalSearch, setVitalSearch] = useState('');
  const [vitalStartDate, setVitalStartDate] = useState<Date | null>(null);
  const [vitalEndDate, setVitalEndDate] = useState<Date | null>(null);
  const [vitalSort, setVitalSort] = useState<'asc' | 'desc'>('desc');
  const [vitalPage, setVitalPage] = useState(1);
  const VITALS_PER_PAGE = 6;

  // --- Data Fetching ---
  const fetchAllData = async () => {
    if (!clinicId) return;
    setIsLoading(true);
    try {
      const [patientRes, vitalsRes, appointmentsRes] = await Promise.all([
        api.get(`/clinic-user/clinic-patient/${patientId}`, { params: { clinic_id: clinicId } }),
        api.get(`/clinic-vitals/entry/history/${patientId}`, { params: { clinic_id: clinicId } }),
        api.get('/appointments', { params: { clinic_id: clinicId, patient_profile_id: patientId } })
      ]);

      setPatient(patientRes.data);
      setVitalsHistory(vitalsRes.data);
      setAppointments(appointmentsRes.data);
    } catch (err: any) {
      console.error('Failed to fetch patient data:', err);
      setError(err.response?.data?.error || 'Failed to load patient profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDoctors = async () => {
    if (doctors.length > 0) return;
    try {
      const response = await api.get('/clinic-user/clinic-doctor', { params: { clinic_id: clinicId } });
      setDoctors(response.data);
    } catch (err) {
      console.error('Failed to fetch doctors', err);
    }
  };

  useEffect(() => {
    if (user && user.role === 'clinic_admin') {
      fetchAllData();
    } else if (user && user.role !== 'clinic_admin') {
      router.push('/auth/login');
    }
  }, [user, clinicId, patientId]);

  // --- Handlers ---
  const handleOpenNewAppointment = () => {
    fetchDoctors();
    setActiveModal('appointment');
  };

  const handleViewAppointment = (appt: Appointment) => {
    const apptWithPatient = {
        ...appt,
        patient: patient ? { id: patient.id, first_name: patient.first_name, last_name: patient.last_name } : undefined
    };
    setSelectedAppointment(apptWithPatient);
    setActiveModal('viewAppointment');
  };

  // --- Derived Data (Filters & Pagination) ---

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];

    if (apptSearch) {
      const q = apptSearch.toLowerCase();
      filtered = filtered.filter(a => 
        a.doctor?.first_name.toLowerCase().includes(q) || 
        a.doctor?.last_name.toLowerCase().includes(q)
      );
    }

    if (apptStatusFilter !== 'all') {
      const statusMap: Record<string, number> = { 'pending': 0, 'confirmed': 1, 'cancelled': 2, 'completed': 3 };
      filtered = filtered.filter(a => a.status === statusMap[apptStatusFilter]);
    }

    if (apptStartDate) {
      const start = new Date(apptStartDate);
      start.setHours(0,0,0,0);
      filtered = filtered.filter(a => new Date(a.datetime_start) >= start);
    }

    if (apptEndDate) {
      const end = new Date(apptEndDate);
      end.setHours(23,59,59,999);
      filtered = filtered.filter(a => new Date(a.datetime_start) <= end);
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.datetime_start).getTime();
      const dateB = new Date(b.datetime_start).getTime();
      return apptSort === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return filtered;
  }, [appointments, apptSearch, apptStatusFilter, apptStartDate, apptEndDate, apptSort]);

  const paginatedAppointments = useMemo(() => {
    const start = (apptPage - 1) * APPTS_PER_PAGE;
    return filteredAppointments.slice(start, start + APPTS_PER_PAGE);
  }, [filteredAppointments, apptPage]);

  const totalApptPages = Math.ceil(filteredAppointments.length / APPTS_PER_PAGE);


  // Filtered Vitals
  const filteredVitals = useMemo(() => {
    let filtered = [...vitalsHistory];

    if (vitalSearch) {
      const q = vitalSearch.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.values.some(v => 
          v.config.vital_name.toLowerCase().includes(q) || 
          v.vital_value.toLowerCase().includes(q)
        )
      );
    }

    if (vitalStartDate) {
        const start = new Date(vitalStartDate);
        start.setHours(0,0,0,0);
        filtered = filtered.filter(v => new Date(v.entry_date) >= start);
    }

    if (vitalEndDate) {
        const end = new Date(vitalEndDate);
        end.setHours(23,59,59,999);
        filtered = filtered.filter(v => new Date(v.entry_date) <= end);
    }

    filtered.sort((a, b) => {
      const dateA = new Date(`${a.entry_date}T${a.entry_time}`).getTime();
      const dateB = new Date(`${b.entry_date}T${b.entry_time}`).getTime();
      return vitalSort === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return filtered;
  }, [vitalsHistory, vitalSearch, vitalStartDate, vitalEndDate, vitalSort]);

  const paginatedVitals = useMemo(() => {
    const start = (vitalPage - 1) * VITALS_PER_PAGE;
    return filteredVitals.slice(start, start + VITALS_PER_PAGE);
  }, [filteredVitals, vitalPage]);

  const totalVitalPages = Math.ceil(filteredVitals.length / VITALS_PER_PAGE);


  // --- Helper: Status Badge ---
  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0: return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">Pending</span>;
      case 1: return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">Confirmed</span>;
      case 2: return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">Cancelled</span>;
      case 3: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">Completed</span>;
      default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">Unknown</span>;
    }
  };

  // --- Main Render ---
  
  if (!user || isLoading) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ClinicDashboardLayout>
    );
  }

  if (error || !patient) {
    return (
      <ClinicDashboardLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-red-600 text-lg mb-4">{error || 'Patient not found.'}</p>
          <Button variant="primary" onClick={() => router.push('/clinic-admin/dashboard/patients')}>
            Return to Directory
          </Button>
        </div>
      </ClinicDashboardLayout>
    );
  }

  const latestVitals = vitalsHistory.length > 0 ? vitalsHistory[0] : null;

  return (
    <ClinicDashboardLayout>
      <div className="p-6 md:p-8 font-inter min-h-screen">
        
        {/* --- 1. HEADER SECTION (Restyled as Card) --- */}
        <Card padding="lg" className="mb-8 shadow-sm border-gray-200">
          <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
            <div className="flex gap-6 items-center">
              {/* Avatar */}
              <div className="h-24 w-24 flex-shrink-0 rounded-full bg-gradient-to-br from-gray-25 to-gray-50 flex items-center justify-center text-secondary text-3xl font-bold shadow-inner">
                {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{patient.first_name} {patient.last_name}</h1>
                <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                  {/* Placeholders */}
                  <span>Age: <span className="font-semibold text-gray-800">--</span></span>
                  <span className="text-gray-300">|</span>
                  <span>DOB: <span className="font-semibold text-gray-800">--/--/----</span></span>
                  <span className="text-gray-300">|</span>
                  <span>Gender: <span className="font-semibold text-gray-800">--</span></span>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                  <span>{patient.email || 'No Email'}</span>
                  <span className="text-gray-300">•</span>
                  <span>{patient.phone_number || 'No Phone'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Button 
                variant="primary" 
                size="md" 
                className="flex items-center justify-center"
                onClick={handleOpenNewAppointment}
                shine
              >
                <CalendarPlus className="h-4 w-4 mr-2" /> New Appointment
              </Button>
               <Button 
                variant="secondary" 
                size="sm" 
                shine
                className="flex items-center justify-center"
                onClick={() => setActiveModal('editPatient')}
              >
                <Pencil className="h-4 w-4 mr-2" /> Edit Patient
              </Button>
              
            </div>
          </div>
        </Card>

        {/* --- 2. TABS NAVIGATION --- */}
        <div className="border-b border-gray-200 mb-6 overflow-x-auto">
          <nav className="flex gap-8 min-w-max">
            {['Summary', 'Visits', 'Vitals', 'Prescriptions', 'Documents', 'Insurance', 'Consents'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as TabType)}
                className={`pb-4 pt-2 text-sm border-b-[3px] transition-colors ${
                  activeTab === tab
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* --- 3. TAB CONTENT --- */}
        
        {/* SUMMARY TAB */}
        {activeTab === 'Summary' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Allergies */}
            <Card padding="lg" className="shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-bold text-gray-900">Allergies</h3>
              </div>
              <div className="space-y-2">
                {patient.allergies && patient.allergies.length > 0 ? (
                   patient.allergies.map((a, i) => <p key={i} className="text-gray-600">{a}</p>)
                ) : (
                   <>
                      <p className="text-gray-600">No known drug allergies</p>
                      <p className="text-xs text-gray-400 mt-2">(Data pending)</p>
                   </>
                )}
              </div>
            </Card>

            {/* Primary Physician */}
            <Card padding="lg" className="shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-bold text-gray-900">Primary Physician</h3>
              </div>
              <div className="space-y-1">
                <p className="text-gray-600 text-base">Dr. Not Assigned</p>
                <p className="text-gray-500 text-sm">General Practitioner</p>
              </div>
            </Card>

            {/* Emergency Contact */}
            <Card padding="lg" className="shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-bold text-gray-900">Emergency Contact</h3>
              </div>
              <div className="space-y-1">
                <p className="text-gray-600 text-base">{patient.emergency_contact || 'Not set'}</p>
              </div>
            </Card>

            {/* Chronic Conditions */}
            <Card padding="lg" className="shadow-sm md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-bold text-gray-900">Chronic Conditions</h3>
              </div>
              <div>
                 {patient.chronic_conditions && patient.chronic_conditions.length > 0 ? (
                   patient.chronic_conditions.map((c, i) => <p key={i} className="text-gray-600">{c}</p>)
                ) : (
                   <p className="text-gray-500 italic">No chronic conditions recorded.</p>
                )}
              </div>
            </Card>

            {/* Recent Vitals */}
            <Card padding="lg" className="shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Recent Vitals</h3>
                </div>
                {latestVitals ? (
                  <div className="grid grid-cols-2 gap-4">
                    {latestVitals.values.slice(0, 4).map((val) => (
                      <div key={val.id}>
                        <p className="text-xs text-gray-500 uppercase">{val.config.vital_name}</p>
                        <p className="font-medium text-gray-800">{val.vital_value} <span className="text-xs text-gray-400">{val.config.unit}</span></p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No vitals recorded yet.</p>
                )}
              </div>
              {latestVitals && (
                <p className="text-xs text-gray-400 mt-4 pt-4 border-t">
                  Recorded on {latestVitals.entry_date} at {latestVitals.entry_time}
                </p>
              )}
            </Card>
          </div>
        )}

        {/* VISITS TAB (Appointments) */}
        {activeTab === 'Visits' && (
          <div className="space-y-6">
            
            {/* Filter & Sort Bar */}
            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search doctor..."
                            value={apptSearch}
                            onChange={(e) => { setApptSearch(e.target.value); setApptPage(1); }}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    
                    {/* Status Filter */}
                    <div className="relative w-full sm:w-48">
                        <select
                            value={apptStatusFilter}
                            onChange={(e) => { setApptStatusFilter(e.target.value); setApptPage(1); }}
                            className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm appearance-none focus:ring-blue-500 focus:border-blue-500 cursor-pointer w-full"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter className="h-4 w-4 text-gray-400" />
                        </div>
                    </div>

                    {/* Start Date */}
                    <div className="w-full sm:w-40 relative z-30">
                        <DatePicker
                            value={apptStartDate}
                            onChange={(date) => { setApptStartDate(date); setApptPage(1); }}
                            placeholder="Start Date"
                        />
                    </div>

                    {/* End Date */}
                    <div className="w-full sm:w-40 relative z-20">
                        <DatePicker
                            value={apptEndDate}
                            onChange={(date) => { setApptEndDate(date); setApptPage(1); }}
                            placeholder="End Date"
                        />
                    </div>
                </div>

                {/* Sort */}
                <button 
                    onClick={() => setApptSort(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 whitespace-nowrap"
                >
                    <ArrowUpDown className="h-4 w-4 text-gray-500 mr-2" />
                    {apptSort === 'asc' ? 'Oldest First' : 'Newest First'}
                </button>
            </div>

            {/* Appointments List */}
            {paginatedAppointments.length === 0 ? (
              <Card padding="lg" className="text-center text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No appointment history found.</p>
              </Card>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedAppointments.map((appt) => (
                        <tr 
                            key={appt.id} 
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handleViewAppointment(appt)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(appt.datetime_start).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            Dr. {appt.doctor?.first_name} {appt.doctor?.last_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(appt.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-blue-600 hover:text-blue-900">
                            View
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalApptPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <button
                            onClick={() => setApptPage(p => Math.max(1, p - 1))}
                            disabled={apptPage === 1}
                            className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm text-gray-600">Page {apptPage} of {totalApptPages}</span>
                        <button
                            onClick={() => setApptPage(p => Math.min(totalApptPages, p + 1))}
                            disabled={apptPage === totalApptPages}
                            className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
              </>
            )}
          </div>
        )}

        {/* VITALS TAB (History) */}
        {activeTab === 'Vitals' && (
          <div className="space-y-6">
            
            {/* Filter & Sort Bar */}
            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <div className="relative flex-1 min-w-[200px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search vitals..."
                            value={vitalSearch}
                            onChange={(e) => { setVitalSearch(e.target.value); setVitalPage(1); }}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Start Date */}
                    <div className="w-full sm:w-40 relative z-30">
                        <DatePicker
                            value={vitalStartDate}
                            onChange={(date) => { setVitalStartDate(date); setVitalPage(1); }}
                            placeholder="Start Date"
                        />
                    </div>

                    {/* End Date */}
                    <div className="w-full sm:w-40 relative z-20">
                        <DatePicker
                            value={vitalEndDate}
                            onChange={(date) => { setVitalEndDate(date); setVitalPage(1); }}
                            placeholder="End Date"
                        />
                    </div>
                </div>
                
                <button 
                    onClick={() => setVitalSort(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 whitespace-nowrap"
                >
                    <ArrowUpDown className="h-4 w-4 text-gray-500 mr-2" />
                    {vitalSort === 'asc' ? 'Oldest First' : 'Newest First'}
                </button>
            </div>

            {/* Vitals Grid */}
            {paginatedVitals.length === 0 ? (
              <Card padding="lg" className="text-center text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No vitals history available.</p>
              </Card>
            ) : (
              <>
                <div className="grid gap-4">
                    {paginatedVitals.map((entry) => (
                    <Card key={entry.id} padding="md" className="shadow-sm">
                        <div className="flex justify-between items-start mb-3 border-b pb-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>{entry.entry_date} at {entry.entry_time}</span>
                        </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {entry.values.map((val) => (
                            <div key={val.id} className="bg-gray-50 p-2 rounded border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-semibold">{val.config.vital_name}</p>
                            <p className="font-bold text-gray-800 text-lg">
                                {val.vital_value} <span className="text-xs font-normal text-gray-500">{val.config.unit}</span>
                            </p>
                            </div>
                        ))}
                        </div>
                    </Card>
                    ))}
                </div>

                {/* Pagination */}
                {totalVitalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <button
                            onClick={() => setVitalPage(p => Math.max(1, p - 1))}
                            disabled={vitalPage === 1}
                            className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm text-gray-600">Page {vitalPage} of {totalVitalPages}</span>
                        <button
                            onClick={() => setVitalPage(p => Math.min(totalVitalPages, p + 1))}
                            disabled={vitalPage === totalVitalPages}
                            className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
              </>
            )}
          </div>
        )}

        {/* OTHER TABS (Placeholders) */}
        {['Prescriptions', 'Documents', 'Insurance', 'Consents'].includes(activeTab) && (
          <Card padding="lg" className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <FileCheck className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Coming Soon</h3>
            <p className="text-gray-500 mt-1">The {activeTab} feature is currently under development.</p>
          </Card>
        )}

      </div>

      {/* --- MODAL OVERLAYS --- */}
      
      {activeModal === 'appointment' && (
        <NewAppointmentModal
            onClose={() => setActiveModal(null)}
            onRefreshList={fetchAllData} // Refresh data after booking
            clinicId={clinicId}
            clinicTimezone={clinicTimezone}
            doctors={doctors} 
            patients={[patient]} // Pre-select this patient
        />
      )}

      {activeModal === 'editPatient' && (
        <EditPatientModal 
            patient={patient}
            clinicId={clinicId}
            onClose={() => setActiveModal(null)}
            onPatientUpdated={fetchAllData}
        />
      )}

      {/* View/Edit Appointment Modal */}
      {activeModal === 'viewAppointment' && selectedAppointment && (
        <EditAppointmentModal
            appointment={selectedAppointment}
            onClose={() => {
                setActiveModal(null);
                setSelectedAppointment(null);
            }}
            onRefreshList={fetchAllData}
            clinicId={clinicId}
            clinicTimezone={clinicTimezone}
            user={user}
        />
      )}

    </ClinicDashboardLayout>
  );
}