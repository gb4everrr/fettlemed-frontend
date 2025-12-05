'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  minDate?: Date;
}

export default function DatePicker({
  label,
  value,
  onChange,
  placeholder = "Select date",
  error,
  disabled = false,
  minDate
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // We need coords to position the portal correctly
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Toggle open and calculate position
  const toggleOpen = () => {
    if (disabled) return;
    
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // We use 'fixed' position, so we just need viewport coordinates
      setCoords({
        top: rect.bottom + 8, // 8px gap below input
        left: rect.left
      });
    }
    setIsOpen(!isOpen);
  };

  // Close when clicking outside
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

    // Close on scroll (to prevent floating calendar from detaching)
    const handleScroll = () => {
        if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true); // Capture true to detect scrolling in any parent
        window.addEventListener('resize', handleScroll);
    }
    
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  // Sync calendar view with selected value
  useEffect(() => {
    if (value) {
      setCurrentMonth(value.getMonth());
      setCurrentYear(value.getFullYear());
    }
  }, [value, isOpen]); // Re-sync when opening

  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  
  const handleDateClick = (date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    onChange(newDate);
    setIsOpen(false);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const today = new Date();
  today.setHours(0,0,0,0);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      {/* The Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={`
          w-full flex items-center justify-between px-3 py-2 
          bg-white border rounded-lg text-sm text-left
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-shadow
          ${error ? 'border-red-300 focus:ring-red-200' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:border-gray-400'}
        `}
        disabled={disabled}
      >
        <span className={`truncate ${!value ? 'text-gray-400' : 'text-gray-900'}`}>
          {value ? formatDateDisplay(value) : placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0 ml-2" />
      </button>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {/* The Portal: Renders at the root of the document body */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
            ref={dropdownRef}
            className="fixed z-[9999] w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-4"
            style={{ 
                top: coords.top, 
                left: coords.left,
            }}
        >
          <div className="flex justify-between items-center mb-4">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h3 className="font-semibold text-gray-800">
              {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} {currentYear}
            </h3>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: daysInMonth[0]?.getDay() ?? 0 }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {daysInMonth.map(day => {
              const isSelected = value?.toDateString() === day.toDateString();
              const isToday = day.toDateString() === today.toDateString();
              const isBeforeMin = minDate ? day < minDate : false;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  disabled={isBeforeMin}
                  className={`
                    h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors
                    ${isSelected ? 'bg-blue-950 text-white font-semibold' : ''}
                    ${!isSelected && !isBeforeMin ? 'hover:bg-blue-50 text-gray-700' : ''}
                    ${isToday && !isSelected ? 'bg-gray-100 text-primary font-bold' : ''}
                    ${isBeforeMin ? 'text-gray-300 cursor-not-allowed line-through' : ''}
                  `}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}