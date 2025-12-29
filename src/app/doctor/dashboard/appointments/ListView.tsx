'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Appointment } from '@/types/clinic';
import { Calendar, Clock, Edit, RefreshCw, MapPin } from 'lucide-react';
// REMOVED: formatDateTime (We now handle formatting locally to force UTC)
import { isRescheduled, getRescheduledFromTime } from '@/lib/utils/appointments';

interface ListViewProps {
  appointments: Appointment[];
  totalAppointments: number;
  clinicTimezone: string; // Kept for prop interface, but we force UTC display
  activeTab: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onAppointmentClick: (appointment: Appointment) => void;
  onPageChange: (page: number) => void;
}

// 1. NEW: Local formatter forcing UTC
const formatClinicTime = (dateString: string | Date) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC', // FORCE UTC
  }).format(date);
};

export default function ListView({
  appointments,
  totalAppointments,
  clinicTimezone,
  activeTab,
  currentPage,
  totalPages,
  itemsPerPage,
  onAppointmentClick,
  onPageChange,
}: ListViewProps) {
  
  return (
    <Card padding="lg" className="shadow-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center">
        <Clock className="h-6 w-6 mr-2 text-gray-600" />
        {activeTab === 'active' ? 'Active Appointments' : activeTab === 'completed' ? 'Completed Appointments' : 'All Appointments'}
        <span className="ml-2 text-sm font-normal text-gray-500">({totalAppointments} total)</span>
      </h2>
      {appointments.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No appointments found.</p>
          <p className="text-sm text-gray-400">Try adjusting your filters or booking a new appointment.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {appointments.map((appointment) => {
              const rescheduled = isRescheduled(appointment);
              const originalTime = getRescheduledFromTime(appointment);
              return (
                <li key={appointment.id} className="p-5 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        {/* Status Badge */}
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${appointment.status === 2 ? 'bg-red-100 text-red-800' : appointment.status === 3 ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
                          {appointment.status === 2 ? 'Cancelled' : appointment.status === 3 ? 'Completed' : 'Upcoming'}
                        </span>
                        
                        {/* Rescheduled Badge */}
                        {rescheduled && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            <RefreshCw className="h-3 w-3 mr-1" />Rescheduled
                          </span>
                        )}

                        {/* Clinic Badge */}
                        {appointment.clinic && (
                           <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                             <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                             {appointment.clinic.name}
                           </span>
                        )}
                      </div>

                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">Appointment Time</h3>
                          {/* 2. REPLACED: formatDateTime with formatClinicTime */}
                          <p className="text-sm text-gray-600 font-medium">{formatClinicTime(appointment.datetime_start)}</p>
                          {rescheduled && originalTime && (<p className="text-xs text-amber-600 mt-1 flex items-center"><RefreshCw className="h-3 w-3 mr-1" />Originally scheduled: {originalTime}</p>)}
                        </div>
                        
                        <div className="space-y-1">
                            {appointment.patient && (
                                <p className="text-sm text-gray-600">
                                    <span className="font-semibold text-gray-500 w-16 inline-block">Patient:</span> 
                                    {appointment.patient.first_name} {appointment.patient.last_name}
                                </p>
                            )}
                            {appointment.doctor && (
                                <p className="text-sm text-gray-600">
                                    <span className="font-semibold text-gray-500 w-16 inline-block">Doctor:</span> 
                                    Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                                </p>
                            )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="secondary" size="sm" className='flex items-center' onClick={() => onAppointmentClick(appointment)} title="View Appointment">
                        <Edit className="h-4 w-4 mr-2"/>View
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-700">Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalAppointments)} of {totalAppointments} results</div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</Button>
                <Button variant="ghost" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}