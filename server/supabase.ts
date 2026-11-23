import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Address,
  Banner,
  CartItem,
  Category,
  Coupon,
  CouponUsage,
  OrderItem,
  ProductVariant,
  Review,
  StoreSettings,
  WishlistItem,
} from '../src/types';
import type { DatabaseState, StoredUser } from './store';
import {
  diffRowsById,
  extractOrderItemsFromOrders,
  extractVariantsFromProducts,
  normalizeDatabaseRowsToState,
  toOrderRow,
  toProductRow,
  type OrderRow,
  type ProductRow,
  type SupabaseTableDiff,
} from './supabaseMappers';

const ALLOWED_BUCKETS = new Set([
  'product-images',
  'banners',
  'store-assets',
  'payment-proofs',
]);

function getSupabaseCredentials(): {
  url: string;
  key: string;
} | null {
  const url = (process.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!url || url.includes('your-project')) return null;
  if (!anonKey || anonKey.includes('your-supabase')) return null;

  return {
    url,
    key: anonKey,
  };
}

let cachedClient: SupabaseClient | null = null;
let cachedClientSignature = '';

export function isSupabaseServerConfigured(): boolean {
  return getSupabaseCredentials() !== null;
}

export function getSupabaseServerClient(): SupabaseClient | null {
  const creds = getSupabaseCredentials();
  if (!creds) return null;
  const sig = `${creds.url}::${creds.key.slice(0, 12)}`;
  if (!cachedClient || cachedClientSignature !== sig) {
    cachedClient = createClient(creds.url, creds.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedClientSignature = sig;
  }
  return cachedClient;
}

async function applyDiff<T extends { id: string }>(
  client: SupabaseClient,
  table: string,
  diff: SupabaseTableDiff<T>
): Promise<void> {
  if (diff.upserts.length > 0) {
    const { error } = await client.from(table).upsert(diff.upserts, { onConflict: 'id' });
    if (error) throw new Error(`[Supabase ${table} upsert] ${error.message}`);
  }
  if (diff.deletes.length > 0) {
    const { error } = await client.from(table).delete().in('id', diff.deletes);
    if (error) throw new Error(`[Supabase ${table} delete] ${error.message}`);
  }
}

export async function seedSupabaseDatabase(
  client: SupabaseClient,
  seed: DatabaseState
): Promise<void> {
  await applyDiff(client, 'profiles', { upserts: seed.users, deletes: [] });
  await applyDiff(client, 'categories', { upserts: seed.categories, deletes: [] });
  await applyDiff(client, 'products', {
    upserts: seed.products.map(toProductRow),
    deletes: [],
  });
  await applyDiff(client, 'product_variants', {
    upserts: extractVariantsFromProducts(seed.products),
    deletes: [],
  });
  await applyDiff(client, 'addresses', { upserts: seed.addresses, deletes: [] });
  await applyDiff(client, 'coupons', { upserts: seed.coupons, deletes: [] });
  await applyDiff(client, 'orders', {
    upserts: seed.orders.map(toOrderRow),
    deletes: [],
  });
  await applyDiff(client, 'order_items', {
    upserts: extractOrderItemsFromOrders(seed.orders),
    deletes: [],
  });
  await applyDiff(client, 'coupon_usages', { upserts: seed.coupon_usages, deletes: [] });
  await applyDiff(client, 'cart_items', { upserts: seed.cart_items, deletes: [] });
  await applyDiff(client, 'wishlist_items', { upserts: seed.wishlist_items, deletes: [] });
  await applyDiff(client, 'reviews', { upserts: seed.reviews, deletes: [] });
  await applyDiff(client, 'banners', { upserts: seed.banners, deletes: [] });
  const { error: settingsErr } = await client
    .from('store_settings')
    .upsert(seed.settings, { onConflict: 'id' });
  if (settingsErr) {
    throw new Error(`[Supabase store_settings seed] ${settingsErr.message}`);
  }
}

export async function loadDatabaseFromSupabase(
  getFallbackSeed: () => DatabaseState
): Promise<{ state: DatabaseState; connected: boolean }> {
  const client = getSupabaseServerClient();
  if (!client) {
    return { state: getFallbackSeed(), connected: false };
  }

  const [
    profilesRes,
    categoriesRes,
    productsRes,
    variantsRes,
    addressesRes,
    couponsRes,
    couponUsagesRes,
    ordersRes,
    orderItemsRes,
    cartItemsRes,
    wishlistRes,
    reviewsRes,
    bannersRes,
    settingsRes,
  ] = await Promise.all([
    client.from('profiles').select('*'),
    client.from('categories').select('*'),
    client.from('products').select('*'),
    client.from('product_variants').select('*'),
    client.from('addresses').select('*'),
    client.from('coupons').select('*'),
    client.from('coupon_usages').select('*'),
    client.from('orders').select('*'),
    client.from('order_items').select('*'),
    client.from('cart_items').select('*'),
    client.from('wishlist_items').select('*'),
    client.from('reviews').select('*'),
    client.from('banners').select('*'),
    client.from('store_settings').select('*').eq('id', 1).maybeSingle(),
  ]);

  const errors = [
    profilesRes.error,
    categoriesRes.error,
    productsRes.error,
    variantsRes.error,
    addressesRes.error,
    couponsRes.error,
    couponUsagesRes.error,
    ordersRes.error,
    orderItemsRes.error,
    cartItemsRes.error,
    wishlistRes.error,
    reviewsRes.error,
    bannersRes.error,
    settingsRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(
      `Supabase schema check failed (${errors[0]?.message ?? 'unknown error'}). Run /supabase/schema.sql in your Supabase SQL Editor.`
    );
  }

  const isEmpty =
    (categoriesRes.data?.length ?? 0) === 0 &&
    (productsRes.data?.length ?? 0) === 0 &&
    !settingsRes.data;

  if (isEmpty) {
    const seed = getFallbackSeed();
    await seedSupabaseDatabase(client, seed);
    return { state: seed, connected: true };
  }

  const fallbackSettings = getFallbackSeed().settings;
  const state = normalizeDatabaseRowsToState({
    profiles: (profilesRes.data ?? []) as StoredUser[],
    categories: (categoriesRes.data ?? []) as Category[],
    products: (productsRes.data ?? []) as ProductRow[],
    product_variants: (variantsRes.data ?? []) as ProductVariant[],
    addresses: (addressesRes.data ?? []) as Address[],
    coupons: (couponsRes.data ?? []) as Coupon[],
    coupon_usages: (couponUsagesRes.data ?? []) as CouponUsage[],
    orders: (ordersRes.data ?? []) as OrderRow[],
    order_items: (orderItemsRes.data ?? []) as OrderItem[],
    cart_items: (cartItemsRes.data ?? []) as CartItem[],
    wishlist_items: (wishlistRes.data ?? []) as WishlistItem[],
    reviews: (reviewsRes.data ?? []) as Review[],
    banners: (bannersRes.data ?? []) as Banner[],
    settings: (settingsRes.data as StoreSettings | null) ?? fallbackSettings,
  });

  return { state, connected: true };
}

export async function syncStateChangesToSupabase(
  prev: DatabaseState,
  next: DatabaseState
): Promise<void> {
  const client = getSupabaseServerClient();
  if (!client) return;

  // Parent tables first for upserts; child tables first for deletes
  await applyDiff(client, 'profiles', diffRowsById(prev.users, next.users));
  await applyDiff(client, 'categories', diffRowsById(prev.categories, next.categories));
  await applyDiff(
    client,
    'products',
    diffRowsById(prev.products.map(toProductRow), next.products.map(toProductRow))
  );
  await applyDiff(
    client,
    'product_variants',
    diffRowsById(
      extractVariantsFromProducts(prev.products),
      extractVariantsFromProducts(next.products)
    )
  );
  await applyDiff(client, 'addresses', diffRowsById(prev.addresses, next.addresses));
  await applyDiff(client, 'coupons', diffRowsById(prev.coupons, next.coupons));
  await applyDiff(
    client,
    'orders',
    diffRowsById(prev.orders.map(toOrderRow), next.orders.map(toOrderRow))
  );
  await applyDiff(
    client,
    'order_items',
    diffRowsById(
      extractOrderItemsFromOrders(prev.orders),
      extractOrderItemsFromOrders(next.orders)
    )
  );
  await applyDiff(
    client,
    'coupon_usages',
    diffRowsById(prev.coupon_usages, next.coupon_usages)
  );
  await applyDiff(client, 'cart_items', diffRowsById(prev.cart_items, next.cart_items));
  await applyDiff(
    client,
    'wishlist_items',
    diffRowsById(prev.wishlist_items, next.wishlist_items)
  );
  await applyDiff(client, 'reviews', diffRowsById(prev.reviews, next.reviews));
  await applyDiff(client, 'banners', diffRowsById(prev.banners, next.banners));

  if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) {
    const { error } = await client
      .from('store_settings')
      .upsert(next.settings, { onConflict: 'id' });
    if (error) {
      throw new Error(`[Supabase store_settings upsert] ${error.message}`);
    }
  }
}

