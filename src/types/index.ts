export type UserRole = 'customer' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  is_blocked: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string;
  product_count?: number;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  category_name?: string;
  tagline: string;
  description: string;
  details: string;
  city: string;
  whatsapp_number: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  product_count?: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  variant_value: string;
  price_modifier: number;
  stock_quantity: number;
  sku?: string | null;
}

export type ProductStatus = 'active' | 'draft' | 'out_of_stock';

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  sku: string;
  category_id: string | null;
  category_name?: string;
  category_slug?: string;
  business_id?: string | null;
  business_name?: string;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  images: string[];
  status: ProductStatus;
  is_deleted: boolean;
  is_featured?: boolean;
  rating_avg?: number;
  review_count?: number;
  variants?: ProductVariant[];
  meta_title?: string | null;
  meta_description?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  city: string;
  area: string;
  postal_code: string;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
}

export type CouponType = 'percentage' | 'flat';

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  user_id: string;
  order_id: string;
  used_at: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cod' | 'jazzcash' | 'easypaisa';
export type PaymentStatus = 'pending' | 'confirmed' | 'paid' | 'failed';

export interface ShippingAddress {
  full_name: string;
  phone: string;
  email?: string;
  address_line1: string;
  city: string;
  area: string;
  postal_code: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_title: string;
  product_image: string | null;
  variant_info: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name?: string;
  customer_email?: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_proof_url?: string | null;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  total: number;
  coupon_id: string | null;
  coupon_code?: string | null;
  shipping_address: ShippingAddress;
  tracking_number: string | null;
  admin_notes: string | null;
  cancel_reason: string | null;
  return_requested?: boolean;
  return_reason?: string | null;
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product?: Product;
  variant?: ProductVariant | null;
  created_at: string;
  updated_at?: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  product?: Product;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  product_title?: string;
  user_id: string;
  user_name?: string;
  order_id: string | null;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  type: 'hero' | 'promo';
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface StoreSettings {
  id: number;
  store_name: string;
  store_logo_url: string | null;
  contact_email: string;
  contact_phone: string;
  flat_shipping_cost: number;
  free_shipping_threshold: number;
  cod_enabled: boolean;
  low_stock_threshold: number;
  maintenance_mode: boolean;
  whatsapp_number: string;
  admin_poster_enabled: boolean;
  admin_poster_title: string;
  admin_poster_subtitle: string;
  admin_poster_image_url: string;
  admin_poster_cta_label: string;
  admin_poster_cta_url: string;
  updated_at: string;
}

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'best_rated';

export interface ProductFilters {
  category?: string;
  business?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly?: boolean;
  sort?: SortOption;
  status?: ProductStatus | 'all';
}
