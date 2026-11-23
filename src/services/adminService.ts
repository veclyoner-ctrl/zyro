import { apiRequest } from './api';
import {
  evaluateCatalogDataQuality,
  slugify,
  type DataQualityReport,
} from '../lib/commerce';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getStoreSettings } from './productService';
import type {
  Address,
  Banner,
  Business,
  Category,
  Coupon,
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  Product,
  ProductStatus,
  ProductVariant,
  Profile,
  Review,
  StoreSettings,
} from '../types';

export interface AdminOverviewData {
  stats: {
    totalRevenue: number;
    todaySales?: number;
    weekSales?: number;
    monthSales?: number;
    totalOrders: number;
    totalCustomers: number;
    pendingOrders: number;
    ordersByStatus?: Record<string, number>;
  };
  revenueChart: Array<{ date: string; revenue: number }>;
  recentOrders: Order[];
  lowStockProducts: Product[];
}

export interface AdminCustomer extends Profile {
  orders_count: number;
  total_spent: number;
}

export interface AdminReportsData {
  orders: Order[];
  statusBreakdown: Array<{ name: string; value: number }>;
  bestSellers: Array<{ product_title: string; units: number; revenue: number }>;
  revenueSeries: Array<{ date: string; revenue: number }>;
}

export interface AdminDataQualityData extends DataQualityReport {
  storeReadiness: {
    hasWhatsappNumber: boolean;
    hasAdminPoster: boolean;
    activeBannersCount: number;
  };
}

async function fetchSupabaseAdminProducts(): Promise<Product[]> {
  const [prodsRes, catsRes, bizRes, varsRes] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('id, name, slug'),
    supabase.from('businesses').select('id, name'),
    supabase.from('product_variants').select('*'),
  ]);
  if (prodsRes.error) throw new Error(prodsRes.error.message);

  const catMap = new Map(
    (catsRes.data ?? []).map((c) => [String(c.id), { name: String(c.name), slug: String(c.slug) }])
  );
  const bizMap = new Map((bizRes.data ?? []).map((b) => [String(b.id), String(b.name)]));
  const varsByProduct = new Map<string, ProductVariant[]>();
  for (const v of varsRes.data ?? []) {
    const pid = String(v.product_id);
    const list = varsByProduct.get(pid) ?? [];
    list.push({
      ...(v as ProductVariant),
      price_modifier: Number(v.price_modifier) || 0,
      stock_quantity: Number(v.stock_quantity) || 0,
    });
    varsByProduct.set(pid, list);
  }

  return (prodsRes.data ?? []).map((p) => {
    const cat = p.category_id ? catMap.get(String(p.category_id)) : undefined;
    return {
      ...(p as Product),
      price: Number(p.price),
      sale_price: p.sale_price !== null && p.sale_price !== undefined ? Number(p.sale_price) : null,
      stock_quantity: Number(p.stock_quantity),
      images: Array.isArray(p.images) ? p.images : [],
      category_name: cat?.name,
      category_slug: cat?.slug,
      business_name: p.business_id ? bizMap.get(String(p.business_id)) : undefined,
      variants: varsByProduct.get(String(p.id)) ?? [],
    };
  });
}

async function fetchSupabaseAdminOrders(): Promise<Order[]> {
  const [ordersRes, itemsRes] = await Promise.all([
    supabase.from('orders').select('*').order('created_at', { ascending: false }),
    supabase.from('order_items').select('*'),
  ]);
  if (ordersRes.error) throw new Error(ordersRes.error.message);

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const it of (itemsRes.data ?? []) as OrderItem[]) {
    const list = itemsByOrder.get(String(it.order_id)) ?? [];
    list.push({
      ...it,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      total_price: Number(it.total_price),
    });
    itemsByOrder.set(String(it.order_id), list);
  }

  return (ordersRes.data ?? []).map((o) => ({
    ...(o as Order),
    subtotal: Number(o.subtotal),
    shipping_cost: Number(o.shipping_cost),
    discount_amount: Number(o.discount_amount),
    total: Number(o.total),
    items: itemsByOrder.get(String(o.id)) ?? [],
  }));
}

