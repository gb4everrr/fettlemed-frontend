// src/components/ui/Input.tsx
import React, { useState, useEffect } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ 
  label, 
  id, 
  className = '', 
  icon,
  placeholder,
  value,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  // Update hasValue when value prop changes
  useEffect(() => {
    setHasValue(!!value && value.toString().length > 0);
  }, [value]);

  const handleFocus = () => setIsFocused(true);
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setHasValue(e.target.value.length > 0);
    // Call the original onBlur if provided
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  const inputClasses = `
    input-modern
    w-full px-4 py-3.5 pr-4
    text-[var(--color-text-primary)] text-sm
    placeholder:text-[var(--color-text-muted)]
    focus:outline-none
    ${icon ? 'pl-11' : ''}
  `;

  // If we have a label, use it as floating label and hide placeholder when focused
  // If no label, just use placeholder normally
  const showPlaceholder = label ? (!isFocused && !hasValue) : true;
  const displayPlaceholder = showPlaceholder ? placeholder : '';

  return (
    <div className="relative mb-6">
      {icon && (
        <div className={`
          absolute left-3 top-1/2 transform -translate-y-1/2 z-10
          text-[var(--color-text-muted)] transition-colors duration-300
          ${isFocused ? 'text-[var(--color-primary-brand)]' : ''}
        `}>
          {icon}
        </div>
      )}
      
      <input
        id={id}
        className={`${inputClasses} ${className}`}
        placeholder={displayPlaceholder}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      
      {/* Floating label - only show if label prop is provided */}
      {label && (
        <label 
          htmlFor={id} 
          className={`
            absolute pointer-events-none transition-all duration-300 ease-in-out
            font-medium text-sm z-10
            ${icon ? 'left-11' : 'left-4'}
            ${isFocused || hasValue 
              ? '-top-2.5 text-xs text-[var(--color-primary-brand)] bg-[var(--color-background)] px-2 rounded' 
              : 'top-3.5 text-[var(--color-text-muted)]'
            }
          `}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default Input;