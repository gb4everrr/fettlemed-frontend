'use client';

import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import DoctorDashboardLayout from '@/components/DoctorDashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Card from '@/components/ui/Card';

// Import FullCalendar components and plugins
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';

// --- Interfaces for the data fetched from the API ---
interface AppointmentData {
    id: number;
    datetime_start: string;
    datetime_end: string;
    notes: string;
    clinic: { name: string };
    patient: { first_name: string; last_name: string };
}
interface AvailabilityData {
    id: number;
    weekday: string;
    start_time: string;
    end_time: string;
}
interface ExceptionData {
    id: number;
    date: string;
    is_available: boolean;
    note: string;
}

// --- Main Component ---
export default function MyCalendarPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Data Fetching and Transformation Logic ---
    useEffect(() => {
        const fetchAndProcessCalendarData = async () => {
            try {
                const { data } = await api.get<{
                    appointments: AppointmentData[];
                    availability: AvailabilityData[];
                    exceptions: ExceptionData[];
                }>('/doctor/calendar-data');

                // 1. Process Appointments into calendar events
                const appointmentEvents = data.appointments.map(appt => ({
                    id: `appt-${appt.id}`,
                    title: `${appt.patient.first_name} ${appt.patient.last_name}`,
                    start: appt.datetime_start,
                    end: appt.datetime_end,
                    color: '#3B82F6', // A nice blue for appointments
                    extendedProps: {
                        type: 'Appointment',
                        clinic: appt.clinic.name,
                        notes: appt.notes
                    }
                }));

                // 2. Process Exceptions (Unavailability) into background events
                const exceptionEvents = data.exceptions
                    .filter(ex => !ex.is_available) // Only show blocks for unavailable times
                    .map(ex => ({
                        id: `ex-${ex.id}`,
                        title: ex.note || 'Unavailable',
                        start: ex.date,
                        allDay: true,
                        color: '#FCA5A5', // A light red to indicate unavailability
                        display: 'background',
                        extendedProps: {
                            type: 'Unavailable'
                        }
                    }));
                
                // Note: We are not rendering the recurring weekly `availability` directly.
                // It is better UX to show specific appointments and unavailability exceptions.

                setEvents([...appointmentEvents, ...exceptionEvents]);

            } catch (err) {
                console.error("Error fetching calendar data:", err);
                setError('Failed to load your calendar. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAndProcessCalendarData();
    }, []);

    // --- Custom function to render the content inside each event ---
    const renderEventContent = (eventInfo: any) => {
    const props = eventInfo.event.extendedProps;
    
    // Handle all-day events or events without end times
    if (eventInfo.event.allDay || !eventInfo.event.end) {
        return (
            <div className="p-1 overflow-hidden">
                <p className="italic whitespace-nowrap truncate">{eventInfo.event.title}</p>
                {props.clinic && <p className="text-xs whitespace-nowrap truncate">at {props.clinic}</p>}
            </div>
        );
    }
    
    // Format start and end times as "8am-9am"
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: date.getMinutes() === 0 ? undefined : '2-digit',
            hour12: true 
        }).toLowerCase();
    };
    
    const startTime = formatTime(eventInfo.event.start);
    const endTime = formatTime(eventInfo.event.end);
    const timeRange = `${startTime}-${endTime}`;
    
    return (
        <div className="p-1 overflow-hidden">
            <b className="whitespace-nowrap">{timeRange}</b>
            <p className="italic whitespace-nowrap truncate">with {eventInfo.event.title}</p>
            {props.clinic && <p className="text-xs whitespace-nowrap truncate">at {props.clinic}</p>}
        </div>
    );
};
    
    return (
        <DoctorDashboardLayout headerText="My Calendar">
            <div className="p-6 md:p-8 font-inter">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Schedule</h1>
                <Card padding="lg">
                    {isLoading && (
                        <div className="flex justify-center items-center h-96">
                            <LoadingSpinner />
                        </div>
                    )}
                    {error && <p className="text-center text-red-500 py-10">{error}</p>}
                    {!isLoading && !error && (
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                            initialView="dayGridMonth" // FIX: Default to month view
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                            }}
                            events={events}
                            eventContent={renderEventContent}
                            height="auto"
                            editable={false}
                            droppable={true}
                            scrollTime="08:00:00" // FIX: Start the time grid views scrolled to 8 AM
                        />
                    )}
                </Card>
            </div>
        </DoctorDashboardLayout>
    );
}

