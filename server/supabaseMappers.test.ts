import test from 'node:test';
import assert from 'node:assert/strict';
import {
  diffRowsById,
  extractOrderItemsFromOrders,
  extractVariantsFromProducts,
  fromOrderRow,
  fromProductRow,
  normalizeDatabaseRowsToState,
  toOrderRow,
  toProductRow,
} from './supabaseMappers';
import type { Order, Product, StoreSettings } from '../src/types';

test('diffRowsById detects inserted, modified, and deleted rows accurately', () => {
  const prev = [
    { id: '1', name: 'Alpha' },
    { id: '2', name: 'Beta' },
    { id: '3', name: 'Gamma' },
  ];
  const next = [
    { id: '1', name: 'Alpha' },
    { id: '2', name: 'Beta Updated' },
    { id: '4', name: 'Delta' },
  ];

  const diff = diffRowsById(prev, next);
  assert.deepEqual(
    diff.upserts.map((r) => r.id),
    ['2', '4']
  );
  assert.deepEqual(diff.deletes, ['3']);
});

test('product and variant row mappers round-trip numeric and nested fields', () => {
  const product: Product = {
    id: 'prod-1',
    title: 'Test Headphones',
    slug: 'test-headphones',
    description: 'Studio headphones',
    sku: 'ZM-101',
    category_id: 'cat-1',
    price: 15000,
    sale_price: 12000,
    stock_quantity: 8,
    images: ['https://cdn.example.com/a.jpg'],
    status: 'active',
    is_deleted: false,
    is_featured: true,
    variants: [
      {
        id: 'var-1',
        product_id: 'prod-1',
        variant_name: 'Color',
        variant_value: 'Black',
        price_modifier: 500,
        stock_quantity: 4,
        sku: 'ZM-101-BLK',
      },
    ],
    created_at: '2026-11-20T00:00:00Z',
    updated_at: '2026-11-20T00:00:00Z',
  };

  const row = toProductRow(product);
  const variants = extractVariantsFromProducts([product]);
  const roundTripped = fromProductRow(row, variants);

  assert.equal(roundTripped.price, 15000);
  assert.equal(roundTripped.sale_price, 12000);
  assert.equal(roundTripped.is_featured, true);
  assert.equal(roundTripped.variants?.length, 1);
  assert.equal(roundTripped.variants?.[0].price_modifier, 500);
});

test('order and order item row mappers preserve totals and nested items', () => {
  const order: Order = {
    id: 'ord-1',
    order_number: 'ZM-20261120-0101',
    user_id: 'usr-1',
    customer_name: 'Ayesha',
    customer_email: 'ayesha@example.com',
    status: 'pending',
    payment_method: 'cod',
    payment_status: 'pending',
    subtotal: 5000,
    shipping_cost: 0,
    discount_amount: 500,
    total: 4500,
    coupon_id: null,
    shipping_address: {
      full_name: 'Ayesha',
      phone: '0300-1234567',
      address_line1: 'House 10',
      city: 'Lahore',
      area: 'DHA',
      postal_code: '54000',
    },
    tracking_number: null,
    admin_notes: null,
    cancel_reason: null,
    items: [
      {
        id: 'oi-1',
        order_id: 'ord-1',
        product_id: 'prod-1',
        variant_id: null,
        product_title: 'Test Headphones',
        product_image: null,
        variant_info: null,
        quantity: 1,
        unit_price: 5000,
        total_price: 5000,
        created_at: '2026-11-20T00:00:00Z',
      },
    ],
    created_at: '2026-11-20T00:00:00Z',
    updated_at: '2026-11-20T00:00:00Z',
  };

  const row = toOrderRow(order);
  const items = extractOrderItemsFromOrders([order]);
  const roundTripped = fromOrderRow(row, items);

  assert.equal(roundTripped.total, 4500);
  assert.equal(roundTripped.items?.length, 1);
  assert.equal(roundTripped.items?.[0].unit_price, 5000);
});

test('normalizeDatabaseRowsToState coerces Postgres numeric strings cleanly', () => {
  const settings: StoreSettings = {
    id: 1,
    store_name: 'Zyro Mall',
    store_logo_url: null,
    contact_email: 'support@zyromall.pk',
    contact_phone: '+92 42 3576 1940',
    flat_shipping_cost: '200' as unknown as number,
    free_shipping_threshold: '5000' as unknown as number,
    cod_enabled: true,
    low_stock_threshold: 5,
    maintenance_mode: false,
    whatsapp_number: '0300-8451290',
    admin_poster_enabled: true,
    admin_poster_title: 'Test Poster',
    admin_poster_subtitle: 'Subtitle',
    admin_poster_image_url: '/src/assets/images/poster_admin_welcome_1795191692080.jpg',
    admin_poster_cta_label: 'Explore',
    admin_poster_cta_url: '/products',
    updated_at: '2026-11-20T00:00:00Z',
  };

  const state = normalizeDatabaseRowsToState({
    profiles: [],
    categories: [],
    products: [],
    product_variants: [],
    addresses: [],
    coupons: [],
    coupon_usages: [],
    orders: [],
    order_items: [],
    cart_items: [],
    wishlist_items: [],
    reviews: [],
    banners: [],
    settings,
  });

  assert.equal(state.settings.flat_shipping_cost, 200);
  assert.equal(state.settings.free_shipping_threshold, 5000);
});
