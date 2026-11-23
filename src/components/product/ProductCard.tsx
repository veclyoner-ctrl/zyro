import { Heart, MessageCircle, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import {
  buildWhatsAppOrderUrl,
  formatPrice,
  getDiscountPercent,
  getEffectivePrice,
  getStockState,
} from '../../lib/commerce';
import { cn } from '../../lib/utils';
import type { Product } from '../../types';
import { SafeImage } from '../common/SafeImage';
import { StarRating } from '../common/StarRating';

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, settings } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const effectivePrice = getEffectivePrice(product);
  const discountPercent = getDiscountPercent(product.price, product.sale_price);
  const hasSale = discountPercent !== null;
  const stockState = getStockState(product.stock_quantity, settings.low_stock_threshold);
  const outOfStock = stockState === 'out_of_stock' || product.status === 'out_of_stock';
  const wishlisted = isWishlisted(product.id);

  const productUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/products/${product.slug}`
      : `/products/${product.slug}`;

  const whatsappUrl = buildWhatsAppOrderUrl(settings.whatsapp_number, {
    productTitle: product.title,
    price: effectivePrice,
    originalPrice: hasSale ? product.price : null,
    categoryName: product.category_name,
    sku: product.sku,
    businessName: product.business_name,
    productUrl,
  });

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="group bg-white rounded-lg border border-[#E8E8E8] overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-[#F3F4F6] overflow-hidden">
        <Link to={`/products/${product.slug}`} className="block w-full h-full">
          <SafeImage
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full transition-transform duration-300 group-hover:scale-[1.04]"
          />
        </Link>

        {hasSale && !outOfStock && (
          <span className="absolute top-3 left-3 bg-[#1A1A1A] text-white text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded tabular-nums">
            -{discountPercent}%
          </span>
        )}
        {outOfStock && (
          <span className="absolute top-3 left-3 bg-[#EF4444] text-white text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded">
            Out of Stock
          </span>
        )}

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={
            wishlisted ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`
          }
          className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/95 border border-[#E8E8E8] flex items-center justify-center text-[#1A1A1A] hover:border-[#FF6B35] transition-colors cursor-pointer"
        >
          <Heart
            className={cn(
              'w-4 h-4 transition-colors',
              wishlisted ? 'fill-[#FF6B35] text-[#FF6B35]' : 'text-[#6B7280]'
            )}
          />
        </button>
      </div>

      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-1">
          <span className="truncate">{product.category_name || 'General'}</span>
          {stockState === 'low_stock' && !outOfStock && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-amber-600 font-medium whitespace-nowrap">
                Only {product.stock_quantity} left
              </span>
            </>
          )}
        </div>

        <Link
          to={`/products/${product.slug}`}
          className="font-display text-[15px] font-semibold text-[#1A1A1A] hover:text-[#FF6B35] transition-colors line-clamp-2 leading-snug mb-1.5"
        >
          {product.title}
        </Link>

        {product.business_name && (
          <p className="text-[11px] text-[#6B7280] truncate mb-2">{product.business_name}</p>
        )}

        <div className="mb-3">
          <StarRating rating={product.rating_avg ?? 0} count={product.review_count ?? 0} />
        </div>

        <div className="mt-auto pt-2 flex flex-wrap items-baseline gap-2 mb-3">
          <span className="font-display text-lg font-bold text-[#1A1A1A] tabular-nums">
            {formatPrice(effectivePrice)}
          </span>
          {hasSale && (
            <span className="text-xs text-[#9CA3AF] line-through tabular-nums">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => addToCart(product.id, 1, product.variants?.[0]?.id ?? null)}
            className={cn(
              'py-2 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap',
              outOfStock
                ? 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
                : 'bg-[#FF6B35] hover:bg-[#E55A26] text-white cursor-pointer active:scale-[0.98]'
            )}
          >
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            <span>{outOfStock ? 'Unavailable' : 'Add to Cart'}</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Order ${product.title} on WhatsApp`}
            className="py-2 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 border border-[#16A34A]/30 bg-[#ECFDF5] text-[#15803D] hover:bg-[#16A34A] hover:text-white transition-colors whitespace-nowrap"
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </motion.article>
  );
}
