import { motion } from 'framer-motion';
import { AlertTriangle, Stethoscope, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export interface Condition {
  name: string;
  confidence: number;
  description: string;
  specialist: string;
}

export interface AnalysisResult {
  conditions: Condition[];
  recommendations: string[];
  urgencyLevel: 'low' | 'moderate' | 'high' | 'emergency';
}

interface AnalysisResultsProps {
  result: AnalysisResult;
  onFindSpecialist: (specialist: string) => void;
  onReset: () => void;
}

const urgencyConfig = {
  low: {
    color: 'bg-success/20 text-success border-success/30',
    icon: CheckCircle2,
    label: 'Low Urgency',
    description: 'Monitor symptoms and seek care if they worsen'
  },
  moderate: {
    color: 'bg-warning/20 text-warning border-warning/30',
    icon: AlertTriangle,
    label: 'Moderate Urgency',
    description: 'Schedule a medical appointment soon'
  },
  high: {
    color: 'bg-destructive/20 text-destructive border-destructive/30',
    icon: AlertTriangle,
    label: 'High Urgency',
    description: 'Seek medical attention promptly'
  },
  emergency: {
    color: 'bg-destructive text-destructive-foreground border-destructive',
    icon: ShieldAlert,
    label: 'Emergency',
    description: 'Seek immediate medical attention'
  }
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 70) return 'bg-success';
  if (confidence >= 40) return 'bg-warning';
  return 'bg-muted';
};

export const AnalysisResults = ({ result, onFindSpecialist, onReset }: AnalysisResultsProps) => {
  const urgency = urgencyConfig[result.urgencyLevel];
  const UrgencyIcon = urgency.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Urgency Banner */}
      <div className={`p-4 rounded-2xl border ${urgency.color}`}>
        <div className="flex items-start gap-3">
          <UrgencyIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{urgency.label}</p>
            <p className="text-sm opacity-80">{urgency.description}</p>
          </div>
        </div>
      </div>

      {/* Possible Conditions */}
      <div className="bg-card rounded-2xl p-4 border border-border/50 space-y-4">
        <h3 className="font-display font-semibold text-foreground">Possible Conditions</h3>
        <div className="space-y-3">
          {result.conditions.map((condition, index) => (
            <motion.div
              key={condition.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 bg-secondary/30 rounded-xl space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{condition.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{condition.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-foreground">{condition.confidence}%</span>
                  <p className="text-xs text-muted-foreground">confidence</p>
                </div>
              </div>
              
              <Progress 
                value={condition.confidence} 
                className="h-2"
              />
              
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Stethoscope className="w-4 h-4" />
                  <span>Recommended: <strong className="text-foreground">{condition.specialist}</strong></span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onFindSpecialist(condition.specialist)}
                  className="gap-1"
                >
                  Find <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-card rounded-2xl p-4 border border-border/50 space-y-3">
        <h3 className="font-display font-semibold text-foreground">Recommendations</h3>
        <ul className="space-y-2">
          {result.recommendations.map((rec, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              <span>{rec}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="p-3 bg-warning/10 rounded-xl border border-warning/20">
        <p className="text-xs text-muted-foreground">
          <strong className="text-warning">Disclaimer:</strong> This analysis is AI-generated and should not replace professional medical advice. Always consult a healthcare provider for accurate diagnosis and treatment.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={onReset} variant="outline" className="flex-1">
          New Analysis
        </Button>
      </div>
    </motion.div>
  );
};