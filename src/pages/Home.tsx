/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Pill,
  Phone,
  Stethoscope,
  ChevronRight,
  Settings,
  MessageSquare,
  Sparkles,
  Scan,
  MapPin,
  Calendar,
} from 'lucide-react';
import { QuickActionCard } from '@/components/ui/QuickActionCard';
import { MedCard } from '@/components/ui/MedCard';
import { DiseaseFinder } from '@/components/disease-finder/DiseaseFinder';
import { DoctorBooking } from '@/components/disease-finder/DoctorBooking';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

type Medication = Tables<'medications'>;

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userName, setUserName] = useState('User');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [greeting, setGreeting] = useState('Good morning');
  const [takenMeds, setTakenMeds] = useState<Set<string>>(new Set());
  const [showDirectory, setShowDirectory] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');

  useEffect(() => {
    // Set greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    // Fetch profile name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile?.full_name) {
      setUserName(profile.full_name.split(' ')[0]);
    }

    // Fetch medications
    const { data: meds } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', user.id);

    if (meds) {
      setMedications(meds);
    }
  };

  const getNextMedication = () => {
    if (medications.length === 0) return null;
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Find next medication by time
    const sorted = [...medications].sort((a, b) => {
      const aTime = a.times?.[0] || '00:00';
      const bTime = b.times?.[0] || '00:00';
      return aTime.localeCompare(bTime);
    });

    return sorted.find(m => (m.times?.[0] || '00:00') >= currentTime && !takenMeds.has(m.id)) || sorted[0];
  };

  const handleTakeMed = async (medId: string) => {
    if (!user) return;
    setTakenMeds(prev => new Set(prev).add(medId));
    await supabase.from('health_logs').insert({
      user_id: user.id,
      type: 'med_taken',
      data: { medicationId: medId, timestamp: new Date().toISOString() },
    });
  };

  const handleFindSpecialist = (specialty: string) => {
    setSelectedSpecialty(specialty);
    setShowDirectory(true);
  };

  const nextMed = getNextMedication();

  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient */}
      <header className="sticky top-0 z-40 glass gradient-header border-b border-border/50">
        <div className="container max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl font-bold text-foreground truncate leading-tight">
                {greeting}, <span className="text-gradient">{userName}</span>
              </h1>
              <p className="text-xs font-medium text-muted-foreground mt-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-primary/60" />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05, rotate: 15 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/settings')}
              className="p-3 bg-card rounded-2xl border border-border/50 shadow-soft hover:shadow-medium transition-all shrink-0"
            >
              <Settings className="w-5 h-5 text-primary" />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Medications - Top of Dashboard */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-foreground">Medications</h2>
            <button
              onClick={() => navigate('/medications')}
              className="text-sm text-primary font-medium flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {nextMed ? (
            <MedCard
              name={nextMed.name}
              dosage={nextMed.dosage}
              time={nextMed.times?.[0] || '08:00'}
              taken={takenMeds.has(nextMed.id)}
              onTake={() => handleTakeMed(nextMed.id)}
            />
          ) : (
            <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50 text-center">
              <Pill className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No medications scheduled</p>
              <button
                onClick={() => navigate('/medications')}
                className="mt-3 text-sm font-medium text-primary"
              >
                Add medication
              </button>
            </div>
          )}
        </section>

        {/* Disease Finder */}
        <DiseaseFinder onFindSpecialist={handleFindSpecialist} />

        {/* Quick Actions - Core Modules */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-foreground">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <QuickActionCard
              icon={Scan}
              label="Scan Rx"
              description="Prescription OCR"
              onClick={() => navigate('/scan')}
            />
            <QuickActionCard
              icon={Pill}
              label="Interaction Analysis"
              description="Check med interactions"
              variant="warning"
              onClick={() => navigate('/interactions')}
            />
            <QuickActionCard
              icon={MessageSquare}
              label="AI Chat"
              description="Clinical assistant"
              variant="primary"
              onClick={() => navigate('/chat')}
            />
            <QuickActionCard
              icon={Phone}
              label="Emergency SOS"
              description="Quick access"
              variant="danger"
              onClick={() => navigate('/emergency')}
            />
          </div>
        </section>

        {/* Find Healthcare */}
        <section>
          <QuickActionCard
            icon={MapPin}
            label="Find Hospitals & Doctors"
            description="Browse our directory of specialists and facilities"
            onClick={() => {
              setSelectedSpecialty('General Physician');
              setShowDirectory(true);
            }}
            className="w-full"
          />
        </section>

        {/* Inline Doctor Booking */}
        {showDirectory && (
          <section>
            <DoctorBooking
              specialist={selectedSpecialty || 'General Physician'}
              onClose={() => setShowDirectory(false)}
            />
          </section>
        )}
      </main>
    </div>
  );
};

export default Home;