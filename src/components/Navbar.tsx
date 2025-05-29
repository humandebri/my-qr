'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@junobuild/core';
import { useAuth } from '@/app/client-providers';
import { HiMenuAlt3, HiX } from 'react-icons/hi';
import { IoWalletOutline } from 'react-icons/io5';
import { IoMdLogOut } from 'react-icons/io';
import { PiStampLight } from 'react-icons/pi';
import { MdStore } from 'react-icons/md';

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (!user || pathname === '/login') {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Wallet', icon: <IoWalletOutline className="w-5 h-5" /> },
    { href: '/stamps', label: 'Stamps', icon: <PiStampLight className="w-5 h-5" /> },
    { href: '/owner', label: 'Owner', icon: <MdStore className="w-5 h-5" /> },
  ];

  return (
    <nav className="bg-black/50 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link href="/" className="text-white font-bold text-xl">
            My QR Wallet
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  pathname === item.href
                    ? 'text-cyan-400 bg-white/10'
                    : 'text-white hover:text-cyan-400 hover:bg-white/5'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-white hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
            >
              <IoMdLogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white p-2"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <HiX className="w-6 h-6" />
            ) : (
              <HiMenuAlt3 className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    pathname === item.href
                      ? 'text-cyan-400 bg-white/10'
                      : 'text-white hover:text-cyan-400 hover:bg-white/5'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-white hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors text-left"
              >
                <IoMdLogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};