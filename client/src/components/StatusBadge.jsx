import React from 'react';

export const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = status.toUpperCase();

  let badgeClass = 'badge-pending';
  if (normalized === 'ACCEPTED') badgeClass = 'badge-accepted';
  else if (normalized === 'COMPLETED') badgeClass = 'badge-completed';
  else if (normalized === 'DECLINED') badgeClass = 'badge-declined';
  else if (normalized === 'CANCELLED') badgeClass = 'badge-cancelled';
  else if (normalized === 'EXPIRED') badgeClass = 'badge-expired';

  return <span className={`badge ${badgeClass}`}>{normalized}</span>;
};

export default StatusBadge;
