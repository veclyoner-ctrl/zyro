# 06 — Implementation Plan
## Project: Zyro Mall — Online E-Commerce Platform

> **For Google AI Studio:** This is an internal build execution plan. Build the complete website in one pass. Do NOT wait for instructions between phases — execute all phases sequentially and deliver a fully working React + TypeScript application.

---

## Build Overview

| Metric | Value |
|--------|-------|
| **Framework** | React 18 + TypeScript (Vite) |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State** | React Context + TanStack Query |
| **Backend** | Supabase (Supabase-ready code only — no DB setup here) |
| **Payment** | Stripe (publishable key only) |
| **Deployment target** | Cloudflare Workers & Pages |

---

## Phase 1 — Project Setup & Configuration

**Goal:** Working Vite + React + TypeScript scaffold with all dependencies installed and configured.

### Tasks:
1. Initialize Vite project: `npm create vite@latest zyro-mall -- --template react-ts`
2. Install all dependencies:
   ```
   npm install @supabase/supabase-js @tanstack/react-query react-router-dom
   npm install @stripe/stripe-js
   npm install lucide-react
   npm install recharts
   npm install react-hot-toast
   npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-slider @radix-ui/react-tabs @radix-ui/react-toast
   npm install clsx tailwind-merge class-variance-authority
   npm install -D tailwindcss postcss autoprefixer
   ```
3. Configure `tailwind.config.ts` with custom colors (orange primary `#FF6B35`, neutral palette from Design Brief)
4. Configure `vite.config.ts`
5. Create `.env.example` with all required VITE_ variables
6. Create `.npmrc` with `legacy-peer-deps=true`
7. Create `public/_redirects` with `/* /index.html 200`
8. Set up `src/lib/supabase.ts` — Supabase client using `import.meta.env`
9. Set up `src/lib/stripe.ts` — Stripe.js with publishable key
10. Set up `src/lib/utils.ts` — `cn()`, `formatPrice()` (PKR), `formatDate()` helpers
11. Set up `src/types/index.ts` — all TypeScript interfaces (Profile, Product, Category, Order, OrderItem, CartItem, WishlistItem, Review, Coupon, Banner, StoreSettings, Address, ProductVariant)

### Checkpoint: App compiles, blank homepage renders, no TypeScript errors.

---

## Phase 2 — Design System & Layout Components

**Goal:** All reusable UI components and layout shells ready.

### Tasks:
1. Set up shadcn/ui base components (Button, Input, Select, Dialog, Tabs, Badge, Card, Skeleton)
2. Build `components/ui/` — extend shadcn with custom variants matching Design Brief colors
3. Build `components/layout/Navbar.tsx`:
   - Logo (text "Zyro Mall" with orange accent)
   - Search bar (debounced, 300ms)
   - Wishlist icon + count badge
   - Cart icon + count badge (opens CartDrawer)
   - User avatar dropdown (My Orders, Profile, Logout) OR Login/Register links
   - Mobile: hamburger → full-screen drawer
   - Category nav bar below header
4. Build `components/layout/Footer.tsx`
5. Build `components/layout/AdminSidebar.tsx` (dark `#1E293B`, orange active state)
6. Build `components/layout/AdminHeader.tsx` (breadcrumb + user info)
7. Build `components/common/LoadingSpinner.tsx`
8. Build `components/common/SkeletonCard.tsx` (product card skeleton)
9. Build `components/common/EmptyState.tsx` (props: icon, title, description, ctaLabel, ctaLink)
10. Build `components/common/ErrorState.tsx` (retry button)
11. Build `components/common/StatusBadge.tsx` (order status + payment status + stock status)
12. Build `components/common/StarRating.tsx` (display + interactive modes)
13. Build `components/common/Pagination.tsx`
14. Build `components/common/ConfirmModal.tsx` (generic confirmation dialog)
15. Build `components/cart/CartDrawer.tsx` (slide-in from right, CartItem list, coupon input, totals, Checkout button)
16. Build `components/cart/CartItem.tsx`
17. Set up `App.tsx` with React Router routes (all routes defined, pages as lazy imports)
18. Set up route guards: `ProtectedRoute.tsx` (customer auth) + `AdminRoute.tsx` (admin role check)

### Checkpoint: Navbar renders, cart drawer opens/closes, routing works, 404 → redirect home.

---

## Phase 3 — Context & State Management

**Goal:** Auth, Cart, and Wishlist state working end-to-end with Supabase.

