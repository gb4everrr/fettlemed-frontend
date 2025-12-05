// src/app/clinic-admin/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAppSelector } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import { Can } from '@/lib/features/auth/Can';
import api from '@/services/api';
import { 
    X, 
    Calendar, 
    FileText, 
    UserPlus, 
    Plus,
    Loader2,
    TrendingUp,
    TrendingDown,
    Users,
    FileStack,
    CalendarDays
} from 'lucide-react';
import { Label } from '@radix-ui/react-label';

// --- Import the MODALS ---
import { RegisterPatientModal } from '@/components/clinic/modals/RegisterPatientModal';
import { CreateInvoiceModal } from '@/components/clinic/modals/CreateInvoiceModal';
import { NewAppointmentModal } from '@/components/clinic/modals/NewAppointmentModal';

// --- IMPORT TYPES (NEW) ---
import { ClinicDoctor, ClinicPatient } from '@/types/clinic';

// --- Interfaces for KPI Dashboard ---
interface KpiMetric {
    value: number;
    percentageChange: number;
}
// ... (rest of KPI interfaces) ...
interface KpiAppointmentMetric {
    total: number;
    confirmed: number;
    canceled: number;
}

interface KpiData {
    totalRevenue: KpiMetric;
    newPatients: KpiMetric;
    totalInvoices: KpiMetric;
    appointments: KpiAppointmentMetric;
}


type ModalType = 'patient' | 'invoice' | 'appointment' | null;
type DateFilterType = 'week' | 'month' | 'year' | 'custom';

// --- Helper functions ---
const toYYYYMMDD = (date: Date) => {
    return date.toISOString().split('T')[0];
};

const getStartDate = (filter: DateFilterType): Date => {
    const end = new Date();
    const start = new Date();
    switch (filter) {
        case 'week':
            start.setDate(end.getDate() - 7);
            break;
        case 'month':
            start.setMonth(end.getMonth() - 1);
            break;
        case 'year':
            start.setFullYear(end.getFullYear() - 1);
            break;
    }
    return start;
};


