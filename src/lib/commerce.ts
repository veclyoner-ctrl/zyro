import type { Business, Category, Coupon, OrderStatus, Product, StoreSettings } from '../types';

export function formatPrice(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `PKR ${safe.toLocaleString('en-PK')}`;
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function getEffectivePrice(
  product: Pick<Product, 'price' | 'sale_price'>,
  variantModifier = 0
): number {
  const base =
    product.sale_price !== null && product.sale_price > 0 && product.sale_price < product.price
      ? product.sale_price
      : product.price;
  return Math.max(0, base + variantModifier);
}

export function getDiscountPercent(price: number, salePrice: number | null): number | null {
  if (!salePrice || salePrice <= 0 || salePrice >= price || price <= 0) return null;
  return Math.round(((price - salePrice) / price) * 100);
}

export function sanitizeWhatsAppNumber(rawNumber: string | null | undefined): string {
  const digits = String(rawNumber ?? '').replace(/[^\d]/g, '');
  if (!digits) return '923296730804';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) {
    return `92${digits.slice(1)}`;
  }
  return digits;
}

export function buildWhatsAppOrderUrl(
  rawNumber: string | null | undefined,
  options: {
    productTitle: string;
    price: number;
    originalPrice?: number | null;
    categoryName?: string;
    sku?: string;
    productUrl?: string;
    businessName?: string;
  }
): string {
  const phone = sanitizeWhatsAppNumber(rawNumber);
  const discountPct =
    options.originalPrice && options.originalPrice > options.price
      ? getDiscountPercent(options.originalPrice, options.price)
      : null;
  const priceLine =
    options.originalPrice && options.originalPrice > options.price
      ? `Discount Price: ${formatPrice(options.price)} (Original: ${formatPrice(options.originalPrice)}${discountPct ? ` - ${discountPct}% OFF` : ''})`
      : `Price: ${formatPrice(options.price)}`;
  const lines = [
    `Assalam-o-Alaikum, I want to book an order from Zyro Mall:`,
    `Product: ${options.productTitle}`,
  ];
  if (options.categoryName) lines.push(`Category: ${options.categoryName}`);
  lines.push(priceLine);
  if (options.sku) lines.push(`SKU: ${options.sku}`);
  if (options.businessName) lines.push(`Business: ${options.businessName}`);
  if (options.productUrl) lines.push(`Link: ${options.productUrl}`);
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function calculateShipping(
  subtotal: number,
  flatCost: number,
  freeThreshold: number
): number {
  if (subtotal <= 0) return 0;
  if (subtotal >= freeThreshold) return 0;
  return Math.max(0, flatCost);
}

export interface CouponValidationResult {
  valid: boolean;
  discountAmount: number;
  error?: string;
}

export function validateAndCalculateCoupon(
  coupon: Coupon | undefined,
  subtotal: number,
  hasUserUsed: boolean,
  now = new Date()
): CouponValidationResult {
  if (!coupon) {
    return { valid: false, discountAmount: 0, error: 'Invalid coupon code.' };
  }
  if (!coupon.is_active) {
    return { valid: false, discountAmount: 0, error: 'This coupon is currently inactive.' };
  }
  if (coupon.expires_at) {
    const expiry = new Date(coupon.expires_at);
    if (expiry.getTime() < now.getTime()) {
      return { valid: false, discountAmount: 0, error: 'This coupon has expired.' };
    }
  }
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, discountAmount: 0, error: 'This coupon has reached its usage limit.' };
  }
  if (hasUserUsed) {
    return {
      valid: false,
      discountAmount: 0,
      error: 'You have already used this coupon on a previous order.',
    };
  }
  if (subtotal < coupon.min_order_amount) {
    return {
      valid: false,
      discountAmount: 0,
      error: `Minimum order of ${formatPrice(coupon.min_order_amount)} required for this coupon.`,
    };
  }

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = Math.round((subtotal * coupon.value) / 100);
  } else {
    discount = Math.round(coupon.value);
  }
  discount = Math.min(subtotal, Math.max(0, discount));
  return { valid: true, discountAmount: discount };
}

export interface CartTotals {
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
}