### Tasks:
1. `contexts/AuthContext.tsx`:
   - `supabase.auth.getSession()` on mount
   - `onAuthStateChange` listener
   - Provides: `user`, `profile`, `isAdmin`, `isLoading`, `signOut()`
2. `contexts/CartContext.tsx`:
   - Loads `cart_items` from Supabase on login
   - `addToCart()`, `removeFromCart()`, `updateQuantity()`, `clearCart()`
   - `cartCount`, `cartTotal` computed values
   - Syncs to Supabase on change
3. `contexts/WishlistContext.tsx`:
   - Loads `wishlist_items` from Supabase on login
   - `addToWishlist()`, `removeFromWishlist()`, `isWishlisted()`
   - `wishlistCount`
4. Wrap `App.tsx` with all providers: `QueryClientProvider > AuthProvider > CartProvider > WishlistProvider`
5. Set up TanStack Query `QueryClient` with `staleTime: 5 * 60 * 1000`

---

## Phase 4 — Service Layer

**Goal:** All Supabase queries centralized in service files.

### Tasks:
1. `services/productService.ts`:
   - `getProducts(filters, page, perPage)` — with category, price range, rating, status filters
   - `getProductBySlug(slug)`
   - `getRelatedProducts(categoryId, excludeId)`
   - `searchProducts(query)`
   - `getFeaturedProducts(limit)`
   - `getNewArrivals(limit)`
2. `services/categoryService.ts`:
   - `getCategories()` — active, ordered
   - `getCategoryBySlug(slug)`
3. `services/cartService.ts` — CRUD for cart_items (also handled via Context)
4. `services/orderService.ts`:
   - `createOrder(orderData)` — validates stock, applies coupon, creates order + order_items
   - `getOrderById(id)` — user must own or be admin
   - `getUserOrders(userId)`
   - `cancelOrder(id)` — only if status = 'pending'
   - `requestReturn(orderId)` — creates return request note
5. `services/reviewService.ts`:
   - `getProductReviews(productId, page)`
   - `createReview(data)` — validates user has delivered order with product
   - `updateReview(id, data)`
6. `services/couponService.ts`:
   - `validateCoupon(code, cartTotal, userId)` — returns discount or error
7. `services/bannerService.ts` — `getBanners(type)`
8. `services/settingsService.ts` — `getStoreSettings()`
9. `services/adminService.ts`:
   - Admin-only: product CRUD, category CRUD, order status updates, customer management, coupon CRUD, review moderation, reports queries, banner management, settings update

---

## Phase 5 — Customer Pages

**Goal:** All customer-facing pages built and functional.

### Build order:

1. **`pages/Home.tsx`**
   - Hero banner carousel (Swiper or manual CSS)
   - Featured Categories grid
   - Trending Products section (useQuery → getFeaturedProducts)
   - New Arrivals section
   - Promo Banner

2. **`pages/ProductListing.tsx`**
   - URL param parsing (`?category=`, `?sort=`, `?page=`)
   - Filter sidebar (category checkboxes, price slider, rating, in-stock)
   - Sort bar
   - Product grid with `ProductCard` components
   - Pagination
   - Loading: 12 skeleton cards
   - Empty + error states

3. **`components/product/ProductCard.tsx`**
   - Image (lazy), sale badge, wishlist button, title (2-line clamp), stars, price, Add to Cart

4. **`pages/ProductDetail.tsx`**
   - Image gallery with thumbnails
   - All product info
   - Quantity selector (respects stock)
   - Add to Cart / Wishlist
   - Tabs: Description | Reviews
   - Reviews list + Write Review form (gated by purchase verification)
   - Related products

5. **`pages/Search.tsx`**
   - Query from URL `?q=term`
   - Same grid + filter layout as ProductListing
   - Real-time search suggestions in Navbar search bar

6. **`pages/Cart.tsx`**
   - Full page cart (or cart is always drawer — implement as full page for /cart route)
   - Coupon validation UI
   - Order summary
   - Checkout button

7. **`pages/Wishlist.tsx`**
   - Grid of wishlisted products with Move to Cart + Remove

8. **`pages/Checkout.tsx`**
   - 3-step form with step indicator
   - Step 1: Shipping (with saved addresses)
   - Step 2: Payment method selection
   - Step 3: Review + Place Order
   - Stripe redirect logic

9. **`pages/OrderConfirmation.tsx`**
   - Success screen, order summary, track + continue shopping

10. **`pages/OrderHistory.tsx`**
    - List of orders with status badges

