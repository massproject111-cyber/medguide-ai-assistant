import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Pill, Plus, AlertTriangle, Check, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { checkDrugInteraction, isAIConfigured, type DrugInteraction } from '@/lib/ai-service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Interactions = () => {
  const navigate = useNavigate();
  const [drug1, setDrug1] = useState('');
  const [drug2, setDrug2] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<DrugInteraction | null>(null);
  const isConfigured = isAIConfigured();

  const handleCheck = async () => {
    if (!drug1.trim() || !drug2.trim()) {
      toast.error('Please enter both medication names');
      return;
    }

    if (!isConfigured) {
      toast.error('Please configure your Gemini API key first');
      navigate('/settings');
      return;
    }

    setIsChecking(true);
    setResult(null);

    try {
      const interaction = await checkDrugInteraction(drug1.trim(), drug2.trim());
      setResult(interaction);
    } catch (error) {
      toast.error('Failed to check interaction. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const getRiskConfig = (level: string) => {
    switch (level) {
      case 'high':
        return {
          color: 'bg-alert text-primary-foreground',
          bgLight: 'bg-alert-light',
          borderColor: 'border-alert/20',
          icon: AlertTriangle,
          label: 'High Risk',
          description: 'These medications may have serious interactions. Consult your doctor immediately.',
        };
      case 'moderate':
        return {
          color: 'bg-warning text-warning-foreground',
          bgLight: 'bg-warning-light',
          borderColor: 'border-warning/20',
          icon: Zap,
          label: 'Moderate Risk',
          description: 'Use with caution. Monitor for side effects and consult your pharmacist.',
        };
      default:
        return {
          color: 'bg-success text-success-foreground',
          bgLight: 'bg-success-light',
          borderColor: 'border-success/20',
          icon: Shield,
          label: 'Low Risk',
          description: 'No significant interactions found. Generally safe to use together.',
        };
    }
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
              <h1 className="font-display text-xl font-semibold text-foreground">Interaction Analysis</h1>
              <p className="text-sm text-muted-foreground">Check medication safety</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Pill className="w-5 h-5 text-warning" />
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
                  Configure your Gemini API key to check drug interactions.
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

        {/* Input Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 shadow-card border border-border/50"
        >
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="drug1" className="text-xs text-muted-foreground">First Medication</Label>
              <Input
                id="drug1"
                value={drug1}
                onChange={e => setDrug1(e.target.value)}
                placeholder="e.g., Aspirin"
                className="mt-1"
              />
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-5">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <Label htmlFor="drug2" className="text-xs text-muted-foreground">Second Medication</Label>
              <Input
                id="drug2"
                value={drug2}
                onChange={e => setDrug2(e.target.value)}
                placeholder="e.g., Ibuprofen"
                className="mt-1"
              />
            </div>
          </div>

          <Button
            onClick={handleCheck}
            disabled={!drug1.trim() || !drug2.trim() || isChecking || !isConfigured}
            className="w-full mt-4"
          >
            {isChecking ? (
              <span className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Pill className="w-4 h-4" />
                </motion.div>
                Checking...
              </span>
            ) : (
              'Check Interaction'
            )}
          </Button>
        </motion.div>

        {/* Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {(() => {
              const config = getRiskConfig(result.riskLevel);
              const Icon = config.icon;

              return (
                <>
                  {/* Risk Level Card */}
                  <div className={`${config.bgLight} rounded-2xl p-5 border ${config.borderColor}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-2xl ${config.color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-foreground">{config.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {result.drug1} + {result.drug2}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>

                  {/* Description */}
                  <div className="bg-card rounded-2xl p-5 shadow-card border border-border/50">
                    <h4 className="font-medium text-foreground mb-2">Interaction Details</h4>
                    <p className="text-sm text-muted-foreground">{result.description}</p>
                  </div>

                  {/* Recommendations */}
                  {result.recommendations && result.recommendations.length > 0 && (
                    <div className="bg-info-light rounded-2xl p-5 border border-info/20">
                      <h4 className="font-medium text-foreground mb-3">Recommendations</h4>
                      <ul className="space-y-2">
                        {result.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="bg-warning-light rounded-2xl p-4 border border-warning/20">
                    <p className="text-xs text-muted-foreground">
                      ⚠️ This information is for reference only. Always consult your doctor or pharmacist before combining medications.
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      setResult(null);
                      setDrug1('');
                      setDrug2('');
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Check Another Pair
                  </Button>
                </>
              );
            })()}
          </motion.div>
        )}

        {/* Tips */}
        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-secondary/50 rounded-2xl p-5"
          >
            <h4 className="font-medium text-foreground mb-3">💡 Tips</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Enter the generic name of medications for better accuracy</li>
              <li>• Check interactions between all your current medications</li>
              <li>• Include supplements and vitamins in your checks</li>
              <li>• Always inform your doctor about all medications you take</li>
            </ul>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Interactions;
