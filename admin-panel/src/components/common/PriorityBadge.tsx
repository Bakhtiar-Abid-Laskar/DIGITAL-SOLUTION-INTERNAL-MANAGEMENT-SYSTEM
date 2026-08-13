import React from 'react';
import { Badge } from './Badge';
import { useAppConfig } from "@/context/AppConfigContext";

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const { getPriorityColor } = useAppConfig();
  const color = getPriorityColor(priority);
  
  return (
    <Badge 
      style={{ backgroundColor: `${color}20`, color: color, borderColor: `${color}40` }}
      className="border"
    >
      {priority}
    </Badge>
  );
}
