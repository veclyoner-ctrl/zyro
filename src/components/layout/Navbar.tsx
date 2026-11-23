import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingCart,
  User,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { getCategories, getProducts } from '../../services/productService';
import { getUserOrders } from '../../services/orderService';
import { formatPrice, getEffectivePrice } from '../../lib/commerce';
import type { Product } from '../../types';
import { SafeImage } from '../common/SafeImage';

const FALLBACK_NAV_LINKS = [
  { label: 'All Products', to: '/products' },
  { label: 'Electronics', to: '/products?category=electronics' },
  { label: 'Leather', to: '/products?category=leather-bags' },
  { label: 'Home', to: '/products?category=home-lighting' },
  { label: 'Footwear', to: '/products?category=footwear' },
  { label: 'Fragrances', to: '/products?category=fragrances' },
];

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const { cartCount, openDrawer, settings } = useCart();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();

  const storeName = settings.store_name || 'Zyro Mall';
  const { data: categoriesRaw = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });
  const { data: userOrdersRaw = [] } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: getUserOrders,
    enabled: Boolean(user),
  });
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const userOrders = Array.isArray(userOrdersRaw) ? userOrdersRaw : [];
  const activeOrdersCount = userOrders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  ).length;

  const navLinks =
    categories.length > 0
      ? [
          { label: 'All Products', to: '/products' },
          ...categories
            .filter((c) => !c.parent_id && c.is_active)
            .slice(0, 5)
            .map((c) => ({ label: c.name.split(' & ')[0], to: `/products?category=${c.slug}` })),
        ]
      : FALLBACK_NAV_LINKS;

  const renderBrandText = () =>
    storeName.toLowerCase() === 'zyro mall' ? (
      <>
        Zyro <span className="text-[#FF6B35]">Mall</span>
      </>
    ) : (
      storeName
    );

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await getProducts({ search: trimmed }, 1, 5);
        setSuggestions(Array.isArray(res?.items) ? res.items : []);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    setShowSuggestions(false);
    setMobileSearchOpen(false);
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/products');
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E8E8E8]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-[#FF6B35] focus:text-white focus:rounded-lg text-sm font-medium"
      >
        Skip to content
      </a>

      <div className="max-w-[1280px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Left: Mobile menu toggle + Single-element Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="lg:hidden w-10 h-10 -ml-2 rounded-lg flex items-center justify-center text-[#1A1A1A] hover:bg-[#F3F4F6] cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-[#1A1A1A] whitespace-nowrap shrink-0"
          >
            {settings.store_logo_url && (
              <img
                src={settings.store_logo_url}
                alt={storeName}
                className="h-7 w-7 rounded object-contain shrink-0"
              />
            )}
            <span>{renderBrandText()}</span>
          </Link>
        </div>

        {/* Center: Clean single-line links + search */}
        <nav
          className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#6B7280]"
          aria-label="Main navigation"
        >
          {(navLinks ?? []).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="hover:text-[#1A1A1A] transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-[#FF6B35]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div ref={searchRef} className="hidden md:block relative flex-1 max-w-sm">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              placeholder="Search products, SKU..."
              aria-label="Search products"
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#E8E8E8] bg-[#F8F8F8] focus:bg-white text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]"
            />
          </form>

          {showSuggestions && Array.isArray(suggestions) && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E8E8E8] rounded-xl shadow-lg overflow-hidden z-50">
              {(suggestions ?? []).map((item) => (
                <Link
                  key={item.id}
                  to={`/products/${item.slug}`}
                  onClick={() => setShowSuggestions(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-[#F8F8F8] transition-colors"
                >
                  <SafeImage
                    src={item.images[0]}
                    alt={item.title}
                    className="w-10 h-10 rounded-md shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{item.title}</p>
                    <p className="text-xs text-[#6B7280] tabular-nums">
                      {formatPrice(getEffectivePrice(item))}
                    </p>
                  </div>
                </Link>
              ))}
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="w-full px-3.5 py-2 text-xs font-semibold text-[#FF6B35] bg-[#FFF0EA]/60 hover:bg-[#FFF0EA] text-left cursor-pointer"
              >
                View all results for &ldquo;{searchQuery.trim()}&rdquo;
              </button>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label="Toggle search"
            className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center text-[#1A1A1A] hover:bg-[#F3F4F6] cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </button>

          <Link
            to="/wishlist"
            aria-label={`Wishlist (${wishlistCount} items)`}
            className="relative w-10 h-10 rounded-lg flex items-center justify-center text-[#1A1A1A] hover:bg-[#F3F4F6] transition-colors"
          >
            <Heart className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#1A1A1A] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {wishlistCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={openDrawer}
            aria-label={`Open cart (${cartCount} items)`}
            className="relative w-10 h-10 rounded-lg flex items-center justify-center text-[#1A1A1A] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF6B35] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {cartCount}
              </span>
            )}
          </button>

          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-expanded={userMenuOpen}
                aria-label="Account menu"
                className="relative h-10 px-3 rounded-lg border border-[#E8E8E8] hover:border-[#FF6B35] bg-white inline-flex items-center gap-2 text-sm font-medium text-[#1A1A1A] cursor-pointer whitespace-nowrap shrink-0"
              >
                <User className="w-4 h-4 text-[#FF6B35]" />
                <span className="hidden sm:inline max-w-[110px] truncate">
                  {user.full_name.split(' ')[0]}
                </span>
                {activeOrdersCount > 0 && (
                  <span
                    title={`${activeOrdersCount} active order(s)`}
                    className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#FFF0EA] text-[#FF6B35] border border-[#FF6B35]/30 text-[10px] font-bold inline-flex items-center justify-center tabular-nums"
                  >
                    {activeOrdersCount}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-[#E8E8E8] rounded-xl shadow-lg py-1.5 z-50">
                  <div className="px-3.5 py-2 border-b border-[#E8E8E8]">
                    <p className="text-xs font-semibold text-[#1A1A1A] truncate">
                      {user.full_name}
                    </p>
                    <p className="text-[11px] text-[#6B7280] truncate">{user.email}</p>
                  </div>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-[#FF6B35] font-semibold hover:bg-[#FFF0EA]"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                  )}
                  <Link
                    to="/orders"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center justify-between gap-2.5 px-3.5 py-2 text-sm text-[#1A1A1A] hover:bg-[#F8F8F8]"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Package className="w-4 h-4 text-[#6B7280]" />
                      My Orders
                    </span>
                    {activeOrdersCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-[#FFF0EA] text-[#FF6B35] text-[11px] font-semibold tabular-nums">
                        {activeOrdersCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-[#1A1A1A] hover:bg-[#F8F8F8]"
                  >
                    <User className="w-4 h-4 text-[#6B7280]" />
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut();
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[#EF4444] hover:bg-red-50 text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="h-10 px-4 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center justify-center transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Search Bar Dropdown (only when toggled) */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-3 border-t border-[#E8E8E8] pt-3 bg-white">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Zyro Mall..."
              aria-label="Search products mobile"
              className="flex-1 h-10 px-3.5 rounded-lg border border-[#E8E8E8] bg-[#F8F8F8] text-sm focus:outline-none focus:border-[#FF6B35]"
            />
            <button
              type="submit"
              className="px-4 h-10 rounded-lg bg-[#FF6B35] text-white text-sm font-semibold cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Mobile Slide-In Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true" aria-label="Mobile menu">
          <div
            className="fixed inset-0 bg-black/45"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-72 max-w-[85vw] bg-white h-full flex flex-col p-5 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E8]">
              <span className="inline-flex items-center gap-2 font-display text-lg font-extrabold text-[#1A1A1A]">
                {settings.store_logo_url && (
                  <img
                    src={settings.store_logo_url}
                    alt={storeName}
                    className="h-6 w-6 rounded object-contain shrink-0"
                  />
                )}
                <span>{renderBrandText()}</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-1.5 text-[#6B7280] hover:text-[#1A1A1A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="py-4 flex flex-col gap-1" aria-label="Mobile navigation">
              {(navLinks ?? []).map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-[#1A1A1A] hover:bg-[#FFF0EA] hover:text-[#FF6B35]"
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-2 border-t border-[#E8E8E8]" />
              <Link
                to="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-[#1A1A1A] hover:bg-[#F8F8F8]"
              >
                Shopping Cart ({cartCount})
              </Link>
              <Link
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-[#1A1A1A] hover:bg-[#F8F8F8]"
              >
                Wishlist ({wishlistCount})
              </Link>
              {user && (
                <>
                  <Link
                    to="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2.5 rounded-lg text-sm font-medium text-[#1A1A1A] hover:bg-[#F8F8F8] flex items-center justify-between"
                  >
                    <span>My Orders</span>
                    {activeOrdersCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-[#FFF0EA] text-[#FF6B35] text-xs font-semibold tabular-nums">
                        {activeOrdersCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2.5 rounded-lg text-sm font-medium text-[#1A1A1A] hover:bg-[#F8F8F8]"
                  >
                    Profile
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2.5 rounded-lg text-sm font-semibold text-[#FF6B35] hover:bg-[#FFF0EA]"
                    >
                      Admin Dashboard
                    </Link>
                  )}
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
