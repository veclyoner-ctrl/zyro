import React, { useEffect, useState } from 'react';
import { Loader2, Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { formatPrice, getEffectivePrice } from '../../lib/commerce';
import { SafeImage } from '../common/SafeImage';

export function CartDrawer() {
  const {
    items,
    isDrawerOpen,
    closeDrawer,
    subtotal,
    shippingCost,
    discountAmount,
    total,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    updateQuantity,
    removeFromCart,
    settings,
  } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (location.pathname === '/checkout' && isDrawerOpen) {
      closeDrawer();
    }
  }, [location.pathname, isDrawerOpen, closeDrawer]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponError('');
    setApplying(true);
    try {
      await applyCoupon(couponInput.trim());
      setCouponInput('');
    } catch (err: unknown) {
      setCouponError(err instanceof Error ? err.message : 'Invalid coupon code.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div
        className="fixed inset-0 bg-black/45 transition-opacity"
        onClick={closeDrawer}
        aria-hidden="true"
      />
      <aside className="relative z-10 w-full max-w-[460px] bg-white h-full flex flex-col shadow-2xl border-l border-[#E8E8E8]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8]">
          <h2 className="font-display text-lg font-bold text-[#1A1A1A]">Shopping Cart</h2>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close cart drawer"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1A1A1A] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-[#E8E8E8]">
          {!Array.isArray(items) || items.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FFF0EA] text-[#FF6B35] flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="font-display font-semibold text-[#1A1A1A] mb-1">Your cart is empty</p>
              <p className="text-sm text-[#6B7280] mb-5">
                Explore our catalog for electronics, leather goods, footwear, and home essentials.
              </p>
              <Link
                to="/products"
                onClick={closeDrawer}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold"
              >
                Shop Now
              </Link>
            </div>
          ) : (
            (items ?? []).map((item) => {
              const product = item.product!;
              const unitPrice = getEffectivePrice(product, item.variant?.price_modifier ?? 0);
              return (
                <div key={item.id} className="py-4 flex gap-4">
                  <Link
                    to={`/products/${product.slug}`}
                    onClick={closeDrawer}
                    className="w-20 h-20 rounded-lg overflow-hidden border border-[#E8E8E8] shrink-0 bg-[#F3F4F6]"
                  >
                    <SafeImage
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/products/${product.slug}`}
                        onClick={closeDrawer}
                        className="text-sm font-semibold text-[#1A1A1A] hover:text-[#FF6B35] line-clamp-2"
                      >
                        {product.title}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Remove ${product.title} from cart`}
                        className="text-[#9CA3AF] hover:text-[#EF4444] p-1 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {item.variant && (
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {item.variant.variant_name}: {item.variant.variant_value}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="inline-flex items-center border border-[#E8E8E8] rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label={`Decrease quantity for ${product.title}`}
                          className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#1A1A1A] cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= product.stock_quantity}
                          aria-label={`Increase quantity for ${product.title}`}
                          className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#1A1A1A] disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-[#1A1A1A] tabular-nums">
                        {formatPrice(unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-[#E8E8E8] bg-[#F8F8F8] px-6 py-5 space-y-4">
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
                  <Tag className="w-3.5 h-3.5" />
                  Code <strong className="font-mono">{appliedCoupon.code}</strong> applied
                </span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-emerald-800 underline hover:no-underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Promo code (e.g. ZYRO10)"
                    aria-label="Promo code"
                    className="flex-1 h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm focus:outline-none focus:border-[#FF6B35]"
                  />
                  <button
                    type="submit"
                    disabled={applying}
                    className="px-4 h-10 rounded-lg border border-[#FF6B35] text-[#FF6B35] hover:bg-[#FFF0EA] text-sm font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {applying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {applying ? 'Applying...' : 'Apply'}
                  </button>
                </div>
                {couponError && <p className="text-xs text-[#EF4444]">{couponError}</p>}
              </form>
            )}

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#6B7280]">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium text-[#1A1A1A]">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#6B7280]">
                <span>Shipping</span>
                <span className="tabular-nums font-medium text-[#1A1A1A]">
                  {shippingCost === 0 ? 'Free' : formatPrice(shippingCost)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="tabular-nums font-medium">
                    -{formatPrice(discountAmount)}
                  </span>
                </div>
              )}
              {subtotal < settings.free_shipping_threshold && (
                <p className="text-xs text-[#6B7280]">
                  Add {formatPrice(settings.free_shipping_threshold - subtotal)} more for free delivery.
                </p>
              )}
              <div className="flex justify-between pt-2 border-t border-[#E8E8E8] text-base font-bold text-[#1A1A1A]">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  navigate('/cart');
                }}
                className="py-2.5 px-4 rounded-lg border border-[#E8E8E8] bg-white hover:bg-[#F3F4F6] text-sm font-semibold text-[#1A1A1A] cursor-pointer whitespace-nowrap"
              >
                View Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  navigate('/checkout');
                }}
                className="py-2.5 px-4 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold cursor-pointer whitespace-nowrap"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
