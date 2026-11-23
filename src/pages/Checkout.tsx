import React, { useEffect, useState } from 'react';
import { Banknote, CheckCircle2, Loader2, Lock, Smartphone, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { createOrder, getAddresses } from '../services/orderService';
import { uploadAsset } from '../services/uploadService';
import { formatPrice, getEffectivePrice } from '../lib/commerce';
import { cn } from '../lib/utils';
import type { PaymentMethod } from '../types';
import { SafeImage } from '../components/common/SafeImage';
import { EmptyState } from '../components/common/EmptyState';

export default function Checkout() {
  const { user } = useAuth();
  const {
    items,
    subtotal,
    shippingCost,
    discountAmount,
    total,
    appliedCoupon,
    removeCoupon,
    refreshCart,
    settings,
  } = useCart();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [saveAddress, setSaveAddress] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    settings.cod_enabled ? 'cod' : 'jazzcash'
  );
  const [paymentProofName, setPaymentProofName] = useState<string>('');
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: getAddresses,
  });

  useEffect(() => {
    if (!user) return;
    setFullName((prev) => prev || user.full_name || '');
    setPhone((prev) => prev || user.phone || '');
    setEmail((prev) => prev || user.email || '');
  }, [user]);

  useEffect(() => {
    if (!settings.cod_enabled && paymentMethod === 'cod') {
      setPaymentMethod('jazzcash');
    }
  }, [settings.cod_enabled, paymentMethod]);

  useEffect(() => {
    if (savedAddresses.length > 0 && !addressLine1) {
      const def = savedAddresses.find((a) => a.is_default) ?? savedAddresses[0];
      setSelectedAddressId(def.id);
      setFullName(def.full_name);
      setPhone(def.phone);
      setAddressLine1(def.address_line1);
      setCity(def.city);
      setArea(def.area);
      setPostalCode(def.postal_code);
      setSaveAddress(false);
    }
  }, [savedAddresses, addressLine1]);

  if (items.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-16">
        <EmptyState
          title="Your cart is empty"
          description="Add products to your cart before proceeding to checkout."
          ctaLabel="Browse Catalog"
          ctaLink="/products"
        />
      </div>
    );
  }

  function handleSelectSavedAddress(id: string) {
    setSelectedAddressId(id);
    const addr = savedAddresses.find((a) => a.id === id);
    if (addr) {
      setFullName(addr.full_name);
      setPhone(addr.phone);
      setAddressLine1(addr.address_line1);
      setCity(addr.city);
      setArea(addr.area);
      setPostalCode(addr.postal_code);
      setSaveAddress(false);
    }
  }

  function handleStep1Next(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !addressLine1.trim() || !city.trim()) {
      toast.error('Please fill in recipient name, phone, street address, and city.');
      return;
    }
    setStep(2);
  }

  async function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Payment screenshot must be under 5MB.');
      return;
    }
    setUploadingProof(true);
    try {
      const url = await uploadAsset(file, 'payment-proofs');
      setPaymentProofName(file.name);
      setPaymentProofUrl(url);
      toast.success('Payment screenshot attached');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload receipt.');
    } finally {
      setUploadingProof(false);
    }
  }

  function handleStep2Next(e: React.FormEvent) {
    e.preventDefault();
    if (uploadingProof) {
      toast.error('Please wait for your payment screenshot to finish uploading.');
      return;
    }
    setStep(3);
  }

  async function handlePlaceOrder() {
    setPlacingOrder(true);
    try {
      const order = await createOrder({
        shipping_address: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address_line1: addressLine1.trim(),
          city: city.trim(),
          area: area.trim(),
          postal_code: postalCode.trim(),
        },
        payment_method: paymentMethod,
        payment_proof_url: paymentProofUrl,
        coupon_code: appliedCoupon?.code ?? null,
        save_address: saveAddress,
      });
      removeCoupon();
      await refreshCart();
      toast.success('Order placed successfully!');
      navigate(`/order-confirmation/${order.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to place order.');
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <h1 className="font-display text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-6">Checkout</h1>

      {/* Stepper */}
      <div className="grid grid-cols-3 gap-3 max-w-2xl mb-8">
        {[
          { num: 1, label: '1. Shipping' },
          { num: 2, label: '2. Payment' },
          { num: 3, label: '3. Review' },
        ].map((s) => (
          <div
            key={s.num}
            className={cn(
              'py-2.5 px-4 rounded-lg border text-xs sm:text-sm font-semibold text-center',
              step === s.num
                ? 'border-[#FF6B35] bg-[#FFF0EA] text-[#FF6B35]'
                : step > s.num
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-[#E8E8E8] bg-white text-[#6B7280]'
            )}
          >
            {s.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 bg-white border border-[#E8E8E8] rounded-xl p-6">
          {step === 1 && (
            <form onSubmit={handleStep1Next} className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-[#1A1A1A]">
                  Shipping Information
                </h2>
                {savedAddresses.length > 0 && (
                  <select
                    value={selectedAddressId}
                    onChange={(e) => handleSelectSavedAddress(e.target.value)}
                    aria-label="Select saved address"
                    className="h-9 px-3 rounded-lg border border-[#E8E8E8] text-xs font-medium bg-[#F8F8F8]"
                  >
                    <option value="">Choose saved address...</option>
                    {savedAddresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.address_line1}, {addr.city}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ship-name" className="block text-xs font-medium text-[#6B7280] mb-1.5">
                    Full Name *
                  </label>
                  <input
                    id="ship-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
                  />
                </div>
                <div>
                  <label htmlFor="ship-phone" className="block text-xs font-medium text-[#6B7280] mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    id="ship-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03XX-XXXXXXX"
                    className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ship-email" className="block text-xs font-medium text-[#6B7280] mb-1.5">
                  Email Address
                </label>
                <input
                  id="ship-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
                />
              </div>

              <div>
                <label htmlFor="ship-addr" className="block text-xs font-medium text-[#6B7280] mb-1.5">
                  Street Address *
                </label>
                <input
                  id="ship-addr"
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="House #, Street, Sector / Block"
                  className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="ship-city" className="block text-xs font-medium text-[#6B7280] mb-1.5">
                    City *
                  </label>
                  <input
                    id="ship-city"
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Lahore, Karachi, Islamabad..."
                    className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
                  />
                </div>
                <div>
                  <label htmlFor="ship-area" className="block text-xs font-medium text-[#6B7280] mb-1.5">
                    Area / District
                  </label>
                  <input
                    id="ship-area"
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
                  />
                </div>
                <div>
                  <label htmlFor="ship-postal" className="block text-xs font-medium text-[#6B7280] mb-1.5">
                    Postal Code
                  </label>
                  <input
                    id="ship-postal"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-sm text-[#1A1A1A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                  className="w-4 h-4 accent-[#FF6B35]"
                />
                Save this address to my profile for future orders
              </label>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold cursor-pointer"
                >
                  Continue to Payment
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2Next} className="space-y-5">
              <h2 className="font-display text-lg font-bold text-[#1A1A1A]">
                Select Payment Method
              </h2>

              <div className="space-y-3">
                {settings.cod_enabled && (
                  <label
                    className={cn(
                      'flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-colors',
                      paymentMethod === 'cod'
                        ? 'border-[#FF6B35] bg-[#FFF0EA]/50'
                        : 'border-[#E8E8E8] hover:border-[#9CA3AF]'
                    )}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="mt-1 accent-[#FF6B35]"
                    />
                    <Banknote className="w-5 h-5 text-[#FF6B35] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">
                        Cash on Delivery (COD)
                      </p>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        Pay in PKR cash to the courier upon delivery anywhere in Pakistan.
                      </p>
                    </div>
                  </label>
                )}

                <label
                  className={cn(
                    'flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-colors',
                    paymentMethod === 'jazzcash'
                      ? 'border-[#FF6B35] bg-[#FFF0EA]/50'
                      : 'border-[#E8E8E8] hover:border-[#9CA3AF]'
                  )}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    checked={paymentMethod === 'jazzcash'}
                    onChange={() => setPaymentMethod('jazzcash')}
                    className="mt-1 accent-[#FF6B35]"
                  />
                  <Smartphone className="w-5 h-5 text-[#FF6B35] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1A1A1A]">JazzCash Wallet Transfer</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Send {formatPrice(total)} to JazzCash Account{' '}
                      <span className="font-mono font-semibold text-[#1A1A1A]">03XX-XXXXXXX</span>{' '}
                      (Title: Zyro Mall). You may attach a screenshot below (optional).
                    </p>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-colors',
                    paymentMethod === 'easypaisa'
                      ? 'border-[#FF6B35] bg-[#FFF0EA]/50'
                      : 'border-[#E8E8E8] hover:border-[#9CA3AF]'
                  )}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    checked={paymentMethod === 'easypaisa'}
                    onChange={() => setPaymentMethod('easypaisa')}
                    className="mt-1 accent-[#FF6B35]"
                  />
                  <Smartphone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1A1A1A]">EasyPaisa Wallet Transfer</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Send {formatPrice(total)} to EasyPaisa Account{' '}
                      <span className="font-mono font-semibold text-[#1A1A1A]">03XX-XXXXXXX</span>{' '}
                      (Title: Zyro Mall). You may attach a screenshot below (optional).
                    </p>
                  </div>
                </label>
              </div>

              {(paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa') && (
                <div className="p-4 rounded-xl bg-[#F8F8F8] border border-[#E8E8E8] space-y-3">
                  <label
                    htmlFor="payment-proof"
                    className="block text-xs font-semibold text-[#1A1A1A]"
                  >
                    Upload payment screenshot (optional)
                  </label>
                  <label
                    htmlFor="payment-proof"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-[#9CA3AF] bg-white cursor-pointer hover:border-[#FF6B35]"
                  >
                    <Upload className="w-4 h-4 text-[#FF6B35]" />
                    <span className="text-xs text-[#6B7280]">
                      {uploadingProof
                        ? 'Uploading receipt...'
                        : paymentProofName || 'Choose JPG, PNG, or PDF screenshot...'}
                    </span>
                    <input
                      id="payment-proof"
                      type="file"
                      accept="image/*,.pdf"
                      disabled={uploadingProof}
                      onChange={handleProofUpload}
                      className="sr-only"
                    />
                  </label>
                  {paymentProofUrl && paymentProofUrl.startsWith('data:image') && (
                    <img
                      src={paymentProofUrl}
                      alt="Uploaded payment receipt preview"
                      className="h-20 w-auto rounded-lg border border-[#E8E8E8] object-contain bg-white"
                    />
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-lg border border-[#E8E8E8] text-sm font-semibold text-[#1A1A1A] hover:bg-[#F8F8F8] cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={uploadingProof}
                  className="px-6 py-3 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {uploadingProof ? 'Uploading...' : 'Review Order'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="font-display text-lg font-bold text-[#1A1A1A]">Review &amp; Place Order</h2>

              <div className="grid sm:grid-cols-2 gap-4 bg-[#F8F8F8] border border-[#E8E8E8] rounded-xl p-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-[#6B7280] mb-1">Shipping To</p>
                  <p className="font-semibold text-[#1A1A1A]">{fullName}</p>
                  <p className="text-[#6B7280]">{phone}</p>
                  <p className="text-[#6B7280]">
                    {addressLine1}, {area ? `${area}, ` : ''}
                    {city} {postalCode}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#6B7280] mb-1">Payment Method</p>
                  <p className="font-semibold text-[#1A1A1A] uppercase">{paymentMethod}</p>
                  {paymentProofName && (
                    <p className="text-xs text-emerald-700 mt-1 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Receipt attached: {paymentProofName}
                    </p>
                  )}
                </div>
              </div>

              <div className="divide-y divide-[#E8E8E8] border border-[#E8E8E8] rounded-xl">
                {items.map((item) => {
                  const p = item.product!;
                  const price = getEffectivePrice(p, item.variant?.price_modifier ?? 0);
                  return (
                    <div key={item.id} className="p-3.5 flex items-center gap-3.5">
                      <SafeImage
                        src={p.images[0]}
                        alt={p.title}
                        className="w-14 h-12 rounded-md shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1A1A1A] truncate">{p.title}</p>
                        <p className="text-xs text-[#6B7280]">
                          Qty: {item.quantity}
                          {item.variant ? ` · ${item.variant.variant_value}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-[#1A1A1A] tabular-nums">
                        {formatPrice(price * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-lg border border-[#E8E8E8] text-sm font-semibold text-[#1A1A1A] hover:bg-[#F8F8F8] cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={placingOrder}
                  onClick={handlePlaceOrder}
                  className="px-7 py-3 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {placingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {placingOrder ? 'Placing Order...' : `Place Order (${formatPrice(total)})`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Order Totals */}
        <aside className="lg:col-span-4 bg-white border border-[#E8E8E8] rounded-xl p-6 space-y-4 sticky top-24">
          <h2 className="font-display text-lg font-bold text-[#1A1A1A]">Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[#6B7280]">
              <span>Items ({items.reduce((s, i) => s + i.quantity, 0)})</span>
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
                <span>Coupon ({appliedCoupon?.code})</span>
                <span className="tabular-nums font-medium">-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-[#E8E8E8] text-base font-bold text-[#1A1A1A]">
              <span>Grand Total</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
