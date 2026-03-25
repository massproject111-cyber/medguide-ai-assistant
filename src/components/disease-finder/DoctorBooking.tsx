import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Star, Search, ExternalLink, Loader2, X, Navigation, LocateFixed, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DoctorResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface DoctorBookingProps {
  specialist: string;
  onClose?: () => void;
}

export const DoctorBooking = ({ specialist, onClose }: DoctorBookingProps) => {
  const [location, setLocation] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [doctors, setDoctors] = useState<DoctorResult[]>([]);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchDoctors = useCallback(async (loc: string) => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-doctors', {
        body: { specialist, location: loc },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setDoctors(data.doctors || []);
      setAiAnswer(data.answer || null);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Failed to search for doctors. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [specialist]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Reverse geocode using Nominatim API (OpenStreetMap)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
          );
          const geo = await res.json();
          
          const exactParts = [
            geo?.address?.neighbourhood || geo?.address?.suburb || geo?.address?.residential,
            geo?.address?.city || geo?.address?.town || geo?.address?.village,
            geo?.address?.state || geo?.address?.county || geo?.address?.state_district
          ].filter(Boolean);
          
          const city = exactParts.length > 0 ? exactParts.join(', ') : geo?.display_name || '';
          
          if (city) {
            setLocation(city);
            setLocationInput(city);
            searchDoctors(city);
          } else {
            // Fallback: use coordinates as location string
            const locStr = `latitude ${position.coords.latitude}, longitude ${position.coords.longitude}`;
            setLocation(locStr);
            setLocationInput('Location detected');
            searchDoctors(locStr);
          }
        } catch {
          const locStr = `latitude ${position.coords.latitude}, longitude ${position.coords.longitude}`;
          setLocation(locStr);
          setLocationInput('Location detected');
          searchDoctors(locStr);
        } finally {
          setIsDetecting(false);
        }
      },
      (err) => {
        setIsDetecting(false);
        console.error('Geolocation error:', err);
        toast.error('Could not detect location. Please enter manually.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleManualSearch = () => {
    if (!locationInput.trim()) {
      toast.error('Please enter a location');
      return;
    }
    setLocation(locationInput.trim());
    searchDoctors(locationInput.trim());
  };

  const openGoogleSearch = () => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(`${specialist} doctor near ${location || 'me'}`)}`, '_blank');
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
          <p className="text-sm text-muted-foreground">Powered by live search</p>
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
          <div className="relative flex-1">
            <Input
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Enter city or area (e.g. Mumbai, Delhi)"
              className="h-11 rounded-xl bg-secondary/30 pr-10"
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={detectLocation}
            disabled={isDetecting}
            className="h-11 w-11 rounded-xl border-primary/20 hover:bg-primary/5 shrink-0"
            title="Detect my location"
          >
            {isDetecting ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <LocateFixed className="w-4 h-4 text-primary" />
            )}
          </Button>
        </div>
        <Button
          onClick={handleManualSearch}
          disabled={!locationInput.trim() || isLoading}
          className="w-full h-10 rounded-xl gap-2 text-sm font-semibold"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Search Doctors
        </Button>
      </div>

      {/* AI Answer Summary */}
      {aiAnswer && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-primary/5 rounded-2xl border border-primary/10"
        >
          <p className="text-sm text-foreground leading-relaxed">{aiAnswer}</p>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Searching for {specialist}s near {location}...</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && hasSearched && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3 max-h-[50vh] overflow-y-auto pr-1"
          >
            {doctors.length > 0 ? (
              doctors.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -2 }}
                  className="p-4 bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground text-sm leading-tight line-clamp-2">{doc.title}</h4>
                      <Badge variant="secondary" className="mt-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary border-none text-[10px] font-semibold">
                        {doc.source}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
                    {doc.snippet}
                  </p>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(doc.url, '_blank')}
                      className="flex-1 rounded-xl h-9 gap-1.5 border border-border/50 text-xs font-semibold"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(doc.title)}`, '_blank')}
                      className="flex-1 rounded-xl h-9 gap-1.5 text-xs font-bold"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      View on Map
                    </Button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-12 text-center space-y-3">
                <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8 text-muted-foreground opacity-50" />
                </div>
                <p className="text-muted-foreground font-medium text-sm">No results found for "{specialist}" near "{location}"</p>
                <p className="text-xs text-muted-foreground">Try a different location or search online</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* External search CTA */}
      {hasSearched && !isLoading && (
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
          </div>
        </div>
      )}
    </motion.div>
  );
};
