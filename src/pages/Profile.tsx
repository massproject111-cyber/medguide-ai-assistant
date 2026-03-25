/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Droplet, Scale, AlertTriangle, Heart, Plus, Edit2, Save, History, Activity, Pill, Sparkles, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { HealthTag } from '@/components/ui/HealthTag';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

const CHRONIC_CONDITIONS = [
  'Diabetes Type 1', 'Diabetes Type 2', 'Hypertension', 'Asthma',
  'Heart Disease', 'COPD', 'Arthritis', 'Thyroid Disorder',
  'Kidney Disease', 'Liver Disease', 'Cancer', 'HIV/AIDS',
  'Epilepsy', 'Multiple Sclerosis', 'Parkinson\'s Disease'
];

const PAST_ILLNESSES = [
  'COVID-19', 'Pneumonia', 'Tuberculosis', 'Malaria',
  'Dengue', 'Typhoid', 'Hepatitis', 'Appendicitis',
  'Fractures', 'Surgery', 'Hospitalization'
];

const LIFESTYLE_FACTORS = [
  'Smoker', 'Former Smoker', 'Alcohol - Regular', 'Alcohol - Occasional',
  'Sedentary Lifestyle', 'Active Lifestyle', 'Vegetarian', 'Vegan',
  'High Stress', 'Poor Sleep', 'Regular Exercise'
];

interface ProfileData {
  id: string;
  fullName: string;
  age: number;
  gender: string;
  bloodType: string;
  weight: number;
  allergies: string[];
  chronicConditions: string[];
  pastIllnesses: string[];
  lifestyleFactors: string[];
  ongoingMedications: string[];
}

interface HealthLog {
  id: string;
  type: string;
  data: unknown;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ProfileData>>({});
  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchLogs();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const profileData: ProfileData = {
        id: data.id,
        fullName: data.full_name || 'User',
        age: data.age || 30,
        gender: data.gender || '',
        bloodType: data.blood_type || 'O+',
        weight: data.weight || 70,
        allergies: data.allergies || [],
        chronicConditions: data.chronic_conditions || [],
        pastIllnesses: data.past_illnesses || [],
        lifestyleFactors: data.lifestyle_factors || [],
        ongoingMedications: data.ongoing_medications || [],
      };

