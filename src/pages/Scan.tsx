import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, Upload, FileText, Plus, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { geminiService, PrescriptionData } from '@/lib/gemini';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Scan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PrescriptionData | null>(null);
  const [selectedMeds, setSelectedMeds] = useState<Set<number>>(new Set());
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const isConfigured = geminiService.isConfigured();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isConfigured) {
      toast.error('Please configure your Gemini API key first');
      navigate('/settings');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreviewImage(base64);

      // Extract base64 data and mime type
      const mimeType = base64.split(';')[0].split(':')[1];
      const base64Data = base64.split(',')[1];

      setIsProcessing(true);
      try {
        const prescription = await geminiService.scanPrescription(base64Data, mimeType);
        setResult(prescription);
        setSelectedMeds(new Set(prescription.medications.map((_, i) => i)));
      } catch (error) {
        toast.error('Failed to process prescription. Please try a clearer image.');
        setPreviewImage(null);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleMed = (index: number) => {
    const next = new Set(selectedMeds);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedMeds(next);
  };

  const handleAddSelected = async () => {
    if (!result) return;
    if (!user) {
      toast.error('Please sign in to add medications');
      return;
    }

    const medsToAdd = result.medications.filter((_, i) => selectedMeds.has(i));
    
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('medications').insert(
        medsToAdd.map(med => ({
          user_id: user.id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          times: [med.time && med.time !== 'null' ? med.time : '08:00'],
          stock_count: 30,
        }))
      );

      if (error) throw error;

      toast.success(`Added ${medsToAdd.length} medication${medsToAdd.length > 1 ? 's' : ''}`);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
        {/* Not Configured Warning */}
        {!isConfigured && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-warning-light rounded-2xl border border-warning/20"
          >
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">API Key Required</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure your Gemini API key to scan prescriptions.
                </p>
                <button
                  onClick={() => navigate('/settings')}
                  className="mt-2 text-xs font-medium text-warning hover:underline"
                >
                  Go to Settings →
                </button>
              </div>
            </div>
          </motion.div>
        )}

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
              <div
                onClick={() => isConfigured && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-3xl p-8 text-center transition-colors ${
                  isConfigured
                    ? 'border-primary/30 hover:border-primary/50 cursor-pointer'
                    : 'border-border opacity-50 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <div className="space-y-4">
                    {previewImage && (
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-xl object-contain"
                      />
                    )}
                    <div className="flex items-center justify-center gap-3">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent"
                      />
                      <span className="text-sm font-medium text-foreground">Processing image...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Camera className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground mb-2">
                      Upload Prescription
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Take a photo or upload an image of your prescription
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <span className="px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary">
                        <Upload className="w-4 h-4 inline mr-2" />
                        Choose file
                      </span>
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={!isConfigured || isProcessing}
                />
              </div>

              {/* Tips */}
              <div className="bg-secondary/50 rounded-2xl p-5">
                <h4 className="font-medium text-foreground mb-3">📸 Tips for best results</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Ensure good lighting and clear focus</li>
                  <li>• Include the entire prescription in frame</li>
                  <li>• Avoid shadows or glare on the paper</li>
                  <li>• Hold the camera steady</li>
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
                  {result.medications.map((med, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => toggleMed(i)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedMeds.has(i)
                          ? 'border-primary bg-primary/5'
                          : 'border-border/50 bg-secondary/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                            selectedMeds.has(i) 
                              ? 'bg-primary text-primary-foreground shadow-sm scale-110' 
                              : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {selectedMeds.has(i) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-display font-bold text-foreground truncate">{med.name}</h4>
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px] uppercase tracking-wider">{med.dosage}</span>
                            <span className="opacity-50">•</span>
                            <span>{med.frequency}</span>
                          </p>
                          {med.instructions && (
                            <p className="text-[10px] text-muted-foreground/80 italic mt-1 truncate">{med.instructions}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
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
