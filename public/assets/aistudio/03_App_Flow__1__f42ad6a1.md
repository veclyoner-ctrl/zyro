# 03 — App Flow (User & Admin Experience)
## Project: Zyro Mall — Online E-Commerce Platform

---

## 1. Auth Flow

### 1.1 Registration
```
/register
  → User fills: full name, email, phone, password
  → Client validation (all required, valid email, password ≥ 8 chars)
  → supabase.auth.signUp()
  → On success: profile row auto-created via trigger (role = 'customer')
  → Redirect to /  (or last visited page)
  → Header shows: user avatar, cart icon, wishlist icon

Error states:
  → Email already exists: "This email is already registered. Login instead."
  → Weak password: inline error
  → Network error: toast "Something went wrong. Try again."
```

### 1.2 Login
```
/login
  → Email + password
  → supabase.auth.signInWithPassword()
  → On success: redirect to intended page (or /)
  → If role = 'admin': show "Go to Admin Dashboard" link in header

Error states:
  → Wrong credentials: "Invalid email or password."
  → Blocked account: "Your account has been blocked. Contact support."
```

### 1.3 Forgot Password
```
/forgot-password
  → Enter email
  → supabase.auth.resetPasswordForEmail()
  → Success screen: "Check your email for a reset link"
  → Reset link opens /reset-password → user sets new password
```

### 1.4 Logout
```
  → Header dropdown → Logout
  → supabase.auth.signOut()
  → Cart/wishlist cleared from context
  → Redirect to /
```

---

## 2. Customer Flow

### 2.1 Homepage
```
/ (Home)
  → Hero banner (clickable, links to promo page/category)
  → Featured Categories grid (click → /products?category=slug)
  → Trending Products (8 cards) → click → /products/:slug
  → New Arrivals (8 cards)
  → Promo Banner (admin-set image + link)
  → Footer with links, contact info
```

### 2.2 Product Listing Flow
```
/products  OR  /products?category=slug  OR  /search?q=term

Left sidebar / top filter bar:
  → Category filter (checkboxes)
  → Price range slider (PKR 0 — 100,000)
  → Rating filter (4★+, 3★+, etc.)
  → In Stock only toggle

Sort bar:
  → Newest | Price: Low to High | Price: High to Low | Best Rated

Product Grid:
  → 12 products per page (pagination)
  → Each card: image, title, price (strike sale price), rating, Add to Cart (quick)

Loading state: skeleton cards (12 placeholders)
Empty state: "No products found. Try different filters."
Error state: "Failed to load products. Retry button."
```

### 2.3 Product Detail Flow
```
/products/:slug

  → Image gallery (main + thumbnails, click to zoom)
  → Breadcrumb: Home > Category > Product Name
  → Title, SKU, rating summary (X reviews)
  → Price display:
      If sale_price exists: show sale_price in red + original strikethrough
      Else: show price
  → Stock badge: 
      stock > 10: "In Stock" (green)
      stock 1-10: "Only X left!" (orange)
      stock 0: "Out of Stock" (red, button disabled)
  → Quantity selector (min 1, max = stock_quantity)
  → [Add to Cart] button (disabled if out of stock / not logged in → prompt login)
  → [Add to Wishlist] heart icon
  → Description tab | Reviews tab
  → Reviews section:
      Average stars, total count
      List of reviews (paginated, 5 per page)
      If user is verified purchaser: show "Write a Review" form
  → Related Products (4 cards, same category)
```

### 2.4 Cart Flow
```
/cart (protected — redirect to /login if not auth)

  → Cart items list: image, name, variant, price, quantity stepper, remove (X)
  → Each item row updates subtotal live
  → Coupon section:
      Input + Apply button
      Success: show discount line
      Error: "Invalid code" / "Expired" / "Min order PKR X required"
  → Order summary:
      Subtotal
      Shipping (flat PKR 200 / Free above 5000 / configurable)
      Discount (if coupon applied)
      Grand Total
  → [Proceed to Checkout] button
  → Empty state: "Your cart is empty." + Shop Now button
```

