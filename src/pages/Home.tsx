import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Package,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getBanners,
  getBusinesses,
  getCategories,
  getFeaturedProducts,
  getNewArrivals,
} from '../services/productService';
import { ProductCard } from '../components/product/ProductCard';
import { SafeImage } from '../components/common/SafeImage';
import { SkeletonCard } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/EmptyState';
import { useCart } from '../contexts/CartContext';
import { formatPrice } from '../lib/commerce';

const heroImageVariants = {
  enter: (direction: number) => ({
    x: direction >= 0 ? '100%' : '-100%',
    scale: 1,
    opacity: 1,
    zIndex: 1,
  }),
  center: {
    x: '0%',
    scale: 1,
    opacity: 1,
    zIndex: 1,
  },
  exit: (direction: number) => ({
    x: direction >= 0 ? '-25%' : '25%',
    scale: 1,
    opacity: 0.99,
    zIndex: 0,
  }),
};

export default function Home() {
  const { settings } = useCart();
  const [[slideIdx, direction], setSlide] = useState<[number, number]>([0, 1]);
  const [failedBannerIds, setFailedBannerIds] = useState<Record<string, boolean>>({});

  const { data: heroBanners = [] } = useQuery({
    queryKey: ['banners', 'hero'],
    queryFn: () => getBanners('hero'),
  });

  const { data: promoBanners = [] } = useQuery({
    queryKey: ['banners', 'promo'],
    queryFn: () => getBanners('promo'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: getBusinesses,
  });

  const {
    data: featuredProducts = [],
    isLoading: loadingFeatured,
    isError: errorFeatured,
    refetch: refetchFeatured,
  } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => getFeaturedProducts(8),
  });

  const { data: newArrivals = [], isLoading: loadingNew } = useQuery({
    queryKey: ['products', 'new-arrivals'],
    queryFn: () => getNewArrivals(8),
  });

  useEffect(() => {
    heroBanners.forEach((banner) => {
      if (!banner.image_url) return;
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = banner.image_url;
    });
  }, [heroBanners]);

  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const timer = window.setInterval(() => {
      setSlide(([prev]) => [(prev + 1) % heroBanners.length, 1]);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [heroBanners.length, slideIdx]);

  const safeSlideIdx = heroBanners.length > 0 ? slideIdx % heroBanners.length : 0;
  const activeBanner = heroBanners[safeSlideIdx];
  const promo = promoBanners[0];

  const goPrev = () => {
    if (heroBanners.length <= 1) return;
    setSlide(([prev]) => [(prev - 1 + heroBanners.length) % heroBanners.length, -1]);
  };

  const goNext = () => {
    if (heroBanners.length <= 1) return;
    setSlide(([prev]) => [(prev + 1) % heroBanners.length, 1]);
  };

  const goToSlide = (targetIdx: number) => {
    setSlide(([prev]) => [targetIdx, targetIdx >= prev ? 1 : -1]);
  };

  return (
    <div className="pb-8">
      {/* Hero Banner */}
      <section className="max-w-[1280px] mx-auto px-4 md:px-8 pt-6">
        <div className="relative rounded-xl overflow-hidden bg-[#1E293B] h-[300px] sm:h-[380px] md:h-[420px] border border-[#E8E8E8]">
          {activeBanner ? (
            <>
              <AnimatePresence initial={false} custom={direction}>
                {!activeBanner.image_url || failedBannerIds[activeBanner.id] ? (
                  <motion.div
                    key={`fallback-${activeBanner.id}`}
                    custom={direction}
                    variants={heroImageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F3F4F6] to-[#E5E7EB] text-[#6B7280] select-none p-4 text-center"
                    role="img"
                    aria-label={activeBanner.title}
                  >
                    <Package className="w-7 h-7 mb-1.5 text-[#9CA3AF]" strokeWidth={1.5} />
                    <span className="text-xs font-medium text-[#6B7280] line-clamp-2">
                      {activeBanner.title}
                    </span>
                  </motion.div>
                ) : (
                  <motion.img
                    key={activeBanner.id || activeBanner.image_url}
                    src={activeBanner.image_url}
                    alt={activeBanner.title}
                    referrerPolicy="no-referrer"
                    custom={direction}
                    variants={heroImageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    onError={() =>
                      setFailedBannerIds((prev) => ({ ...prev, [activeBanner.id]: true }))
                    }
                    className="absolute inset-0 w-full h-full object-cover will-change-transform"
                  />
                )}
              </AnimatePresence>
              <div
                className="absolute inset-0 z-10 bg-gradient-to-r from-black/85 via-black/50 to-transparent pointer-events-none"
                aria-hidden="true"
              />
              <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 pb-8 sm:pb-0 sm:px-16 md:px-20 max-w-2xl text-white">
                <h1 className="font-display text-2xl sm:text-4xl md:text-[42px] font-bold leading-tight tracking-tight text-balance mb-2.5 sm:mb-3">
                  {activeBanner.title}
                </h1>
                <p className="text-sm md:text-base text-white/90 leading-relaxed mb-5 sm:mb-6 max-w-lg line-clamp-2 sm:line-clamp-3">
                  {activeBanner.subtitle}
                </p>
                <div>
                  <Link
                    to={activeBanner.link_url || '/products'}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold transition-colors whitespace-nowrap"
                  >
                    Shop Collection
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full skeleton-shimmer" />
          )}

          {heroBanners.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous hero banner"
                className="hidden sm:flex absolute z-30 left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 text-[#1A1A1A] items-center justify-center hover:bg-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next hero banner"
                className="hidden sm:flex absolute z-30 right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 text-[#1A1A1A] items-center justify-center hover:bg-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute z-30 bottom-3.5 left-6 sm:left-1/2 sm:-translate-x-1/2 flex items-center gap-2">
                {heroBanners.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => goToSlide(i)}
                    aria-label={`Go to banner ${i + 1}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      i === safeSlideIdx ? 'w-6 bg-[#FF6B35]' : 'w-2 bg-white/60'
                    }`}
                  />
                ))}
              </div>
              <div className="sm:hidden absolute z-30 bottom-3 right-4 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous banner slide"
                  className="w-8 h-8 rounded-full bg-white/90 text-[#1A1A1A] flex items-center justify-center hover:bg-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next banner slide"
                  className="w-8 h-8 rounded-full bg-white/90 text-[#1A1A1A] flex items-center justify-center hover:bg-white cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Storefront Value Strip (below hero per Design Rule) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 bg-white border border-[#E8E8E8] rounded-xl px-6 py-4">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-[#FF6B35] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">Free Nationwide Shipping</p>
              <p className="text-xs text-[#6B7280]">
                On orders above {formatPrice(settings.free_shipping_threshold)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-[#FF6B35] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">Flexible Pakistan Payments</p>
              <p className="text-xs text-[#6B7280]">COD, JazzCash &amp; EasyPaisa</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#FF6B35] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">7-Day Return Guarantee</p>
              <p className="text-xs text-[#6B7280]">Verified original merchandise</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="max-w-[1280px] mx-auto px-4 md:px-8 mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-[#1A1A1A]">Shop by Category</h2>
          <Link
            to="/products"
            className="text-sm font-semibold text-[#FF6B35] hover:text-[#E55A26] inline-flex items-center gap-1 whitespace-nowrap"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.slug}`}
              className="group bg-white border border-[#E8E8E8] rounded-xl p-3.5 flex items-center gap-3.5 hover:border-[#FF6B35] hover:shadow-sm transition-all"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#F3F4F6] border border-[#E8E8E8] shrink-0">
                <SafeImage
                  src={cat.image_url}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#1A1A1A] group-hover:text-[#FF6B35] transition-colors truncate">
                  {cat.name}
                </span>
                <span className="block text-xs text-[#6B7280] mt-0.5 tabular-nums">
                  {cat.product_count ?? 0} {(cat.product_count ?? 0) === 1 ? 'item' : 'items'}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#FF6B35] shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      {/* Trending / Featured Collection */}
      <section className="max-w-[1280px] mx-auto px-4 md:px-8 mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-[#1A1A1A]">Featured Products</h2>
          <Link
            to="/products"
            className="text-sm font-semibold text-[#FF6B35] hover:text-[#E55A26] inline-flex items-center gap-1 whitespace-nowrap"
          >
            Browse Catalog <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {errorFeatured ? (
          <ErrorState onRetry={() => refetchFeatured()} />
        ) : loadingFeatured ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Promo Banner */}
      {promo && (
        <section className="max-w-[1280px] mx-auto px-4 md:px-8 mt-12">
          <div className="bg-[#1E293B] text-white rounded-xl overflow-hidden border border-[#E8E8E8] grid md:grid-cols-3 items-stretch">
            <div className="md:col-span-2 p-7 md:p-10 flex flex-col justify-center">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-balance mb-2">
                {promo.title}
              </h2>
              <p className="text-sm text-slate-300 mb-5 max-w-xl">{promo.subtitle}</p>
              <div>
                <Link
                  to={promo.link_url || '/products'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  Shop Now
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="hidden md:block h-full min-h-[200px]">
              <SafeImage
                src={promo.image_url}
                alt={promo.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      <section className="max-w-[1280px] mx-auto px-4 md:px-8 mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-[#1A1A1A]">New Arrivals</h2>
          <Link
            to="/products?sort=newest"
            className="text-sm font-semibold text-[#FF6B35] hover:text-[#E55A26] inline-flex items-center gap-1 whitespace-nowrap"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingNew ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Partner Businesses Showcase */}
      {businesses.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-4 md:px-8 mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#1A1A1A]">
                Verified Partner Businesses
              </h2>
              <p className="text-sm text-[#6B7280] mt-0.5">
                Direct storefronts managed through Zyro Mall Pakistan
              </p>
            </div>
            <Link
              to="/products"
              className="text-sm font-semibold text-[#FF6B35] hover:text-[#E55A26] inline-flex items-center gap-1 whitespace-nowrap"
            >
              Explore All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.slice(0, 6).map((biz) => (
              <Link
                key={biz.id}
                to={`/products?business=${encodeURIComponent(biz.slug)}`}
                className="group bg-white border border-[#E8E8E8] rounded-xl overflow-hidden flex items-stretch hover:border-[#FF6B35] hover:shadow-sm transition-all"
              >
                <div className="w-28 sm:w-32 bg-[#F3F4F6] shrink-0 overflow-hidden">
                  <SafeImage
                    src={biz.image_url}
                    alt={biz.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4 flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#FF6B35] mb-1">
                      <Store className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{biz.category_name || 'Marketplace'}</span>
                    </div>
                    <h3 className="font-display text-base font-bold text-[#1A1A1A] group-hover:text-[#FF6B35] transition-colors truncate">
                      {biz.name}
                    </h3>
                    <p className="text-xs text-[#6B7280] line-clamp-2 mt-1">{biz.tagline}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#6B7280] mt-3 pt-2 border-t border-[#E8E8E8]">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#9CA3AF]" />
                      {biz.city}
                    </span>
                    <span className="font-semibold text-[#1A1A1A] tabular-nums">
                      {biz.product_count ?? 0} products
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
