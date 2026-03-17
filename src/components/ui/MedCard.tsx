import { motion } from 'framer-motion';
import { Pill, Clock, Check } from 'lucide-react';
import { useState } from 'react';
import { cn, formatTime12h } from '@/lib/utils';

interface MedCardProps {
  name: string;
  dosage: string;
  time: string;
  taken?: boolean;
  onTake?: () => void;
  color?: string;
  className?: string;
}

export const MedCard = ({
  name,
  dosage,
  time,
  taken = false,
  onTake,
  color = 'primary',
  className,
}: MedCardProps) => {
  const [showConfetti, setShowConfetti] = useState(false);

  const handleTake = () => {
    if (taken || !onTake) return;
    setShowConfetti(true);
    onTake();
    setTimeout(() => setShowConfetti(false), 1000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative bg-card rounded-2xl p-4 shadow-card border border-border/50 overflow-hidden',
        taken && 'opacity-60',
        className
      )}
    >
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary"
              initial={{
                x: '50%',
                y: '50%',
                scale: 0,
              }}
              animate={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                scale: [0, 1, 0],
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 0.8,
                ease: 'easeOut',
                delay: i * 0.02,
              }}
              style={{
                backgroundColor: i % 3 === 0 ? 'hsl(var(--primary))' : i % 3 === 1 ? 'hsl(var(--warning))' : 'hsl(var(--info))',
              }}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
            taken ? 'bg-success/10' : 'bg-primary/10'
          )}
        >
          {taken ? (
            <Check className="w-6 h-6 text-success" />
          ) : (
            <Pill className="w-6 h-6 text-primary" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-foreground truncate">
            {name}
          </h3>
          <p className="text-sm text-muted-foreground">{dosage}</p>
        </div>

        {/* Time & Action */}
        <div className="flex flex-col items-end shrink-0 py-0.5 min-w-[70px]">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold tabular-nums leading-none">{formatTime12h(time)}</span>
          </div>
          {!taken && onTake && (
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: 'hsl(var(--primary-light))' }}
              whileTap={{ scale: 0.95 }}
              onClick={handleTake}
              className="px-4 py-1.5 text-xs font-bold text-primary-foreground bg-primary rounded-full shadow-sm hover:shadow-md transition-all whitespace-nowrap"
            >
              Take
            </motion.button>
          )}
          {taken && (
            <div className="px-3 py-1 bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider rounded-full">
              Taken
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
