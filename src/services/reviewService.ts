import { apiRequest } from './api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Review } from '../types';

export async function getProductReviews(productId: string): Promise<Review[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Review[];
  }

  return apiRequest<Review[]>(`/api/reviews?productId=${encodeURIComponent(productId)}`);
}

export async function getUserReviews(userId: string): Promise<Review[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Review[];
  }

  return apiRequest<Review[]>(`/api/reviews?userId=${encodeURIComponent(userId)}`);
}

export async function checkReviewEligibility(productId: string): Promise<{
  canReview: boolean;
  hasPurchased: boolean;
  existingReview: Review | null;
}> {
  if (isSupabaseConfigured) {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      return { canReview: false, hasPurchased: false, existingReview: null };
    }

    const [{ data: existing }, { data: userOrders }] = await Promise.all([
      supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('orders')
        .select('id, status')
        .eq('user_id', userId)
        .neq('status', 'cancelled'),
    ]);

    const orderIds = (userOrders ?? []).map((o) => String(o.id));
    let hasPurchased = false;
    if (orderIds.length > 0) {
      const { data: matchedItems } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', productId)
        .in('order_id', orderIds)
        .limit(1);
      hasPurchased = (matchedItems?.length ?? 0) > 0;
    }

    return {
      canReview: hasPurchased && !existing,
      hasPurchased,
      existingReview: (existing as Review | null) ?? null,
    };
  }

  return apiRequest(`/api/reviews/eligibility/${encodeURIComponent(productId)}`);
}

export async function createReview(payload: {
  product_id: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  if (isSupabaseConfigured) {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) throw new Error('Authentication required');

    const [{ data: profile }, { data: product }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
      supabase.from('products').select('title').eq('id', payload.product_id).maybeSingle(),
    ]);

    const { data: created, error } = await supabase
      .from('reviews')
      .insert({
        product_id: payload.product_id,
        product_title: product?.title || null,
        user_id: userId,
        user_name: profile?.full_name || 'Verified Buyer',
        rating: Math.max(1, Math.min(5, Math.round(payload.rating))),
        comment: payload.comment.trim(),
        is_approved: true,
      })
      .select('*')
      .single();
    if (error || !created) throw new Error(error?.message || 'Unable to submit review.');
    return created as Review;
  }

  return apiRequest<Review>('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateReview(
  id: string,
  payload: { rating?: number; comment?: string }
): Promise<Review> {
  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase
      .from('reviews')
      .update({
        ...(payload.rating !== undefined
          ? { rating: Math.max(1, Math.min(5, Math.round(payload.rating))) }
          : {}),
        ...(payload.comment !== undefined ? { comment: payload.comment.trim() } : {}),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error || !updated) throw new Error(error?.message || 'Unable to update review.');
    return updated as Review;
  }

  return apiRequest<Review>(`/api/reviews/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
