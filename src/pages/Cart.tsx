import React, { useState } from 'react';
import { Loader2, Minus, Plus, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { formatPrice, getEffectivePrice } from '../lib/commerce';
import { SafeImage } from '../components/common/SafeImage';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonCartPage } from '../components/common/LoadingSpinner';

export default function Cart() {
  const {
    items,
    isLoading,
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
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [applying, setApplying] = useState(false);

  if (isLoading) return <SkeletonCartPage />;

  if (items.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-16">
        <EmptyState
          icon={<ShoppingBag className="w-6 h-6" />}
          title="Your shopping cart is empty"
          description="Browse Zyro Mall to discover electronics, leather goods, fragrances, and footwear."
          ctaLabel="Start Shopping"
          ctaLink="/products"
        />
      </div>
    );
  }

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponError('');
    setApplying(true);
    try {
      await applyCoupon(couponCode.trim());
      setCouponCode('');
    } catch (err: unknown) {
      setCouponError(err instanceof Error ? err.message : 'Invalid coupon code.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <h1 className="font-display text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-6">
        Shopping Cart
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Items */}
        <div className="lg:col-span-8 bg-white border border-[#E8E8E8] rounded-xl divide-y divide-[#E8E8E8]">
          {items.map((item) => {
            const product = item.product!;
            const unitPrice = getEffectivePrice(product, item.variant?.price_modifier ?? 0);
            return (
              <div key={item.id} className="p-5 flex gap-4 sm:gap-5 items-center">
                <Link
                  to={`/products/${product.slug}`}
                  className="w-24 h-20 rounded-lg overflow-hidden border border-[#E8E8E8] shrink-0 bg-[#F3F4F6]"
                >
                  <SafeImage
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-full"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/products/${product.slug}`}
                    className="font-display text-base font-semibold text-[#1A1A1A] hover:text-[#FF6B35] line-clamp-1"
                  >
                    {product.title}
                  </Link>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {item.variant
                      ? `${item.variant.variant_name}: ${item.variant.variant_value}`
                      : product.category_name}
                  </p>
                  <p className="text-sm font-semibold text-[#1A1A1A] tabular-nums mt-1">
                    {formatPrice(unitPrice)} each
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 sm:gap-5">
                  <div className="inline-flex items-center border border-[#E8E8E8] rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label={`Decrease ${product.title} quantity`}
                      className="w-9 h-9 flex items-center justify-center text-[#6B7280] hover:text-[#1A1A1A] cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-9 text-center text-sm font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= product.stock_quantity}
                      aria-label={`Increase ${product.title} quantity`}
                      className="w-9 h-9 flex items-center justify-center text-[#6B7280] hover:text-[#1A1A1A] disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="font-display text-base font-bold text-[#1A1A1A] tabular-nums min-w-[96px] text-right">
                    {formatPrice(unitPrice * item.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Remove ${product.title}`}
                    className="text-[#9CA3AF] hover:text-[#EF4444] p-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <aside className="lg:col-span-4 bg-white border border-[#E8E8E8] rounded-xl p-6 space-y-5 sticky top-24">
          <h2 className="font-display text-lg font-bold text-[#1A1A1A]">Order Summary</h2>

          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
                <Tag className="w-3.5 h-3.5" />
                Coupon <strong className="font-mono">{appliedCoupon.code}</strong> applied
              </span>
              <button
                type="button"
                onClick={removeCoupon}
                className="text-emerald-800 underline cursor-pointer"
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} className="space-y-1.5">
              <label htmlFor="cart-coupon" className="block text-xs font-medium text-[#6B7280]">
                Promo Code
              </label>
              <div className="flex gap-2">
                <input
                  id="cart-coupon"
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter code (e.g. ZYRO10)"
                  className="flex-1 h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
                />
                <button
                  type="submit"
                  disabled={applying}
                  className="px-4 h-10 rounded-lg border border-[#FF6B35] text-[#FF6B35] hover:bg-[#FFF0EA] text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {applying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {applying ? 'Applying...' : 'Apply'}
                </button>
              </div>
              {couponError && <p className="text-xs text-[#EF4444]">{couponError}</p>}
            </form>
          )}

          <div className="space-y-2.5 text-sm border-t border-[#E8E8E8] pt-4">
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
                <span className="tabular-nums font-medium">-{formatPrice(discountAmount)}</span>
              </div>
            )}
            {subtotal < settings.free_shipping_threshold && (
              <p className="text-xs text-[#6B7280]">
                Free delivery on orders above {formatPrice(settings.free_shipping_threshold)}.
              </p>
            )}
            <div className="flex justify-between pt-3 border-t border-[#E8E8E8] text-base font-bold text-[#1A1A1A]">
              <span>Grand Total</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/checkout')}
            className="w-full h-12 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold cursor-pointer transition-colors"
          >
            Proceed to Checkout
          </button>
        </aside>
      </div>
    </div>
  );
}
