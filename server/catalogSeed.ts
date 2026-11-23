import type { Product } from '../src/types';
import { slugify } from '../src/lib/commerce';

interface CategoryBlueprint {
  categoryId: string;
  businessId: string;
  skuPrefix: string;
  images: string[];
  adjectives: string[];
  models: string[];
  basePrice: number;
  priceStep: number;
  discountRate: number;
  variantName: string;
  variantValues: string[];
  descriptionTemplate: (title: string) => string;
}

const CATEGORY_BLUEPRINTS: CategoryBlueprint[] = [
  {
    categoryId: 'cat-electronics',
    businessId: 'biz-khyber-acoustics',
    skuPrefix: 'ZM-EL',
    images: [
      '/src/assets/images/prod_headphones_1795178619261.jpg',
      '/src/assets/images/hero_tech_banner_1795178618730.jpg',
    ],
    adjectives: ['Khyber', 'Studio', 'Apex', 'Acoustic', 'Pro', 'Sonic', 'Crystal', 'Ultra', 'Hi-Fi', 'Pulse'],
    models: [
      'ANC Wireless Headphones',
      'True Wireless Earbuds',
      'Portable Bluetooth Speaker',
      'USB-C Studio Condenser Mic',
      'Spatial Audio Soundbar',
    ],
    basePrice: 4500,
    priceStep: 450,
    discountRate: 0.16,
    variantName: 'Finish',
    variantValues: ['Matte Black', 'Brushed Silver'],
    descriptionTemplate: (title) =>
      `${title} engineered with precision acoustic drivers, low-latency Bluetooth 5.3 connectivity, USB-C fast charging, and durable brushed finish with 1-year Pakistan warranty.`,
  },
  {
    categoryId: 'cat-wearables',
    businessId: 'biz-khyber-acoustics',
    skuPrefix: 'ZM-WR',
    images: [
      '/src/assets/images/prod_smartwatch_1795178619052.jpg',
      '/src/assets/images/hero_tech_banner_1795178618730.jpg',
    ],
    adjectives: ['Margalla', 'Titanium', 'Apex', 'Horizon', 'Chrono', 'Active', 'Summit', 'Velo', 'Pulse', 'Nova'],
    models: [
      'AMOLED Smart Chronometer',
      'GPS Fitness Tracker Watch',
      'Sapphire Steel Smartwatch',
      'Sport Loop Activity Band',
      'Solar Rugged Expedition Watch',
    ],
    basePrice: 8500,
    priceStep: 600,
    discountRate: 0.15,
    variantName: 'Strap',
    variantValues: ['42mm Nylon', '46mm Silicone'],
    descriptionTemplate: (title) =>
      `${title} featuring vibrant always-on AMOLED display, heart-rate and SpO2 sensors, multi-day battery life, and 5ATM water resistance built for daily fitness and office wear.`,
  },
  {
    categoryId: 'cat-fashion',
    businessId: 'biz-sialkot-leather',
    skuPrefix: 'ZM-LB',
    images: [
      '/src/assets/images/prod_leather_bag_1795178618645.jpg',
      '/src/assets/images/hero_fashion_banner_1795178618870.jpg',
    ],
    adjectives: ['Sialkot', 'Heritage', 'Artisan', 'Cognac', 'Vintage', 'Classic', 'Executive', 'Urban', 'Craft', 'Royal'],
    models: [
      'Full-Grain Laptop Satchel',
      'Crossbody Messenger Bag',
      'Hand-Stitched Weekender Duffel',
      'Slim Bi-Fold Leather Wallet',
      'Executive Briefcase Tote',
    ],
    basePrice: 3800,
    priceStep: 500,
    discountRate: 0.14,
    variantName: 'Color',
    variantValues: ['Cognac Tan', 'Espresso Brown'],
    descriptionTemplate: (title) =>
      `${title} hand-stitched in Sialkot from vegetable-tanned full-grain cowhide leather with solid antique brass hardware and reinforced cotton lining.`,
  },
  {
    categoryId: 'cat-home',
    businessId: 'biz-royal-tableware',
    skuPrefix: 'ZM-HL',
    images: [
      '/src/assets/images/prod_ceramic_lamp_1795178619287.jpg',
      '/src/assets/images/poster_mega_sale_1795191691982.jpg',
    ],
    adjectives: ['Multan', 'Architectural', 'Nordic', 'Stoneware', 'Warm', 'Linen', 'Travertine', 'Studio', 'Minimal', 'Velvet'],
    models: [
      'Ceramic Bedside Table Lamp',
      'Brushed Brass Reading Lamp',
      'Hand-Loomed Linen Shade Lamp',
      'Ambient Pendant Light Fixture',
      'Matte Terracotta Accent Vase',
    ],
    basePrice: 4200,
    priceStep: 350,
    discountRate: 0.15,
    variantName: 'Shade',
    variantValues: ['Warm Linen', 'Natural Ivory'],
    descriptionTemplate: (title) =>
      `${title} crafted with kiln-fired ceramic and warm 2700K illumination to elevate modern bedrooms, lounges, and executive study desks.`,
  },
  {
    categoryId: 'cat-footwear',
    businessId: 'biz-sialkot-leather',
    skuPrefix: 'ZM-FW',
    images: [
      '/src/assets/images/prod_running_shoes_1795178618844.jpg',
      '/src/assets/images/poster_mega_sale_1795191691982.jpg',
    ],
    adjectives: ['Velocity', 'Alpine', 'Stride', 'Aero', 'Carbon', 'Trail', 'Sprint', 'Kinetic', 'Pace', 'Flex'],
    models: [
      'Breathable Knit Running Sneakers',
      'Cushioned Marathon Trainers',
      'All-Terrain Trail Runners',
      'Everyday Urban Walkers',
      'Lightweight Gym Cross-Trainers',
    ],
    basePrice: 5400,
    priceStep: 350,
    discountRate: 0.17,
    variantName: 'Size',
    variantValues: ['EU 41', 'EU 42', 'EU 43'],
    descriptionTemplate: (title) =>
      `${title} engineered with responsive dual-density EVA cushioning, breathable mesh upper, and high-grip carbon rubber outsole for all-day comfort.`,
  },
  {
    categoryId: 'cat-fragrance',
    businessId: 'biz-margalla-jewels',
    skuPrefix: 'ZM-FR',
    images: [
      '/src/assets/images/prod_oud_perfume_1795178619239.jpg',
      '/src/assets/images/hero_fashion_banner_1795178618870.jpg',
    ],
    adjectives: ['Aeterna', 'Oud', 'Royal', 'Kashmiri', 'Saffron', 'Velvet', 'Noir', 'Amber', 'Cedar', 'Imperial'],
    models: [
      'Eau de Parfum 50ml',
      'Extrait de Parfum 100ml',
      'Smoked Oud Attar Elixir',
      'Citrus & Bergamot Cologne',
      'Musk & Rose Gift Flacon',
    ],
    basePrice: 3600,
    priceStep: 300,
    discountRate: 0.15,
    variantName: 'Volume',
    variantValues: ['50ml', '100ml'],
    descriptionTemplate: (title) =>
      `${title} blended with high-concentration French and Arabian aromatic oils offering 10+ hours of refined sillage in a heavy crystal flacon.`,
  },
  {
    categoryId: 'cat-apparel',
    businessId: 'biz-lahore-loom',
    skuPrefix: 'ZM-FS',
    images: [
      '/src/assets/images/prod_cotton_shirt_1795191691262.jpg',
      '/src/assets/images/poster_admin_welcome_1795191692080.jpg',
    ],
    adjectives: ['Lahore', 'Oxford', 'Executive', 'Premium', 'Summer', 'Tailored', 'Classic', 'Linen', 'Combed', 'Heritage'],
    models: [
      'Oxford Cotton Casual Shirt',
      'Pique Knit Formal Polo',
      'Breezy Linen Kurta Shirt',
      'Slim-Fit Poplin Dress Shirt',
      'Mandarin Collar Cotton Shirt',
    ],
    basePrice: 2400,
    priceStep: 150,
    discountRate: 0.125,
    variantName: 'Size',
    variantValues: ['Medium (M)', 'Large (L)', 'XL'],
    descriptionTemplate: (title) =>
      `${title} tailored in Lahore from 100% breathable Pakistani cotton with clean pearl buttons, pre-shrunk finish, and effortless all-season comfort.`,
  },
  {
    categoryId: 'cat-kitchen',
    businessId: 'biz-royal-tableware',
    skuPrefix: 'ZM-KD',
    images: [
      '/src/assets/images/prod_dinner_set_1795191690947.jpg',
      '/src/assets/images/poster_admin_welcome_1795191692080.jpg',
    ],
    adjectives: ['Royal', 'Imperial', 'Bone', 'Marble', 'Gold-Rim', 'Heritage', 'Palace', 'Ivory', 'Classic', 'Deluxe'],
    models: [
      '24-Piece Porcelain Dinner Set',
      '36-Piece Family Dining Set',
      '12-Piece Tea & Saucer Set',
      'Serving Platter & Bowl Combo',
      'Bridal Casserole & Plate Set',
    ],
    basePrice: 6800,
    priceStep: 450,
    discountRate: 0.18,
    variantName: 'Set Size',
    variantValues: ['24-Piece', '36-Piece'],
    descriptionTemplate: (title) =>
      `${title} crafted from chip-resistant fine glazed porcelain with elegant metallic trim, packed in foam-protected gift cartons for safe nationwide delivery.`,
  },
  {
    categoryId: 'cat-jewelry',
    businessId: 'biz-margalla-jewels',
    skuPrefix: 'ZM-JR',
    images: [
      '/src/assets/images/prod_silver_ring_1795191691586.jpg',
      '/src/assets/images/poster_admin_welcome_1795191692080.jpg',
    ],
    adjectives: ['Margalla', 'Solitaire', 'Sterling', 'Bridal', 'Minimalist', 'Halo', 'Eternity', 'Cushion', 'Royal', 'Aura'],
    models: [
      '925 Silver Solitaire Ring',
      'Twin Engagement Band Set',
      'Zirconia Halo Promise Ring',
      'Classic Mens Silver Signet Ring',
      'Adjustable Filigree Ring Duo',
    ],
    basePrice: 2800,
    priceStep: 280,
    discountRate: 0.2,
    variantName: 'Ring Size',
    variantValues: ['Size 6', 'Size 7', 'Size 8'],
    descriptionTemplate: (title) =>
      `${title} crafted in hallmarked 925 sterling silver with diamond-cut cubic zirconia brilliance and delivered in a velvet presentation ring box.`,
  },
];

