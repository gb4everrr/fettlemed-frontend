// src/lib/utils/appointments.ts
import { 
  Appointment, 
  AvailableSlot, 
  DisplaySlot, 
  StatusInfo 
} from '@/types/clinic';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle 
} from 'lucide-react';

export const isRescheduled = (appointment: Appointment) => {
  return appointment.notes?.includes('[Rescheduled from:') || false;
};

export const getRescheduledFromTime = (appointment: Appointment) => {
  if (!appointment.notes) return null;
  const match = appointment.notes.match(/\[Rescheduled from: (.*?)\]/);
  return match ? match[1] : null;
};

export const doctorColor = (id: number | undefined) => {
  const base = Number(id ?? 0);
  const hue = (base * 37) % 360; // spread across hues
  const bg = `hsl(${hue} 90% 92%)`;
  const border = `hsl(${hue} 80% 60%)`;
  const text = `hsl(${hue} 80% 30%)`;
  return { bg, border, text };
};

export const assignOverlapColumns = (events: { start: Date; end: Date; original: Appointment }[]) => {
  const sorted = events.slice().sort((a, b) => a.start.getTime() - b.start.getTime());
  const columns: { end: number }[] = [];
  const placed: { event: typeof events[number]; col: number; colsCount: number }[] = [];

  sorted.forEach(ev => {
    let placedCol = -1;
    for (let c = 0; c < columns.length; c++) {
      if (ev.start.getTime() >= columns[c].end) {
        placedCol = c;
        columns[c].end = ev.end.getTime();
        break;
      }
    }
    if (placedCol === -1) {
      columns.push({ end: ev.end.getTime() });
      placedCol = columns.length - 1;
    }
    placed.push({ event: ev, col: placedCol, colsCount: 0 });
  });

  placed.forEach((p, idx) => {
    const overlapping = placed.filter(x => !(x.event.end.getTime() <= p.event.start.getTime() || x.event.start.getTime() >= p.event.end.getTime()));
    p.colsCount = Math.max(...overlapping.map(x => x.col)) + 1;
  });

  const map = new Map<number, { col: number; colsCount: number }>();
  placed.forEach(p => map.set(p.event.original.id, { col: p.col, colsCount: p.colsCount }));
  return map;
};

export const generateHourlySlots = (rawSlots: AvailableSlot[]) => {
    const newSlots: DisplaySlot[] = [];
    rawSlots.forEach(slot => {
        const [startHour] = slot.start_time.split(':').map(Number);
        const [endHour] = slot.end_time.split(':').map(Number);
        
        let currentHour = startHour;
        while (currentHour < endHour) {
            const displayStart = `${String(currentHour).padStart(2, '0')}:00`;
            const displayEnd = `${String(currentHour + 1).padStart(2, '0')}:00`;
            
            newSlots.push({
                parent_slot_id: slot.id,
                display_start_time: displayStart,
                display_end_time: displayEnd,
                key: `${slot.id}-${displayStart}`,
            });
            currentHour++;
        }
    });
    return newSlots;
};

export const getStatusInfo = (appointmentStatus: number): StatusInfo => {
  switch (appointmentStatus) {
    case 0:
      return { text: 'Pending', color: 'bg-blue-100 text-blue-800', icon: Clock };
    case 1:
      return { text: 'Confirmed', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    case 2:
      return { text: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle };
    case 3:
      return { text: 'Completed', color: 'bg-gray-100 text-gray-800', icon: CheckCircle };
    default:
      return { text: 'Unknown', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle };
  }
};