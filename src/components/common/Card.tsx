import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden ${
        hoverable ? 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer hover:border-slate-300' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
