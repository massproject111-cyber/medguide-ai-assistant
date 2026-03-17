import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Pill, Calendar, Clock, Trash2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MedCard } from '@/components/ui/MedCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { parseTime24h } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Medication = Tables<'medications'>;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const Medications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() || 7);
  const [takenMeds, setTakenMeds] = useState<Set<string>>(new Set());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
  });
  const [time12, setTime12] = useState({
    hour: '08',
    minute: '00',
    period: 'AM' as 'AM' | 'PM'
  });

  useEffect(() => {
    if (user) {
      loadMedications();
    }
  }, [user]);

  const loadMedications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error('Error loading medications:', error);
      toast.error('Failed to load medications');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedication = async () => {
    if (!newMed.name || !newMed.dosage) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!user) {
      toast.error('Please sign in to add medications');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('medications').insert({
        user_id: user.id,
        name: newMed.name,
        dosage: newMed.dosage,
        frequency: newMed.frequency,
        times: [parseTime24h(parseInt(time12.hour), parseInt(time12.minute), time12.period)],
        stock_count: 30,
      });

      if (error) throw error;

      await loadMedications();
      setIsAddOpen(false);
      setNewMed({ name: '', dosage: '', frequency: 'daily' });
      setTime12({ hour: '08', minute: '00', period: 'AM' });
      toast.success('Medication added successfully');
    } catch (error) {
      console.error('Error adding medication:', error);
      toast.error('Failed to add medication');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMedication = async (id: string) => {
    try {
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await loadMedications();
      toast.success('Medication removed');
    } catch (error) {
      console.error('Error deleting medication:', error);
      toast.error('Failed to delete medication');
    }
  };

  const handleTakeMed = async (medId: string) => {
    if (!user) return;
    
    setTakenMeds(prev => new Set(prev).add(medId));
    
    try {
      await supabase.from('health_logs').insert({
        user_id: user.id,
        type: 'med_taken',
        data: { medicationId: medId, timestamp: new Date().toISOString() },
      });
      
      // Auto-remove the medication from the active schedule
      const { error: deleteError } = await supabase
        .from('medications')
        .delete()
        .eq('id', medId);
        
      if (deleteError) throw deleteError;
      
      await loadMedications();
      toast.success('Medication taken and removed from schedule');
    } catch (error) {
      console.error('Error logging/removing medication:', error);
      toast.error('Failed to update medication status');
    }
  };

  // Sort medications by time
  const sortedMeds = [...medications].sort((a, b) => {
    const aTime = a.times?.[0] || '00:00';
    const bTime = b.times?.[0] || '00:00';
    return aTime.localeCompare(bTime);
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="container max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </motion.button>
            <div className="flex-1">
              <h1 className="font-display text-xl font-semibold text-foreground">Medications</h1>
              <p className="text-sm text-muted-foreground">Manage your daily medications</p>
            </div>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 bg-primary rounded-xl shadow-sm"
                >
                  <Plus className="w-5 h-5 text-primary-foreground" />
                </motion.button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">Add Medication</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="med-name">Medication Name</Label>
                    <Input
                      id="med-name"
                      placeholder="e.g., Aspirin"
                      value={newMed.name}
                      onChange={e => setNewMed(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="med-dosage">Dosage</Label>
                    <Input
                      id="med-dosage"
                      placeholder="e.g., 100mg"
                      value={newMed.dosage}
                      onChange={e => setNewMed(prev => ({ ...prev, dosage: e.target.value }))}
                    />
                  </div>
                    <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Scheduled Time</Label>
                    <div className="flex gap-2 items-center justify-center bg-secondary/30 p-4 rounded-2xl border border-border/50">
                      <div className="flex flex-col items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          max="12"
                          className="w-16 h-12 text-center text-lg font-bold rounded-xl"
                          value={time12.hour}
                          onChange={e => setTime12(prev => ({ ...prev, hour: e.target.value.padStart(2, '0') }))}
                        />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Hour</span>
                      </div>
                      <span className="text-2xl font-light mb-5">:</span>
                      <div className="flex flex-col items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          className="w-16 h-12 text-center text-lg font-bold rounded-xl"
                          value={time12.minute}
                          onChange={e => setTime12(prev => ({ ...prev, minute: e.target.value.padStart(2, '0') }))}
                        />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Min</span>
                      </div>
                      <div className="ml-2 mb-5">
                        <ToggleGroup
                          type="single"
                          value={time12.period}
                          onValueChange={(val) => val && setTime12(prev => ({ ...prev, period: val as 'AM' | 'PM' }))}
                          className="bg-secondary/50 rounded-xl p-1"
                        >
                          <ToggleGroupItem value="AM" className="w-12 h-10 data-[state=on]:bg-white data-[state=on]:shadow-sm rounded-lg text-xs font-bold transition-all">AM</ToggleGroupItem>
                          <ToggleGroupItem value="PM" className="w-12 h-10 data-[state=on]:bg-white data-[state=on]:shadow-sm rounded-lg text-xs font-bold transition-all">PM</ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                    </div>
                  <Button onClick={handleAddMedication} className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Medication'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Week Calendar Strip */}
        <section className="bg-card rounded-2xl p-4 shadow-card border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-medium text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              This Week
            </h2>
          </div>
          <div className="flex gap-2">
            {DAYS.map((day, index) => {
              const dayNum = index + 1;
              const isSelected = selectedDay === dayNum;
              const isToday = new Date().getDay() === dayNum || (new Date().getDay() === 0 && dayNum === 7);

              return (
                <motion.button
                  key={day}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`flex-1 aspect-square flex flex-col items-center justify-center rounded-2xl text-center transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-medium scale-105'
                      : isToday
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary border border-transparent'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70 leading-none mb-1">{day}</span>
                  <span className="text-sm font-black leading-none">{index + 1}</span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Medications List */}
        <section>
          <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Today's Schedule
          </h2>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {sortedMeds.length > 0 ? (
                sortedMeds.map(med => (
                  <motion.div
                    key={med.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative group"
                  >
                    <MedCard
                      name={med.name}
                      dosage={med.dosage}
                      time={med.times?.[0] || '08:00'}
                      taken={takenMeds.has(med.id)}
                      onTake={() => handleTakeMed(med.id)}
                    />
                    <motion.button
                      initial={{ opacity: 0 }}
                      whileHover={{ scale: 1.1 }}
                      className="absolute top-4 right-4 p-2 bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteMedication(med.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </motion.button>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card rounded-2xl p-8 shadow-card border border-border/50 text-center"
                >
                  <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="font-display font-medium text-foreground mb-2">No medications</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start by adding your first medication
                  </p>
                  <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Medication
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
        </main>
      )}
    </div>
  );
};

export default Medications;
