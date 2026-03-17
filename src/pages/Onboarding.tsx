import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Stethoscope, ChevronRight, ChevronLeft, Check, User, Droplets, AlertTriangle, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

const COMMON_ALLERGIES = [
  'Penicillin', 'Aspirin', 'Ibuprofen', 'Sulfa drugs', 'Latex',
  'Peanuts', 'Shellfish', 'Eggs', 'Milk', 'Soy', 'Wheat', 'Tree nuts'
];

const CHRONIC_CONDITIONS = [
  'Diabetes Type 1', 'Diabetes Type 2', 'Hypertension', 'Asthma',
  'Heart Disease', 'Arthritis', 'COPD', 'Thyroid disorder',
  'Kidney Disease', 'Depression', 'Anxiety', 'Migraine'
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    gender: '',
    bloodType: '',
    weight: '',
    allergies: [] as string[],
    chronicConditions: [] as string[],
  });

  const totalSteps = 4;

  const toggleArrayItem = (field: 'allergies' | 'chronicConditions', item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.fullName.trim() !== '' && formData.age !== '';
      case 2:
        return formData.gender !== '' && formData.bloodType !== '';
      case 3:
        return true; // Allergies are optional
      case 4:
        return true; // Conditions are optional
      default:
        return true;
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: formData.fullName.trim(),
          age: parseInt(formData.age) || 30,
          gender: formData.gender,
          blood_type: formData.bloodType,
          weight: parseFloat(formData.weight) || 70,
          allergies: formData.allergies,
          chronic_conditions: formData.chronicConditions,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast.success('Profile setup complete!');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Basic Information</h2>
              <p className="text-muted-foreground mt-2">Let's start with your basic details</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="h-12"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="25"
                    value={formData.age}
                    onChange={e => setFormData(prev => ({ ...prev, age: e.target.value }))}
                    className="h-12"
                    min="1"
                    max="120"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="70"
                    value={formData.weight}
                    onChange={e => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                    className="h-12"
                    min="1"
                    max="500"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Droplets className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Health Details</h2>
              <p className="text-muted-foreground mt-2">Important for accurate health guidance</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select 
                  value={formData.gender} 
                  onValueChange={v => setFormData(prev => ({ ...prev, gender: v }))}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Blood Type</Label>
                <Select 
                  value={formData.bloodType} 
                  onValueChange={v => setFormData(prev => ({ ...prev, bloodType: v }))}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select blood type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_TYPES.map(bt => (
                      <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-warning" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Allergies</h2>
              <p className="text-muted-foreground mt-2">Select any allergies you have (optional)</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map(allergy => (
                <Badge
                  key={allergy}
                  variant={formData.allergies.includes(allergy) ? 'default' : 'outline'}
                  className={`cursor-pointer py-2 px-3 text-sm transition-all ${
                    formData.allergies.includes(allergy)
                      ? 'bg-warning text-warning-foreground hover:bg-warning/90'
                      : 'hover:bg-warning/10'
                  }`}
                  onClick={() => toggleArrayItem('allergies', allergy)}
                >
                  {formData.allergies.includes(allergy) && <Check className="w-3 h-3 mr-1" />}
                  {allergy}
                </Badge>
              ))}
            </div>
            
            {formData.allergies.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Selected: {formData.allergies.length} allerg{formData.allergies.length === 1 ? 'y' : 'ies'}
              </p>
            )}
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Chronic Conditions</h2>
              <p className="text-muted-foreground mt-2">Select any conditions you manage (optional)</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {CHRONIC_CONDITIONS.map(condition => (
                <Badge
                  key={condition}
                  variant={formData.chronicConditions.includes(condition) ? 'default' : 'outline'}
                  className={`cursor-pointer py-2 px-3 text-sm transition-all ${
                    formData.chronicConditions.includes(condition)
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'hover:bg-primary/10'
                  }`}
                  onClick={() => toggleArrayItem('chronicConditions', condition)}
                >
                  {formData.chronicConditions.includes(condition) && <Check className="w-3 h-3 mr-1" />}
                  {condition}
                </Badge>
              ))}
            </div>
            
            {formData.chronicConditions.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Selected: {formData.chronicConditions.length} condition{formData.chronicConditions.length === 1 ? '' : 's'}
              </p>
            )}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4">
        <div className="container max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">MedGuide AI</span>
          </div>
          <span className="text-sm text-muted-foreground">
            Step {step} of {totalSteps}
          </span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="container max-w-lg mx-auto px-4">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full gradient-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 container max-w-lg mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </main>

      {/* Footer Navigation */}
      <footer className="p-4 border-t border-border/50 bg-background">
        <div className="container max-w-lg mx-auto flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 h-12"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {step < totalSteps ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 h-12 gradient-primary"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={loading}
              className="flex-1 h-12 gradient-primary"
            >
              {loading ? 'Saving...' : 'Complete Setup'}
              <Check className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default Onboarding;
