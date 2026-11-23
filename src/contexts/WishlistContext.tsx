import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiRequest } from '../services/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Product, ProductVariant, WishlistItem } from '../types';

interface WishlistContextValue {
  items: WishlistItem[];
  isLoading: boolean;
  wishlistCount: number;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

async function fetchSupabaseWishlist(userId: string): Promise<WishlistItem[]> {
  const { data: rawItems, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const safeRawItems = Array.isArray(rawItems) ? rawItems : [];
  if (safeRawItems.length === 0) return [];

  const productIds = Array.from(new Set(safeRawItems.map((i) => String(i.product_id))));
  const [productsRes, variantsRes] = await Promise.all([
    supabase.from('products').select('*').in('id', productIds),
    supabase.from('product_variants').select('*').in('product_id', productIds),
  ]);

  const variantsByProduct = new Map<string, ProductVariant[]>();
  const varList = Array.isArray(variantsRes.data) ? variantsRes.data : [];
  for (const v of varList) {
    const pid = String(v.product_id);
    const list = variantsByProduct.get(pid) ?? [];
    list.push({
      ...(v as ProductVariant),
      price_modifier: Number(v.price_modifier) || 0,
      stock_quantity: Number(v.stock_quantity) || 0,
    });
    variantsByProduct.set(pid, list);
  }

  const prodList = Array.isArray(productsRes.data) ? productsRes.data : [];
  const prodMap = new Map(
    prodList.map((p) => [
      String(p.id),
      {
        ...(p as Product),
        price: Number(p.price),
        sale_price: p.sale_price !== null ? Number(p.sale_price) : null,
        stock_quantity: Number(p.stock_quantity),
        images: Array.isArray(p.images) ? p.images : [],
        variants: variantsByProduct.get(String(p.id)) ?? [],
      } as Product,
    ])
  );

  return safeRawItems
    .map((wi) => {
      const product = prodMap.get(String(wi.product_id));
      if (!product || product.is_deleted) return null;
      return {
        id: String(wi.id),
        user_id: String(wi.user_id),
        product_id: String(wi.product_id),
        created_at: String(wi.created_at),
        product,
      } as WishlistItem;
    })
    .filter((item): item is WishlistItem => item !== null);
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const safeItems = Array.isArray(items) ? items : [];

  const refreshWishlist = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = isSupabaseConfigured
        ? await fetchSupabaseWishlist(user.id)
        : await apiRequest<WishlistItem[]>('/api/wishlist');
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const isWishlisted = useCallback(
    (productId: string) => safeItems.some((i) => i.product_id === productId),
    [safeItems]
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      if (isSupabaseConfigured && user) {
        const { error } = await supabase
          .from('wishlist_items')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
        if (error) throw new Error(error.message);
      } else {
        await apiRequest(`/api/wishlist/${encodeURIComponent(productId)}`, {
          method: 'DELETE',
        });
      }
      await refreshWishlist();
    },
    [refreshWishlist, user]
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!user) {
        toast.error('Please login to save items to your wishlist.');
        navigate('/login', {
          state: { from: window.location.pathname + window.location.search },
        });
        return;
      }
      if (isWishlisted(productId)) {
        await removeFromWishlist(productId);
        toast.success('Removed from wishlist');
      } else {
        if (isSupabaseConfigured) {
          const { error } = await supabase.from('wishlist_items').upsert(
            {
              user_id: user.id,
              product_id: productId,
            },
            { onConflict: 'user_id,product_id' }
          );
          if (error) throw new Error(error.message);
        } else {
          await apiRequest('/api/wishlist', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId }),
          });
        }
        await refreshWishlist();
        toast.success('Saved to wishlist');
      }
    },
    [user, navigate, isWishlisted, removeFromWishlist, refreshWishlist]
  );

  return (
    <WishlistContext.Provider
      value={{
        items: safeItems,
        isLoading,
        wishlistCount: safeItems.length,
        isWishlisted,
        toggleWishlist,
        removeFromWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
}
