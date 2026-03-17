import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionCardProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'warning' | 'danger';
  className?: string;
}

const variantStyles = {
  default: 'bg-card hover:bg-secondary/50 border-border/50',
  primary: 'bg-gradient-to-br from-primary/10 to-accent/10 hover:from-primary/15 hover:to-accent/15 border-primary/20',
  warning: 'bg-gradient-to-br from-warning-light to-card hover:from-warning/20 border-warning/20',
  danger: 'bg-gradient-to-br from-alert-light to-card hover:from-alert/20 border-alert/20',
};

const iconVariantStyles = {
  default: 'bg-secondary text-foreground',
  primary: 'bg-primary text-primary-foreground',
  warning: 'bg-warning text-warning-foreground',
  danger: 'bg-alert text-primary-foreground',
};

export const QuickActionCard = ({
  icon: Icon,
  label,
  description,
  onClick,
  variant = 'default',
  className,
}: QuickActionCardProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative p-4 rounded-2xl border shadow-card text-left transition-colors w-full',
        variantStyles[variant],
        className
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
          iconVariantStyles[variant]
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-display font-semibold text-foreground text-sm">
        {label}
      </h3>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </motion.button>
  );
};