export function generateCategoryCatalogTopUp(existingProducts: Product[]): Product[] {
  const result = [...existingProducts];
  const existingSkus = new Set(result.map((p) => p.sku.toUpperCase()));
  const existingSlugs = new Set(result.map((p) => p.slug));
  const nowBase = Date.now();

  for (const bp of CATEGORY_BLUEPRINTS) {
    const currentCount = result.filter(
      (p) => !p.is_deleted && p.category_id === bp.categoryId
    ).length;
    const needed = Math.max(0, 50 - currentCount);

    let seq = 1;
    for (let i = 0; i < needed; i++) {
      const adj = bp.adjectives[i % bp.adjectives.length];
      const model = bp.models[Math.floor(i / bp.adjectives.length) % bp.models.length];
      const editionNum = Math.floor(i / (bp.adjectives.length * bp.models.length)) + 1;
      const editionLabel = i >= bp.adjectives.length ? ` Edition ${i + 1}` : '';
      const title = `${adj} ${model}${editionLabel}${editionNum > 1 ? ` v${editionNum}` : ''}`;

      let sku = `${bp.skuPrefix}-${String(800 + seq).padStart(3, '0')}`;
      while (existingSkus.has(sku.toUpperCase())) {
        seq++;
        sku = `${bp.skuPrefix}-${String(800 + seq).padStart(3, '0')}`;
      }
      existingSkus.add(sku.toUpperCase());

      let slug = slugify(`${title}-${sku}`);
      while (existingSlugs.has(slug)) {
        slug = `${slug}-${seq}`;
      }
      existingSlugs.add(slug);
      seq++;

      const price = Math.round((bp.basePrice + (i % 12) * bp.priceStep) / 50) * 50;
      const salePrice = Math.round((price * (1 - bp.discountRate)) / 50) * 50;
      const prodId = `prod-${bp.skuPrefix.toLowerCase()}-${String(i + 1).padStart(3, '0')}`;
      const createdAt = new Date(nowBase - (i + 2) * 3600 * 1000).toISOString();

      result.push({
        id: prodId,
        title,
        slug,
        description: bp.descriptionTemplate(title),
        sku,
        category_id: bp.categoryId,
        business_id: bp.businessId,
        price,
        sale_price: salePrice < price ? salePrice : Math.max(100, price - 200),
        stock_quantity: 12 + (i % 30),
        images: [bp.images[i % bp.images.length]],
        status: 'active',
        is_deleted: false,
        is_featured: i === 0,
        variants: bp.variantValues.map((val, vi) => ({
          id: `var-${prodId}-${vi + 1}`,
          product_id: prodId,
          variant_name: bp.variantName,
          variant_value: val,
          price_modifier: 0,
          stock_quantity: 8,
          sku: `${sku}-${vi + 1}`,
        })),
        created_at: createdAt,
      });
    }
  }

  return result;
}
