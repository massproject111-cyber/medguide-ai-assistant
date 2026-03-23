import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Star, Search, Building2, User, ExternalLink, Calendar, Loader2, X, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface DoctorEntry {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  rating: number;
  experience?: number;
  phone: string;
}

interface HospitalEntry {
  id: string;
  name: string;
  address: string;
  specialties: string[];
  emergency: boolean;
  rating: number;
  phone: string;
}

// Curated healthcare data — no API key needed
const DOCTORS: DoctorEntry[] = [
  { id: 'g1', name: 'Dr. Naresh Trehan', specialty: 'Cardiologist', hospital: 'Medanta - The Medicity, Gurgaon', rating: 4.9, experience: 40, phone: '+91 124 414 1414' },
  { id: 'g2', name: 'Dr. Arvinder Singh Soin', specialty: 'Liver Transplant Surgeon', hospital: 'Medanta - The Medicity, Gurgaon', rating: 4.9, experience: 35, phone: '+91 124 414 1414' },
  { id: 'g3', name: 'Dr. Sandeep Vaishya', specialty: 'Neurologist', hospital: 'Fortis Memorial, Gurgaon', rating: 4.8, experience: 25, phone: '+91 124 496 2200' },
  { id: 'g4', name: 'Dr. Ashok Rajgopal', specialty: 'Orthopedic', hospital: 'Medanta - The Medicity, Gurgaon', rating: 4.9, experience: 38, phone: '+91 124 414 1414' },
  { id: 'd1', name: 'Dr. S.K.S. Marya', specialty: 'Orthopedic', hospital: 'Max Super Speciality, New Delhi', rating: 4.8, experience: 35, phone: '+91 11 2651 5050' },
  { id: 'd2', name: 'Dr. Purushottam Lal', specialty: 'Cardiologist', hospital: 'Metro Hospital, New Delhi', rating: 4.9, experience: 30, phone: '+91 11 2507 5100' },
  { id: 'd3', name: 'Dr. Ambrish Mithal', specialty: 'Endocrinologist', hospital: 'Max Healthcare, New Delhi', rating: 4.8, experience: 32, phone: '+91 11 4055 4055' },
  { id: 'n1', name: 'Dr. Ajay Kaul', specialty: 'Cardiologist', hospital: 'Fortis Hospital, Noida', rating: 4.8, experience: 28, phone: '+91 120 430 0222' },
  { id: 'n2', name: 'Dr. Vivek Jain', specialty: 'Neurologist', hospital: 'Max Hospital, Noida', rating: 4.7, experience: 20, phone: '+91 120 664 9100' },
  { id: 'k1', name: 'Dr. Vivek Pillai', specialty: 'Cardiologist', hospital: 'Aster Medcity, Kochi', rating: 4.9, experience: 22, phone: '+91 484 669 9999' },
  { id: 'k3', name: 'Dr. Anand Kumar', specialty: 'Neurologist', hospital: 'Amrita Hospital, Kochi', rating: 4.9, experience: 30, phone: '+91 484 285 1234' },
  { id: 'k4', name: 'Dr. Subin Bhaskar', specialty: 'Orthopedic', hospital: 'Aster Medcity, Kochi', rating: 4.7, experience: 18, phone: '+91 484 669 9999' },
  { id: 'k5', name: 'Dr. Pavithran K', specialty: 'Oncologist', hospital: 'Amrita Hospital, Kochi', rating: 4.9, experience: 28, phone: '+91 484 285 1234' },
  // General / ENT / Dermatology
  { id: 'e1', name: 'Dr. Manish Munjal', specialty: 'ENT', hospital: 'Sir Ganga Ram Hospital, Delhi', rating: 4.8, experience: 30, phone: '+91 11 2575 0000' },
  { id: 'e2', name: 'Dr. Ameet Kishore', specialty: 'ENT', hospital: 'Max Smart Hospital, Delhi', rating: 4.7, experience: 22, phone: '+91 11 2651 5050' },
  { id: 'dm1', name: 'Dr. Rashmi Shetty', specialty: 'Dermatologist', hospital: 'Ra Skin & Aesthetics, Mumbai', rating: 4.8, experience: 20, phone: '+91 22 2660 0123' },
  { id: 'gp1', name: 'Dr. Devi Shetty', specialty: 'General Physician', hospital: 'Narayana Health, Bangalore', rating: 4.9, experience: 40, phone: '+91 80 7122 2222' },
  { id: 'ps1', name: 'Dr. Nimhans Team', specialty: 'Psychiatrist', hospital: 'NIMHANS, Bangalore', rating: 4.9, experience: 50, phone: '+91 80 2699 5000' },
  { id: 'gy1', name: 'Dr. Nandita Palshetkar', specialty: 'Gynecologist', hospital: 'Lilavati Hospital, Mumbai', rating: 4.9, experience: 35, phone: '+91 22 2675 1000' },
  { id: 'pd1', name: 'Dr. Krishan Chugh', specialty: 'Pediatrician', hospital: 'Fortis Memorial, Gurgaon', rating: 4.8, experience: 35, phone: '+91 124 496 2200' },
];