export async function syncSupabaseAuthRegistration(params: {
  email: string;
  password: string;
  full_name: string;
  phone: string;
}): Promise<string | null> {
  const creds = getSupabaseCredentials();
  if (!creds) return null;

  try {
    const authClient = createClient(creds.url, creds.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await authClient.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.full_name,
          phone: params.phone,
          role: 'customer',
        },
      },
    });
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export async function verifySupabaseAuthLogin(
  email: string,
  password: string
): Promise<{ id: string; email: string; full_name: string; phone: string } | null> {
  const creds = getSupabaseCredentials();
  if (!creds) return null;

  try {
    const authClient = createClient(creds.url, creds.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error || !data.user) return null;
    return {
      id: data.user.id,
      email: data.user.email ?? email,
      full_name: String(data.user.user_metadata?.full_name ?? ''),
      phone: String(data.user.user_metadata?.phone ?? ''),
    };
  } catch {
    return null;
  }
}

export async function sendSupabasePasswordReset(
  email: string,
  redirectTo: string
): Promise<boolean> {
  const creds = getSupabaseCredentials();
  if (!creds) return false;
  try {
    const authClient = createClient(creds.url, creds.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await authClient.auth.resetPasswordForEmail(email, { redirectTo });
    return !error;
  } catch {
    return false;
  }
}

export async function updateSupabaseAuthPassword(
  _userId: string,
  _newPassword: string
): Promise<boolean> {
  return false;
}

export async function verifySupabaseRecoveryAccessToken(
  accessToken: string
): Promise<{ id: string; email: string } | null> {
  const client = getSupabaseServerClient();
  if (!client || !accessToken) return null;
  try {
    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data.user || !data.user.email) return null;
    return { id: data.user.id, email: data.user.email };
  } catch {
    return null;
  }
}

