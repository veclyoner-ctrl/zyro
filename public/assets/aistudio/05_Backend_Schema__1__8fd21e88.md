# 05 — Backend Schema
## Project: Zyro Mall — Online E-Commerce Platform

> **Note:** This is a planning document only. The actual database will be created in Supabase by ChatGPT using the GitHub + Supabase plugins, following this exact schema.

---

## 1. Database: PostgreSQL (Supabase)

All tables are in the `public` schema unless noted.  
UUID is used as primary key for all tables.  
`created_at` and `updated_at` are present on all tables (auto-managed).

---

## 2. Tables

---

### 2.1 `profiles`
Extends Supabase `auth.users`. Created automatically via trigger on user signup.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, FK → `auth.users.id` ON DELETE CASCADE | Matches auth user ID |
| `email` | `text` | NOT NULL | User email |
| `full_name` | `text` | | Display name |
| `phone` | `text` | | Phone number |
| `role` | `text` | NOT NULL, DEFAULT `'customer'`, CHECK IN ('customer','admin') | User role |
| `is_blocked` | `boolean` | NOT NULL, DEFAULT `false` | Admin can block |
| `avatar_url` | `text` | | Profile picture URL |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Trigger:** `handle_new_user()` — on INSERT to `auth.users` → inserts into `profiles`  
**RLS:**
- SELECT: user can read own profile; admin can read all
- UPDATE: user can update own profile; admin can update any
- INSERT: via trigger only

---

### 2.2 `categories`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `name` | `text` | NOT NULL, UNIQUE | Category name |
| `slug` | `text` | NOT NULL, UNIQUE | URL-friendly name |
| `parent_id` | `uuid` | FK → `categories.id`, NULL = top-level | For subcategories |
| `image_url` | `text` | | Category image |
| `is_active` | `boolean` | NOT NULL, DEFAULT `true` | Show/hide |
| `sort_order` | `integer` | DEFAULT `0` | Display order |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**RLS:**
- SELECT: public (all can read active categories)
- INSERT/UPDATE/DELETE: admin only

---

### 2.3 `products`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `title` | `text` | NOT NULL | Product name |
| `slug` | `text` | NOT NULL, UNIQUE | URL slug |
| `description` | `text` | | Full description |
| `sku` | `text` | NOT NULL, UNIQUE | Stock keeping unit |
| `category_id` | `uuid` | FK → `categories.id`, SET NULL | |
| `price` | `numeric(10,2)` | NOT NULL, CHECK > 0 | Original price (PKR) |
| `sale_price` | `numeric(10,2)` | NULL, CHECK > 0 | Sale price if discounted |
| `stock_quantity` | `integer` | NOT NULL, DEFAULT `0`, CHECK >= 0 | Current stock |
| `images` | `text[]` | NOT NULL, DEFAULT `'{}'` | Array of Supabase Storage URLs |
| `status` | `text` | NOT NULL, DEFAULT `'draft'`, CHECK IN ('active','draft','out_of_stock') | |
| `is_deleted` | `boolean` | NOT NULL, DEFAULT `false` | Soft delete |
| `meta_title` | `text` | | SEO title |
| `meta_description` | `text` | | SEO description |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Indexes:** `slug`, `category_id`, `status`, `is_deleted`  
**RLS:**
- SELECT: public (active, non-deleted products); admin sees all including drafts
- INSERT/UPDATE/DELETE: admin only

---

### 2.4 `product_variants`
Optional. For products with size/color options.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `product_id` | `uuid` | FK → `products.id` ON DELETE CASCADE | |
| `variant_name` | `text` | NOT NULL | e.g. "Size", "Color" |
| `variant_value` | `text` | NOT NULL | e.g. "XL", "Red" |
| `price_modifier` | `numeric(10,2)` | DEFAULT `0` | Added to base price |
| `stock_quantity` | `integer` | NOT NULL, DEFAULT `0` | |
| `sku` | `text` | | Variant-specific SKU |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**RLS:** Same as `products`

---

### 2.5 `addresses`
Customer saved addresses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `profiles.id` ON DELETE CASCADE | |
| `full_name` | `text` | NOT NULL | Recipient name |
| `phone` | `text` | NOT NULL | Contact number |
| `address_line1` | `text` | NOT NULL | Street address |
| `city` | `text` | NOT NULL | City |
| `area` | `text` | | Area/District |
| `postal_code` | `text` | | Postal code |
| `is_default` | `boolean` | DEFAULT `false` | Default address flag |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**RLS:**
- SELECT/INSERT/UPDATE/DELETE: user can manage own addresses only; admin can read all

---