### 2.5 Checkout Flow
```
/checkout (protected)

Step 1 — Shipping Info:
  → Full name, phone, email (pre-filled from profile)
  → Address line 1, City, Area/District, Postal Code
  → Toggle: Save this address
  → If saved addresses exist: show "Select saved address" dropdown
  → [Continue] button

Step 2 — Payment Method:
  → Radio buttons:
      💵 Cash on Delivery
      📱 JazzCash (shows account #: 03XX-XXXXXXX after selecting)
      📱 EasyPaisa (shows account # after selecting)
      💳 Credit / Debit Card (Stripe)
  → JazzCash/EasyPaisa: file upload for payment proof
  → [Continue] button

Step 3 — Order Review:
  → Items list (readonly)
  → Shipping address summary
  → Payment method summary
  → Pricing breakdown
  → [Place Order] button

On Place Order:
  → If Stripe: redirect to Stripe Checkout → return to /order-confirmation/:id
  → If COD/Jazz/Easy: insert order to DB → redirect to /order-confirmation/:id

Error states:
  → Form validation errors (inline)
  → Payment failure: "Payment failed. Try again or use COD."
  → Stock check failure: "X item is now out of stock. Update your cart."
```

### 2.6 Order Confirmation
```
/order-confirmation/:orderId

  → ✅ Green checkmark
  → "Thank you, [Name]! Your order #ZM-XXXXX is confirmed."
  → Estimated delivery: 3-5 business days
  → Order summary table
  → [Track Order] button → /orders/:orderId
  → [Continue Shopping] → /
```

### 2.7 Order History & Tracking
```
/orders (protected)
  → List of all orders
  → Each row: order #, date, total, status badge, [View] button

/orders/:orderId
  → Order details: items, quantities, prices
  → Shipping address
  → Payment method + status
  → Status timeline:
      ● Pending → ● Confirmed → ● Processing → ● Shipped → ● Delivered
  → Tracking number (if added by admin)
  → [Cancel Order] button (only if status = 'pending')
  → [Request Return/Refund] button (only if status = 'delivered', within 7 days)
```

### 2.8 Wishlist
```
/wishlist (protected)
  → Grid of wishlisted products
  → Each card: image, name, price, stock status
  → [Move to Cart] button
  → [Remove] (X) button
  → Empty state: "No items in your wishlist." + Shop Now
```

### 2.9 User Profile
```
/profile (protected)

Tabs:
  → Personal Info: edit full name, phone, email, [Save]
  → Change Password: current pw, new pw, confirm, [Update]
  → Addresses: list saved addresses, add new, edit, delete, set default
  → My Reviews: list of reviews written by user
```

---

## 3. Admin Flow

### 3.1 Admin Login
```
/login (same page, role check after login)
  → If role = 'admin': show banner "Welcome back, Admin! Go to Dashboard"
  → Or direct: /admin
  → Non-admin trying to access /admin/*: redirect to / with toast "Access denied"
```

### 3.2 Admin Dashboard
```
/admin

  Sidebar nav:
    Dashboard | Products | Categories | Orders | Customers |
    Coupons | Reviews | Banners | Reports | Settings | Logout

  Main area:
    → Stat cards: Total Revenue, Total Orders, New Customers, Pending Orders
    → Revenue chart: line chart (last 30 days)
    → Recent Orders table (last 10): order #, customer, total, status, [View]
    → Low Stock Alerts list (products with stock ≤ threshold)
```

### 3.3 Product Management
```
/admin/products
  → Search bar + Category filter + Status filter
  → Table: image thumbnail, title, SKU, category, price, stock, status, [Edit] [Delete]
  → [+ Add Product] button → /admin/products/new

/admin/products/new  AND  /admin/products/:id/edit
  → Form fields:
      Title*, Description* (rich text), SKU*, Category* (dropdown)
      Price* (PKR), Sale Price (optional)
      Stock Quantity*
      Images: multi-upload (drag & drop, max 8, to Supabase Storage)
      Status: Active / Draft / Out of Stock
      Variants (optional): add size/color options
  → [Save Draft] | [Publish]
  → Success toast → redirect to /admin/products
  → Delete: soft delete with confirmation modal "Are you sure?"
```

