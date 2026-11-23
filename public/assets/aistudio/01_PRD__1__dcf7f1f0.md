# 01 — Product Requirements Document (PRD)
## Project: Zyro Mall — Online E-Commerce Platform

---

## 1. Project Overview

**Product Name:** Zyro Mall  
**Type:** Full-featured online e-commerce store  
**Market:** Pakistan  
**Currency:** PKR (Pakistani Rupee)  
**Language:** English (UI), Urdu support optional in future  
**Goal:** A complete multi-category online shopping platform where customers can browse, purchase, and track products, while a single admin manages everything from a secure dashboard.

---

## 2. Target Users

| Role | Description |
|------|-------------|
| **Guest** | Can browse products, search, filter, view details. Cannot checkout without registering. |
| **Customer** | Registered user. Can add to cart/wishlist, checkout, track orders, write reviews. |
| **Admin** | Single super-admin. Full control of products, orders, customers, coupons, reports. |

---

## 3. User Roles & Permissions

| Feature | Guest | Customer | Admin |
|---------|-------|----------|-------|
| Browse products | ✅ | ✅ | ✅ |
| Search & Filter | ✅ | ✅ | ✅ |
| Add to Cart | ❌ (prompt login) | ✅ | — |
| Wishlist | ❌ | ✅ | — |
| Checkout | ❌ | ✅ | — |
| Order History | ❌ | ✅ | — |
| Write Reviews | ❌ | ✅ (after purchase) | — |
| Admin Dashboard | ❌ | ❌ | ✅ |

---

## 4. Features — Customer Side

### 4.1 Authentication
- Register with email + password
- Login / Logout
- Forgot password (email reset)
- Google OAuth (optional, Phase 2)
- Protected routes for cart, checkout, profile, orders

### 4.2 Homepage
- Hero banner (admin-managed)
- Featured categories
- Featured / trending products
- New arrivals section
- Promo banner

### 4.3 Product Listing Page (PLP)
- Grid view (default) + list view toggle
- Infinite scroll or pagination (12/24/48 per page)
- Breadcrumb navigation
- Sort by: Newest, Price Low-High, Price High-Low, Best Rated
- Filter by: Category, Price Range (slider), Rating, In Stock only

### 4.4 Product Detail Page (PDP)
- Multi-image gallery (thumbnail + zoom)
- Product title, description, SKU
- Price (original + sale price if discounted)
- Stock status (In Stock / Out of Stock / Low Stock warning)
- Quantity selector
- Add to Cart button
- Add to Wishlist button
- Product variants (size/color if applicable)
- Average rating + review count
- Reviews section (paginated)
- Related products (same category)
- Share product (copy link)

### 4.5 Shopping Cart
- Add / remove / update quantity
- Product image + name + price in cart
- Subtotal auto-calculate
- Apply coupon/promo code
- Cart persists on login (Supabase)
- Proceed to Checkout button

### 4.6 Wishlist
- Add/remove products
- Move item from wishlist to cart
- Wishlist count in header

### 4.7 Checkout Flow
**Step 1 — Shipping Info:**
- Full name, phone number, email
- Full address (city, area, postal code)
- Save address for future (optional)

**Step 2 — Payment Method:**
- Cash on Delivery (COD)
- JazzCash (manual instruction / QR)
- EasyPaisa (manual instruction / QR)
- Credit/Debit Card via Stripe

**Step 3 — Order Review:**
- Items, quantities, prices
- Shipping cost (flat rate or free above threshold)
- Coupon discount (if applied)
- Grand total
- Place Order button

**Step 4 — Order Confirmation:**
- Success screen with order ID
- Estimated delivery info
- Email confirmation sent

### 4.8 Order Management (Customer)
- Order History list (all past orders)
- Order Detail page: items, status, timeline
- Order Status: Pending → Confirmed → Processing → Shipped → Delivered / Cancelled
- Cancel order (only if Pending)
- Return/Refund request (after delivery)

### 4.9 User Profile
- View/edit personal info
- Change password
- Saved addresses (add/edit/delete, set default)
- My Reviews tab

