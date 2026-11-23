# 04 — UI/UX Design Brief
## Project: Zyro Mall — Online E-Commerce Platform

---

## 1. Design Philosophy

**Style:** Modern, clean, trust-inspiring e-commerce  
**Feel:** Professional but approachable — like a premium Pakistani online store  
**Inspiration:** Daraz.pk (familiarity) + modern international e-commerce (clean layouts)  
**Principle:** Every design decision serves conversion — make it easy to find, trust, and buy.

---

## 2. Color Palette

### Primary Brand Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#FF6B35` | CTA buttons, links, highlights, badges |
| `primary-dark` | `#E55A26` | Button hover state |
| `primary-light` | `#FFF0EA` | Backgrounds, chips, light highlights |

### Neutral Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#F8F8F8` | Page background |
| `surface` | `#FFFFFF` | Cards, panels, modals |
| `border` | `#E8E8E8` | Dividers, card borders |
| `text-primary` | `#1A1A1A` | Headings, body text |
| `text-secondary` | `#6B7280` | Subtext, labels, placeholders |
| `text-muted` | `#9CA3AF` | Disabled text, hints |

### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#22C55E` | In stock, confirmed, success toasts |
| `warning` | `#F59E0B` | Low stock, pending status |
| `danger` | `#EF4444` | Out of stock, errors, cancel |
| `info` | `#3B82F6` | Info messages, processing status |

### Admin Dashboard
| Token | Hex | Usage |
|-------|-----|-------|
| `admin-sidebar` | `#1E293B` | Dark sidebar |
| `admin-sidebar-text` | `#CBD5E1` | Sidebar nav text |
| `admin-sidebar-active` | `#FF6B35` | Active nav item |

---

## 3. Typography

### Font Family
- **Primary:** `Inter` (Google Fonts) — clean, highly legible, modern
- **Fallback:** `system-ui, -apple-system, sans-serif`

### Type Scale
| Element | Size | Weight | Usage |
|---------|------|--------|-------|
| H1 | 36px / 2.25rem | 700 | Page hero titles |
| H2 | 28px / 1.75rem | 700 | Section headings |
| H3 | 22px / 1.375rem | 600 | Card titles, section sub-heads |
| H4 | 18px / 1.125rem | 600 | Product titles on PDP |
| Body Large | 16px | 400 | Main body text |
| Body | 14px | 400 | Default text, descriptions |
| Body Small | 13px | 400 | Labels, helper text, metadata |
| Caption | 12px | 400 | Fine print, timestamps |
| Price | 20px | 700 | Product prices (bold) |
| Price Strike | 16px | 400 | Strikethrough original price |

---

## 4. Layout & Grid

### Breakpoints
| Name | Width | Layout |
|------|-------|--------|
| Mobile | < 640px | 1 column, stacked |
| Tablet | 640–1024px | 2 columns |
| Desktop | > 1024px | 3–4 columns with sidebar |

### Page Layout
```
[Header — full width, sticky, 64px height]
[Page Content — max-width: 1280px, centered, px-4 (mobile) px-8 (desktop)]
[Footer — full width]
```

### Product Grid
- Mobile: 2 columns
- Tablet: 3 columns
- Desktop: 4 columns
- Gap: 16px
- Card aspect ratio: image 4:3, uniform height

### Admin Layout
```
[Admin Sidebar — 240px wide, fixed, dark]
[Admin Content — flex-1, padding 24px, light background]
[Admin Header bar — 64px, white, with breadcrumb + user info]
```

---

## 5. Components

### 5.1 Buttons
```
Primary Button:
  bg: #FF6B35, text: white, rounded-lg (8px)
  padding: 12px 24px, font-weight: 600
  hover: #E55A26, active: scale(0.98)
  disabled: opacity-50, cursor-not-allowed

Secondary Button:
  bg: white, border: 1.5px solid #FF6B35, text: #FF6B35
  hover: bg #FFF0EA

Danger Button:
  bg: #EF4444, text: white
  hover: #DC2626

Ghost Button:
  bg: transparent, text: #6B7280
  hover: bg #F3F4F6

Icon Button:
  Square, 40x40px, rounded-full or rounded-lg
```

### 5.2 Input Fields
```
height: 44px, border-radius: 8px
border: 1.5px solid #E8E8E8
focus: border #FF6B35, ring-2 ring-orange-100
error: border #EF4444, helper text in red below
placeholder: #9CA3AF
padding: 12px 16px
```

### 5.3 Product Card
```
┌──────────────────────┐
│   [Product Image]    │  ← 100%, aspect-ratio 4:3, object-cover
│                      │  ← Wishlist heart icon (top-right, overlay)
│   [Sale Badge]       │  ← "SALE" badge (top-left, red, if sale_price)
├──────────────────────┤
│ Category name        │  ← 12px, text-secondary
│ Product Title        │  ← 14px, font-medium, 2-line clamp
│ ★★★★☆ (4.2) 128     │  ← Stars + count
│ PKR 2,500  ~~3,200~~ │  ← Price + strike
│ [Add to Cart]        │  ← Full-width, primary button
└──────────────────────┘
hover: card shadow-md, slight scale(1.02)
```

### 5.4 Cart Drawer (Slide-in)
- Slides in from right on cart icon click
- Semi-transparent backdrop
- Cart items list, coupon input, total, checkout button
- Close on backdrop click or X button

