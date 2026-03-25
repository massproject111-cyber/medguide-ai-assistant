import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Activity, Search, AlertTriangle, ChevronRight, Stethoscope, Check, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { analyzeSymptoms, isAIConfigured, type SymptomAnalysis } from '@/lib/ai-service';
import { addLog } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DoctorBooking } from '@/components/disease-finder/DoctorBooking';

const COMMON_SYMPTOMS = [
  'Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea',
  'Sore throat', 'Body aches', 'Runny nose', 'Dizziness',
  'Shortness of breath', 'Chest pain', 'Abdominal pain',
  'Back pain', 'Joint pain', 'Skin rash', 'Insomnia'
];

const Symptoms = () => {
  const navigate = useNavigate();
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SymptomAnalysis | null>(null);
  const [activeSpecialist, setActiveSpecialist] = useState<string | null>(null);
  const isConfigured = isAIConfigured();

  const filteredSymptoms = COMMON_SYMPTOMS.filter(s =>
    s.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSymptom = (symptom: string) => {
    const next = new Set(selectedSymptoms);
    if (next.has(symptom)) next.delete(symptom);
    else next.add(symptom);
    setSelectedSymptoms(next);
  };

  const handleAnalyze = async () => {
    if (selectedSymptoms.size === 0) {
      toast.error('Please select at least one symptom');
      return;
    }

    if (!isConfigured) {
      toast.error('Please configure your Gemini API key first');
      navigate('/settings');
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const analysis = await analyzeSymptoms([...selectedSymptoms]);
      setResult(analysis);
      addLog('symptom_check', { symptoms: [...selectedSymptoms], result: analysis });
    } catch (error) {
      toast.error('Failed to analyze symptoms. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'emergency': return 'bg-alert text-alert-foreground';
      case 'high': return 'bg-alert/80 text-primary-foreground';
      case 'moderate': return 'bg-warning text-warning-foreground';
      default: return 'bg-success text-success-foreground';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'bg-primary';
    if (confidence >= 40) return 'bg-warning';
    return 'bg-muted-foreground';
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
              <h1 className="font-display text-xl font-semibold text-foreground">Symptom Checker</h1>
              <p className="text-sm text-muted-foreground">AI-powered analysis</p>
            </div>
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
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
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">API Key Required</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure your Gemini API key to use symptom analysis.
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

        {/* Results */}
        <AnimatePresence mode="wait">
          {activeSpecialist && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <DoctorBooking
                specialist={activeSpecialist}
                onClose={() => setActiveSpecialist(null)}
              />
              <Button
                onClick={() => {
                  setResult(null);
                  setActiveSpecialist(null);
                  setSelectedSymptoms(new Set());
                }}
                variant="outline"
                className="w-full"
              >
                Start New Check
              </Button>
            </motion.div>
          )}

          {result && !activeSpecialist && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Urgency Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getUrgencyColor(result.urgencyLevel)}`}>
                <AlertTriangle className="w-4 h-4" />
                {result.urgencyLevel.charAt(0).toUpperCase() + result.urgencyLevel.slice(1)} Urgency
              </div>

              {/* Conditions */}
              <div className="space-y-3">
                {result.conditions.map((condition, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-card rounded-2xl p-4 shadow-card border border-border/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-display font-semibold text-foreground">{condition.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{condition.description}</p>
                      </div>
                      <span className="text-2xl font-bold text-primary">{condition.confidence}%</span>
                    </div>
                    
                    {/* Confidence Bar */}
                    <div className="h-2 bg-secondary rounded-full overflow-hidden mb-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${condition.confidence}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${getConfidenceColor(condition.confidence)}`}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2 text-sm">
                        <Stethoscope className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Recommended:</span>
                        <span className="font-medium text-foreground">{condition.specialist}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveSpecialist(condition.specialist)}
                        className="gap-1 shrink-0"
                      >
                        Find <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Recommendations */}
              <div className="bg-info-light rounded-2xl p-4 border border-info/20">
                <h4 className="font-medium text-foreground mb-3">Recommendations</h4>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Disclaimer */}
              <div className="bg-warning-light rounded-2xl p-4 border border-warning/20">
                <p className="text-xs text-muted-foreground">
                  ⚠️ This analysis is for informational purposes only and does not constitute medical advice. Please consult a healthcare professional for proper diagnosis.
                </p>
              </div>

              <Button
                onClick={() => {
                  setResult(null);
                  setSelectedSymptoms(new Set());
                }}
                variant="outline"
                className="w-full"
              >
                Start New Check
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Symptom Selection */}
        {!result && (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search symptoms..."
                className="w-full pl-11 pr-4 py-3 bg-card rounded-2xl border border-border/50 shadow-card focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Selected Count */}
            {selectedSymptoms.size > 0 && (
              <div className="flex items-center justify-between bg-primary/10 rounded-xl px-4 py-3">
                <span className="text-sm font-medium text-primary">
                  {selectedSymptoms.size} symptom{selectedSymptoms.size > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedSymptoms(new Set())}
                  className="text-xs text-primary hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Symptoms Grid */}
            <div className="grid grid-cols-2 gap-2">
              {filteredSymptoms.map(symptom => {
                const isSelected = selectedSymptoms.has(symptom);
                return (
                  <motion.button
                    key={symptom}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleSymptom(symptom)}
                    className={`p-3 rounded-xl text-left text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-card border border-border/50 text-foreground hover:bg-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected && <Check className="w-4 h-4" />}
                      {symptom}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Custom Symptom */}
            {searchTerm && !COMMON_SYMPTOMS.includes(searchTerm) && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => {
                  toggleSymptom(searchTerm);
                  setSearchTerm('');
                }}
                className="w-full p-3 bg-secondary rounded-xl text-sm text-foreground hover:bg-secondary/80"
              >
                + Add "{searchTerm}" as custom symptom
              </motion.button>
            )}

            {/* Analyze Button */}
            <Button
              onClick={handleAnalyze}
              disabled={selectedSymptoms.size === 0 || isAnalyzing || !isConfigured}
              className="w-full h-12 text-base"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Activity className="w-5 h-5" />
                  </motion.div>
                  Analyzing...
                </span>
              ) : (
                'Analyze Symptoms'
              )}
            </Button>
          </>
        )}
      </main>
    </div>
  );
};

export default Symptoms;