### 3.4 Category Management
```
/admin/categories
  → Table: category name, slug, parent (if sub), product count, [Edit] [Delete]
  → [+ Add Category] → modal:
      Name*, Slug (auto-generated), Parent Category (optional), Image (optional)
  → Inline edit
  → Delete: warning if products assigned
```

### 3.5 Order Management
```
/admin/orders
  → Filters: Status | Payment Method | Date Range | Search by order # / customer name
  → Table: order #, customer, date, total, payment method, status, [View]

/admin/orders/:id
  → Order details: items table, quantities, prices
  → Customer info (name, phone, email, address)
  → Payment info + proof image (if JazzCash/EasyPaisa)
  → Status update dropdown: [Pending → Confirmed → Processing → Shipped → Delivered]
  → Tracking number input + save
  → Notes field (internal admin notes)
  → [Confirm Payment] button (for manual payment methods)
  → [Cancel Order] with reason input
```

### 3.6 Customer Management
```
/admin/customers
  → Table: name, email, phone, orders count, joined date, status, [View] [Block]

Customer Profile (modal or page):
  → Personal info
  → Order history list
  → [Block / Unblock] toggle with confirmation
```

### 3.7 Coupon Management
```
/admin/coupons
  → Table: code, type, value, min order, expiry, usage count, status, [Edit] [Disable]
  → [+ Create Coupon] → form:
      Code (auto-generate or manual), Type (% / flat PKR),
      Value, Min Order Amount, Expiry Date, Usage Limit
  → Toggle Active/Inactive
```

### 3.8 Review Moderation
```
/admin/reviews
  → Filter by: Pending / Approved / All | Product | Rating
  → Table: product, customer, rating, comment snippet, date, status, [Approve] [Delete]
  → Default: reviews are auto-approved; admin can delete inappropriate ones
```

### 3.9 Banner Management
```
/admin/banners
  → Hero banners: upload image, set link URL, order/priority, enable/disable
  → Promo banner: title text, image, link, active toggle
```

### 3.10 Reports
```
/admin/reports
  → Date range picker
  → Revenue line chart
  → Orders by status pie chart
  → Best-selling products table (top 10)
  → [Export CSV] button (orders data for selected range)
```

### 3.11 Settings
```
/admin/settings
  → Store name, store logo (upload)
  → Contact email, phone
  → Shipping: Flat rate (PKR), Free shipping above (PKR)
  → COD: Enable / Disable toggle
  → Low stock alert threshold (default: 5)
  → Maintenance mode toggle (shows maintenance page to customers)
  → [Save Settings]
```

---

## 4. Global States

| State | UI |
|-------|-----|
| Loading | Skeleton screens or spinner overlay |
| Empty | Illustrated empty state with CTA button |
| Error | Toast notification + retry option |
| Success | Green toast / success screen |
| Unauthorized | Redirect to /login with "Please login to continue" |
| Admin unauthorized | Redirect to / with "Access denied" toast |
| Maintenance mode | Full-screen maintenance page (admin can still access /admin) |
| Out of stock | Button disabled, grey badge |

---

## 5. Navigation Structure

### Customer Header
```
Logo | Search bar | [Wishlist icon + count] | [Cart icon + count] | [User avatar dropdown]
User dropdown: My Orders | Profile | Logout
```

### Customer Footer
```
Links: About | Contact | Privacy Policy | Terms
Payment icons: COD | JazzCash | EasyPaisa | Visa/MC
Social links
Copyright: © 2024 Zyro Mall
```

### Admin Sidebar
```
📊 Dashboard
📦 Products
🏷️ Categories
🛒 Orders
👥 Customers
🎟️ Coupons
⭐ Reviews
🖼️ Banners
📈 Reports
⚙️ Settings
🚪 Logout
```