export function calculateCartTotals(
  items: Array<{ unitPrice: number; quantity: number }>,
  settings: Pick<StoreSettings, 'flat_shipping_cost' | 'free_shipping_threshold'>,
  discountAmount = 0
): CartTotals {
  const subtotal = items.reduce(
    (sum, item) => sum + Math.max(0, item.unitPrice) * Math.max(0, item.quantity),
    0
  );
  const clampedDiscount = Math.min(subtotal, Math.max(0, discountAmount));
  const shippingCost = calculateShipping(
    subtotal,
    settings.flat_shipping_cost,
    settings.free_shipping_threshold
  );
  const total = Math.max(0, subtotal - clampedDiscount + shippingCost);
  return { subtotal, shippingCost, discountAmount: clampedDiscount, total };
}

export function canCancelOrder(status: OrderStatus): boolean {
  return status === 'pending';
}

export function canRequestReturn(
  status: OrderStatus,
  createdAt: string,
  now = new Date()
): boolean {
  if (status !== 'delivered') return false;
  const orderTime = new Date(createdAt).getTime();
  if (Number.isNaN(orderTime)) return false;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return now.getTime() - orderTime <= sevenDaysMs;
}

export type StockState = 'in_stock' | 'low_stock' | 'out_of_stock';

export function getStockState(stockQuantity: number, threshold = 10): StockState {
  if (stockQuantity <= 0) return 'out_of_stock';
  if (stockQuantity <= threshold) return 'low_stock';
  return 'in_stock';
}

export const PER_PAGE_OPTIONS = [12, 24, 48] as const;
export type PerPageOption = (typeof PER_PAGE_OPTIONS)[number];
export const DEFAULT_MAX_PRICE_CEILING = 100000;

export function parsePerPageOption(raw: string | null | undefined): PerPageOption {
  const num = Number(raw);
  if (num === 24 || num === 48) return num;
  return 12;
}

export function parseMaxPriceCeiling(
  raw: string | null | undefined,
  ceiling = DEFAULT_MAX_PRICE_CEILING
): number {
  if (!raw) return ceiling;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return ceiling;
  return Math.min(ceiling, Math.max(1000, Math.round(num)));
}

export type DataQualitySeverity = 'critical' | 'warning' | 'info';

export interface DataQualityIssue {
  id: string;
  productId: string;
  productTitle: string;
  sku: string;
  severity: DataQualitySeverity;
  code:
    | 'missing_image'
    | 'short_description'
    | 'missing_category'
    | 'missing_business'
    | 'out_of_stock'
    | 'low_stock'
    | 'no_discount'
    | 'duplicate_sku';
  label: string;
  suggestion: string;
}

export interface DataQualityReport {
  summary: {
    totalProducts: number;
    healthyProducts: number;
    productsWithIssues: number;
    activeCategories: number;
    activeBusinesses: number;
    discountedProducts: number;
    businessLinkedProducts: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  };
  issues: DataQualityIssue[];
}

