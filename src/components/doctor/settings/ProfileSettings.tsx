'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// --- Interfaces ---
interface ProfileData {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    medical_reg_no: string;
    specialization: string;
}

interface StatusMessage {
    type: 'success' | 'error';
    message: string;
}

// --- Main Component ---
export const ProfileSettings = () => {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
    
    // --- Data Fetching ---
    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const { data } = await api.get<ProfileData>('/doctor/profile');
                setProfile(data);
            } catch (err) {
                console.error("Error fetching profile:", err);
                setStatusMessage({ type: 'error', message: 'Failed to load your profile.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);

    // --- Form Handling ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!profile) return;
        const { name, value } = e.target;
        setProfile({ ...profile, [name]: value });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        
        setIsSaving(true);
        setStatusMessage(null);

        try {
            const { data } = await api.put('/doctor/profile', profile);
            setProfile(data); // The API returns the full updated profile
            setStatusMessage({ type: 'success', message: 'Profile updated successfully!' });
        } catch (err) {
            console.error("Error updating profile:", err);
            setStatusMessage({ type: 'error', message: 'Failed to save changes. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    // --- Render Logic ---
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }
    
    return (
        <Card padding="lg">
            {profile ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <Input id="first_name" name="first_name" type="text" value={profile.first_name} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <Input id="last_name" name="last_name" type="text" value={profile.last_name} onChange={handleInputChange} required />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <Input id="email" name="email" type="email" value={profile.email} disabled className="bg-gray-100 cursor-not-allowed" />
                    </div>
                        <div>
                        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <Input id="phone_number" name="phone_number" type="tel" value={profile.phone_number} onChange={handleInputChange} required />
                    </div>

                    <h2 className="text-xl font-semibold text-gray-700 border-b pb-2 pt-4">Professional Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="medical_reg_no" className="block text-sm font-medium text-gray-700 mb-1">Medical Registration No.</label>
                            <Input id="medical_reg_no" name="medical_reg_no" type="text" value={profile.medical_reg_no} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                            <Input id="specialization" name="specialization" type="text" value={profile.specialization} onChange={handleInputChange} required />
                        </div>
                    </div>

                    <div className="flex items-center justify-end space-x-4 pt-4">
                        {statusMessage && (
                            <p className={`text-sm ${statusMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {statusMessage.message}
                            </p>
                        )}
                        <Button type="submit" disabled={isSaving} shine>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            ) : (
                    <p className="text-center text-red-500">{statusMessage?.message || 'Could not load profile data.'}</p>
            )}
        </Card>
    );
};