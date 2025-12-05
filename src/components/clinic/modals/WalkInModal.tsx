// src/components/clinic/modals/WalkInModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
// @ts-ignore
import api from '@/services/api';
// @ts-ignore
import Button from '@/components/ui/Button';
// @ts-ignore
import Input from '@/components/ui/Input';
import { Label } from '@radix-ui/react-label';
import { X, Check, ChevronLeft } from 'lucide-react';
import { 
  ClinicDoctor, 
  ClinicPatient, 
  AvailableSlot, 
  DisplaySlot 
} from '@/types/clinic';
import { getDaysInMonth } from '@/lib/utils/datetime';
import { generateHourlySlots } from '@/lib/utils/appointments';

interface WalkInModalProps {
  onClose: () => void;
  onRefreshList: () => void;
  clinicId: number;
  clinicTimezone: string;
  doctors: ClinicDoctor[];
}

export function WalkInModal({
  onClose,
  onRefreshList,
  clinicId,
  clinicTimezone,
  doctors
}: WalkInModalProps) {

  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalSuccessMessage, setModalSuccessMessage] = useState<string | null>(null);
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);

  const [walkInStep, setWalkInStep] = useState<'patient' | 'appointment'>('patient');
  const [newlyCreatedPatient, setNewlyCreatedPatient] = useState<ClinicPatient | null>(null);
  const [patientForm, setPatientForm] = useState({
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      address: '',
      emergency_contact: '',
      patient_code: '',
  });

  const [modalSelectedDoctorId, setModalSelectedDoctorId] = useState('');
  const [modalSelectedDate, setModalSelectedDate] = useState<Date | null>(null);
  const [modalAvailableSlots, setModalAvailableSlots] = useState<AvailableSlot[]>([]);
  const [modalDisplaySlots, setModalDisplaySlots] = useState<DisplaySlot[]>([]);
  const [modalSelectedDisplaySlot, setModalSelectedDisplaySlot] = useState<DisplaySlot | null>(null);
  const [modalNotes, setModalNotes] = useState('');
  const [modalCurrentMonth, setModalCurrentMonth] = useState(new Date().getMonth());
  const [modalCurrentYear, setModalCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
      const fetchModalAvailableSlots = async () => {
          if (!modalSelectedDoctorId || !modalSelectedDate || !clinicId) {
            setModalAvailableSlots([]);
            return;
          }
          try {
              const year = modalSelectedDate.getFullYear();
              const month = String(modalSelectedDate.getMonth() + 1).padStart(2, '0');
              const day = String(modalSelectedDate.getDate()).padStart(2, '0');
              const formattedDate = `${year}-${month}-${day}`;
              const response = await api.get('/appointments/slots', {
                  params: { 
                      clinic_id: clinicId, 
                      clinic_doctor_id: modalSelectedDoctorId, 
                      date: formattedDate 
                  },
              });
              setModalAvailableSlots(response.data);
          } catch (err) {
              console.error('Failed to fetch modal slots:', err);
              setModalErrorMessage('Failed to load available slots');
          }
      };
      fetchModalAvailableSlots();
  }, [modalSelectedDoctorId, modalSelectedDate, clinicId]);

  useEffect(() => {
      if (modalAvailableSlots.length > 0) {
          setModalDisplaySlots(generateHourlySlots(modalAvailableSlots));
      } else {
          setModalDisplaySlots([]);
      }
  }, [modalAvailableSlots]);

  const handleWalkInPatientSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsModalLoading(true);
      setModalErrorMessage(null);
      try {
          const response = await api.post('/clinic-user/clinic-patient', {
              ...patientForm,
              clinic_id: clinicId,
          });
          setNewlyCreatedPatient(response.data);
          setWalkInStep('appointment');
          setModalErrorMessage(null); 
          setPatientForm({ first_name: '', last_name: '', email: '', phone_number: '', address: '', emergency_contact: '', patient_code: '' });
      } catch (err: any) {
          setModalErrorMessage(err.response?.data?.error || 'Failed to register patient');
      } finally {
          setIsModalLoading(false);
      }
  };

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsModalLoading(true);
      setModalErrorMessage(null);

      const patientIdForAppt = newlyCreatedPatient?.id;
      
      if (!modalSelectedDoctorId || !patientIdForAppt || !modalSelectedDisplaySlot || !modalSelectedDate) {
          setModalErrorMessage('Please select a doctor, patient, date, and time slot');
          setIsModalLoading(false);
          return;
      }
      
      try {
          const year = modalSelectedDate.getFullYear();
          const month = String(modalSelectedDate.getMonth() + 1).padStart(2, '0');
          const day = String(modalSelectedDate.getDate()).padStart(2, '0');
          const [startHour, startMinute] = modalSelectedDisplaySlot.display_start_time.split(':').map(Number);
          const [endHour, endMinute] = modalSelectedDisplaySlot.display_end_time.split(':').map(Number);
          const clinicDatetimeStart = `${year}-${month}-${day} ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
          const clinicDatetimeEnd = `${year}-${month}-${day} ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`;
          
          const response = await api.post('/appointments', {
              clinic_doctor_id: parseInt(modalSelectedDoctorId),
              clinic_patient_id: patientIdForAppt,
              clinic_id: clinicId,
              datetime_start: clinicDatetimeStart,
              datetime_end: clinicDatetimeEnd,
              timezone: clinicTimezone || 'Asia/Kolkata',
              notes: modalNotes || null,
          });
          
          setModalSuccessMessage('Appointment booked successfully!');
          onRefreshList();
      } catch (err: any) {
          setModalErrorMessage(err.response?.data?.error || 'Failed to book appointment');
      } finally {
          setIsModalLoading(false);
      }
  };

  const daysInModalMonth = getDaysInMonth(modalCurrentYear, modalCurrentMonth);
  const todayForCalendar = new Date();
  todayForCalendar.setHours(0, 0, 0, 0);

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 border border-gray-200" onClick={(e) => e.stopPropagation()}>
          {walkInStep === 'patient' && (
              <>
                  <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-gray-800">Walk-In (Step 1/2): Register Patient</h2><button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="h-6 w-6" /></button></div>
                  </div>
                  <div className="p-6 max-h-[70vh] overflow-y-auto">
                      <form onSubmit={handleWalkInPatientSubmit} className="space-y-4">
                          {modalErrorMessage && (<div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">{modalErrorMessage}</div>)}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Input id="first_name_walkin" label="First Name" name="first_name" value={patientForm.first_name} onChange={(e) => setPatientForm({...patientForm, first_name: e.target.value})} required />
                              <Input id="last_name_walkin" label="Last Name" name="last_name" value={patientForm.last_name} onChange={(e) => setPatientForm({...patientForm, last_name: e.target.value})} required />
                          </div>
                          <Input id="patient_code_walkin" label="Patient Code" name="patient_code" value={patientForm.patient_code} onChange={(e) => setPatientForm({...patientForm, patient_code: e.target.value})} />
                          <Input id="email_walkin" label="Email (Optional)" name="email" type="email" value={patientForm.email} onChange={(e) => setPatientForm({...patientForm, email: e.target.value})} />
                          <Input id="phone_number_walkin" label="Phone Number" name="phone_number" type="tel" value={patientForm.phone_number} onChange={(e) => setPatientForm({...patientForm, phone_number: e.target.value})} required />
                          <Input id ="address_walkin" label="Address" name="address" value={patientForm.address} onChange={(e) => setPatientForm({...patientForm, address: e.target.value})} />
                          <Input id="emergency_contact_walkin" label="Emergency Contact" name="emergency_contact" value={patientForm.emergency_contact} onChange={(e) => setPatientForm({...patientForm, emergency_contact: e.target.value})} />
                          <div className="flex justify-end space-x-3 pt-4">
                              <Button type="button" variant="ghost" size="md" onClick={onClose}>Cancel</Button>
                              <Button type="submit" variant="primary" size="md" disabled={isModalLoading}>{isModalLoading ? 'Registering...' : 'Next: Book Appointment'}</Button>
                          </div>
                      </form>
                  </div>
              </>
          )}
          
          {walkInStep === 'appointment' && (
              <>
                  <div className="p-6 border-b border-gray-200"><div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-gray-800">Walk-In (Step 2/2): Book Appointment</h2><button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="h-6 w-6" /></button></div></div>
                  <div className="p-6 max-h-[70vh] overflow-y-auto">
                      {modalSuccessMessage ? (
                          <div className="text-center py-8">
                              <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
                              <h3 className="text-xl font-semibold text-gray-800 mb-2">{modalSuccessMessage}</h3>
                              <div className="flex justify-center space-x-4 mt-6"><Button variant="primary" size="md" onClick={onClose}>Done</Button></div>
                          </div>
                      ) : (
                          <form onSubmit={handleAppointmentSubmit} className="space-y-6">
                              {modalErrorMessage && (<div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">{modalErrorMessage}</div>)}
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md"><p className="text-sm font-semibold text-blue-800">Patient: {newlyCreatedPatient?.first_name} {newlyCreatedPatient?.last_name}</p></div>
                              <div className="grid grid-cols-1">
                                  <div>
                                      <Label className="text-sm font-medium text-gray-700">Select Doctor</Label>
                                      <select value={modalSelectedDoctorId} onChange={(e) => { setModalSelectedDoctorId(e.target.value); setModalSelectedDisplaySlot(null); }} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2" required>
                                          <option value="">-- Select Doctor --</option>
                                          {doctors.map(doctor => ( <option key={doctor.id} value={doctor.id}>Dr. {doctor.first_name} {doctor.last_name}</option> ))}
                                      </select>
                                  </div>
                              </div>
                              <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2">Select Date</Label>
                                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                      <div className="flex justify-between items-center mb-4">
                                          <button type="button" onClick={() => { if (modalCurrentMonth === 0) { setModalCurrentMonth(11); setModalCurrentYear(modalCurrentYear - 1); } else { setModalCurrentMonth(modalCurrentMonth - 1); } }} className="p-2 hover:bg-gray-200 rounded"><ChevronLeft className="h-4 w-4" /></button>
                                          <h3 className="font-medium">{new Date(modalCurrentYear, modalCurrentMonth).toLocaleString('default', { month: 'long' })} {modalCurrentYear}</h3>
                                          <button type="button" onClick={() => { if (modalCurrentMonth === 11) { setModalCurrentMonth(0); setModalCurrentYear(modalCurrentYear + 1); } else { setModalCurrentMonth(modalCurrentMonth + 1); } }} className="p-2 hover:bg-gray-200 rounded"><ChevronLeft className="h-4 w-4 transform rotate-180" /></button>
                                      </div>
                                      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div>
                                      <div className="grid grid-cols-7 gap-1 mt-2">
                                          {Array.from({ length: daysInModalMonth[0]?.getDay() ?? 0 }).map((_, i) => ( <div key={`empty-walkin-${i}`} /> ))}
                                          {daysInModalMonth.map(day => {
                                              const isPast = day < todayForCalendar;
                                              return (
                                                  <Button key={day.toISOString()} type="button" variant={day.toDateString() === modalSelectedDate?.toDateString() ? 'primary' : 'ghost'} 
                                                      onClick={() => { setModalSelectedDate(day); setModalSelectedDisplaySlot(null); }} 
                                                      className={`w-full h-10 flex items-center justify-center rounded-lg ${isPast ? 'text-gray-400 line-through opacity-70 cursor-not-allowed' : ''}`}
                                                      disabled={isPast}
                                                  >
                                                      {day.getDate()}
                                                  </Button>
                                              );
                                          })}
                                      </div>
                                  </div>
                              </div>
                              {modalSelectedDoctorId && modalSelectedDate && (
                                  <div>
                                      <Label className="text-sm font-medium text-gray-700 mb-2">Available Time Slots</Label>
                                      {modalDisplaySlots.length > 0 ? (
                                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                              {modalDisplaySlots.map((slot) => (
                                                  <Button key={slot.key} type="button" onClick={() => setModalSelectedDisplaySlot(slot)} variant={modalSelectedDisplaySlot?.key === slot.key ? 'primary' : 'outline'} className="w-full">
                                                    <span className="truncate">{slot.display_start_time} - {slot.display_end_time}</span>
                                                  </Button>
                                              ))}
                                          </div>
                                      ) : ( <p className="text-gray-500">No slots available for this date. Please choose another date.</p> )}
                                  </div>
                              )}
                              <div>
                                  <Label className="text-sm font-medium text-gray-700">Notes (Optional)</Label>
                                  <textarea value={modalNotes} onChange={(e) => setModalNotes(e.target.value)} placeholder="Add any notes..." rows={3} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2" />
                              </div>
                              <div className="flex justify-between space-x-3 pt-4 border-t">
                                  <Button type="button" variant="ghost" size="md" onClick={() => setWalkInStep('patient')}>← Back to Patient Details</Button>
                                  <Button type="submit" variant="primary" size="md" disabled={isModalLoading || !modalSelectedDisplaySlot}>{isModalLoading ? 'Booking...' : 'Book Appointment'}</Button>
                              </div>
                          </form>
                      )}
                  </div>
              </>
          )}
      </div>
    </div>
  );
}