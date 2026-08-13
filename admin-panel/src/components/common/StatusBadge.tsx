import React from 'react';
import { Badge } from './Badge';
import { useAppConfig } from "@/context/AppConfigContext";

export interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { getJobStatusColor } = useAppConfig();
  const color = getJobStatusColor(status);
  
  return (
    <Badge 
      style={{ backgroundColor: `${color}20`, color: color, borderColor: `${color}40` }}
      className="border"
    >
      {status}
    </Badge>
  );
}
