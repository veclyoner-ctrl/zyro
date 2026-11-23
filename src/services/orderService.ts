import { apiRequest } from './api';
import {
  calculateCartTotals,
  canCancelOrder,
  canRequestReturn,
  getEffectivePrice,
  validateAndCalculateCoupon,
} from '../lib/commerce';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getStoreSettings } from './productService';
import type {
  Address,
  Coupon,
  Order,
  OrderItem,
  PaymentMethod,
  Product,
  ProductVariant,
  ShippingAddress,
} from '../types';

export interface CreateOrderPayload {
  shipping_address: ShippingAddress;
  payment_method: PaymentMethod;
  payment_proof_url?: string | null;
  coupon_code?: string | null;
  save_address?: boolean;
}

async function getCurrentSupabaseUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user?.id) throw new Error('Authentication required');
  return data.user.id;
}

async function hydrateSupabaseOrders(rawOrders: Array<Record<string, unknown>>): Promise<Order[]> {
  if (rawOrders.length === 0) return [];
  const orderIds = rawOrders.map((o) => String(o.id));
  const { data: itemsData } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds);

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const raw of (itemsData ?? []) as OrderItem[]) {
    const oid = String(raw.order_id);
    const list = itemsByOrder.get(oid) ?? [];
    list.push({
      ...raw,
      quantity: Number(raw.quantity),
      unit_price: Number(raw.unit_price),
      total_price: Number(raw.total_price),
    });
    itemsByOrder.set(oid, list);
  }

  return rawOrders.map((row) => ({
    ...(row as unknown as Order),
    subtotal: Number(row.subtotal),
    shipping_cost: Number(row.shipping_cost),
    discount_amount: Number(row.discount_amount),
    total: Number(row.total),
    items: itemsByOrder.get(String(row.id)) ?? [],
  }));
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  if (isSupabaseConfigured) {
    if (!['cod', 'jazzcash', 'easypaisa'].includes(payload.payment_method)) {
      throw new Error('Allowed payment methods are COD, JazzCash, and EasyPaisa only.');
    }
    const addr = payload.shipping_address;
    if (!addr?.full_name?.trim() || !addr?.phone?.trim() || !addr?.address_line1?.trim() || !addr?.city?.trim()) {
      throw new Error('Recipient name, phone, street address, and city are required.');
    }

    const userId = await getCurrentSupabaseUserId();
    const [{ data: profile }, { data: cartRows, error: cartErr }, settings] = await Promise.all([
      supabase.from('profiles').select('full_name, email').eq('id', userId).maybeSingle(),
      supabase.from('cart_items').select('*').eq('user_id', userId),
      getStoreSettings(),
    ]);

    if (cartErr) throw new Error(cartErr.message);
    if (!cartRows || cartRows.length === 0) {
      throw new Error('Your cart is empty.');
    }

    const productIds = Array.from(new Set(cartRows.map((c) => String(c.product_id))));
    const variantIds = Array.from(
      new Set(cartRows.map((c) => c.variant_id).filter(Boolean).map(String))
    );

    const [productsRes, variantsRes] = await Promise.all([
      supabase.from('products').select('*').in('id', productIds),
      variantIds.length > 0
        ? supabase.from('product_variants').select('*').in('id', variantIds)
        : Promise.resolve({ data: [] as ProductVariant[] }),
    ]);

    const prodMap = new Map(
      (productsRes.data ?? []).map((p) => [
        String(p.id),
        {
          ...(p as Product),
          price: Number(p.price),
          sale_price: p.sale_price !== null ? Number(p.sale_price) : null,
          stock_quantity: Number(p.stock_quantity),
        } as Product,
      ])
    );
    const varMap = new Map(
      (variantsRes.data ?? []).map((v) => [
        String(v.id),
        {
          ...(v as ProductVariant),
          price_modifier: Number(v.price_modifier) || 0,
        } as ProductVariant,
      ])
    );

    const resolvedLines: Array<{
      product: Product;
      variant: ProductVariant | null;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const ci of cartRows) {
      const product = prodMap.get(String(ci.product_id));
      if (!product || product.is_deleted || product.status === 'draft') {
        throw new Error('One or more products in your cart are no longer available.');
      }
      const qty = Math.max(1, Number(ci.quantity));
      if (product.stock_quantity < qty) {
        throw new Error(`Insufficient stock for "${product.title}". Available: ${product.stock_quantity}`);
      }
      const variant = ci.variant_id ? varMap.get(String(ci.variant_id)) ?? null : null;
      const unitPrice = getEffectivePrice(product, variant?.price_modifier ?? 0);
      resolvedLines.push({ product, variant, quantity: qty, unitPrice });
    }

    const subtotal = resolvedLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    let couponId: string | null = null;
    let couponCode: string | null = null;
    let discountAmount = 0;

    if (payload.coupon_code?.trim()) {
      const validated = await validateCoupon(payload.coupon_code.trim(), subtotal);
      couponId = validated.coupon.id;
      couponCode = validated.coupon.code;
      discountAmount = validated.discountAmount;
    }

    const totals = calculateCartTotals(
      resolvedLines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity })),
      settings,
      discountAmount
    );

    if (payload.save_address) {
      const { count } = await supabase
        .from('addresses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      await supabase.from('addresses').insert({
        user_id: userId,
        full_name: addr.full_name.trim(),
        phone: addr.phone.trim(),
        address_line1: addr.address_line1.trim(),
        city: addr.city.trim(),
        area: addr.area?.trim() || '',
        postal_code: addr.postal_code?.trim() || '',
        is_default: (count ?? 0) === 0,
      });
    }

    const orderNumber = `ZM-${Date.now().toString().slice(-6)}`;
    const { data: createdOrder, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        customer_name: addr.full_name.trim() || profile?.full_name || null,
        customer_email: addr.email?.trim() || profile?.email || null,
        status: 'pending',
        payment_method: payload.payment_method,
        payment_status: 'pending',
        payment_proof_url: payload.payment_proof_url || null,
        subtotal: totals.subtotal,
        shipping_cost: totals.shippingCost,
        discount_amount: totals.discountAmount,
        total: totals.total,
        coupon_id: couponId,
        coupon_code: couponCode,
        shipping_address: addr,
      })
      .select('*')
      .single();

    if (orderErr || !createdOrder) {
      throw new Error(orderErr?.message || 'Failed to place order.');
    }

    const orderItemsPayload = resolvedLines.map((l) => ({
      order_id: createdOrder.id,
      product_id: l.product.id,
      variant_id: l.variant?.id ?? null,
      product_title: l.product.title,
      product_image: l.product.images[0] ?? null,
      variant_info: l.variant ? `${l.variant.variant_name}: ${l.variant.variant_value}` : null,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      total_price: l.unitPrice * l.quantity,
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsPayload);
    if (itemsErr) throw new Error(itemsErr.message);

    // Decrement stock + record coupon usage + clear cart
    await Promise.all([
      ...resolvedLines.map((l) =>
        supabase.rpc('decrement_product_stock', {
          p_product_id: l.product.id,
          p_qty: l.quantity,
        })
      ),
      ...(couponId
        ? [
            supabase.from('coupon_usages').insert({
              coupon_id: couponId,
              user_id: userId,
              order_id: createdOrder.id,
            }),
            supabase.rpc('increment_coupon_used_count', { p_coupon_id: couponId }),
          ]
        : []),
      supabase.from('cart_items').delete().eq('user_id', userId),
    ]);

    const [hydrated] = await hydrateSupabaseOrders([createdOrder as Record<string, unknown>]);
    return hydrated;
  }

  return apiRequest<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getUserOrders(): Promise<Order[]> {
  if (isSupabaseConfigured) {
    const userId = await getCurrentSupabaseUserId();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return hydrateSupabaseOrders((data ?? []) as Array<Record<string, unknown>>);
  }

  return apiRequest<Order[]>('/api/orders');
}

export async function getOrderById(id: string): Promise<Order> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Order not found.');
    const [hydrated] = await hydrateSupabaseOrders([data as Record<string, unknown>]);
    return hydrated;
  }

  return apiRequest<Order>(`/api/orders/${encodeURIComponent(id)}`);
}