const HOSPITALS: HospitalEntry[] = [
  { id: 'h1', name: 'Medanta - The Medicity', address: 'Sector 38, Gurugram', specialties: ['Cardiology', 'Liver Transplant', 'Neurology', 'Orthopedics'], emergency: true, rating: 4.8, phone: '+91 124 414 1414' },
  { id: 'h2', name: 'Fortis Memorial Research Institute', address: 'Sector 44, Gurugram', specialties: ['Oncology', 'Neurology', 'Cardiology'], emergency: true, rating: 4.7, phone: '+91 124 496 2200' },
  { id: 'h4', name: 'AIIMS Delhi', address: 'Ansari Nagar, New Delhi', specialties: ['All Specialties'], emergency: true, rating: 4.9, phone: '+91 11 2658 8500' },
  { id: 'h5', name: 'Apollo Hospital', address: 'Sarita Vihar, New Delhi', specialties: ['Oncology', 'Neurology', 'Cardiology', 'Transplant'], emergency: true, rating: 4.7, phone: '+91 11 7179 1090' },
  { id: 'h10', name: 'Amrita Hospital', address: 'Ponekkara, Kochi', specialties: ['Oncology', 'Cardiology', 'Neurology', 'Transplant'], emergency: true, rating: 4.8, phone: '+91 484 285 1234' },
  { id: 'h11', name: 'Aster Medcity', address: 'Cheranalloor, Kochi', specialties: ['Cardiology', 'Neurology', 'Orthopedics'], emergency: true, rating: 4.9, phone: '+91 484 669 9999' },
  { id: 'h9', name: 'Jaypee Hospital', address: 'Sector 128, Noida', specialties: ['Transplant', 'Cardiology', 'Neurology'], emergency: true, rating: 4.7, phone: '+91 120 412 2222' },
];

// Specialty alias map for fuzzy matching
const SPECIALTY_ALIASES: Record<string, string[]> = {
  'cardiologist': ['cardiology', 'heart', 'cardiac'],
  'neurologist': ['neurology', 'brain', 'neuro'],
  'orthopedic': ['orthopedics', 'ortho', 'bone', 'joint'],
  'ent': ['ear', 'nose', 'throat', 'otolaryngology'],
  'dermatologist': ['dermatology', 'skin'],
  'oncologist': ['oncology', 'cancer'],
  'psychiatrist': ['psychiatry', 'mental health'],
  'gynecologist': ['gynecology', 'obgyn', 'ob-gyn'],
  'pediatrician': ['pediatrics', 'child'],
  'endocrinologist': ['endocrinology', 'diabetes', 'thyroid', 'hormone'],
  'general physician': ['general', 'gp', 'family medicine', 'general medicine'],
};

function matchesSpecialty(itemSpecialty: string, query: string): boolean {
  const q = query.toLowerCase().trim();
  const s = itemSpecialty.toLowerCase();
  if (s.includes(q) || q.includes(s)) return true;
  for (const [key, aliases] of Object.entries(SPECIALTY_ALIASES)) {
    if (key.includes(q) || aliases.some(a => a.includes(q) || q.includes(a))) {
      if (key.includes(s) || s.includes(key) || aliases.some(a => s.includes(a))) return true;
    }
  }
  return false;
}

interface DoctorBookingProps {
  specialist: string;
  onClose?: () => void;
}

