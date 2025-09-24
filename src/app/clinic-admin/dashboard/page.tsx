// src/app/clinic-admin/dashboard/page.tsx
'use client';

import React from 'react';
import ClinicDashboardLayout from '@/components/ClinicDashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAppSelector } from '@/lib/hooks';
import Link from 'next/link';

export default function ClinicDashboardPage() {
    const { user } = useAppSelector((state) => state.auth);

    if (!user) {
        return null;
    }

    return (
        <ClinicDashboardLayout>
            <div className="p-6 md:p-8">
                <h1 className="text-3xl font-bold text-[var(--color-text-dark)] mb-6 font-inter">
                    Welcome to your Clinic Dashboard!
                </h1>
                <p className="text-[var(--color-text-secondary)] text-sm font-inter mb-8">
                    Manage your clinic's doctors, patients, and appointments from here.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card padding="md" className="flex flex-col items-start">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">My Doctors</h3>
                        <p className="text-[var(--color-text-secondary)] text-sm">View and manage the doctors in your clinic.</p>
                        <Link href="/clinic-admin/dashboard/doctors" passHref>
                            <Button variant="ghost" size="sm" className="mt-4">Go to Doctors &rarr;</Button>
                        </Link>
                    </Card>
                    <Card padding="md" className="flex flex-col items-start">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">My Patients</h3>
                        <p className="text-[var(--color-text-secondary)] text-sm">View and manage your clinic's patient list.</p>
                        <Link href="/clinic-admin/dashboard/patients" passHref>
                            <Button variant="ghost" size="sm" className="mt-4">Go to Patients &rarr;</Button>
                        </Link>
                    </Card>
                    <Card padding="md" className="flex flex-col items-start">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Appointments</h3>
                        <p className="text-[var(--color-text-secondary)] text-sm">View and manage upcoming appointments.</p>
                        <Link href="/clinic-admin/dashboard/appointments" passHref>
                            <Button variant="ghost" size="sm" className="mt-4">Go to Appointments &rarr;</Button>
                        </Link>
                    </Card>
                </div>
            </div>
        </ClinicDashboardLayout>
    );
}