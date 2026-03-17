import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, LogOut, Info, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      navigate('/auth');
    } catch (error) {
      toast.error('Failed to log out');
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
            <div>
              <h1 className="font-display text-xl font-semibold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground">Configure your app</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Admin Section - Only visible to admins */}
        {isAdmin && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-5 shadow-card border border-border/50"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">Admin Panel</h3>
                <p className="text-sm text-muted-foreground">Manage users and roles</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/admin')}
              className="w-full"
            >
              <Shield className="w-4 h-4 mr-2" />
              Open Admin Dashboard
            </Button>
          </motion.section>
        )}

        {/* Logout Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isAdmin ? 0.1 : 0 }}
          className="bg-card rounded-2xl p-5 shadow-card border border-border/50"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">Account</h3>
              <p className="text-sm text-muted-foreground">Manage your session</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </motion.section>

        {/* About */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isAdmin ? 0.2 : 0.1 }}
          className="bg-card rounded-2xl p-5 shadow-card border border-border/50"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">About MedGuide AI</h3>
              <p className="text-sm text-muted-foreground">Version 1.0.0</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            A premium AI-powered healthcare assistant to help you manage your health, track medications, and get instant medical guidance.
          </p>
        </motion.section>

        {/* Disclaimer */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isAdmin ? 0.3 : 0.2 }}
          className="bg-warning-light rounded-2xl p-5 border border-warning/20"
        >
          <h4 className="font-medium text-foreground mb-2">⚠️ Medical Disclaimer</h4>
          <p className="text-sm text-muted-foreground">
            MedGuide AI is for informational purposes only and does not constitute medical advice. Always consult a qualified healthcare provider for medical concerns.
          </p>
        </motion.section>
      </main>
    </div>
  );
};

export default Settings;
