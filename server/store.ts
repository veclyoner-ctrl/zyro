import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  isSupabaseServerConfigured,
  loadDatabaseFromSupabase,
  syncStateChangesToSupabase,
} from './supabase';
import { generateCategoryCatalogTopUp } from './catalogSeed';
import type {
  Address,
  Banner,
  Business,
  CartItem,
  Category,
  Coupon,
  CouponUsage,
  Order,
  Product,
  Profile,
  Review,
  StoreSettings,
  WishlistItem,
} from '../src/types';

export interface StoredUser extends Profile {
  password_hash: string;
}

export interface DatabaseState {
  users: StoredUser[];
  categories: Category[];
  businesses: Business[];
  products: Product[];
  addresses: Address[];
  coupons: Coupon[];
  coupon_usages: CouponUsage[];
  orders: Order[];
  cart_items: CartItem[];
  wishlist_items: WishlistItem[];
  reviews: Review[];
  banners: Banner[];
  settings: StoreSettings;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'zyro-mall-db.json');

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`zyro_salt_${password}`).digest('hex');
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function createSeedState(): DatabaseState {
  const adminId = 'usr-admin-001';
  const customerId = 'usr-cust-001';
  const customer2Id = 'usr-cust-002';

  const categories: Category[] = [
    {
      id: 'cat-electronics',
      name: 'Electronics & Audio',
      slug: 'electronics',
      parent_id: null,
      image_url: '/src/assets/images/prod_headphones_1795178619261.jpg',
      is_active: true,
      sort_order: 1,
      created_at: daysAgoIso(60),
    },
    {
      id: 'cat-wearables',
      name: 'Smartwatches',
      slug: 'smartwatches',
      parent_id: 'cat-electronics',
      image_url: '/src/assets/images/prod_smartwatch_1795178619052.jpg',
      is_active: true,
      sort_order: 2,
      created_at: daysAgoIso(58),
    },
    {
      id: 'cat-fashion',
      name: 'Leather & Bags',
      slug: 'leather-bags',
      parent_id: null,
      image_url: '/src/assets/images/prod_leather_bag_1795178618645.jpg',
      is_active: true,
      sort_order: 3,
      created_at: daysAgoIso(55),
    },
    {
      id: 'cat-home',
      name: 'Home & Lighting',
      slug: 'home-lighting',
      parent_id: null,
      image_url: '/src/assets/images/prod_ceramic_lamp_1795178619287.jpg',
      is_active: true,
      sort_order: 4,
      created_at: daysAgoIso(50),
    },
    {
      id: 'cat-footwear',
      name: 'Athletic Footwear',
      slug: 'footwear',
      parent_id: null,
      image_url: '/src/assets/images/prod_running_shoes_1795178618844.jpg',
      is_active: true,
      sort_order: 5,
      created_at: daysAgoIso(48),
    },
    {
      id: 'cat-fragrance',
      name: 'Fragrances',
      slug: 'fragrances',
      parent_id: null,
      image_url: '/src/assets/images/prod_oud_perfume_1795178619239.jpg',
      is_active: true,
      sort_order: 6,
      created_at: daysAgoIso(45),
    },
    {
      id: 'cat-apparel',
      name: 'Fashion & Shirts',
      slug: 'fashion-apparel',
      parent_id: null,
      image_url: '/src/assets/images/prod_cotton_shirt_1795191691262.jpg',
      is_active: true,
      sort_order: 7,
      created_at: daysAgoIso(44),
    },
    {
      id: 'cat-kitchen',
      name: 'Kitchen & Dinnerware',
      slug: 'kitchen-dining',
      parent_id: null,
      image_url: '/src/assets/images/prod_dinner_set_1795191690947.jpg',
      is_active: true,
      sort_order: 8,
      created_at: daysAgoIso(43),
    },
    {
      id: 'cat-jewelry',
      name: 'Jewelry & Rings',
      slug: 'jewelry-rings',
      parent_id: null,
      image_url: '/src/assets/images/prod_silver_ring_1795191691586.jpg',
      is_active: true,
      sort_order: 9,
      created_at: daysAgoIso(42),
    },
  ];

  const businesses: Business[] = [
    {
      id: 'biz-lahore-loom',
      name: 'Lahore Loom Studio',
      slug: 'lahore-loom-studio',
      category_id: 'cat-apparel',
      tagline: 'Tailored Pakistani cotton shirts & smart casual apparel',
      description: 'Fine long-staple cotton menswear tailored in Lahore with nationwide Cash on Delivery.',
      details: 'Sizes S to XL available. 7-day easy exchange, breathable Oxford weave, and direct WhatsApp sizing assistance.',
      city: 'Lahore',
      whatsapp_number: '03296730804',
      image_url: '/src/assets/images/prod_cotton_shirt_1795191691262.jpg',
      is_active: true,
      created_at: daysAgoIso(40),
    },
    {
      id: 'biz-royal-tableware',
      name: 'Royal Tableware House',
      slug: 'royal-tableware-house',
      category_id: 'cat-kitchen',
      tagline: 'Fine porcelain dinner sets & dining hospitality collections',
      description: 'Gold-rimmed bone porcelain dinner sets and serving pieces packed in shock-safe foam boxes.',
      details: '24-piece and 36-piece family dinner sets with 100% breakage replacement guarantee across Pakistan.',
      city: 'Karachi',
      whatsapp_number: '03296730804',
      image_url: '/src/assets/images/prod_dinner_set_1795191690947.jpg',
      is_active: true,
      created_at: daysAgoIso(38),
    },
    {
      id: 'biz-margalla-jewels',
      name: 'Margalla Jewels & Gems',
      slug: 'margalla-jewels-gems',
      category_id: 'cat-jewelry',
      tagline: '925 sterling silver rings, solitaires & gift-boxed fine jewelry',
      description: 'Hallmarked 925 sterling silver rings and minimalist bridal sets crafted with precision cuts.',
      details: 'Includes velvet gift box, anti-tarnish cloth, and instant ring-size confirmation on WhatsApp.',
      city: 'Islamabad',
      whatsapp_number: '03296730804',
      image_url: '/src/assets/images/prod_silver_ring_1795191691586.jpg',
      is_active: true,
      created_at: daysAgoIso(36),
    },
    {
      id: 'biz-khyber-acoustics',
      name: 'Khyber Acoustics & Tech',
      slug: 'khyber-acoustics-tech',
      category_id: 'cat-electronics',
      tagline: 'ANC wireless headphones, titanium smartwatches & studio gear',
      description: 'Official 1-year warranty audio electronics and precision smart wearables.',
      details: 'Same-day dispatch in major cities with sealed box inspection upon delivery.',
      city: 'Lahore',
      whatsapp_number: '03296730804',
      image_url: '/src/assets/images/prod_headphones_1795178619261.jpg',
      is_active: true,
      created_at: daysAgoIso(35),
    },
    {
      id: 'biz-sialkot-leather',
      name: 'Sialkot Heritage Leather',
      slug: 'sialkot-heritage-leather',
      category_id: 'cat-fashion',
      tagline: 'Hand-stitched full-grain leather bags, satchels & accessories',
      description: 'Export-grade Sialkot leather goods crafted with solid brass hardware.',
      details: 'Lifetime stitch warranty and custom monogramming available via WhatsApp order booking.',
      city: 'Sialkot',
      whatsapp_number: '03296730804',
      image_url: '/src/assets/images/prod_leather_bag_1795178618645.jpg',
      is_active: true,
      created_at: daysAgoIso(34),
    },
  ];

  const products: Product[] = [
    {
      id: 'prod-001',
      title: 'Khyber ANC Studio Wireless Headphones',
      slug: 'khyber-anc-studio-wireless-headphones',
      description:
        'Flagship hybrid active noise-cancelling over-ear headphones engineered with brushed anodized aluminum yokes, breathable memory-foam acoustic cushions, 45-hour battery endurance, and USB-C fast charging. Tuned for crisp vocals and deep studio sub-bass.',
      sku: 'ZM-EL-101',
      category_id: 'cat-electronics',
      business_id: 'biz-khyber-acoustics',
      price: 24500,
      sale_price: 19900,
      stock_quantity: 28,
      images: [
        '/src/assets/images/prod_headphones_1795178619261.jpg',
        '/src/assets/images/hero_tech_banner_1795178618730.jpg',
      ],
      status: 'active',
      is_deleted: false,
      is_featured: true,
      variants: [
        {
          id: 'var-001-a',
          product_id: 'prod-001',
          variant_name: 'Color',
          variant_value: 'Matte Charcoal',
          price_modifier: 0,
          stock_quantity: 18,
          sku: 'ZM-EL-101-CHR',
        },
        {
          id: 'var-001-b',
          product_id: 'prod-001',
          variant_name: 'Color',
          variant_value: 'Warm Stone',
          price_modifier: 1000,
          stock_quantity: 10,
          sku: 'ZM-EL-101-STN',
        },
      ],
      created_at: daysAgoIso(25),
    },
    {
      id: 'prod-002',
      title: 'Margalla Titanium Smart Chronometer',
      slug: 'margalla-titanium-smart-chronometer',
      description:
        'Grade-5 brushed titanium case paired with a quick-dry woven nylon strap, sapphire crystal face, dual-band GPS, continuous heart-rate telemetry, and 10-day battery autonomy. Water-resistant to 50 meters.',
      sku: 'ZM-WR-204',
      category_id: 'cat-wearables',
      business_id: 'biz-khyber-acoustics',
      price: 32000,
      sale_price: 27500,
      stock_quantity: 14,
      images: ['/src/assets/images/prod_smartwatch_1795178619052.jpg'],
      status: 'active',
      is_deleted: false,
      is_featured: true,
      variants: [
        {
          id: 'var-002-a',
          product_id: 'prod-002',
          variant_name: 'Strap Size',
          variant_value: '42mm Regular',
          price_modifier: 0,
          stock_quantity: 8,
          sku: 'ZM-WR-204-42',
        },
        {
          id: 'var-002-b',
          product_id: 'prod-002',
          variant_name: 'Strap Size',
          variant_value: '46mm Large',
          price_modifier: 1500,
          stock_quantity: 6,
          sku: 'ZM-WR-204-46',
        },
      ],
      created_at: daysAgoIso(22),
    },
    {
      id: 'prod-003',
      title: 'Sialkot Full-Grain Cognac Messenger Satchel',
      slug: 'sialkot-full-grain-cognac-messenger-satchel',
      description:
        'Hand-stitched in Sialkot using vegetable-tanned full-grain cowhide leather and solid antique brass buckles. Features a padded 14-inch laptop sleeve, magnetic quick-release straps, and reinforced cotton twill lining.',
      sku: 'ZM-LB-309',
      category_id: 'cat-fashion',
      business_id: 'biz-sialkot-leather',
      price: 18500,
      sale_price: null,
      stock_quantity: 9,
      images: [
        '/src/assets/images/prod_leather_bag_1795178618645.jpg',
        '/src/assets/images/hero_fashion_banner_1795178618870.jpg',
      ],
      status: 'active',
      is_deleted: false,
      is_featured: true,
      variants: [
        {
          id: 'var-003-a',
          product_id: 'prod-003',
          variant_name: 'Finish',
          variant_value: 'Cognac Tan',
          price_modifier: 0,
          stock_quantity: 9,
          sku: 'ZM-LB-309-TAN',
        },
      ],
      created_at: daysAgoIso(18),
    },
    {
      id: 'prod-004',
      title: 'Multan Stoneware Ceramic Table Lamp',
      slug: 'multan-stoneware-ceramic-table-lamp',
      description:
        'Wheel-thrown matte stoneware ceramic base finished with a natural hand-loomed linen drum shade and braided fabric cord. Emits a soft 2700K warm architectural glow ideal for reading corners and bedside consoles.',
      sku: 'ZM-HL-412',
      category_id: 'cat-home',
      business_id: 'biz-royal-tableware',
      price: 11200,
      sale_price: 9400,
      stock_quantity: 4,
      images: ['/src/assets/images/prod_ceramic_lamp_1795178619287.jpg'],
      status: 'active',
      is_deleted: false,
      is_featured: true,
      variants: [],
      created_at: daysAgoIso(15),
    },
    {
      id: 'prod-005',
      title: 'Velocity Carbon-Stride Running Sneakers',
      slug: 'velocity-carbon-stride-running-sneakers',
      description:
        'Engineered dual-density EVA midsole with breathable open-weave mesh upper and high-abrasion carbon rubber outsole. Designed for daily road mileage in bone white, slate grey, and burnt terracotta trim.',
      sku: 'ZM-FW-518',
      category_id: 'cat-footwear',
      business_id: 'biz-sialkot-leather',
      price: 14800,
      sale_price: 12400,
      stock_quantity: 22,
      images: ['/src/assets/images/prod_running_shoes_1795178618844.jpg'],
      status: 'active',
      is_deleted: false,
      is_featured: true,
      variants: [
        {
          id: 'var-005-a',
          product_id: 'prod-005',
          variant_name: 'Size',
          variant_value: 'EU 41',
          price_modifier: 0,
          stock_quantity: 7,
          sku: 'ZM-FW-518-41',
        },
        {
          id: 'var-005-b',
          product_id: 'prod-005',
          variant_name: 'Size',
          variant_value: 'EU 42',
          price_modifier: 0,
          stock_quantity: 8,
          sku: 'ZM-FW-518-42',
        },
        {
          id: 'var-005-c',
          product_id: 'prod-005',
          variant_name: 'Size',
          variant_value: 'EU 43',
          price_modifier: 0,
          stock_quantity: 7,
          sku: 'ZM-FW-518-43',
        },
      ],
      created_at: daysAgoIso(12),
    },
    {
      id: 'prod-006',
      title: 'Aeterna Amber & Smoked Oak Eau de Parfum (50ml)',
      slug: 'aeterna-amber-smoked-oak-edp',
      description:
        'Long-lasting Extrait-strength fragrance opening with Calabrian bergamot and cardamom, settling into warm resinous amber, smoked Kashmiri cedar, and aged walnut woods. Housed in a faceted heavy glass flacon.',
      sku: 'ZM-FR-602',
      category_id: 'cat-fragrance',
      business_id: 'biz-margalla-jewels',
      price: 8900,
      sale_price: 7500,
      stock_quantity: 35,
      images: ['/src/assets/images/prod_oud_perfume_1795178619239.jpg'],
      status: 'active',
      is_deleted: false,
      is_featured: true,
      variants: [
        {
          id: 'var-006-a',
          product_id: 'prod-006',
          variant_name: 'Volume',
          variant_value: '50ml',
          price_modifier: 0,
          stock_quantity: 25,
          sku: 'ZM-FR-602-50',
        },
        {
          id: 'var-006-b',
          product_id: 'prod-006',
          variant_name: 'Volume',
          variant_value: '100ml',
          price_modifier: 4200,
          stock_quantity: 10,
          sku: 'ZM-FR-602-100',
        },
      ],
      created_at: daysAgoIso(10),
    },
    {
      id: 'prod-007',
      title: 'Studio Acoustic Ear-Cushion Travel Kit',
      slug: 'studio-acoustic-ear-cushion-travel-kit',
      description:
        'Precision-molded hardshell EVA carrying case with braided 3.5mm studio audio cable, airplane dual-pin adapter, and replacement protein-leather earpads compatible with Khyber ANC Headphones.',
      sku: 'ZM-EL-119',
      category_id: 'cat-electronics',
      business_id: 'biz-khyber-acoustics',
      price: 4200,
      sale_price: null,
      stock_quantity: 3,
      images: ['/src/assets/images/prod_headphones_1795178619261.jpg'],
      status: 'active',
      is_deleted: false,
      is_featured: false,
      variants: [],
      created_at: daysAgoIso(7),
    },
    {
      id: 'prod-008',
      title: 'Heritage Leather Weekender & Strap Duo',
      slug: 'heritage-leather-weekender-strap-duo',
      description:
        'Limited small-batch leather goods bundle combining our vegetable-tanned crossbody messenger with a matching 22mm stitched watch strap in burnished cognac.',
      sku: 'ZM-LB-325',
      category_id: 'cat-fashion',
      business_id: 'biz-sialkot-leather',
      price: 21500,
      sale_price: 18900,
      stock_quantity: 6,
      images: ['/src/assets/images/prod_leather_bag_1795178618645.jpg'],
      status: 'active',
      is_deleted: false,
      is_featured: false,
      variants: [],
      created_at: daysAgoIso(4),
    },
    {
      id: 'prod-009',
      title: 'Architectural Brass Desk Task Lamp',
      slug: 'architectural-brass-desk-task-lamp',
      description:
        'Counterbalanced brushed brass stem with matte obsidian aluminum hood and integrated touch dimmer. Engineered for focused architectural studio workspaces.',
      sku: 'ZM-HL-440',
      category_id: 'cat-home',
      business_id: 'biz-royal-tableware',
      price: 15600,
      sale_price: null,
      stock_quantity: 0,
      images: ['/src/assets/images/hero_tech_banner_1795178618730.jpg'],
      status: 'out_of_stock',
      is_deleted: false,
      is_featured: false,
      variants: [],
      created_at: daysAgoIso(3),
    },
    {
      id: 'prod-010',
      title: 'Alpine Trail Knit Runner — Limited Edition',
      slug: 'alpine-trail-knit-runner-limited-edition',
      description:
        'All-weather trail sneaker featuring water-repellent ripstop paneling, lugged traction pods, and responsive heel cushioning.',
      sku: 'ZM-FW-540',
      category_id: 'cat-footwear',
      business_id: 'biz-sialkot-leather',
      price: 16200,
      sale_price: 13900,
      stock_quantity: 16,
      images: ['/src/assets/images/prod_running_shoes_1795178618844.jpg'],
      status: 'active',
      is_deleted: false,
      is_featured: true,
      variants: [
        {
          id: 'var-010-a',
          product_id: 'prod-010',
          variant_name: 'Size',
          variant_value: 'EU 42',
          price_modifier: 0,
          stock_quantity: 8,
          sku: 'ZM-FW-540-42',
        },
        {
          id: 'var-010-b',
          product_id: 'prod-010',
          variant_name: 'Size',
          variant_value: 'EU 44',
          price_modifier: 0,
          stock_quantity: 8,
          sku: 'ZM-FW-540-44',
        },
      ],
      created_at: daysAgoIso(2),
    },
    {
      id: 'prod-011',
      title: 'Tailored Oxford Cotton Casual Shirt',
      slug: 'tailored-oxford-cotton-casual-shirt',
      description:
        'Breathable 100% long-staple Pakistani Oxford cotton button-down shirt featuring clean mother-of-pearl buttons, structured collar, and tailored slim-regular fit for everyday office and smart casual wear.',
      sku: 'ZM-FS-501',
      category_id: 'cat-apparel',
      business_id: 'biz-lahore-loom',
      price: 2400,
      sale_price: 2100,
      stock_quantity: 42,
      images: ['/src/assets/images/prod_cotton_shirt_1795191691262.jpg'],
      status: 'active',
      is_deleted: false,
      is_featured: true,
      variants: [
        {
          id: 'var-011-a',
          product_id: 'prod-011',
          variant_name: 'Size',
          variant_value: 'Medium (M)',
          price_modifier: 0,
          stock_quantity: 18,
          sku: 'ZM-FS-501-M',
        },
        {
          id: 'var-011-b',
          product_id: 'prod-011',
          variant_name: 'Size',
          variant_value: 'Large (L)',
          price_modifier: 0,
          stock_quantity: 14,
          sku: 'ZM-FS-501-L',
        },
        {
          id: 'var-011-c',
          product_id: 'prod-011',
          variant_name: 'Size',
          variant_value: 'Extra Large (XL)',
          price_modifier: 0,
          stock_quantity: 10,
          sku: 'ZM-FS-501-XL',
        },
      ],
      created_at: daysAgoIso(1),
    },
    {
      id: 'prod-012',
      title: 'Royal Gold-Rimmed 24-Piece Porcelain Dinner Set',
      slug: 'royal-gold-rimmed-24pc-porcelain-dinner-set',
      description:
        'Complete 24-piece fine white glazed porcelain dinner set including 6 dinner plates, 6 side plates, 6 deep soup bowls, and 6 teacup-and-saucer sets with hand-finished brushed gold rims.',
      sku: 'ZM-KD-610',
      category_id: 'cat-kitchen',
      business_id: 'biz-royal-tableware',
      price: 18500,
      sale_price: 14900,
      stock_quantity: 15,
      images: ['/src/assets/images/prod_dinner_set_1795191690947.jpg'],
      status: 'active',
      is_deleted: false,
      is_featured: true,
      variants: [
        {
          id: 'var-012-a',
          product_id: 'prod-012',
          variant_name: 'Set Size',
          variant_value: '24-Piece (Serves 6)',
          price_modifier: 0,
          stock_quantity: 10,
          sku: 'ZM-KD-610-24',
        },
        {
          id: 'var-012-b',
          product_id: 'prod-012',
          variant_name: 'Set Size',
          variant_value: '36-Piece (Serves 8)',
          price_modifier: 5500,
          stock_quantity: 5,
          sku: 'ZM-KD-610-36',
        },
      ],
      created_at: daysAgoIso(1),
    },
    {
      id: 'prod-013',
      title: 'Sterling Silver Solitaire & Minimalist Band Ring Set',
      slug: 'sterling-silver-solitaire-band-ring-set',
      description:
        'Hallmarked 925 sterling silver twin ring set featuring a precision-cut radiant zirconia solitaire ring paired with a matching high-polish comfort-fit band in a velvet gift presentation box.',
      sku: 'ZM-JR-705',
      category_id: 'cat-jewelry',
      business_id: 'biz-margalla-jewels',
      price: 6500,
      sale_price: 4950,
      stock_quantity: 19,
      images: ['/src/assets/images/prod_silver_ring_1795191691586.jpg'],
      status: 'active',
      is_deleted: false,
      is_featured: true,
      variants: [
        {
          id: 'var-013-a',
          product_id: 'prod-013',
          variant_name: 'Ring Size',
          variant_value: 'Size 6 (16.5mm)',
          price_modifier: 0,
          stock_quantity: 6,
          sku: 'ZM-JR-705-6',
        },
        {
          id: 'var-013-b',
          product_id: 'prod-013',
          variant_name: 'Ring Size',
          variant_value: 'Size 7 (17.3mm)',
          price_modifier: 0,
          stock_quantity: 8,
          sku: 'ZM-JR-705-7',
        },
        {
          id: 'var-013-c',
          product_id: 'prod-013',
          variant_name: 'Ring Size',
          variant_value: 'Size 8 (18.1mm)',
          price_modifier: 0,
          stock_quantity: 5,
          sku: 'ZM-JR-705-8',
        },
      ],
      created_at: daysAgoIso(1),
    },
  ];

  const users: StoredUser[] = [
    {
      id: adminId,
      email: 'admin@zyromall.pk',
      full_name: 'Tariq Mehmood',
      phone: '0300-8451290',
      role: 'admin',
      is_blocked: false,
      password_hash: hashPassword('Admin@123'),
      created_at: daysAgoIso(90),
    },
    {
      id: customerId,
      email: 'customer@zyromall.pk',
      full_name: 'Ayesha Siddiqui',
      phone: '0321-4567890',
      role: 'customer',
      is_blocked: false,
      password_hash: hashPassword('Customer@123'),
      created_at: daysAgoIso(45),
    },
    {
      id: customer2Id,
      email: 'hamza.raza@example.pk',
      full_name: 'Hamza Raza',
      phone: '0333-9182736',
      role: 'customer',
      is_blocked: false,
      password_hash: hashPassword('Customer@123'),
      created_at: daysAgoIso(20),
    },
  ];

  const addresses: Address[] = [
    {
      id: 'addr-001',
      user_id: customerId,
      full_name: 'Ayesha Siddiqui',
      phone: '0321-4567890',
      address_line1: 'House 42-B, Street 7, Cavalry Ground',
      city: 'Lahore',
      area: 'Cantt',
      postal_code: '54810',
      is_default: true,
      created_at: daysAgoIso(30),
    },
    {
      id: 'addr-002',
      user_id: customerId,
      full_name: 'Ayesha Siddiqui',
      phone: '0321-4567890',
      address_line1: 'Suite 14, Clifton Block 4',
      city: 'Karachi',
      area: 'Clifton',
      postal_code: '75600',
      is_default: false,
      created_at: daysAgoIso(15),
    },
  ];

  const coupons: Coupon[] = [
    {
      id: 'cpn-001',
      code: 'ZYRO10',
      type: 'percentage',
      value: 10,
      min_order_amount: 3000,
      max_uses: 500,
      used_count: 14,
      expires_at: '2028-12-31T23:59:59Z',
      is_active: true,
      created_at: daysAgoIso(40),
    },
    {
      id: 'cpn-002',
      code: 'WELCOME500',
      type: 'flat',
      value: 500,
      min_order_amount: 2500,
      max_uses: 250,
      used_count: 29,
      expires_at: '2028-12-31T23:59:59Z',
      is_active: true,
      created_at: daysAgoIso(35),
    },
  ];

  const orders: Order[] = [
    {
      id: 'ord-001',
      order_number: 'ZM-20261102-0101',
      user_id: customerId,
      customer_name: 'Ayesha Siddiqui',
      customer_email: 'customer@zyromall.pk',
      status: 'delivered',
      payment_method: 'cod',
      payment_status: 'paid',
      subtotal: 19900,
      shipping_cost: 0,
      discount_amount: 0,
      total: 19900,
      coupon_id: null,
      shipping_address: {
        full_name: 'Ayesha Siddiqui',
        phone: '0321-4567890',
        email: 'customer@zyromall.pk',
        address_line1: 'House 42-B, Street 7, Cavalry Ground',
        city: 'Lahore',
        area: 'Cantt',
        postal_code: '54810',
      },
      tracking_number: 'TCS-88412094',
      admin_notes: 'Delivered on schedule.',
      cancel_reason: null,
      items: [
        {
          id: 'oi-001',
          order_id: 'ord-001',
          product_id: 'prod-001',
          variant_id: 'var-001-a',
          product_title: 'Khyber ANC Studio Wireless Headphones',
          product_image: '/src/assets/images/prod_headphones_1795178619261.jpg',
          variant_info: 'Color: Matte Charcoal',
          quantity: 1,
          unit_price: 19900,
          total_price: 19900,
          created_at: daysAgoIso(4),
        },
      ],
      created_at: daysAgoIso(4),
      updated_at: daysAgoIso(2),
    },
    {
      id: 'ord-002',
      order_number: 'ZM-20261110-0102',
      user_id: customerId,
      customer_name: 'Ayesha Siddiqui',
      customer_email: 'customer@zyromall.pk',
      status: 'shipped',
      payment_method: 'jazzcash',
      payment_status: 'confirmed',
      subtotal: 18500,
      shipping_cost: 0,
      discount_amount: 500,
      total: 18000,
      coupon_id: 'cpn-002',
      coupon_code: 'WELCOME500',
      shipping_address: {
        full_name: 'Ayesha Siddiqui',
        phone: '0321-4567890',
        email: 'customer@zyromall.pk',
        address_line1: 'House 42-B, Street 7, Cavalry Ground',
        city: 'Lahore',
        area: 'Cantt',
        postal_code: '54810',
      },
      tracking_number: 'LP-44109822',
      admin_notes: 'JazzCash TXN verified.',
      cancel_reason: null,
      items: [
        {
          id: 'oi-002',
          order_id: 'ord-002',
          product_id: 'prod-003',
          variant_id: 'var-003-a',
          product_title: 'Sialkot Full-Grain Cognac Messenger Satchel',
          product_image: '/src/assets/images/prod_leather_bag_1795178618645.jpg',
          variant_info: 'Finish: Cognac Tan',
          quantity: 1,
          unit_price: 18500,
          total_price: 18500,
          created_at: daysAgoIso(9),
        },
      ],
      created_at: daysAgoIso(9),
      updated_at: daysAgoIso(7),
    },
    {
      id: 'ord-003',
      order_number: 'ZM-20261115-0103',
      user_id: customer2Id,
      customer_name: 'Hamza Raza',
      customer_email: 'hamza.raza@example.pk',
      status: 'pending',
      payment_method: 'cod',
      payment_status: 'pending',
      subtotal: 27500,
      shipping_cost: 0,
      discount_amount: 0,
      total: 27500,
      coupon_id: null,
      shipping_address: {
        full_name: 'Hamza Raza',
        phone: '0333-9182736',
        email: 'hamza.raza@example.pk',
        address_line1: 'Plot 19, Sector F-7/2',
        city: 'Islamabad',
        area: 'F-7',
        postal_code: '44000',
      },
      tracking_number: null,
      admin_notes: null,
      cancel_reason: null,
      items: [
        {
          id: 'oi-003',
          order_id: 'ord-003',
          product_id: 'prod-002',
          variant_id: 'var-002-a',
          product_title: 'Margalla Titanium Smart Chronometer',
          product_image: '/src/assets/images/prod_smartwatch_1795178619052.jpg',
          variant_info: 'Strap Size: 42mm Regular',
          quantity: 1,
          unit_price: 27500,
          total_price: 27500,
          created_at: daysAgoIso(1),
        },
      ],
      created_at: daysAgoIso(1),
      updated_at: daysAgoIso(1),
    },
    {
      id: 'ord-004',
      order_number: 'ZM-20261101-0104',
      user_id: customer2Id,
      customer_name: 'Hamza Raza',
      customer_email: 'hamza.raza@example.pk',
      status: 'delivered',
      payment_method: 'easypaisa',
      payment_status: 'paid',
      subtotal: 19900,
      shipping_cost: 0,
      discount_amount: 0,
      total: 19900,
      coupon_id: null,
      shipping_address: {
        full_name: 'Hamza Raza',
        phone: '0333-9182736',
        address_line1: 'Plot 19, Sector F-7/2',
        city: 'Islamabad',
        area: 'F-7',
        postal_code: '44000',
      },
      tracking_number: 'TCS-88120311',
      admin_notes: null,
      cancel_reason: null,
      items: [
        {
          id: 'oi-004',
          order_id: 'ord-004',
          product_id: 'prod-005',
          variant_id: 'var-005-b',
          product_title: 'Velocity Carbon-Stride Running Sneakers',
          product_image: '/src/assets/images/prod_running_shoes_1795178618844.jpg',
          variant_info: 'Size: EU 42',
          quantity: 1,
          unit_price: 12400,
          total_price: 12400,
          created_at: daysAgoIso(18),
        },
        {
          id: 'oi-005',
          order_id: 'ord-004',
          product_id: 'prod-006',
          variant_id: 'var-006-a',
          product_title: 'Aeterna Amber & Smoked Oak Eau de Parfum (50ml)',
          product_image: '/src/assets/images/prod_oud_perfume_1795178619239.jpg',
          variant_info: 'Volume: 50ml',
          quantity: 1,
          unit_price: 7500,
          total_price: 7500,
          created_at: daysAgoIso(18),
        },
      ],
      created_at: daysAgoIso(18),
      updated_at: daysAgoIso(14),
    },
    {
      id: 'ord-005',
      order_number: 'ZM-20261028-0105',
      user_id: customerId,
      customer_name: 'Ayesha Siddiqui',
      customer_email: 'customer@zyromall.pk',
      status: 'delivered',
      payment_method: 'cod',
      payment_status: 'paid',
      subtotal: 9400,
      shipping_cost: 0,
      discount_amount: 0,
      total: 9400,
      coupon_id: null,
      shipping_address: {
        full_name: 'Ayesha Siddiqui',
        phone: '0321-4567890',
        address_line1: 'House 42-B, Street 7, Cavalry Ground',
        city: 'Lahore',
        area: 'Cantt',
        postal_code: '54810',
      },
      tracking_number: 'TCS-77901234',
      admin_notes: null,
      cancel_reason: null,
      items: [
        {
          id: 'oi-006',
          order_id: 'ord-005',
          product_id: 'prod-004',
          variant_id: null,
          product_title: 'Multan Stoneware Ceramic Table Lamp',
          product_image: '/src/assets/images/prod_ceramic_lamp_1795178619287.jpg',
          variant_info: null,
          quantity: 1,
          unit_price: 9400,
          total_price: 9400,
          created_at: daysAgoIso(23),
        },
      ],
      created_at: daysAgoIso(23),
      updated_at: daysAgoIso(19),
    },
  ];

  const reviews: Review[] = [
    {
      id: 'rev-001',
      product_id: 'prod-001',
      product_title: 'Khyber ANC Studio Wireless Headphones',
      user_id: customerId,
      user_name: 'Ayesha Siddiqui',
      order_id: 'ord-001',
      rating: 5,
      comment:
        'Exceptional build quality and active noise cancellation completely blocks traffic noise during commutes in Lahore. Battery lasted a full week.',
      is_approved: true,
      created_at: daysAgoIso(2),
    },
    {
      id: 'rev-002',
      product_id: 'prod-005',
      product_title: 'Velocity Carbon-Stride Running Sneakers',
      user_id: customer2Id,
      user_name: 'Hamza Raza',
      order_id: 'ord-004',
      rating: 5,
      comment:
        'Lightweight and supportive for 8km morning runs. True to EU sizing and the breathability is noticeably better than synthetic trainers.',
      is_approved: true,
      created_at: daysAgoIso(13),
    },
    {
      id: 'rev-003',
      product_id: 'prod-006',
      product_title: 'Aeterna Amber & Smoked Oak Eau de Parfum (50ml)',
      user_id: customer2Id,
      user_name: 'Hamza Raza',
      order_id: 'ord-004',
      rating: 4,
      comment:
        'Warm amber dry-down lasts easily 8 hours on fabric. Packaging arrived sealed and well-protected.',
      is_approved: true,
      created_at: daysAgoIso(12),
    },
    {
      id: 'rev-004',
      product_id: 'prod-004',
      product_title: 'Multan Stoneware Ceramic Table Lamp',
      user_id: customerId,
      user_name: 'Ayesha Siddiqui',
      order_id: 'ord-005',
      rating: 5,
      comment:
        'The matte stoneware texture looks understated and refined in person. Linen shade diffuses a soft warm glow.',
      is_approved: true,
      created_at: daysAgoIso(18),
    },
  ];

  const banners: Banner[] = [
    {
      id: 'ban-001',
      title: 'All-in-One Online Shopping Collection',
      subtitle:
        'Tailored shirts (PKR 2,400 -> PKR 2,100), royal dinner sets, sterling silver rings, and flagship audio with instant WhatsApp order booking.',
      image_url: '/src/assets/images/poster_admin_welcome_1795191692080.jpg',
      link_url: '/products',
      type: 'hero',
      sort_order: 1,
      is_active: true,
      created_at: daysAgoIso(20),
    },
    {
      id: 'ban-002',
      title: 'Mega Seasonal Sale — Up to 25% Off',
      subtitle:
        'Handcrafted Sialkot leather, ceramic home lighting, Eau de Parfum & athletic footwear delivered nationwide.',
      image_url: '/src/assets/images/poster_mega_sale_1795191691982.jpg',
      link_url: '/products?sort=newest',
      type: 'hero',
      sort_order: 2,
      is_active: true,
      created_at: daysAgoIso(19),
    },
    {
      id: 'ban-003',
      title: 'Use code ZYRO10 for 10% off orders over PKR 3,000',
      subtitle: 'Nationwide Cash on Delivery, JazzCash, EasyPaisa & Card Checkout',
      image_url: '/src/assets/images/poster_mega_sale_1795191691982.jpg',
      link_url: '/products',
      type: 'promo',
      sort_order: 1,
      is_active: true,
      created_at: daysAgoIso(18),
    },
  ];

  const settings: StoreSettings = {
    id: 1,
    store_name: 'Zyro Mall',
    store_logo_url: null,
    contact_email: 'support@zyromall.pk',
    contact_phone: '0329-6730804',
    flat_shipping_cost: 200,
    free_shipping_threshold: 5000,
    cod_enabled: true,
    low_stock_threshold: 5,
    maintenance_mode: false,
    whatsapp_number: '03296730804',
    admin_poster_enabled: true,
    admin_poster_title: 'Zyro Mall Official Storefront & Campaign Poster',
    admin_poster_subtitle:
      'Manage categories, partner businesses, data quality, discounted PKR pricing, and direct WhatsApp order booking from one unified portal.',
    admin_poster_image_url: '/src/assets/images/poster_admin_welcome_1795191692080.jpg',
    admin_poster_cta_label: 'Browse Live Storefront',
    admin_poster_cta_url: '/products',
    updated_at: daysAgoIso(1),
  };

  const catalogProducts = generateCategoryCatalogTopUp(products);

  return {
    users,
    categories,
    businesses,
    products: catalogProducts,
    addresses,
    coupons,
    coupon_usages: [],
    orders,
    cart_items: [],
    wishlist_items: [
      {
        id: 'wl-seed-001',
        user_id: customerId,
        product_id: 'prod-002',
        created_at: daysAgoIso(3),
      },
    ],
    reviews,
    banners,
    settings,
  };
}

