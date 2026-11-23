import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';
import { formatPrice, getEffectivePrice } from '../lib/commerce';
import { SafeImage } from '../components/common/SafeImage';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonCard } from '../components/common/LoadingSpinner';

export default function Wishlist() {
  const { items, isLoading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <h1 className="font-display text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-6">
        My Wishlist
      </h1>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : safeItems.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-6 h-6" />}
          title="No items in your wishlist"
          description="Save products you love so you can revisit or move them to your cart anytime."
          ctaLabel="Explore Products"
          ctaLink="/products"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {(safeItems ?? []).map((item) => {
            const product = item.product!;
            const outOfStock =
              product.stock_quantity <= 0 || product.status === 'out_of_stock';
            return (
              <article
                key={item.id}
                className="bg-white border border-[#E8E8E8] rounded-xl overflow-hidden flex flex-col"
              >
                <Link
                  to={`/products/${product.slug}`}
                  className="aspect-[4/3] bg-[#F3F4F6] overflow-hidden"
                >
                  <SafeImage
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-full"
                  />
                </Link>
                <div className="p-3 sm:p-4 flex-1 flex flex-col">
                  <Link
                    to={`/products/${product.slug}`}
                    className="font-display text-xs sm:text-sm font-semibold text-[#1A1A1A] hover:text-[#FF6B35] line-clamp-2 mb-2"
                  >
                    {product.title}
                  </Link>
                  <p className="font-display text-base sm:text-lg font-bold text-[#1A1A1A] tabular-nums mb-3 sm:mb-4 mt-auto">
                    {formatPrice(getEffectivePrice(product))}
                  </p>
                  <div className="flex gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      disabled={outOfStock}
                      onClick={async () => {
                        const added = await addToCart(
                          product.id,
                          1,
                          product.variants?.[0]?.id ?? null
                        );
                        if (added) await removeFromWishlist(product.id);
                      }}
                      className="flex-1 py-2 px-2 sm:px-3 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                      <span>{outOfStock ? 'Out of Stock' : 'Move to Cart'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromWishlist(product.id)}
                      aria-label={`Remove ${product.title} from wishlist`}
                      className="w-9 h-9 rounded-lg border border-[#E8E8E8] text-[#6B7280] hover:text-[#EF4444] flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
