import { useMemo, useState } from 'react';
import { ChevronRight, LayoutGrid, List, MessageCircle, Search, SlidersHorizontal, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBusinesses, getCategories, getProducts } from '../services/productService';
import {
  buildWhatsAppOrderUrl,
  DEFAULT_MAX_PRICE_CEILING,
  formatPrice,
  getDiscountPercent,
  getEffectivePrice,
  parseMaxPriceCeiling,
  parsePerPageOption,
  PER_PAGE_OPTIONS,
} from '../lib/commerce';
import type { SortOption } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { SkeletonCard } from '../components/common/LoadingSpinner';
import { EmptyState, ErrorState } from '../components/common/EmptyState';
import { Pagination } from '../components/common/Pagination';
import { SafeImage } from '../components/common/SafeImage';
import { StarRating } from '../components/common/StarRating';
import { SmartCatalogAdvisor } from '../components/product/SmartCatalogAdvisor';
import { useCart } from '../contexts/CartContext';

export default function ProductListing({ searchMode = false }: { searchMode?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart, settings } = useCart();

  const categoryParam = searchParams.get('category') || '';
  const businessParam = searchParams.get('business') || '';
  const searchQuery = searchParams.get('q') || '';
  const sortParam = (searchParams.get('sort') as SortOption) || 'newest';
  const pageParam = Math.max(1, Number(searchParams.get('page')) || 1);
  const perPage = parsePerPageOption(searchParams.get('perPage'));
  const maxPrice = parseMaxPriceCeiling(searchParams.get('maxPrice'), DEFAULT_MAX_PRICE_CEILING);
  const minRating = Math.max(0, Math.min(5, Number(searchParams.get('minRating')) || 0));
  const inStockOnly = searchParams.get('inStock') === '1';

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeCategories = useMemo(
    () => (categoryParam ? categoryParam.split(',').filter(Boolean) : []),
    [categoryParam]
  );

  const activeBusinesses = useMemo(
    () => (businessParam ? businessParam.split(',').filter(Boolean) : []),
    [businessParam]
  );

  const { data: categoriesRaw = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: businessesRaw = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: getBusinesses,
  });

  const {
    data = { items: [], total: 0, page: 1, perPage, totalPages: 1 },
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      'products',
      {
        category: activeCategories.join(','),
        business: activeBusinesses.join(','),
        search: searchQuery,
        maxPrice,
        minRating,
        inStockOnly,
        sort: sortParam,
        page: pageParam,
        perPage,
      },
    ],
    queryFn: () =>
      getProducts(
        {
          category: activeCategories.join(',') || undefined,
          business: activeBusinesses.join(',') || undefined,
          search: searchQuery || undefined,
          maxPrice: maxPrice < DEFAULT_MAX_PRICE_CEILING ? maxPrice : undefined,
          minRating: minRating > 0 ? minRating : undefined,
          inStockOnly,
          sort: sortParam,
        },
        pageParam,
        perPage
      ),
  });

  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const businesses = Array.isArray(businessesRaw) ? businessesRaw : [];
  const items = Array.isArray(data?.items) ? data.items : [];

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  }

  function toggleCategory(slug: string) {
    const exists = activeCategories.includes(slug);
    const nextList = exists
      ? activeCategories.filter((c) => c !== slug)
      : [...activeCategories, slug];
    updateParam('category', nextList.length > 0 ? nextList.join(',') : null);
  }

  function toggleBusiness(slugOrId: string) {
    const exists = activeBusinesses.includes(slugOrId);
    const nextList = exists
      ? activeBusinesses.filter((b) => b !== slugOrId)
      : [...activeBusinesses, slugOrId];
    updateParam('business', nextList.length > 0 ? nextList.join(',') : null);
  }

  function clearFilters() {
    const next = new URLSearchParams();
    if (searchQuery) next.set('q', searchQuery);
    setSearchParams(next);
  }

  const filterSidebar = (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-sm font-semibold text-[#1A1A1A] mb-3">Categories</h3>
        <div className="space-y-2">
          {(categories ?? []).map((cat) => {
            const checked = activeCategories.includes(cat.slug);
            return (
              <label key={cat.id} className="flex items-center gap-2.5 text-sm text-[#1A1A1A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCategory(cat.slug)}
                  className="w-4 h-4 rounded border-[#E8E8E8] accent-[#FF6B35]"
                />
                <span className="flex-1 truncate">{cat.name}</span>
                <span className="text-xs text-[#9CA3AF] tabular-nums">{cat.product_count ?? 0}</span>
              </label>
            );
          })}
        </div>
      </div>

      {businesses.length > 0 && (
        <div className="pt-5 border-t border-[#E8E8E8]">
          <h3 className="font-display text-sm font-semibold text-[#1A1A1A] mb-3">Partner Businesses</h3>
          <div className="space-y-2">
            {(businesses ?? []).map((biz) => {
              const checked =
                activeBusinesses.includes(biz.slug) || activeBusinesses.includes(biz.id);
              return (
                <label key={biz.id} className="flex items-center gap-2.5 text-sm text-[#1A1A1A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleBusiness(biz.slug)}
                    className="w-4 h-4 rounded border-[#E8E8E8] accent-[#FF6B35]"
                  />
                  <span className="flex-1 truncate">{biz.name}</span>
                  <span className="text-xs text-[#9CA3AF] tabular-nums">{biz.product_count ?? 0}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-5 border-t border-[#E8E8E8]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-sm font-semibold text-[#1A1A1A]">Max Price</h3>
          <span className="text-xs font-semibold text-[#FF6B35] tabular-nums">
            {formatPrice(maxPrice)}
          </span>
        </div>
        <input
          type="range"
          min={1000}
          max={DEFAULT_MAX_PRICE_CEILING}
          step={1000}
          value={maxPrice}
          aria-label="Maximum price filter"
          onChange={(e) => {
            const val = Number(e.target.value);
            updateParam('maxPrice', val < DEFAULT_MAX_PRICE_CEILING ? String(val) : null);
          }}
          className="w-full accent-[#FF6B35] cursor-pointer"
        />
        <div className="flex justify-between text-[11px] text-[#9CA3AF] tabular-nums mt-1">
          <span>PKR 1,000</span>
          <span>PKR 100,000</span>
        </div>
      </div>

      <div className="pt-5 border-t border-[#E8E8E8]">
        <h3 className="font-display text-sm font-semibold text-[#1A1A1A] mb-3">Customer Rating</h3>
        <div className="space-y-2">
          {[4, 3, 0].map((ratingVal) => (
            <label key={ratingVal} className="flex items-center gap-2.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="rating-filter"
                checked={minRating === ratingVal}
                onChange={() => updateParam('minRating', ratingVal > 0 ? String(ratingVal) : null)}
                className="accent-[#FF6B35]"
              />
              <span className="text-[#1A1A1A]">
                {ratingVal === 0 ? 'All ratings' : `${ratingVal} stars & up`}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-5 border-t border-[#E8E8E8]">
        <label className="flex items-center gap-2.5 text-sm font-medium text-[#1A1A1A] cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => updateParam('inStock', e.target.checked ? '1' : null)}
            className="w-4 h-4 rounded accent-[#FF6B35]"
          />
          In Stock only
        </label>
      </div>

      <button
        type="button"
        onClick={clearFilters}
        className="w-full py-2 px-4 rounded-lg border border-[#E8E8E8] text-xs font-semibold text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F8F8F8] cursor-pointer"
      >
        Reset Filters
      </button>
    </div>
  );

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-5" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-[#FF6B35]">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#1A1A1A] font-medium">
          {searchMode && searchQuery ? `Search: "${searchQuery}"` : 'Products'}
        </span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#1A1A1A]">
            {searchMode && searchQuery ? `Results for "${searchQuery}"` : 'All Products'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-1 tabular-nums">
            {data ? `${data.total} products available` : 'Loading catalog...'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden h-10 px-3.5 rounded-lg border border-[#E8E8E8] bg-white text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>

          <label className="sr-only" htmlFor="per-page-select">
            Products per page
          </label>
          <select
            id="per-page-select"
            value={perPage}
            onChange={(e) =>
              updateParam('perPage', e.target.value === '12' ? null : e.target.value)
            }
            className="h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm font-medium text-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] cursor-pointer"
          >
            {PER_PAGE_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count} / page
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="sort-select">
            Sort products
          </label>
          <select
            id="sort-select"
            value={sortParam}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm font-medium text-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] cursor-pointer"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="best_rated">Best Rated</option>
          </select>

          <div className="hidden sm:inline-flex items-center bg-white border border-[#E8E8E8] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-2 rounded-md cursor-pointer ${
                viewMode === 'grid' ? 'bg-[#FFF0EA] text-[#FF6B35]' : 'text-[#6B7280]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`p-2 rounded-md cursor-pointer ${
                viewMode === 'list' ? 'bg-[#FFF0EA] text-[#FF6B35]' : 'text-[#6B7280]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Deep Thinking Mode Shopping & Bundle Advisor */}
      <SmartCatalogAdvisor mode="catalog" />

      <div className="flex gap-8 items-start">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 bg-white border border-[#E8E8E8] rounded-xl p-5 sticky top-24">
          {filterSidebar}
        </aside>

        {/* Product Results */}
        <div className="flex-1 min-w-0">
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Search className="w-6 h-6" />}
              title="No products found"
              description="Try adjusting your category, price ceiling, or search keywords."
              ctaLabel="Clear All Filters"
              onAction={clearFilters}
            />
          ) : viewMode === 'grid' ? (
            <motion.div
              key={`${pageParam}-${sortParam}-${categoryParam}-${businessParam}`}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
            >
              {(items ?? []).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </motion.div>
          ) : (
            <div className="space-y-4">
              {(items ?? []).map((product) => {
                const effectivePrice = getEffectivePrice(product);
                const discountPercent = getDiscountPercent(product.price, product.sale_price);
                const outOfStock =
                  product.stock_quantity <= 0 || product.status === 'out_of_stock';
                const whatsappUrl = buildWhatsAppOrderUrl(settings.whatsapp_number, {
                  productTitle: product.title,
                  price: effectivePrice,
                  originalPrice: discountPercent ? product.price : null,
                  categoryName: product.category_name,
                  sku: product.sku,
                  businessName: product.business_name,
                  productUrl:
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/products/${product.slug}`
                      : undefined,
                });
                return (
                  <motion.article
                    key={product.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white border border-[#E8E8E8] rounded-xl p-4 flex flex-col sm:flex-row gap-5 items-start"
                  >
                    <Link
                      to={`/products/${product.slug}`}
                      className="w-full sm:w-44 aspect-[4/3] rounded-lg overflow-hidden bg-[#F3F4F6] shrink-0"
                    >
                      <SafeImage
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#6B7280] mb-1">
                        {product.category_name}
                        {product.business_name ? ` · ${product.business_name}` : ''} ·{' '}
                        <span className="font-mono">{product.sku}</span>
                      </p>
                      <Link
                        to={`/products/${product.slug}`}
                        className="font-display text-lg font-semibold text-[#1A1A1A] hover:text-[#FF6B35]"
                      >
                        {product.title}
                      </Link>
                      <div className="mt-1.5 mb-2">
                        <StarRating
                          rating={product.rating_avg ?? 0}
                          count={product.review_count ?? 0}
                        />
                      </div>
                      <p className="text-sm text-[#6B7280] line-clamp-2 mb-4">
                        {product.description}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-lg font-bold text-[#1A1A1A] tabular-nums">
                            {formatPrice(effectivePrice)}
                          </span>
                          {discountPercent !== null && (
                            <>
                              <span className="text-xs text-[#9CA3AF] line-through tabular-nums">
                                {formatPrice(product.price)}
                              </span>
                              <span className="text-xs font-semibold text-[#15803D] tabular-nums">
                                -{discountPercent}%
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 rounded-lg border border-[#16A34A]/30 bg-[#ECFDF5] text-[#15803D] hover:bg-[#16A34A] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp
                          </a>
                          <button
                            type="button"
                            disabled={outOfStock}
                            onClick={() => addToCart(product.id, 1, product.variants?.[0]?.id ?? null)}
                            className="px-5 py-2 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold disabled:opacity-50 cursor-pointer whitespace-nowrap"
                          >
                            {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}

          {data && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={(nextPage) => updateParam('page', String(nextPage))}
            />
          )}
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end" role="dialog" aria-modal="true" aria-label="Filter products">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-80 max-w-[85vw] bg-white h-full overflow-y-auto p-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E8] mb-5">
              <h2 className="font-display font-bold text-lg text-[#1A1A1A]">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="p-1.5 text-[#6B7280] hover:text-[#1A1A1A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {filterSidebar}
          </div>
        </div>
      )}
    </div>
  );
}
