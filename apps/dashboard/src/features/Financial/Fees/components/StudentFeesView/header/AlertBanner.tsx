import React from 'react';
import { Label } from 'najm-kit';

interface AlertBannerProps {
  message: string;
  type?: 'warning' | 'error' | 'info' | 'success';
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  message,
  type = 'warning',
}) => {
  const styles = {
    warning: {
      bg: 'bg-orange-100',
      border: 'border-orange-500',
      text: 'text-orange-900',
      icon: '⚠️',
    },
    error: {
      bg: 'bg-red-100',
      border: 'border-red-500',
      text: 'text-red-900',
      icon: '❌',
    },
    info: {
      bg: 'bg-blue-100',
      border: 'border-blue-500',
      text: 'text-blue-900',
      icon: 'ℹ️',
    },
    success: {
      bg: 'bg-green-100',
      border: 'border-green-500',
      text: 'text-green-900',
      icon: '✅',
    },
  };

  const style = styles[type];

  return (
    <div className={`${style.bg} p-2 px-6 rounded-full flex items-center gap-2`}>
      <span className="text-lg ">{style.icon}</span>
      <Label className={`${style.text}`}>{message}</Label>
    </div>
  );
};