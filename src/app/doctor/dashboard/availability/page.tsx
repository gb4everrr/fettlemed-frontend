'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '@/lib/hooks';
import api from '@/services/api';
import { ChevronUp, ChevronDown } from 'lucide-react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
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


// --- Main Component ---
export default function UnifiedAvailabilityPage() {
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

    const [isPainting, setIsPainting] = useState(false);
    const [paintValue, setPaintValue] = useState<boolean>(false);
    const [timeOffset, setTimeOffset] = useState(7); // Start at 7 AM
    
    const VISIBLE_HOURS = 8; // Show 8 hours at a time
    const CELL_HEIGHT = 24; // Height per 15-min slot in pixels

    // --- Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data } = await api.get('/doctor/unified-availability');
                setClinics(data.clinics);
                setAllAvailability(data.availability);
                setAllExceptions(data.exceptions);
                if (data.clinics.length > 0) {
                    setSelectedClinic(data.clinics[0]);
                }
            } catch (err) {
                setError('Failed to load availability data.');
            } finally {
                setIsLoading(false);
            }
        };
        if (user) fetchData();
    }, [user]);

    // --- Grid Population Logic ---
    useEffect(() => {
        const newGrid = Array(24 * 4).fill(null).map(() => Array(7).fill(false));
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


    // --- Event Handlers ---
    const handleClinicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const clinicDoctorId = parseInt(e.target.value, 10);
        const clinic = clinics.find(c => c.clinic_doctor_id === clinicDoctorId);
        setSelectedClinic(clinic || null);
    };

    const handleMouseDown = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
        e.preventDefault();
        setIsPainting(true);
        const actualRow = (timeOffset * 4) + rowIndex;
        const newPaintValue = !calendarGrid[actualRow][colIndex];
        setPaintValue(newPaintValue);
        const newGrid = calendarGrid.map(row => [...row]);
        newGrid[actualRow][colIndex] = newPaintValue;
        setCalendarGrid(newGrid);
    };

    const handleMouseEnter = (rowIndex: number, colIndex: number) => {
        if (isPainting) {
            const actualRow = (timeOffset * 4) + rowIndex;
            const newGrid = calendarGrid.map(row => [...row]);
            newGrid[actualRow][colIndex] = paintValue;
            setCalendarGrid(newGrid);
        }
    };
    
    const handleMouseUp = () => setIsPainting(false);
    
    const handleTouchStart = (rowIndex: number, colIndex: number, e: React.TouchEvent) => {
        e.preventDefault();
        setIsPainting(true);
        const actualRow = (timeOffset * 4) + rowIndex;
        const newPaintValue = !calendarGrid[actualRow][colIndex];
        setPaintValue(newPaintValue);
        const newGrid = calendarGrid.map(row => [...row]);
        newGrid[actualRow][colIndex] = newPaintValue;
        setCalendarGrid(newGrid);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isPainting) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (element && element.classList.contains('calendar-cell')) {
            const rowIndex = parseInt(element.getAttribute('data-row') || '0');
            const colIndex = parseInt(element.getAttribute('data-col') || '0');
            const actualRow = (timeOffset * 4) + rowIndex;
            const newGrid = calendarGrid.map(row => [...row]);
            newGrid[actualRow][colIndex] = paintValue;
            setCalendarGrid(newGrid);
        }
    };

    const handleTouchEnd = () => setIsPainting(false);

    // --- Time Navigation ---
    const scrollUp = () => {
        setTimeOffset(Math.max(0, timeOffset - 2));
    };

    const scrollDown = () => {
        setTimeOffset(Math.min(24 - VISIBLE_HOURS, timeOffset + 2));
    };

    const canScrollUp = timeOffset > 0;
    const canScrollDown = timeOffset < (24 - VISIBLE_HOURS);
    
    // --- Save Logic ---
    const handleSaveSchedule = async () => {
        if (!selectedClinic) return;
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const newAvailabilitySlots: Omit<DoctorAvailability, 'id'>[] = [];
            const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                let currentStart = -1;
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

            const existingSlots = allAvailability.filter(a => a.clinic_doctor_id === selectedClinic.clinic_doctor_id);
            
            for (const slot of existingSlots) {
                await api.delete(`/availability/availability/${slot.id}`, {
                    params: {
                        clinic_doctor_id: selectedClinic.clinic_doctor_id,
                        clinic_id: selectedClinic.clinic_id
                    }
                });
            }
            for (const slot of newAvailabilitySlots) {
                await api.post('/availability/availability', {
                    ...slot,
                    clinic_id: selectedClinic.clinic_id
                });
            }

            const { data } = await api.get('/doctor/unified-availability');
            setAllAvailability(data.availability);
            
            setSuccessMessage(`Schedule for ${selectedClinic.clinic_name} updated successfully!`);

        } catch (err) {
            setError('Failed to save schedule. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };
    

    // --- Render Logic ---
    if (isLoading) {
        return <DoctorDashboardLayout><LoadingSpinner /></DoctorDashboardLayout>;
    }

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const visibleSlots = VISIBLE_HOURS * 4;

    return (
        <DoctorDashboardLayout headerText="My Availability">
            <div className="p-6 md:p-8 font-inter">
                
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Manage Your Schedule</h1>
                        <p className="text-gray-600 mt-1">Select a clinic to view or edit your weekly schedule and date-specific exceptions.</p>
                    </div>
                    
                    {selectedClinic && activeTab === 'schedule' && (
                        <Button variant="primary" size="md" disabled={isSaving} onClick={handleSaveSchedule} shine>
                            {isSaving ? 'Saving...' : `Save for ${selectedClinic.clinic_name}`}
                        </Button>
                    )}
                </div>

                {successMessage && <div className="bg-green-100 text-green-700 p-3 rounded-md text-sm mb-4">{successMessage}</div>}
                {error && <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm mb-4">{error}</div>}
                <div className="mb-6">
                    <label htmlFor="clinic-select" className="block text-sm font-medium text-gray-700 mb-2">Select a Clinic:</label>
                    <select
                        id="clinic-select"
                        className="w-full md:w-1/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        value={selectedClinic?.clinic_doctor_id || ''}
                        onChange={handleClinicChange}
                    >
                        {clinics.map(c => (
                            <option key={c.clinic_doctor_id} value={c.clinic_doctor_id}>{c.clinic_name}</option>
                        ))}
                    </select>
                </div>
               

                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-6">
                        <button onClick={() => setActiveTab('schedule')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'schedule' ? 'border-color-text-primary color-text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Weekly Schedule
                        </button>
                        <button onClick={() => setActiveTab('exceptions')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'exceptions' ? 'border-color-text-primary color-text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Date Exceptions
                        </button>
                    </nav>
                </div>
                
                {activeTab === 'schedule' && (
                    <WeeklyScheduleGrid 
                        calendarGrid={calendarGrid}
                        timeOffset={timeOffset}
                        visibleSlots={visibleSlots}
                        VISIBLE_HOURS={VISIBLE_HOURS}
                        CELL_HEIGHT={CELL_HEIGHT}
                        weekdays={weekdays}
                        canScrollUp={canScrollUp}
                        canScrollDown={canScrollDown}
                        scrollUp={scrollUp}
                        scrollDown={scrollDown}
                        handleMouseDown={handleMouseDown}
                        handleMouseEnter={handleMouseEnter}
                        handleMouseUp={handleMouseUp}
                        handleTouchStart={handleTouchStart}
                        handleTouchMove={handleTouchMove}
                        handleTouchEnd={handleTouchEnd}
                    />
                )}

                {activeTab === 'exceptions' && selectedClinic && (
                   <AvailabilityExceptions 
                        clinic={selectedClinic}
                        exceptions={allExceptions.filter(ex => ex.clinic_doctor_id === selectedClinic.clinic_doctor_id)}
                        onUpdate={(updatedExceptions) => setAllExceptions(prev => [...prev.filter(ex => ex.clinic_doctor_id !== selectedClinic.clinic_doctor_id), ...updatedExceptions])}
                   />
                )}
            </div>
        </DoctorDashboardLayout>
    );
}

// --- Sub-Components ---

interface WeeklyScheduleGridProps {
    calendarGrid: boolean[][];
    timeOffset: number;
    visibleSlots: number;
    VISIBLE_HOURS: number;
    CELL_HEIGHT: number;
    weekdays: string[];
    canScrollUp: boolean;
    canScrollDown: boolean;
    scrollUp: () => void;
    scrollDown: () => void;
    handleMouseDown: (rowIndex: number, colIndex: number, e: React.MouseEvent) => void;
    handleMouseEnter: (rowIndex: number, colIndex: number) => void;
    handleMouseUp: () => void;
    handleTouchStart: (rowIndex: number, colIndex: number, e: React.TouchEvent) => void;
    handleTouchMove: (e: React.TouchEvent) => void;
    handleTouchEnd: () => void;
}

const WeeklyScheduleGrid = ({ 
    calendarGrid, 
    timeOffset, 
    visibleSlots, 
    VISIBLE_HOURS, 
    CELL_HEIGHT, 
    weekdays,
    canScrollUp,
    canScrollDown,
    scrollUp,
    scrollDown,
    handleMouseDown, 
    handleMouseEnter, 
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
}: WeeklyScheduleGridProps) => {
    return (
        <Card padding="lg">
            {/* Navigation Buttons */}
            <div className="flex justify-center items-center gap-4 mb-4 pb-4 border-b border-gray-200">
                <button
                    onClick={scrollUp}
                    disabled={!canScrollUp}
                    className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label="Scroll to earlier times"
                >
                    <ChevronUp className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium text-gray-600">
                    Showing {formatHour(timeOffset)} - {formatHour(timeOffset + VISIBLE_HOURS)}
                </span>
                <button
                    onClick={scrollDown}
                    disabled={!canScrollDown}
                    className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label="Scroll to later times"
                >
                    <ChevronDown className="w-5 h-5" />
                </button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-8 gap-0 bg-gray-50 border-b border-gray-200">
                    <div className="h-12 flex items-center justify-center font-semibold text-gray-700 border-r">Time</div>
                    {weekdays.map(day => <div key={day} className="h-12 flex items-center justify-center font-semibold text-sm text-gray-700 border-r last:border-r-0">{day}</div>)}
                </div>
                <div 
                    className="select-none"
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                >
                    <div className="grid grid-cols-8 gap-0">
                        <div className="bg-gray-50 border-r">
                            {Array.from({ length: VISIBLE_HOURS }).map((_, hourIndex) => {
                                const actualHour = timeOffset + hourIndex;
                                return (
                                    <div 
                                        key={hourIndex} 
                                        className="flex items-center justify-end pr-3 text-xs font-medium text-gray-600 border-b border-gray-200"
                                        style={{ height: `${CELL_HEIGHT * 4}px` }}
                                    >
                                        {formatHour(actualHour)}
                                    </div>
                                );
                            })}
                        </div>
                        {weekdays.map((day, colIndex) => (
                            <div key={colIndex} className="border-r last:border-r-0">
                                {Array.from({ length: visibleSlots }).map((_, slotIndex) => {
                                    const actualRow = (timeOffset * 4) + slotIndex;
                                    const isAvailable = calendarGrid[actualRow]?.[colIndex];
                                    const isHourStart = slotIndex % 4 === 0;
                                    
                                    return (
                                        <div
                                            key={slotIndex}
                                            data-row={slotIndex}
                                            data-col={colIndex}
                                            className={`calendar-cell w-full cursor-pointer transition-colors border-b border-gray-100
                                                ${isAvailable ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white hover:bg-blue-100'}
                                                ${isHourStart ? 'border-t-2 border-gray-200' : ''}`}
                                            style={{ height: `${CELL_HEIGHT}px` }}
                                            onMouseDown={(e) => handleMouseDown(slotIndex, colIndex, e)}
                                            onMouseEnter={() => handleMouseEnter(slotIndex, colIndex)}
                                            onTouchStart={(e) => handleTouchStart(slotIndex, colIndex, e)}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
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


const AvailabilityExceptions = ({ clinic, exceptions, onUpdate }: { clinic: ClinicAssociation; exceptions: AvailabilityException[]; onUpdate: (exceptions: AvailabilityException[]) => void; }) => {
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isAvailable, setIsAvailable] = useState(false);
    const [note, setNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleAddException = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.post('/availability/exception', {
                clinic_doctor_id: clinic.clinic_doctor_id,
                clinic_id: clinic.clinic_id,
                date,
                start_time: startTime,
                end_time: endTime,
                is_available: isAvailable,
                note
            });
            const { data } = await api.get('/availability/exception', { params: { clinic_doctor_id: clinic.clinic_doctor_id, clinic_id: clinic.clinic_id } });
            onUpdate(data);
            setDate(''); setStartTime(''); setEndTime(''); setIsAvailable(false); setNote('');
        } catch (err) {
            console.error('Failed to add exception:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteException = async (id: number) => {
        try {
            await api.delete(`/availability/exception/${id}`, { params: { clinic_doctor_id: clinic.clinic_doctor_id, clinic_id: clinic.clinic_id } });
            const { data } = await api.get('/availability/exception', { params: { clinic_doctor_id: clinic.clinic_doctor_id, clinic_id: clinic.clinic_id } });
            onUpdate(data);
        } catch (err) {
            console.error('Failed to delete exception:', err);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                <Card padding="lg">
                    <h3 className="text-xl font-bold mb-4">Add a Date Exception</h3>
                    <form onSubmit={handleAddException} className="space-y-4">
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full p-2 border rounded"/>
                        <div className="flex gap-2">
                           <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="w-full p-2 border rounded"/>
                           <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required className="w-full p-2 border rounded"/>
                        </div>
                        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" className="w-full p-2 border rounded"/>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="isAvailable" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} />
                            <label htmlFor="isAvailable">Mark as Available (e.g., for extra hours)</label>
                        </div>
                        <Button type="submit" variant="primary" className="w-full" disabled={isSaving}>
                            {isSaving ? 'Adding...' : 'Add Exception'}
                        </Button>
                    </form>
                </Card>
            </div>
            <div className="md:col-span-2">
                <Card padding="lg">
                    <h3 className="text-xl font-bold mb-4">Existing Exceptions for {clinic.clinic_name}</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {exceptions.length > 0 ? exceptions.map(ex => (
                            <div key={ex.id} className={`p-3 rounded-md flex justify-between items-center ${ex.is_available ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                                <div>
                                    <p className="font-semibold">{new Date(ex.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</p>
                                    <p className="text-sm">{ex.start_time} - {ex.end_time} ({ex.is_available ? 'Available' : 'Unavailable'})</p>
                                    {ex.note && <p className="text-xs text-gray-600 mt-1">Note: {ex.note}</p>}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => handleDeleteException(ex.id)}>Delete</Button>
                            </div>
                        )) : <p className="text-gray-500">No exceptions found for this clinic.</p>}
                    </div>
                </Card>
            </div>
        </div>
    );
};