function buildRevenueSeries(orders: Order[], days = 30): Array<{ date: string; revenue: number }> {
  const map = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    const key = o.created_at.slice(0, 10);
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + Number(o.total));
    }
  }
  return Array.from(map.entries()).map(([date, revenue]) => ({ date, revenue }));
}

export const adminService = {
  getOverview: async (): Promise<AdminOverviewData> => {
    if (!isSupabaseConfigured) return apiRequest<AdminOverviewData>('/api/admin/overview');

    const [orders, products, profilesRes, settings] = await Promise.all([
      fetchSupabaseAdminOrders(),
      fetchSupabaseAdminProducts(),
      supabase.from('profiles').select('id').eq('role', 'customer'),
      getStoreSettings(),
    ]);

    const nonCancelled = orders.filter((o) => o.status !== 'cancelled');
    const now = Date.now();
    const todayKey = new Date().toISOString().slice(0, 10);
    const weekAgo = now - 7 * 86400000;
    const monthAgo = now - 30 * 86400000;

    const ordersByStatus: Record<string, number> = {};
    for (const o of orders) {
      ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
    }

    return {
      stats: {
        totalRevenue: nonCancelled.reduce((s, o) => s + o.total, 0),
        todaySales: nonCancelled
          .filter((o) => o.created_at.slice(0, 10) === todayKey)
          .reduce((s, o) => s + o.total, 0),
        weekSales: nonCancelled
          .filter((o) => new Date(o.created_at).getTime() >= weekAgo)
          .reduce((s, o) => s + o.total, 0),
        monthSales: nonCancelled
          .filter((o) => new Date(o.created_at).getTime() >= monthAgo)
          .reduce((s, o) => s + o.total, 0),
        totalOrders: orders.length,
        totalCustomers: profilesRes.data?.length ?? 0,
        pendingOrders: orders.filter((o) => o.status === 'pending').length,
        ordersByStatus,
      },
      revenueChart: buildRevenueSeries(orders, 30),
      recentOrders: orders.slice(0, 8),
      lowStockProducts: products
        .filter((p) => p.stock_quantity <= settings.low_stock_threshold)
        .slice(0, 8),
    };
  },

  getProducts: async (): Promise<Product[]> => {
    if (!isSupabaseConfigured) return apiRequest<Product[]>('/api/admin/products');
    return fetchSupabaseAdminProducts();
  },

  createProduct: async (data: Partial<Product>): Promise<Product> => {
    if (!isSupabaseConfigured) {
      return apiRequest<Product>('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }

    const baseSlug = slugify(data.title || data.sku || `product-${Date.now()}`);
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    const { variants = [], ...rest } = data;
    const { data: created, error } = await supabase
      .from('products')
      .insert({
        title: rest.title,
        slug,
        description: rest.description ?? '',
        sku: rest.sku,
        category_id: rest.category_id ?? null,
        business_id: rest.business_id ?? null,
        price: Number(rest.price),
        sale_price: rest.sale_price ?? null,
        stock_quantity: Number(rest.stock_quantity ?? 0),
        images: rest.images ?? [],
        status: rest.status ?? 'active',
        is_deleted: false,
        is_featured: Boolean(rest.is_featured),
      })
      .select('*')
      .single();
    if (error || !created) throw new Error(error?.message || 'Unable to create product.');

    if (variants.length > 0) {
      await supabase.from('product_variants').insert(
        variants.map((v) => ({
          product_id: created.id,
          variant_name: v.variant_name,
          variant_value: v.variant_value,
          price_modifier: Number(v.price_modifier) || 0,
          stock_quantity: Number(v.stock_quantity) || 0,
          sku: v.sku ?? null,
        }))
      );
    }

    const list = await fetchSupabaseAdminProducts();
    return list.find((p) => p.id === created.id) ?? (created as Product);
  },

  updateProduct: async (id: string, data: Partial<Product>): Promise<Product> => {
    if (!isSupabaseConfigured) {
      return apiRequest<Product>(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }

    const { variants, ...rest } = data;
    const patch: Record<string, unknown> = {};
    if (rest.title !== undefined) patch.title = rest.title;
    if (rest.description !== undefined) patch.description = rest.description;
    if (rest.sku !== undefined) patch.sku = rest.sku;
    if (rest.category_id !== undefined) patch.category_id = rest.category_id;
    if (rest.business_id !== undefined) patch.business_id = rest.business_id;
    if (rest.price !== undefined) patch.price = Number(rest.price);
    if (rest.sale_price !== undefined) patch.sale_price = rest.sale_price;
    if (rest.stock_quantity !== undefined) patch.stock_quantity = Number(rest.stock_quantity);
    if (rest.images !== undefined) patch.images = rest.images;
    if (rest.status !== undefined) patch.status = rest.status;
    if (rest.is_featured !== undefined) patch.is_featured = Boolean(rest.is_featured);

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('products').update(patch).eq('id', id);
      if (error) throw new Error(error.message);
    }

    if (variants !== undefined) {
      await supabase.from('product_variants').delete().eq('product_id', id);
      if (variants.length > 0) {
        await supabase.from('product_variants').insert(
          variants.map((v) => ({
            product_id: id,
            variant_name: v.variant_name,
            variant_value: v.variant_value,
            price_modifier: Number(v.price_modifier) || 0,
            stock_quantity: Number(v.stock_quantity) || 0,
            sku: v.sku ?? null,
          }))
        );
      }
    }

    const list = await fetchSupabaseAdminProducts();
    const updated = list.find((p) => p.id === id);
    if (!updated) throw new Error('Product not found');
    return updated;
  },

  bulkUpdateProductStatus: async (ids: string[], status: ProductStatus): Promise<{ ok: boolean }> => {
    if (!isSupabaseConfigured) {
      return apiRequest<{ ok: boolean }>('/api/admin/products/bulk-status', {
        method: 'POST',
        body: JSON.stringify({ ids, status }),
      });
    }
    const { error } = await supabase.from('products').update({ status }).in('id', ids);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  deleteProduct: async (id: string): Promise<{ ok: boolean }> => {
    if (!isSupabaseConfigured) {
      return apiRequest<{ ok: boolean }>(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    }
    const { error } = await supabase.from('products').update({ is_deleted: true }).eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  getCategories: async (): Promise<Category[]> => {
    if (!isSupabaseConfigured) return apiRequest<Category[]>('/api/admin/categories');
    const [catsRes, prodsRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('products').select('category_id').eq('is_deleted', false),
    ]);
    if (catsRes.error) throw new Error(catsRes.error.message);
    const counts = new Map<string, number>();
    for (const p of prodsRes.data ?? []) {
      if (p.category_id) counts.set(String(p.category_id), (counts.get(String(p.category_id)) ?? 0) + 1);
    }
    return ((catsRes.data ?? []) as Category[]).map((c) => ({
      ...c,
      product_count: counts.get(c.id) ?? 0,
    }));
  },

  createCategory: async (data: Partial<Category>): Promise<Category> => {
    if (!isSupabaseConfigured) {
      return apiRequest<Category>('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
    const { data: created, error } = await supabase
      .from('categories')
      .insert({
        name: data.name,
        slug: data.slug || slugify(data.name || `cat-${Date.now()}`),
        parent_id: data.parent_id ?? null,
        image_url: data.image_url ?? null,
        is_active: data.is_active ?? true,
        sort_order: Number(data.sort_order ?? 0),
      })
      .select('*')
      .single();
    if (error || !created) throw new Error(error?.message || 'Unable to create category');
    return created as Category;
  },

  updateCategory: async (id: string, data: Partial<Category>): Promise<Category> => {
    if (!isSupabaseConfigured) {
      return apiRequest<Category>(`/api/admin/categories/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }
    const { data: updated, error } = await supabase
      .from('categories')
      .update(data)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !updated) throw new Error(error?.message || 'Unable to update category');
    return updated as Category;
  },

  deleteCategory: async (id: string): Promise<{ ok: boolean }> => {
    if (!isSupabaseConfigured) {
      return apiRequest<{ ok: boolean }>(`/api/admin/categories/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    }
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  getOrders: async (): Promise<Order[]> => {
    if (!isSupabaseConfigured) return apiRequest<Order[]>('/api/admin/orders');
    return fetchSupabaseAdminOrders();
  },

  updateOrder: async (
    id: string,
    data: {
      status?: OrderStatus;
      payment_status?: PaymentStatus;
      tracking_number?: string | null;
      admin_notes?: string | null;
      cancel_reason?: string | null;
    }
  ): Promise<Order> => {
    if (!isSupabaseConfigured) {
      return apiRequest<Order>(`/api/admin/orders/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }
    const { error } = await supabase.from('orders').update(data).eq('id', id);
    if (error) throw new Error(error.message);
    const all = await fetchSupabaseAdminOrders();
    const updated = all.find((o) => o.id === id);
    if (!updated) throw new Error('Order not found');
    return updated;
  },

  getCustomers: async (): Promise<AdminCustomer[]> => {
    if (!isSupabaseConfigured) return apiRequest<AdminCustomer[]>('/api/admin/customers');
    const [profilesRes, orders] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      fetchSupabaseAdminOrders(),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);

    return ((profilesRes.data ?? []) as Profile[])
      .filter((p) => p.role !== 'admin')
      .map((p) => {
        const custOrders = orders.filter((o) => o.user_id === p.id);
        return {
          ...p,
          orders_count: custOrders.length,
          total_spent: custOrders
            .filter((o) => o.status !== 'cancelled')
            .reduce((s, o) => s + o.total, 0),
        };
      });
  },

  getCustomerDetail: async (
    id: string
  ): Promise<{ customer: AdminCustomer; addresses: Address[]; orders: Order[] }> => {
    if (!isSupabaseConfigured) {
      return apiRequest<{ customer: AdminCustomer; addresses: Address[]; orders: Order[] }>(
        `/api/admin/customers/${encodeURIComponent(id)}`
      );
    }
    const [customers, addrRes, orders] = await Promise.all([
      adminService.getCustomers(),
      supabase.from('addresses').select('*').eq('user_id', id),
      fetchSupabaseAdminOrders(),
    ]);
    const customer = customers.find((c) => c.id === id);
    if (!customer) throw new Error('Customer not found');
    return {
      customer,
      addresses: (addrRes.data ?? []) as Address[],
      orders: orders.filter((o) => o.user_id === id),
    };
  },

  toggleCustomerBlock: async (id: string, is_blocked: boolean): Promise<Profile> => {
    if (!isSupabaseConfigured) {
      return apiRequest<Profile>(`/api/admin/customers/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_blocked }),
      });
    }
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_blocked })
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Unable to update customer');
    return data as Profile;
  },

  getCoupons: async (): Promise<Coupon[]> => {
    if (!isSupabaseConfigured) return apiRequest<Coupon[]>('/api/admin/coupons');
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Coupon[]).map((c) => ({
      ...c,
      value: Number(c.value),
      min_order_amount: Number(c.min_order_amount),
      used_count: Number(c.used_count),
    }));
  },

  createCoupon: async (data: Partial<Coupon>): Promise<Coupon> => {
    if (!isSupabaseConfigured) {
      return apiRequest<Coupon>('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
    const { data: created, error } = await supabase
      .from('coupons')
      .insert({
        code: String(data.code || '').trim().toUpperCase(),
        type: data.type || 'percentage',
        value: Number(data.value),
        min_order_amount: Number(data.min_order_amount ?? 0),
        max_uses: data.max_uses ?? null,
        expires_at: data.expires_at ?? null,
        is_active: data.is_active ?? true,
      })
      .select('*')
      .single();
    if (error || !created) throw new Error(error?.message || 'Unable to create coupon');
    return created as Coupon;
  },

  updateCoupon: async (id: string, data: Partial<Coupon>): Promise<Coupon> => {
    if (!isSupabaseConfigured) {
      return apiRequest<Coupon>(`/api/admin/coupons/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }
    const { data: updated, error } = await supabase
      .from('coupons')
      .update({
        ...data,
        ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error || !updated) throw new Error(error?.message || 'Unable to update coupon');
    return updated as Coupon;
  },

  toggleCoupon: async (id: string, is_active: boolean): Promise<Coupon> => {
    return adminService.updateCoupon(id, { is_active });
  },

  getReviews: async (): Promise<Review[]> => {
    if (!isSupabaseConfigured) return apiRequest<Review[]>('/api/admin/reviews');
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Review[];
  },

  moderateReview: async (id: string, is_approved: boolean): Promise<Review> => {
    if (!isSupabaseConfigured) {
      return apiRequest<Review>(`/api/admin/reviews/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_approved }),
      });
    }
    const { data, error } = await supabase
      .from('reviews')
      .update({ is_approved })
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Unable to moderate review');
    return data as Review;
  },

  deleteReview: async (id: string): Promise<{ ok: boolean }> => {
    if (!isSupabaseConfigured) {
      return apiRequest<{ ok: boolean }>(`/api/admin/reviews/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    }
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  getBanners: async (): Promise<Banner[]> => {
    if (!isSupabaseConfigured) return apiRequest<Banner[]>('/api/admin/banners');
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Banner[];
  },

  createBanner: async (data: Partial<Banner>): Promise<Banner> => {
    if (!isSupabaseConfigured) {
      return apiRequest<Banner>('/api/admin/banners', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
    const { data: created, error } = await supabase
      .from('banners')
      .insert({
        title: data.title ?? '',
        subtitle: data.subtitle ?? '',
        image_url: data.image_url ?? '',
        link_url: data.link_url ?? '/products',
        type: data.type ?? 'hero',
        sort_order: Number(data.sort_order ?? 0),
        is_active: data.is_active ?? true,
      })
      .select('*')
      .single();
    if (error || !created) throw new Error(error?.message || 'Unable to create banner');
    return created as Banner;
  },

  updateBanner: async (id: string, data: Partial<Banner>): Promise<Banner> => {
    if (!isSupabaseConfigured) {
      return apiRequest<Banner>(`/api/admin/banners/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }
    const { data: updated, error } = await supabase
      .from('banners')
      .update(data)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !updated) throw new Error(error?.message || 'Unable to update banner');
    return updated as Banner;
  },

  deleteBanner: async (id: string): Promise<{ ok: boolean }> => {
    if (!isSupabaseConfigured) {
      return apiRequest<{ ok: boolean }>(`/api/admin/banners/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    }
    const { error } = await supabase.from('banners').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  updateSettings: async (data: Partial<StoreSettings>): Promise<StoreSettings> => {
    if (!isSupabaseConfigured) {
      return apiRequest<StoreSettings>('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }
    const current = await getStoreSettings();
    const merged = { ...current, ...data, id: 1, updated_at: new Date().toISOString() };
    const { data: updated, error } = await supabase
      .from('store_settings')
      .upsert(merged, { onConflict: 'id' })
      .select('*')
      .single();
    if (error || !updated) throw new Error(error?.message || 'Unable to update settings');
    return updated as StoreSettings;
  },

  getBusinesses: async (): Promise<Business[]> => {
    if (!isSupabaseConfigured) return apiRequest<Business[]>('/api/admin/businesses');
    const [bizRes, catsRes, prodsRes] = await Promise.all([
      supabase.from('businesses').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name'),
      supabase.from('products').select('business_id').eq('is_deleted', false),
    ]);
    if (bizRes.error) throw new Error(bizRes.error.message);
    const catMap = new Map((catsRes.data ?? []).map((c) => [String(c.id), String(c.name)]));
    const counts = new Map<string, number>();
    for (const p of prodsRes.data ?? []) {
      if (p.business_id) counts.set(String(p.business_id), (counts.get(String(p.business_id)) ?? 0) + 1);
    }
    return ((bizRes.data ?? []) as Business[]).map((b) => ({
      ...b,
      category_name: b.category_id ? catMap.get(b.category_id) : undefined,
      product_count: counts.get(b.id) ?? 0,
    }));
  },

  createBusiness: async (data: Partial<Business>): Promise<Business> => {
    if (!isSupabaseConfigured) {
      return apiRequest<Business>('/api/admin/businesses', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
    const { data: created, error } = await supabase
      .from('businesses')
      .insert({
        name: data.name,
        slug: data.slug || slugify(data.name || `biz-${Date.now()}`),
        category_id: data.category_id ?? null,
        city: data.city ?? 'Lahore',
        whatsapp_number: data.whatsapp_number ?? '03296730804',
        tagline: data.tagline ?? '',
        description: data.description ?? '',
        details: data.details ?? '',
        image_url: data.image_url ?? '',
        is_active: data.is_active ?? true,
      })
      .select('*')
      .single();
    if (error || !created) throw new Error(error?.message || 'Unable to create business');
    return created as Business;
  },

  updateBusiness: async (id: string, data: Partial<Business>): Promise<Business> => {
    if (!isSupabaseConfigured) {
      return apiRequest<Business>(`/api/admin/businesses/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }
    const { data: updated, error } = await supabase
      .from('businesses')
      .update(data)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !updated) throw new Error(error?.message || 'Unable to update business');
    return updated as Business;
  },

  deleteBusiness: async (id: string): Promise<{ ok: boolean }> => {
    if (!isSupabaseConfigured) {
      return apiRequest<{ ok: boolean }>(`/api/admin/businesses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    }
    const { error } = await supabase.from('businesses').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  getDataQuality: async (): Promise<AdminDataQualityData> => {
    if (!isSupabaseConfigured) return apiRequest<AdminDataQualityData>('/api/admin/data-quality');
    const [products, categories, businesses, banners, settings] = await Promise.all([
      fetchSupabaseAdminProducts(),
      adminService.getCategories(),
      adminService.getBusinesses(),
      adminService.getBanners(),
      getStoreSettings(),
    ]);
    const report = evaluateCatalogDataQuality(
      products,
      categories,
      businesses,
      settings.low_stock_threshold
    );
    return {
      ...report,
      storeReadiness: {
        hasWhatsappNumber: Boolean(settings.whatsapp_number?.trim()),
        hasAdminPoster: Boolean(settings.admin_poster_enabled && settings.admin_poster_image_url),
        activeBannersCount: banners.filter((b) => b.is_active).length,
      },
    };
  },

  getReports: async (from?: string, to?: string): Promise<AdminReportsData> => {
    if (!isSupabaseConfigured) {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return apiRequest<AdminReportsData>(`/api/admin/reports${qs ? `?${qs}` : ''}`);
    }

    const allOrders = await fetchSupabaseAdminOrders();
    const filtered = allOrders.filter((o) => {
      const day = o.created_at.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });

    const statusMap = new Map<string, number>();
    const sellerMap = new Map<string, { units: number; revenue: number }>();

    for (const o of filtered) {
      statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);
      if (o.status === 'cancelled') continue;
      for (const item of o.items ?? []) {
        const prev = sellerMap.get(item.product_title) ?? { units: 0, revenue: 0 };
        prev.units += item.quantity;
        prev.revenue += item.total_price;
        sellerMap.set(item.product_title, prev);
      }
    }

    return {
      orders: filtered,
      statusBreakdown: Array.from(statusMap.entries()).map(([name, value]) => ({ name, value })),
      bestSellers: Array.from(sellerMap.entries())
        .map(([product_title, vals]) => ({ product_title, ...vals }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      revenueSeries: buildRevenueSeries(filtered, 30),
    };
  },
};
