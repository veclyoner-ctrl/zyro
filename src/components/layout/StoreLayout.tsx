import React from 'react';
import { Wrench } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CartDrawer } from '../cart/CartDrawer';

export function StoreLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useCart();
  const { isAdmin } = useAuth();
  const location = useLocation();
  const isAuthBypass =
    location.pathname === '/login' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password';

  if (settings.maintenance_mode && !isAdmin && !isAuthBypass) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center p-6">
        <div className="bg-white border border-[#E8E8E8] rounded-xl p-8 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-[#FFF0EA] text-[#FF6B35] flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-6 h-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#1A1A1A] mb-2">
            Scheduled Store Maintenance
          </h1>
          <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
            {settings.store_name} is briefly upgrading inventory and checkout systems. We will be back online shortly.
          </p>
          <Link
            to="/login"
            className="text-xs font-medium text-[#6B7280] underline hover:text-[#1A1A1A]"
          >
            Admin Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F8] text-[#1A1A1A]">
      <Navbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
