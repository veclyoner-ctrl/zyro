import { apiRequest } from './api';
import { getEffectivePrice } from '../lib/commerce';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { APP_NAME, FLAT_SHIPPING_COST, FREE_SHIPPING_THRESHOLD } from '../lib/utils';
import type {
  Banner,
  Business,
  Category,
  Product,
  ProductFilters,
  ProductVariant,
  Review,
  StoreSettings,
} from '../types';

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

async function hydrateSupabaseProducts(rawProducts: Array<Record<string, unknown>>): Promise<Product[]> {
  if (!Array.isArray(rawProducts) || rawProducts.length === 0) return [];
  const productIds = rawProducts.map((p) => String(p.id));

  const [catsRes, bizRes, varsRes, revRes] = await Promise.all([
    supabase.from('categories').select('id, name, slug'),
    supabase.from('businesses').select('id, name, slug'),
    supabase.from('product_variants').select('*').in('product_id', productIds),
    supabase.from('reviews').select('product_id, rating, is_approved').in('product_id', productIds),
  ]);

  const safeCats = Array.isArray(catsRes.data) ? catsRes.data : [];
  const safeBiz = Array.isArray(bizRes.data) ? bizRes.data : [];
  const safeVars = Array.isArray(varsRes.data) ? varsRes.data : [];
  const safeRevs = Array.isArray(revRes.data) ? revRes.data : [];

  const catMap = new Map(
    safeCats.map((c) => [String(c.id), { name: String(c.name), slug: String(c.slug) }])
  );
  const bizMap = new Map(
    safeBiz.map((b) => [String(b.id), String(b.name)])
  );
  const varsByProduct = new Map<string, ProductVariant[]>();
  for (const v of safeVars) {
    const pid = String(v.product_id);
    const list = varsByProduct.get(pid) ?? [];
    list.push({
      ...(v as ProductVariant),
      price_modifier: Number(v.price_modifier) || 0,
      stock_quantity: Number(v.stock_quantity) || 0,
    });
    varsByProduct.set(pid, list);
  }

  const ratingsByProduct = new Map<string, { sum: number; count: number }>();
  for (const r of safeRevs as Array<Pick<Review, 'product_id' | 'rating' | 'is_approved'>>) {
    if (!r.is_approved) continue;
    const pid = String(r.product_id);
    const curr = ratingsByProduct.get(pid) ?? { sum: 0, count: 0 };
    curr.sum += Number(r.rating) || 0;
    curr.count += 1;
    ratingsByProduct.set(pid, curr);
  }

  return rawProducts.map((row) => {
    const pid = String(row.id);
    const cat = row.category_id ? catMap.get(String(row.category_id)) : undefined;
    const bizName = row.business_id ? bizMap.get(String(row.business_id)) : undefined;
    const ratingInfo = ratingsByProduct.get(pid);
    return {
      ...(row as unknown as Product),
      price: Number(row.price),
      sale_price: row.sale_price !== null && row.sale_price !== undefined ? Number(row.sale_price) : null,
      stock_quantity: Number(row.stock_quantity),
      images: Array.isArray(row.images) ? (row.images as string[]) : [],
      category_name: cat?.name,
      category_slug: cat?.slug,
      business_name: bizName,
      variants: varsByProduct.get(pid) ?? [],
      rating_avg:
        ratingInfo && ratingInfo.count > 0
          ? Number((ratingInfo.sum / ratingInfo.count).toFixed(1))
          : 0,
      review_count: ratingInfo?.count ?? 0,
    };
  });
}

