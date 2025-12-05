'use client';
import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Building, MapPin, Plus, Edit, Trash2, Users, UserPlus, Shield } from 'lucide-react';
import { authSuccess } from '@/lib/features/auth/authSlice';
import { Can } from '@/lib/features/auth/Can';

// Types
interface Branch { id: number; name: string; address: string; phone: string; email: string; }
interface Staff { id: number; user_id: number; name: string; email: string; role: string; active: boolean; }

export const GeneralSettings = ({ user, dispatch }: { user: any, dispatch: any }) => {
  // Current Context (Fallback to first clinic if activeClinicId not explicit)
  const currentClinic = user?.clinics?.find((c: any) => c.id === (user.activeClinicId || user.clinics[0]?.id));
  
  const [clinicData, setClinicData] = useState(currentClinic || {});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  
  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  
  // Forms
  const [newBranch, setNewBranch] = useState({ name: '', address: '', phone: '', email: '' });
  const [newStaff, setNewStaff] = useState({ 
    first_name: '', last_name: '', email: '', phone_number: '', 
    role: 'RECEPTIONIST', password: '' // Password for new users
  });

  useEffect(() => {
    if (currentClinic?.id) {
        setClinicData(currentClinic);
        fetchBranches(currentClinic.id);
        fetchStaff(currentClinic.id);
    }
  }, [currentClinic]);

  // --- DATA FETCHING ---
  const fetchBranches = async (id: number) => {
    try {
      const res = await api.get(`/clinic/${id}/branches`);
      setBranches(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchStaff = async (id: number) => {
    try {
      const res = await api.get(`/clinic-user/staff?clinic_id=${id}`);
      setStaffList(res.data);
    } catch (err) { console.error(err); }
  };

  // --- ACTIONS ---
  const handleUpdateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.put(`/clinic/${clinicData.id}`, clinicData);
      // Update Redux state with new details
      const updatedClinics = user.clinics.map((c: any) => c.id === res.data.clinic.id ? { ...c, ...res.data.clinic } : c);
      dispatch(authSuccess({ user: { ...user, clinics: updatedClinics }, token: localStorage.getItem('token') || '' }));
      alert("Clinic profile updated!");
    } catch (err) { console.error(err); alert("Failed to update profile"); } 
    finally { setIsSubmitting(false); }
  };

  const handleAddBranch = async () => {
    try {
      await api.post(`/clinic/${currentClinic.id}/branch`, newBranch);
      setShowBranchModal(false);
      setNewBranch({ name: '', address: '', phone: '', email: '' }); // Reset
      fetchBranches(currentClinic.id);
      alert("Branch created! It will appear in your clinic switcher after a reload.");
    } catch (err: any) { alert(err.response?.data?.error || "Failed to create branch"); }
  };

  const handleAddStaff = async () => {
    try {
      await api.post('/clinic-user/add-staff', {
        clinic_id: currentClinic.id,
        ...newStaff
      });
      setShowStaffModal(false);
      setNewStaff({ first_name: '', last_name: '', email: '', phone_number: '', role: 'RECEPTIONIST', password: '' });
      fetchStaff(currentClinic.id);
      alert("Staff member added successfully.");
    } catch (err: any) { alert(err.response?.data?.error || "Failed to add staff"); }
  };

  const handleRevokeAccess = async (user_id: number) => {
    if (!confirm("Are you sure you want to revoke access for this user?")) return;
    try {
      await api.post('/clinic-user/remove-staff', { clinic_id: currentClinic.id, user_id });
      fetchStaff(currentClinic.id);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. CLINIC PROFILE */}
      <Can perform="manage_clinic_profile">
        <Card padding="lg">
            <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b">Clinic Profile</h2>
            <form onSubmit={handleUpdateClinic} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input id ="clinic_name" label="Clinic Name" value={clinicData.name} onChange={e => setClinicData({...clinicData, name: e.target.value})} />
            <Input id ="phone" label="Phone Number" value={clinicData.phone} onChange={e => setClinicData({...clinicData, phone: e.target.value})} />
            <Input id ="email" label="Email Address" value={clinicData.email} onChange={e => setClinicData({...clinicData, email: e.target.value})} />
            <Input id ="address" label="Address" value={clinicData.address} onChange={e => setClinicData({...clinicData, address: e.target.value})} />
            <div className="md:col-span-2 flex justify-end mt-4">
                <Button type="submit" variant="primary" disabled={isSubmitting} shine>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
            </div>
            </form>
        </Card>
      </Can>

      {/* 2. BRANCH MANAGEMENT */}
      <Can perform="manage_branches">
        <Card padding="lg">
            <div className="flex justify-between items-center mb-6 pb-2 border-b">
            <div>
                <h2 className="text-xl font-bold text-gray-800">Branch Management</h2>
                <p className="text-sm text-gray-500">Manage sub-clinics and locations.</p>
            </div>
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => setShowBranchModal(!showBranchModal)}> + Add Branch</Button>
            </div>
            
            {/* ADD BRANCH FORM (Toggle) */}
            {showBranchModal && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                    <h4 className="font-semibold mb-3">New Branch Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input id ="branch_name" placeholder="Branch Name" value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} />
                        <Input id ="address" placeholder="Address" value={newBranch.address} onChange={e => setNewBranch({...newBranch, address: e.target.value})} />
                        <Input id ="email" placeholder="Email" value={newBranch.email} onChange={e => setNewBranch({...newBranch, email: e.target.value})} />
                        <Input id ="phone" placeholder="Phone" value={newBranch.phone} onChange={e => setNewBranch({...newBranch, phone: e.target.value})} />
                        <div className="md:col-span-2 flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowBranchModal(false)}>Cancel</Button>
                            <Button variant="primary" size="sm" onClick={handleAddBranch}>Create Branch</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3">
            {branches.length === 0 && <p className="text-gray-500 text-sm">No sub-branches found.</p>}
            {branches.map((branch) => (
                <div key={branch.id} className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Building className="h-5 w-5" />
                    </div>
                    <div>
                    <h4 className="font-semibold text-gray-800">{branch.name}</h4>
                    <p className="text-sm text-gray-500 flex items-center"><MapPin className="h-3 w-3 mr-1" /> {branch.address}</p>
                    </div>
                </div>
                </div>
            ))}
            </div>
        </Card>
      </Can>

      {/* 3. STAFF MANAGEMENT */}
      <Can perform="manage_staff">
        <Card padding="lg">
            <div className="flex justify-between items-center mb-6 pb-2 border-b">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Staff Management</h2>
                    <p className="text-sm text-gray-500">Add receptionists, nurses, or admins.</p>
                </div>
                <Button variant="ghost" size="sm" className="text-primary" onClick={() => setShowStaffModal(!showStaffModal)}> 
                    <UserPlus className="h-4 w-4 mr-1" /> Add Staff
                </Button>
            </div>

            {/* ADD STAFF FORM (Toggle) */}
            {showStaffModal && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                    <h4 className="font-semibold mb-3">New Staff Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input id ="f_name" placeholder="First Name" value={newStaff.first_name} onChange={e => setNewStaff({...newStaff, first_name: e.target.value})} />
                        <Input id ="l_name" placeholder="Last Name" value={newStaff.last_name} onChange={e => setNewStaff({...newStaff, last_name: e.target.value})} />
                        <Input id ="email" placeholder="Email (Login ID)" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} />
                        <Input id ="phone" placeholder="Phone" value={newStaff.phone_number} onChange={e => setNewStaff({...newStaff, phone_number: e.target.value})} />
                        
                        {/* Role Select */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-700">Role</label>
                            <select 
                                className="p-2 border rounded-md"
                                value={newStaff.role}
                                onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                            >
                                <option value="CLINIC_ADMIN">Clinic Admin</option>
                                <option value="RECEPTIONIST">Receptionist</option>
                                <option value="NURSE">Nurse</option>
                                <option value="DOCTOR_PARTNER">Doctor (Partner)</option>
                                <option value="DOCTOR_VISITING">Doctor (Visiting)</option>
                            </select>
                        </div>

                        {/* Password Field (Simple setup for now) */}
                        <Input 
                          id="password"
                            type="password"
                            placeholder="Set Initial Password" 
                            value={newStaff.password} 
                            onChange={e => setNewStaff({...newStaff, password: e.target.value})} 
                        />

                        <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowStaffModal(false)}>Cancel</Button>
                            <Button variant="primary" size="sm" onClick={handleAddStaff}>Add Staff</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-0 divide-y divide-gray-100">
                {staffList.map((staff) => (
                    <div key={staff.id} className={`flex justify-between items-center p-4 ${!staff.active ? 'opacity-50 bg-gray-50' : ''}`}>
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-800">
                                    {staff.name} 
                                    {!staff.active && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactive</span>}
                                </h4>
                                <p className="text-sm text-gray-500">{staff.email} • <span className="font-medium text-indigo-600">{staff.role}</span></p>
                            </div>
                        </div>
                        {staff.active && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:bg-red-50"
                                onClick={() => handleRevokeAccess(staff.user_id)}
                            >
                                <Shield className="h-4 w-4 mr-1" /> Revoke
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </Card>
      </Can>
    </div>
  );
};