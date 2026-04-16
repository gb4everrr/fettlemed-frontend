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
import { CreateLabRequestModal } from '@/components/doctor/modals/CreateLabRequestModal';
import { CreateClinicalNoteModal } from '@/components/doctor/modals/CreateClinicalNoteModal';
import EditAppointmentModal from '@/components/doctor/modals/EditAppointmentModal'; 

export default function DoctorDashboardPage() {
    const { user } = useAppSelector((state: any) => state.auth);
    
    const [isLoading, setIsLoading] = useState(true);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    
    const [activeModal, setActiveModal] = useState<'note' | 'rx' | 'lab' | 'edit_appointment' | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

    const fetchAllData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [apptRes, patRes, invRes, taskRes] = await Promise.all([
                api.get('/doctor/my-appointments-details'),
                api.get('/doctor/my-patients-details'),
                api.get('/doctor/my-invoices'),
                api.get('/doctor/tasks')
            ]);

            setAppointments(Array.isArray(apptRes.data) ? apptRes.data : []);
            setPatients(Array.isArray(patRes.data) ? patRes.data : []);
            setInvoices(Array.isArray(invRes.data) ? invRes.data : []);
            setTasks(taskRes.data || []);

        } catch (err) {
            console.error("Dashboard Data Fetch Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [user]);

    const handleEditAppointment = (appt: any) => {
        setSelectedAppointment(appt);
        setActiveModal('edit_appointment');
    };

    const todaysSchedule = useMemo(() => {
        if (!appointments.length) return [];
        const today = new Date();
        return appointments.filter(appt => {
            if (!appt.datetime_start) return false;
            const apptDate = new Date(appt.datetime_start);
            return (
                apptDate.getDate() === today.getDate() &&
                apptDate.getMonth() === today.getMonth() &&
                apptDate.getFullYear() === today.getFullYear()
            );
        }).sort((a, b) => new Date(a.datetime_start).getTime() - new Date(b.datetime_start).getTime());
    }, [appointments]);

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
            <div className="p-6 mt-5 font-inter">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LEFT COLUMN */}
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

                    {/* MIDDLE COLUMN */}
                    <div className="lg:col-span-1 flex flex-col h-full min-h-[500px]">
                        <TodaysScheduleWidget 
                            appointments={todaysSchedule} 
                            onAppointmentClick={handleEditAppointment} 
                        />
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <InsightsWidget totalPatients={totalPatientsCount} totalAppts={totalApptsCount} />
                        <RevenueWidget amount={totalRevenue} />
                        <div className="flex-1">
                            <TasksWidget tasks={tasks} setTasks={setTasks} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {activeModal === 'note' && (
                <CreateClinicalNoteModal onClose={() => setActiveModal(null)} />
            )}
            {activeModal === 'rx' && (
                <CreatePrescriptionModal onClose={() => setActiveModal(null)} />
            )}
            {activeModal === 'lab' && (
                <CreateLabRequestModal onClose={() => setActiveModal(null)} />
            )}
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
        </DoctorDashboardLayout>
    );
}