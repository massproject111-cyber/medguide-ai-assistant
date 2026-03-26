import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Star, Search, Loader2, X, LocateFixed, Navigation, Building2, UserRound, Phone, Clock, GraduationCap, Languages, BedDouble, Stethoscope, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HospitalResult {
  name: string;
  specialisation: string;
  address: string;
  phone: string;
  rating: number;
  beds: number;
  established: string;
  facilities: string[];
  mapQuery: string;
}

interface DoctorResult {
  name: string;
  specialisation: string;
  qualification: string;
  experience: string;
  hospital: string;
  fee: string;
  rating: number;
  languages: string[];
  mapQuery: string;
}

interface DoctorBookingProps {
  specialist: string;
  onClose?: () => void;
}

export const DoctorBooking = ({ specialist, onClose }: DoctorBookingProps) => {
  const [locationInput, setLocationInput] = useState('');
  const [hospitals, setHospitals] = useState<HospitalResult[]>([]);
  const [doctors, setDoctors] = useState<DoctorResult[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchDoctors = useCallback(async (loc: string) => {
    setIsLoading(true);
    setHasSearched(true);
    setHospitals([]);
    setDoctors([]);
    setSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-doctors', {
        body: { specialist, location: loc },
      });

      if (error) throw error;
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (parsed.error) throw new Error(parsed.error);

      setHospitals(parsed.hospitals || []);
      setDoctors(parsed.doctors || []);
      setSummary(parsed.summary || null);

      if ((parsed.hospitals || []).length === 0 && (parsed.doctors || []).length === 0) {
        toast.info('No results found. Try a different location.');
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Failed to search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [specialist]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&addressdetails=1`
          );
          const geo = await res.json();
          const city = geo?.address?.city || geo?.address?.town || geo?.address?.village || geo?.display_name || '';
          setLocationInput(city);
          searchDoctors(city);
        } catch {
          toast.error('Could not detect location');
        } finally {
          setIsDetecting(false);
        }
      },
      () => {
        setIsDetecting(false);
        toast.error('Location access denied. Enter manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleManualSearch = () => {
    if (!locationInput.trim()) { toast.error('Please enter a location'); return; }
    searchDoctors(locationInput.trim());
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Find a {specialist}</h3>
          <p className="text-sm text-muted-foreground">Hospitals & doctors near you</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Location Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          Your Location
        </label>
        <div className="flex gap-2">
          <Input
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            placeholder="Enter city (e.g. Mumbai, Delhi)"
            className="h-11 rounded-xl bg-secondary/30 flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
          />
          <Button variant="outline" size="icon" onClick={detectLocation} disabled={isDetecting}
            className="h-11 w-11 rounded-xl border-primary/20 hover:bg-primary/5 shrink-0" title="Detect my location">
            {isDetecting ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <LocateFixed className="w-4 h-4 text-primary" />}
          </Button>
        </div>

        {/* City chips */}
        <div className="flex flex-wrap gap-1.5">
          {['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kochi'].map((city) => (
            <button key={city} onClick={() => { setLocationInput(city); searchDoctors(city); }} disabled={isLoading}
              className="px-3 py-1.5 text-xs font-semibold rounded-full bg-secondary/50 text-foreground hover:bg-primary/10 hover:text-primary border border-border/40 transition-colors disabled:opacity-50">
              {city}
            </button>
          ))}
        </div>

        <Button onClick={handleManualSearch} disabled={!locationInput.trim() || isLoading}
          className="w-full h-10 rounded-xl gap-2 text-sm font-semibold gradient-primary shadow-glow">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Find Best Results
        </Button>
      </div>

      {/* Summary */}
      {summary && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-primary/5 rounded-2xl border border-primary/10">
          <p className="text-sm text-foreground leading-relaxed font-medium">{summary}</p>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Finding {specialist}s near you...</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && hasSearched && (
        <AnimatePresence mode="wait">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
            <div className="grid grid-cols-2 gap-3">
              {/* Hospitals Column */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-3 h-3 text-primary" />
                  </div>
                  <h5 className="text-xs font-bold text-foreground">Hospitals</h5>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 rounded-full">{hospitals.length}</Badge>
                </div>
                {hospitals.length > 0 ? hospitals.map((h, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="p-3 bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all space-y-1.5">
                    <h4 className="font-bold text-foreground text-xs leading-tight line-clamp-2">{h.name}</h4>
                    <div className="flex items-center gap-1 text-primary">
                      <Stethoscope className="w-2.5 h-2.5" />
                      <span className="text-[10px] font-semibold">{h.specialisation}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-0.5 text-warning">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span className="text-[10px] font-bold">{h.rating}</span>
                      </div>
                      {h.beds > 0 && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <BedDouble className="w-2.5 h-2.5" /> {h.beds} beds
                        </span>
                      )}
                    </div>
                    {h.established && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> Est. {h.established}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{h.address}</p>
                    {h.phone && h.phone !== 'N/A' && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Phone className="w-2.5 h-2.5" /> {h.phone}
                      </p>
                    )}
                    {h.facilities?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {h.facilities.slice(0, 3).map((f, fi) => (
                          <span key={fi} className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground">{f}</span>
                        ))}
                      </div>
                    )}
                    <Button size="sm" onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(h.mapQuery || h.name)}`, '_blank')}
                      className="w-full rounded-lg h-7 gap-1 text-[10px] font-bold mt-1">
                      <Navigation className="w-3 h-3" /> View on Map
                    </Button>
                  </motion.div>
                )) : (
                  <p className="text-[10px] text-muted-foreground text-center py-4">No hospitals found</p>
                )}
              </div>

              {/* Doctors Column */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <div className="w-5 h-5 rounded-md bg-accent/50 flex items-center justify-center">
                    <UserRound className="w-3 h-3 text-primary" />
                  </div>
                  <h5 className="text-xs font-bold text-foreground">Doctors</h5>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 rounded-full">{doctors.length}</Badge>
                </div>
                {doctors.length > 0 ? doctors.map((d, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="p-3 bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all space-y-1.5">
                    <h4 className="font-bold text-foreground text-xs leading-tight line-clamp-2">{d.name}</h4>
                    <div className="flex items-center gap-1 text-primary">
                      <Stethoscope className="w-2.5 h-2.5" />
                      <span className="text-[10px] font-semibold">{d.specialisation}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-0.5 text-warning">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span className="text-[10px] font-bold">{d.rating}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {d.experience}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <GraduationCap className="w-2.5 h-2.5" /> {d.qualification}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Building2 className="w-2.5 h-2.5" /> {d.hospital}
                    </p>
                    {d.fee && (
                      <p className="text-[10px] text-primary font-semibold flex items-center gap-0.5">
                        <IndianRupee className="w-2.5 h-2.5" /> {d.fee}
                      </p>
                    )}
                    {d.languages?.length > 0 && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Languages className="w-2.5 h-2.5" /> {d.languages.join(', ')}
                      </p>
                    )}
                    <Button size="sm" onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(d.mapQuery || d.name)}`, '_blank')}
                      className="w-full rounded-lg h-7 gap-1 text-[10px] font-bold mt-1">
                      <Navigation className="w-3 h-3" /> View on Map
                    </Button>
                  </motion.div>
                )) : (
                  <p className="text-[10px] text-muted-foreground text-center py-4">No doctors found</p>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
};
