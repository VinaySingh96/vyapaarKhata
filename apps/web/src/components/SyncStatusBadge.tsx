import React from 'react';

export interface SyncStatusBadgeProps {
  isPrimary?: boolean;
  isOnline?: boolean;
  pendingOutboxCount?: number;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  isPrimary = true,
  isOnline = true,
  pendingOutboxCount = 0,
}) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '16px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: isOnline ? '#e6f4ea' : '#fef7e0',
        color: isOnline ? '#137333' : '#b06000',
        border: `1px solid ${isOnline ? '#ceead6' : '#fce8e6'}`,
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isOnline ? '#1e8e3e' : '#f9ab00',
        }}
      />
      <span>
        {isPrimary ? 'Primary Server' : 'LAN Client'} •{' '}
        {pendingOutboxCount > 0 ? `${pendingOutboxCount} Syncing` : 'Synced'}
      </span>
    </div>
  );
};
