import React, { useEffect, useState } from 'react';
import { Check, Edit, Loader2, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { getStoreSettings } from '../../services/productService';
import { uploadAsset } from '../../services/uploadService';
import type { Banner } from '../../types';
import { SkeletonPage } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/EmptyState';
import { SafeImage } from '../../components/common/SafeImage';
import { cn } from '../../lib/utils';

const AI_POSTER_PRESETS = [
  {
    label: 'Zyro Mall Flagship Poster',
    url: '/src/assets/images/poster_admin_welcome_1795191692080.jpg',
  },
  {
    label: 'Mega Seasonal Sale Poster',
    url: '/src/assets/images/poster_mega_sale_1795191691982.jpg',
  },
  {
    label: 'Fashion & Leather Showcase',
    url: '/src/assets/images/hero_fashion_banner_1795178618870.jpg',
  },
  {
    label: 'Tech & Audio Flagship',
    url: '/src/assets/images/hero_tech_banner_1795178618730.jpg',
  },
];

export default function AdminBanners() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('/src/assets/images/hero_tech_banner_1795178618730.jpg');
  const [linkUrl, setLinkUrl] = useState('/products');
  const [type, setType] = useState<'hero' | 'promo'>('hero');
  const [sortOrder, setSortOrder] = useState('1');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getStoreSettings,
  });

  const [posterEnabled, setPosterEnabled] = useState(true);
  const [posterTitle, setPosterTitle] = useState('');
  const [posterSubtitle, setPosterSubtitle] = useState('');
  const [posterImageUrl, setPosterImageUrl] = useState(AI_POSTER_PRESETS[0].url);
  const [posterCtaLabel, setPosterCtaLabel] = useState('Browse Live Storefront');
  const [posterCtaUrl, setPosterCtaUrl] = useState('/products');
  const [savingPoster, setSavingPoster] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);

  useEffect(() => {
    if (settings) {
      setPosterEnabled(settings.admin_poster_enabled ?? true);
      setPosterTitle(
        settings.admin_poster_title || 'Zyro Mall Official Storefront & Campaign Poster'
      );
      setPosterSubtitle(
        settings.admin_poster_subtitle ||
          'Manage categories, partner businesses, data quality, discounted PKR pricing, and direct WhatsApp order booking from one unified portal.'
      );
      setPosterImageUrl(settings.admin_poster_image_url || AI_POSTER_PRESETS[0].url);
      setPosterCtaLabel(settings.admin_poster_cta_label || 'Browse Live Storefront');
      setPosterCtaUrl(settings.admin_poster_cta_url || '/products');
    }
  }, [settings]);

  const { data: banners = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: adminService.getBanners,
  });

  function openCreateModal() {
    setEditingBanner(null);
    setTitle('');
    setSubtitle('');
    setImageUrl('/src/assets/images/hero_tech_banner_1795178618730.jpg');
    setLinkUrl('/products');
    setType('hero');
    setSortOrder(String(banners.length + 1));
    setModalOpen(true);
  }

  function openEditModal(b: Banner) {
    setEditingBanner(b);
    setTitle(b.title);
    setSubtitle(b.subtitle);
    setImageUrl(b.image_url);
    setLinkUrl(b.link_url);
    setType(b.type);
    setSortOrder(String(b.sort_order ?? 1));
    setModalOpen(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Banner image must be under 5MB.');
      return;
    }
    try {
      const url = await uploadAsset(file, 'banners');
      setImageUrl(url);
      toast.success('Banner image uploaded');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to upload banner image');
    }
  }

  async function handlePosterUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Poster image must be under 5MB.');
      return;
    }
    try {
      const url = await uploadAsset(file, 'banners');
      setPosterImageUrl(url);
      toast.success('Custom welcome poster uploaded');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to upload poster image');
    }
  }

  async function handleSavePoster(e: React.FormEvent) {
    e.preventDefault();
    setSavingPoster(true);
    try {
      await adminService.updateSettings({
        admin_poster_enabled: posterEnabled,
        admin_poster_title: posterTitle.trim(),
        admin_poster_subtitle: posterSubtitle.trim(),
        admin_poster_image_url: posterImageUrl.trim() || AI_POSTER_PRESETS[0].url,
        admin_poster_cta_label: posterCtaLabel.trim() || 'Browse Live Storefront',
        admin_poster_cta_url: posterCtaUrl.trim() || '/products',
      });
      toast.success('Admin portal welcome poster saved');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'data-quality'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to save welcome poster');
    } finally {
      setSavingPoster(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      image_url: imageUrl.trim(),
      link_url: linkUrl.trim() || '/products',
      type,
      sort_order: Math.max(1, Number(sortOrder) || 1),
    };
    setSavingBanner(true);
    try {
      if (editingBanner) {
        await adminService.updateBanner(editingBanner.id, payload);
        toast.success('Banner updated');
      } else {
        await adminService.createBanner(payload);
        toast.success('Banner created');
      }
      setModalOpen(false);
      setEditingBanner(null);
      setTitle('');
      setSubtitle('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to save banner');
    } finally {
      setSavingBanner(false);
    }
  }

  if (isLoading) return <SkeletonPage cards={3} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      {/* Admin Portal Welcome Poster Section */}
      <section className="bg-white border border-[#E8E8E8] rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF6B35] mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              First-Screen Admin Portal Poster
            </div>
            <h1 className="font-display text-xl font-bold text-[#1A1A1A]">
              Admin Welcome Poster &amp; Campaign Showcase
            </h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Displayed immediately when logging into the Admin Portal. Pick an AI poster or upload your own image.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#1A1A1A] cursor-pointer">
            <input
              type="checkbox"
              checked={posterEnabled}
              onChange={(e) => setPosterEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#FF6B35]"
            />
            Show on Admin Login
          </label>
        </div>

        <form onSubmit={handleSavePoster} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-3">
            <div className="aspect-[16/9] rounded-xl overflow-hidden border border-[#E8E8E8] bg-[#1E293B]">
              <SafeImage
                src={posterImageUrl}
                alt="Admin welcome poster preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {AI_POSTER_PRESETS.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => setPosterImageUrl(preset.url)}
                  title={preset.label}
                  className={cn(
                    'relative aspect-[16/10] rounded-lg overflow-hidden border-2 cursor-pointer',
                    posterImageUrl === preset.url
                      ? 'border-[#FF6B35]'
                      : 'border-[#E8E8E8] hover:border-[#9CA3AF]'
                  )}
                >
                  <SafeImage src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                  {posterImageUrl === preset.url && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#FF6B35] text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <label className="w-full h-9 px-3 rounded-lg border border-[#E8E8E8] hover:border-[#FF6B35] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-[#FF6B35]" />
              Upload Custom Poster Image
              <input type="file" accept="image/*" onChange={handlePosterUpload} className="sr-only" />
            </label>
          </div>

          <div className="lg:col-span-7 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Poster Headline</label>
              <input
                type="text"
                value={posterTitle}
                onChange={(e) => setPosterTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Poster Description</label>
              <textarea
                rows={2}
                value={posterSubtitle}
                onChange={(e) => setPosterSubtitle(e.target.value)}
                className="w-full p-3 rounded-lg border border-[#E8E8E8] text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Storefront Button Label</label>
                <input
                  type="text"
                  value={posterCtaLabel}
                  onChange={(e) => setPosterCtaLabel(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Button Route</label>
                <input
                  type="text"
                  value={posterCtaUrl}
                  onChange={(e) => setPosterCtaUrl(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm font-mono"
                />
              </div>
            </div>
            <div className="pt-1">
              <button
                type="submit"
                disabled={savingPoster}
                className="px-5 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingPoster && <Loader2 className="w-4 h-4 animate-spin" />}
                {savingPoster ? 'Saving...' : 'Save Welcome Poster'}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Storefront Hero & Promo Banners Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[#1A1A1A]">
            Storefront Hero &amp; Promo Banners
          </h2>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Banner
          </button>
        </div>

        {banners.length === 0 ? (
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-10 text-center text-sm text-[#6B7280]">
            No storefront banners configured yet. Click &ldquo;Add Banner&rdquo; to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {banners.map((b) => (
              <div
                key={b.id}
                className="bg-white border border-[#E8E8E8] rounded-xl overflow-hidden flex flex-col"
              >
                <div className="aspect-[16/7] bg-[#F3F4F6]">
                  <SafeImage src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase text-[#FF6B35]">
                        {b.type} · #{b.sort_order}
                      </span>
                      <span className="text-xs text-[#6B7280]">
                        {b.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-[#1A1A1A]">{b.title}</h3>
                    <p className="text-xs text-[#6B7280] mt-1 line-clamp-2">{b.subtitle}</p>
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#E8E8E8]">
                    <button
                      type="button"
                      onClick={async () => {
                        await adminService.updateBanner(b.id, { is_active: !b.is_active });
                        queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
                        queryClient.invalidateQueries({ queryKey: ['banners'] });
                        toast.success('Banner updated');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#E8E8E8] text-xs font-semibold cursor-pointer"
                    >
                      {b.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        aria-label={`Edit banner ${b.title}`}
                        className="p-1.5 rounded-lg border border-[#E8E8E8] text-[#1A1A1A] hover:border-[#FF6B35] hover:text-[#FF6B35] cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await adminService.deleteBanner(b.id);
                          queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
                          queryClient.invalidateQueries({ queryKey: ['banners'] });
                          toast.success('Banner deleted');
                        }}
                        aria-label={`Delete banner ${b.title}`}
                        className="p-1.5 rounded-lg border border-[#E8E8E8] text-[#EF4444] hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl border border-[#E8E8E8] w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">
                {editingBanner ? 'Edit Banner' : 'Add Banner'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="p-1 text-[#6B7280] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'hero' | 'promo')}
                    className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
                  >
                    <option value="hero">Hero Carousel</option>
                    <option value="promo">Promo Banner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Sort Order</label>
                  <input
                    type="number"
                    min={1}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Subtitle</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#6B7280]">Banner Image *</label>
                {imageUrl && (
                  <div className="aspect-[16/7] rounded-lg overflow-hidden border border-[#E8E8E8] bg-[#F3F4F6]">
                    <SafeImage src={imageUrl} alt="Banner preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Image URL or upload..."
                    className="flex-1 h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                  />
                  <label className="h-10 px-3 rounded-lg border border-[#E8E8E8] hover:border-[#FF6B35] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5 text-[#FF6B35]" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Link URL</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E8E8E8] text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBanner}
                  className="px-5 py-2 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  {savingBanner && <Loader2 className="w-4 h-4 animate-spin" />}
                  {savingBanner ? 'Saving...' : editingBanner ? 'Update Banner' : 'Save Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
