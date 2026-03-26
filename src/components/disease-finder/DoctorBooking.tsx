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
  rating?: number;
  reviews?: number;
  distance?: number | null;
  tier?: string;
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

  const searchDoctors = useCallback(async (locData: any) => {
    setIsLoading(true);
    setHasSearched(true);
    setDoctors([]);
    setAiAnswer(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-doctors', {
        body: { 
          specialist, 
          location: typeof locData === 'string' ? locData : locData.full,
          locationMetadata: typeof locData === 'string' ? null : locData
        },
      });

      if (error) throw error;

      // Handle case where data might be a string (not auto-parsed)
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;

      if (parsed.error) throw new Error(parsed.error);

      console.log('Doctor search results:', parsed);
      setDoctors(parsed.doctors || []);
      setAiAnswer(parsed.answer || null);

      if ((parsed.doctors || []).length === 0) {
        toast.info('No doctors found. Try a different location or search online below.');
      }
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
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&addressdetails=1`
          );
          const geo = await res.json();
          
          const exactParts = [
            geo?.address?.house_number,
            geo?.address?.road,
            geo?.address?.neighbourhood || geo?.address?.suburb || geo?.address?.residential,
            geo?.address?.city || geo?.address?.town || geo?.address?.village,
            geo?.address?.state || geo?.address?.county || geo?.address?.state_district
          ].filter(Boolean);
          
          const fullLabel = exactParts.length > 0 ? exactParts.join(', ') : geo?.display_name || '';
          
          const locMetadata = {
            full: fullLabel,
            road: geo?.address?.road || '',
            suburb: geo?.address?.neighbourhood || geo?.address?.suburb || geo?.address?.residential || '',
            city: geo?.address?.city || geo?.address?.town || geo?.address?.village || '',
            district: geo?.address?.county || geo?.address?.district || geo?.address?.state_district || '',
            state: geo?.address?.state || '',
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          
          if (fullLabel) {
            setLocation(fullLabel);
            setLocationInput(fullLabel);
            searchDoctors(locMetadata);
          } else {
            const locStr = `${position.coords.latitude}, ${position.coords.longitude}`;
            setLocation(locStr);
            setLocationInput('Location detected');
            searchDoctors(locStr);
          }
        } catch (error) {
          console.error('Reverse geocode error:', error);
          const locStr = `${position.coords.latitude}, ${position.coords.longitude}`;
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
          <p className="text-sm text-muted-foreground">Top-rated medical facilities near you</p>
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

        {/* Quick city chips */}
        <div className="flex flex-wrap gap-1.5">
          {['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kochi'].map((city) => (
            <button
              key={city}
              onClick={() => {
                setLocationInput(city);
                setLocation(city);
                searchDoctors(city);
              }}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-semibold rounded-full bg-secondary/50 text-foreground hover:bg-primary/10 hover:text-primary border border-border/40 transition-colors disabled:opacity-50"
            >
              {city}
            </button>
          ))}
        </div>

        <Button
          onClick={handleManualSearch}
          disabled={!locationInput.trim() || isLoading}
          className="w-full h-10 rounded-xl gap-2 text-sm font-semibold gradient-primary shadow-glow"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Find Best Results
        </Button>
      </div>

      {/* AI Answer Summary */}
      {aiAnswer && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-primary/5 rounded-2xl border border-primary/10"
        >
          <p className="text-sm text-foreground leading-relaxed font-medium capitalize">{aiAnswer}</p>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Finding top-rated {specialist}s near you...</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && hasSearched && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar"
          >
            {doctors.length > 0 ? (
              doctors.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -2 }}
                  className="p-4 bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all relative overflow-hidden"
                >
                  {i === 0 && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-primary/20 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        Best Match
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mr-10">
                        <h4 className="font-bold text-foreground text-sm leading-tight line-clamp-1">{doc.title}</h4>
                        <div className="flex gap-1 items-center flex-shrink-0">
                          {doc.distance !== null && (
                            <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded-full border border-primary/10 whitespace-nowrap">
                              {doc.distance} km
                            </span>
                          )}
                          {doc.tier && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${
                              doc.tier === 'Local' ? 'bg-success/5 text-success border-success/10' :
                              doc.tier === 'Nearby' ? 'bg-info/5 text-info border-info/10' :
                              'bg-secondary/50 text-muted-foreground border-border/50'
                            }`}>
                              {doc.tier}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border-none text-[10px] font-semibold">
                          {doc.source}
                        </Badge>
                        {doc.rating && (
                          <div className="flex items-center gap-1 text-warning">
                            <Star className="w-3 h-3 fill-current" />
                            <span className="text-[10px] font-bold">{doc.rating}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">({doc.reviews}+)</span>
                          </div>
                        )}
                      </div>
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
