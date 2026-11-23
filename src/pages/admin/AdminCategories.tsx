import React, { useState } from 'react';
import { Edit, Loader2, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { slugify } from '../../lib/commerce';
import type { Category } from '../../types';
import { SkeletonTablePage } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/EmptyState';
import { ConfirmModal } from '../../components/common/Pagination';

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: rawCategories = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: adminService.getCategories,
  });
  const categories = Array.isArray(rawCategories) ? rawCategories : [];

  function openNew() {
    setEditing(null);
    setName('');
    setSlug('');
    setParentId('');
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setParentId(cat.parent_id || '');
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        parent_id: parentId || null,
      };
      if (editing) {
        await adminService.updateCategory(editing.id, payload);
        toast.success('Category updated');
      } else {
        await adminService.createCategory(payload);
        toast.success('Category added');
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to save category');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.deleteCategory(deleteTarget.id);
      toast.success('Category deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to delete');
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) return <SkeletonTablePage columns={5} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">Categories</h1>
        <button
          type="button"
          onClick={openNew}
          className="px-4 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8F8F8] border-b border-[#E8E8E8] text-xs font-semibold text-[#6B7280]">
              <th className="py-3 px-4">Category Name</th>
              <th className="py-3 px-4">Slug</th>
              <th className="py-3 px-4">Parent</th>
              <th className="py-3 px-4">Products</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E8E8] text-sm">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 px-4 text-center text-sm text-[#6B7280]">
                  No categories found. Add your first category above.
                </td>
              </tr>
            ) : (
              (categories ?? []).map((cat) => {
                const parent = categories.find((c) => c.id === cat.parent_id);
                return (
                  <tr key={cat.id} className="hover:bg-[#F8F8F8]/60">
                    <td className="py-3 px-4 font-semibold text-[#1A1A1A]">{cat.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-[#6B7280]">{cat.slug}</td>
                    <td className="py-3 px-4 text-[#6B7280]">{parent?.name || '—'}</td>
                    <td className="py-3 px-4 tabular-nums">{cat.product_count ?? 0}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(cat)}
                          aria-label={`Edit ${cat.name}`}
                          className="p-1.5 rounded-lg border border-[#E8E8E8] hover:border-[#FF6B35] cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(cat)}
                          aria-label={`Delete ${cat.name}`}
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl border border-[#E8E8E8] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-[#1A1A1A]">
                {editing ? 'Edit Category' : 'Add Category'}
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editing) setSlug(slugify(e.target.value));
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">
                  Parent Category (optional)
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
                >
                  <option value="">Top-level category</option>
                  {categories
                    .filter((c) => c.id !== editing?.id && !c.parent_id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
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
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={`Delete "${deleteTarget?.name}"?`}
        description={
          (deleteTarget?.product_count ?? 0) > 0
            ? `Warning: ${deleteTarget?.product_count} product(s) are currently assigned to this category and will become uncategorized.`
            : 'Are you sure you want to delete this category?'
        }
        confirmLabel="Delete Category"
        destructive
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
