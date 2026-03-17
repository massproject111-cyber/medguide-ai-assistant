import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { formatTime12h } from '@/lib/utils';

export const useMedicationReminders = () => {
  const { user } = useAuth();
  const [lastCheck, setLastCheck] = useState<string>('');

  useEffect(() => {
    if (!user) return;

    const requestPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    };
    requestPermission();

    const checkMedications = async () => {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Avoid double triggering in the same minute
      if (currentTime === lastCheck) return;
      setLastCheck(currentTime);

      const { data: meds, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user.id);

      if (error || !meds) return;

      meds.forEach((med) => {
        if (med.times?.includes(currentTime)) {
          // Trigger in-app toast
          toast.info(`Time to take your ${med.name}!`, {
            description: `Scheduled for: ${formatTime12h(currentTime)} - Dosage: ${med.dosage}`,
            duration: 10000,
          });

          // Trigger browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('MedGuide AI Reminder', {
              body: `It's time for your ${med.name} (${med.dosage}) - Scheduled for ${formatTime12h(currentTime)}`,
              icon: '/favicon.svg',
            });
          }
        }
      });
    };

    // Run every minute
    const interval = setInterval(checkMedications, 60000);
    
    // Initial check
    checkMedications();

    return () => clearInterval(interval);
  }, [user, lastCheck]);
};