let cachedState: DatabaseState | null = null;
let lastSyncedSnapshot: DatabaseState | null = null;
let supabaseConnected = false;
let supabaseSyncQueue: Promise<void> = Promise.resolve();

function migrateExistingState(parsed: DatabaseState): DatabaseState {
  const seed = createSeedState();
  let changed = false;

  if (!Array.isArray(parsed.businesses) || parsed.businesses.length === 0) {
    parsed.businesses = seed.businesses;
    changed = true;
  }

  for (const cat of seed.categories) {
    if (!parsed.categories.some((c) => c.id === cat.id)) {
      parsed.categories.push(cat);
      changed = true;
    }
  }

  for (const prod of seed.products) {
    const existing = parsed.products.find((p) => p.id === prod.id);
    if (!existing) {
      parsed.products.push(prod);
      changed = true;
    } else if (!existing.business_id && prod.business_id) {
      existing.business_id = prod.business_id;
      changed = true;
    }
  }

  if (parsed.banners.some((b) => b.id === 'ban-001' && b.image_url.includes('hero_tech_banner'))) {
    const b1 = parsed.banners.find((b) => b.id === 'ban-001');
    const seedB1 = seed.banners.find((b) => b.id === 'ban-001');
    if (b1 && seedB1) {
      Object.assign(b1, seedB1);
      changed = true;
    }
  }
  if (parsed.banners.some((b) => b.id === 'ban-002' && b.image_url.includes('hero_fashion_banner'))) {
    const b2 = parsed.banners.find((b) => b.id === 'ban-002');
    const seedB2 = seed.banners.find((b) => b.id === 'ban-002');
    if (b2 && seedB2) {
      Object.assign(b2, seedB2);
      changed = true;
    }
  }

  for (const biz of parsed.businesses) {
    if (!biz.whatsapp_number || biz.whatsapp_number === '0300-8451290') {
      biz.whatsapp_number = '03296730804';
      changed = true;
    }
  }

  const toppedUpProducts = generateCategoryCatalogTopUp(parsed.products);
  if (toppedUpProducts.length !== parsed.products.length) {
    parsed.products = toppedUpProducts;
    changed = true;
  }

  if (!parsed.settings.whatsapp_number || parsed.settings.whatsapp_number === '0300-8451290') {
    parsed.settings.whatsapp_number = seed.settings.whatsapp_number;
    changed = true;
  }
  if (parsed.settings.contact_phone === '+92 42 3576 1940') {
    parsed.settings.contact_phone = seed.settings.contact_phone;
    changed = true;
  }
  if (parsed.settings.admin_poster_enabled === undefined) {
    parsed.settings.admin_poster_enabled = seed.settings.admin_poster_enabled;
    parsed.settings.admin_poster_title = seed.settings.admin_poster_title;
    parsed.settings.admin_poster_subtitle = seed.settings.admin_poster_subtitle;
    parsed.settings.admin_poster_image_url = seed.settings.admin_poster_image_url;
    parsed.settings.admin_poster_cta_label = seed.settings.admin_poster_cta_label;
    parsed.settings.admin_poster_cta_url = seed.settings.admin_poster_cta_url;
    changed = true;
  }

  if (changed) {
    writeLocalState(parsed);
  }
  return parsed;
}

