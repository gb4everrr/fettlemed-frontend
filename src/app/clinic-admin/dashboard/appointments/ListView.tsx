// src/app/clinic-admin/dashboard/appointments/ListView.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { Appointment, ClinicDoctor } from '@/types/clinic';
import { Calendar, CheckCircle, Stethoscope, Search, User, Zap, CalendarClock } from 'lucide-react';

interface ListViewProps {
  appointments: Appointment[];
  doctors: ClinicDoctor[];
  totalAppointments: number;
  clinicTimezone: string;
  activeTab: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onAppointmentClick: (appointment: Appointment) => void;
  onPageChange: (page: number) => void;
  onCheckIn?: (id: number) => void;
}

// HELPER: Format Time
const formatClinicTime = (dateString: string, timeZone: string) => {
  if (!dateString) return '--:--';
  return new Date(dateString).toLocaleTimeString('en-US', {
    timeZone: timeZone, 
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export default function ListView({
  appointments,
  doctors,
  clinicTimezone,
  activeTab,
  currentPage,
  totalPages,
  onAppointmentClick,
  onPageChange,
  onCheckIn
}: ListViewProps) {

  const [selectedQueueDocId, setSelectedQueueDocId] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Filter Doctors available TODAY
  const availableDoctors = useMemo(() => {
    return doctors.filter(d => (d as any).is_available_today);
  }, [doctors]);

  // 2. Auto-Select First Available Doctor if in Queue mode
  useEffect(() => {
    if (activeTab === 'queue') {
       if (selectedQueueDocId === 'all' || !availableDoctors.find(d => d.id === selectedQueueDocId)) {
          if (availableDoctors.length > 0) {
            setSelectedQueueDocId(availableDoctors[0].id);
          }
       }
    }
  }, [activeTab, availableDoctors, selectedQueueDocId]);

  const renderContent = () => {
    // === QUEUE VIEW ===
    if (activeTab === 'queue') {
      
      if (availableDoctors.length === 0) {
         return (
           <div className="text-center py-16 border border-dashed border-gray-300 rounded-xl bg-gray-50/50">
             <div className="bg-white p-4 rounded-full inline-flex mb-4 shadow-sm">
                <Stethoscope className="h-8 w-8 text-gray-400" />
             </div>
             <h3 className="text-lg font-medium text-gray-900">No Doctors Available</h3>
             <p className="text-gray-500 mt-1">There are no doctors scheduled for today.</p>
           </div>
         );
      }

      // Filter Logic
      const filteredQueue = appointments.filter(appt => {
        const matchesDoctor = selectedQueueDocId === 'all' || appt.clinic_doctor_id === selectedQueueDocId;
        const matchesSearch = !searchTerm || 
           appt.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           appt.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const isDoctorAvailable = availableDoctors.some(d => d.id === appt.clinic_doctor_id);
        return matchesDoctor && matchesSearch && isDoctorAvailable;
      });

      return (
        <div className="space-y-6">
           {/* SEARCH & TABS CONTAINER */}
           <div className="bg-white p-4 rounded-xl border border-none shadow-sm space-y-4">
               {/* DOCTOR TABS - Updated for High Contrast */}
               <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                  {availableDoctors.map(doc => {
                    const isActive = selectedQueueDocId === doc.id;
                    const docCount = appointments.filter(a => a.clinic_doctor_id === doc.id).length;
                    return (
                        <button
                            key={doc.id}
                            onClick={() => setSelectedQueueDocId(doc.id)}
                            className={`
                                flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border-none
                                ${isActive 
                                    ? 'bg-gray-100 text-var(--color-primary-brand) border-none shadow-sm' 
                                    : 'bg-var(--color-primary-brand) text-color-primary-brand border-gray-200 hover:bg-gray-50 shadow-sm'
                                }
                            `}
                        >
                            
                            <span>Dr. {doc.last_name}</span>
                            <span className={`
                ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold
                ${isActive 
                    ? 'bg-primary-brand' 
                    : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                }
            `}>
                {docCount}
            </span>
                        </button>
                    )
                  })}
               </div>

               {/* SEARCH BAR */}
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input 
                    type="text" 
                    placeholder="Search patient in queue..." 
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-brand/20 focus:border-primary-brand outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
           </div>

           {/* QUEUE LIST */}
           <AppointmentList 
              appointments={filteredQueue} 
              clinicTimezone={clinicTimezone}
              onAppointmentClick={onAppointmentClick}
              onCheckIn={onCheckIn}
              activeTab="queue"
           />
           
           {filteredQueue.length === 0 && (
               <div className="text-center py-12">
                   <p className="text-gray-500">No appointments in this queue.</p>
               </div>
           )}
        </div>
      );
    } 
    
    // === OTHER VIEWS (ALL, ACTIVE, COMPLETED) ===
    return (
        <AppointmentList 
            appointments={appointments} 
            clinicTimezone={clinicTimezone}
            onAppointmentClick={onAppointmentClick}
            onCheckIn={onCheckIn}
            activeTab={activeTab}
        />
    );
  };

  return (
    <div className="w-full">
        {renderContent()}
        
        {/* PAGINATION */}
        {activeTab !== 'queue' && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4 px-2">
                <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
                <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</Button>
                </div>
            </div>
        )}
    </div>
  );
}

// --- REUSABLE LIST COMPONENT ---
function AppointmentList({ appointments, clinicTimezone, onAppointmentClick, onCheckIn, activeTab }: any) {
  
  if (appointments.length === 0 && activeTab !== 'queue') {
      return (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-gray-900 font-medium">No appointments found</h3>
        </div>
      );
  }

  return (
    <ul className="grid gap-3 grid-cols-1">
      {appointments.map((appointment: any) => {
        const isCompleted = appointment.status === 3;
        const isCancelled = appointment.status === 2;
        const isWalkIn = appointment.appointment_type === 1; // Assuming 1 = Walk-in, 2 = Scheduled, 3 = Emergency
        const isEmergency = appointment.appointment_type === 3;
        const showCheckIn = !appointment.arrival_time && appointment.status !== 2 && appointment.status !== 3;

        return (
          <li 
            key={appointment.id} 
            className={`
                group bg-white border border-gray-200 rounded-xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer relative overflow-hidden
                ${isCompleted ? 'opacity-75 bg-gray-50' : ''}
            `}
            onClick={() => onAppointmentClick(appointment)}
          >
            {/* Status Color Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                isCancelled ? 'bg-red-500' : 
                isCompleted ? 'bg-green-500' : 
                isEmergency ? 'bg-red-600' :
                'bg-gray-600'
            }`} />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-3">
              
              {/* Left: Time & Patient Info */}
              <div className="flex items-start gap-4">
                  {/* Date & Time Box */}
                  <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg px-3 py-2 min-w-[90px] border border-gray-100">
                      <span className="text-lg font-bold text-gray-900 leading-none">
                          {formatClinicTime(appointment.datetime_start, clinicTimezone)}
                      </span>
                      <span className="text-xs text-gray-600 mt-1 font-semibold">
                          {new Date(appointment.datetime_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                          {new Date(appointment.datetime_start).toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                  </div>

                  <div>
                      <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {appointment.patient?.first_name} {appointment.patient?.last_name}
                          </h4>
                          {/* TYPE BADGES */}
                          {isWalkIn && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                <Zap className="w-3 h-3 mr-1" /> Walk-In
                            </span>
                          )}
                          {!isWalkIn && !isEmergency && (
                             <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                <CalendarClock className="w-3 h-3 mr-1" /> Scheduled
                             </span>
                          )}
                          {isEmergency && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                  Emergency
                              </span>
                          )}
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500 gap-3 flex-wrap">
                          <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-gray-400" /> 
                              {appointment.patient?.gender?.charAt(0) || '-'}, 
                              {appointment.patient?.dob ? new Date().getFullYear() - new Date(appointment.patient.dob).getFullYear() : '-'}
                          </span>
                          <span className="flex items-center gap-1 text-gray-700 font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                              <Stethoscope className="h-3.5 w-3.5 text-primary-brand" /> 
                              Dr. {appointment.doctor?.last_name}
                          </span>
                      </div>
                  </div>
              </div>

              {/* Right: Actions & Status */}
              <div className="flex items-center gap-3 mt-2 sm:mt-0 w-full sm:w-auto">
                 
                
                {appointment.arrival_time && !isCompleted && !isCancelled && (
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-100 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Arrived
                    </span>
                )}

                {isCancelled && <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">Cancelled</span>}
                {isCompleted && <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">Completed</span>}
              </div>

              {/* CHECK-IN BUTTON */}
{onCheckIn && showCheckIn && (
  <Button 
    variant="outline" 
    size="sm" 
    className="flex-1 sm:flex-none text-blue-600 border-blue-200 hover:bg-blue-50"
    onClick={(e: any) => { 
        e.stopPropagation(); 
        onCheckIn(appointment.id); 
    }}
  >
    Check In
  </Button>
)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}