### 2.6 `coupons`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `code` | `text` | NOT NULL, UNIQUE | Promo code (stored uppercase) |
| `type` | `text` | NOT NULL, CHECK IN ('percentage','flat') | Discount type |
| `value` | `numeric(10,2)` | NOT NULL, CHECK > 0 | Discount value |
| `min_order_amount` | `numeric(10,2)` | DEFAULT `0` | Minimum cart total |
| `max_uses` | `integer` | NULL = unlimited | Total usage limit |
| `used_count` | `integer` | NOT NULL, DEFAULT `0` | Total times used |
| `expires_at` | `timestamptz` | NULL = no expiry | |
| `is_active` | `boolean` | NOT NULL, DEFAULT `true` | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**RLS:**
- SELECT: authenticated users (to validate code); admin sees all
- INSERT/UPDATE/DELETE: admin only

---

### 2.7 `orders`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `order_number` | `text` | NOT NULL, UNIQUE | e.g. ZM-20240001 |
| `user_id` | `uuid` | FK → `profiles.id` ON DELETE SET NULL | NULL if user deleted |
| `status` | `text` | NOT NULL, DEFAULT `'pending'`, CHECK IN ('pending','confirmed','processing','shipped','delivered','cancelled') | |
| `payment_method` | `text` | NOT NULL, CHECK IN ('cod','jazzcash','easypaisa','stripe') | |
| `payment_status` | `text` | NOT NULL, DEFAULT `'pending'`, CHECK IN ('pending','confirmed','paid','failed') | |
| `payment_proof_url` | `text` | | Uploaded JazzCash/EasyPaisa screenshot |
| `stripe_session_id` | `text` | | Stripe Checkout session ID |
| `subtotal` | `numeric(10,2)` | NOT NULL | Before discounts + shipping |
| `shipping_cost` | `numeric(10,2)` | NOT NULL, DEFAULT `0` | |
| `discount_amount` | `numeric(10,2)` | NOT NULL, DEFAULT `0` | Coupon discount |
| `total` | `numeric(10,2)` | NOT NULL | Final amount |
| `coupon_id` | `uuid` | FK → `coupons.id` ON DELETE SET NULL | Applied coupon |
| `shipping_address` | `jsonb` | NOT NULL | Snapshot of address at time of order |
| `tracking_number` | `text` | | Added by admin |
| `admin_notes` | `text` | | Internal notes |
| `cancel_reason` | `text` | | Reason for cancellation |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

`shipping_address` JSONB structure:
```json
{
  "full_name": "string",
  "phone": "string",
  "address_line1": "string",
  "city": "string",
  "area": "string",
  "postal_code": "string"
}
```

**Indexes:** `user_id`, `status`, `payment_status`, `order_number`, `created_at`  
**RLS:**
- SELECT: user sees own orders; admin sees all
- INSERT: authenticated users (customer places order)
- UPDATE: admin only (status, tracking, notes); customer can cancel if status = 'pending'

**Function:** `generate_order_number()` — trigger on INSERT generates `ZM-YYYYMMDD-XXXX`

---

### 2.8 `order_items`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `order_id` | `uuid` | FK → `orders.id` ON DELETE CASCADE | |
| `product_id` | `uuid` | FK → `products.id` ON DELETE SET NULL | NULL if product deleted |
| `variant_id` | `uuid` | FK → `product_variants.id`, NULL | Optional |
| `product_title` | `text` | NOT NULL | Snapshot of name at purchase |
| `product_image` | `text` | | Snapshot of first image |
| `variant_info` | `text` | | e.g. "Size: XL / Color: Red" |
| `quantity` | `integer` | NOT NULL, CHECK > 0 | |
| `unit_price` | `numeric(10,2)` | NOT NULL | Price at time of purchase |
| `total_price` | `numeric(10,2)` | NOT NULL | quantity × unit_price |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**RLS:** Same as `orders` (via JOIN)

---

### 2.9 `cart_items`
Persistent cart (synced to DB for logged-in users).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `profiles.id` ON DELETE CASCADE | |
| `product_id` | `uuid` | FK → `products.id` ON DELETE CASCADE | |
| `variant_id` | `uuid` | NULL | |
| `quantity` | `integer` | NOT NULL, CHECK > 0 | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Unique constraint:** `(user_id, product_id, variant_id)`  
**RLS:** User can only read/write own cart items; admin can read all

---

### 2.10 `wishlist_items`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `profiles.id` ON DELETE CASCADE | |
| `product_id` | `uuid` | FK → `products.id` ON DELETE CASCADE | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**Unique constraint:** `(user_id, product_id)`  
**RLS:** User can only manage own wishlist

---

### 2.11 `reviews`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `product_id` | `uuid` | FK → `products.id` ON DELETE CASCADE | |
| `user_id` | `uuid` | FK → `profiles.id` ON DELETE CASCADE | |
| `order_id` | `uuid` | FK → `orders.id` | To verify purchase |
| `rating` | `integer` | NOT NULL, CHECK BETWEEN 1 AND 5 | |
| `comment` | `text` | | |
| `is_approved` | `boolean` | NOT NULL, DEFAULT `true` | Admin can remove |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Unique constraint:** `(user_id, product_id)` — one review per product per user  
**RLS:**
- SELECT: public (approved reviews only); admin sees all
- INSERT: authenticated user who has a 'delivered' order containing the product
- UPDATE: user updates own review; admin updates `is_approved`
- DELETE: admin only

