// Local storage service for MedGuide AI (before Supabase integration)

export interface UserProfile {
  id: string;
  fullName: string;
  age: number;
  bloodType: string;
  weight: number;
  allergies: string[];
  chronicConditions: string[];
}

export interface Medication {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  stockCount: number;
  color?: string;
}

export interface HealthLog {
  id: string;
  userId: string;
  type: 'symptom_check' | 'med_taken' | 'blood_pressure' | 'note';
  data: Record<string, unknown>;
  createdAt: string;
}

const STORAGE_KEYS = {
  PROFILE: 'medguide_profile',
  MEDICATIONS: 'medguide_medications',
  LOGS: 'medguide_logs',
};

// Profile
export const getProfile = (): UserProfile | null => {
  const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
  return data ? JSON.parse(data) : null;
};

export const saveProfile = (profile: UserProfile): void => {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
};

export const createDefaultProfile = (): UserProfile => {
  const profile: UserProfile = {
    id: crypto.randomUUID(),
    fullName: 'User',
    age: 30,
    bloodType: 'O+',
    weight: 70,
    allergies: [],
    chronicConditions: [],
  };
  saveProfile(profile);
  return profile;
};

// Medications
export const getMedications = (): Medication[] => {
  const data = localStorage.getItem(STORAGE_KEYS.MEDICATIONS);
  return data ? JSON.parse(data) : [];
};

export const saveMedication = (medication: Omit<Medication, 'id' | 'userId'>): Medication => {
  const medications = getMedications();
  const newMed: Medication = {
    ...medication,
    id: crypto.randomUUID(),
    userId: getProfile()?.id || 'anonymous',
  };
  medications.push(newMed);
  localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(medications));
  return newMed;
};

export const updateMedication = (id: string, updates: Partial<Medication>): void => {
  const medications = getMedications();
  const index = medications.findIndex(m => m.id === id);
  if (index !== -1) {
    medications[index] = { ...medications[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(medications));
  }
};

export const deleteMedication = (id: string): void => {
  const medications = getMedications().filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(medications));
};

// Health Logs
export const getLogs = (): HealthLog[] => {
  const data = localStorage.getItem(STORAGE_KEYS.LOGS);
  return data ? JSON.parse(data) : [];
};

export const addLog = (type: HealthLog['type'], data: Record<string, unknown>): HealthLog => {
  const logs = getLogs();
  const newLog: HealthLog = {
    id: crypto.randomUUID(),
    userId: getProfile()?.id || 'anonymous',
    type,
    data,
    createdAt: new Date().toISOString(),
  };
  logs.unshift(newLog);
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  return newLog;
};

