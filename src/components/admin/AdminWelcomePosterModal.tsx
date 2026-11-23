import { useEffect } from 'react';
import {
  ArrowRight,
  Building2,
  ExternalLink,
  Image as ImageIcon,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { SafeImage } from '../common/SafeImage';

export const ADMIN_POSTER_DISMISSED_KEY = 'zyro_admin_poster_dismissed';

interface AdminWelcomePosterModalProps {
  open: boolean;
  onClose: () => void;
}

export function AdminWelcomePosterModal({ open, onClose }: AdminWelcomePosterModalProps) {
  const { settings } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleNavigate = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Zyro Mall Admin Portal Poster"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-[#E8E8E8] shadow-2xl w-full max-w-3xl overflow-hidden"
          >
            {/* Poster Banner Image */}
            <div className="relative aspect-[16/8] bg-[#1E293B]">
              <SafeImage
                src={
                  settings.admin_poster_image_url ||
                  '/src/assets/images/poster_admin_welcome_1795191692080.jpg'
                }
                alt={settings.admin_poster_title || 'Zyro Mall Campaign Poster'}
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close welcome poster"
                className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/95 text-[#1A1A1A] hover:text-[#FF6B35] flex items-center justify-center shadow-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute bottom-4 left-5 right-5 text-white">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#FF6B35] bg-white/95 px-2.5 py-0.5 rounded mb-2">
                  <Sparkles className="w-3 h-3" />
                  Admin Launch Portal
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold leading-snug">
                  {settings.admin_poster_title ||
                    'Zyro Mall Official Storefront & Campaign Poster'}
                </h2>
                <p className="text-xs sm:text-sm text-white/90 mt-1 line-clamp-2 max-w-2xl">
                  {settings.admin_poster_subtitle ||
                    'Manage categories, partner businesses, data quality, discounted PKR pricing, and direct WhatsApp order booking from one unified portal.'}
                </p>
              </div>
            </div>

            {/* Quick Navigation & Actions */}
            <div className="p-5 sm:p-6 bg-white space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleNavigate('/admin/businesses')}
                  className="p-3 rounded-xl border border-[#E8E8E8] hover:border-[#FF6B35] bg-[#F8F8F8] hover:bg-[#FFF0EA]/40 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1A1A1A]">
                    <Building2 className="w-4 h-4 text-[#FF6B35]" />
                    Businesses
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-1">
                    Add or edit businesses, details &amp; images
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/admin/data-quality')}
                  className="p-3 rounded-xl border border-[#E8E8E8] hover:border-[#FF6B35] bg-[#F8F8F8] hover:bg-[#FFF0EA]/40 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1A1A1A]">
                    <ShieldCheck className="w-4 h-4 text-[#FF6B35]" />
                    Data Quality
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-1">
                    Audit images, prices, stock &amp; WhatsApp readiness
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/admin/banners')}
                  className="p-3 rounded-xl border border-[#E8E8E8] hover:border-[#FF6B35] bg-[#F8F8F8] hover:bg-[#FFF0EA]/40 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1A1A1A]">
                    <ImageIcon className="w-4 h-4 text-[#FF6B35]" />
                    Customize Poster
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-1">
                    Upload your own poster or change campaign
                  </p>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E8E8E8]">
                <button
                  type="button"
                  onClick={() => handleNavigate(settings.admin_poster_cta_url || '/products')}
                  className="px-4 py-2 rounded-lg border border-[#E8E8E8] hover:border-[#FF6B35] text-xs font-semibold text-[#1A1A1A] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#FF6B35]" />
                  {settings.admin_poster_cta_label || 'Browse Live Storefront'}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  Enter Admin Portal
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