11. **`pages/OrderDetail.tsx`**
    - Full order details, status timeline, cancel/return actions

12. **`pages/Profile.tsx`**
    - Tabs: Personal Info | Change Password | Addresses | My Reviews

13. **`pages/Login.tsx`** / **`pages/Register.tsx`** / **`pages/ForgotPassword.tsx`**
    - Clean centered forms with Zyro Mall branding

### Checkpoint: Customer can register, browse, add to cart, wishlist, checkout (COD flow), view orders.

---

## Phase 6 — Admin Dashboard

**Goal:** Full admin panel functional with all management features.

### Build order:

1. **`pages/admin/AdminDashboard.tsx`**
   - Stat cards (total revenue, orders, customers, pending orders)
   - Recharts LineChart (revenue last 30 days)
   - Recent orders table
   - Low stock alerts list

2. **`pages/admin/AdminProducts.tsx`**
   - Table with search/filter
   - Bulk actions dropdown
   - Delete with confirmation

3. **`pages/admin/AdminProductForm.tsx`** (new + edit)
   - All fields including multi-image drag-drop upload to Supabase Storage
   - Variant management (add/remove rows)
   - Preview of selected images

4. **`pages/admin/AdminCategories.tsx`**
   - Table + inline add/edit modal
   - Parent category dropdown

5. **`pages/admin/AdminOrders.tsx`**
   - Filterable table, all orders

6. **`pages/admin/AdminOrderDetail.tsx`**
   - Status update dropdown, tracking number, payment confirmation, notes

7. **`pages/admin/AdminCustomers.tsx`**
   - Customer table, block/unblock

8. **`pages/admin/AdminCoupons.tsx`**
   - Coupon table + create form modal

9. **`pages/admin/AdminReviews.tsx`**
   - Review moderation table

10. **`pages/admin/AdminBanners.tsx`**
    - Upload + manage hero/promo banners

11. **`pages/admin/AdminReports.tsx`**
    - Date range picker, charts, CSV export

12. **`pages/admin/AdminSettings.tsx`**
    - Settings form (store info, shipping costs, toggles)

### Checkpoint: Admin can login, manage products/categories/orders, update order status.

---

## Phase 7 — Polish, QA & Final Checks

### Tasks:
1. All `loading` states: skeleton screens on every async data fetch
2. All `empty` states: illustrated empty states with CTAs
3. All `error` states: error boundary + retry buttons
4. Toast notifications: all success/error actions trigger toasts (react-hot-toast)
5. Mobile responsiveness: test all pages at 375px, 768px, 1280px
6. Keyboard navigation: tab order, focus rings, ESC closes modals
7. All routes tested: protected routes redirect, admin routes block non-admins
8. TypeScript: `tsc --noEmit` passes with zero errors
9. Build test: `npm run build` completes successfully
10. Verify `public/_redirects` exists for SPA routing
11. Verify `.npmrc` exists with `legacy-peer-deps=true`
12. Verify no hardcoded secrets or API keys in code
13. Verify all `import.meta.env.VITE_*` variables are used (no hardcoded URLs)

---

## Final File Structure Verification

Before export to GitHub, confirm these files exist:
```
✅ public/_redirects           → /* /index.html 200
✅ .npmrc                      → legacy-peer-deps=true
✅ .env.example                → all VITE_ variables listed
✅ src/lib/supabase.ts         → client using import.meta.env
✅ tsconfig.json               → strict mode
✅ vite.config.ts              → standard Vite config
✅ package.json                → build script: "build": "tsc && vite build"
✅ tailwind.config.ts          → custom colors from Design Brief
✅ NO bun.lock / bun.lockb     → delete if present
✅ NO hardcoded secrets        → all env vars from import.meta.env
```

---

## Dependencies Reference

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2",
    "@tanstack/react-query": "^5",
    "@stripe/stripe-js": "^3",
    "react-router-dom": "^6",
    "lucide-react": "^0.400+",
    "recharts": "^2",
    "react-hot-toast": "^2",
    "@radix-ui/react-dialog": "^1",
    "@radix-ui/react-dropdown-menu": "^2",
    "@radix-ui/react-select": "^2",
    "@radix-ui/react-slider": "^1",
    "@radix-ui/react-tabs": "^1",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "class-variance-authority": "^0.7"
  },
  "devDependencies": {
    "tailwindcss": "^3",
    "postcss": "^8",
    "autoprefixer": "^10",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "vite": "^5",
    "@vitejs/plugin-react": "^4"
  }
}
```