      setProfile(profileData);
      setEditData(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('health_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleSave = async () => {
    if (!user || !profile || !editData) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editData.fullName,
          age: editData.age,
          gender: editData.gender,
          blood_type: editData.bloodType,
          weight: editData.weight,
          allergies: editData.allergies,
          chronic_conditions: editData.chronicConditions,
          past_illnesses: editData.pastIllnesses,
          lifestyle_factors: editData.lifestyleFactors,
          ongoing_medications: editData.ongoingMedications,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile({ ...profile, ...editData } as ProfileData);
      setIsEditing(false);
      toast.success('Profile updated');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // Allergies
  const addAllergy = () => {
    if (!newAllergy.trim()) return;
    const allergies = [...(editData.allergies || []), newAllergy.trim()];
    setEditData(prev => ({ ...prev, allergies }));
    setNewAllergy('');
  };

  const removeAllergy = (index: number) => {
    const allergies = (editData.allergies || []).filter((_, i) => i !== index);
    setEditData(prev => ({ ...prev, allergies }));
  };

  // Chronic Conditions
  const addCondition = (condition: string) => {
    if (!condition || editData.chronicConditions?.includes(condition)) return;
    const chronicConditions = [...(editData.chronicConditions || []), condition];
    setEditData(prev => ({ ...prev, chronicConditions }));
  };

  const removeCondition = (index: number) => {
    const chronicConditions = (editData.chronicConditions || []).filter((_, i) => i !== index);
    setEditData(prev => ({ ...prev, chronicConditions }));
  };

  // Past Illnesses
  const addIllness = (illness: string) => {
    if (!illness || editData.pastIllnesses?.includes(illness)) return;
    const pastIllnesses = [...(editData.pastIllnesses || []), illness];
    setEditData(prev => ({ ...prev, pastIllnesses }));
  };

  const removeIllness = (index: number) => {
    const pastIllnesses = (editData.pastIllnesses || []).filter((_, i) => i !== index);
    setEditData(prev => ({ ...prev, pastIllnesses }));
  };

  // Lifestyle Factors
  const toggleLifestyleFactor = (factor: string) => {
    const current = editData.lifestyleFactors || [];
    const updated = current.includes(factor)
      ? current.filter(f => f !== factor)
      : [...current, factor];
    setEditData(prev => ({ ...prev, lifestyleFactors: updated }));
  };

  // Ongoing Medications
  const addMedication = () => {
    if (!newMedication.trim()) return;
    const ongoingMedications = [...(editData.ongoingMedications || []), newMedication.trim()];
    setEditData(prev => ({ ...prev, ongoingMedications }));
    setNewMedication('');
  };

  const removeMedication = (index: number) => {
    const ongoingMedications = (editData.ongoingMedications || []).filter((_, i) => i !== index);
    setEditData(prev => ({ ...prev, ongoingMedications }));
  };

  const formatLogType = (type: string) => {
    switch (type) {
      case 'med_taken': return 'Medication Taken';
      case 'symptom_check': return 'Symptom Check';
      case 'blood_pressure': return 'Blood Pressure';
      default: return 'Note';
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'med_taken': return '💊';
      case 'symptom_check': return '🔍';
      case 'blood_pressure': return '❤️';
      default: return '📝';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient */}
      <header className="sticky top-0 z-40 glass gradient-header border-b border-border/50">
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
              <h1 className="font-display text-xl font-semibold text-foreground">Profile</h1>
              <p className="text-sm text-muted-foreground">Your health information</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={saving}
              className="p-2.5 bg-primary rounded-xl shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
              ) : isEditing ? (
                <Save className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Edit2 className="w-5 h-5 text-primary-foreground" />
              )}
            </motion.button>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-card-olive rounded-3xl p-6 shadow-card border border-border/50"
        >
          <div className="flex items-center gap-5 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow shrink-0">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  value={editData.fullName || ''}
                  onChange={e => setEditData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="font-display text-xl font-bold h-12 rounded-xl"
                  placeholder="Your name"
                />
              ) : (
                <h2 className="font-display text-2xl font-bold text-foreground leading-tight truncate">{profile.fullName}</h2>
              )}
              <p className="text-xs font-bold text-primary/60 uppercase tracking-widest mt-1">Patient Profile</p>
            </div>
          </div>

          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Gender */}
            <div className="bg-secondary/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-border/5">
              <User className="w-5 h-5 text-primary mb-2 opacity-70" />
              {isEditing ? (
                <Select
                  value={editData.gender || ''}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger className="text-center h-8 text-xs font-bold">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-display text-base font-black text-foreground">
                  {profile.gender || '-'}
                </p>
              )}
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5 px-2 py-0.5 bg-background/50 rounded-full">Gender</p>
            </div>

            {/* Age */}
            <div className="bg-secondary/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-border/5">
              <Scale className="w-5 h-5 text-primary mb-2 opacity-70" />
              {isEditing ? (
                <Input
                  type="number"
                  value={editData.age || ''}
                  onChange={e => setEditData(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                  className="text-center h-8 text-xs font-bold"
                />
              ) : (
                <p className="font-display text-base font-black text-foreground">{profile.age}</p>
              )}
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5 px-2 py-0.5 bg-background/50 rounded-full">Age</p>
            </div>

            {/* Blood Type */}
            <div className="bg-secondary/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-border/5">
              <Droplet className="w-5 h-5 text-destructive mb-2 opacity-70" />
              {isEditing ? (
                <Select
                  value={editData.bloodType || ''}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, bloodType: value }))}
                >
                  <SelectTrigger className="text-center h-8 text-xs font-bold">
                    <SelectValue placeholder="Blood" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_TYPES.map(bt => (
                      <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-display text-base font-black text-foreground">{profile.bloodType}</p>
              )}
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5 px-2 py-0.5 bg-background/50 rounded-full">Blood Type</p>
            </div>

            {/* Weight */}
            <div className="bg-secondary/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-border/5">
              <Heart className="w-5 h-5 text-green-500 mb-2 opacity-70" />
              {isEditing ? (
                <Input
                  type="number"
                  value={editData.weight || ''}
                  onChange={e => setEditData(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
                  className="text-center h-8 text-xs font-bold"
                />
              ) : (
                <p className="font-display text-base font-black text-foreground">{profile.weight}</p>
              )}
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5 px-2 py-0.5 bg-background/50 rounded-full">Weight (kg)</p>
            </div>
          </div>
        </motion.div>

        {/* Allergies */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-5 shadow-card border border-border/50"
        >
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Allergies
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {(isEditing ? editData.allergies : profile.allergies)?.map((allergy, i) => (
              <HealthTag
                key={i}
                label={allergy}
                variant="allergy"
                onRemove={isEditing ? () => removeAllergy(i) : undefined}
              />
            ))}
            {(isEditing ? editData.allergies : profile.allergies)?.length === 0 && (
              <p className="text-sm text-muted-foreground">No allergies recorded</p>
            )}
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <Input
                value={newAllergy}
                onChange={e => setNewAllergy(e.target.value)}
                placeholder="Add allergy"
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
              />
              <Button onClick={addAllergy} size="icon" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </motion.section>

        {/* Chronic Conditions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl p-5 shadow-card border border-border/50"
        >
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-blue-500" />
            Chronic Conditions
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {(isEditing ? editData.chronicConditions : profile.chronicConditions)?.map((condition, i) => (
              <HealthTag
                key={i}
                label={condition}
                variant="condition"
                onRemove={isEditing ? () => removeCondition(i) : undefined}
              />
            ))}
            {(isEditing ? editData.chronicConditions : profile.chronicConditions)?.length === 0 && (
              <p className="text-sm text-muted-foreground">No conditions recorded</p>
            )}
          </div>
          {isEditing && (
            <Select value="" onValueChange={addCondition}>
              <SelectTrigger>
                <SelectValue placeholder="Select or add condition..." />
              </SelectTrigger>
              <SelectContent>
                {CHRONIC_CONDITIONS.filter(c => !editData.chronicConditions?.includes(c)).map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </motion.section>

        {/* Past Illnesses */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-5 shadow-card border border-border/50"
        >
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-yellow-500" />
            Past Illnesses
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {(isEditing ? editData.pastIllnesses : profile.pastIllnesses)?.map((illness, i) => (
              <HealthTag
                key={i}
                label={illness}
                variant="condition"
                onRemove={isEditing ? () => removeIllness(i) : undefined}
              />
            ))}
            {(isEditing ? editData.pastIllnesses : profile.pastIllnesses)?.length === 0 && (
              <p className="text-sm text-muted-foreground">No past illnesses recorded</p>
            )}
          </div>
          {isEditing && (
            <Select value="" onValueChange={addIllness}>
              <SelectTrigger>
                <SelectValue placeholder="Select past illness..." />
              </SelectTrigger>
              <SelectContent>
                {PAST_ILLNESSES.filter(i => !editData.pastIllnesses?.includes(i)).map(i => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </motion.section>

        {/* Lifestyle Factors */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl p-5 shadow-card border border-border/50"
        >
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Lifestyle Factors
          </h3>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {LIFESTYLE_FACTORS.map((factor) => (
                <button
                  key={factor}
                  onClick={() => toggleLifestyleFactor(factor)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    editData.lifestyleFactors?.includes(factor)
                      ? 'bg-purple-500/20 text-purple-600 border-purple-500/30'
                      : 'bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary'
                  }`}
                >
                  {factor}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.lifestyleFactors?.length ? (
                profile.lifestyleFactors.map((factor, i) => (
                  <HealthTag key={i} label={factor} variant="condition" />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No lifestyle factors recorded</p>
              )}
            </div>
          )}
        </motion.section>

        {/* Ongoing Medications */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-5 shadow-card border border-border/50"
        >
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
            <Pill className="w-4 h-4 text-primary" />
            Ongoing Medications
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {(isEditing ? editData.ongoingMedications : profile.ongoingMedications)?.map((med, i) => (
              <HealthTag
                key={i}
                label={med}
                variant="condition"
                onRemove={isEditing ? () => removeMedication(i) : undefined}
              />
            ))}
            {(isEditing ? editData.ongoingMedications : profile.ongoingMedications)?.length === 0 && (
              <p className="text-sm text-muted-foreground">No ongoing medications recorded</p>
            )}
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <Input
                value={newMedication}
                onChange={e => setNewMedication(e.target.value)}
                placeholder="Add medication"
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMedication())}
              />
              <Button onClick={addMedication} size="icon" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </motion.section>

        {/* Health History */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card rounded-2xl p-5 shadow-card border border-border/50"
        >
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Health History
            </h3>
            <span className="text-sm text-muted-foreground">
              {logs.length} entries
            </span>
          </button>
          
          {showHistory && (
            <div className="mt-6 space-y-4">
              {logs.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-[1.125rem] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/20 via-border to-primary/20" />
                  {logs.map((log) => (
                    <div key={log.id} className="relative pl-12 pb-6 last:pb-2 group">
                      <div className="absolute left-0 w-9 h-9 rounded-xl bg-card border-2 border-primary/30 flex items-center justify-center text-sm shadow-sm group-hover:scale-110 group-hover:border-primary transition-all z-10">
                        {getLogIcon(log.type)}
                      </div>
                      <div className="bg-secondary/50 rounded-2xl p-4 hover:bg-secondary/80 hover:shadow-soft transition-all border border-transparent hover:border-border/50">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold text-foreground">{formatLogType(log.type)}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                            {new Date(log.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {new Date(log.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No history yet</p>
              )}
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
};

export default Profile;
