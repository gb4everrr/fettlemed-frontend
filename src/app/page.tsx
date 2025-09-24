'use client'; 

import Image from 'next/image';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';



export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 py-4 px-6 md:px-12 flex justify-between items-center glassmorphic-navbar shadow-md">
        <div className="flex items-center">
          {/* Ensure you have these images in public/images/ */}
          <Image src="/images/Fettle Universe.png" alt="Fettlemed Logo" width={40} height={40} className="rounded-full" />
          <span className="ml-3 text-2xl font-bold text-gray-800 font-inter">FettleMed</span>
        </div>
        <div className="space-x-4">
          <Link href="/auth/login" passHref>
            <Button variant="outline" shine size="sm">Login</Button> {/* Will now be a standard outline button */}
          </Link>
          
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 font-inter leading-tight">
          Unifying Healthcare for a <span className="gradient-text">Healthier India</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-700 max-w-2xl mb-10 font-inter">
          Fettlemed seamlessly connects patients, doctors, and clinics on a single, secure platform,
          streamlining healthcare management and improving access to quality care.
        </p>

        <div className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-6">
          <Card className="flex flex-col items-center justify-center p-8 w-full md:w-80 h-auto text-center">
            <Image src="/images/Clinic.png" alt="Clinic Icon" width={100} height={100} className="mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-3 font-inter">Clinic Management</h2>
            <p className="text-gray-600 mb-6 font-inter">
              Empower your clinic with efficient scheduling, patient records, and administrative tools.
            </p>
            <Link href="/auth/register?role=clinic_admin" passHref>
              <Button variant="primary" size="md" className="w-full" shine>Register as Clinic</Button>
            </Link>
          </Card>

          <Card className="flex flex-col items-center justify-center p-8 w-full md:w-80 h-auto text-center">
            <Image src="/images/Doctor.png" alt="Doctor Icon" width={100} height={100} className="mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-3 font-inter">Doctor Portal</h2>
            <p className="text-gray-600 mb-6 font-inter">
              Manage appointments, access patient history, and collaborate effortlessly.
            </p>
            <Link href="/auth/register?role=doctor" passHref>
              <Button variant="primary" size="md" className="w-full" shine>Register as Doctor</Button>
            </Link>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-gray-600 text-sm font-inter">
        &copy; {new Date().getFullYear()} Fettlemed. All rights reserved.
      </footer>
    </div>
  );
}