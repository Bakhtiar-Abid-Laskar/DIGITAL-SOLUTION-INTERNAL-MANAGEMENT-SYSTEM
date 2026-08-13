import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent } from './Card';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  asCard?: boolean;
}

export function ErrorState({ 
  title = "Something went wrong", 
  message = "There was an error loading this data. Please try again.", 
  onRetry,
  asCard = true 
}: ErrorStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
      <div className="w-12 h-12 rounded-full bg-admin-danger-dim flex items-center justify-center mb-4">
        <AlertCircle size={24} className="text-admin-danger" />
      </div>
      <h3 className="text-lg font-semibold text-admin-text-primary mb-2">{title}</h3>
      <p className="text-sm text-admin-text-secondary mb-6 max-w-md">{message}</p>
      {onRetry && (
        <Button 
          variant="outline" 
          onClick={onRetry}
          leftIcon={<RefreshCw size={16} />}
        >
          Try Again
        </Button>
      )}
    </div>
  );

  if (asCard) {
    return (
      <Card noAccentLine>
        <CardContent className="p-0">
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}
