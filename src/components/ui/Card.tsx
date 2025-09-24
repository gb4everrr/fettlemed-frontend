// src/components/ui/Card.tsx
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'subtle';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'lg',
  ...props 
}) => {
  const baseClasses = 'glassmorphic-card transition-all duration-300 ease-in-out';
  
  const variantClasses = {
    default: '',
    elevated: `
      shadow-xl hover:shadow-2xl
      border-0
      bg-white/90
    `,
    outlined: `
      border-2 border-[var(--color-border)]
      shadow-sm hover:shadow-md
      bg-white/70
    `,
    subtle: `
      border-0 shadow-sm
      bg-white/60 hover:bg-white/80
    `
  };

  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };

  return (
    <div
      className={`
        ${baseClasses} 
        ${variantClasses[variant]} 
        ${paddingClasses[padding]} 
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;