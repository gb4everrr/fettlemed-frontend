'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/services/api';
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { Stethoscope, Pill, HeartPulse } from 'lucide-react';

// --- Interfaces ---
interface Patient { id: number; first_name: string; last_name: string; email: string; phone_number: string; address: string; emergency_contact: string; }
interface ConsultationNote { id: number; note: string; }
interface Prescription { id: number; prescription: string; symptoms: string; final_diagnosis: string; }
interface VitalValue { vital_name: string; vital_value: string; }
interface Vital { id: number; values: VitalValue[]; }
interface Appointment {
    id: number;
    datetime_start: string;
    clinic: { name: string };
    consultation_note: ConsultationNote | null;
    prescription: Prescription | null;
    vitals: Vital[];
}
interface PatientData {
    patient: Patient;
    appointments: Appointment[];
}

// --- Main Component ---
export default function PatientViewPage() {
    const params = useParams();
    const patientId = params.patientId as string;

    const [data, setData] = useState<PatientData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    const fetchPatientData = async () => {
        if (!patientId) return;
        setIsLoading(true);
        try {
            const response = await api.get(`/doctor/patient-details/${patientId}`);
            setData(response.data);
            if (response.data.appointments && response.data.appointments.length > 0) {
                // If an appointment was already selected, find it in the new data, otherwise default to the first
                const currentSelectionId = selectedAppointment?.id;
                const newSelection = response.data.appointments.find((a: Appointment) => a.id === currentSelectionId) || response.data.appointments[0];
                setSelectedAppointment(newSelection);
            } else {
                setSelectedAppointment(null);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load patient data.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPatientData();
    }, [patientId]);
    
    if (isLoading) return <DoctorDashboardLayout headerText="Loading Patient..."><div className="flex justify-center mt-16"><LoadingSpinner /></div></DoctorDashboardLayout>;
    if (error) return <DoctorDashboardLayout headerText="Error"><p className="text-center text-red-500 mt-8">{error}</p></DoctorDashboardLayout>;
    if (!data) return null;

    return (
        <DoctorDashboardLayout headerText={`Patient: ${data.patient.first_name} ${data.patient.last_name}`}>
            <div className="p-6 md:p-8 font-inter">
                <PatientHeader patient={data.patient} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Appointment List */}
                    <div className="lg:col-span-1">
                        <h2 className="text-xl font-bold text-gray-700 mb-4">Appointment History</h2>
                        <div className="space-y-2">
                            {data.appointments.length > 0 ? (
                                data.appointments.map(appt => (
                                    <AppointmentListItem 
                                        key={appt.id} 
                                        appointment={appt}
                                        isSelected={selectedAppointment?.id === appt.id}
                                        onClick={() => setSelectedAppointment(appt)}
                                    />
                                ))
                            ) : (
                                <p className="text-gray-500">No appointments found for this patient.</p>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Details for Selected Appointment */}
                    <div className="lg:col-span-2">
                        {selectedAppointment ? (
                            <AppointmentDetails 
                                appointment={selectedAppointment} 
                                onNoteSaved={fetchPatientData}
                            />
                        ) : (
                             <Card><p className="text-center text-gray-500">Select an appointment from the list to view its details.</p></Card>
                        )}
                    </div>
                </div>
            </div>
        </DoctorDashboardLayout>
    );
}

// --- Sub-Components ---

const PatientHeader = ({ patient }: { patient: Patient }) => (
    <Card padding="lg" className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">{patient.first_name} {patient.last_name}</h1>
                <p className="text-gray-600 mt-1">{patient.email} | {patient.phone_number}</p>
            </div>
            <div className="text-left md:text-right mt-4 md:mt-0 text-sm text-gray-500">
                 <p>{patient.address}</p>
                 <p>Emergency: {patient.emergency_contact}</p>
            </div>
        </div>
    </Card>
);

const AppointmentListItem = ({ appointment, isSelected, onClick }: { appointment: Appointment, isSelected: boolean, onClick: () => void }) => {
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return (
        <button 
            onClick={onClick}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${isSelected ? 'bg-blue-100 border-blue-300 shadow-sm' : 'bg-white hover:bg-gray-50'}`}
        >
            <p className="font-semibold text-gray-800">{formatDate(appointment.datetime_start)}</p>
            <p className="text-sm text-gray-600">{appointment.clinic.name}</p>
        </button>
    );
};

const AppointmentDetails = ({ appointment, onNoteSaved }: { appointment: Appointment, onNoteSaved: () => void }) => {
    const [noteText, setNoteText] = useState(appointment.consultation_note?.note || '');
    const [isSaving, setIsSaving] = useState(false);
    
    // This effect ensures the note text updates when a new appointment is selected
    useEffect(() => {
        setNoteText(appointment.consultation_note?.note || '');
    }, [appointment]);

    const handleSaveNote = async () => {
        setIsSaving(true);
        try {
            await api.put(`/doctor/consultation-note/${appointment.id}`, { note: noteText });
            onNoteSaved(); // Re-fetch all data to get the latest state
        } catch (err) {
            console.error("Failed to save note:", err);
            // Consider adding a user-facing error message here
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-700">Details for Appointment on {new Date(appointment.datetime_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</h2>
            
            {/* Consultation Note Section */}
            <Card>
                <h3 className="font-semibold flex items-center mb-2"><Stethoscope className="h-5 w-5 mr-2" />Consultation Note</h3>
                <textarea 
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={8}
                    placeholder="Enter consultation details for this appointment..."
                />
                <div className="text-right mt-2">
                    <Button onClick={handleSaveNote} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Note'}
                    </Button>
                </div>
            </Card>

            {/* Prescription Section */}
            {appointment.prescription && (
                <Card>
                    <h3 className="font-semibold flex items-center mb-2"><Pill className="h-5 w-5 mr-2" />Prescription</h3>
                    <div className="text-sm space-y-1">
                        <p><span className="font-medium">Symptoms:</span> {appointment.prescription.symptoms}</p>
                        <p><span className="font-medium">Diagnosis:</span> {appointment.prescription.final_diagnosis}</p>
                    </div>
                    <p className="mt-3 font-medium text-gray-800">Medication:</p>
                    <pre className="mt-1 text-sm bg-gray-50 p-3 rounded-md whitespace-pre-wrap font-sans">{appointment.prescription.prescription}</pre>
                </Card>
            )}

            {/* Vitals Section */}
            {appointment.vitals && appointment.vitals.length > 0 ? (
                <Card>
                    <h3 className="font-semibold flex items-center mb-2"><HeartPulse className="h-5 w-5 mr-2" />Vitals Recorded</h3>
                    {appointment.vitals.map(vital => (
                         <ul key={vital.id} className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                            {vital.values.map((v, i) => (
                                <li key={i} className="text-sm text-gray-600">
                                    <span className="font-medium text-gray-800">{v.vital_name}:</span> {v.vital_value}
                                </li>
                            ))}
                        </ul>
                    ))}
                </Card>
            ) : <p className="text-sm text-gray-500 pl-2">No vitals were recorded for this appointment.</p>}
        </div>
    );
};

