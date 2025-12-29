'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// --- Interfaces ---
interface ClinicAssociation {
    clinic_doctor_id: number;
    clinic_id: number;
    clinic_name: string;
}
interface DoctorAvailability {
    id: number;
    clinic_doctor_id: number;
    weekday: string;
    start_time: string;
    end_time: string;
}
interface AvailabilityException {
    id: number;
    clinic_doctor_id: number;
    date: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
    note?: string;
}

// --- Helper Functions ---
const timeToMinutes = (time: string) => {
    const parts = time.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

const minutesToTime = (minutes: number) => {
    const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mins = String(minutes % 60).padStart(2, '0');
    return `${hours}:${mins}:00`;
};

const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
};

// Use Local Time for date string generation to prevent Timezone shifts
const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- Main Component ---
export const AvailabilityContent = () => {
    const { user } = useAppSelector((state) => state.auth);
    
    // --- State Management ---
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    const [clinics, setClinics] = useState<ClinicAssociation[]>([]);
    const [selectedClinic, setSelectedClinic] = useState<ClinicAssociation | null>(null);

    const [allAvailability, setAllAvailability] = useState<DoctorAvailability[]>([]);
    const [allExceptions, setAllExceptions] = useState<AvailabilityException[]>([]);
    
    const [calendarGrid, setCalendarGrid] = useState<boolean[][]>([]);
    const [activeTab, setActiveTab] = useState<'schedule' | 'exceptions'>('schedule');

    // Schedule Grid State
    const [isPainting, setIsPainting] = useState(false);
    const [paintValue, setPaintValue] = useState<boolean>(false);
    
    const CELL_HEIGHT = 24; // Height per 15-min slot in pixels

    // --- Data Fetching ---
    const fetchData = async () => {
        if (!user) return;
        try {
            const { data } = await api.get('/doctor/unified-availability');
            setClinics(data.clinics);
            setAllAvailability(data.availability);
            setAllExceptions(data.exceptions);
            
            // If no clinic is selected yet, select the first one
            if (data.clinics.length > 0 && !selectedClinic) {
                setSelectedClinic(data.clinics[0]);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load availability data.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // --- Grid Population Logic (Weekly Schedule) ---
    useEffect(() => {
        // 24 hours * 4 slots = 96 rows
        const newGrid = Array(96).fill(null).map(() => Array(7).fill(false));
        
        if (selectedClinic) {
            const clinicAvailability = allAvailability.filter(
                (a) => a.clinic_doctor_id === selectedClinic.clinic_doctor_id
            );

            clinicAvailability.forEach((slot) => {
                const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(slot.weekday);
                if (dayIndex === -1) return;

                const startRow = Math.floor(timeToMinutes(slot.start_time) / 15);
                const endRow = Math.floor(timeToMinutes(slot.end_time) / 15);
                for (let i = startRow; i < endRow; i++) {
                    if (i >= 0 && i < newGrid.length) {
                        newGrid[i][dayIndex] = true;
                    }
                }
            });
        }
        setCalendarGrid(newGrid);
    }, [selectedClinic, allAvailability]);


    // --- Event Handlers (Weekly Schedule) ---
    const handleClinicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const clinicDoctorId = parseInt(e.target.value, 10);
        const clinic = clinics.find(c => c.clinic_doctor_id === clinicDoctorId);
        setSelectedClinic(clinic || null);
    };

    const handleMouseDown = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
        e.preventDefault();
        setIsPainting(true);
        // rowIndex corresponds directly to 0-95 in the new scrollable grid
        const newPaintValue = !calendarGrid[rowIndex][colIndex];
        setPaintValue(newPaintValue);
        const newGrid = calendarGrid.map(row => [...row]);
        newGrid[rowIndex][colIndex] = newPaintValue;
        setCalendarGrid(newGrid);
    };

    const handleMouseEnter = (rowIndex: number, colIndex: number) => {
        if (isPainting) {
            const newGrid = calendarGrid.map(row => [...row]);
            newGrid[rowIndex][colIndex] = paintValue;
            setCalendarGrid(newGrid);
        }
    };

    const handleMouseUp = () => setIsPainting(false);
    
    const handleSaveSchedule = async () => {
        if (!selectedClinic) return;
        setIsSaving(true);
        setSuccessMessage(null);
        setError(null);

        try {
            const newAvailabilitySlots: any[] = [];
            const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                let currentStart = -1;
                // Loop through all 96 rows
                for (let rowIndex = 0; rowIndex < calendarGrid.length + 1; rowIndex++) {
                    const isAvailable = calendarGrid[rowIndex]?.[dayIndex] ?? false;
                    
                    if (isAvailable && currentStart === -1) {
                        currentStart = rowIndex * 15;
                    } else if (!isAvailable && currentStart !== -1) {
                         newAvailabilitySlots.push({
                            clinic_doctor_id: selectedClinic.clinic_doctor_id,
                            weekday: weekdays[dayIndex],
                            start_time: minutesToTime(currentStart),
                            end_time: minutesToTime(rowIndex * 15),
                         });
                         currentStart = -1;
                    }
                }
            }

            // 1. Delete existing for this clinic
            const existingSlots = allAvailability.filter(a => a.clinic_doctor_id === selectedClinic.clinic_doctor_id);
            for (const slot of existingSlots) {
                await api.delete(`/availability/availability/${slot.id}`, { 
                    params: { clinic_doctor_id: selectedClinic.clinic_doctor_id, clinic_id: selectedClinic.clinic_id }
                });
            }

            // 2. Create new slots
            for (const slot of newAvailabilitySlots) {
                await api.post('/availability/availability', { ...slot, clinic_id: selectedClinic.clinic_id });
            }

            // 3. Refresh
            await fetchData();
            setSuccessMessage(`Schedule for ${selectedClinic.clinic_name} updated successfully!`);
        } catch (err) {
            console.error(err);
            setError('Failed to save availability.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-6" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            {/* Header Controls */}
            <Card className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="w-full md:w-auto">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Clinic</label>
                    <select 
                        className="w-full md:w-64 p-2 border rounded-md"
                        onChange={handleClinicChange}
                        value={selectedClinic?.clinic_doctor_id || ''}
                    >
                        {clinics.map(c => (
                            <option key={c.clinic_doctor_id} value={c.clinic_doctor_id}>{c.clinic_name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                    <Button 
                        variant={activeTab === 'schedule' ? 'primary' : 'outline'}
                        onClick={() => setActiveTab('schedule')}
                    >
                        Weekly Schedule
                    </Button>
                    <Button 
                        variant={activeTab === 'exceptions' ? 'primary' : 'outline'}
                        onClick={() => setActiveTab('exceptions')}
                    >
                        Exceptions
                    </Button>
                </div>
            </Card>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">{error}</div>}
            {successMessage && <div className="p-4 bg-green-50 text-green-600 rounded-md border border-green-200">{successMessage}</div>}

            <div className="min-h-[500px]">
                {activeTab === 'schedule' && selectedClinic && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-500">Click and drag to set recurring availability.</p>
                            <Button onClick={handleSaveSchedule} disabled={isSaving} shine>
                                {isSaving ? 'Saving...' : 'Save Schedule'}
                            </Button>
                        </div>

                        <WeeklyScheduleGrid 
                            calendarGrid={calendarGrid}
                            CELL_HEIGHT={CELL_HEIGHT}
                            weekdays={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
                            handleMouseDown={handleMouseDown}
                            handleMouseEnter={handleMouseEnter}
                        />
                    </div>
                )}

                {activeTab === 'exceptions' && selectedClinic && (
                    <AvailabilityExceptions 
                        clinic={selectedClinic} 
                        existingExceptions={allExceptions.filter(ex => ex.clinic_doctor_id === selectedClinic.clinic_doctor_id)}
                        regularAvailability={allAvailability.filter(a => a.clinic_doctor_id === selectedClinic.clinic_doctor_id)}
                        onRefresh={async () => {
                            await fetchData();
                            setSuccessMessage('Exceptions updated successfully.');
                        }}
                    />
                )}
            </div>
        </div>
    );
}

// --- Sub-Components ---

interface WeeklyScheduleGridProps {
    calendarGrid: boolean[][];
    CELL_HEIGHT: number;
    weekdays: string[];
    handleMouseDown: (rowIndex: number, colIndex: number, e: React.MouseEvent) => void;
    handleMouseEnter: (rowIndex: number, colIndex: number) => void;
}

const WeeklyScheduleGrid: React.FC<WeeklyScheduleGridProps> = (props) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to 8 AM on mount
    useEffect(() => {
        if (scrollRef.current) {
            // 8 hours * 4 slots * CELL_HEIGHT
            scrollRef.current.scrollTop = 32 * props.CELL_HEIGHT;
        }
    }, [props.CELL_HEIGHT]);

    return (
        <Card className="flex flex-col h-[650px] border border-gray-200">
             <div className="flex-1 overflow-y-auto relative select-none" ref={scrollRef}>
                 <div className="grid grid-cols-8 gap-0 min-w-[600px]">
                    {/* Time Column - Sticky Left */}
                    <div className="bg-gray-50 border-r border-gray-200 sticky left-0 z-20">
                        <div className="h-[40px] border-b border-gray-200 bg-gray-50 sticky top-0 z-30"></div> {/* Header Spacer */}
                        {Array.from({length: 24}).map((_, h) => (
                            <div key={h} className="flex items-center justify-end pr-2 text-xs text-gray-500 border-b border-gray-100" style={{ height: props.CELL_HEIGHT * 4 }}>
                                {formatHour(h)}
                            </div>
                        ))}
                    </div>

                    {/* Day Columns */}
                    {props.weekdays.map((day, colIndex) => (
                        <div key={colIndex} className="border-r border-gray-200 last:border-r-0">
                            {/* Header - Sticky Top */}
                            <div className="sticky top-0 bg-white z-10 text-center border-b border-gray-200 flex items-center justify-center h-[40px] font-bold text-gray-600 text-sm">
                                {day}
                            </div>
                            
                            {/* Slots */}
                            {Array.from({length: 96}).map((_, rowIndex) => {
                                const isActive = props.calendarGrid[rowIndex]?.[colIndex];
                                return (
                                    <div
                                        key={rowIndex}
                                        className={`border-b border-gray-100 cursor-pointer transition-colors ${isActive ? 'bg-blue-500' : 'bg-white hover:bg-gray-50'}`}
                                        style={{ height: props.CELL_HEIGHT }}
                                        onMouseDown={(e) => props.handleMouseDown(rowIndex, colIndex, e)}
                                        onMouseEnter={() => props.handleMouseEnter(rowIndex, colIndex)}
                                    />
                                );
                            })}
                        </div>
                    ))}
                 </div>
             </div>

             {/* Legend */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="text-gray-600">Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
                    <span className="text-gray-600">Unavailable</span>
                </div>
            </div>
        </Card>
    );
};

// --- Updated Availability Exceptions Component ---

interface AvailabilityExceptionsProps {
    clinic: ClinicAssociation;
    existingExceptions: AvailabilityException[];
    regularAvailability: DoctorAvailability[];
    onRefresh: () => void;
}

const AvailabilityExceptions = ({ clinic, existingExceptions, regularAvailability, onRefresh }: AvailabilityExceptionsProps) => {
    // Initialize with 00:00:00 to prevent time-drifting when adding days
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0); // Force midnight
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
        return new Date(d.setDate(diff));
    });

    const rows = 96; 
    const cols = 7;
    const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const displayDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Initialize state eagerly to prevent render error
    const [exceptionsGrid, setExceptionsGrid] = useState<number[][]>(() => 
        Array(rows).fill(null).map(() => Array(cols).fill(0))
    );

    const [isPainting, setIsPainting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const isPaintingRef = useRef(false);
    const paintValueRef = useRef(0);
    const gridScrollRef = useRef<HTMLDivElement>(null);

    const [noteModal, setNoteModal] = useState<{ open: boolean; x: number; y: number; note: string }>({
        open: false, x: 0, y: 0, note: ''
    });
    const noteInputRef = useRef<HTMLTextAreaElement>(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekDates = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(currentWeekStart);
        d.setDate(currentWeekStart.getDate() + i);
        return d;
    });

    // Scroll to 8 AM
    useEffect(() => {
        if (gridScrollRef.current) {
             gridScrollRef.current.scrollTop = 32 * 20; 
        }
    }, [clinic.clinic_id]);

    // Compute Grid based on Existing Exceptions
    useEffect(() => {
        const newGrid = Array(rows).fill(null).map(() => Array(cols).fill(0));
        
        existingExceptions.forEach(ex => {
            // Parse exception date (YYYY-MM-DD) into a Local Date object (00:00:00)
            const [y, m, d] = ex.date.split('-').map(Number);
            const exDate = new Date(y, m - 1, d);
            
            // Compare Local Dates. 
            // exDate is midnight local. weekDates are midnight local. 
            const colIdx = weekDates.findIndex(wd => 
                wd.getDate() === exDate.getDate() && 
                wd.getMonth() === exDate.getMonth() && 
                wd.getFullYear() === exDate.getFullYear()
            );

            if (colIdx !== -1 && !ex.is_available) {
                const startRow = Math.floor(timeToMinutes(ex.start_time) / 15);
                const endRow = Math.floor(timeToMinutes(ex.end_time) / 15);
                
                for (let i = startRow; i < endRow; i++) {
                    if (i < rows) newGrid[i][colIdx] = 2; 
                }
            }
        });
        setExceptionsGrid(newGrid);
    }, [existingExceptions, currentWeekStart]); 

    // --- Helpers ---
    const isRegularlyAvailable = (date: Date, row: number) => {
        const dayName = fullDayNames[date.getDay()];
        const timeStr = minutesToTime(row * 15);
        
        return regularAvailability.some((slot) => 
            slot.weekday === dayName && 
            timeStr >= slot.start_time && 
            timeStr < slot.end_time
        );
    };

    // --- Painting Handlers ---
    const handleMouseDown = (row: number, col: number, e: React.MouseEvent) => {
        if (weekDates[col] < today) return; 
        e.preventDefault();

        setIsPainting(true);
        isPaintingRef.current = true;
        
        const newVal = exceptionsGrid[row][col] === 2 ? 0 : 2;
        paintValueRef.current = newVal;
        
        const newGrid = exceptionsGrid.map(r => [...r]);
        newGrid[row][col] = newVal;
        setExceptionsGrid(newGrid);
    };

    const handleMouseEnter = (row: number, col: number) => {
        if (isPaintingRef.current && weekDates[col] >= today) {
            const newGrid = exceptionsGrid.map(r => [...r]);
            newGrid[row][col] = paintValueRef.current;
            setExceptionsGrid(newGrid);
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (isPaintingRef.current) {
            setIsPainting(false);
            isPaintingRef.current = false;
            
            if (paintValueRef.current === 2) {
                // Fixed positioning strategy
                const x = Math.min(e.clientX, window.innerWidth - 320);
                const y = Math.min(e.clientY, window.innerHeight - 250);

                setNoteModal({
                    open: true,
                    x, 
                    y, 
                    note: ''
                });
                setTimeout(() => noteInputRef.current?.focus(), 100);
            }
        }
    };

    const handleSaveExceptions = async () => {
        setIsSaving(true);
        try {
            // 1. Calculate New Exceptions from Grid
            const newExceptions: any[] = [];
            
            for (let col = 0; col < cols; col++) {
                // Use formatLocalDate to ensure the date string sent is exactly what the user sees
                const dateStr = formatLocalDate(weekDates[col]);
                let start = -1;
                
                for (let row = 0; row <= rows; row++) {
                    const isRed = row < rows && exceptionsGrid[row][col] === 2;
                    
                    if (isRed && start === -1) {
                        start = row * 15;
                    } else if (!isRed && start !== -1) {
                        newExceptions.push({
                            date: dateStr,
                            start_time: minutesToTime(start),
                            end_time: minutesToTime(row * 15),
                            is_available: false,
                            note: noteModal.note 
                        });
                        start = -1;
                    }
                }
            }

            // 2. Identify Exceptions to Delete
            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const toDelete = existingExceptions.filter(ex => {
                const [y, m, d] = ex.date.split('-').map(Number);
                const exDate = new Date(y, m - 1, d);
                return exDate >= currentWeekStart && exDate <= weekEnd && !ex.is_available;
            });

            // 3. API Calls
            for (const ex of toDelete) {
                await api.delete(`/availability/exception/${ex.id}`, { 
                    params: { clinic_doctor_id: clinic.clinic_doctor_id, clinic_id: clinic.clinic_id } 
                });
            }

            for (const ex of newExceptions) {
                await api.post('/availability/exception', { 
                    ...ex, 
                    clinic_doctor_id: clinic.clinic_doctor_id, 
                    clinic_id: clinic.clinic_id 
                });
            }

            // 4. Trigger Parent Refresh
            onRefresh();

        } catch (err) {
            console.error("Failed to save exceptions", err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="flex flex-col h-[700px] border border-gray-200">
             {/* Toolbar */}
             <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-xl">
                <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => setCurrentWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; })} 
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600"/>
                        </button>
                        <span className="font-semibold text-gray-700 min-w-[200px] text-center">
                            {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
                        </span>
                        <button 
                            onClick={() => setCurrentWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; })} 
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <ChevronRight className="h-5 w-5 text-gray-600"/>
                        </button>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-xs flex items-center gap-3">
                        <div className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-sm mr-2"></span> Unavailable (Exception)</div>
                        <div className="flex items-center"><span className="w-3 h-3 bg-gray-300 rounded-sm mr-2"></span> Regular Schedule</div>
                    </div>
                    <Button onClick={handleSaveExceptions} disabled={isSaving} size="sm" shine>
                        {isSaving ? 'Saving...' : 'Save Exceptions'}
                    </Button>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-hidden relative flex flex-col" onMouseUp={handleMouseUp} onMouseLeave={() => setIsPainting(false)}>
                <div className="flex-1 overflow-y-auto" ref={gridScrollRef}>
                    <div className="grid grid-cols-8 gap-0 min-w-[600px]">
                        {/* Time Column */}
                        <div className="bg-gray-50 border-r border-gray-200 sticky left-0 z-20">
                            <div className="h-[40px] border-b border-gray-200 bg-gray-50 sticky top-0 z-30"></div>
                            {Array.from({length: 24}).map((_, h) => (
                                <div key={h} className="h-20 flex items-center justify-end pr-2 text-xs text-gray-500 border-b border-gray-100">
                                    {formatHour(h)}
                                </div>
                            ))}
                        </div>

                        {/* Day Columns */}
                        {weekDates.map((date, col) => (
                            <div key={col} className={`border-r border-gray-200 last:border-r-0 ${date < today ? 'bg-gray-50/50' : ''}`}>
                                {/* Column Header */}
                                <div className="sticky top-0 bg-white z-10 text-center border-b border-gray-200 py-2 h-[40px]">
                                    <div className="text-xs font-bold text-gray-500 uppercase">{displayDayNames[date.getDay()]}</div>
                                    <div className={`text-sm font-semibold ${date.toDateString() === today.toDateString() ? 'text-blue-600' : ''}`}>
                                        {date.getDate()}
                                    </div>
                                </div>

                                {/* Slots */}
                                {Array.from({length: rows}).map((_, row) => {
                                    const isPast = date < today;
                                    const isException = exceptionsGrid[row] && exceptionsGrid[row][col] === 2;
                                    const isRegular = !isException && isRegularlyAvailable(date, row);
                                    
                                    let bgClass = 'bg-white';
                                    if (isPast) bgClass = 'bg-gray-100 cursor-not-allowed';
                                    else if (isException) bgClass = 'bg-red-500 hover:bg-red-600 cursor-pointer'; 
                                    else if (isRegular) bgClass = 'bg-gray-300 hover:bg-gray-400 cursor-pointer'; 
                                    else bgClass = 'hover:bg-red-50 cursor-pointer';

                                    return (
                                        <div 
                                            key={row}
                                            className={`h-[20px] border-b border-gray-50 transition-colors ${bgClass} ${row % 4 === 3 ? 'border-b-gray-200' : ''}`}
                                            onMouseDown={(e) => handleMouseDown(row, col, e)}
                                            onMouseEnter={() => handleMouseEnter(row, col)}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Note Popup Overlay */}
                {noteModal.open && (
                    <div 
                        className="fixed bg-white rounded-lg shadow-xl p-4 border border-gray-200 z-[60] w-72"
                        style={{ top: noteModal.y, left: noteModal.x }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h4 className="text-sm font-semibold mb-2 text-gray-800">Reason for unavailability</h4>
                        <textarea 
                            ref={noteInputRef}
                            className="w-full border border-gray-300 rounded p-2 text-sm mb-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                            rows={2}
                            placeholder="e.g., Vacation, Personal Leave"
                            value={noteModal.note}
                            onChange={e => setNoteModal(prev => ({ ...prev, note: e.target.value }))}
                        />
                        <div className="flex justify-end">
                            <Button size="sm" variant="primary" onClick={() => setNoteModal(prev => ({ ...prev, open: false }))}>
                                Done
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};