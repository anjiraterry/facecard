'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, ShoppingBag, Camera, Swords, CreditCard } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Feed', href: '/home', icon: Home },
    { label: 'Arena', href: '/faceoff', icon: Swords },
    { label: 'Selfie', href: '/scan', isCenter: true },
    { label: 'Shop', href: '/shop', icon: ShoppingBag },
    { label: 'Card', href: '/card', icon: CreditCard },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[320px] z-50">
      <div className="bg-[#140826]/95 text-white backdrop-blur-2xl border border-purple-400/20 rounded-full p-2 px-3 flex items-center justify-between shadow-[0_16px_40px_rgba(20,8,38,0.45)]">
        {navItems.map((item) => {
          if (item.isCenter) {
            return (
              <Link key={item.href} href={item.href} className="relative group mx-0.5">
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.08 }}
                  className="w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#FF7A50] to-[#FFAE80] text-white shadow-[0_4px_18px_rgba(255,122,80,0.5)] border border-white/25 transition-transform"
                  title="Take Selfie"
                >
                  <Camera className="w-5 h-5 text-white stroke-[2.2]" />
                </motion.div>
              </Link>
            );
          }

          const Icon = item.icon!;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative transition-all"
              title={item.label}
            >
              {isActive ? (
                /* Selected Tab (Pure White with Deep Dark Purple Icon) */
                <motion.div
                  layoutId="activeDockTab"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  style={{ backgroundColor: '#FFFFFF' }}
                  className="active-dock-tab w-10 h-10 rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(255,255,255,0.4)]"
                >
                  <Icon className="w-4 h-4 stroke-[2.4]" style={{ color: '#140826' }} />
                </motion.div>
              ) : (
                /* Inactive Circular Tab Button (Icon-only) */
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors hover:bg-white/10">
                  <Icon className="w-4 h-4 stroke-[1.8]" />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