export default function ClinicDashboardPage() {
    const router = useRouter();
    const { user } = useAppSelector((state: any) => state.auth);
    
    const clinicId = user?.clinics?.[0]?.id;
    const clinicTimezone = user?.clinics?.[0]?.timezone || 'Asia/Kolkata'; 
    
    const [activeModal, setActiveModal] = useState<ModalType>(null);

    // --- State for KPI Dashboard ---
    const [kpiData, setKpiData] = useState<KpiData | null>(null);
    const [kpiLoading, setKpiLoading] = useState(true);
    const [kpiError, setKpiError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<DateFilterType>('month');
    const [customRange, setCustomRange] = useState({
        start: toYYYYMMDD(getStartDate('month')),
        end: toYYYYMMDD(new Date())
    });

    // --- NEW: State for Modals ---
    const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
    const [patients, setPatients] = useState<ClinicPatient[]>([]);

    // --- Fetch KPI Data ---
    useEffect(() => {
        if (!clinicId) return;

        const fetchKpiData = async () => {
            setKpiLoading(true);
            setKpiError(null);
            
            let range = { ...customRange };
            if (activeFilter !== 'custom') {
                range.start = toYYYYMMDD(getStartDate(activeFilter));
                range.end = toYYYYMMDD(new Date());
            }

            try {
                const response = await api.get('/dashboard/kpi-metrics', {
                    params: {
                        clinic_id: clinicId,
                        startDate: range.start,
                        endDate: range.end
                    }
                });
                setKpiData(response.data);
            } catch (err: any) {
                console.error('Failed to fetch KPI data:', err);
                setKpiError(err.response?.data?.error || 'Failed to load metrics');
            } finally {
                setKpiLoading(false);
            }
        };

        fetchKpiData();
    }, [clinicId, activeFilter, customRange]);
    
    // --- NEW: Function to fetch data for the Appointment modal ---
    const fetchAppointmentModalData = async () => {
        if (!clinicId) return;
        
        // Only fetch if we haven't already
        if (doctors.length > 0 && patients.length > 0) {
            return;
        }

        try {
            const [doctorsRes, patientsRes] = await Promise.all([
                api.get('/clinic-user/clinic-doctor', { params: { clinic_id: clinicId } }),
                api.get('/clinic-user/clinic-patient', { params: { clinic_id: clinicId } }),
            ]);
            setDoctors(doctorsRes.data);
            setPatients(patientsRes.data);
        } catch (err) {
            console.error('Failed to fetch modal data:', err);
            // You could set an error message for the modal here
        }
    };
    
    const closeModal = () => {
        setActiveModal(null);
    };

    if (!user) {
        return null; // Or a loading spinner
    }

    // Helper for rendering KPI cards
    const renderKpiCard = (
        title: string, 
        metric: KpiMetric, 
        icon: React.ReactNode,
        formatAsCurrency = false
    ) => (
        <Card padding="md" className="flex flex-col gap-1 shadow-sm">
            <p className="text-base font-medium text-gray-500 flex items-center gap-2">
                {icon} {title}
            </p>
            <p className="text-3xl font-bold text-gray-900">
                {formatAsCurrency ? `Rs. ${metric.value.toLocaleString()}` : metric.value}
            </p>
            <div className={`flex items-center text-sm mt-1 ${metric.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metric.percentageChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <p className="font-medium ml-1">{metric.percentageChange.toFixed(1)}% vs last period</p>
            </div>
        </Card>
    );

    return (
        <ClinicDashboardLayout>
            <div className="p-6 md:p-8">
                <h1 className="text-3xl font-bold text-[var(--color-text-dark)] mb-6 font-inter">
                    Dashboard
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main content area - 2 columns */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Quick Actions Section */}
                        <Card padding="lg" className="shadow-sm">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 ">Quick Actions</h2>
                            <div className="flex flex-wrap gap-3 items-center">
                                <Button 
                                    variant="secondary" 
                                    size="md" 
                                    className="flex items-center gap-2 flex-1 min-w-[200px]"
                                    // --- UPDATED onClick ---
                                    onClick={() => {
                                        fetchAppointmentModalData(); // Fetch data
                                        setActiveModal('appointment'); // Then open modal
                                    }}
                                    shine
                                >
                                    <Plus className="h-5 w-5" />
                                    <span>New Appointment</span>
                                </Button>
                                <Button 
                                    variant="secondary" 
                                    shine
                                    size="md" 
                                    className="flex items-center gap-2 flex-1 min-w-[200px]"
                                    onClick={() => setActiveModal('patient')}
                                >
                                    <UserPlus className="h-5 w-5" />
                                    <span>Register Patient</span>
                                </Button>
                                <Button 
                                    variant="secondary" 
                                    shine
                                    size="md" 
                                    className="flex items-center gap-2 flex-1 min-w-[200px]"
                                    onClick={() => setActiveModal('invoice')}
                                >
                                    <FileText className="h-5 w-5" />
                                    <span>Create Invoice</span>
                                </Button>
                            </div>
                        </Card>
                        
                        {/* KPIs & Metrics Section */}
                        <Card padding="lg" className="shadow-sm">
                            {/* ... (KPI content is unchanged) ... */}
                            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                                <h2 className="text-xl font-bold text-gray-800">Metrics</h2>
                                <div className="flex flex-wrap gap-2">
                                    <Button size="sm" variant={activeFilter === 'week' ? 'primary' : 'ghost'} onClick={() => setActiveFilter('week')}>1 Week</Button>
                                    <Button size="sm" variant={activeFilter === 'month' ? 'primary' : 'ghost'} onClick={() => setActiveFilter('month')}>1 Month</Button>
                                    <Button size="sm" variant={activeFilter === 'year' ? 'primary' : 'ghost'} onClick={() => setActiveFilter('year')}>1 Year</Button>
                                    <Button size="sm" variant={activeFilter === 'custom' ? 'primary' : 'ghost'} onClick={() => setActiveFilter('custom')}>Custom</Button>
                                </div>
                            </div>
                            
                            {activeFilter === 'custom' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <Label htmlFor="startDate">Start Date</Label>
                                        <Input 
                                            type="date" 
                                            id="startDate" 
                                            value={customRange.start}
                                            onChange={(e) => setCustomRange(prev => ({...prev, start: e.target.value}))}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="endDate">End Date</Label>
                                        <Input 
                                            type="date" 
                                            id="endDate" 
                                            value={customRange.end}
                                            onChange={(e) => setCustomRange(prev => ({...prev, end: e.target.value}))}
                                        />
                                    </div>
                                </div>
                            )}

                            {kpiLoading ? (
                                <div className="flex items-center justify-center min-h-[200px]">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                </div>
                            ) : kpiError ? (
                                <div className="text-center min-h-[200px] flex items-center justify-center text-red-600">
                                    <p>{kpiError}</p>
                                </div>
                            ) : kpiData ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {renderKpiCard(
                                        "Total Revenue", 
                                        kpiData.totalRevenue, 
                                        <FileText className="h-4 w-4" />, 
                                        true
                                    )}
                                    {renderKpiCard(
                                        "New Patients", 
                                        kpiData.newPatients,
                                        <Users className="h-4 w-4" />
                                    )}
                                    {renderKpiCard(
                                        "Total Invoices",
                                        kpiData.totalInvoices,
                                        <FileStack className="h-4 w-4" />
                                    )}
                                    <Card padding="md" className="flex flex-col gap-1 shadow-sm">
                                        <p className="text-base font-medium text-gray-500 flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4" /> Total Appointments
                                        </p>
                                        <p className="text-3xl font-bold text-gray-900">
                                            {kpiData.appointments.total}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {kpiData.appointments.confirmed} Confirmed, {kpiData.appointments.canceled} Canceled
                                        </p>
                                    </Card>
                                </div>
                            ) : null}
                        </Card>

                        
                    </div>

                    {/* Sidebar - 1 column */}
                    <div className="lg:col-span-1">
                        {/* ... (Sidebar content is unchanged) ... */}
                        <Card padding="lg" className="h-full shadow-sm">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Notifications Center</h2>
                            <div className="space-y-3">
                                <div className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <Calendar className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800">Notification Centre (YTA)</p>
                                            <p className="text-xs text-gray-500 mt-1">10 mins ago</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* --- MODALS --- */}
            
            {activeModal === 'patient' && clinicId && (
                <RegisterPatientModal
                    clinicId={clinicId}
                    onClose={closeModal}
                />
            )}

            {activeModal === 'invoice' && clinicId && (
                <CreateInvoiceModal
                    clinicId={clinicId}
                    onClose={closeModal}
                />
            )}

            {activeModal === 'appointment' && clinicId && (
                <NewAppointmentModal
                    onClose={closeModal}
                    onRefreshList={() => {}} // No list to refresh on this page
                    clinicId={clinicId}
                    clinicTimezone={clinicTimezone}
                    // --- THE FIX ---
                    doctors={doctors}
                    patients={patients}
                />
            )}
        </ClinicDashboardLayout>
    );
}