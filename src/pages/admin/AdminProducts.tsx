import { useMemo, useState } from 'react';
import { Check, Edit, Plus, Search, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { getCategories } from '../../services/productService';
import { deleteAsset } from '../../services/uploadService';
import { formatPrice, getEffectivePrice } from '../../lib/commerce';
import type { ProductStatus } from '../../types';
import { SkeletonTablePage } from '../../components/common/LoadingSpinner';
import { ProductStatusBadge } from '../../components/common/StatusBadge';
import { SafeImage } from '../../components/common/SafeImage';
import { ConfirmModal, Pagination } from '../../components/common/Pagination';

const ADMIN_PRODUCTS_PER_PAGE = 25;

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [stockDraft, setStockDraft] = useState('');
  const [savingStock, setSavingStock] = useState(false);

  const { data: rawProducts = [], isLoading } = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: adminService.getProducts,
  });

  const { data: rawCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const products = Array.isArray(rawProducts) ? rawProducts : [];
  const categories = Array.isArray(rawCategories) ? rawCategories : [];

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter && p.category_id !== categoryFilter) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !p.title.toLowerCase().includes(q) &&
          !p.sku.toLowerCase().includes(q) &&
          !(p.business_name?.toLowerCase().includes(q) ?? false)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [products, categoryFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PRODUCTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * ADMIN_PRODUCTS_PER_PAGE,
    safePage * ADMIN_PRODUCTS_PER_PAGE
  );

  async function handleBulkStatus(status: ProductStatus) {
    if (selectedIds.length === 0) return;
    try {
      await adminService.bulkUpdateProductStatus(selectedIds, status);
      toast.success(`Updated ${selectedIds.length} product(s) to ${status}`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Bulk update failed');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const targetProduct = products.find((p) => p.id === deleteTarget.id);
      await adminService.deleteProduct(deleteTarget.id);
      const targetImages = Array.isArray(targetProduct?.images) ? targetProduct.images : [];
      if (targetImages.length > 0) {
        await Promise.allSettled(
          targetImages.map((img) => deleteAsset(img, 'product-images'))
        );
      }
      toast.success('Product archived');
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to delete product');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveStock(productId: string) {
    const parsed = Math.max(0, Math.floor(Number(stockDraft)));
    if (Number.isNaN(parsed)) {
      toast.error('Please enter a valid stock quantity.');
      return;
    }
    setSavingStock(true);
    try {
      await adminService.updateProduct(productId, { stock_quantity: parsed });
      toast.success('Stock updated');
      setEditingStockId(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to update stock');
    } finally {
      setSavingStock(false);
    }
  }

  if (isLoading) return <SkeletonTablePage columns={7} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">Products</h1>
        <Link
          to="/admin/products/new"
          className="px-4 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title, business, or SKU..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by category"
          className="h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
        >
          <option value="">All Categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.product_count ?? 0})
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          className="h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>

        {selectedIds.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) handleBulkStatus(e.target.value as ProductStatus);
            }}
            aria-label="Bulk status update"
            className="h-10 px-3 rounded-lg border border-[#FF6B35] bg-[#FFF0EA] text-[#FF6B35] text-sm font-semibold"
          >
            <option value="" disabled>
              Bulk Action ({selectedIds.length})
            </option>
            <option value="active">Set Active</option>
            <option value="draft">Set Draft</option>
            <option value="out_of_stock">Set Out of Stock</option>
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8F8F8] border-b border-[#E8E8E8] text-xs font-semibold text-[#6B7280]">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  aria-label="Select all products on page"
                  checked={
                    paginated.length > 0 && paginated.every((p) => selectedIds.includes(p.id))
                  }
                  onChange={(e) =>
                    setSelectedIds(e.target.checked ? paginated.map((p) => p.id) : [])
                  }
                  className="accent-[#FF6B35]"
                />
              </th>
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">Stock</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E8E8] text-sm">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 px-4 text-center text-sm text-[#6B7280]">
                  No products match your current search or filter criteria.
                </td>
              </tr>
            ) : (
              (paginated ?? []).map((p) => {
              const pImages = Array.isArray(p.images) ? p.images : [];
              return (
              <tr key={p.id} className="hover:bg-[#F8F8F8]/60">
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    aria-label={`Select ${p.title}`}
                    checked={selectedIds.includes(p.id)}
                    onChange={(e) =>
                      setSelectedIds((prev) =>
                        e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                      )
                    }
                    className="accent-[#FF6B35]"
                  />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <SafeImage
                      src={pImages[0]}
                      alt={p.title}
                      className="w-11 h-9 rounded border border-[#E8E8E8] shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="block font-medium text-[#1A1A1A] line-clamp-1">{p.title}</span>
                      {p.business_name && (
                        <span className="block text-[11px] text-[#6B7280] truncate">{p.business_name}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 font-mono text-xs text-[#6B7280]">{p.sku}</td>
                <td className="py-3 px-4 text-[#6B7280]">{p.category_name}</td>
                <td className="py-3 px-4 font-semibold tabular-nums whitespace-nowrap">
                  {formatPrice(getEffectivePrice(p))}
                </td>
                <td className="py-3 px-4 tabular-nums">
                  {editingStockId === p.id ? (
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        value={stockDraft}
                        onChange={(e) => setStockDraft(e.target.value)}
                        aria-label={`Quick stock input for ${p.title}`}
                        className="w-16 h-8 px-2 rounded border border-[#FF6B35] text-xs tabular-nums"
                      />
                      <button
                        type="button"
                        disabled={savingStock}
                        onClick={() => handleSaveStock(p.id)}
                        aria-label={`Save stock for ${p.title}`}
                        className="w-7 h-7 rounded bg-[#FF6B35] text-white inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingStockId(null)}
                        aria-label="Cancel stock edit"
                        className="w-7 h-7 rounded border border-[#E8E8E8] text-[#6B7280] inline-flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStockId(p.id);
                        setStockDraft(String(p.stock_quantity));
                      }}
                      title="Click to update stock"
                      aria-label={`Update stock for ${p.title} (${p.stock_quantity})`}
                      className="px-2 py-1 rounded border border-transparent hover:border-[#E8E8E8] hover:bg-white cursor-pointer font-medium"
                    >
                      {p.stock_quantity}
                    </button>
                  )}
                </td>
                <td className="py-3 px-4">
                  <ProductStatusBadge status={p.status} />
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <Link
                      to={`/admin/products/${p.id}/edit`}
                      aria-label={`Edit ${p.title}`}
                      className="p-1.5 rounded-lg border border-[#E8E8E8] text-[#1A1A1A] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: p.id, title: p.title })}
                      aria-label={`Delete ${p.title}`}
                      className="p-1.5 rounded-lg border border-[#E8E8E8] text-[#EF4444] hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#6B7280] tabular-nums">
          Showing {paginated.length} of {filtered.length} product(s)
        </p>
        <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={`Archive "${deleteTarget?.title}"?`}
        description="This performs a soft delete so historical orders stay intact while removing the item from the storefront."
        confirmLabel="Archive Product"
        destructive
        isLoading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
