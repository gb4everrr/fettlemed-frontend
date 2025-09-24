'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/services/api';
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { CheckCircle, XCircle, Search } from 'lucide-react';
import { useRouter } from 'next/navigation'; // <-- 1. Import useRouter

// --- Interfaces ---
interface PatientDetails {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    clinicName: string;
    completedAppointments: number;
    hasUpcomingAppointment: boolean;
}

// --- Main Component ---
export default function MyPatientsPage() {
    const [patients, setPatients] = useState<PatientDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [clinicFilter, setClinicFilter] = useState('all');
    const [upcomingFilter, setUpcomingFilter] = useState('all');
    const router = useRouter(); // <-- 2. Initialize the router

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const { data } = await api.get<PatientDetails[]>('/doctor/my-patients-details');
                setPatients(data || []);
            } catch (err) {
                console.error("Error fetching patients:", err);
                setError('Failed to load your patients. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPatients();
    }, []);

    const uniqueClinics = useMemo(() => {
        const clinics = new Set(patients.map(p => p.clinicName));
        return ['all', ...Array.from(clinics)];
    }, [patients]);

    const filteredPatients = useMemo(() => {
        return patients.filter(patient => {
            if (clinicFilter !== 'all' && patient.clinicName !== clinicFilter) return false;
            if (upcomingFilter === 'yes' && !patient.hasUpcomingAppointment) return false;
            if (upcomingFilter === 'no' && patient.hasUpcomingAppointment) return false;
            const search = searchTerm.toLowerCase();
            const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
            return fullName.includes(search) || patient.email?.toLowerCase().includes(search) || patient.phone?.toLowerCase().includes(search);
        });
    }, [patients, searchTerm, clinicFilter, upcomingFilter]);

    const renderContent = () => {
        if (isLoading) return <div className="flex justify-center mt-8"><LoadingSpinner /></div>;
        if (error) return <p className="text-center text-red-500 mt-8">{error}</p>;
        if (filteredPatients.length === 0) return <p className="text-center text-gray-500 mt-8">No patients found.</p>;
        
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Completed Appts</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Upcoming</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredPatients.map(patient => (
                            // 3. Add onClick, cursor-pointer and remove the Link from the <td> below
                            <tr 
                                key={patient.id} 
                                className="hover:bg-gray-100 cursor-pointer transition-colors duration-150"
                                onClick={() => router.push(`/doctor/dashboard/patients/${patient.id}`)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {/* The Link component is removed from here */}
                                    <div className="text-sm font-medium text-gray-900">
                                        {patient.firstName} {patient.lastName}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{patient.email}</div>
                                    <div className="text-sm text-gray-500">{patient.phone}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.clinicName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{patient.completedAppointments}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    {patient.hasUpcomingAppointment ? <CheckCircle className="h-5 w-5 text-green-500 mx-auto" /> : <XCircle className="h-5 w-5 text-red-500 mx-auto" />}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <DoctorDashboardLayout headerText="My Patients">
            <div className="p-6 md:p-8 font-inter">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Patient List</h1>
                <Card padding="lg" className="mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input id="search" type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                        </div>
                        <select id="clinic-filter" value={clinicFilter} onChange={e => setClinicFilter(e.target.value)} className="h-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            {uniqueClinics.map(clinic => <option key={clinic} value={clinic}>{clinic === 'all' ? 'All Clinics' : clinic}</option>)}
                        </select>
                        <select id="upcoming-filter" value={upcomingFilter} onChange={e => setUpcomingFilter(e.target.value)} className="h-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <option value="all">Any Upcoming Status</option>
                            <option value="yes">Has Upcoming</option>
                            <option value="no">No Upcoming</option>
                        </select>
                    </div>
                </Card>
                {renderContent()}
            </div>
        </DoctorDashboardLayout>
    );
}