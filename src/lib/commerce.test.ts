import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsAppOrderUrl,
  calculateCartTotals,
  calculateShipping,
  canCancelOrder,
  canRequestReturn,
  evaluateCatalogDataQuality,
  formatPrice,
  getDiscountPercent,
  getEffectivePrice,
  getStockState,
  parseMaxPriceCeiling,
  parsePerPageOption,
  sanitizeWhatsAppNumber,
  slugify,
  validateAndCalculateCoupon,
} from './commerce';
import type { Business, Category, Coupon, Product } from '../types';

const baseCoupon: Coupon = {
  id: 'cpn-1',
  code: 'ZYRO10',
  type: 'percentage',
  value: 10,
  min_order_amount: 2000,
  max_uses: 100,
  used_count: 5,
  expires_at: '2028-12-31T23:59:59Z',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

test('formatPrice formats PKR with thousands separator', () => {
  assert.equal(formatPrice(12500), 'PKR 12,500');
  assert.equal(formatPrice(0), 'PKR 0');
});

test('getEffectivePrice uses sale price when valid and lower than original price', () => {
  assert.equal(getEffectivePrice({ price: 5000, sale_price: 3800 }), 3800);
  assert.equal(getEffectivePrice({ price: 5000, sale_price: null }), 5000);
  assert.equal(getEffectivePrice({ price: 5000, sale_price: 6000 }), 5000);
  assert.equal(getEffectivePrice({ price: 5000, sale_price: 4000 }, 500), 4500);
});

test('getDiscountPercent calculates accurate rounded percentage', () => {
  assert.equal(getDiscountPercent(2400, 2100), 13);
  assert.equal(getDiscountPercent(5000, 4000), 20);
  assert.equal(getDiscountPercent(5000, null), null);
  assert.equal(getDiscountPercent(5000, 5000), null);
});

test('sanitizeWhatsAppNumber and buildWhatsAppOrderUrl produce valid wa.me links', () => {
  assert.equal(sanitizeWhatsAppNumber('03296730804'), '923296730804');
  assert.equal(sanitizeWhatsAppNumber(''), '923296730804');
  assert.equal(sanitizeWhatsAppNumber('+92 329 6730804'), '923296730804');

  const url = buildWhatsAppOrderUrl('03296730804', {
    productTitle: 'Oxford Cotton Shirt',
    price: 2100,
    originalPrice: 2400,
    categoryName: 'Fashion & Shirts',
    sku: 'ZM-FS-501',
    businessName: 'Lahore Loom Studio',
  });
  assert.ok(url.startsWith('https://wa.me/923296730804?text='));
  const decoded = decodeURIComponent(url);
  assert.ok(decoded.includes('Oxford Cotton Shirt'));
  assert.ok(decoded.includes('Fashion & Shirts'));
  assert.ok(decoded.includes('PKR 2,100'));
  assert.ok(decoded.includes('PKR 2,400'));
});

test('calculateShipping applies flat rate below threshold and free above threshold', () => {
  assert.equal(calculateShipping(0, 200, 5000), 0);
  assert.equal(calculateShipping(4999, 200, 5000), 200);
  assert.equal(calculateShipping(5000, 200, 5000), 0);
  assert.equal(calculateShipping(12000, 200, 5000), 0);
});

test('validateAndCalculateCoupon enforces rules accurately', () => {
  const now = new Date('2026-11-20T00:00:00Z');
  const valid = validateAndCalculateCoupon(baseCoupon, 4000, false, now);
  assert.equal(valid.valid, true);
  assert.equal(valid.discountAmount, 400);

  const tooLow = validateAndCalculateCoupon(baseCoupon, 1500, false, now);
  assert.equal(tooLow.valid, false);

  const alreadyUsed = validateAndCalculateCoupon(baseCoupon, 4000, true, now);
  assert.equal(alreadyUsed.valid, false);

  const expired = validateAndCalculateCoupon(
    { ...baseCoupon, expires_at: '2025-01-01T00:00:00Z' },
    4000,
    false,
    now
  );
  assert.equal(expired.valid, false);

  const flatCapped = validateAndCalculateCoupon(
    { ...baseCoupon, type: 'flat', value: 10000, min_order_amount: 0 },
    3500,
    false,
    now
  );
  assert.equal(flatCapped.valid, true);
  assert.equal(flatCapped.discountAmount, 3500);
});

test('calculateCartTotals computes subtotal, discount, shipping, and grand total', () => {
  const totals = calculateCartTotals(
    [
      { unitPrice: 2000, quantity: 2 },
      { unitPrice: 500, quantity: 1 },
    ],
    { flat_shipping_cost: 200, free_shipping_threshold: 5000 },
    450
  );
  assert.equal(totals.subtotal, 4500);
  assert.equal(totals.discountAmount, 450);
  assert.equal(totals.shippingCost, 200);
  assert.equal(totals.total, 4250);
});

test('order cancellation and return eligibility rules', () => {
  assert.equal(canCancelOrder('pending'), true);
  assert.equal(canCancelOrder('confirmed'), false);
  assert.equal(canCancelOrder('shipped'), false);

  const now = new Date('2026-11-20T12:00:00Z');
  assert.equal(canRequestReturn('delivered', '2026-11-18T12:00:00Z', now), true);
  assert.equal(canRequestReturn('delivered', '2026-11-01T12:00:00Z', now), false);
  assert.equal(canRequestReturn('shipped', '2026-11-19T12:00:00Z', now), false);
});

test('getStockState and slugify behave deterministically', () => {
  assert.equal(getStockState(0), 'out_of_stock');
  assert.equal(getStockState(5, 10), 'low_stock');
  assert.equal(getStockState(15, 10), 'in_stock');
  assert.equal(slugify('Wireless ANC Headphones — Pro!'), 'wireless-anc-headphones-pro');
});

test('parsePerPageOption and parseMaxPriceCeiling sanitize query params', () => {
  assert.equal(parsePerPageOption(null), 12);
  assert.equal(parsePerPageOption('99'), 12);
  assert.equal(parsePerPageOption('24'), 24);
  assert.equal(parsePerPageOption('48'), 48);

  assert.equal(parseMaxPriceCeiling(null), 100000);
  assert.equal(parseMaxPriceCeiling('invalid'), 100000);
  assert.equal(parseMaxPriceCeiling('25000'), 25000);
  assert.equal(parseMaxPriceCeiling('500'), 1000);
  assert.equal(parseMaxPriceCeiling('999999'), 100000);
});

test('evaluateCatalogDataQuality flags missing fields, stock, and business links', () => {
  const categories: Category[] = [
    {
      id: 'cat-1',
      name: 'Fashion',
      slug: 'fashion',
      parent_id: null,
      image_url: null,
      is_active: true,
      sort_order: 1,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];
  const businesses: Business[] = [
    {
      id: 'biz-1',
      name: 'Lahore Loom Studio',
      slug: 'lahore-loom-studio',
      category_id: 'cat-1',
      tagline: 'Tailored menswear',
      description: 'Fine cotton shirts.',
      details: 'Cash on delivery across Pakistan.',
      city: 'Lahore',
      whatsapp_number: '03008451290',
      image_url: '/src/assets/images/prod_cotton_shirt_1795191691262.jpg',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];
  const products: Product[] = [
    {
      id: 'p-1',
      title: 'Healthy Shirt',
      slug: 'healthy-shirt',
      description: '100% long-staple Pakistani Oxford cotton tailored casual shirt with button collar.',
      sku: 'ZM-1',
      category_id: 'cat-1',
      business_id: 'biz-1',
      price: 2400,
      sale_price: 2100,
      stock_quantity: 12,
      images: ['/src/assets/images/prod_cotton_shirt_1795191691262.jpg'],
      status: 'active',
      is_deleted: false,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p-2',
      title: 'Broken Listing',
      slug: 'broken-listing',
      description: 'Short',
      sku: 'ZM-DUP',
      category_id: null,
      business_id: null,
      price: 5000,
      sale_price: null,
      stock_quantity: 0,
      images: [],
      status: 'active',
      is_deleted: false,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p-3',
      title: 'Duplicate SKU Listing',
      slug: 'dup-sku-listing',
      description: 'Complete description over forty characters long for test coverage.',
      sku: 'ZM-DUP',
      category_id: 'cat-1',
      business_id: 'biz-1',
      price: 4000,
      sale_price: 3500,
      stock_quantity: 10,
      images: ['/src/assets/images/prod_cotton_shirt_1795191691262.jpg'],
      status: 'active',
      is_deleted: false,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  const report = evaluateCatalogDataQuality(products, categories, businesses, 5);
  assert.equal(report.summary.totalProducts, 3);
  assert.equal(report.summary.healthyProducts, 1);
  assert.equal(report.summary.discountedProducts, 2);
  assert.equal(report.summary.businessLinkedProducts, 2);
  assert.ok(report.issues.some((i) => i.code === 'missing_image'));
  assert.ok(report.issues.some((i) => i.code === 'duplicate_sku'));
  assert.ok(report.issues.some((i) => i.code === 'out_of_stock'));
  assert.ok(report.issues.some((i) => i.code === 'missing_category'));
});