export async function getProducts(
  filters: ProductFilters = {},
  page = 1,
  perPage = 12
): Promise<ProductListResponse> {
  if (isSupabaseConfigured) {
    const [prodsRes, catsRes, bizRes] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('is_deleted', false)
        .neq('status', 'draft'),
      supabase.from('categories').select('*'),
      supabase.from('businesses').select('*'),
    ]);
    if (prodsRes.error) throw new Error(prodsRes.error.message);
    if (catsRes.error) throw new Error(catsRes.error.message);
    if (bizRes.error) throw new Error(bizRes.error.message);

    const safeProds = Array.isArray(prodsRes.data) ? prodsRes.data : [];
    const safeCats = Array.isArray(catsRes.data) ? catsRes.data : [];
    const safeBiz = Array.isArray(bizRes.data) ? bizRes.data : [];

    let list = await hydrateSupabaseProducts(safeProds as Array<Record<string, unknown>>);

    if (filters.category) {
      const catMatch = safeCats.find((c) => c.slug === filters.category || c.id === filters.category);
      list = catMatch
        ? list.filter((p) => p.category_id === catMatch.id)
        : [];
    }
    if (filters.business) {
      const bizMatch = safeBiz.find((b) => b.slug === filters.business || b.id === filters.business);
      list = bizMatch
        ? list.filter((p) => p.business_id === bizMatch.id)
        : [];
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.category_name?.toLowerCase().includes(q) ?? false) ||
          (p.business_name?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filters.minPrice !== undefined) {
      list = list.filter((p) => getEffectivePrice(p) >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      list = list.filter((p) => getEffectivePrice(p) <= filters.maxPrice!);
    }
    if (filters.minRating !== undefined && filters.minRating > 0) {
      list = list.filter((p) => (p.rating_avg ?? 0) >= filters.minRating!);
    }
    if (filters.inStockOnly) {
      list = list.filter((p) => p.stock_quantity > 0 && p.status !== 'out_of_stock');
    }

    const sort = filters.sort || 'newest';
    list.sort((a, b) => {
      if (sort === 'price_asc') return getEffectivePrice(a) - getEffectivePrice(b);
      if (sort === 'price_desc') return getEffectivePrice(b) - getEffectivePrice(a);
      if (sort === 'best_rated') return (b.rating_avg ?? 0) - (a.rating_avg ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const items = list.slice((safePage - 1) * perPage, safePage * perPage);
    return { items, total, page: safePage, perPage, totalPages };
  }

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('perPage', String(perPage));
  if (filters.category) params.set('category', filters.category);
  if (filters.business) params.set('business', filters.business);
  if (filters.search) params.set('search', filters.search);
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.minRating !== undefined && filters.minRating > 0) {
    params.set('minRating', String(filters.minRating));
  }
  if (filters.inStockOnly) params.set('inStockOnly', 'true');
  if (filters.sort) params.set('sort', filters.sort);

  const res = await apiRequest<ProductListResponse>(`/api/products?${params.toString()}`);
  return {
    items: Array.isArray(res?.items) ? res.items : [],
    total: Number(res?.total ?? 0),
    page: Number(res?.page ?? page),
    perPage: Number(res?.perPage ?? perPage),
    totalPages: Math.max(1, Number(res?.totalPages ?? 1)),
  };
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_deleted', false)
      .neq('status', 'draft')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return hydrateSupabaseProducts((Array.isArray(data) ? data : []) as Array<Record<string, unknown>>);
  }

  const res = await apiRequest<ProductListResponse>(
    `/api/products?featured=true&perPage=${limit}`
  );
  return Array.isArray(res?.items) ? res.items : [];
}

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  if (isSupabaseConfigured) {
    const res = await getProducts({ sort: 'newest' }, 1, limit);
    return Array.isArray(res?.items) ? res.items : [];
  }

  const res = await apiRequest<ProductListResponse>(
    `/api/products?sort=newest&perPage=${limit}`
  );
  return Array.isArray(res?.items) ? res.items : [];
}

export async function getProductBySlug(
  slug: string
): Promise<{ product: Product; related: Product[] }> {
  if (isSupabaseConfigured) {
    const { data: row, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_deleted', false)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error('Product not found.');

    const [product] = await hydrateSupabaseProducts([row as Record<string, unknown>]);
    let relatedQuery = supabase
      .from('products')
      .select('*')
      .eq('is_deleted', false)
      .neq('status', 'draft')
      .neq('id', product.id)
      .limit(4);
    if (product.category_id) {
      relatedQuery = relatedQuery.eq('category_id', product.category_id);
    }
    const { data: relRows, error: relErr } = await relatedQuery;
    if (relErr) throw new Error(relErr.message);
    const related = await hydrateSupabaseProducts(
      (Array.isArray(relRows) ? relRows : []) as Array<Record<string, unknown>>
    );
    return { product, related };
  }

  const res = await apiRequest<{ product: Product; related: Product[] }>(
    `/api/products/${encodeURIComponent(slug)}`
  );
  return {
    product: {
      ...res.product,
      images: Array.isArray(res?.product?.images) ? res.product.images : [],
      variants: Array.isArray(res?.product?.variants) ? res.product.variants : [],
    },
    related: Array.isArray(res?.related) ? res.related : [],
  };
}

export async function getCategories(): Promise<Category[]> {
  if (isSupabaseConfigured) {
    const [catsRes, prodsRes] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('products')
        .select('category_id')
        .eq('is_deleted', false)
        .neq('status', 'draft'),
    ]);
    if (catsRes.error) throw new Error(catsRes.error.message);
    if (prodsRes.error) throw new Error(prodsRes.error.message);
    const counts = new Map<string, number>();
    const safeProds = Array.isArray(prodsRes.data) ? prodsRes.data : [];
    for (const p of safeProds) {
      if (p.category_id) {
        counts.set(String(p.category_id), (counts.get(String(p.category_id)) ?? 0) + 1);
      }
    }
    const safeCats = Array.isArray(catsRes.data) ? (catsRes.data as Category[]) : [];
    return safeCats.map((c) => ({
      ...c,
      product_count: counts.get(c.id) ?? 0,
    }));
  }

  const data = await apiRequest<Category[]>('/api/categories');
  return Array.isArray(data) ? data : [];
}