export async function uploadAssetToSupabaseStorage(params: {
  bucket: string;
  fileName: string;
  contentType: string;
  dataUrl: string;
}): Promise<string> {
  if (!ALLOWED_BUCKETS.has(params.bucket)) {
    throw new Error('Invalid storage bucket requested.');
  }

  const client = getSupabaseServerClient();
  if (!client) {
    return params.dataUrl;
  }

  const base64Match = /^data:([^;]+);base64,(.+)$/.exec(params.dataUrl);
  if (!base64Match) {
    return params.dataUrl;
  }

  const buffer = Buffer.from(base64Match[2], 'base64');
  const safeExt = (params.fileName.split('.').pop() || 'png')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const objectPath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${safeExt || 'png'}`;

  const isPublicBucket = params.bucket !== 'payment-proofs';
  await client.storage
    .createBucket(params.bucket, { public: isPublicBucket })
    .catch(() => null);

  const { error: uploadErr } = await client.storage
    .from(params.bucket)
    .upload(objectPath, buffer, {
      contentType: params.contentType || base64Match[1] || 'image/png',
      upsert: true,
    });

  if (uploadErr) {
    throw new Error(`Supabase storage upload failed: ${uploadErr.message}`);
  }

  if (isPublicBucket) {
    const { data } = client.storage.from(params.bucket).getPublicUrl(objectPath);
    return data.publicUrl;
  }

  const { data: signedData, error: signErr } = await client.storage
    .from(params.bucket)
    .createSignedUrl(objectPath, 60 * 60 * 24 * 365);

  if (signErr || !signedData?.signedUrl) {
    return params.dataUrl;
  }

  return signedData.signedUrl;
}

export async function deleteAssetFromSupabaseStorage(
  assetUrl: string,
  bucket = 'product-images'
): Promise<boolean> {
  if (!ALLOWED_BUCKETS.has(bucket) || !assetUrl) return false;
  const client = getSupabaseServerClient();
  if (!client) return false;

  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = assetUrl.indexOf(marker);
  if (idx === -1) return false;

  const objectPath = decodeURIComponent(assetUrl.slice(idx + marker.length).split('?')[0]);
  if (!objectPath) return false;

  const { error } = await client.storage.from(bucket).remove([objectPath]);
  return !error;
}

