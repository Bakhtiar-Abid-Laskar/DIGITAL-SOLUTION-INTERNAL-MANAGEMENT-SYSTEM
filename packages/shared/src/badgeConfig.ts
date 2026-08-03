export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'neutral' | 'accent';

export interface BadgeConfig {
  label: string;
  variant: BadgeVariant;
}

export function getStatusBadgeConfig(status: string): BadgeConfig {
  let variant: BadgeVariant = 'default';
  
  switch (status) {
    case 'Received':
      variant = 'default';
      break;
    case 'In Progress':
      variant = 'accent';
      break;
    case 'Waiting for Materials':
      variant = 'warning';
      break;
    case 'Completed':
      variant = 'success';
      break;
    case 'Delivered':
      variant = 'neutral';
      break;
    case 'Cancelled':
      variant = 'danger';
      break;
  }

  return { label: status, variant };
}

export function getPriorityBadgeConfig(priority: string): BadgeConfig {
  let variant: BadgeVariant = 'default';
  
  switch (priority) {
    case 'High':
      variant = 'danger';
      break;
    case 'Medium':
      variant = 'warning';
      break;
    case 'Low':
      variant = 'success';
      break;
    default:
      variant = 'default';
      break;
  }

  return { label: priority, variant };
}
