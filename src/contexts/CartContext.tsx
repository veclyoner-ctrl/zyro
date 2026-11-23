import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { apiRequest } from '../services/api';
import { getStoreSettings } from '../services/productService';
import { validateCoupon } from '../services/orderService';
import { calculateCartTotals, getEffectivePrice } from '../lib/commerce';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { APP_NAME, FLAT_SHIPPING_COST, FREE_SHIPPING_THRESHOLD } from '../lib/utils';
import type { CartItem, Coupon, Product, ProductVariant, StoreSettings } from '../types';

interface CartContextValue {
  items: CartItem[];
  isLoading: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  cartCount: number;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  settings: StoreSettings;
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => void;
  addToCart: (
    productId: string,
    quantity?: number,
    variantId?: string | null,
    options?: { openDrawer?: boolean }
  ) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  id: 1,
  store_name: APP_NAME,
  store_logo_url: null,
  contact_email: 'support@zyromall.pk',
  contact_phone: '0329-6730804',
  flat_shipping_cost: FLAT_SHIPPING_COST,
  free_shipping_threshold: FREE_SHIPPING_THRESHOLD,
  cod_enabled: true,
  low_stock_threshold: 5,
  maintenance_mode: false,
  whatsapp_number: '03296730804',
  admin_poster_enabled: true,
  admin_poster_title: `${APP_NAME} Official Storefront & Campaign Poster`,
  admin_poster_subtitle:
    'Manage categories, partner businesses, data quality, discounted PKR pricing, and direct WhatsApp order booking from one unified portal.',
  admin_poster_image_url: '/src/assets/images/poster_admin_welcome_1795191692080.jpg',
  admin_poster_cta_label: 'Browse Live Storefront',
  admin_poster_cta_url: '/products',
  updated_at: '',
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

async function fetchSupabaseCartItems(userId: string): Promise<CartItem[]> {
  const { data: rawItems, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const safeRawItems = Array.isArray(rawItems) ? rawItems : [];
  if (safeRawItems.length === 0) return [];

  const productIds = Array.from(new Set(safeRawItems.map((i) => String(i.product_id))));
  const variantIds = Array.from(
    new Set(safeRawItems.map((i) => i.variant_id).filter(Boolean).map(String))
  );

  const [productsRes, variantsRes, categoriesRes] = await Promise.all([
    supabase.from('products').select('*').in('id', productIds),
    variantIds.length > 0
      ? supabase.from('product_variants').select('*').in('id', variantIds)
      : Promise.resolve({ data: [] as ProductVariant[] }),
    supabase.from('categories').select('id, name'),
  ]);

  const catList = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
  const prodList = Array.isArray(productsRes.data) ? productsRes.data : [];
  const varList = Array.isArray(variantsRes.data) ? variantsRes.data : [];

  const catMap = new Map(catList.map((c) => [String(c.id), String(c.name)]));
  const prodMap = new Map(
    prodList.map((p) => [
      String(p.id),
      {
        ...(p as Product),
        price: Number(p.price),
        sale_price: p.sale_price !== null ? Number(p.sale_price) : null,
        stock_quantity: Number(p.stock_quantity),
        images: Array.isArray(p.images) ? p.images : [],
        category_name: p.category_id ? catMap.get(String(p.category_id)) : undefined,
      } as Product,
    ])
  );
  const varMap = new Map(
    varList.map((v) => [
      String(v.id),
      {
        ...(v as ProductVariant),
        price_modifier: Number(v.price_modifier) || 0,
        stock_quantity: Number(v.stock_quantity) || 0,
      } as ProductVariant,
    ])
  );

  return safeRawItems
    .map((ci) => {
      const product = prodMap.get(String(ci.product_id));
      if (!product || product.is_deleted) return null;
      return {
        id: String(ci.id),
        user_id: String(ci.user_id),
        product_id: String(ci.product_id),
        variant_id: ci.variant_id ? String(ci.variant_id) : null,
        quantity: Number(ci.quantity),
        product,
        variant: ci.variant_id ? varMap.get(String(ci.variant_id)) ?? null : null,
      } as CartItem;
    })
    .filter((item): item is CartItem => item !== null);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  const { data: settings = DEFAULT_STORE_SETTINGS } = useQuery({
    queryKey: ['settings'],
    queryFn: getStoreSettings,
  });

  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      setAppliedCoupon(null);
      setDiscountAmount(0);
      return;
    }
    setIsLoading(true);
    try {
      const data = isSupabaseConfigured
        ? await fetchSupabaseCartItems(user.id)
        : await apiRequest<CartItem[]>('/api/cart');
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const totals = useMemo(() => {
    const lines = safeItems
      .filter((i) => i.product)
      .map((i) => ({
        unitPrice: getEffectivePrice(i.product!, i.variant?.price_modifier ?? 0),
        quantity: i.quantity,
      }));
    return calculateCartTotals(lines, settings, discountAmount);
  }, [safeItems, settings, discountAmount]);

  useEffect(() => {
    if (!appliedCoupon || !user) return;
    if (totals.subtotal <= 0) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      return;
    }
    validateCoupon(appliedCoupon.code, totals.subtotal)
      .then((res) => setDiscountAmount(res.discountAmount))
      .catch(() => {
        setAppliedCoupon(null);
        setDiscountAmount(0);
      });
  }, [totals.subtotal, appliedCoupon, user]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const addToCart = useCallback(
    async (
      productId: string,
      quantity = 1,
      variantId: string | null = null,
      options?: { openDrawer?: boolean }
    ) => {
      if (!user) {
        toast.error('Please login to add items to your cart.');
        navigate('/login', {
          state: { from: window.location.pathname + window.location.search },
        });
        return false;
      }
      try {
        if (isSupabaseConfigured) {
          const { data: product, error: prodErr } = await supabase
            .from('products')
            .select('id, stock_quantity, status, is_deleted')
            .eq('id', productId)
            .maybeSingle();

          if (prodErr || !product || product.is_deleted || product.status === 'draft') {
            throw new Error('Product is not available.');
          }
          if (Number(product.stock_quantity) <= 0 || product.status === 'out_of_stock') {
            throw new Error('This product is out of stock.');
          }

          let existingQuery = supabase
            .from('cart_items')
            .select('id, quantity')
            .eq('user_id', user.id)
            .eq('product_id', productId);

          existingQuery = variantId
            ? existingQuery.eq('variant_id', variantId)
            : existingQuery.is('variant_id', null);

          const { data: existing } = await existingQuery.maybeSingle();

          if (existing) {
            const nextQty = Math.min(
              Number(product.stock_quantity),
              Number(existing.quantity) + Math.max(1, quantity)
            );
            const { error } = await supabase
              .from('cart_items')
              .update({ quantity: nextQty })
              .eq('id', existing.id);
            if (error) throw new Error(error.message);
          } else {
            const nextQty = Math.min(Number(product.stock_quantity), Math.max(1, quantity));
            const { error } = await supabase.from('cart_items').insert({
              user_id: user.id,
              product_id: productId,
              variant_id: variantId,
              quantity: nextQty,
            });
            if (error) throw new Error(error.message);
          }
        } else {
          await apiRequest('/api/cart', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, quantity, variant_id: variantId }),
          });
        }
        await refreshCart();
        if (options?.openDrawer !== false) {
          setIsDrawerOpen(true);
        } else {
          setIsDrawerOpen(false);
        }
        toast.success('Added to cart');
        return true;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Unable to add item');
        return false;
      }
    },
    [user, navigate, refreshCart]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      try {
        if (isSupabaseConfigured) {
          if (quantity <= 0) {
            const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
            if (error) throw new Error(error.message);
          } else {
            const { error } = await supabase
              .from('cart_items')
              .update({ quantity })
              .eq('id', itemId);
            if (error) throw new Error(error.message);
          }
        } else {
          await apiRequest(`/api/cart/${encodeURIComponent(itemId)}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity }),
          });
        }
        await refreshCart();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to update quantity');
      }
    },
    [refreshCart]
  );

  const removeFromCart = useCallback(
    async (itemId: string) => {
      try {
        if (isSupabaseConfigured) {
          const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
          if (error) throw new Error(error.message);
        } else {
          await apiRequest(`/api/cart/${encodeURIComponent(itemId)}`, {
            method: 'DELETE',
          });
        }
        await refreshCart();
        toast.success('Removed from cart');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove item');
      }
    },
    [refreshCart]
  );

  const applyCoupon = useCallback(
    async (code: string) => {
      const res = await validateCoupon(code, totals.subtotal);
      setAppliedCoupon(res.coupon);
      setDiscountAmount(res.discountAmount);
      toast.success(`Coupon ${res.coupon.code} applied`);
    },
    [totals.subtotal]
  );

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
  }, []);

  const cartCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        cartCount,
        subtotal: totals.subtotal,
        shippingCost: totals.shippingCost,
        discountAmount: totals.discountAmount,
        total: totals.total,
        settings,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        addToCart,
        updateQuantity,
        removeFromCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
