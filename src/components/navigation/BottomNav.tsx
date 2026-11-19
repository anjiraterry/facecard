'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import {
  Home,
  ShoppingBag,
  Camera,
  Users,
  User,
  CreditCard,
  Swords,
  Trophy,
  Layers,
  LogOut,
  Images,
} from 'lucide-react';

const SHOW_NAV_PREFIXES = [
  '/home',
  '/card',
  '/faceoff',
  '/friends',
  '/leaderboard',
  '/profile',
  '/scan',
  '/gallery',
  '/notifications',
  '/shop',
  '/vanity',
  '/skincare',
];

export function BottomNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const isAccountAtelier = pathname === '/skincare' || pathname?.startsWith('/skincare/');
  const shouldShowNav =
    SHOW_NAV_PREFIXES.some((prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`)) &&
    (!isAccountAtelier || Boolean(user));
  if (!shouldShowNav) {
    return null;
  }

  // Section 7 Mobile Navigation: 5 core destinations (Atelier in dock; Profile in header)
  const mobileNavItems = [
    { label: 'Home', href: '/home', icon: Home },
    { label: 'Atelier', href: '/skincare', icon: Layers },
    { label: 'Scan', href: '/scan', isCenter: true },
    { label: 'Social', href: '/friends', icon: Users },
    { label: 'Shop', href: '/shop', icon: ShoppingBag },
  ];

  // Section 7 Desktop Restrained Left Sidebar
  const desktopNavItems = [
    { label: 'Home', href: '/home', icon: Home },
    { label: 'My Card', href: '/card', icon: CreditCard },
    { label: 'Scan', href: '/scan', icon: Camera },
    { label: 'Gallery', href: '/gallery', icon: Images },
    { label: 'Arena', href: '/faceoff', icon: Swords },
    { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { label: 'Social', href: '/friends', icon: Users },
    { label: 'Boutique', href: '/shop', icon: ShoppingBag },
    { label: 'Atelier', href: '/skincare', icon: Layers },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <>
      {/* Desktop Restrained Left Sidebar */}
      <aside
        aria-label="Desktop navigation"
        className="hidden md:flex fixed left-0 top-0 bottom-0 w-16 lg:w-52 z-40 flex-col justify-between py-6 px-3 lg:px-4 bg-[var(--surface)] border-r border-[var(--border)]"
      >
        <div className="space-y-6">
          <Link
            href="/home"
            className="flex items-center justify-center lg:justify-start px-2 py-1"
            aria-label="facecard home"
          >
            <span className="hidden lg:inline font-sans font-extrabold text-xl tracking-[-0.03em] text-[var(--foreground)]">
              facecard.
            </span>
            <span className="lg:hidden font-sans font-extrabold text-lg text-[var(--foreground)]">
              fc.
            </span>
          </Link>

          <nav className="space-y-1">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/home' && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.label}
                  className={`h-11 px-3 rounded-xl flex items-center justify-center lg:justify-start gap-3 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-xs)]'
                      : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)]'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[1.75] shrink-0" />
                  <span className="hidden lg:inline truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3">
          {user && (
            <button
              type="button"
              onClick={signOut}
              title="Sign Out"
              className="w-full h-10 px-3 rounded-xl flex items-center justify-center lg:justify-start gap-3 text-xs font-semibold text-[var(--foreground-secondary)] hover:text-red-600 hover:bg-red-50/70 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 stroke-[1.75] shrink-0" />
              <span className="hidden lg:inline">Sign Out</span>
            </button>
          )}
          <p className="hidden lg:block px-2 text-[11px] text-[var(--foreground-muted)] leading-relaxed">
            Good skin. Great face card.
          </p>
        </div>
      </aside>

      {/* Mobile Floating Bottom Dock */}
      <nav
        aria-label="Primary navigation"
        className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[340px] z-50"
      >
        <div className="bg-[#251E24] dark:bg-[#302630] text-[#FAF7F4] border border-[#EBDCD5]/15 rounded-full p-1.5 px-2.5 flex items-center justify-between shadow-[var(--shadow-lg)]">
          {mobileNavItems.map((item) => {
            if (item.isCenter) {
              const isScanActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label="Start facial analysis scan"
                  aria-current={isScanActive ? 'page' : undefined}
                  className="relative group mx-0.5 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D2B8C9]"
                >
                  <motion.div
                    whileTap={{ scale: 0.96 }}
                    className="w-11 h-11 rounded-full flex items-center justify-center bg-[#EBDCD5] text-[#251E24] border border-[#FAF7F4]/60 shadow-[var(--shadow-sm)]"
                    title="Scan"
                  >
                    <Camera className="w-5 h-5 stroke-[1.75]" />
                  </motion.div>
                </Link>
              );
            }

            const Icon = item.icon!;
            const isActive =
              pathname === item.href ||
              (item.href !== '/home' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className="relative rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D2B8C9]"
                title={item.label}
              >
                {isActive ? (
                  <motion.div
                    layoutId="activeDockTab"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="w-11 h-11 rounded-full flex items-center justify-center bg-[#FAF7F4] text-[#251E24] shadow-[var(--shadow-xs)]"
                  >
                    <Icon className="w-4 h-4 stroke-[2]" />
                  </motion.div>
                ) : (
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-[#EBDCD5]/75 hover:text-[#FAF7F4] hover:bg-[#FAF7F4]/10 transition-colors">
                    <Icon className="w-4 h-4 stroke-[1.6]" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
