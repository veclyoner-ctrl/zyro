import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { getCategories } from '../../services/productService';
import { deleteAsset, uploadAsset } from '../../services/uploadService';
import type { ProductStatus, ProductVariant } from '../../types';
import { SafeImage } from '../../components/common/SafeImage';

export default function AdminProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['admin', 'businesses'],
    queryFn: adminService.getBusinesses,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: adminService.getProducts,
    enabled: isEdit,
  });

  const [title, setTitle] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [status, setStatus] = useState<ProductStatus>('active');
  const [isFeatured, setIsFeatured] = useState(false);
  const [images, setImages] = useState<string[]>([
    '/src/assets/images/prod_headphones_1795178619261.jpg',
  ]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    const found = allProducts.find((p) => p.id === id);
    if (found) {
      setTitle(found.title);
      setSku(found.sku);
      setCategoryId(found.category_id || '');
      setBusinessId(found.business_id || '');
      setDescription(found.description);
      setPrice(String(found.price));
      setSalePrice(found.sale_price ? String(found.sale_price) : '');
      setStockQuantity(String(found.stock_quantity));
      setStatus(found.status);
      setIsFeatured(Boolean(found.is_featured));
      setImages(found.images);
      setVariants(found.variants || []);
    }
  }, [isEdit, id, allProducts]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 8 - images.length);
    if (files.length === 0) return;
    setUploadingImage(true);
    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`"${file.name}" exceeds the 5MB limit.`);
          continue;
        }
        const url = await uploadAsset(file, 'product-images');
        setImages((prev) => [...prev, url]);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload product image.');
    } finally {
      setUploadingImage(false);
    }
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}`,
        product_id: id || '',
        variant_name: 'Size',
        variant_value: '',
        price_modifier: 0,
        stock_quantity: 5,
      },
    ]);
  }

  async function saveProduct(targetStatus: ProductStatus) {
    const numPrice = Number(price);
    const numSalePrice = salePrice.trim() ? Number(salePrice) : null;
    if (!title.trim() || !sku.trim() || !price || Number.isNaN(numPrice) || numPrice <= 0) {
      toast.error('Title, SKU, and a positive price are required.');
      return;
    }
    if (numSalePrice !== null && (Number.isNaN(numSalePrice) || numSalePrice <= 0 || numSalePrice >= numPrice)) {
      toast.error('Sale price must be greater than 0 and lower than the regular price.');
      return;
    }
    if (images.length === 0) {
      toast.error('At least 1 product image is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        sku: sku.trim().toUpperCase(),
        category_id: categoryId || null,
        business_id: businessId || null,
        description: description.trim(),
        price: numPrice,
        sale_price: numSalePrice,
        stock_quantity: Math.max(0, Number(stockQuantity) || 0),
        status: targetStatus,
        is_featured: isFeatured,
        images,
        variants: variants.filter((v) => v.variant_value.trim()),
      };
      if (isEdit && id) {
        await adminService.updateProduct(id, payload);
        toast.success('Product updated');
      } else {
        await adminService.createProduct(payload);
        toast.success('Product created');
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'data-quality'] });
      navigate('/admin/products');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to save product');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/admin/products"
          className="p-2 rounded-lg border border-[#E8E8E8] bg-white hover:bg-[#F8F8F8]"
          aria-label="Back to products"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">
          {isEdit ? 'Edit Product' : 'Add New Product'}
        </h1>
      </div>

      <div className="bg-white border border-[#E8E8E8] rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="prod-title" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Product Title *
            </label>
            <input
              id="prod-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm"
            />
          </div>

          <div>
            <label htmlFor="prod-sku" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              SKU *
            </label>
            <input
              id="prod-sku"
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="ZM-EL-105"
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm font-mono"
            />
          </div>

          <div>
            <label htmlFor="prod-cat" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Category
            </label>
            <select
              id="prod-cat"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] bg-white text-sm"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="prod-biz" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Partner Business (optional)
            </label>
            <select
              id="prod-biz"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] bg-white text-sm"
            >
              <option value="">Zyro Mall Direct</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="prod-price" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Price (PKR) *
            </label>
            <input
              id="prod-price"
              type="number"
              required
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="prod-sale" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Sale Price (PKR, optional)
            </label>
            <input
              id="prod-sale"
              type="number"
              min={0}
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="prod-stock" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Stock Quantity *
            </label>
            <input
              id="prod-stock"
              type="number"
              min={0}
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="prod-status" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Status
            </label>
            <select
              id="prod-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] bg-white text-sm"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="prod-desc" className="block text-xs font-medium text-[#6B7280] mb-1.5">
            Description
          </label>
          <textarea
            id="prod-desc"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3.5 rounded-lg border border-[#E8E8E8] text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-[#1A1A1A] cursor-pointer">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="w-4 h-4 accent-[#FF6B35]"
          />
          Feature on Storefront Homepage
        </label>

        {/* Images */}
        <div className="pt-4 border-t border-[#E8E8E8] space-y-3">
          <p className="text-xs font-semibold text-[#1A1A1A]">Product Images (max 8)</p>
          <div className="flex flex-wrap gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative w-24 h-20 rounded-lg overflow-hidden border border-[#E8E8E8]">
                <SafeImage src={img} alt={`Preview ${i + 1}`} className="w-full h-full" />
                <button
                  type="button"
                  onClick={() => {
                    if (images.length <= 1) {
                      toast.error('At least 1 product image must remain.');
                      return;
                    }
                    const removedUrl = img;
                    setImages((prev) => prev.filter((_, idx) => idx !== i));
                    void deleteAsset(removedUrl, 'product-images');
                  }}
                  aria-label={`Remove image ${i + 1}`}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {images.length < 8 && (
              <label className="w-24 h-20 rounded-lg border border-dashed border-[#9CA3AF] flex flex-col items-center justify-center text-xs text-[#6B7280] cursor-pointer hover:border-[#FF6B35]">
                <Upload className="w-4 h-4 mb-1" />
                {uploadingImage ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={uploadingImage}
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="Or paste image path/URL..."
              className="flex-1 h-9 px-3 rounded-lg border border-[#E8E8E8] text-xs"
            />
            <button
              type="button"
              onClick={() => {
                if (imageUrlInput.trim()) {
                  setImages((prev) => [...prev, imageUrlInput.trim()]);
                  setImageUrlInput('');
                }
              }}
              className="px-3 h-9 rounded-lg border border-[#E8E8E8] text-xs font-semibold cursor-pointer"
            >
              Add URL
            </button>
          </div>
        </div>

        {/* Variants */}
        <div className="pt-4 border-t border-[#E8E8E8] space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#1A1A1A]">Variants (Size / Color)</p>
            <button
              type="button"
              onClick={addVariant}
              className="text-xs font-semibold text-[#FF6B35] inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Variant
            </button>
          </div>
          {variants.map((v, i) => (
            <div key={v.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
              <input
                type="text"
                value={v.variant_name}
                onChange={(e) =>
                  setVariants((prev) =>
                    prev.map((row, idx) => (idx === i ? { ...row, variant_name: e.target.value } : row))
                  )
                }
                placeholder="Name (e.g. Size)"
                className="h-9 px-3 rounded-lg border border-[#E8E8E8] text-xs"
              />
              <input
                type="text"
                value={v.variant_value}
                onChange={(e) =>
                  setVariants((prev) =>
                    prev.map((row, idx) => (idx === i ? { ...row, variant_value: e.target.value } : row))
                  )
                }
                placeholder="Value (e.g. EU 42)"
                className="h-9 px-3 rounded-lg border border-[#E8E8E8] text-xs"
              />
              <input
                type="number"
                value={v.price_modifier}
                onChange={(e) =>
                  setVariants((prev) =>
                    prev.map((row, idx) =>
                      idx === i ? { ...row, price_modifier: Number(e.target.value) } : row
                    )
                  )
                }
                placeholder="+Price PKR"
                className="h-9 px-3 rounded-lg border border-[#E8E8E8] text-xs"
              />
              <button
                type="button"
                onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))}
                className="h-9 px-3 rounded-lg border border-[#E8E8E8] text-xs text-red-600 cursor-pointer"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-[#E8E8E8] flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => saveProduct('draft')}
            className="px-5 py-2.5 rounded-lg border border-[#E8E8E8] bg-white hover:bg-[#F8F8F8] text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => saveProduct(status === 'draft' ? 'active' : status)}
            className="px-6 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Publish Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
