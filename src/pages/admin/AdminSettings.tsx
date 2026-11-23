import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, MessageCircle, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStoreSettings } from '../../services/productService';
import { adminService } from '../../services/adminService';
import { uploadAsset } from '../../services/uploadService';
import { SkeletonPage } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/EmptyState';

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: getStoreSettings,
  });

  const [storeName, setStoreName] = useState('Zyro Mall');
  const [storeLogoUrl, setStoreLogoUrl] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('03296730804');
  const [flatShipping, setFlatShipping] = useState('200');
  const [freeThreshold, setFreeThreshold] = useState('5000');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [codEnabled, setCodEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name);
      setStoreLogoUrl(settings.store_logo_url ?? null);
      setContactEmail(settings.contact_email);
      setContactPhone(settings.contact_phone);
      setWhatsappNumber(settings.whatsapp_number || '03296730804');
      setFlatShipping(String(settings.flat_shipping_cost));
      setFreeThreshold(String(settings.free_shipping_threshold));
      setLowStockThreshold(String(settings.low_stock_threshold));
      setCodEnabled(settings.cod_enabled);
      setMaintenanceMode(settings.maintenance_mode);
    }
  }, [settings]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Store logo must be under 2MB.');
      return;
    }
    try {
      const url = await uploadAsset(file, 'store-assets');
      setStoreLogoUrl(url);
      toast.success('Store logo uploaded');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to upload store logo');
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await adminService.updateSettings({
        store_name: storeName.trim(),
        store_logo_url: storeLogoUrl,
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        whatsapp_number: whatsappNumber.trim() || '03296730804',
        flat_shipping_cost: Number(flatShipping) || 0,
        free_shipping_threshold: Number(freeThreshold) || 0,
        low_stock_threshold: Number(lowStockThreshold) || 5,
        cod_enabled: codEnabled,
        maintenance_mode: maintenanceMode,
      });
      toast.success('Store settings saved');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'data-quality'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <SkeletonPage cards={3} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">Store Settings</h1>

      <form
        onSubmit={handleSave}
        className="bg-white border border-[#E8E8E8] rounded-xl p-6 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Store Name</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Store Logo (optional, max 2MB)
            </label>
            <div className="flex flex-wrap items-center gap-4">
              {storeLogoUrl ? (
                <div className="flex items-center gap-3 p-2 rounded-lg border border-[#E8E8E8] bg-[#F8F8F8]">
                  <img
                    src={storeLogoUrl}
                    alt="Store logo preview"
                    className="h-10 w-10 rounded object-contain bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setStoreLogoUrl(null)}
                    className="px-2.5 py-1 rounded border border-[#E8E8E8] bg-white text-xs text-[#EF4444] hover:bg-red-50 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              ) : (
                <span className="text-xs text-[#9CA3AF]">No custom logo uploaded</span>
              )}
              <label className="h-10 px-4 rounded-lg border border-[#E8E8E8] hover:border-[#FF6B35] bg-white text-xs font-semibold text-[#1A1A1A] inline-flex items-center gap-2 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#FF6B35]" />
                {storeLogoUrl ? 'Replace Logo' : 'Upload Logo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">
              Contact Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">
              Contact Phone
            </label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm"
            />
          </div>
          <div>
            <label htmlFor="settings-whatsapp" className="block text-xs font-medium text-[#6B7280] mb-1">
              WhatsApp Order Booking Number
            </label>
            <div className="relative">
              <MessageCircle className="w-4 h-4 text-[#15803D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="settings-whatsapp"
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="03296730804"
                className="w-full h-11 pl-9 pr-3.5 rounded-lg border border-[#E8E8E8] text-sm font-mono tabular-nums"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">
              Flat Shipping Cost (PKR)
            </label>
            <input
              type="number"
              min={0}
              value={flatShipping}
              onChange={(e) => setFlatShipping(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">
              Free Shipping Above (PKR)
            </label>
            <input
              type="number"
              min={0}
              value={freeThreshold}
              onChange={(e) => setFreeThreshold(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">
              Low Stock Alert Threshold
            </label>
            <input
              type="number"
              min={1}
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm tabular-nums"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#F8F8F8] border border-[#E8E8E8] flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">Admin Welcome Portal Poster</p>
            <p className="text-xs text-[#6B7280]">
              Customize or upload the first-screen poster displayed when entering the Admin Portal.
            </p>
          </div>
          <Link
            to="/admin/banners"
            className="px-3.5 py-2 rounded-lg border border-[#E8E8E8] bg-white hover:border-[#FF6B35] text-xs font-semibold text-[#1A1A1A] inline-flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#FF6B35]" />
            Manage Poster &amp; Banners
          </Link>
        </div>

        <div className="pt-4 border-t border-[#E8E8E8] space-y-3">
          <label className="flex items-center gap-3 text-sm font-medium text-[#1A1A1A] cursor-pointer">
            <input
              type="checkbox"
              checked={codEnabled}
              onChange={(e) => setCodEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#FF6B35]"
            />
            Enable Cash on Delivery (COD) checkout
          </label>
          <label className="flex items-center gap-3 text-sm font-medium text-[#1A1A1A] cursor-pointer">
            <input
              type="checkbox"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="w-4 h-4 accent-[#FF6B35]"
            />
            Maintenance Mode (hides storefront from customers while admin stays accessible)
          </label>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