export async function getBusinesses(): Promise<Business[]> {
  if (isSupabaseConfigured) {
    const [bizRes, catsRes, prodsRes] = await Promise.all([
      supabase
        .from('businesses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name'),
      supabase
        .from('products')
        .select('business_id')
        .eq('is_deleted', false)
        .neq('status', 'draft'),
    ]);
    if (bizRes.error) throw new Error(bizRes.error.message);
    if (catsRes.error) throw new Error(catsRes.error.message);
    if (prodsRes.error) throw new Error(prodsRes.error.message);
    const safeCats = Array.isArray(catsRes.data) ? catsRes.data : [];
    const safeProds = Array.isArray(prodsRes.data) ? prodsRes.data : [];
    const safeBiz = Array.isArray(bizRes.data) ? (bizRes.data as Business[]) : [];
    const catMap = new Map(safeCats.map((c) => [String(c.id), String(c.name)]));
    const counts = new Map<string, number>();
    for (const p of safeProds) {
      if (p.business_id) {
        counts.set(String(p.business_id), (counts.get(String(p.business_id)) ?? 0) + 1);
      }
    }
    return safeBiz.map((b) => ({
      ...b,
      category_name: b.category_id ? catMap.get(b.category_id) : undefined,
      product_count: counts.get(b.id) ?? 0,
    }));
  }

  const data = await apiRequest<Business[]>('/api/businesses');
  return Array.isArray(data) ? data : [];
}

export async function getBanners(type?: 'hero' | 'promo'): Promise<Banner[]> {
  if (isSupabaseConfigured) {
    let query = supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (type) query = query.eq('type', type);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return Array.isArray(data) ? (data as Banner[]) : [];
  }

  const qs = type ? `?type=${type}` : '';
  const data = await apiRequest<Banner[]>(`/api/banners${qs}`);
  return Array.isArray(data) ? data : [];
}

export async function getStoreSettings(): Promise<StoreSettings> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = (data ?? {}) as Partial<StoreSettings>;
    return {
      id: 1,
      store_name: row.store_name || APP_NAME,
      store_logo_url: row.store_logo_url ?? null,
      contact_email: row.contact_email || 'support@zyromall.pk',
      contact_phone: row.contact_phone || '0329-6730804',
      flat_shipping_cost: Number(row.flat_shipping_cost ?? FLAT_SHIPPING_COST),
      free_shipping_threshold: Number(row.free_shipping_threshold ?? FREE_SHIPPING_THRESHOLD),
      cod_enabled: row.cod_enabled ?? true,
      low_stock_threshold: Number(row.low_stock_threshold ?? 5),
      maintenance_mode: row.maintenance_mode ?? false,
      whatsapp_number: row.whatsapp_number || '03296730804',
      admin_poster_enabled: row.admin_poster_enabled ?? true,
      admin_poster_title: row.admin_poster_title || `${APP_NAME} Official Storefront Poster`,
      admin_poster_subtitle: row.admin_poster_subtitle || '',
      admin_poster_image_url:
        row.admin_poster_image_url || '/src/assets/images/poster_admin_welcome_1795191692080.jpg',
      admin_poster_cta_label: row.admin_poster_cta_label || 'Browse Live Storefront',
      admin_poster_cta_url: row.admin_poster_cta_url || '/products',
      updated_at: row.updated_at || new Date().toISOString(),
    };
  }

  return apiRequest<StoreSettings>('/api/settings');
}

export async function analyzeCatalogQuery(
  query: string,
  mode: 'catalog' | 'admin_report' = 'catalog'
): Promise<{ answer: string }> {
  if (isSupabaseConfigured) {
    const [prodsRes, catsRes] = await Promise.all([getProducts({}, 1, 100), getCategories()]);
    const q = query.trim().toLowerCase();
    const matches = prodsRes.items
      .filter(
        (p) =>
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.category_name?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 5);
    if (mode === 'admin_report') {
      const lowStock = prodsRes.items.filter((p) => p.stock_quantity <= 5).length;
      return {
        answer: `Catalog Summary (${APP_NAME}): ${prodsRes.total} active products across ${catsRes.length} categories. ${lowStock} items have low/zero stock.`,
      };
    }
    return {
      answer:
        matches.length > 0
          ? `Found ${matches.length} matching products: ${matches.map((m) => `${m.title} (PKR ${getEffectivePrice(m).toLocaleString('en-PK')})`).join(', ')}.`
          : `No direct catalog matches found for "${query}". Try browsing our categories.`,
    };
  }

  return apiRequest<{ answer: string }>('/api/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({ query, mode }),
  });
}
