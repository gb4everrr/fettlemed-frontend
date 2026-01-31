'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface DatePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date; // <--- ADDED THIS PROP
}

type ViewMode = 'days' | 'months' | 'years';

export default function DatePicker({
  label,
  value,
  onChange,
  placeholder = "Select date",
  error,
  disabled = false,
  minDate,
  maxDate // <--- Destructure it here
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ViewMode>('days');
  
  // Internal state for navigation (default to value or today)
  const [navDate, setNavDate] = useState(value || new Date());
  
  // For years view pagination
  const [yearPageStart, setYearPageStart] = useState(new Date().getFullYear());

  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal state when opening
  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      setNavDate(value || new Date());
      setYearPageStart((value || new Date()).getFullYear() - 5); // Center year view roughly
      
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX
        });
      }
    }
    setIsOpen(!isOpen);
    setView('days');
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Recalculate coords on scroll/resize to keep attached
      window.addEventListener('scroll', () => setIsOpen(false)); 
      window.addEventListener('resize', () => setIsOpen(false));
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', () => setIsOpen(false));
      window.removeEventListener('resize', () => setIsOpen(false));
    };
  }, [isOpen]);

  // --- HELPER: CHECK IF DATE IS DISABLED ---
  const isDateDisabled = (date: Date) => {
    if (minDate) {
      // Create comparison date at 00:00:00 to avoid time conflicts
      const min = new Date(minDate);
      min.setHours(0,0,0,0);
      if (date < min) return true;
    }
    if (maxDate) {
      const max = new Date(maxDate);
      max.setHours(23,59,59,999); // Compare to end of max day
      if (date > max) return true;
    }
    return false;
  };

  // --- NAVIGATION LOGIC ---
  const handlePrev = () => {
    const newDate = new Date(navDate);
    if (view === 'days') newDate.setMonth(newDate.getMonth() - 1);
    else if (view === 'months') newDate.setFullYear(newDate.getFullYear() - 1);
    else if (view === 'years') setYearPageStart(yearPageStart - 12);
    
    setNavDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(navDate);
    // Validation logic for "Next" button
    if (maxDate && view === 'days') {
       const nextMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 1);
       if (nextMonth > maxDate) return; // Prevent going past maxDate month
    }

    if (view === 'days') newDate.setMonth(newDate.getMonth() + 1);
    else if (view === 'months') newDate.setFullYear(newDate.getFullYear() + 1);
    else if (view === 'years') setYearPageStart(yearPageStart + 12);
    
    setNavDate(newDate);
  };

  const handleDaySelect = (day: number) => {
    const newDate = new Date(navDate.getFullYear(), navDate.getMonth(), day);
    if (isDateDisabled(newDate)) return;
    
    // Normalize to YYYY-MM-DD local time to avoid timezone shifts
    const normalizedDate = new Date(newDate.getFullYear(), newDate.getMonth(), day, 12, 0, 0);
    
    onChange(normalizedDate);
    setIsOpen(false);
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(navDate.getFullYear(), monthIndex, 1);
    setNavDate(newDate);
    setView('days');
  };

  const handleYearSelect = (year: number) => {
    const newDate = new Date(year, navDate.getMonth(), 1);
    setNavDate(newDate);
    setView('months'); // Go to months after picking year
  };

  // --- RENDERING HELPERS ---
  const renderDays = () => {
    const year = navDate.getFullYear();
    const month = navDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
    
    const blanks = Array(firstDayOfMonth).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
      <div className="p-2">
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {blanks.map((_, i) => <div key={`blank-${i}`} />)}
          {days.map(day => {
            const current = new Date(year, month, day);
            const isDisabled = isDateDisabled(current);
            const isSelected = value && 
              value.getDate() === day && 
              value.getMonth() === month && 
              value.getFullYear() === year;

            return (
              <button
                key={day}
                onClick={(e) => { e.preventDefault(); handleDaySelect(day); }}
                disabled={isDisabled}
                className={`
                  h-8 w-8 text-sm rounded-full flex items-center justify-center transition-colors
                  ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}
                  ${isDisabled ? 'text-gray-300 cursor-not-allowed hover:bg-transparent' : ''}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonths = () => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return (
      <div className="grid grid-cols-3 gap-2 p-2">
        {months.map((m, i) => (
          <button
            key={m}
            onClick={() => handleMonthSelect(i)}
            className={`
              p-2 rounded-lg text-sm font-medium hover:bg-gray-100
              ${navDate.getMonth() === i ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}
            `}
          >
            {m}
          </button>
        ))}
      </div>
    );
  };

  const renderYears = () => {
    const years = Array.from({ length: 12 }, (_, i) => yearPageStart + i);
    return (
      <div className="grid grid-cols-3 gap-2 p-2">
        {years.map(y => (
          <button
            key={y}
            onClick={() => handleYearSelect(y)}
            className={`
              p-2 rounded-lg text-sm font-medium hover:bg-gray-100
              ${navDate.getFullYear() === y ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}
            `}
          >
            {y}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="relative w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-3 py-2 border rounded-lg shadow-sm bg-white text-left transition-all h-[42px]
          ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 hover:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}
          ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-70' : ''}
        `}
      >
        <span className={`block truncate text-sm ${!value ? 'text-gray-400' : 'text-gray-900 font-medium'}`}>
          {value ? value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </button>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          style={{ top: coords.top, left: coords.left }}
          className="absolute z-[9999] bg-white border border-gray-200 rounded-xl shadow-2xl w-72 animate-in fade-in zoom-in-95 duration-200 p-2"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-2 pb-2 border-b border-gray-100">
            <button onClick={handlePrev} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
               <ChevronLeft className="h-5 w-5" />
            </button>
            
            <button 
              onClick={() => setView(view === 'days' ? 'years' : 'days')}
              className="flex items-center text-sm font-bold text-gray-800 hover:bg-gray-50 px-2 py-1 rounded transition-colors"
            >
              {view === 'days' && <>{navDate.toLocaleString('default', { month: 'long' })} {navDate.getFullYear()}</>}
              {view === 'months' && <>{navDate.getFullYear()}</>}
              {view === 'years' && <>{yearPageStart} - {yearPageStart + 11}</>}
              <ChevronDown className="h-3 w-3 ml-1 text-gray-400" />
            </button>

            <button onClick={handleNext} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
               <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="min-h-[250px]">
             {view === 'days' && renderDays()}
             {view === 'months' && renderMonths()}
             {view === 'years' && renderYears()}
          </div>
          
        </div>,
        document.body
      )}
    </div>
  );
}