function loadLocalState(): DatabaseState {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return migrateExistingState(JSON.parse(raw) as DatabaseState);
    }
  } catch (err) {
    console.warn('Reinitializing local Zyro Mall store after read error:', err);
  }
  const seed = createSeedState();
  writeLocalState(seed);
  return seed;
}

function writeLocalState(state: DatabaseState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist Zyro Mall store:', err);
  }
}

export async function initStore(): Promise<void> {
  const localFallback = () => loadLocalState();

  if (!isSupabaseServerConfigured()) {
    cachedState = localFallback();
    lastSyncedSnapshot = structuredClone(cachedState);
    supabaseConnected = false;
    return;
  }

  try {
    const { state, connected } = await loadDatabaseFromSupabase(localFallback);
    cachedState = state;
    lastSyncedSnapshot = structuredClone(state);
    supabaseConnected = connected;
    if (connected) {
      writeLocalState(state);
      console.log('Zyro Mall connected to Supabase PostgreSQL.');
    }
  } catch (err) {
    console.warn(
      'Supabase connection fell back to local store:',
      err instanceof Error ? err.message : err
    );
    cachedState = localFallback();
    lastSyncedSnapshot = structuredClone(cachedState);
    supabaseConnected = false;
  }
}

export function getDbDriverStatus(): 'supabase' | 'local' {
  return supabaseConnected ? 'supabase' : 'local';
}

