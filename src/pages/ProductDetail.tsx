import React, { useEffect, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Heart,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  ShoppingCart,
  Store,
  X,
  Zap,
  ZoomIn,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProductBySlug } from '../services/productService';
import {
  checkReviewEligibility,
  createReview,
  getProductReviews,
  updateReview,
} from '../services/reviewService';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import {
  buildWhatsAppOrderUrl,
  formatDate,
  formatPrice,
  getDiscountPercent,
  getEffectivePrice,
  getStockState,
} from '../lib/commerce';
import { cn } from '../lib/utils';
import { SafeImage } from '../components/common/SafeImage';
import { StarRating } from '../components/common/StarRating';
import { SkeletonDetailPage } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/EmptyState';
import { Pagination } from '../components/common/Pagination';
import { ProductCard } from '../components/product/ProductCard';

const REVIEWS_PER_PAGE = 5;

export default function ProductDetail() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, settings } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const queryClient = useQueryClient();

  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [editingOwnReview, setEditingOwnReview] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => getProductBySlug(slug),
    enabled: Boolean(slug),
  });

  const product = data?.product;
  const related = data?.related ?? [];

  useEffect(() => {
    setSelectedImage(0);
    setLightboxOpen(false);
    setQuantity(1);
    setReviewPage(1);
    setEditingOwnReview(false);
    if (product?.variants && product.variants.length > 0) {
      setSelectedVariantId(product.variants[0].id);
    } else {
      setSelectedVariantId(null);
    }
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const prevTitle = document.title;
    document.title = `${product.title} — ${settings.store_name || 'Zyro Mall'}`;
    return () => {
      document.title = prevTitle;
    };
  }, [product, settings.store_name]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxOpen(false);
      } else if (e.key === 'ArrowRight' && product && product.images.length > 1) {
        setSelectedImage((prev) => (prev + 1) % product.images.length);
      } else if (e.key === 'ArrowLeft' && product && product.images.length > 1) {
        setSelectedImage((prev) => (prev - 1 + product.images.length) % product.images.length);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, product]);

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', product?.id],
    queryFn: () => getProductReviews(product!.id),
    enabled: Boolean(product?.id),
  });

  const { data: eligibility } = useQuery({
    queryKey: ['review-eligibility', product?.id, user?.id],
    queryFn: () => checkReviewEligibility(product!.id),
    enabled: Boolean(product?.id && user),
  });

  if (isLoading) return <SkeletonDetailPage />;
  if (isError || !product) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-12">
        <ErrorState
          title="Product not found"
          message="We couldn't find the product you're looking for."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const activeVariant =
    product.variants?.find((v) => v.id === selectedVariantId) ?? null;
  const effectivePrice = getEffectivePrice(product, activeVariant?.price_modifier ?? 0);
  const originalPriceWithVariant = product.price + (activeVariant?.price_modifier ?? 0);
  const discountPercent = getDiscountPercent(product.price, product.sale_price);
  const hasSale = discountPercent !== null;
  const stockState = getStockState(product.stock_quantity, settings.low_stock_threshold);
  const outOfStock = stockState === 'out_of_stock' || product.status === 'out_of_stock';
  const wishlisted = isWishlisted(product.id);
  const whatsappUrl = buildWhatsAppOrderUrl(settings.whatsapp_number, {
    productTitle: activeVariant
      ? `${product.title} (${activeVariant.variant_value})`
      : product.title,
    price: effectivePrice,
    originalPrice: hasSale ? originalPriceWithVariant : null,
    categoryName: product.category_name,
    sku: product.sku,
    businessName: product.business_name,
    productUrl: typeof window !== 'undefined' ? window.location.href : undefined,
  });

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Product link copied');
    } catch {
      toast.success('Link ready to share');
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    if (!reviewComment.trim()) {
      toast.error('Please write a review comment.');
      return;
    }
    setSubmittingReview(true);
    try {
      await createReview({
        product_id: product.id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      toast.success('Thank you! Your review has been published.');
      setReviewComment('');
      setReviewPage(1);
      queryClient.invalidateQueries({ queryKey: ['reviews', product.id] });
      queryClient.invalidateQueries({ queryKey: ['review-eligibility', product.id] });
      queryClient.invalidateQueries({ queryKey: ['product', slug] });
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to submit review');
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleUpdateOwnReview(e: React.FormEvent) {
    e.preventDefault();
    if (!product || !eligibility?.existingReview) return;
    if (!reviewComment.trim()) {
      toast.error('Please write a review comment.');
      return;
    }
    setSubmittingReview(true);
    try {
      await updateReview(eligibility.existingReview.id, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      toast.success('Your review has been updated.');
      setEditingOwnReview(false);
      queryClient.invalidateQueries({ queryKey: ['reviews', product.id] });
      queryClient.invalidateQueries({ queryKey: ['review-eligibility', product.id] });
      queryClient.invalidateQueries({ queryKey: ['product', slug] });
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to update review');
    } finally {
      setSubmittingReview(false);
    }
  }

  const totalReviewPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
  const safeReviewPage = Math.min(reviewPage, totalReviewPages);
  const paginatedReviews = reviews.slice(
    (safeReviewPage - 1) * REVIEWS_PER_PAGE,
    safeReviewPage * REVIEWS_PER_PAGE
  );

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-[#FF6B35]">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link
          to={`/products?category=${product.category_slug || ''}`}
          className="hover:text-[#FF6B35]"
        >
          {product.category_name || 'Products'}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#1A1A1A] font-medium truncate">{product.title}</span>
      </nav>

      {/* Main Contiguous Purchase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-7 space-y-3">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Zoom product image"
            className="group relative block w-full aspect-[4/3] bg-white border border-[#E8E8E8] rounded-xl overflow-hidden cursor-zoom-in text-left"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={product.images[selectedImage] || product.images[0]}
                initial={{ opacity: 0.35, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0.35 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="w-full h-full"
              >
                <SafeImage
                  src={product.images[selectedImage] || product.images[0]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </AnimatePresence>
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/90 border border-[#E8E8E8] text-xs font-medium text-[#1A1A1A] shadow-sm opacity-90 group-hover:opacity-100">
              <ZoomIn className="w-3.5 h-3.5 text-[#FF6B35]" />
              Zoom
            </span>
          </button>
          {product.images.length > 1 && (
            <div className="flex gap-3">
              {product.images.map((img, i) => (
                <button
                  key={`${img}-${i}`}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  aria-label={`View image ${i + 1}`}
                  className={cn(
                    'w-20 aspect-[4/3] rounded-lg overflow-hidden border-2 bg-white cursor-pointer transition-colors',
                    selectedImage === i ? 'border-[#FF6B35]' : 'border-[#E8E8E8]'
                  )}
                >
                  <SafeImage src={img} alt={`${product.title} view ${i + 1}`} className="w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Sticky Purchase Module */}
        <div className="lg:col-span-5 bg-white border border-[#E8E8E8] rounded-xl p-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-2 text-xs text-[#6B7280] mb-2">
            <span>
              {product.category_name} · SKU <span className="font-mono">{product.sku}</span>
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label="Share product link"
              className="inline-flex items-center gap-1 text-[#6B7280] hover:text-[#1A1A1A] cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>

          <h1 className="font-display text-2xl font-bold text-[#1A1A1A] leading-snug mb-2">
            {product.title}
          </h1>

          {product.business_name && product.business_id && (
            <Link
              to={`/products?business=${encodeURIComponent(product.business_id)}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7280] hover:text-[#FF6B35] mb-3"
            >
              <Store className="w-3.5 h-3.5 text-[#FF6B35]" />
              Sold by <span className="font-semibold text-[#1A1A1A]">{product.business_name}</span>
            </Link>
          )}

          <div className="mb-4">
            <StarRating
              rating={product.rating_avg ?? 0}
              count={product.review_count ?? 0}
              size="md"
            />
          </div>

          <div className="flex flex-wrap items-baseline gap-3 pb-4 border-b border-[#E8E8E8]">
            <span className="font-display text-3xl font-bold text-[#1A1A1A] tabular-nums">
              {formatPrice(effectivePrice)}
            </span>
            {hasSale && (
              <>
                <span className="text-base text-[#9CA3AF] line-through tabular-nums">
                  {formatPrice(originalPriceWithVariant)}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#15803D] text-xs font-semibold tabular-nums">
                  Save {discountPercent}%
                </span>
              </>
            )}
          </div>

          <div className="py-4 space-y-4">
            {/* Stock indicator */}
            <div className="flex items-center gap-2 text-sm">
              {outOfStock ? (
                <span className="font-semibold text-[#EF4444]">Out of Stock</span>
              ) : stockState === 'low_stock' ? (
                <span className="font-semibold text-amber-600">
                  Only {product.stock_quantity} left in stock
                </span>
              ) : (
                <span className="font-semibold text-emerald-600 inline-flex items-center gap-1">
                  <Check className="w-4 h-4" /> In Stock ({product.stock_quantity} available)
                </span>
              )}
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#1A1A1A] mb-2">
                  Select {product.variants[0].variant_name}
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={cn(
                        'px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap',
                        selectedVariantId === variant.id
                          ? 'border-[#FF6B35] bg-[#FFF0EA] text-[#FF6B35]'
                          : 'border-[#E8E8E8] bg-white text-[#1A1A1A] hover:border-[#9CA3AF]'
                      )}
                    >
                      {variant.variant_value}
                      {variant.price_modifier > 0 && ` (+${formatPrice(variant.price_modifier)})`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            {!outOfStock && (
              <div>
                <p className="text-xs font-semibold text-[#1A1A1A] mb-2">Quantity</p>
                <div className="inline-flex items-center border border-[#E8E8E8] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-10 h-10 flex items-center justify-center text-[#6B7280] hover:text-[#1A1A1A] cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-semibold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => Math.min(product.stock_quantity, q + 1))
                    }
                    aria-label="Increase quantity"
                    className="w-10 h-10 flex items-center justify-center text-[#6B7280] hover:text-[#1A1A1A] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2.5 pt-2">
              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => addToCart(product.id, quantity, selectedVariantId)}
                  className="flex-1 h-12 px-5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF] disabled:cursor-not-allowed cursor-pointer transition-colors whitespace-nowrap"
                >
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={async () => {
                    const ok = await addToCart(product.id, quantity, selectedVariantId, {
                      openDrawer: false,
                    });
                    if (ok) navigate('/checkout');
                  }}
                  className="h-12 px-5 rounded-lg bg-[#1A1A1A] hover:bg-[#333333] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF] disabled:cursor-not-allowed cursor-pointer transition-colors whitespace-nowrap"
                >
                  <Zap className="w-4 h-4 shrink-0" />
                  Buy Now
                </button>
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  className="w-12 h-12 shrink-0 rounded-lg border border-[#E8E8E8] hover:border-[#FF6B35] flex items-center justify-center cursor-pointer"
                >
                  <Heart
                    className={cn(
                      'w-5 h-5',
                      wishlisted ? 'fill-[#FF6B35] text-[#FF6B35]' : 'text-[#6B7280]'
                    )}
                  />
                </button>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 px-5 rounded-lg border border-[#16A34A]/40 bg-[#ECFDF5] hover:bg-[#16A34A] text-[#15803D] hover:text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                Order on WhatsApp ({settings.whatsapp_number || '03296730804'})
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Description | Reviews */}
      <section className="mt-12 bg-white border border-[#E8E8E8] rounded-xl p-6">
        <div className="flex items-center gap-6 border-b border-[#E8E8E8] mb-6" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'description'}
            onClick={() => setActiveTab('description')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap',
              activeTab === 'description'
                ? 'border-[#FF6B35] text-[#FF6B35]'
                : 'border-transparent text-[#6B7280] hover:text-[#1A1A1A]'
            )}
          >
            Description &amp; Specifications
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'reviews'}
            onClick={() => setActiveTab('reviews')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap',
              activeTab === 'reviews'
                ? 'border-[#FF6B35] text-[#FF6B35]'
                : 'border-transparent text-[#6B7280] hover:text-[#1A1A1A]'
            )}
          >
            Verified Reviews ({reviews.length})
          </button>
        </div>

        {activeTab === 'description' ? (
          <div className="max-w-3xl space-y-4 text-sm text-[#1A1A1A] leading-relaxed">
            <p>{product.description}</p>
            <div className="grid sm:grid-cols-2 gap-3 pt-4 border-t border-[#E8E8E8] text-xs">
              <div>
                <span className="text-[#6B7280]">SKU:</span>{' '}
                <span className="font-mono font-semibold">{product.sku}</span>
              </div>
              <div>
                <span className="text-[#6B7280]">Category:</span>{' '}
                <span className="font-semibold">{product.category_name}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {user && eligibility?.canReview && (
              <form
                onSubmit={handleSubmitReview}
                className="bg-[#F8F8F8] border border-[#E8E8E8] rounded-xl p-5 space-y-4"
              >
                <h3 className="font-display text-base font-semibold text-[#1A1A1A]">
                  Write a Verified Review
                </h3>
                <div>
                  <span className="block text-xs text-[#6B7280] mb-1.5">Your Rating</span>
                  <StarRating
                    rating={reviewRating}
                    interactive
                    size="md"
                    onChange={setReviewRating}
                  />
                </div>
                <div>
                  <label htmlFor="review-comment" className="block text-xs text-[#6B7280] mb-1.5">
                    Review Comment
                  </label>
                  <textarea
                    id="review-comment"
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience with quality, sizing, or delivery..."
                    className="w-full p-3 rounded-lg border border-[#E8E8E8] bg-white text-sm focus:outline-none focus:border-[#FF6B35]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submittingReview && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            )}

            {user && eligibility?.existingReview && (
              <div className="bg-[#F8F8F8] border border-[#E8E8E8] rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-[#1A1A1A]">
                      Your Verified Review
                    </h3>
                    <p className="text-xs text-[#6B7280]">
                      Published on {formatDate(eligibility.existingReview.created_at)}
                    </p>
                  </div>
                  {!editingOwnReview && (
                    <button
                      type="button"
                      onClick={() => {
                        setReviewRating(eligibility.existingReview!.rating);
                        setReviewComment(eligibility.existingReview!.comment);
                        setEditingOwnReview(true);
                      }}
                      className="px-3.5 py-1.5 rounded-lg border border-[#E8E8E8] bg-white hover:border-[#FF6B35] text-xs font-semibold text-[#1A1A1A] inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#FF6B35]" />
                      Edit Review
                    </button>
                  )}
                </div>

                {editingOwnReview ? (
                  <form onSubmit={handleUpdateOwnReview} className="space-y-4 pt-1">
                    <div>
                      <span className="block text-xs text-[#6B7280] mb-1.5">Update Rating</span>
                      <StarRating
                        rating={reviewRating}
                        interactive
                        size="md"
                        onChange={setReviewRating}
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-own-review-comment" className="block text-xs text-[#6B7280] mb-1.5">
                        Review Comment
                      </label>
                      <textarea
                        id="edit-own-review-comment"
                        rows={3}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="w-full p-3 rounded-lg border border-[#E8E8E8] bg-white text-sm focus:outline-none focus:border-[#FF6B35]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="px-5 py-2 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {submittingReview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {submittingReview ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingOwnReview(false)}
                        className="px-4 py-2 rounded-lg border border-[#E8E8E8] bg-white text-xs font-semibold text-[#6B7280] hover:text-[#1A1A1A] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <StarRating rating={eligibility.existingReview.rating} />
                    <p className="text-sm text-[#1A1A1A] mt-2 leading-relaxed">
                      {eligibility.existingReview.comment}
                    </p>
                  </div>
                )}
              </div>
            )}

            {user && !eligibility?.canReview && !eligibility?.existingReview && (
              <p className="text-xs text-[#6B7280] bg-[#F8F8F8] border border-[#E8E8E8] rounded-lg px-4 py-3">
                Reviews can be submitted once you have a delivered order containing this product.
              </p>
            )}

            {reviews.length === 0 ? (
              <p className="text-sm text-[#6B7280]">No reviews yet for this product.</p>
            ) : (
              <>
                <div className="divide-y divide-[#E8E8E8]">
                  {paginatedReviews.map((rev) => (
                    <div key={rev.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-4 mb-1.5">
                        <span className="text-sm font-semibold text-[#1A1A1A]">
                          {rev.user_name || 'Verified Customer'}
                        </span>
                        <span className="text-xs text-[#9CA3AF]">{formatDate(rev.created_at)}</span>
                      </div>
                      <StarRating rating={rev.rating} />
                      <p className="text-sm text-[#1A1A1A] mt-2 leading-relaxed">{rev.comment}</p>
                    </div>
                  ))}
                </div>
                <Pagination
                  page={safeReviewPage}
                  totalPages={totalReviewPages}
                  onPageChange={setReviewPage}
                />
              </>
            )}
          </div>
        )}
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold text-[#1A1A1A] mb-6">
            Related Products
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      {/* Image Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${product.title} image preview`}
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-[#E8E8E8]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close image zoom"
              className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/95 border border-[#E8E8E8] flex items-center justify-center text-[#1A1A1A] hover:text-[#FF6B35] cursor-pointer shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative aspect-[4/3] bg-[#F8F8F8]">
              <SafeImage
                src={product.images[selectedImage] || product.images[0]}
                alt={`${product.title} enlarged view`}
                className="w-full h-full object-contain"
              />
              {product.images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous product image"
                    onClick={() =>
                      setSelectedImage(
                        (prev) => (prev - 1 + product.images.length) % product.images.length
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border border-[#E8E8E8] flex items-center justify-center text-[#1A1A1A] hover:text-[#FF6B35] cursor-pointer shadow-sm"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next product image"
                    onClick={() =>
                      setSelectedImage((prev) => (prev + 1) % product.images.length)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border border-[#E8E8E8] flex items-center justify-center text-[#1A1A1A] hover:text-[#FF6B35] cursor-pointer shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="flex items-center justify-center gap-2 p-3 bg-white border-t border-[#E8E8E8]">
                {product.images.map((img, i) => (
                  <button
                    key={`lb-${img}-${i}`}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    aria-label={`Select enlarged image ${i + 1}`}
                    className={cn(
                      'w-14 aspect-[4/3] rounded-md overflow-hidden border-2 cursor-pointer',
                      selectedImage === i ? 'border-[#FF6B35]' : 'border-[#E8E8E8]'
                    )}
                  >
                    <SafeImage src={img} alt={`${product.title} thumb ${i + 1}`} className="w-full h-full" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
