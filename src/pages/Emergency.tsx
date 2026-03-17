import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Phone, AlertTriangle, X, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Emergency = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const emergencyNumbers = [
    { label: 'National Emergency', number: '112', color: 'bg-alert' },
    { label: 'Ambulance (India)', number: '108', color: 'bg-alert' },
    { label: 'Police', number: '100', color: 'bg-warning' },
    { label: 'Fire', number: '101', color: 'bg-info' },
  ];

  const handleCall = (number: string) => {
    window.location.href = `tel:${number.replace(/-/g, '')}`;
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
              <h1 className="font-display text-xl font-semibold text-foreground">Emergency SOS</h1>
              <p className="text-sm text-muted-foreground">Quick access to help</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-alert/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-alert" />
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Big SOS Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-8"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="w-40 h-40 rounded-full bg-alert shadow-lg flex flex-col items-center justify-center relative"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-alert/30"
            />
            <Phone className="w-12 h-12 text-primary-foreground mb-2 relative z-10" />
            <span className="text-2xl font-bold text-primary-foreground relative z-10">SOS</span>
          </motion.button>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Tap to access emergency services
          </p>
        </motion.div>

        {/* Quick Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-alert-light rounded-2xl p-5 border border-alert/20"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-alert flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground mb-2">When to use Emergency Services</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Severe chest pain or difficulty breathing</li>
                <li>• Signs of stroke (face drooping, arm weakness, speech difficulty)</li>
                <li>• Severe allergic reactions</li>
                <li>• Uncontrolled bleeding</li>
                <li>• Loss of consciousness</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Emergency Numbers */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-display font-semibold text-foreground mb-3">Emergency Numbers</h3>
          <div className="space-y-3">
            {emergencyNumbers.map((item, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                onClick={() => handleCall(item.number)}
                className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl shadow-card border border-border/50 hover:bg-secondary/50 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center`}>
                  <Phone className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.number}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-info-light rounded-2xl p-5 border border-info/20"
        >
          <h4 className="font-medium text-foreground mb-3">📋 Stay Calm Checklist</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>1. Take deep breaths to stay calm</li>
            <li>2. Know your location to tell dispatchers</li>
            <li>3. Stay on the line until help arrives</li>
            <li>4. Follow instructions from the operator</li>
          </ul>
        </motion.div>
      </main>

      {/* Emergency Call Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Call Emergency Services
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => handleCall('112')}
                  className="w-full h-14 text-lg bg-alert hover:bg-alert/90"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call 112 (National Emergency)
                </Button>
                <Button
                  onClick={() => handleCall('108')}
                  variant="outline"
                  className="w-full h-14 text-lg border-alert text-alert hover:bg-alert/10"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call 108 (Ambulance)
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Only use in real emergencies
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Emergency;