export function flushSupabaseSync(): Promise<void> {
  return supabaseSyncQueue;
}

export function loadDb(): DatabaseState {
  if (cachedState) return cachedState;
  cachedState = loadLocalState();
  lastSyncedSnapshot = structuredClone(cachedState);
  return cachedState;
}

export function saveDb(state: DatabaseState): void {
  cachedState = state;
  writeLocalState(state);

  if (supabaseConnected) {
    const prevSnapshot = lastSyncedSnapshot ?? loadLocalState();
    const nextSnapshot = structuredClone(state);
    lastSyncedSnapshot = nextSnapshot;
    supabaseSyncQueue = supabaseSyncQueue
      .then(() => syncStateChangesToSupabase(prevSnapshot, nextSnapshot))
      .catch((err) => {
        console.error('Supabase background sync error:', err);
      });
  }
}

export function enrichProduct(state: DatabaseState, product: Product): Product {
  const category = state.categories.find((c) => c.id === product.category_id);
  const business = (state.businesses ?? []).find((b) => b.id === product.business_id);
  const approvedReviews = state.reviews.filter(
    (r) => r.product_id === product.id && r.is_approved
  );
  const ratingAvg =
    approvedReviews.length > 0
      ? Number(
          (
            approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
          ).toFixed(1)
        )
      : 0;
  return {
    ...product,
    category_name: category?.name ?? 'General',
    category_slug: category?.slug ?? 'general',
    business_name: business?.name,
    rating_avg: ratingAvg,
    review_count: approvedReviews.length,
  };
}

export function sanitizeProfile(user: StoredUser): Profile {
  const { password_hash: _ignored, ...profile } = user;
  return profile;
}
