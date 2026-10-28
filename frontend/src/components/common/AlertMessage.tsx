import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface AlertMessageProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
}

export const AlertMessage: React.FC<AlertMessageProps> = ({ type, message, onClose }) => {
  const config = {
    success: {
      bg: 'rgba(16, 185, 129, 0.12)',
      border: '#10b981',
      color: '#34d399',
      icon: <CheckCircle size={20} color="#10b981" />,
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.12)',
      border: '#ef4444',
      color: '#f87171',
      icon: <AlertCircle size={20} color="#ef4444" />,
    },
    info: {
      bg: 'rgba(59, 130, 246, 0.12)',
      border: '#3b82f6',
      color: '#60a5fa',
      icon: <Info size={20} color="#3b82f6" />,
    },
  }[type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 1.25rem',
        borderRadius: '8px',
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        marginBottom: '1.25rem',
        fontSize: '0.925rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {config.icon}
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
          }}
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};
