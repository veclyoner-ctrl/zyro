import React, { useMemo, useState } from 'react';
import {
  Building2,
  Check,
  Edit,
  ExternalLink,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { uploadAsset } from '../../services/uploadService';
import type { Business } from '../../types';
import { SkeletonPage } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/EmptyState';
import { SafeImage } from '../../components/common/SafeImage';
import { ConfirmModal } from '../../components/common/Pagination';
import { cn } from '../../lib/utils';

const PRELOADED_BUSINESS_IMAGES = [
  {
    label: 'Cotton Apparel',
    url: '/src/assets/images/prod_cotton_shirt_1795191691262.jpg',
  },
  {
    label: 'Porcelain Dinnerware',
    url: '/src/assets/images/prod_dinner_set_1795191690947.jpg',
  },
  {
    label: 'Sterling Silver Rings',
    url: '/src/assets/images/prod_silver_ring_1795191691586.jpg',
  },
  {
    label: 'Storefront Campaign',
    url: '/src/assets/images/poster_admin_welcome_1795191692080.jpg',
  },
  {
    label: 'Mega Sale Poster',
    url: '/src/assets/images/poster_mega_sale_1795191691982.jpg',
  },
  {
    label: 'Studio Audio Tech',
    url: '/src/assets/images/prod_headphones_1795178619261.jpg',
  },
  {
    label: 'Smartwatches',
    url: '/src/assets/images/prod_smartwatch_1795178619052.jpg',
  },
  {
    label: 'Sialkot Leather',
    url: '/src/assets/images/prod_leather_bag_1795178618645.jpg',
  },
  {
    label: 'Home Lighting',
    url: '/src/assets/images/prod_ceramic_lamp_1795178619287.jpg',
  },
  {
    label: 'Athletic Footwear',
    url: '/src/assets/images/prod_running_shoes_1795178618844.jpg',
  },
  {
    label: 'Luxury Fragrances',
    url: '/src/assets/images/prod_oud_perfume_1795178619239.jpg',
  },
];

export default function AdminBusinesses() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Business | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [city, setCity] = useState('Lahore');
  const [whatsappNumber, setWhatsappNumber] = useState('03296730804');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [imageUrl, setImageUrl] = useState(PRELOADED_BUSINESS_IMAGES[0].url);
  const [isActive, setIsActive] = useState(true);

  const { data: rawBusinesses = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'businesses'],
    queryFn: adminService.getBusinesses,
  });

  const { data: rawCategories = [] } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: adminService.getCategories,
  });

  const businesses = Array.isArray(rawBusinesses) ? rawBusinesses : [];
  const categories = Array.isArray(rawCategories) ? rawCategories : [];

  const filtered = useMemo(() => {
    return businesses.filter((b) => {
      if (categoryFilter && b.category_id !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !b.name.toLowerCase().includes(q) &&
          !b.city.toLowerCase().includes(q) &&
          !b.tagline.toLowerCase().includes(q) &&
          !b.description.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [businesses, categoryFilter, search]);

  function openNew() {
    setEditing(null);
    setName('');
    setCategoryId(categories[0]?.id ?? '');
    setCity('Lahore');
    setWhatsappNumber('03296730804');
    setTagline('');
    setDescription('');
    setDetails('');
    setImageUrl(PRELOADED_BUSINESS_IMAGES[0].url);
    setIsActive(true);
    setModalOpen(true);
  }

  function openEdit(biz: Business) {
    setEditing(biz);
    setName(biz.name);
    setCategoryId(biz.category_id || '');
    setCity(biz.city || 'Lahore');
    setWhatsappNumber(biz.whatsapp_number || '03296730804');
    setTagline(biz.tagline || '');
    setDescription(biz.description || '');
    setDetails(biz.details || '');
    setImageUrl(biz.image_url || PRELOADED_BUSINESS_IMAGES[0].url);
    setIsActive(biz.is_active);
    setModalOpen(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Business image must be under 5MB.');
      return;
    }
    setUploadingImage(true);
    try {
      const url = await uploadAsset(file, 'store-assets');
      setImageUrl(url);
      toast.success('Business image uploaded');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to upload image');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Business name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category_id: categoryId || null,
        city: city.trim() || 'Lahore',
        whatsapp_number: whatsappNumber.trim() || '03296730804',
        tagline: tagline.trim(),
        description: description.trim(),
        details: details.trim(),
        image_url: imageUrl.trim() || PRELOADED_BUSINESS_IMAGES[0].url,
        is_active: isActive,
      };
      if (editing) {
        await adminService.updateBusiness(editing.id, payload);
        toast.success('Business updated and saved');
      } else {
        await adminService.createBusiness(payload);
        toast.success('New business added and saved');
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'businesses'] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'data-quality'] });
      setModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to save business');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.deleteBusiness(deleteTarget.id);
      toast.success('Business removed');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'businesses'] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'data-quality'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to delete business');
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) return <SkeletonPage cards={3} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">Partner Businesses</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Select any business to edit its name, description, full details &amp; pre-loaded images, or add a new business.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="px-4 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add Business
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search businesses by name, city, or description..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter businesses by category"
          className="h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
        >
          <option value="">All Categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Business Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E8E8E8] rounded-xl p-10 text-center text-sm text-[#6B7280]">
          No partner businesses match your filter. Click &ldquo;Add Business&rdquo; to register one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {(filtered ?? []).map((biz) => (
            <article
              key={biz.id}
              className="bg-white border border-[#E8E8E8] rounded-xl overflow-hidden flex flex-col"
            >
              <div className="relative aspect-[16/9] bg-[#F3F4F6]">
                <SafeImage
                  src={biz.image_url}
                  alt={biz.name}
                  className="w-full h-full object-cover"
                />
                <span
                  className={cn(
                    'absolute top-3 right-3 px-2.5 py-0.5 rounded text-[11px] font-semibold',
                    biz.is_active
                      ? 'bg-[#ECFDF5] text-[#15803D]'
                      : 'bg-slate-800 text-white'
                  )}
                >
                  {biz.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2 text-xs text-[#6B7280] mb-1">
                  <span className="inline-flex items-center gap-1 font-medium text-[#FF6B35]">
                    <Building2 className="w-3.5 h-3.5" />
                    {biz.category_name || 'General'}
                  </span>
                  <span className="tabular-nums font-semibold text-[#1A1A1A]">
                    {biz.product_count ?? 0} products
                  </span>
                </div>

                <h2 className="font-display text-lg font-bold text-[#1A1A1A] leading-snug">
                  {biz.name}
                </h2>
                {biz.tagline && (
                  <p className="text-xs font-medium text-[#4B5563] mt-0.5">{biz.tagline}</p>
                )}

                <p className="text-xs text-[#6B7280] mt-2 line-clamp-2 leading-relaxed">
                  {biz.description || 'No description added yet.'}
                </p>
                {biz.details && (
                  <p className="text-[11px] text-[#6B7280] mt-1.5 bg-[#F8F8F8] border border-[#E8E8E8] rounded-lg px-2.5 py-2 line-clamp-2">
                    {biz.details}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 text-xs text-[#6B7280] mt-3 pt-3 border-t border-[#E8E8E8]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    {biz.city}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[#15803D]">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {biz.whatsapp_number}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-[#E8E8E8]">
                  <Link
                    to={`/products?business=${encodeURIComponent(biz.slug)}`}
                    className="text-xs font-semibold text-[#6B7280] hover:text-[#FF6B35] inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Storefront
                  </Link>
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(biz)}
                      aria-label={`Edit ${biz.name}`}
                      className="px-3 py-1.5 rounded-lg border border-[#E8E8E8] hover:border-[#FF6B35] text-xs font-semibold text-[#1A1A1A] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-[#FF6B35]" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(biz)}
                      aria-label={`Delete ${biz.name}`}
                      className="p-1.5 rounded-lg border border-[#E8E8E8] text-[#EF4444] hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Add / Edit Business Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editing ? 'Edit Business' : 'Add Business'}
        >
          <div className="bg-white rounded-xl border border-[#E8E8E8] w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-[#1A1A1A]">
                {editing ? `Edit Business — ${editing.name}` : 'Add New Business'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close business modal"
                className="p-1 text-[#6B7280] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label htmlFor="biz-name" className="block text-xs font-medium text-[#6B7280] mb-1">
                    Business Name *
                  </label>
                  <input
                    id="biz-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Multan Crafts & Textiles"
                    className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="biz-cat" className="block text-xs font-medium text-[#6B7280] mb-1">
                    Primary Category
                  </label>
                  <select
                    id="biz-cat"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
                  >
                    <option value="">General Marketplace</option>
                    {(categories ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="biz-city" className="block text-xs font-medium text-[#6B7280] mb-1">
                    City *
                  </label>
                  <input
                    id="biz-city"
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Lahore / Karachi / Islamabad"
                    className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="biz-whatsapp" className="block text-xs font-medium text-[#6B7280] mb-1">
                    WhatsApp Order Number
                  </label>
                  <input
                    id="biz-whatsapp"
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="03296730804"
                    className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="biz-tagline" className="block text-xs font-medium text-[#6B7280] mb-1">
                    Short Tagline
                  </label>
                  <input
                    id="biz-tagline"
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Quality products delivered across Pakistan"
                    className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="biz-desc" className="block text-xs font-medium text-[#6B7280] mb-1">
                  Business Description
                </label>
                <textarea
                  id="biz-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the business, product specialty, and brand background..."
                  className="w-full p-3 rounded-lg border border-[#E8E8E8] text-sm"
                />
              </div>

              <div>
                <label htmlFor="biz-details" className="block text-xs font-medium text-[#6B7280] mb-1">
                  Full Business Details (Delivery, Sizing, Warranty)
                </label>
                <textarea
                  id="biz-details"
                  rows={2}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Cash on Delivery terms, exchange policy, warranty, and support details..."
                  className="w-full p-3 rounded-lg border border-[#E8E8E8] text-sm"
                />
              </div>

              {/* Pre-loaded AI Business Images + Custom Upload */}
              <div className="space-y-2.5 pt-2 border-t border-[#E8E8E8]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#1A1A1A]">
                    Select Pre-Loaded Business Image or Upload Custom
                  </span>
                  <label className="px-3 py-1.5 rounded-lg border border-[#E8E8E8] hover:border-[#FF6B35] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#FF6B35]" />
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={handleImageUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {PRELOADED_BUSINESS_IMAGES.map((preset) => {
                    const selected = imageUrl === preset.url;
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setImageUrl(preset.url)}
                        title={preset.label}
                        className={cn(
                          'relative aspect-[4/3] rounded-lg overflow-hidden border-2 cursor-pointer transition-all',
                          selected
                            ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]/30'
                            : 'border-[#E8E8E8] hover:border-[#9CA3AF]'
                        )}
                      >
                        <SafeImage src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                        {selected && (
                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#FF6B35] text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Or paste custom image URL..."
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E8E8] text-xs"
                />
              </div>

              <label className="flex items-center gap-2.5 text-sm font-medium text-[#1A1A1A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#FF6B35]"
                />
                Business Active on Storefront
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E8E8]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E8E8E8] text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving...' : editing ? 'Save Business Changes' : 'Save Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={`Remove "${deleteTarget?.name}"?`}
        description="Products linked to this business will stay live on the storefront without a business badge."
        confirmLabel="Remove Business"
        destructive
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
