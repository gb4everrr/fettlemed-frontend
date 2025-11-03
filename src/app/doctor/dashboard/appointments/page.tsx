'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/services/api';
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Filter } from 'lucide-react';
import Button from '@/components/ui/Button';

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
 * NEW: Determine actual status based on time
 */
const getActualStatus = (appointment: DetailedAppointment) => {
    const now = new Date();
    const startTime = new Date(appointment.datetime_start);
    const endTime = new Date(appointment.datetime_end);

    // If manually cancelled
    if (appointment.status === 2) {
        return { text: 'Cancelled', color: 'bg-red-100 text-red-800', key: 'cancelled' };
    }

    // If manually marked no-show
    if (appointment.status === 3) {
        return { text: 'No-Show', color: 'bg-yellow-100 text-yellow-800', key: 'no-show' };
    }

    // If manually completed
    if (appointment.status === 1) {
        return { text: 'Completed', color: 'bg-green-100 text-green-800', key: 'completed' };
    }

    // Time-based status
    if (now < startTime) {
        // Future appointment
        return { text: 'Scheduled', color: 'bg-blue-100 text-blue-800', key: 'scheduled' };
    } else if (now >= startTime && now <= endTime) {
        // Currently happening
        return { text: 'In Progress', color: 'bg-purple-100 text-purple-800', key: 'inProgress' };
    } else {
        // Past appointment (auto-completed)
        return { text: 'Completed', color: 'bg-green-100 text-green-800', key: 'completed' };
    }
};

/**
 * FIXED: Formats a UTC ISO date string to user's local timezone
 */
