// src/app/clinic-admin/dashboard/doctors/[id]/availability-calendar.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Interfaces to match the backend models
interface DoctorAvailability {
    id: number;
    clinic_doctor_id: number;
    clinic_id: number;
    weekday: string;
    start_time: string;
    end_time: string;
    active: boolean;
}

interface AvailabilityException {
    id: number;
    clinic_doctor_id: number;
    clinic_id: number;
    date: string;
    is_available: boolean;
    note?: string;
}

// Helper to convert time string (HH:mm:ss or HH:mm) to minutes since midnight
const timeToMinutes = (time: string) => {
    const parts = time.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return hours * 60 + minutes;
};

// Helper to convert minutes since midnight to time string (HH:mm:ss)
const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
};

// Helper to format hour to 12-hour format
const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
};

export default function DoctorAvailabilityCalendar() {
    const router = useRouter();
    const params = useParams();
    const doctorId = parseInt(params.id as string, 10);
    const { user } = useAppSelector((state) => state.auth);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [doctorName, setDoctorName] = useState<string>('');
    const [showInstructions, setShowInstructions] = useState(false);

    // State for the calendar grid, a 2D array of booleans (true for selected)
    const [calendarGrid, setCalendarGrid] = useState<boolean[][]>([]);
    // State for the raw fetched data
    const [regularAvailability, setRegularAvailability] = useState<DoctorAvailability[]>([]);
    const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);

    // State for the "painting" functionality
    const [isPainting, setIsPainting] = useState(false);
    const [paintValue, setPaintValue] = useState<boolean>(false);
    const isPaintingRef = useRef(false);
    const paintValueRef = useRef(false);

    // Ref for the scrollable container
    const gridScrollRef = useRef<HTMLDivElement>(null);

    // Initialize the calendar grid with default state
    useEffect(() => {
        const rows = 24 * 4; // 24 hours * 4 quarters per hour = 96 rows
        const cols = 7;      // 7 days
        const newGrid = Array(rows).fill(null).map(() => Array(cols).fill(false));
        setCalendarGrid(newGrid);
    }, []);

    // Scroll to 7 AM after grid is rendered
    useEffect(() => {
        if (gridScrollRef.current && calendarGrid.length > 0) {
            setTimeout(() => {
                const rowHeight = 20; // Height of each 15-minute row in pixels
                const scrollToRow = 7 * 4; // 7 AM = 7 hours * 4 quarters/hour = 28th row
                if (gridScrollRef.current) {
                    gridScrollRef.current.scrollTop = scrollToRow * rowHeight;
                }
            }, 100);
        }
    }, [calendarGrid.length]);

    // Fetch data and populate the grid
    useEffect(() => {
        if (!user || !user.clinics || user.clinics.length === 0) {
            router.push('/auth/login');
            return;
        }
        const clinicId = user.clinics[0].id;

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch doctor info first
                try {
                    const doctorRes = await api.get(`/clinic-user/clinic-doctor/${doctorId}`, {
                        params: { clinic_id: clinicId }
                    });
                    setDoctorName(`${doctorRes.data.first_name} ${doctorRes.data.last_name}` || 'Unknown Doctor');
                } catch (doctorErr) {
                    console.warn('Could not fetch doctor name:', doctorErr);
                    setDoctorName('Doctor');
                }

                // UPDATED: Use clinic_doctor_id instead of doctor_profile_id
                const availabilityRes = await api.get('/availability/availability', {
                    params: { clinic_doctor_id: doctorId, clinic_id: clinicId }
                });
                setRegularAvailability(availabilityRes.data);

                // UPDATED: Use clinic_doctor_id instead of doctor_profile_id
                const exceptionsRes = await api.get('/availability/exception', {
                    params: { clinic_doctor_id: doctorId, clinic_id: clinicId }
                });
                setExceptions(exceptionsRes.data);

                // Populate the calendar grid based on fetched data
                const newGrid = Array(24 * 4).fill(null).map(() => Array(7).fill(false));
                
                // Populate with regular availability
                availabilityRes.data.forEach((slot: DoctorAvailability) => {
                    const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(slot.weekday);
                    if (dayIndex !== -1) {
                        const startRow = Math.floor(timeToMinutes(slot.start_time) / 15);
                        const endRow = Math.floor(timeToMinutes(slot.end_time) / 15);
                        for (let i = startRow; i < endRow; i++) {
                            if (i >= 0 && i < newGrid.length) {
                                newGrid[i][dayIndex] = true;
                            }
                        }
                    }
                });

                setCalendarGrid(newGrid);

            } catch (err: any) {
                console.error('Failed to fetch doctor data:', err);
                const errorMessage = err.response?.data?.error || 'Failed to load schedule. Please try again.';
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [doctorId, user, router]);

    // Handle mouse down event to start painting
    const handleMouseDown = (rowIndex: number, colIndex: number) => {
        setIsPainting(true);
        isPaintingRef.current = true;
        setPaintValue(!calendarGrid[rowIndex][colIndex]);
        paintValueRef.current = !calendarGrid[rowIndex][colIndex];
        const newGrid = calendarGrid.map(row => [...row]);
        newGrid[rowIndex][colIndex] = paintValueRef.current;
        setCalendarGrid(newGrid);
    };

    // Handle mouse enter event to continue painting
    const handleMouseEnter = (rowIndex: number, colIndex: number) => {
        if (isPaintingRef.current) {
            const newGrid = calendarGrid.map(row => [...row]);
            newGrid[rowIndex][colIndex] = paintValueRef.current;
            setCalendarGrid(newGrid);
        }
    };

    // Handle mouse up event to stop painting
    const handleMouseUp = () => {
        setIsPainting(false);
        isPaintingRef.current = false;
    };

    // Handle form submission
    const handleSubmit = async () => {
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        const clinicId = user?.clinics?.[0]?.id;
        if (!clinicId) {
            setError('User is not associated with a clinic.');
            setIsSaving(false);
            return;
        }

        try {
            // Convert the grid back into availability slots
            const newAvailability: any[] = [];
            
            const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const day = weekdays[dayIndex];
                let currentStart = -1;
                
                for (let rowIndex = 0; rowIndex < calendarGrid.length; rowIndex++) {
                    const isAvailable = calendarGrid[rowIndex][dayIndex];
                    
                    if (isAvailable && currentStart === -1) {
                        // Start of a new availability block
                        currentStart = rowIndex * 15;
                    } else if (!isAvailable && currentStart !== -1) {
                        // End of an availability block
                        const startTime = minutesToTime(currentStart);
                        const endTime = minutesToTime(rowIndex * 15);
                        
                        // Only add if the time slot makes sense (start < end)
                        if (currentStart < rowIndex * 15) {
                            newAvailability.push({
                                clinic_doctor_id: doctorId,
                                clinic_id: clinicId,
                                weekday: day,
                                start_time: startTime,
                                end_time: endTime
                            });
                        }
                        currentStart = -1;
                    }
                }
                
                // Handle case where availability extends to end of day
                if (currentStart !== -1) {
                    const startTime = minutesToTime(currentStart);
                    // End at 23:45 (last 15-minute slot of the day) instead of 23:59
                    const endTime = "23:45:00";
                    newAvailability.push({
                        clinic_doctor_id: doctorId,
                        clinic_id: clinicId,
                        weekday: day,
                        start_time: startTime,
                        end_time: endTime
                    });
                }
            }

            console.log('User info:', { 
                userId: user?.id, 
                clinicId: clinicId, 
                doctorId: doctorId 
            });
            console.log('Submitting availability data:', newAvailability);

            // Delete existing availability records first
            if (regularAvailability.length > 0) {
                console.log('Deleting existing availability records...');
                for (const slot of regularAvailability) {
                    try {
                        await api.delete(`/availability/availability/${slot.id}`, {
                            params: {
                                clinic_doctor_id: doctorId,
                                clinic_id: clinicId
                            }
                        });
                    } catch (deleteError: any) {
                        console.warn('Error deleting slot:', slot.id, deleteError.response?.data);
                        // Continue with other deletions even if one fails
                    }
                }
            }
            
            // Create new availability records
            if (newAvailability.length > 0) {
                console.log('Creating new availability records...');
                for (const slot of newAvailability) {
                    // Validate the data before sending
                    if (!slot.clinic_doctor_id || !slot.clinic_id || !slot.weekday || !slot.start_time || !slot.end_time) {
                        console.error('Invalid slot data:', slot);
                        throw new Error(`Invalid slot data: ${JSON.stringify(slot)}`);
                    }
                    
                    // Additional validation for time format
                    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
                    if (!timeRegex.test(slot.start_time) || !timeRegex.test(slot.end_time)) {
                        console.error('Invalid time format:', slot);
                        throw new Error(`Invalid time format in slot: ${JSON.stringify(slot)}`);
                    }
                    
                    try {
                        console.log('Creating slot:', slot);
                        const response = await api.post('/availability/availability', slot);
                        console.log('Slot created successfully:', response.data);
                    } catch (slotError: any) {
                        console.error('Error creating slot:', slot);
                        console.error('Server response:', slotError.response?.data);
                        console.error('Error status:', slotError.response?.status);
                        
                        // More detailed error message
                        let errorMsg = 'Failed to create availability slot';
                        if (slotError.response?.data?.error) {
                            errorMsg += `: ${slotError.response.data.error}`;
                        } else if (slotError.response?.status === 403) {
                            errorMsg += ': Unauthorized. Please check if you have permission to modify this doctor\'s schedule.';
                        } else if (slotError.response?.status === 400) {
                            errorMsg += ': Invalid data. Please check the time format and doctor/clinic information.';
                        }
                        
                        throw new Error(errorMsg);
                    }
                }
            }

            setSuccessMessage('Schedule updated successfully!');
            
            // Refresh the data
            setTimeout(async () => {
                try {
                    const availabilityRes = await api.get('/availability/availability', {
                        params: { clinic_doctor_id: doctorId, clinic_id: clinicId }
                    });
                    setRegularAvailability(availabilityRes.data);
                } catch (refreshErr) {
                    console.warn('Could not refresh availability data:', refreshErr);
                }
            }, 500);

        } catch (err: any) {
            console.error('Failed to update schedule:', err);
            console.error('Error response:', err.response?.data);
            const errorMessage = err.response?.data?.error || err.message || 'Failed to update schedule. Please try again.';
            setError(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };
    
    // Render loading spinner while data is being fetched
    if (isLoading) {
        return <ClinicDashboardLayout><LoadingSpinner /></ClinicDashboardLayout>;
    }

    // Render error message if fetching fails
    if (error && !calendarGrid.length) {
        return (
            <ClinicDashboardLayout>
                <div className="text-center p-8">
                    <div className="text-red-600 mb-4">{error}</div>
                    <Button 
                        variant="secondary" 
                        onClick={() => router.back()}
                    >
                        Go Back
                    </Button>
                </div>
            </ClinicDashboardLayout>
        );
    }

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return (
        <ClinicDashboardLayout>
            <div className="p-6 md:p-8 font-inter">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">
                            Dr. {doctorName}'s Weekly Schedule
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-gray-600">Set recurring weekly availability. Click and drag to set available times.</p>
                            <button
                                onClick={() => setShowInstructions(!showInstructions)}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Show/hide instructions"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex mt-4 md:mt-0 space-x-3">
                        <Link href={`/clinic-admin/dashboard/doctors/${doctorId}/availability-exceptions`}>
                            <Button variant="secondary" size="md">
                                Set Exceptions
                            </Button>
                        </Link>
                        <Link href={`/clinic-admin/dashboard/doctors/${doctorId}`}>
                            <Button variant="secondary" size="md">
                                Cancel
                            </Button>
                        </Link>
                        <Button 
                            variant="primary" 
                            size="md" 
                            disabled={isSaving}
                            onClick={handleSubmit}
                            shine
                        >
                            {isSaving ? 'Saving...' : 'Save Schedule'}
                        </Button>
                    </div>
                </div>

                {/* Success and Error Messages */}
                {successMessage && (
                    <div className="bg-green-100 text-green-700 p-4 rounded-lg text-sm mb-4">
                        {successMessage}
                    </div>
                )}
                {error && (
                    <div className="bg-red-100 text-red-700 p-4 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                {/* Instructions */}
                {showInstructions && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-blue-800 mb-2">How to use:</h3>
                        <ul className="text-blue-700 text-sm space-y-1">
                            <li>• Click and drag to select recurring weekly available time slots</li>
                            <li>• Blue blocks represent available times that repeat each week</li>
                            <li>• Each row represents 15 minutes</li>
                            <li>• This sets your regular weekly schedule</li>
                        </ul>
                    </div>
                )}

                {/* Main Calendar Grid */}
                <Card padding="lg">
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Fixed Header Row */}
                        <div className="grid grid-cols-8 gap-0 bg-gray-50 border-b border-gray-200">
                            <div className="h-16 flex items-center justify-center font-semibold text-gray-700 border-r border-gray-200">
                                Time
                            </div>
                            {weekdays.map((day, colIndex) => (
                                <div key={colIndex} className="h-16 text-center font-medium text-sm text-gray-700 p-2 border-r border-gray-200 last:border-r-0">
                                    <div className="font-semibold">{day}</div>
                                </div>
                            ))}
                        </div>

                        {/* Scrollable Grid Content */}
                        <div 
                            ref={gridScrollRef}
                            className="h-[500px] overflow-y-auto"
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            <div className="grid grid-cols-8 gap-0">
                                {/* Time Column */}
                                <div className="bg-gray-50 border-r border-gray-200">
                                    {Array.from({ length: 24 }).map((_, hour) => (
                                        <div key={hour} className="h-20 flex items-center justify-end pr-3 text-sm text-gray-600 border-b border-gray-100">
                                            <span className="font-medium">{formatHour(hour)}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Day Columns */}
                                {weekdays.map((day, colIndex) => (
                                    <div key={colIndex} className="border-r border-gray-200 last:border-r-0">
                                        {Array.from({ length: 24 * 4 }).map((_, rowIndex) => (
                                            <div
                                                key={rowIndex}
                                                className={`h-[20px] w-full cursor-pointer transition-colors duration-100 ease-in-out border-b border-gray-100
                                                    ${calendarGrid[rowIndex] && calendarGrid[rowIndex][colIndex]
                                                        ? 'bg-blue-500 hover:bg-blue-600'
                                                        : 'bg-white hover:bg-blue-100'
                                                    }
                                                    ${rowIndex % 4 === 0 ? 'border-b-gray-300' : ''}
                                                `}
                                                onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                                                onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                                            ></div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </ClinicDashboardLayout>
    );
}
