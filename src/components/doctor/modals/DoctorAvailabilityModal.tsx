// src/components/clinic/modals/DoctorAvailabilityModal.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import Button from '@/components/ui/Button';
import { X, Check, Loader2 } from 'lucide-react';
import Card from '@/components/ui/Card';

interface DoctorAvailabilityModalProps {
    doctorId: number;
    clinicId: number;
    doctorName: string;
    onClose: () => void;
}

// Helper to convert time string to minutes
const timeToMinutes = (time: string) => {
    const parts = time.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

// Helper to convert minutes to time string
const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
};

const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
};

export function DoctorAvailabilityModal({ doctorId, clinicId, doctorName, onClose }: DoctorAvailabilityModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    // Grid State
    const [calendarGrid, setCalendarGrid] = useState<boolean[][]>([]);
    const [regularAvailability, setRegularAvailability] = useState<any[]>([]);
    
    // Painting State
    const [isPainting, setIsPainting] = useState(false);
    const isPaintingRef = useRef(false);
    const paintValueRef = useRef(false);
    const gridScrollRef = useRef<HTMLDivElement>(null);

    // Initialize Grid
    useEffect(() => {
        const rows = 24 * 4; 
        const cols = 7;
        setCalendarGrid(Array(rows).fill(null).map(() => Array(cols).fill(false)));
    }, []);

    // Scroll to 8 AM
    useEffect(() => {
        if (gridScrollRef.current && !isLoading) {
            setTimeout(() => {
                if (gridScrollRef.current) gridScrollRef.current.scrollTop = (8 * 4) * 20; 
            }, 100);
        }
    }, [isLoading]);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const availabilityRes = await api.get('/availability/availability', {
                    params: { clinic_doctor_id: doctorId, clinic_id: clinicId }
                });
                setRegularAvailability(availabilityRes.data);

                const newGrid = Array(24 * 4).fill(null).map(() => Array(7).fill(false));
                
                availabilityRes.data.forEach((slot: any) => {
                    const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(slot.weekday);
                    if (dayIndex !== -1) {
                        const startRow = Math.floor(timeToMinutes(slot.start_time) / 15);
                        const endRow = Math.floor(timeToMinutes(slot.end_time) / 15);
                        for (let i = startRow; i < endRow; i++) {
                            if (i >= 0 && i < newGrid.length) newGrid[i][dayIndex] = true;
                        }
                    }
                });
                setCalendarGrid(newGrid);
            } catch (err: any) {
                setError(err.response?.data?.error || 'Failed to load schedule.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [doctorId, clinicId]);

    // Painting Logic
    const handleMouseDown = (rowIndex: number, colIndex: number) => {
        setIsPainting(true);
        isPaintingRef.current = true;
        const newValue = !calendarGrid[rowIndex][colIndex];
        paintValueRef.current = newValue;
        
        const newGrid = calendarGrid.map(row => [...row]);
        newGrid[rowIndex][colIndex] = newValue;
        setCalendarGrid(newGrid);
    };

    const handleMouseEnter = (rowIndex: number, colIndex: number) => {
        if (isPaintingRef.current) {
            const newGrid = calendarGrid.map(row => [...row]);
            newGrid[rowIndex][colIndex] = paintValueRef.current;
            setCalendarGrid(newGrid);
        }
    };

    const handleMouseUp = () => {
        setIsPainting(false);
        isPaintingRef.current = false;
    };

    // Save Logic
    const handleSubmit = async () => {
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // 1. Process Grid into Slots
            const newAvailability: any[] = [];
            const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const day = weekdays[dayIndex];
                let currentStart = -1;
                
                for (let rowIndex = 0; rowIndex < calendarGrid.length; rowIndex++) {
                    const isAvailable = calendarGrid[rowIndex][dayIndex];
                    if (isAvailable && currentStart === -1) {
                        currentStart = rowIndex * 15;
                    } else if (!isAvailable && currentStart !== -1) {
                        newAvailability.push({
                            clinic_doctor_id: doctorId,
                            clinic_id: clinicId,
                            weekday: day,
                            start_time: minutesToTime(currentStart),
                            end_time: minutesToTime(rowIndex * 15)
                        });
                        currentStart = -1;
                    }
                }
                if (currentStart !== -1) {
                    newAvailability.push({
                        clinic_doctor_id: doctorId,
                        clinic_id: clinicId,
                        weekday: day,
                        start_time: minutesToTime(currentStart),
                        end_time: "23:45:00"
                    });
                }
            }

            // 2. Delete Old
            for (const slot of regularAvailability) {
                await api.delete(`/availability/availability/${slot.id}`, {
                    params: { clinic_doctor_id: doctorId, clinic_id: clinicId }
                }).catch(e => console.warn('Delete failed', e));
            }

            // 3. Create New
            for (const slot of newAvailability) {
                await api.post('/availability/availability', slot);
            }

            setSuccessMessage('Weekly schedule updated successfully!');
            setTimeout(onClose, 1500);

        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update schedule.');
        } finally {
            setIsSaving(false);
        }
    };

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50 overflow-hidden" onMouseUp={handleMouseUp}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-gray-200" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Manage Availability</h2>
                        <p className="text-sm text-gray-500">Weekly recurring schedule for Dr. {doctorName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden p-6 flex flex-col">
                    {error && <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">{error}</div>}
                    {successMessage && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4 text-sm flex items-center">
                            <Check className="h-4 w-4 mr-2" /> {successMessage}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                            {/* Grid Header */}
                            <div className="grid grid-cols-8 gap-0 bg-gray-50 border-b border-gray-200">
                                <div className="h-12 flex items-center justify-center font-semibold text-xs text-gray-500 border-r border-gray-200">Time</div>
                                {weekdays.map((day, i) => (
                                    <div key={i} className="h-12 flex items-center justify-center font-semibold text-sm text-gray-700 border-r border-gray-200 last:border-r-0">{day}</div>
                                ))}
                            </div>

                            {/* Scrollable Grid */}
                            <div ref={gridScrollRef} className="flex-1 overflow-y-auto" onMouseLeave={handleMouseUp}>
                                <div className="grid grid-cols-8 gap-0">
                                    {/* Time Column */}
                                    <div className="bg-gray-50 border-r border-gray-200">
                                        {Array.from({ length: 24 }).map((_, h) => (
                                            <div key={h} className="h-20 flex items-center justify-end pr-3 text-xs text-gray-500 border-b border-gray-100 font-medium">{formatHour(h)}</div>
                                        ))}
                                    </div>
                                    {/* Days */}
                                    {weekdays.map((_, colIndex) => (
                                        <div key={colIndex} className="border-r border-gray-200 last:border-r-0 relative">
                                            {Array.from({ length: 24 * 4 }).map((_, rowIndex) => (
                                                <div
                                                    key={rowIndex}
                                                    className={`h-[20px] w-full border-b border-gray-50 transition-colors ${
                                                        calendarGrid[rowIndex][colIndex] ? 'bg-blue-500' : 'hover:bg-blue-50'
                                                    } ${rowIndex % 4 === 3 ? 'border-b-gray-200' : ''}`}
                                                    onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                                                    onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                        <span className="inline-block w-3 h-3 bg-blue-500 rounded-sm mr-1 align-middle"></span> Available
                        <span className="inline-block w-3 h-3 bg-white border border-gray-300 rounded-sm ml-3 mr-1 align-middle"></span> Unavailable
                    </div>
                    <div className="flex space-x-3">
                        <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
                        <Button variant="primary" size="md" onClick={handleSubmit} disabled={isSaving || isLoading} shine>
                            {isSaving ? 'Saving...' : 'Save Schedule'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}