---

### 2.12 `banners`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | |
| `title` | `text` | | Display title |
| `subtitle` | `text` | | Subtitle text |
| `image_url` | `text` | NOT NULL | Supabase Storage URL |
| `link_url` | `text` | | Click destination |
| `type` | `text` | CHECK IN ('hero','promo') | |
| `sort_order` | `integer` | DEFAULT `0` | |
| `is_active` | `boolean` | DEFAULT `true` | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**RLS:** Public SELECT; admin INSERT/UPDATE/DELETE

---

### 2.13 `store_settings`
Single-row configuration table.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `integer` | PK, DEFAULT 1 | Always 1 |
| `store_name` | `text` | `'Zyro Mall'` | |
| `store_logo_url` | `text` | | |
| `contact_email` | `text` | | |
| `contact_phone` | `text` | | |
| `flat_shipping_cost` | `numeric(10,2)` | `200` | PKR |
| `free_shipping_threshold` | `numeric(10,2)` | `5000` | PKR |
| `cod_enabled` | `boolean` | `true` | |
| `low_stock_threshold` | `integer` | `5` | Alert below this |
| `maintenance_mode` | `boolean` | `false` | |
| `updated_at` | `timestamptz` | `now()` | |

**RLS:** Public SELECT; admin UPDATE only

---

### 2.14 `coupon_usages`
Track which customer used which coupon (prevent double use).

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `coupon_id` | `uuid` | FK → `coupons.id` |
| `user_id` | `uuid` | FK → `profiles.id` |
| `order_id` | `uuid` | FK → `orders.id` |
| `used_at` | `timestamptz` | DEFAULT `now()` |

**Unique constraint:** `(coupon_id, user_id)` — one use per coupon per user  
**RLS:** Admin reads all; system inserts on order placement

---

## 3. Storage Buckets

| Bucket | Access | Allowed Types | Max Size |
|--------|--------|--------------|----------|
| `product-images` | Public read, auth write | jpg, png, webp | 5MB |
| `banners` | Public read, auth write | jpg, png, webp | 5MB |
| `store-assets` | Public read, admin write | jpg, png, svg | 2MB |
| `payment-proofs` | Private (admin read only) | jpg, png, pdf | 10MB |

**Storage RLS Policies:**
- `product-images`: anyone can read; authenticated admin can upload/delete
- `payment-proofs`: only admin can SELECT; authenticated users can INSERT (upload proof)

---

## 4. Database Functions & Triggers

### 4.1 `handle_new_user()` (Trigger)
- **On:** INSERT on `auth.users`
- **Action:** INSERT into `profiles` (id, email, full_name from raw_user_meta_data, role = 'customer')

### 4.2 `generate_order_number()` (Trigger)
- **On:** INSERT on `orders`
- **Action:** Generates `order_number` as `ZM-YYYYMMDD-XXXX` (sequential per day)

### 4.3 `update_updated_at()` (Trigger)
- **On:** UPDATE on all major tables
- **Action:** Sets `updated_at = now()`

### 4.4 `update_product_stock()` (Function)
- Called when order is confirmed/placed
- Decrements `products.stock_quantity` by ordered quantity
- Sets status to `'out_of_stock'` if stock reaches 0

### 4.5 `update_coupon_usage()` (Function)
- Called on order placement with coupon
- Increments `coupons.used_count`
- Inserts into `coupon_usages`

### 4.6 `validate_review_purchase()` (Function)
- Checks if user has a 'delivered' order containing the product before allowing review INSERT
- Used as an RLS policy condition

---

## 5. Key RLS Policy Summary

| Table | Public Read | Customer Read | Customer Write | Admin |
|-------|------------|---------------|----------------|-------|
| `profiles` | ❌ | Own only | Own only | All |
| `categories` | Active only | Active only | ❌ | Full |
| `products` | Active only | Active only | ❌ | Full |
| `cart_items` | ❌ | Own only | Own only | Read |
| `wishlist_items` | ❌ | Own only | Own only | Read |
| `orders` | ❌ | Own only | Insert + cancel own | Full |
| `order_items` | ❌ | Via own orders | Via order | Full |
| `reviews` | Approved | Approved | Insert if purchased | Full |
| `coupons` | ❌ | Validate only | ❌ | Full |
| `banners` | Active only | Active only | ❌ | Full |
| `store_settings` | ✅ | ✅ | ❌ | Update |
| `addresses` | ❌ | Own only | Own only | Read |

---

## 6. Environment Variables Used by Backend

```
VITE_SUPABASE_URL          → Supabase project URL
VITE_SUPABASE_ANON_KEY     → Supabase anon/publishable key
VITE_STRIPE_PUBLISHABLE_KEY → Stripe publishable key (frontend only)

# Supabase Edge Function secrets (NOT in frontend):
STRIPE_SECRET_KEY          → For creating Stripe Checkout sessions
SUPABASE_SERVICE_ROLE_KEY  → For admin server-side operations (Edge Functions only)
```
