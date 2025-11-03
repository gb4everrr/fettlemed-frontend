// src/components/ui/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'sidebar';
  size?: 'sm' | 'md' | 'lg';
  shine?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  shine = false,
  className = '',
  ...props
}) => {
  const baseClasses = `btn-base-style ${shine ? 'btn-shine' : ''}`;
  
  const variantClasses = {
    primary: `
      bg-gradient-to-r from-[var(--color-primary-brand)] to-[var(--color-primary-light)]
      text-white shadow-lg
      hover:shadow-xl
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    secondary: `
      bg-gradient-to-r from-[var(--color-secondary-brand)] to-[var(--color-secondary-light)]
      text-white shadow-lg
      hover:shadow-xl
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    outline: `
      bg-transparent border-2 border-[var(--color-border)]
      text-[var(--color-text-primary)] 
      hover:border-[var(--color-primary-brand)] hover:text-[var(--color-primary-brand)]
      
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    ghost: `
      bg-transparent text-[var(--color-text-secondary)]
      hover:bg-[var(--color-text-primary)]/5 hover:text-[var(--color-text-primary)]
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    sidebar: `
       bg-transparent text-[var(--color-text-secondary)]
      hover:bg-[var(--color-text-primary)]/5 hover:text-[var(--color-text-primary)]
      disabled:opacity-50 disabled:cursor-not-allowed
  py-2
    `
  };

  const sizeClasses = {
    sm: 'px-4 py-2.5 text-sm font-medium',
    md: 'px-6 py-3 text-sm font-medium',
    lg: 'px-8 py-3.5 text-base font-medium',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;