### 5.5 Toast Notifications
- Position: top-right
- Types: success (green), error (red), info (blue), warning (yellow)
- Auto-dismiss: 4 seconds
- Max 3 toasts stacked

### 5.6 Modal / Dialog
- Centered overlay with backdrop blur
- Max-width: 480px (mobile: full-screen)
- Header (title + X button), content, footer (action buttons)
- Close on ESC or backdrop click

### 5.7 Badges / Status Chips
```
In Stock:     bg-green-100  text-green-700  rounded-full
Out of Stock: bg-red-100    text-red-700    rounded-full
Low Stock:    bg-orange-100 text-orange-700 rounded-full
Pending:      bg-yellow-100 text-yellow-700 rounded-full
Confirmed:    bg-blue-100   text-blue-700   rounded-full
Shipped:      bg-purple-100 text-purple-700 rounded-full
Delivered:    bg-green-100  text-green-700  rounded-full
Cancelled:    bg-gray-100   text-gray-600   rounded-full
```

### 5.8 Pagination
- Previous / Next arrows + numbered pages
- Current page: filled primary circle
- Max 5 visible pages with ellipsis

### 5.9 Star Rating
- Filled stars: `#FF6B35` (orange)
- Empty stars: `#E8E8E8` (light grey)
- Interactive (for review form): hover highlights

### 5.10 Skeleton Loader
- Matching the shape of the content (card, table row, etc.)
- Animated shimmer effect (left-to-right wave)
- Color: `#F0F0F0` to `#E0E0E0`

---

## 6. Header (Customer)

```
Desktop:
┌────────────────────────────────────────────────────────────────┐
│ [Zyro Mall Logo]  [Search bar — wide]  [♡ 3] [🛒 5] [👤 ▾]   │
└────────────────────────────────────────────────────────────────┘
Category nav bar: All | Fashion | Electronics | Home | Sports | ...

Mobile:
┌──────────────────────────────────────┐
│ [☰ Menu]  [Logo]  [🔍] [🛒 5]       │
└──────────────────────────────────────┘
Mobile menu: full-screen slide-in drawer from left
```

---

## 7. Homepage Sections

### Hero Banner
- Full-width, height 420px (desktop) / 220px (mobile)
- Swiper carousel with 3 banners (auto-play + dot navigation)
- Text overlay: headline, sub-text, CTA button
- Background gradient overlay for readability

### Category Grid
- 6–8 category tiles: circular image + name
- 2 rows × 4 cols on desktop, scrollable horizontal on mobile

### Product Sections
- Section title (left) + "View All →" link (right)
- Horizontal scroll on mobile, grid on desktop
- Loading: 4 skeleton cards

---

## 8. Responsive Behavior

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Navbar | Hamburger menu | Partial | Full |
| Product grid | 2 cols | 3 cols | 4 cols |
| Filters | Bottom sheet / modal | Sidebar collapsible | Left sidebar fixed |
| Cart | Full page | Drawer (480px) | Drawer (480px) |
| Checkout | Single column | Two column | Two column |
| Admin sidebar | Hidden (hamburger) | Collapsible | Fixed 240px |

---

## 9. Animations & Interactions

| Interaction | Animation |
|------------|-----------|
| Page transition | Fade in (200ms) |
| Modal open | Scale from 95% + fade (200ms) |
| Cart drawer | Slide from right (300ms ease) |
| Button click | Scale 0.98 (100ms) |
| Card hover | Shadow increase + scale 1.02 (200ms) |
| Toast | Slide in from top-right (300ms) |
| Skeleton | Shimmer wave animation |
| Quantity stepper | Number transition (instant) |

---

## 10. Icons

- **Library:** Lucide React (consistent, clean, tree-shakeable)
- Key icons: ShoppingCart, Heart, Search, User, Menu, ChevronDown, Star, Package, Truck, CheckCircle, XCircle, AlertTriangle, Edit, Trash2, Plus, Minus, Eye, Download

---

## 11. Images & Media

- **Product images:** 800×800px recommended, auto-compressed on upload
- **Banner images:** 1440×480px (desktop) + 768×300px (mobile variant)
- **Category images:** 300×300px, circular crop
- **Placeholder:** Soft grey with Zyro Mall logo watermark
- **Alt text:** Always populated from product title

---

## 12. Accessibility

- All buttons have `aria-label` where icon-only
- Form inputs linked to labels via `htmlFor`
- Color contrast ratio ≥ 4.5:1 for all text
- Focus rings visible on keyboard navigation
- Skip-to-content link at top of page
- Images always have descriptive `alt` attributes
- Modal traps focus while open (focus-trap pattern)

---

## 13. Admin Dashboard UI

- **Style:** Clean data-focused design; not flashy
- **Sidebar:** Dark (`#1E293B`), icons + labels, active item in orange
- **Tables:** Striped rows, hover highlight, sticky header
- **Charts:** Recharts library — line chart for revenue, pie for order status
- **Forms:** 2-column layout on desktop, single column on mobile
- **Action colors:** Edit = blue, Delete = red, View = grey

---

## 14. Error & Empty State Illustrations

- Use simple SVG illustrations (inline, no external CDN)
- Empty cart: shopping cart outline with "Start shopping!"
- No results: magnifier with X
- Order placed: checkmark with confetti (subtle)
- Error: warning triangle with retry button