### 4.10 Reviews & Ratings
- Star rating (1-5) + text comment
- Only verified purchasers can review
- One review per product per user
- Edit own review
- Average rating shown on PDP

### 4.11 Search
- Global search bar in header
- Real-time suggestions (product names)
- Search results page with same filters as PLP

### 4.12 Coupon / Promo Codes
- Enter code at cart
- Types: percentage discount, flat amount off
- Validity: expiry date, usage limit, minimum order amount
- Error messages: invalid, expired, minimum not met

### 4.13 Notifications
- Email: order confirmation, status updates, password reset
- In-app: order status badge in header

---

## 5. Features — Admin Dashboard

### 5.1 Admin Auth
- Separate admin login (email + password)
- Admin route protection (non-admins cannot access /admin/*)
- Session-based with Supabase RLS

### 5.2 Dashboard Overview
- Total sales (today, this week, this month)
- Total orders (by status)
- Total customers
- Revenue chart (last 30 days)
- Recent orders table
- Low stock alerts

### 5.3 Product Management
- List all products (search, filter by category/status)
- Add new product:
  - Title, description, SKU, category
  - Multiple images (upload to Supabase Storage)
  - Price + sale price (optional)
  - Stock quantity
  - Variants (size/color — optional)
  - Status (Active / Draft / Out of Stock)
- Edit product
- Delete product (soft delete)
- Bulk status change

### 5.4 Category Management
- Add / edit / delete categories
- Category image (optional)
- Nested subcategories (1 level deep)
- Assign products to categories

### 5.5 Order Management
- All orders list (filterable by status, date, payment method)
- Order detail view
- Update order status manually
- Add tracking number / notes
- Cancel order (with reason)
- View customer info

### 5.6 Customer Management
- List all customers
- View customer profile + order history
- Block / unblock customer

### 5.7 Coupon Management
- Create coupon: code, type (%), amount, min order, expiry, usage limit
- Enable / disable coupon
- View usage stats

### 5.8 Inventory Management
- Stock overview
- Low stock threshold alert (configurable)
- Quick stock update from product list

### 5.9 Review Moderation
- View all reviews
- Approve / reject / delete reviews
- Filter by product or rating

### 5.10 Banner Management
- Upload/update hero banner images
- Set promo banners (title, image, link)

### 5.11 Sales Reports
- Revenue by date range
- Orders by status breakdown
- Best-selling products
- Export to CSV

### 5.12 Settings
- Store name, logo, contact info
- Shipping flat rate / free shipping threshold
- COD availability toggle
- Maintenance mode toggle

---

## 6. Business Rules

1. Guest users cannot checkout — they are prompted to login/register.
2. Coupon codes are case-insensitive and single-use per customer.
3. Product reviews are allowed only for customers who have a Delivered order containing that product.
4. Admin cannot be registered from the frontend — admin is set directly in Supabase.
5. Out-of-stock products remain visible but "Add to Cart" is disabled.
6. Orders once Shipped cannot be cancelled by customer.
7. Shipping cost: flat PKR amount (configurable by admin), free above a threshold.
8. Stripe is used for card payments; JazzCash/EasyPaisa are manual (customer sees account info and uploads proof or admin confirms manually).
9. All prices stored and displayed in PKR.
10. Soft delete for products (archived, not removed from DB) to preserve order history integrity.

---

## 7. Non-Functional Requirements

| Requirement | Detail |
|-------------|--------|
| Performance | Page load < 3s, images lazy-loaded, optimized queries |
| Security | Supabase RLS on all tables, no secrets in frontend |
| Responsive | Mobile-first, works on 320px–1920px screens |
| Scalability | Supabase handles growth; pagination on all lists |
| Accessibility | Keyboard navigable, ARIA labels, sufficient contrast |
| SEO | Semantic HTML, meta tags, clean URLs (/products/slug) |

---

## 8. Scope & Exclusions

**In Scope:**
- Full customer shopping flow
- Admin dashboard
- Supabase backend
- Cloudflare deployment

**Out of Scope (Future):**
- Mobile app
- Multi-vendor marketplace
- Automated courier API integration
- Multi-language UI
- Loyalty points system
