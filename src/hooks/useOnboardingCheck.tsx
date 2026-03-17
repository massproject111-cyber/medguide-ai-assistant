import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useOnboardingCheck = () => {
  const { user, loading: authLoading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (authLoading) return;
      
      if (!user) {
        setNeedsOnboarding(false);
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name, age, gender, blood_type')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking profile:', error);
          setNeedsOnboarding(true);
        } else if (!profile) {
          // No profile row exists
          setNeedsOnboarding(true);
        } else {
          const isComplete = 
            profile.full_name !== 'User' &&
            profile.full_name !== null &&
            profile.full_name.trim() !== '' &&
            profile.gender !== null &&
            profile.gender !== '';
          
          setNeedsOnboarding(!isComplete);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setNeedsOnboarding(true);
      } finally {
        setLoading(false);
      }
    };

    checkOnboarding();
  }, [user, authLoading]);

  return { needsOnboarding, loading: loading || authLoading };
};
