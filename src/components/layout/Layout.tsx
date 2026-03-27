import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { PageTransition } from './PageTransition';
import { useMedicationReminders } from '@/hooks/useMedicationReminders';

export const Layout = () => {
  useMedicationReminders();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 
        main must NOT have overflow-y-auto here — individual pages
        (especially Chat) manage their own scroll containers so that
        headers/footers can be pinned within the page's flex column.
        pb-20 leaves room for the fixed BottomNav (h-16 = 4rem + safe area).
      */}
      <main className="flex-1 pb-20">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <BottomNav />
    </div>
  );
};
