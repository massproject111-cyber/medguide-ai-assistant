import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, Upload, FileText, Plus, Check, X, Clock, Calendar, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { scanPrescription, isAIConfigured, type PrescriptionData } from '@/lib/ai-service';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Distribute N doses evenly across waking hours (7am – 10pm)
function buildTimesFromCount(n: number): string[] {
  if (n <= 0) return ['08:00'];
  if (n === 1) return ['08:00'];
  if (n === 2) return ['08:00', '20:00'];
  if (n === 3) return ['08:00', '14:00', '20:00'];
  if (n === 4) return ['08:00', '12:00', '16:00', '20:00'];
  // For n > 4 spread evenly between 8 and 22
  const times: string[] = [];
  const start = 8 * 60, end = 22 * 60;
  const step = Math.floor((end - start) / (n - 1));
  for (let i = 0; i < n; i++) {
    const mins = start + step * i;
    const h = String(Math.floor(mins / 60)).padStart(2, '0');
    const m = String(mins % 60).padStart(2, '0');
    times.push(`${h}:${m}`);
  }
  return times;
}

// Enhance image via canvas: bump contrast + brightness for unclear scans
async function enhanceImage(base64: string): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.filter = 'contrast(1.3) brightness(1.1) saturate(0.8)';
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      resolve({
        data: dataUrl.split(',')[1],
        mimeType: 'image/jpeg',
      });
    };
    img.onerror = () => {
      // If enhancement fails, return original
      const parts = base64.split(',');
      resolve({ data: parts[1] || parts[0], mimeType: 'image/jpeg' });
    };
    img.src = base64;
  });
}

