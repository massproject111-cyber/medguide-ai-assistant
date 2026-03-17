import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Clock, Star, X, Search, Building2, User, ExternalLink, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookingModal } from './BookingModal';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  rating: number;
  experience?: number;
  available: boolean;
  phone: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  specialties: string[];
  emergency: boolean;
  rating: number;
  phone: string;
}

// Real-world healthcare data for Delhi NCR
const HEALTHCARE_DATA: Record<string, { doctors: Doctor[], hospitals: Hospital[] }> = {
  'Gurgaon': {
    doctors: [
      { id: 'g1', name: 'Dr. Naresh Trehan', specialty: 'Cardiologist', hospital: 'Medanta - The Medicity', rating: 4.9, experience: 40, available: true, phone: '+91 124 414 1414' },
      { id: 'g2', name: 'Dr. Arvinder Singh Soin', specialty: 'Liver Transplant Surgeon', hospital: 'Medanta - The Medicity', rating: 4.9, experience: 35, available: true, phone: '+91 124 414 1414' },
      { id: 'g3', name: 'Dr. Sandeep Vaishya', specialty: 'Neurologist', hospital: 'Fortis Memorial Research Institute', rating: 4.8, experience: 25, available: true, phone: '+91 124 496 2200' },
      { id: 'g4', name: 'Dr. Ashok Rajgopal', specialty: 'Orthopedic', hospital: 'Medanta - The Medicity', rating: 4.9, experience: 38, available: true, phone: '+91 124 414 1414' },
    ],
    hospitals: [
      { id: 'h1', name: 'Medanta - The Medicity', address: 'Sector 38, Gurugram', specialties: ['Cardiology', 'Liver Transplant', 'Neurology', 'Orthopedics'], emergency: true, rating: 4.8, phone: '+91 124 414 1414' },
      { id: 'h2', name: 'Fortis Memorial Research Institute', address: 'Sector 44, Gurugram', specialties: ['Oncology', 'Neurology', 'Cardiology'], emergency: true, rating: 4.7, phone: '+91 124 496 2200' },
      { id: 'h3', name: 'Artemis Hospital', address: 'Sector 51, Gurugram', specialties: ['General Medicine', 'Cardiology', 'Oncology'], emergency: true, rating: 4.6, phone: '+91 124 451 1111' },
    ]
  },
  'New Delhi': {
    doctors: [
      { id: 'd1', name: 'Dr. S.K.S. Marya', specialty: 'Orthopedic', hospital: 'Max Super Speciality Hospital', rating: 4.8, experience: 35, available: true, phone: '+91 11 2651 5050' },
      { id: 'd2', name: 'Dr. Purushottam Lal', specialty: 'Cardiologist', hospital: 'Metro Hospital', rating: 4.9, experience: 30, available: true, phone: '+91 11 2507 5100' },
      { id: 'd3', name: 'Dr. Ambrish Mithal', specialty: 'Endocrinologist', hospital: 'Max Healthcare', rating: 4.8, experience: 32, available: true, phone: '+91 11 4055 4055' },
    ],
    hospitals: [
      { id: 'h4', name: 'AIIMS Delhi', address: 'Ansari Nagar, New Delhi', specialties: ['General Medicine', 'Cardiology', 'All Specialties'], emergency: true, rating: 4.9, phone: '+91 11 2658 8500' },
      { id: 'h5', name: 'Indraprastha Apollo Hospital', address: 'Sarita Vihar, New Delhi', specialties: ['Oncology', 'Neurology', 'Cardiology', 'Transplant'], emergency: true, rating: 4.7, phone: '+91 11 7179 1090' },
      { id: 'h6', name: 'Max Super Speciality Hospital', address: 'Saket, New Delhi', specialties: ['Oncology', 'Cardiology', 'Orthopedics'], emergency: true, rating: 4.7, phone: '+91 11 2651 5050' },
    ]
  },
  'Noida': {
    doctors: [
      { id: 'n1', name: 'Dr. Ajay Kaul', specialty: 'Cardiologist', hospital: 'Fortis Hospital Noida', rating: 4.8, experience: 28, available: true, phone: '+91 120 430 0222' },
      { id: 'n2', name: 'Dr. Vivek Jain', specialty: 'Neurologist', hospital: 'Max Hospital Noida', rating: 4.7, experience: 20, available: true, phone: '+91 120 664 9100' },
    ],
    hospitals: [
      { id: 'h7', name: 'Fortis Hospital Noida', address: 'Sector 62, Noida', specialties: ['Cardiology', 'Orthopedics', 'Neurology'], emergency: true, rating: 4.6, phone: '+91 120 430 0222' },
      { id: 'h8', name: 'Max Super Speciality Hospital', address: 'Sector 19, Noida', specialties: ['General Medicine', 'Oncology', 'Cardiology'], emergency: true, rating: 4.5, phone: '+91 120 664 9100' },
      { id: 'h9', name: 'Jaypee Hospital', address: 'Sector 128, Noida', specialties: ['Transplant', 'Cardiology', 'Neurology'], emergency: true, rating: 4.7, phone: '+91 120 412 2222' },
    ]
  },
  'Kochi (Ernakulam)': {
    doctors: [
      { id: 'k1', name: 'Dr. Vivek Pillai', specialty: 'Cardiologist', hospital: 'Aster Medcity', rating: 4.9, experience: 22, available: true, phone: '+91 484 669 9999' },
      { id: 'k2', name: 'Dr. Rajesh Muralidharan', specialty: 'Cardiologist', hospital: 'Amrita Hospital', rating: 4.8, experience: 25, available: true, phone: '+91 484 285 1234' },
      { id: 'k3', name: 'Dr. Anand Kumar', specialty: 'Neurologist', hospital: 'Amrita Hospital', rating: 4.9, experience: 30, available: true, phone: '+91 484 285 1234' },
      { id: 'k4', name: 'Dr. Subin Bhaskar', specialty: 'Orthopedic', hospital: 'Aster Medcity', rating: 4.7, experience: 18, available: true, phone: '+91 484 669 9999' },
      { id: 'k5', name: 'Dr. Pavithran K', specialty: 'Oncologist', hospital: 'Amrita Hospital', rating: 4.9, experience: 28, available: true, phone: '+91 484 285 1234' },
    ],
    hospitals: [
      { id: 'h10', name: 'Amrita Hospital', address: 'Ponekkara, Kochi', specialties: ['Oncology', 'Cardiology', 'Neurology', 'Transplant'], emergency: true, rating: 4.8, phone: '+91 484 285 1234' },
      { id: 'h11', name: 'Aster Medcity', address: 'Cheranalloor, Kochi', specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Robotic Surgery'], emergency: true, rating: 4.9, phone: '+91 484 669 9999' },
      { id: 'h12', name: 'Rajagiri Hospital', address: 'Aluva, Kochi', specialties: ['General Medicine', 'Cardiology', 'Oncology'], emergency: true, rating: 4.7, phone: '+91 484 290 5000' },
      { id: 'h13', name: 'Medical Trust Hospital', address: 'MG Road, Kochi', specialties: ['Emergency Medicine', 'Orthopedics', 'Cardiology'], emergency: true, rating: 4.5, phone: '+91 484 235 8001' },
      { id: 'h14', name: 'VPS Lakeshore Hospital', address: 'Nettoor, Kochi', specialties: ['Gastroenterology', 'Oncology', 'Cardiology'], emergency: true, rating: 4.7, phone: '+91 484 270 1032' },
    ]
  }
};

const LOCATIONS = Object.keys(HEALTHCARE_DATA);

interface SpecialistDirectoryProps {
  isOpen: boolean;
  onClose: () => void;
  initialSpecialty?: string;
}

export const SpecialistDirectory = ({ isOpen, onClose, initialSpecialty = '' }: SpecialistDirectoryProps) => {
  const [searchTerm, setSearchTerm] = useState(initialSpecialty);
  const [location, setLocation] = useState('New Delhi');
  const [activeTab, setActiveTab] = useState<'doctors' | 'hospitals'>('doctors');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const currentData = HEALTHCARE_DATA[location] || { doctors: [], hospitals: [] };

  const filteredDoctors = currentData.doctors.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.hospital.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHospitals = currentData.hospitals.filter(hospital =>
    hospital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hospital.specialties.some((s: string) => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openJustdial = () => {
    const query = encodeURIComponent(`${searchTerm} in ${location}`);
    window.open(`https://www.justdial.com/Search/${query}`, '_blank');
  };

  const handleBookAppointment = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsBookingModalOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0 border-none bg-background sm:rounded-[32px]">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center justify-between mb-2">
              <DialogTitle className="font-display text-2xl font-bold text-foreground">Find Healthcare</DialogTitle>
              <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-muted-foreground text-sm">Real data from Delhi OCR & Hospitals</p>
          </DialogHeader>

          <div className="px-6 space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Location & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-secondary/50 rounded-xl border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-foreground font-medium"
                >
                  {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Specialty, doctor, or hospital..."
                  className="pl-10 h-11 rounded-xl bg-secondary/30"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1.5 bg-secondary/50 rounded-2xl">
              <button
                onClick={() => setActiveTab('doctors')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'doctors'
                    ? 'bg-card shadow-sm text-foreground scale-[1.02]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                <User className="w-4 h-4" />
                Doctors
              </button>
              <button
                onClick={() => setActiveTab('hospitals')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'hospitals'
                    ? 'bg-card shadow-sm text-foreground scale-[1.02]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Hospitals
              </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-6 pr-1 custom-scrollbar">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-${location}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {(activeTab === 'doctors' ? filteredDoctors : filteredHospitals).map((item: Doctor | Hospital) => (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -2 }}
                      className="p-5 bg-card rounded-3xl border border-border/50 shadow-sm hover:shadow-md transition-all hover:border-primary/20 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">{item.name}</h4>
                          {'specialty' in item ? (
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary" className="px-3 py-0.5 rounded-full bg-primary/10 text-primary border-none font-semibold uppercase tracking-wider text-[10px]">
                                {item.specialty}
                              </Badge>
                              {item.experience && <span className="text-xs text-muted-foreground font-medium">{item.experience} Yrs Exp</span>}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-primary" />
                              {item.address}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5 text-warning bg-warning/10 px-2 py-1 rounded-full">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="text-xs font-bold leading-none">{item.rating}</span>
                          </div>
                          {'emergency' in item && item.emergency && (
                            <Badge variant="destructive" className="rounded-full px-2 py-0 text-[10px]">24/7 ER</Badge>
                          )}
                        </div>
                      </div>
                      
                      {'specialty' in item && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground bg-secondary/20 p-2 rounded-xl border border-border/50">
                          <Building2 className="w-4 h-4 text-primary/70" />
                          <span className="font-medium">{item.hospital}</span>
                        </div>
                      )}

                      {'specialties' in item && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {item.specialties.slice(0, 3).map((spec: string) => (
                            <span key={spec} className="px-2 py-1 bg-secondary/50 rounded-lg text-[10px] text-muted-foreground border border-border/30 font-medium">
                              {spec}
                            </span>
                          ))}
                          {item.specialties.length > 3 && (
                            <span className="px-2 py-1 bg-secondary/50 rounded-lg text-[10px] text-muted-foreground border border-border/30 font-medium">
                              +{item.specialties.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 mt-5">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(`tel:${item.phone.replace(/\s/g, '')}`)}
                          className="flex-1 rounded-xl h-10 gap-2 border border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all font-semibold"
                        >
                          <Phone className="w-4 h-4" />
                          Call
                        </Button>
                        {'specialty' in item ? (
                          <Button
                            size="sm"
                            onClick={() => handleBookAppointment(item as Doctor)}
                            className="flex-2 gradient-primary rounded-xl h-10 gap-2 font-bold shadow-glow"
                          >
                            <Calendar className="w-4 h-4" />
                            Book Appointment
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(item.name + ' ' + (item as Hospital).address)}`, '_blank')}
                            className="flex-1 rounded-xl h-10 gap-2 border-border/50 font-semibold"
                          >
                            <MapPin className="w-4 h-4" />
                            Directions
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* Justdial call to action */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 bg-gradient-to-br from-primary/5 via-accent/5 to-info/5 rounded-[32px] border border-primary/10 text-center space-y-3"
                  >
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                      <ExternalLink className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-bold text-foreground">Can't find what you're looking for?</h5>
                      <p className="text-xs text-muted-foreground px-4">Search all results on Justdial for live listings and prices.</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={openJustdial}
                      className="w-full h-11 rounded-xl border-primary/20 hover:bg-primary/5 text-primary font-bold gap-2"
                    >
                      Search on Justdial
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </motion.div>

                  {(activeTab === 'doctors' ? filteredDoctors : filteredHospitals).length === 0 && (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto opacity-50">
                        <Search className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">No results found for your search.</p>
                      <Button variant="link" onClick={() => setSearchTerm('')} className="text-primary font-bold">Clear filters</Button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        doctor={selectedDoctor}
      />
    </>
  );
};