'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/services/api';
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// --- Interfaces ---
interface DetailedAppointment {
    id: number;
    datetime_start: string; // Now properly formatted as UTC ISO string from backend
    datetime_end: string;   // Now properly formatted as UTC ISO string from backend
    reason: string | null;
    status: number;
    patient: {
        first_name: string;
        last_name: string;
    } | null;
    appointment_slot: {
        start_time: string; // Now properly formatted as UTC ISO string from backend
        end_time: string;   // Now properly formatted as UTC ISO string from backend
    } | null;
    clinic: {
        name: string;
    } | null;
}

type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'unknown';

// --- Helper Functions ---

/**
 * Maps a numeric status from the API to a readable string.
 */
const mapStatusToString = (status: number): AppointmentStatus => {
    switch (status) {
        case 0: return 'scheduled';
        case 1: return 'completed';
        case 2: return 'cancelled';
        case 3: return 'no-show';
        default: return 'unknown';
    }
};

/**
 * FIXED: Formats a UTC ISO date string to user's local timezone
 * @param utcIsoString A UTC ISO string like "2025-09-21T08:30:00.000Z"
 * @returns Formatted date string in user's local time
 */
const formatDate = (utcIsoString: string): string => {
    if (!utcIsoString) return 'Invalid Date';
    
    try {
        const date = new Date(utcIsoString);
        
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        // Convert to user's local timezone automatically
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
};

/**
 * FIXED: Formats a UTC ISO time string to user's local timezone
 * @param utcIsoString A UTC ISO string like "2025-09-21T08:30:00.000Z"
 * @returns Formatted time string in user's local time
 */
const formatTime = (utcIsoString: string): string => {
    if (!utcIsoString) return 'Invalid Time';
    
    try {
        const time = new Date(utcIsoString);

        if (isNaN(time.getTime())) {
            return 'Invalid Time';
        }

        // Convert to user's local timezone automatically
        return time.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch (error) {
        console.error('Error formatting time:', error);
        return 'Invalid Time';
    }
};

/**
 * Alternative: Format to specific timezone (clinic timezone)
 */
const formatTimeToTimezone = (utcIsoString: string, timeZone: string = 'Asia/Kolkata'): string => {
    if (!utcIsoString) return 'Invalid Time';
    
    try {
        const time = new Date(utcIsoString);

        if (isNaN(time.getTime())) {
            return 'Invalid Time';
        }

        return time.toLocaleTimeString(undefined, {
            timeZone: timeZone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch (error) {
        console.error('Error formatting time to timezone:', error);
        return 'Invalid Time';
    }
};

/**
 * Format full datetime with timezone info
 */
const formatFullDateTime = (utcIsoString: string, timeZone?: string): string => {
    if (!utcIsoString) return 'Invalid DateTime';
    
    try {
        const date = new Date(utcIsoString);
        
        if (isNaN(date.getTime())) {
            return 'Invalid DateTime';
        }

        const options: Intl.DateTimeFormatOptions = {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        };

        if (timeZone) {
            options.timeZone = timeZone;
        }

        return date.toLocaleString(undefined, options);
    } catch (error) {
        console.error('Error formatting full datetime:', error);
        return 'Invalid DateTime';
    }
};

/**
 * Gets Tailwind CSS classes for status chips
 */
const getStatusChipColor = (status: AppointmentStatus): string => {
    switch (status) {
        case 'scheduled': return 'bg-blue-100 text-blue-800';
        case 'completed': return 'bg-green-100 text-green-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        case 'no-show': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

// --- Main Component ---
export default function MyAppointmentsPage() {
    const [appointments, setAppointments] = useState<DetailedAppointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
    const [dateFilter, setDateFilter] = useState('');

    // --- Data Fetching ---
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                setError(null);
                const { data } = await api.get<DetailedAppointment[]>('/doctor/my-appointments-details');
                console.log('Fetched appointments:', data); // Debug log
                setAppointments(data || []);
            } catch (err: any) {
                console.error("Error fetching appointments:", err);
                setError(err.response?.data?.error || 'Failed to load your appointments. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAppointments();
    }, []);

    // --- Filtering Logic ---
    const filteredAppointments = useMemo(() => {
        return appointments.filter(appt => {
            const statusString = mapStatusToString(appt.status);
            
            // Status filter
            if (statusFilter !== 'all' && statusString !== statusFilter) return false;
            
            // Date filter - compare dates in user's local timezone
            if (dateFilter && appt.datetime_start) {
                try {
                    const apptDate = new Date(appt.datetime_start);
                    const filterDate = new Date(dateFilter);
                    
                    // Compare just the date parts (ignore time)
                    const apptDateStr = apptDate.toISOString().split('T')[0];
                    const filterDateStr = filterDate.toISOString().split('T')[0];
                    
                    if (apptDateStr !== filterDateStr) return false;
                } catch (error) {
                    console.error('Date filtering error:', error);
                    return true; // Include the appointment if date parsing fails
                }
            }

            // Text search filter
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                const patientName = `${appt.patient?.first_name || ''} ${appt.patient?.last_name || ''}`.toLowerCase();
                const clinicName = (appt.clinic?.name || '').toLowerCase();
                const reason = (appt.reason || '').toLowerCase();
                
                if (!patientName.includes(search) && !clinicName.includes(search) && !reason.includes(search)) {
                    return false;
                }
            }

            return true;
        });
    }, [appointments, searchTerm, statusFilter, dateFilter]);

    // --- Render Logic ---
    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center mt-8"><LoadingSpinner /></div>;
        }
        if (error) {
            return (
                <div className="text-center mt-8">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Retry
                    </button>
                </div>
            );
        }
        if (filteredAppointments.length === 0) {
            return <p className="text-center text-gray-500 mt-8">No appointments found matching your criteria.</p>;
        }
        return (
            <div className="space-y-4">
                {filteredAppointments.map(appt => {
                    const statusString = mapStatusToString(appt.status);
                    return (
                        <Card key={appt.id} padding="md" className="flex flex-col md:flex-row justify-between items-start md:items-center hover:shadow-md transition-shadow">
                            <div className="flex-grow">
                                <p className="text-lg font-bold text-gray-800">
                                    {`${appt.patient?.first_name ?? 'N/A'} ${appt.patient?.last_name ?? ''}`}
                                </p>
                                <p className="text-sm text-gray-600">at {appt.clinic?.name ?? 'N/A'}</p>
                                {appt.reason && <p className="text-xs text-gray-500 mt-1">Reason: {appt.reason}</p>}
                            </div>
                            <div className="flex flex-col items-start md:items-end mt-4 md:mt-0">
                                <p className="font-semibold text-gray-700">
                                    {formatDate(appt.datetime_start)}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {/* Use appointment slot times if available, otherwise use appointment datetime */}
                                    {appt.appointment_slot ? (
                                        <>
                                            {formatTime(appt.appointment_slot.start_time)} - {formatTime(appt.appointment_slot.end_time)}
                                        </>
                                    ) : (
                                        formatTime(appt.datetime_start)
                                    )}
                                </p>
                                {/* Optional: Show timezone info */}
                                <p className="text-xs text-gray-400">
                                    {formatFullDateTime(appt.datetime_start)}
                                </p>
                                <span className={`mt-2 px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusChipColor(statusString)}`}>
                                    {statusString.charAt(0).toUpperCase() + statusString.slice(1)}
                                </span>
                            </div>
                        </Card>
                    );
                })}
            </div>
        );
    };

    return (
        <DoctorDashboardLayout headerText="My Appointments">
            <div className="p-6 md:p-8 font-inter">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Appointments</h1>
                
                {/* Filters */}
                <Card padding="lg" className="mb-8">
                    <h3 className="text-lg font-semibold mb-4">Filter Appointments</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            id="search"
                            type="text"
                            placeholder="Search patient, clinic, reason..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <select
                            id="status-filter"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="h-10 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Statuses</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no-show">No-Show</option>
                        </select>
                        <Input
                            id="date-filter"
                            type="date"
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            placeholder="Filter by date"
                        />
                    </div>
                    {(searchTerm || statusFilter !== 'all' || dateFilter) && (
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter('all');
                                    setDateFilter('');
                                }}
                                className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                                Clear Filters
                            </button>
                            <span className="text-xs text-gray-500 py-1">
                                Showing {filteredAppointments.length} of {appointments.length} appointments
                            </span>
                        </div>
                    )}
                </Card>

                {/* Appointments List */}
                {renderContent()}
            </div>
        </DoctorDashboardLayout>
    );
}