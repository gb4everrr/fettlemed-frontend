'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/hooks';
import Link from 'next/link';
import api from '@/services/api';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';

interface ClinicInfo {
  id: number;
  name: string;
  address: string;
}

interface DoctorInfo {
    firstName: string;
    lastName: string;
}

interface DashboardStats {
  clinics: ClinicInfo[];
  upcomingAppointmentsCount: number;
  uniquePatientsCount: number;
  doctor: DoctorInfo; 
}

export default function DoctorDashboardPage() {
    const { user } = useAppSelector((state) => state.auth);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const { data } = await api.get<DashboardStats>('/doctor/dashboard-stats');
                setStats(data);
            } catch (err) {
                console.error("Failed to fetch doctor dashboard stats:", err);
                setError("Could not load dashboard data. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    if (!user) {
        return null;
    }

    if (isLoading) {
        return (
            <DoctorDashboardLayout>
                <div className="p-6 md:p-8">
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </DoctorDashboardLayout>
        );
    }
    
    if (error) {
        return (
            <DoctorDashboardLayout>
                <div className="p-6 md:p-8">
                    <p className="text-red-500">{error}</p>
                </div>
            </DoctorDashboardLayout>
        );
    }

    // Determine the name from the API response and format the header text
    const doctorName = stats?.doctor?.lastName || user.lastName;
    const headerText = `Welcome, Dr. ${doctorName}!`;

    return (
        // Pass the formatted header text up to the layout component
        <DoctorDashboardLayout headerText={headerText}>
            <div className="p-6 md:p-8">
                {/* This h1 is now a simple title, as the welcome message is in the navbar */}
                <h1 className="text-3xl font-bold text-gray-800 mb-6 font-inter">
                    Dashboard Overview
                </h1>
                <p className="text-gray-500 text-sm font-inter mb-8">
                    Here's a summary of your activities across all clinics.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card padding="md" className="flex flex-col items-start bg-blue-50">
                        <h3 className="text-lg font-semibold text-800 mb-2">Upcoming Appointments</h3>
                        <p className="text-4xl font-bold text-900">{stats?.upcomingAppointmentsCount ?? 0}</p>
                        <p className="text-700 text-sm mt-1">Total scheduled appointments.</p>
                        <Link href="/doctor/dashboard/appointments" passHref>
                            <Button variant="ghost" size="sm" className="mt-4 text-600 hover:bg-blue-100">
                                View Appointments &rarr;
                            </Button>
                        </Link>
                    </Card>
                    <Card padding="md" className="flex flex-col items-start bg-green-50">
                        <h3 className="text-lg font-semibold text-800 mb-2">My Patients</h3>
                        <p className="text-4xl font-bold text-900">{stats?.uniquePatientsCount ?? 0}</p>
                        <p className="text-700 text-sm mt-1">Unique patients in upcoming schedule.</p>
                         <Link href="/doctor/dashboard/patients" passHref>
                            <Button variant="ghost" size="sm" className="mt-4 text-600 hover:bg-green-100">
                                View Patients &rarr;
                            </Button>
                        </Link>
                    </Card>
                    <Card padding="md" className="flex flex-col items-start bg-purple-50">
                         <h3 className="text-lg font-semibold text-800 mb-2">My Clinics</h3>
                        <p className="text-4xl font-bold text-900">{stats?.clinics.length ?? 0}</p>
                        <p className="text-700 text-sm mt-1">Actively associated clinics.</p>
                        <Link href="/doctor/dashboard/clinics" passHref>
                             <Button variant="ghost" size="sm" className="mt-4 text-600 hover:bg-purple-100">
                                View Clinics &rarr;
                            </Button>
                        </Link>
                    </Card>
                </div>
                
                <div className="mt-10">
                    <h2 className="text-2xl font-bold text-gray-700 mb-4">Your Associated Clinics</h2>
                    {stats && stats.clinics.length > 0 ? (
                        <div className="space-y-4">
                            {stats.clinics.map(clinic => (
                                <Card key={clinic.id} padding="md" className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-gray-800">{clinic.name}</p>
                                        <p className="text-sm text-gray-500">{clinic.address}</p>
                                    </div>
                                    <Button variant="outline" size="sm">View Details</Button>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">You are not currently associated with any clinics.</p>
                    )}
                </div>
            </div>
        </DoctorDashboardLayout>
    );
}

