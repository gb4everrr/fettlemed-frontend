'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Appointment } from '@/types/clinic';
import { ChevronLeft, ChevronRight, RefreshCw, MapPin } from 'lucide-react';
import { assignOverlapColumns, doctorColor, isRescheduled } from '@/lib/utils/appointments';

interface CalendarViewProps {
  appointments: Appointment[];
  weekDays: Date[];
  earliestHour: number;
  latestHour: number;
  clinicTimezone: string; // Kept for prop compatibility, but we force UTC display
  calendarRef: React.RefObject<HTMLDivElement | null>;
  onAppointmentClick: (appointment: Appointment) => void;
  onNavigateWeek: (direction: "prev" | "next") => void;
  onGoToToday: () => void;
  onExpandEarlier: () => void;
  onExpandLater: () => void;
}

// 1. REPLACED: Use UTC formatting directly.
// This ensures we display the time exactly as it exists in the DB string (e.g. 09:00Z -> 9:00 AM)
const formatClinicTime = (dateString: string | Date) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC', // FORCE UTC
  }).format(date);
};

export default function CalendarView({
  appointments,
  weekDays,
  earliestHour,
  latestHour,
  clinicTimezone, // Unused for calculation now, consistent with "everything is UTC"
  calendarRef,
  onAppointmentClick,
  onNavigateWeek,
  onGoToToday,
  onExpandEarlier,
  onExpandLater,
}: CalendarViewProps) {

  // 2. UPDATED: Compare UTC dates to the Grid Day
  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.datetime_start);
      // Compare the UTC date parts of the appointment to the local date parts of the grid column
      return (
        aptDate.getUTCDate() === day.getDate() &&
        aptDate.getUTCMonth() === day.getMonth() &&
        aptDate.getUTCFullYear() === day.getFullYear()
      );
    });
  };

  const hours = Array.from({ length: latestHour - earliestHour }, (_, i) => i + earliestHour);
  const totalMinutes = (latestHour - earliestHour) * 60;

  // 3. UPDATED: Calculate position using direct UTC values
  const computePositionStyle = (startOriginal: string, endOriginal: string) => {
    const start = new Date(startOriginal);
    const end = new Date(endOriginal);

    // Use getUTCHours/Minutes to ignore browser/clinic timezone offsets
    const startMinutes = (start.getUTCHours() - earliestHour) * 60 + start.getUTCMinutes();
    const durationMin = (end.getTime() - start.getTime()) / (1000 * 60);
    
    const top = (startMinutes / totalMinutes) * 100;
    const height = (durationMin / totalMinutes) * 100;
    
    return { 
      top: `${Math.max(0, Math.min(100, top))}%`, 
      height: `${Math.max(2, Math.min(100 - top, height))}%` 
    };
  };

  return (
    <Card padding="lg" className="shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={() => onNavigateWeek('prev')} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={() => onNavigateWeek('next')} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <h2 className="text-lg font-bold text-gray-800">
          {weekDays[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={onGoToToday} className="px-3 py-1 text-sm font-medium text-primary hover:bg-blue-50 rounded-md transition-colors">Today</button>
        </div>
      </div>

      <div ref={calendarRef} className="flex overflow-auto" style={{ height: '70vh' }}>
        {/* Time Sidebar */}
        <div className="w-16 flex-shrink-0 border-r border-gray-200">
          <div className="text-xs text-center text-gray-600 py-1 sticky top-0 bg-white z-10">Time</div>
          <div className="relative">
            <div className="py-2 flex justify-center"><Button variant="outline" shine size="md" onClick={onExpandEarlier}>↑</Button></div>
            {hours.map((h) => (
              <React.Fragment key={h}>
                <div className="h-24 flex items-start justify-end pr-2 text-[10px] text-gray-600 border-t border-gray-100 pt-1">
                  {`${h === 0 ? 12 : h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`}
                </div>
              </React.Fragment>
            ))}
            <div className="py-2 flex justify-center border-t border-gray-100"><Button variant="outline" shine size="md" onClick={onExpandLater}>↓</Button></div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 gap-2 relative">
          {weekDays.map((day, idx) => {
            const appts = getAppointmentsForDay(day);
            const events = appts.map(a => ({ start: new Date(a.datetime_start), end: new Date(a.datetime_end), original: a }));
            const overlapMap = assignOverlapColumns(events);
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div key={idx} className="relative border border-gray-100 rounded-md bg-white">
                <div className={`sticky top-0 bg-white p-2 border-b border-gray-100 z-40`}>
                  <div className="text-xs text-gray-500 text-center uppercase font-bold">{day.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                  <div className="text-lg font-semibold text-center">
                    {isToday ? (
                      <p className="text-lg font-bold text-white bg-blue-950 rounded-lg w-fit mx-auto px-2">{day.getDate()}</p>
                    ) : (
                      <p className="text-lg font-semibold">{day.getDate()}</p>
                    )}
                  </div>
                </div>
                
                <div className="relative" style={{ height: `${(latestHour - earliestHour) * 96}px` }}>
                  {hours.map((_, i) => (
                    <div key={i} className="absolute left-0 right-0 border-t border-gray-200" style={{ top: `${(i / (latestHour-earliestHour)) * 100}%` }} />
                  ))}

                  {appts.map((a) => {
                    // Check against UTC hours
                    const startHours = new Date(a.datetime_start).getUTCHours();
                    const endHours = new Date(a.datetime_end).getUTCHours();

                    if (endHours < earliestHour || startHours >= latestHour) return null;

                    const pos = computePositionStyle(a.datetime_start, a.datetime_end);
                    const colInfo = overlapMap.get(a.id) || { col: 0, colsCount: 1 };
                    const widthPercent = 100 / colInfo.colsCount;
                    const leftPercent = colInfo.col * widthPercent;
                    const color = doctorColor(a.clinic_doctor_id ?? a.doctor?.id);
                    // Format time using pure UTC
                    const timeRange = `${formatClinicTime(a.datetime_start)} - ${formatClinicTime(a.datetime_end)}`;

                    return (
                      <div 
                        key={a.id} 
                        onClick={() => onAppointmentClick(a)} 
                        className="absolute rounded-md shadow-sm cursor-pointer hover:shadow-lg transition-shadow group" 
                        style={{ 
                          top: pos.top, 
                          height: pos.height, 
                          left: `${leftPercent}%`, 
                          width: `${widthPercent}%`, 
                          boxSizing: 'border-box', 
                          paddingRight: '4px' 
                        }}
                      >
                        <div style={{ background: color.bg, borderLeft: `4px solid ${color.border}`, color: color.text }} className="h-full rounded-md p-1.5 overflow-hidden text-[10px] leading-tight flex flex-col">
                          <div className="font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                            {timeRange}
                          </div>
                          <div className="font-semibold truncate mt-0.5">
                            {a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : '—'}
                          </div>
                          
                          {a.clinic && (
                              <div className="truncate opacity-75 mt-0.5 flex items-center">
                                  <MapPin className="h-2 w-2 mr-0.5 flex-shrink-0" />
                                  {a.clinic.name}
                              </div>
                          )}

                          <div className="truncate hidden sm:block opacity-80 mt-0.5">
                            Dr. {a.doctor?.last_name}
                          </div>
                          
                          <div className="mt-auto flex items-center justify-between pt-1">
                            <div>
                              {a.status === 2 && <span className="font-bold text-red-700">X</span>}
                              {a.status === 3 && <span className="font-bold text-gray-700">✓</span>}
                            </div>
                            {isRescheduled(a) && (
                              <RefreshCw className="h-3 w-3 text-amber-700 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}