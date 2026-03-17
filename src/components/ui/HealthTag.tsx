import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthTagProps {
  label: string;
  variant?: 'default' | 'allergy' | 'condition';
  onRemove?: () => void;
  className?: string;
}

const variantStyles = {
  default: 'bg-secondary text-secondary-foreground',
  allergy: 'bg-alert-light text-alert',
  condition: 'bg-info-light text-info',
};

export const HealthTag = ({
  label,
  variant = 'default',
  onRemove,
  className,
}: HealthTagProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium',
        variantStyles[variant],
        className
      )}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 p-0.5 rounded-full hover:bg-foreground/10 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