const formatDate = (utcIsoString: string): string => {
    if (!utcIsoString) return 'Invalid Date';
    
    try {
        const date = new Date(utcIsoString);
        
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

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
 */
const formatTime = (utcIsoString: string): string => {
    if (!utcIsoString) return 'Invalid Time';
    
    try {
        const time = new Date(utcIsoString);

        if (isNaN(time.getTime())) {
            return 'Invalid Time';
        }

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
    const [dateFilter, setDateFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // NEW: Tab and status filter states
    const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');
    const [statusFilters, setStatusFilters] = useState({
        scheduled: true,
        inProgress: true,
        completed: true,
        cancelled: true,
        noShow: true,
    });

    // NEW: Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // --- Data Fetching ---
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                setError(null);
                const { data } = await api.get<DetailedAppointment[]>('/doctor/my-appointments-details');
                console.log('Fetched appointments:', data);
                
                // Sort appointments by datetime
                const sortedAppointments = (data || []).sort((a, b) => {
                    return new Date(a.datetime_start).getTime() - new Date(b.datetime_start).getTime();
                });
                
                setAppointments(sortedAppointments);
            } catch (err: any) {
                console.error("Error fetching appointments:", err);
                setError(err.response?.data?.error || 'Failed to load your appointments. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAppointments();
    }, []);

    // Reset to page 1 when tab or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, statusFilters]);

    const toggleStatusFilter = (status: keyof typeof statusFilters) => {
        setStatusFilters(prev => ({ ...prev, [status]: !prev[status] }));
    };

    // --- Filtering Logic ---
    const getFilteredAppointments = () => {
        const now = new Date();
        
        let filtered = appointments;

        // Tab filtering
        if (activeTab === 'active') {
            filtered = appointments.filter(apt => {
                const endTime = new Date(apt.datetime_end);
                return endTime >= now && apt.status !== 2; // Not past and not cancelled
            });
        } else if (activeTab === 'completed') {
            filtered = appointments.filter(apt => {
                const endTime = new Date(apt.datetime_end);
                return endTime < now || apt.status === 2 || apt.status === 1 || apt.status === 3;
            });
        }

        // Status filtering
        filtered = filtered.filter(apt => {
            const status = getActualStatus(apt);
            return statusFilters[status.key as keyof typeof statusFilters];
        });

        // Date filter - compare dates in user's local timezone
        if (dateFilter) {
            filtered = filtered.filter(apt => {
                try {
                    const apptDate = new Date(apt.datetime_start);
                    const filterDate = new Date(dateFilter);
                    
                    const apptDateStr = apptDate.toISOString().split('T')[0];
                    const filterDateStr = filterDate.toISOString().split('T')[0];
                    
                    return apptDateStr === filterDateStr;
                } catch (error) {
                    console.error('Date filtering error:', error);
                    return true;
                }
            });
        }

        // Text search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(apt => {
                const patientName = `${apt.patient?.first_name || ''} ${apt.patient?.last_name || ''}`.toLowerCase();
                const clinicName = (apt.clinic?.name || '').toLowerCase();
                const reason = (apt.reason || '').toLowerCase();
                
                return patientName.includes(search) || clinicName.includes(search) || reason.includes(search);
            });
        }

        return filtered;
    };

    const filteredAppointments = getFilteredAppointments();

    // Pagination
    const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

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
        if (paginatedAppointments.length === 0) {
            return <p className="text-center text-gray-500 mt-8">No appointments found matching your criteria.</p>;
        }
        return (
            <>
                <div className="space-y-4">
                    {paginatedAppointments.map(appt => {
                        const statusTag = getActualStatus(appt);
                        return (
                            <Card key={appt.id} padding="md" className="flex flex-col md:flex-row justify-between items-start md:items-center hover:shadow-md transition-shadow">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className="text-lg font-bold text-gray-800">
                                            {`${appt.patient?.first_name ?? 'N/A'} ${appt.patient?.last_name ?? ''}`}
                                        </p>
                                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusTag.color}`}>
                                            {statusTag.text}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">at {appt.clinic?.name ?? 'N/A'}</p>
                                    {appt.reason && <p className="text-xs text-gray-500 mt-1">Reason: {appt.reason}</p>}
                                </div>
                                <div className="flex flex-col items-start md:items-end mt-4 md:mt-0">
                                    <p className="font-semibold text-gray-700">
                                        {formatDate(appt.datetime_start)}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {appt.appointment_slot ? (
                                            <>
                                                {formatTime(appt.appointment_slot.start_time)} - {formatTime(appt.appointment_slot.end_time)}
                                            </>
                                        ) : (
                                            formatTime(appt.datetime_start)
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {formatFullDateTime(appt.datetime_start)}
                                    </p>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                        <div className="text-sm text-gray-700">
                            Showing {startIndex + 1} to {Math.min(endIndex, filteredAppointments.length)} of {filteredAppointments.length} results
                        </div>
                        <div className="flex space-x-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={currentPage === pageNum ? 'primary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setCurrentPage(pageNum)}
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <DoctorDashboardLayout headerText="My Appointments">
            <div className="p-6 md:p-8 font-inter">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Appointments</h1>
                
                {/* Combined Tabs and Filters */}
                <Card className="mb-6 shadow-md">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 gap-4 border-b border-gray-200">
                        {/* Tabs on the left */}
                        <nav className="flex space-x-6">
                            <button
                                onClick={() => setActiveTab('active')}
                                className={`whitespace-nowrap pb-2 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'active'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Active
                            </button>
                            <button
                                onClick={() => setActiveTab('completed')}
                                className={`whitespace-nowrap pb-2 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'completed'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Completed
                            </button>
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`whitespace-nowrap pb-2 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'all'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                All
                            </button>
                        </nav>

                        {/* Status filters on the right */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => toggleStatusFilter('scheduled')}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                    statusFilters.scheduled
                                        ? 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                                        : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                                }`}
                            >
                                Scheduled
                            </button>
                            <button
                                onClick={() => toggleStatusFilter('inProgress')}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                    statusFilters.inProgress
                                        ? 'bg-purple-100 text-purple-800 border-2 border-purple-500'
                                        : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                                }`}
                            >
                                In Progress
                            </button>
                            <button
                                onClick={() => toggleStatusFilter('completed')}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                    statusFilters.completed
                                        ? 'bg-green-100 text-green-800 border-2 border-green-500'
                                        : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                                }`}
                            >
                                Completed
                            </button>
                            <button
                                onClick={() => toggleStatusFilter('cancelled')}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                    statusFilters.cancelled
                                        ? 'bg-red-100 text-red-800 border-2 border-red-500'
                                        : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                                }`}
                            >
                                Cancelled
                            </button>
                            <button
                                onClick={() => toggleStatusFilter('noShow')}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                    statusFilters.noShow
                                        ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-500'
                                        : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                                }`}
                            >
                                No-Show
                            </button>
                        </div>
                    </div>

                    {/* Collapsible additional filters */}
                    <div className="p-4">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center text-sm text-gray-600 hover:text-gray-800 font-medium"
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            {showFilters ? 'Hide' : 'Show'} Additional Filters
                        </button>
                        
                        {showFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                                    <Input
                                        id="search"
                                        type="text"
                                        placeholder="Search patient, clinic, reason..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                                    <Input
                                        id="date-filter"
                                        type="date"
                                        value={dateFilter}
                                        onChange={e => setDateFilter(e.target.value)}
                                        placeholder="Filter by date"
                                    />
                                </div>
                            </div>
                        )}

                        {(searchTerm || dateFilter) && (
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setDateFilter('');
                                    }}
                                    className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                >
                                    Clear Additional Filters
                                </button>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Appointments count */}
                <div className="mb-4">
                    <p className="text-sm text-gray-600">
                        Showing {filteredAppointments.length} {activeTab === 'active' ? 'active' : activeTab === 'completed' ? 'completed' : ''} appointment{filteredAppointments.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Appointments List */}
                {renderContent()}
            </div>
        </DoctorDashboardLayout>
    );
}