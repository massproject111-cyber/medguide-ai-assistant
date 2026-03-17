import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const COMMON_SYMPTOMS = [
  'Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea', 'Dizziness',
  'Sore Throat', 'Chest Pain', 'Shortness of Breath', 'Back Pain',
  'Abdominal Pain', 'Joint Pain', 'Runny Nose', 'Muscle Aches',
  'Vomiting', 'Diarrhea', 'Loss of Appetite', 'Skin Rash',
  'Insomnia', 'Anxiety', 'Weakness', 'Swelling'
];

const SEVERITY_LEVELS = [
  { value: 'mild', label: 'Mild', color: 'bg-success/20 text-success border-success/30' },
  { value: 'moderate', label: 'Moderate', color: 'bg-warning/20 text-warning border-warning/30' },
  { value: 'severe', label: 'Severe', color: 'bg-destructive/20 text-destructive border-destructive/30' }
];

export interface SelectedSymptom {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
}

interface SymptomSelectorProps {
  selectedSymptoms: SelectedSymptom[];
  onSymptomsChange: (symptoms: SelectedSymptom[]) => void;
}

export const SymptomSelector = ({ selectedSymptoms, onSymptomsChange }: SymptomSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customSymptom, setCustomSymptom] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filteredSymptoms = COMMON_SYMPTOMS.filter(s => 
    s.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedSymptoms.find(ss => ss.name.toLowerCase() === s.toLowerCase())
  );

  const displayedSymptoms = showAll ? filteredSymptoms : filteredSymptoms.slice(0, 12);

  const addSymptom = (name: string, severity: 'mild' | 'moderate' | 'severe' = 'moderate') => {
    if (!selectedSymptoms.find(s => s.name.toLowerCase() === name.toLowerCase())) {
      onSymptomsChange([...selectedSymptoms, { name, severity }]);
    }
  };

  const removeSymptom = (name: string) => {
    onSymptomsChange(selectedSymptoms.filter(s => s.name !== name));
  };

  const updateSeverity = (name: string, severity: 'mild' | 'moderate' | 'severe') => {
    onSymptomsChange(selectedSymptoms.map(s => 
      s.name === name ? { ...s, severity } : s
    ));
  };

  const handleAddCustom = () => {
    if (customSymptom.trim()) {
      addSymptom(customSymptom.trim());
      setCustomSymptom('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected Symptoms */}
      {selectedSymptoms.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Selected Symptoms</label>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {selectedSymptoms.map((symptom) => (
                <motion.div
                  key={symptom.name}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center justify-between gap-2 p-3 bg-card rounded-xl border border-border/50"
                >
                  <span className="font-medium text-foreground">{symptom.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {SEVERITY_LEVELS.map((level) => (
                        <button
                          key={level.value}
                          onClick={() => updateSeverity(symptom.name, level.value as 'mild' | 'moderate' | 'severe')}
                          className={`px-2 py-1 text-xs rounded-lg border transition-all ${
                            symptom.severity === level.value
                              ? level.color
                              : 'bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary'
                          }`}
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => removeSymptom(symptom.name)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search symptoms..."
          className="pl-10"
        />
      </div>

      {/* Common Symptoms Grid */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Common Symptoms</label>
        <div className="flex flex-wrap gap-2">
          {displayedSymptoms.map((symptom) => (
            <motion.button
              key={symptom}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => addSymptom(symptom)}
              className="px-3 py-2 bg-secondary/50 hover:bg-secondary rounded-xl text-sm text-foreground border border-border/50 transition-colors"
            >
              {symptom}
            </motion.button>
          ))}
        </div>
        {filteredSymptoms.length > 12 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {showAll ? 'Show less' : `Show ${filteredSymptoms.length - 12} more`}
            <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Add Custom Symptom */}
      <div className="flex gap-2">
        <Input
          value={customSymptom}
          onChange={(e) => setCustomSymptom(e.target.value)}
          placeholder="Add custom symptom..."
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustom())}
          className="flex-1"
        />
        <Button onClick={handleAddCustom} variant="outline" size="icon">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};