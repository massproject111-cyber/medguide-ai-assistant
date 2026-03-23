import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MessageSquare, CheckCircle2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: {
    name: string;
    specialty: string;
    hospital: string;
  } | null;
}

const AVAILABLE_TIMES = [
  '09:00 AM', '10:00 AM', '11:00 AM', 
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
];

export const BookingModal = ({ isOpen, onClose, doctor }: BookingModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');

  const handleBooking = async () => {
    if (!user || !doctor) return;
    
    setLoading(true);
    try {
      const appointmentDetails = {
        user_id: user.id,
        doctor_name: doctor.name,
        specialty: doctor.specialty,
        hospital_name: doctor.hospital,
        appointment_date: date,
        appointment_time: time,
        reason: reason,
        status: 'scheduled'
      };

      try {
        // HTTP Request to Webhook (Replace this URL with your custom Google Apps Script or Zapier URL)
        const WEBHOOK_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'; 
        // Using no-cors mode allows sending POST to Google Apps Script without blocked by CORS issues
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointmentDetails)
        });
        console.log('Webhook sent successfully');
      } catch (webhookError) {
        console.warn('Webhook notification failed but proceeding to save to database...', webhookError);
      }

      const { error } = await supabase.from('appointments').insert(appointmentDetails);

      if (error) throw error;

      setStep(3);
      toast.success('Appointment booked successfully!');
    } catch (error: unknown) {
      console.error('Booking error:', error);
      let errorMessage = 'Failed to book appointment';
      if (error instanceof Error) {
          errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
          errorMessage = String((error as Error).message);
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setDate('');
    setTime('');
    setReason('');
    onClose();
  };

  if (!doctor) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-card border border-border/50 rounded-3xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-display font-semibold text-foreground">Book Appointment</h2>
                <p className="text-sm text-muted-foreground">with {doctor.name}</p>
              </div>
              <button onClick={resetAndClose} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6">
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Select Date</Label>
                    <Input 
                      type="date" 
                      value={date} 
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Clock className="w-4 h-4" /> Select Time</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {AVAILABLE_TIMES.map((t) => (
                        <button
                          key={t}
                          onClick={() => setTime(t)}
                          className={`py-2 px-1 text-xs font-medium rounded-lg border transition-all ${
                            time === t 
                              ? 'bg-primary text-primary-foreground border-primary' 
                              : 'bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button 
                    className="w-full h-12 gradient-primary rounded-xl"
                    disabled={!date || !time}
                    onClick={() => setStep(2)}
                  >
                    Continue
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Reason for Visit</Label>
                    <Textarea 
                      placeholder="Describe your symptoms or reason for the visit..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="min-h-[120px] rounded-xl resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setStep(1)}>Back</Button>
                    <Button 
                      className="flex-[2] h-12 gradient-primary rounded-xl" 
                      disabled={loading}
                      onClick={handleBooking}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Booking'}
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="py-8 text-center space-y-4">
                  <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-12 h-12 text-success" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-foreground">Booking Confirmed!</h3>
                  <p className="text-muted-foreground">
                    Your appointment with {doctor.name} at {doctor.hospital} is scheduled for {date} at {time}.
                  </p>
                  <Button className="w-full h-12 rounded-xl mt-6" onClick={resetAndClose}>Close</Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
