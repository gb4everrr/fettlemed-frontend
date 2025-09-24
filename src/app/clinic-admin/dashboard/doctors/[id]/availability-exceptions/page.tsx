// src/app/clinic-admin/dashboard/doctors/[id]/availability-exceptions.tsx
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
    start_time: string;
    end_time: string;
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

// Helper to format date to YYYY-MM-DD in local time
const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// FIX: Helper to get the start of the week in local time
const getStartOfWeekLocal = (date: Date) => {
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to get Monday
    const monday = new Date(date.getFullYear(), date.getMonth(), diff);
    return monday;
};

export default function DoctorAvailabilityExceptions() {
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

    // State for the note modal
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [noteModalPosition, setNoteModalPosition] = useState({ top: 0, left: 0 });
    const [currentNote, setCurrentNote] = useState('');
    const noteInputRef = useRef<HTMLTextAreaElement>(null);
    
    // State to hold the temporary exception data for the note modal
    const [pendingExceptionData, setPendingExceptionData] = useState<{ date: string, start_time: string, end_time: string, is_available: boolean } | null>(null);

    // FIX: State for the current week's start date (Monday), initialized in local time
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const today = new Date();
        return getStartOfWeekLocal(today);
    });

    // State for the calendar grid, a 2D array representing exceptions
    const [exceptionsGrid, setExceptionsGrid] = useState<number[][]>([]); // 0 = no exception, 1 = available, 2 = unavailable
    const [regularAvailability, setRegularAvailability] = useState<DoctorAvailability[]>([]);
    const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);

    const [isPainting, setIsPainting] = useState(false);
    const [paintValue, setPaintValue] = useState<number>(0); // 1 = available, 2 = unavailable
    const isPaintingRef = useRef(false);
    const paintValueRef = useRef(0);

    const gridScrollRef = useRef<HTMLDivElement>(null);
    const rows = 24 * 4;
    const cols = 7;

    // Initialize the exceptions grid
    useEffect(() => {
        const newGrid = Array(rows).fill(null).map(() => Array(cols).fill(0));
        setExceptionsGrid(newGrid);
    }, [rows, cols]);

    // Scroll to 7 AM after grid is rendered
    useEffect(() => {
        if (gridScrollRef.current && exceptionsGrid.length > 0) {
            setTimeout(() => {
                const rowHeight = 20;
                const scrollToRow = 7 * 4;
                if (gridScrollRef.current) {
                    gridScrollRef.current.scrollTop = scrollToRow * rowHeight;
                }
            }, 100);
        }
    }, [exceptionsGrid.length]);

    // Fetch data and populate the grid for the current week
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
                // Fetch doctor info
                try {
                    const doctorRes = await api.get(`/clinic-user/clinic-doctor/${doctorId}`, {
                        params: { clinic_id: clinicId }
                    });
                    setDoctorName(`${doctorRes.data.first_name} ${doctorRes.data.last_name}` || 'Unknown Doctor');
                } catch (doctorErr) {
                    console.warn('Could not fetch doctor name:', doctorErr);
                    setDoctorName('Doctor');
                }

                // Fetch recurring availability
                const availabilityRes = await api.get('/availability/availability', {
                    params: { clinic_doctor_id: doctorId, clinic_id: clinicId }
                });
                setRegularAvailability(availabilityRes.data);

                // Fetch exceptions
                const exceptionsRes = await api.get('/availability/exception', {
                    params: { clinic_doctor_id: doctorId, clinic_id: clinicId }
                });
                setExceptions(exceptionsRes.data);

            } catch (err: any) {
                console.error('Failed to fetch doctor data:', err);
                const errorMessage = err.response?.data?.error || 'Failed to load schedule. Please try again.';
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [doctorId, user, router, currentWeekStart]); // Added currentWeekStart to refetch when week changes

    // Recalculate grid when data or week changes (FIX: Only handle unavailable exceptions)
    useEffect(() => {
        const newGrid = Array(rows).fill(null).map(() => Array(cols).fill(0));
        const weekDates = getWeekDates(currentWeekStart);

        exceptions.forEach(exception => {
            // FIX: Parse the date string directly (backend returns local date strings)
            const [year, month, day] = exception.date.split('-').map(Number);
            const exceptionDate = new Date(year, month - 1, day);
            
            const dayIndex = weekDates.findIndex(date => {
                return date.getFullYear() === exceptionDate.getFullYear() &&
                       date.getMonth() === exceptionDate.getMonth() &&
                       date.getDate() === exceptionDate.getDate();
            });

            if (dayIndex !== -1) {
                const startRow = Math.floor(timeToMinutes(exception.start_time) / 15);
                const endRow = Math.floor(timeToMinutes(exception.end_time) / 15);
                for (let i = startRow; i < endRow; i++) {
                    if (i >= 0 && i < newGrid.length) {
                        // Only mark unavailable exceptions (ignore available ones)
                        if (!exception.is_available) {
                            newGrid[i][dayIndex] = 2; // Red for unavailable
                        }
                    }
                }
            }
        });
        
        setExceptionsGrid(newGrid);
    }, [exceptions, currentWeekStart, rows, cols]);

    // FIX: Get the dates for the current week (in local time)
    const getWeekDates = (start: Date) => {
        return Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            return date;
        });
    };

    const weekDates = getWeekDates(currentWeekStart);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get the day index for recurring availability
    const getDayNameFromDate = (date: Date): string => {
        return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    };
    
    // Check if a time slot has recurring availability
    const hasRegularAvailability = (date: Date, rowIndex: number) => {
        const dayOfWeek = getDayNameFromDate(date);
        const currentTime = minutesToTime(rowIndex * 15);
        return regularAvailability.some(slot =>
            slot.weekday === dayOfWeek &&
            currentTime >= slot.start_time &&
            currentTime < slot.end_time
        );
    };

    // Handle mouse down event to start painting
    const handleMouseDown = (rowIndex: number, colIndex: number) => {
        const selectedDate = weekDates[colIndex];
        if (selectedDate < today) return; // Cannot edit past dates
        
        setIsPainting(true);
        isPaintingRef.current = true;
        
        const currentExceptionValue = exceptionsGrid[rowIndex][colIndex];

        // SIMPLIFIED LOGIC: Only toggle unavailable exceptions (red)
        const newValue = currentExceptionValue === 2 ? 0 : 2;

        setPaintValue(newValue);
        paintValueRef.current = newValue;

        const newGrid = exceptionsGrid.map(row => [...row]);
        newGrid[rowIndex][colIndex] = newValue;
        setExceptionsGrid(newGrid);
    };

    // Handle mouse enter event to continue painting
    const handleMouseEnter = (rowIndex: number, colIndex: number) => {
        const selectedDate = weekDates[colIndex];
        if (isPaintingRef.current && selectedDate >= today) {
            const newGrid = exceptionsGrid.map(row => [...row]);
            newGrid[rowIndex][colIndex] = paintValueRef.current;
            setExceptionsGrid(newGrid);
        }
    };

    // Handle mouse up event to stop painting and show note modal
    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (isPaintingRef.current) {
            setIsPainting(false);
            isPaintingRef.current = false;
            
            // If we just painted unavailable exceptions (red), show note modal
            if (paintValueRef.current === 2) {
                // Find the painted area to create exception data
                const paintedExceptions = getExceptionsFromGrid().filter(ex => !ex.is_available);
                if (paintedExceptions.length > 0) {
                    const lastException = paintedExceptions[paintedExceptions.length - 1];
                    setPendingExceptionData(lastException); // Store the exception to be saved
                    setNoteModalPosition({ 
                        top: Math.min(e.clientY + 10, window.innerHeight - 200), 
                        left: Math.min(e.clientX + 10, window.innerWidth - 320) 
                    });
                    setCurrentNote(''); // Reset note for new entry
                    setIsNoteModalOpen(true);
                    
                    // Auto-focus the textarea after a brief delay
                    setTimeout(() => {
                        if (noteInputRef.current) {
                            noteInputRef.current.focus();
                        }
                    }, 100);
                }
            }
        }
    };

    // Helper function to extract exceptions from the grid (ONLY unavailable exceptions)
    const getExceptionsFromGrid = () => {
        const exceptionsFromGrid: any[] = [];
        const weekDates = getWeekDates(currentWeekStart);

        for (let dayIndex = 0; dayIndex < cols; dayIndex++) {
            const date = formatDate(weekDates[dayIndex]);
            let currentStart = -1;

            for (let rowIndex = 0; rowIndex <= rows; rowIndex++) {
                const exceptionValue = rowIndex < rows ? exceptionsGrid[rowIndex][dayIndex] : 0;
                const isUnavailable = exceptionValue === 2; // Only care about unavailable (red) exceptions

                if (isUnavailable && currentStart === -1) {
                    // Start of a new unavailable block
                    currentStart = rowIndex * 15;
                } else if (!isUnavailable && currentStart !== -1) {
                    // End of unavailable block
                    const startTime = minutesToTime(currentStart);
                    const endTime = rowIndex < rows ? minutesToTime(rowIndex * 15) : "23:59:59";
                    
                    if (currentStart < (rowIndex < rows ? rowIndex * 15 : 24 * 60)) {
                        exceptionsFromGrid.push({
                            date,
                            start_time: startTime,
                            end_time: endTime,
                            is_available: false
                        });
                    }
                    currentStart = -1;
                }
            }
        }
        return exceptionsFromGrid;
    };

    // Navigate the calendar week
    const navigateWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
        setCurrentWeekStart(newDate);
    };
    
    // FIX: Compare with today's date using local time
    const isPastWeek = currentWeekStart.getTime() < getStartOfWeekLocal(today).getTime();

    // This function is for saving the note from the popup modal
    const handleSaveNote = async () => {
        if (!pendingExceptionData) return;

        setIsNoteModalOpen(false); // Close the modal first

        // Perform the save operation here
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
            await api.post('/availability/exception', {
                clinic_doctor_id: doctorId,
                clinic_id: clinicId,
                date: pendingExceptionData.date,
                start_time: pendingExceptionData.start_time,
                end_time: pendingExceptionData.end_time,
                is_available: false,
                note: currentNote || ''
            });

            setSuccessMessage('Availability exceptions updated successfully!');
            
            // Refresh the exceptions data
            const exceptionsRes = await api.get('/availability/exception', {
                params: { clinic_doctor_id: doctorId, clinic_id: clinicId }
            });
            setExceptions(exceptionsRes.data);
            
        } catch (err: any) {
            console.error('Failed to create exception:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Failed to update exceptions. Please try again.';
            setError(errorMessage);
        } finally {
            setIsSaving(false);
            setPendingExceptionData(null);
            setCurrentNote('');
        }
    };
    
    // Re-implemented handleSubmit for the main "Save Exceptions" button (bulk save)
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
            const currentExceptions = getExceptionsFromGrid();

            const weekStart = getStartOfWeekLocal(currentWeekStart);
            const weekEnd = new Date(weekStart.getTime());
            weekEnd.setDate(weekEnd.getDate() + 7);
            
            const existingExceptionsForWeek = exceptions.filter(ex => {
                const [year, month, day] = ex.date.split('-').map(Number);
                const exDate = new Date(year, month - 1, day);
                return exDate.getTime() >= weekStart.getTime() && exDate.getTime() < weekEnd.getTime() && !ex.is_available;
            });
            
            const existingExceptionsMap = new Map(existingExceptionsForWeek.map(ex => [`${ex.date}-${ex.start_time}-${ex.end_time}`, ex]));
            const currentExceptionsMap = new Map(currentExceptions.map(ex => [`${ex.date}-${ex.start_time}-${ex.end_time}`, ex]));

            const exceptionsToDelete = existingExceptionsForWeek.filter(existingEx => !currentExceptionsMap.has(`${existingEx.date}-${existingEx.start_time}-${existingEx.end_time}`));
            const exceptionsToCreate = currentExceptions.filter(currentEx => !existingExceptionsMap.has(`${currentEx.date}-${currentEx.start_time}-${currentEx.end_time}`));

            let operationCount = 0;
            let successCount = 0;

            for (const exceptionToDelete of exceptionsToDelete) {
                operationCount++;
                try {
                    const deleteUrl = `/availability/exception/${exceptionToDelete.id}`;
                    await api.delete(deleteUrl, {
                        params: {
                            clinic_doctor_id: doctorId,
                            clinic_id: clinicId,
                        }
                    });
                    successCount++;
                } catch (deleteError: any) {
                    console.warn(`Failed to delete exception ${exceptionToDelete.id}:`, deleteError.response?.data);
                }
            }

            for (const exception of exceptionsToCreate) {
                operationCount++;
                try {
                    await api.post('/availability/exception', {
                        clinic_doctor_id: doctorId,
                        clinic_id: clinicId,
                        date: exception.date,
                        start_time: exception.start_time,
                        end_time: exception.end_time,
                        is_available: false,
                        note: '' // No note for bulk save
                    });
                    successCount++;
                } catch (postError: any) {
                    console.warn('Failed to create exception:', postError.response?.data);
                }
            }
            
            if (successCount === operationCount || operationCount === 0) {
                setSuccessMessage('Availability exceptions updated successfully!');
            } else {
                setSuccessMessage(`Partially updated: ${successCount}/${operationCount} operations succeeded.`);
            }

            const exceptionsRes = await api.get('/availability/exception', {
                params: { clinic_doctor_id: doctorId, clinic_id: clinicId }
            });
            setExceptions(exceptionsRes.data);

        } catch (err: any) {
            console.error('Failed to update exceptions:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Failed to update exceptions. Please try again.';
            setError(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    const handleNoteKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveNote();
        }
    };

    if (isLoading) {
        return <ClinicDashboardLayout><LoadingSpinner /></ClinicDashboardLayout>;
    }
    
    // Day names array to match Date.getDay() output (0=Sun, 1=Mon, etc.)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    const firstDayOfWeek = dateFormatter.format(weekDates[0]);
    const lastDayOfWeek = dateFormatter.format(weekDates[6]);

    return (
        <ClinicDashboardLayout>
            <div className="p-6 md:p-8 font-inter">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">
                            Dr. {doctorName}'s Availability Exceptions
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-gray-600">Set one-off exceptions to the regular weekly schedule.</p>
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
                        <Link href={`/clinic-admin/dashboard/doctors/${doctorId}/availability-calendar`}>
                            <Button variant="secondary" size="md">
                                Back to Weekly Schedule
                            </Button>
                        </Link>
                        <Button
                            variant="primary"
                            size="md"
                            disabled={isSaving}
                            onClick={handleSubmit}
                            shine
                        >
                            {isSaving ? 'Saving...' : 'Save Exceptions'}
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
                            <li>• Click and drag to mark doctor as <strong>unavailable</strong> for specific time slots.</li>
                            <li>• <strong>Red</strong> blocks = Doctor is unavailable (overrides regular schedule).</li>
                            <li>• <strong>Grey</strong> background = Doctor's regular weekly availability.</li>
                            <li>• Click on existing red blocks to remove the exception.</li>
                            <li>• Add optional notes to explain why the doctor is unavailable.</li>
                        </ul>
                    </div>
                )}

                {/* Week Navigation */}
                <div className="flex items-center justify-between mb-4">
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => navigateWeek('prev')}
                    >
                        &larr; Prev Week
                    </Button>
                    <h2 className="text-xl font-bold text-gray-800">
                        {`${dateFormatter.format(weekDates[0])} - ${dateFormatter.format(weekDates[6])}`}
                    </h2>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => navigateWeek('next')}
                    >
                        Next Week &rarr;
                    </Button>
                </div>

                {/* Main Calendar Grid */}
                <Card padding="lg">
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Fixed Header Row */}
                        <div className="grid grid-cols-8 gap-0 bg-gray-50 border-b border-gray-200">
                            <div className="h-16 flex items-center justify-center font-semibold text-gray-700 border-r border-gray-200">
                                Time
                            </div>
                            {weekDates.map((date, colIndex) => (
                                <div key={colIndex} className={`h-16 text-center font-medium text-sm p-2 border-r border-gray-200 last:border-r-0 ${date < today ? 'bg-gray-200 text-gray-500' : 'text-gray-700'}`}>
                                    <div className="font-semibold">{dayNames[date.getDay()]}</div>
                                    <div className="text-xs">{date.getDate()}</div>
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
                                {weekDates.map((date, colIndex) => (
                                    <div key={colIndex} className="border-r border-gray-200 last:border-r-0">
                                        {Array.from({ length: 24 * 4 }).map((_, rowIndex) => {
                                            const isPastDate = date < today;
                                            const exceptionValue = exceptionsGrid[rowIndex]?.[colIndex] || 0;
                                            
                                            // Determine background color
                                            let bgColor = 'bg-white';
                                            if (isPastDate) {
                                                bgColor = 'bg-gray-200 cursor-not-allowed';
                                            } else if (exceptionValue === 2) { // Unavailable exception
                                                bgColor = 'bg-red-500 hover:bg-red-600';
                                            } else if (exceptionValue === 1) { // Available exception
                                                bgColor = 'bg-green-500 hover:bg-green-600';
                                            } else if (hasRegularAvailability(date, rowIndex)) {
                                                bgColor = 'bg-gray-300 hover:bg-gray-400';
                                            } else {
                                                bgColor = 'bg-white hover:bg-blue-100';
                                            }

                                            return (
                                                <div
                                                    key={rowIndex}
                                                    className={`h-[20px] w-full transition-colors duration-100 ease-in-out border-b border-gray-100
                                                        ${bgColor}
                                                        ${rowIndex % 4 === 0 ? 'border-b-gray-300' : ''}
                                                        ${!isPastDate ? 'cursor-pointer' : ''}
                                                    `}
                                                    onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                                                    onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                                                ></div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
            
            {/* The Note Pop-up Modal */}
            {isNoteModalOpen && (
                <div 
                    className="fixed inset-0 z-40" 
                    onClick={(e) => {
                        // Close modal on click outside the modal content
                        if (e.target === e.currentTarget) {
                            setIsNoteModalOpen(false);
                            setPendingExceptionData(null);
                        }
                    }}
                >
                    <div 
                        className="absolute w-72 bg-white rounded-lg shadow-xl p-4 transition-all duration-200 ease-out z-50 transform border border-gray-200"
                        style={{ top: `${noteModalPosition.top}px`, left: `${noteModalPosition.left}px` }}
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
                    >
                        <h4 className="font-semibold text-gray-800 text-sm mb-2">Add a note for this exception</h4>
                        <textarea
                            ref={noteInputRef}
                            className="w-full h-20 text-sm border rounded-md p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 'Out of office for training'"
                            value={currentNote}
                            onChange={(e) => setCurrentNote(e.target.value)}
                            onKeyDown={handleNoteKeyPress}
                        ></textarea>
                        <div className="flex justify-end space-x-2 mt-2">
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => setIsNoteModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="primary" 
                                size="sm" 
                                onClick={handleSaveNote}
                            >
                                Save Note
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </ClinicDashboardLayout>
    );
}