export async function cancelOrder(id: string, reason?: string): Promise<Order> {
  if (isSupabaseConfigured) {
    const order = await getOrderById(id);
    if (!canCancelOrder(order.status)) {
      throw new Error('Only pending orders can be cancelled.');
    }
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancel_reason: reason?.trim() || 'Cancelled by customer',
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Unable to cancel order.');
    const [hydrated] = await hydrateSupabaseOrders([data as Record<string, unknown>]);
    return hydrated;
  }

  return apiRequest<Order>(`/api/orders/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function requestReturn(id: string, reason: string): Promise<Order> {
  if (isSupabaseConfigured) {
    const order = await getOrderById(id);
    if (!canRequestReturn(order.status, order.created_at)) {
      throw new Error('Return requests are only eligible within 7 days of delivery.');
    }
    const { data, error } = await supabase
      .from('orders')
      .update({
        return_requested: true,
        return_reason: reason.trim(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Unable to request return.');
    const [hydrated] = await hydrateSupabaseOrders([data as Record<string, unknown>]);
    return hydrated;
  }

  return apiRequest<Order>(`/api/orders/${encodeURIComponent(id)}/return`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<{ coupon: Coupon; discountAmount: number }> {
  if (isSupabaseConfigured) {
    const userId = await getCurrentSupabaseUserId();
    const normalized = code.trim().toUpperCase();
    const { data: couponRow, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', normalized)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const coupon = couponRow
      ? ({
          ...(couponRow as Coupon),
          value: Number(couponRow.value),
          min_order_amount: Number(couponRow.min_order_amount),
          used_count: Number(couponRow.used_count),
        } as Coupon)
      : undefined;

    let hasUsed = false;
    if (coupon) {
      const { data: usage } = await supabase
        .from('coupon_usages')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId)
        .maybeSingle();
      hasUsed = Boolean(usage);
    }

    const result = validateAndCalculateCoupon(coupon, subtotal, hasUsed);
    if (!result.valid || !coupon) {
      throw new Error(result.error || 'Invalid coupon code.');
    }
    return { coupon, discountAmount: result.discountAmount };
  }

  return apiRequest<{ coupon: Coupon; discountAmount: number }>('/api/coupons/validate', {
    method: 'POST',
    body: JSON.stringify({ code, subtotal }),
  });
}

export async function getAddresses(): Promise<Address[]> {
  if (isSupabaseConfigured) {
    const userId = await getCurrentSupabaseUserId();
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Address[];
  }

  return apiRequest<Address[]>('/api/addresses');
}

export async function createAddress(
  data: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Address> {
  if (isSupabaseConfigured) {
    const userId = await getCurrentSupabaseUserId();
    if (data.is_default) {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
    }
    const { data: created, error } = await supabase
      .from('addresses')
      .insert({ ...data, user_id: userId })
      .select('*')
      .single();
    if (error || !created) throw new Error(error?.message || 'Unable to save address');
    return created as Address;
  }

  return apiRequest<Address>('/api/addresses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAddress(
  id: string,
  data: Partial<Omit<Address, 'id' | 'user_id' | 'created_at'>>
): Promise<Address> {
  if (isSupabaseConfigured) {
    const userId = await getCurrentSupabaseUserId();
    if (data.is_default) {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
    }
    const { data: updated, error } = await supabase
      .from('addresses')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error || !updated) throw new Error(error?.message || 'Unable to update address');
    return updated as Address;
  }

  return apiRequest<Address>(`/api/addresses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAddress(id: string): Promise<{ ok: boolean }> {
  if (isSupabaseConfigured) {
    const userId = await getCurrentSupabaseUserId();
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  }

  return apiRequest<{ ok: boolean }>(`/api/addresses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