export function evaluateCatalogDataQuality(
  products: Product[],
  categories: Category[],
  businesses: Business[],
  lowStockThreshold = 5
): DataQualityReport {
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeBusinesses = Array.isArray(businesses) ? businesses : [];

  const activeProducts = safeProducts.filter((p) => !p.is_deleted);
  const categoryIds = new Set(safeCategories.map((c) => c.id));
  const businessIds = new Set(safeBusinesses.map((b) => b.id));
  const skuCounts = new Map<string, number>();

  for (const p of activeProducts) {
    const skuKey = String(p.sku || '').trim().toUpperCase();
    skuCounts.set(skuKey, (skuCounts.get(skuKey) ?? 0) + 1);
  }

  const issues: DataQualityIssue[] = [];
  const affectedProductIds = new Set<string>();
  const criticalOrWarningProductIds = new Set<string>();

  for (const p of activeProducts) {
    if (!p.images || p.images.length === 0 || !p.images[0]?.trim()) {
      affectedProductIds.add(p.id);
      criticalOrWarningProductIds.add(p.id);
      issues.push({
        id: `${p.id}-img`,
        productId: p.id,
        productTitle: p.title,
        sku: p.sku,
        severity: 'critical',
        code: 'missing_image',
        label: 'Missing product image',
        suggestion: 'Upload at least 1 high-resolution product photo.',
      });
    }

    if ((skuCounts.get(p.sku.trim().toUpperCase()) ?? 0) > 1) {
      affectedProductIds.add(p.id);
      criticalOrWarningProductIds.add(p.id);
      issues.push({
        id: `${p.id}-sku`,
        productId: p.id,
        productTitle: p.title,
        sku: p.sku,
        severity: 'critical',
        code: 'duplicate_sku',
        label: 'Duplicate SKU detected',
        suggestion: `Assign a unique SKU instead of ${p.sku}.`,
      });
    }

    if (!p.category_id || !categoryIds.has(p.category_id)) {
      affectedProductIds.add(p.id);
      criticalOrWarningProductIds.add(p.id);
      issues.push({
        id: `${p.id}-cat`,
        productId: p.id,
        productTitle: p.title,
        sku: p.sku,
        severity: 'warning',
        code: 'missing_category',
        label: 'Unassigned category',
        suggestion: 'Assign a category so shoppers can discover this item.',
      });
    }

    if (!p.business_id || !businessIds.has(p.business_id)) {
      affectedProductIds.add(p.id);
      issues.push({
        id: `${p.id}-biz`,
        productId: p.id,
        productTitle: p.title,
        sku: p.sku,
        severity: 'info',
        code: 'missing_business',
        label: 'No business linked',
        suggestion: 'Link a partner business so its WhatsApp & brand profile appear.',
      });
    }

    if (!p.description || p.description.trim().length < 40) {
      affectedProductIds.add(p.id);
      criticalOrWarningProductIds.add(p.id);
      issues.push({
        id: `${p.id}-desc`,
        productId: p.id,
        productTitle: p.title,
        sku: p.sku,
        severity: 'warning',
        code: 'short_description',
        label: 'Short or empty description',
        suggestion: 'Add material, size, or warranty details (40+ characters).',
      });
    }

    if (p.stock_quantity <= 0 || p.status === 'out_of_stock') {
      affectedProductIds.add(p.id);
      criticalOrWarningProductIds.add(p.id);
      issues.push({
        id: `${p.id}-oos`,
        productId: p.id,
        productTitle: p.title,
        sku: p.sku,
        severity: 'critical',
        code: 'out_of_stock',
        label: 'Out of stock',
        suggestion: 'Restock inventory or archive draft listings.',
      });
    } else if (p.stock_quantity <= lowStockThreshold) {
      affectedProductIds.add(p.id);
      criticalOrWarningProductIds.add(p.id);
      issues.push({
        id: `${p.id}-low`,
        productId: p.id,
        productTitle: p.title,
        sku: p.sku,
        severity: 'warning',
        code: 'low_stock',
        label: `Low stock (${p.stock_quantity} left)`,
        suggestion: `Replenish stock above threshold (${lowStockThreshold}).`,
      });
    }

    if (!getDiscountPercent(p.price, p.sale_price)) {
      affectedProductIds.add(p.id);
      issues.push({
        id: `${p.id}-disc`,
        productId: p.id,
        productTitle: p.title,
        sku: p.sku,
        severity: 'info',
        code: 'no_discount',
        label: 'No promotional sale price',
        suggestion: 'Optional: set a sale price lower than regular price to show strikethrough savings.',
      });
    }
  }

  return {
    summary: {
      totalProducts: activeProducts.length,
      healthyProducts: activeProducts.length - criticalOrWarningProductIds.size,
      productsWithIssues: affectedProductIds.size,
      activeCategories: categories.filter((c) => c.is_active).length,
      activeBusinesses: businesses.filter((b) => b.is_active).length,
      discountedProducts: activeProducts.filter((p) => getDiscountPercent(p.price, p.sale_price) !== null).length,
      businessLinkedProducts: activeProducts.filter((p) => Boolean(p.business_id && businessIds.has(p.business_id))).length,
      criticalCount: issues.filter((i) => i.severity === 'critical').length,
      warningCount: issues.filter((i) => i.severity === 'warning').length,
      infoCount: issues.filter((i) => i.severity === 'info').length,
    },
    issues,
  };
}
