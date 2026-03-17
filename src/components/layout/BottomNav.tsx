import { NavLink, useLocation } from 'react-router-dom';
import { Home, Pill, MessageCircle, User } from 'lucide-react';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/medications', icon: Pill, label: 'Meds' },
  { path: '/chat', icon: MessageCircle, label: 'Chat' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-nav-bg border-t border-border shadow-md"
      style={{ zIndex: 9999 }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4 pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center w-16 h-full"
            >
              <div className="relative">
                {isActive && (
                  <div className="absolute -inset-2 bg-nav-active/15 rounded-xl" />
                )}
                <Icon
                  className={`relative z-10 w-6 h-6 transition-colors duration-200 ${
                    isActive ? 'text-nav-active' : 'text-nav-foreground'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={`mt-1 text-[11px] font-semibold transition-colors duration-200 ${
                  isActive ? 'text-nav-active' : 'text-nav-foreground'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