export const DoctorBooking = ({ specialist, onClose }: DoctorBookingProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'doctors' | 'hospitals'>('doctors');
  const [isLoading] = useState(false);

  const filteredDoctors = useMemo(() => {
    return DOCTORS.filter(doc => {
      const matchesSpec = matchesSpecialty(doc.specialty, specialist);
      if (!searchTerm) return matchesSpec;
      const q = searchTerm.toLowerCase();
      return matchesSpec && (
        doc.name.toLowerCase().includes(q) ||
        doc.hospital.toLowerCase().includes(q) ||
        doc.specialty.toLowerCase().includes(q)
      );
    });
  }, [specialist, searchTerm]);

  const filteredHospitals = useMemo(() => {
    return HOSPITALS.filter(h => {
      const matchesSpec = h.specialties.some(s => matchesSpecialty(s, specialist)) || h.specialties.includes('All Specialties');
      if (!searchTerm) return matchesSpec;
      const q = searchTerm.toLowerCase();
      return matchesSpec && (
        h.name.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q)
      );
    });
  }, [specialist, searchTerm]);

  const openGoogleSearch = () => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(`${specialist} doctor near me`)}`, '_blank');
  };

  const openPracto = () => {
    window.open(`https://www.practo.com/search/doctors?results_type=doctor&q=%5B%7B%22word%22%3A%22${encodeURIComponent(specialist)}%22%7D%5D`, '_blank');
  };

  const openGoogleMaps = (name: string, address?: string) => {
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(name + (address ? ' ' + address : ''))}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">
            Find a {specialist}
          </h3>
          <p className="text-sm text-muted-foreground">Based on your AI analysis</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by name or location..."
          className="pl-10 h-11 rounded-xl bg-secondary/30"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-secondary/50 rounded-2xl">
        <button
          onClick={() => setActiveTab('doctors')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'doctors'
              ? 'bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-4 h-4" />
          Doctors ({filteredDoctors.length})
        </button>
        <button
          onClick={() => setActiveTab('hospitals')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'hospitals'
              ? 'bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Hospitals ({filteredHospitals.length})
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Results */}
      {!isLoading && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3 max-h-[50vh] overflow-y-auto pr-1"
          >
            {activeTab === 'doctors' && filteredDoctors.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -2 }}
                className="p-4 bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-foreground">{doc.name}</h4>
                    <Badge variant="secondary" className="mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border-none text-[10px] font-semibold uppercase tracking-wider">
                      {doc.specialty}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 bg-warning/10 text-warning px-2 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="text-xs font-bold">{doc.rating}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Building2 className="w-3.5 h-3.5 text-primary/70" />
                  <span className="font-medium">{doc.hospital}</span>
                </div>
                {doc.experience && (
                  <p className="text-xs text-muted-foreground mb-3">{doc.experience} years experience</p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(`tel:${doc.phone.replace(/\s/g, '')}`)}
                    className="flex-1 rounded-xl h-9 gap-1.5 border border-border/50 text-xs font-semibold"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openGoogleMaps(doc.name, doc.hospital)}
                    className="flex-1 rounded-xl h-9 gap-1.5 text-xs font-bold"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    View / Book
                  </Button>
                </div>
              </motion.div>
            ))}

            {activeTab === 'hospitals' && filteredHospitals.map((h, i) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -2 }}
                className="p-4 bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-foreground">{h.name}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-primary" />
                      {h.address}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 bg-warning/10 text-warning px-2 py-1 rounded-full">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-xs font-bold">{h.rating}</span>
                    </div>
                    {h.emergency && (
                      <Badge variant="destructive" className="rounded-full px-2 py-0 text-[10px]">24/7 ER</Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {h.specialties.slice(0, 3).map(s => (
                    <span key={s} className="px-2 py-0.5 bg-secondary/50 rounded-lg text-[10px] text-muted-foreground border border-border/30 font-medium">
                      {s}
                    </span>
                  ))}
                  {h.specialties.length > 3 && (
                    <span className="px-2 py-0.5 bg-secondary/50 rounded-lg text-[10px] text-muted-foreground border border-border/30">
                      +{h.specialties.length - 3}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(`tel:${h.phone.replace(/\s/g, '')}`)}
                    className="flex-1 rounded-xl h-9 gap-1.5 border border-border/50 text-xs font-semibold"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openGoogleMaps(h.name, h.address)}
                    className="flex-1 rounded-xl h-9 gap-1.5 text-xs font-bold"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Directions
                  </Button>
                </div>
              </motion.div>
            ))}

            {/* Empty state */}
            {((activeTab === 'doctors' && filteredDoctors.length === 0) ||
              (activeTab === 'hospitals' && filteredHospitals.length === 0)) && (
              <div className="py-12 text-center space-y-3">
                <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8 text-muted-foreground opacity-50" />
                </div>
                <p className="text-muted-foreground font-medium text-sm">No {activeTab} found for "{specialist}"</p>
                <p className="text-xs text-muted-foreground">Try searching online instead</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* External search CTA */}
      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
        <p className="text-sm font-semibold text-foreground text-center">Find more {specialist}s online</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openGoogleSearch}
            className="flex-1 rounded-xl h-10 gap-1.5 border-primary/20 hover:bg-primary/5 text-primary font-semibold text-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Google Search
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openPracto}
            className="flex-1 rounded-xl h-10 gap-1.5 border-primary/20 hover:bg-primary/5 text-primary font-semibold text-xs"
          >
            <Calendar className="w-3.5 h-3.5" />
            Book via Practo
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
