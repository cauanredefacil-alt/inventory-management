import React from 'react';
import { Badge } from './ui/badge';

const statusConfig = {
  available: {
    label: 'Disponível',
    className: 'bg-status-available text-status-available-foreground'
  },
  'in-use': {
    label: 'Em Uso',
    className: 'bg-status-in-use text-status-in-use-foreground'
  },
  maintenance: {
    label: 'Manutenção',
    className: 'bg-status-maintenance text-status-maintenance-foreground'
  }
};

const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.available;
  
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
