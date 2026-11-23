import { cn } from '../../lib/utils';
import type { OrderStatus, PaymentStatus, ProductStatus } from '../../types';

const ORDER_STATUS_STYLES: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  confirmed: { label: 'Confirmed', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  processing: { label: 'Processing', color: 'text-sky-700 bg-sky-50 border-sky-200' },
  shipped: { label: 'Shipped', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  delivered: { label: 'Delivered', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  cancelled: { label: 'Cancelled', color: 'text-gray-600 bg-gray-100 border-gray-200' },
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, { label: string; color: string }> = {
  pending: { label: 'Payment Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  confirmed: { label: 'Confirmed', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  paid: { label: 'Paid', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  failed: { label: 'Failed', color: 'text-red-700 bg-red-50 border-red-200' },
};

const PRODUCT_STATUS_STYLES: Record<ProductStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  draft: { label: 'Draft', color: 'text-gray-600 bg-gray-100 border-gray-200' },
  out_of_stock: { label: 'Out of Stock', color: 'text-red-700 bg-red-50 border-red-200' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = ORDER_STATUS_STYLES[status] ?? ORDER_STATUS_STYLES.pending;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap',
        cfg.color
      )}
    >
      {cfg.label}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const cfg = PAYMENT_STATUS_STYLES[status] ?? PAYMENT_STATUS_STYLES.pending;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap',
        cfg.color
      )}
    >
      {cfg.label}
    </span>
  );
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const cfg = PRODUCT_STATUS_STYLES[status] ?? PRODUCT_STATUS_STYLES.active;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap',
        cfg.color
      )}
    >
      {cfg.label}
    </span>
  );
}
