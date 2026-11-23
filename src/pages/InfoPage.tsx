import { Link } from 'react-router-dom';
import { ChevronRight, Mail, MessageCircle, Phone, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { formatPrice, sanitizeWhatsAppNumber } from '../lib/commerce';

export type InfoTopic = 'about' | 'contact' | 'privacy' | 'terms';

export default function InfoPage({ topic }: { topic: InfoTopic }) {
  const { settings } = useCart();
  const storeName = settings.store_name || 'Zyro Mall';

  const titles: Record<InfoTopic, string> = {
    about: `About ${storeName}`,
    contact: 'Contact & Customer Support',
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
  };

  return (
    <div className="max-w-[960px] mx-auto px-4 md:px-8 py-8">
      <nav className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-[#FF6B35]">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#1A1A1A] font-medium">{titles[topic]}</span>
      </nav>

      <div className="bg-white border border-[#E8E8E8] rounded-xl p-6 sm:p-8 space-y-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
          {titles[topic]}
        </h1>

        {topic === 'about' && (
          <div className="space-y-4 text-sm text-[#4B5563] leading-relaxed">
            <p>
              {storeName} is a Pakistani e-commerce marketplace offering curated electronics, handcrafted Sialkot leather goods, athletic footwear, modern lighting, and artisanal fragrances delivered nationwide.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#F8F8F8] border border-[#E8E8E8] flex items-start gap-3">
                <Truck className="w-5 h-5 text-[#FF6B35] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Nationwide Pakistan Delivery</p>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Flat {formatPrice(settings.flat_shipping_cost)} shipping, or free above{' '}
                    {formatPrice(settings.free_shipping_threshold)}.
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#F8F8F8] border border-[#E8E8E8] flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#FF6B35] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">7-Day Verified Returns</p>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Eligible delivered orders can request a return directly from the order detail page within 7 days.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {topic === 'contact' && (
          <div className="space-y-4 text-sm text-[#4B5563] leading-relaxed">
            <p>
              Have a question about an order, JazzCash/EasyPaisa verification, or instant WhatsApp order booking? Reach our support desk directly:
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#F8F8F8] border border-[#E8E8E8] flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#FF6B35] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-[#6B7280]">Support Email</p>
                  <p className="font-semibold text-[#1A1A1A] truncate">
                    {settings.contact_email || 'support@zyromall.pk'}
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#F8F8F8] border border-[#E8E8E8] flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#FF6B35] shrink-0" />
                <div>
                  <p className="text-xs text-[#6B7280]">Support Phone</p>
                  <p className="font-semibold text-[#1A1A1A] tabular-nums">
                    {settings.contact_phone || '0329-6730804'}
                  </p>
                </div>
              </div>
              <a
                href={`https://wa.me/${sanitizeWhatsAppNumber(settings.whatsapp_number)}?text=${encodeURIComponent('Assalam-o-Alaikum, I need help booking an order on Zyro Mall.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-xl bg-[#ECFDF5] border border-[#16A34A]/30 hover:border-[#16A34A] flex items-center gap-3 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-[#15803D] shrink-0" />
                <div>
                  <p className="text-xs text-[#15803D]">WhatsApp Order Booking</p>
                  <p className="font-semibold text-[#14532D] tabular-nums">
                    {settings.whatsapp_number || '03296730804'}
                  </p>
                </div>
              </a>
            </div>
          </div>
        )}

        {topic === 'privacy' && (
          <div className="space-y-4 text-sm text-[#4B5563] leading-relaxed">
            <p>
              {storeName} collects only the account, shipping address, and order details necessary to process deliveries across Pakistan, verify payments, and support returns.
            </p>
            <p>
              Payment proof receipts uploaded for JazzCash or EasyPaisa transfers are stored securely in private storage and reviewed solely by authorized store staff for order verification.
            </p>
          </div>
        )}

        {topic === 'terms' && (
          <div className="space-y-4 text-sm text-[#4B5563] leading-relaxed">
            <p>
              All prices on {storeName} are listed in Pakistani Rupees (PKR). Promotional coupon codes apply subject to minimum order value and expiration dates.
            </p>
            <p>
              Orders in pending status may be cancelled by the customer with automatic stock restoration. Delivered orders qualify for return requests within 7 days of delivery when merchandise remains in original condition.
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-[#E8E8E8]">
          <Link
            to="/products"
            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold"
          >
            Browse Catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
