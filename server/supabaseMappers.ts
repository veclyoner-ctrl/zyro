import type {
  Address,
  Banner,
  CartItem,
  Category,
  Coupon,
  CouponUsage,
  Order,
  OrderItem,
  Product,
  ProductVariant,
  Review,
  StoreSettings,
  WishlistItem,
} from '../src/types';
import type { DatabaseState, StoredUser } from './store';

export interface SupabaseTableDiff<T> {
  upserts: T[];
  deletes: string[];
}

export interface ProductRow {
  id: string;
  title: string;
  slug: string;
  description: string;
  sku: string;
  category_id: string | null;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  images: string[];
  status: string;
  is_deleted: boolean;
  is_featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  payment_proof_url: string | null;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  total: number;
  coupon_id: string | null;
  coupon_code: string | null;
  shipping_address: Order['shipping_address'];
  tracking_number: string | null;
  admin_notes: string | null;
  cancel_reason: string | null;
  return_requested: boolean;
  return_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function toProductRow(p: Product): ProductRow {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description ?? '',
    sku: p.sku,
    category_id: p.category_id ?? null,
    price: Number(p.price),
    sale_price: p.sale_price !== null && p.sale_price !== undefined ? Number(p.sale_price) : null,
    stock_quantity: Number(p.stock_quantity),
    images: Array.isArray(p.images) ? p.images : [],
    status: p.status,
    is_deleted: Boolean(p.is_deleted),
    is_featured: Boolean(p.is_featured),
    meta_title: p.meta_title ?? null,
    meta_description: p.meta_description ?? null,
    created_at: p.created_at,
    updated_at: p.updated_at ?? p.created_at,
  };
}

