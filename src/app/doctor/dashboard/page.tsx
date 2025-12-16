'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
import { Loader2, Activity } from 'lucide-react';

import { 
    QuickAccessWidget, 
    PatientAlertsWidget, 
    TodaysScheduleWidget, 
    InsightsWidget, 
    RevenueWidget,
    TasksWidget
} from '@/components/doctor/widgets/DashboardWidgets';

import { AddNoteModal } from '@/components/doctor/modals/AddNoteModal';
import { CreatePrescriptionModal } from '@/components/doctor/modals/CreatePrescriptionModal';
// --- IMPORT THE EDIT APPOINTMENT MODAL ---
import { EditAppointmentModal } from '@/components/doctor/modals/EditAppointmentModal'; 

export default function DoctorDashboardPage() {
    const { user } = useAppSelector((state: any) => state.auth);
    
    // --- State ---
    const [isLoading, setIsLoading] = useState(true);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    
    // UI State
    const [activeModal, setActiveModal] = useState<'note' | 'rx' | 'lab' | 'edit_appointment' | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

    // --- Mock Tasks Data ---
    const tasks = [
        { id: 1, task: 'Review lab results for J. Doe', priority: 'high', done: false },
        { id: 2, task: 'Sign pending prescriptions', priority: 'medium', done: false },
        { id: 3, task: 'Follow up with Sarah Smith', priority: 'low', done: true }
    ];

    // --- Fetch Real Data ---
    const fetchAllData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [apptRes, patRes, invRes] = await Promise.all([
                api.get('/doctor/my-appointments-details'),
                api.get('/doctor/my-patients-details'),
                api.get('/doctor/my-invoices')
            ]);

            setAppointments(Array.isArray(apptRes.data) ? apptRes.data : []);
            setPatients(Array.isArray(patRes.data) ? patRes.data : []);
            setInvoices(Array.isArray(invRes.data) ? invRes.data : []);

        } catch (err) {
            console.error("Dashboard Data Fetch Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // --- Handlers ---
    const handleEditAppointment = (appt: any) => {
        setSelectedAppointment(appt);
        setActiveModal('edit_appointment');
    };

    // --- Metrics ---

    // 1. Today's Schedule (Strict Date Logic)
    const todaysSchedule = useMemo(() => {
        if (!appointments.length) return [];
        const today = new Date();
        
        return appointments.filter(appt => {
            if (!appt.datetime_start) return false;
            const apptDate = new Date(appt.datetime_start);
            const isSameDay = 
                apptDate.getDate() === today.getDate() &&
                apptDate.getMonth() === today.getMonth() &&
                apptDate.getFullYear() === today.getFullYear();
            return isSameDay;
        }).sort((a, b) => new Date(a.datetime_start).getTime() - new Date(b.datetime_start).getTime());
    }, [appointments]);

    // 2. Total Revenue
    const totalRevenue = useMemo(() => {
        return invoices.reduce((sum, inv) => {
            const amt = parseFloat(inv.total_amount || inv.amount || 0);
            return sum + (isNaN(amt) ? 0 : amt);
        }, 0);
    }, [invoices]);

    const totalPatientsCount = patients.length;
    const totalApptsCount = appointments.length;

    if (isLoading) {
        return (
            <DoctorDashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary-brand)]" />
                </div>
            </DoctorDashboardLayout>
        );
    }

    return (
        <DoctorDashboardLayout headerText={`Good Morning, Dr. ${user?.last_name || 'Doctor'}`}>
            <div className="p-6 md:p-8 font-inter max-w-[1600px]">
                
                {/* 3 Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LEFT COLUMN: Actions & Alerts */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <div className="flex-shrink-0">
                            <QuickAccessWidget 
                                onAddNote={() => setActiveModal('note')}
                                onAddRx={() => setActiveModal('rx')}
                                onAddLab={() => setActiveModal('lab')}
                            />
                        </div>
                        <div className="flex-1 min-h-[300px]">
                            <PatientAlertsWidget alerts={[]} />
                        </div>
                    </div>

                    {/* MIDDLE COLUMN: Schedule (Interactable) */}
                    <div className="lg:col-span-1 flex flex-col h-full min-h-[500px]">
                        <TodaysScheduleWidget 
                            appointments={todaysSchedule} 
                            onAppointmentClick={handleEditAppointment} 
                        />
                    </div>

                    {/* RIGHT COLUMN: Stats & Tasks */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <InsightsWidget totalPatients={totalPatientsCount} totalAppts={totalApptsCount} />
                        <RevenueWidget totalRevenue={totalRevenue} />
                        <div className="flex-1">
                            <TasksWidget tasks={tasks} />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MODALS --- */}
            {activeModal === 'note' && <AddNoteModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'rx' && <CreatePrescriptionModal onClose={() => setActiveModal(null)} />}
            
            {/* Edit Appointment Modal */}
            {activeModal === 'edit_appointment' && selectedAppointment && (
                <EditAppointmentModal
                    appointment={selectedAppointment}
                    onClose={() => setActiveModal(null)}
                    onRefreshList={fetchAllData}
                    clinicId={selectedAppointment.clinic_id}
                    clinicName={selectedAppointment.clinic?.name || 'Clinic'}
                    clinicTimezone={selectedAppointment.clinic?.timezone || 'UTC'}
                    user={user}
                    role="doctor"
                />
            )}
            
            {activeModal === 'lab' && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setActiveModal(null)}>
                     <div className="bg-white p-8 rounded-xl shadow-xl max-w-sm text-center border border-gray-100">
                        <Activity className="h-12 w-12 text-[var(--color-primary-brand)] mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-800">Lab Request</h3>
                        <p className="text-gray-500 mt-2">This feature is currently under development.</p>
                     </div>
                </div>
            )}
        </DoctorDashboardLayout>
    );
}