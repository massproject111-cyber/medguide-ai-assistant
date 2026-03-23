import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SymptomSelector, type SelectedSymptom } from './SymptomSelector';
import { AnalysisResults, type AnalysisResult } from './AnalysisResults';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { geminiService } from '@/lib/gemini';
import { addLog } from '@/lib/storage';

interface DiseaseFinderProps {
  onFindSpecialist: (specialist: string) => void;
}

export const DiseaseFinder = ({ onFindSpecialist }: DiseaseFinderProps) => {
  const [symptoms, setSymptoms] = useState<SelectedSymptom[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (symptoms.length === 0) {
      toast.error('Please select at least one symptom');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Format symptoms with severity for better analysis
      const symptomList = symptoms.map(s => `${s.name} (${s.severity})`);

      const analysis = await geminiService.analyzeSymptoms(symptomList);
      
      setResult(analysis);
      addLog('symptom_check', { symptoms: symptomList, result: analysis });
      toast.success('Analysis complete');
    } catch (error: any) {
      console.error('Analysis error:', error);
      
      let errorMessage = 'Failed to analyze symptoms. Please try again.';
      if (error.status === 429 || error.message?.includes('429')) {
        errorMessage = 'Rate limit exceeded. Please wait a minute and try again.';
      } else if (error.message?.includes('API key')) {
        errorMessage = 'Gemini API key issue. Please check your configuration.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSymptoms([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-3xl p-5 shadow-card border border-border/50"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
          <Activity className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Disease Finder</h2>
          <p className="text-sm text-muted-foreground">AI-powered symptom analysis</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {result ? (
          <AnalysisResults
            key="results"
            result={result}
            onFindSpecialist={onFindSpecialist}
            onReset={handleReset}
          />
        ) : (
          <motion.div
            key="selector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <SymptomSelector
              selectedSymptoms={symptoms}
              onSymptomsChange={setSymptoms}
            />

            <Button
              onClick={handleAnalyze}
              disabled={symptoms.length === 0 || isAnalyzing}
              className="w-full gradient-primary text-primary-foreground gap-2"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Analyze Symptoms
                </>
              )}
            </Button>

            {symptoms.length > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                {symptoms.length} symptom{symptoms.length > 1 ? 's' : ''} selected
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};