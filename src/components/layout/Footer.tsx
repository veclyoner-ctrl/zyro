import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { sanitizeWhatsAppNumber } from '../../lib/commerce';

export function Footer() {
  const { settings } = useCart();
  const storeName = settings.store_name || 'Zyro Mall';
  const whatsappDigits = sanitizeWhatsAppNumber(settings.whatsapp_number);

  return (
    <footer className="bg-white border-t border-[#E8E8E8] mt-16">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-[#1A1A1A]"
            >
              {settings.store_logo_url && (
                <img
                  src={settings.store_logo_url}
                  alt={storeName}
                  className="h-7 w-7 rounded object-contain shrink-0"
                />
              )}
              <span>
                {storeName.toLowerCase() === 'zyro mall' ? (
                  <>
                    Zyro <span className="text-[#FF6B35]">Mall</span>
                  </>
                ) : (
                  storeName
                )}
              </span>
            </Link>
            <p className="text-sm text-[#6B7280] mt-3 leading-relaxed">
              Curated electronics, handcrafted Sialkot leather goods, footwear, and home essentials delivered across Pakistan.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-[#1A1A1A] mb-3">Shop</h3>
            <ul className="space-y-2 text-sm text-[#6B7280]">
              <li>
                <Link to="/products" className="hover:text-[#FF6B35]">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/products?category=electronics" className="hover:text-[#FF6B35]">
                  Electronics &amp; Audio
                </Link>
              </li>
              <li>
                <Link to="/products?category=leather-bags" className="hover:text-[#FF6B35]">
                  Leather &amp; Bags
                </Link>
              </li>
              <li>
                <Link to="/products?category=home-lighting" className="hover:text-[#FF6B35]">
                  Home &amp; Lighting
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-[#1A1A1A] mb-3">Customer Care</h3>
            <ul className="space-y-2 text-sm text-[#6B7280]">
              <li>
                <Link to="/orders" className="hover:text-[#FF6B35]">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-[#FF6B35]">
                  Saved Addresses
                </Link>
              </li>
              <li>
                <span>{settings.contact_email || 'support@zyromall.pk'}</span>
              </li>
              <li>
                <span className="tabular-nums">{settings.contact_phone || '0329-6730804'}</span>
              </li>
              <li>
                <a
                  href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent('Assalam-o-Alaikum, I want to book an order from Zyro Mall.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#15803D] font-semibold hover:underline"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp: {settings.whatsapp_number || '03296730804'}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-[#1A1A1A] mb-3">
              Payment Methods
            </h3>
            <div className="flex flex-wrap gap-2 text-xs text-[#6B7280]">
              {settings.cod_enabled && (
                <span className="px-2.5 py-1.5 rounded border border-[#E8E8E8] bg-[#F8F8F8] font-medium">
                  Cash on Delivery
                </span>
              )}
              <span className="px-2.5 py-1.5 rounded border border-[#E8E8E8] bg-[#F8F8F8] font-medium">
                JazzCash
              </span>
              <span className="px-2.5 py-1.5 rounded border border-[#E8E8E8] bg-[#F8F8F8] font-medium">
                EasyPaisa
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#E8E8E8] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
          <p>&copy; {new Date().getFullYear()} {storeName} Pakistan. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link to="/about" className="hover:text-[#1A1A1A]">
              About
            </Link>
            <Link to="/contact" className="hover:text-[#1A1A1A]">
              Contact
            </Link>
            <Link to="/privacy" className="hover:text-[#1A1A1A]">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-[#1A1A1A]">
              Terms
            </Link>
            <Link to="/admin" className="hover:text-[#1A1A1A]">
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
