import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { PageTransition } from './PageTransition';
import { useMedicationReminders } from '@/hooks/useMedicationReminders';

export const Layout = () => {
  useMedicationReminders();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-20 overflow-y-auto">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <BottomNav />
    </div>
  );
};