const Scan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('Processing image...');
  const [result, setResult] = useState<PrescriptionData | null>(null);
  const [selectedMeds, setSelectedMeds] = useState<Set<number>>(new Set());
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // editedTimes[i] = array of HH:MM strings, one per dose
  const [editedTimes, setEditedTimes] = useState<Record<number, string[]>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const isConfigured = isAIConfigured();

  // Auto-initialise times whenever a scan result arrives
  useEffect(() => {
    if (!result) { setEditedTimes({}); return; }
    const times: Record<number, string[]> = {};
    result.medications.forEach((med, i) => {
      if (med.time && med.time !== 'null') {
        times[i] = [med.time];
      } else if (med.timesPerDay && med.timesPerDay > 0) {
        times[i] = buildTimesFromCount(med.timesPerDay);
      } else {
        times[i] = ['08:00'];
      }
    });
    setEditedTimes(times);
  }, [result]);

  const processFile = async (file: File) => {
    if (!isConfigured) {
      toast.error('Please configure your Gemini API key first');
      navigate('/settings');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const originalBase64 = e.target?.result as string;
      setPreviewImage(originalBase64);
      setIsProcessing(true);
      setProgressMsg('Enhancing image quality...');

      try {
        // Step 1: enhance image contrast/brightness
        const { data: enhancedData, mimeType } = await enhanceImage(originalBase64);

        setProgressMsg('Reading prescription with AI...');
        const prescription = await scanPrescription(enhancedData, mimeType);

        if (!prescription.medications || prescription.medications.length === 0) {
          toast.warning('No medications detected. Try a clearer or better-lit image.');
          setPreviewImage(null);
        } else {
          setResult(prescription);
          setSelectedMeds(new Set(prescription.medications.map((_, i) => i)));
        }
      } catch (error) {
        console.error('Prescription scan error:', error);
        toast.error('Failed to process prescription. Please try a clearer image.');
        setPreviewImage(null);
      } finally {
        setIsProcessing(false);
        setProgressMsg('Processing image...');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };


  const toggleMed = (index: number) => {
    const next = new Set(selectedMeds);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedMeds(next);
  };

  const updateTime = (medIndex: number, slotIndex: number, value: string) => {
    setEditedTimes(prev => {
      const slots = [...(prev[medIndex] || ['08:00'])];
      slots[slotIndex] = value;
      return { ...prev, [medIndex]: slots };
    });
  };

  const handleAddSelected = async () => {
    if (!result) return;
    if (!user) {
      toast.error('Please sign in to add medications');
      return;
    }

    // Use original indices so we can look up editedTimes correctly
    const selectedIndices = Array.from(selectedMeds);

    setIsProcessing(true);
    try {
      const rowsToInsert: any[] = [];
      selectedIndices.forEach(i => {
        const med = result.medications[i];
        const times = editedTimes[i] ?? buildTimesFromCount(med.timesPerDay || 1);
        
        // For each scheduled time, create a distinct row so the UI renders a card for each dose
        times.forEach(t => {
          rowsToInsert.push({
            user_id: user!.id,
            name: med.name || 'Unknown Medication',
            dosage: med.dosage && med.dosage !== 'null' ? med.dosage : 'Not specified',
            frequency: med.frequency && med.frequency !== 'null' ? med.frequency : 'As directed',
            times: [t], // Wrap the single time in an array as required by DB type
            stock_count: 30,
          });
        });
      });

      const { error } = await supabase.from('medications').insert(rowsToInsert);

      if (error) throw error;

      toast.success(`Added ${selectedIndices.length} medication${selectedIndices.length > 1 ? 's' : ''} with ${selectedIndices.reduce((s, i) => s + (editedTimes[i]?.length || 1), 0)} reminder${selectedIndices.reduce((s, i) => s + (editedTimes[i]?.length || 1), 0) > 1 ? 's' : ''}`);
      navigate('/medications');
    } catch (error) {
      console.error('Error adding medications:', error);
      toast.error('Failed to add medications. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScan = () => {
    setResult(null);
    setPreviewImage(null);
    setSelectedMeds(new Set());
    setEditedTimes({});
    setEditingIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="bg-background">
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
              <h1 className="font-display text-xl font-semibold text-foreground">Scan Prescription</h1>
              <p className="text-sm text-muted-foreground">OCR-powered extraction</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Upload Area */}
              <div className="space-y-3">
                {/* Camera capture */}
                <div
                  onClick={() => cameraInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-3xl p-8 text-center transition-colors ${
                    isConfigured
                      ? 'border-primary/30 hover:border-primary/60 cursor-pointer bg-primary/5 hover:bg-primary/10'
                      : 'border-border opacity-50 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <div className="space-y-4">
                      {previewImage && (
                        <img
                          src={previewImage}
                          alt="Preview"
                          className="max-h-48 mx-auto rounded-xl object-contain opacity-70"
                        />
                      )}
                      <div className="flex flex-col items-center justify-center gap-3">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                          className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent"
                        />
                        <span className="text-sm font-medium text-foreground">{progressMsg}</span>
                        <span className="text-xs text-muted-foreground">This may take a few seconds…</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-display font-semibold text-foreground mb-2">
                        Take a Photo
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Use your camera to capture the prescription
                      </p>
                    </>
                  )}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </div>

                {/* Gallery / file upload */}
                {!isProcessing && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border border-dashed rounded-2xl p-4 text-center transition-colors ${
                      isConfigured
                        ? 'border-border/60 hover:border-primary/40 cursor-pointer hover:bg-secondary/50'
                        : 'border-border opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Or upload from gallery</span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isProcessing}
                    />
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="bg-secondary/50 rounded-2xl p-5">
                <h4 className="font-medium text-foreground mb-3">📸 Tips for best results</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Ensure good lighting and clear focus</li>
                  <li>• Include the entire prescription in frame</li>
                  <li>• Works with handwritten &amp; printed prescriptions</li>
                  <li>• Avoid shadows or glare on the paper</li>
                  <li>• Common shorthand understood (BD, TDS, OD, etc.)</li>
                </ul>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Preview */}
              {previewImage && (
                <div className="relative">
                  <img
                    src={previewImage}
                    alt="Prescription"
                    className="w-full max-h-48 object-contain rounded-2xl"
                  />
                  <button
                    onClick={resetScan}
                    className="absolute top-2 right-2 p-2 bg-foreground/80 rounded-full text-background"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Extracted Medications */}
              <div className="bg-card rounded-2xl p-5 shadow-card border border-border/50">
                <h3 className="font-display font-semibold text-foreground mb-4">
                  Extracted Medications ({result.medications.length})
                </h3>
                <div className="space-y-3">
                  {result.medications.map((med, i) => {
                    const times = editedTimes[i] ?? buildTimesFromCount(med.timesPerDay || 1);
                    const isEditing = editingIndex === i;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`rounded-xl border-2 transition-all ${
                          selectedMeds.has(i)
                            ? 'border-primary bg-primary/5'
                            : 'border-border/50 bg-secondary/50'
                        }`}
                      >
                        {/* ── Card header (tap to select) ── */}
                        <div
                          className="p-4 cursor-pointer"
                          onClick={() => toggleMed(i)}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all mt-0.5 ${
                                selectedMeds.has(i)
                                  ? 'bg-primary text-primary-foreground shadow-sm scale-110'
                                  : 'bg-secondary text-muted-foreground'
                              }`}
                            >
                              {selectedMeds.has(i) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-display font-bold text-foreground truncate">{med.name}</h4>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px] uppercase tracking-wider font-medium">{med.dosage}</span>
                                <span className="text-[10px] text-muted-foreground/50">•</span>
                                <span className="text-xs text-muted-foreground">{med.frequency}</span>
                              </div>
                              {/* Duration */}
                              {med.duration && med.duration !== 'null' && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Calendar className="w-3 h-3 text-muted-foreground/70" />
                                  <span className="text-[11px] text-muted-foreground">{med.duration}</span>
                                </div>
                              )}
                              {med.instructions && med.instructions !== 'null' && (
                                <p className="text-[10px] text-muted-foreground/80 italic mt-1 truncate">{med.instructions}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ── Dose times row ── */}
                        <div
                          className="px-4 pb-3 flex items-center gap-2 flex-wrap"
                          onClick={e => e.stopPropagation()}
                        >
                          <Clock className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
                          {times.map((t, si) => (
                            <span
                              key={si}
                              className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold"
                            >
                              {t}
                            </span>
                          ))}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setEditingIndex(isEditing ? null : i);
                            }}
                            className="ml-auto flex items-center gap-1 text-[11px] font-medium text-primary/70 hover:text-primary transition-colors px-2 py-0.5 rounded-lg hover:bg-primary/10"
                          >
                            <Pencil className="w-3 h-3" />
                            {isEditing ? 'Done' : 'Edit times'}
                          </button>
                        </div>

                        {/* ── Editable time slots (expanded) ── */}
                        <AnimatePresence>
                          {isEditing && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                              onClick={e => e.stopPropagation()}
                            >
                              <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                  Dose Times — {times.length}× per day
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {times.map((t, si) => (
                                    <div key={si} className="flex flex-col gap-1">
                                      <label className="text-[10px] text-muted-foreground font-medium">
                                        Dose {si + 1}
                                      </label>
                                      <input
                                        type="time"
                                        value={t}
                                        onChange={e => updateTime(i, si, e.target.value)}
                                        className="h-9 w-full rounded-xl border border-border/60 bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                      />
                                    </div>
                                  ))}
                                </div>
                                {/* Add / remove dose buttons */}
                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={() => setEditedTimes(prev => ({ ...prev, [i]: [...times, '08:00'] }))}
                                    className="text-[11px] font-semibold text-primary hover:underline"
                                  >
                                    + Add dose
                                  </button>
                                  {times.length > 1 && (
                                    <button
                                      onClick={() => setEditedTimes(prev => ({ ...prev, [i]: times.slice(0, -1) }))}
                                      className="text-[11px] font-semibold text-destructive hover:underline"
                                    >
                                      − Remove last
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetScan}
                  className="flex-1"
                >
                  Scan Again
                </Button>
                <Button
                  onClick={handleAddSelected}
                  disabled={selectedMeds.size === 0}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Selected ({selectedMeds.size})
                </Button>
              </div>

              {/* Disclaimer */}
              <div className="bg-warning-light rounded-2xl p-4 border border-warning/20">
                <p className="text-xs text-muted-foreground">
                  ⚠️ Please verify the extracted information before adding. OCR may not be 100% accurate.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Scan;