export function fromProductRow(row: ProductRow, variants: ProductVariant[]): Product {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? '',
    sku: row.sku,
    category_id: row.category_id ?? null,
    price: Number(row.price),
    sale_price: row.sale_price !== null && row.sale_price !== undefined ? Number(row.sale_price) : null,
    stock_quantity: Number(row.stock_quantity),
    images: Array.isArray(row.images) ? row.images : [],
    status: row.status as Product['status'],
    is_deleted: Boolean(row.is_deleted),
    is_featured: Boolean(row.is_featured),
    meta_title: row.meta_title ?? null,
    meta_description: row.meta_description ?? null,
    variants,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toOrderRow(o: Order): OrderRow {
  return {
    id: o.id,
    order_number: o.order_number,
    user_id: o.user_id ?? null,
    customer_name: o.customer_name ?? null,
    customer_email: o.customer_email ?? null,
    status: o.status,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    payment_proof_url: o.payment_proof_url ?? null,
    subtotal: Number(o.subtotal),
    shipping_cost: Number(o.shipping_cost),
    discount_amount: Number(o.discount_amount),
    total: Number(o.total),
    coupon_id: o.coupon_id ?? null,
    coupon_code: o.coupon_code ?? null,
    shipping_address: o.shipping_address,
    tracking_number: o.tracking_number ?? null,
    admin_notes: o.admin_notes ?? null,
    cancel_reason: o.cancel_reason ?? null,
    return_requested: Boolean(o.return_requested),
    return_reason: o.return_reason ?? null,
    created_at: o.created_at,
    updated_at: o.updated_at,
  };
}

export function fromOrderRow(row: OrderRow, items: OrderItem[]): Order {
  return {
    id: row.id,
    order_number: row.order_number,
    user_id: row.user_id ?? null,
    customer_name: row.customer_name ?? undefined,
    customer_email: row.customer_email ?? undefined,
    status: row.status as Order['status'],
    payment_method: row.payment_method as Order['payment_method'],
    payment_status: row.payment_status as Order['payment_status'],
    payment_proof_url: row.payment_proof_url ?? null,
    subtotal: Number(row.subtotal),
    shipping_cost: Number(row.shipping_cost),
    discount_amount: Number(row.discount_amount),
    total: Number(row.total),
    coupon_id: row.coupon_id ?? null,
    coupon_code: row.coupon_code ?? null,
    shipping_address: row.shipping_address,
    tracking_number: row.tracking_number ?? null,
    admin_notes: row.admin_notes ?? null,
    cancel_reason: row.cancel_reason ?? null,
    return_requested: Boolean(row.return_requested),
    return_reason: row.return_reason ?? null,
    items: items.map((it) => ({
      ...it,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      total_price: Number(it.total_price),
    })),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function diffRowsById<T extends { id: string }>(
  prevRows: T[],
  nextRows: T[]
): SupabaseTableDiff<T> {
  const prevMap = new Map<string, string>();
  for (const row of prevRows) {
    prevMap.set(row.id, JSON.stringify(row));
  }

  const nextIds = new Set<string>();
  const upserts: T[] = [];
  for (const row of nextRows) {
    nextIds.add(row.id);
    const serialized = JSON.stringify(row);
    if (prevMap.get(row.id) !== serialized) {
      upserts.push(row);
    }
  }

  const deletes: string[] = [];
  for (const row of prevRows) {
    if (!nextIds.has(row.id)) {
      deletes.push(row.id);
    }
  }

  return { upserts, deletes };
}

export function extractVariantsFromProducts(products: Product[]): ProductVariant[] {
  const rows: ProductVariant[] = [];
  for (const p of products) {
    for (const v of p.variants ?? []) {
      rows.push({
        id: v.id,
        product_id: p.id,
        variant_name: v.variant_name,
        variant_value: v.variant_value,
        price_modifier: Number(v.price_modifier) || 0,
        stock_quantity: Number(v.stock_quantity) || 0,
        sku: v.sku ?? null,
      });
    }
  }
  return rows;
}

export function extractOrderItemsFromOrders(orders: Order[]): OrderItem[] {
  const rows: OrderItem[] = [];
  for (const o of orders) {
    for (const it of o.items ?? []) {
      rows.push({
        id: it.id,
        order_id: o.id,
        product_id: it.product_id ?? null,
        variant_id: it.variant_id ?? null,
        product_title: it.product_title,
        product_image: it.product_image ?? null,
        variant_info: it.variant_info ?? null,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        total_price: Number(it.total_price),
        created_at: it.created_at,
      });
    }
  }
  return rows;
}

export function normalizeDatabaseRowsToState(input: {
  profiles: StoredUser[];
  categories: Category[];
  products: ProductRow[];
  product_variants: ProductVariant[];
  addresses: Address[];
  coupons: Coupon[];
  coupon_usages: CouponUsage[];
  orders: OrderRow[];
  order_items: OrderItem[];
  cart_items: CartItem[];
  wishlist_items: WishlistItem[];
  reviews: Review[];
  banners: Banner[];
  settings: StoreSettings;
}): DatabaseState {
  const variantsByProduct = new Map<string, ProductVariant[]>();
  for (const v of input.product_variants) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push({
      ...v,
      price_modifier: Number(v.price_modifier) || 0,
      stock_quantity: Number(v.stock_quantity) || 0,
    });
    variantsByProduct.set(v.product_id, list);
  }

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const item of input.order_items) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return {
    users: input.profiles.map((u) => ({
      ...u,
      password_hash: u.password_hash ?? '',
    })),
    categories: input.categories,
    products: input.products.map((row) =>
      fromProductRow(row, variantsByProduct.get(row.id) ?? [])
    ),
    addresses: input.addresses,
    coupons: input.coupons.map((c) => ({
      ...c,
      value: Number(c.value),
      min_order_amount: Number(c.min_order_amount),
      used_count: Number(c.used_count),
    })),
    coupon_usages: input.coupon_usages,
    orders: input.orders.map((row) =>
      fromOrderRow(row, itemsByOrder.get(row.id) ?? [])
    ),
    cart_items: input.cart_items.map((ci) => ({
      ...ci,
      quantity: Number(ci.quantity),
    })),
    wishlist_items: input.wishlist_items,
    reviews: input.reviews.map((r) => ({
      ...r,
      rating: Number(r.rating),
    })),
    banners: input.banners,
    businesses: [],
    settings: {
      ...input.settings,
      flat_shipping_cost: Number(input.settings.flat_shipping_cost),
      free_shipping_threshold: Number(input.settings.free_shipping_threshold),
      low_stock_threshold: Number(input.settings.low_stock_threshold),
      whatsapp_number: input.settings.whatsapp_number || '03296730804',
      admin_poster_enabled: input.settings.admin_poster_enabled ?? true,
      admin_poster_title:
        input.settings.admin_poster_title || 'Zyro Mall Official Storefront & Campaign Poster',
      admin_poster_subtitle:
        input.settings.admin_poster_subtitle ||
        'Manage categories, partner businesses, data quality, discounted PKR pricing, and direct WhatsApp order booking.',
      admin_poster_image_url:
        input.settings.admin_poster_image_url ||
        '/src/assets/images/poster_admin_welcome_1795191692080.jpg',
      admin_poster_cta_label: input.settings.admin_poster_cta_label || 'Browse Live Storefront',
      admin_poster_cta_url: input.settings.admin_poster_cta_url || '/products',
    },
  };
}
