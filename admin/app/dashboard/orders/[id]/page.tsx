'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, orderStatusColor } from '@/lib/utils';
import { ArrowLeft, RefreshCw } from 'lucide-react';

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product: { name: string; images: string[] } | null;
};

type Order = {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  payment_method: string;
  payment_intent_id: string | null;
  shipping_address: Record<string, string> | null;
  user_id: string;
  order_items: OrderItem[];
};

const NEXT_STATUSES: Record<string, string[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (params.id) fetchOrder(params.id as string);
  }, [params.id]);

  const fetchOrder = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(
        `*, order_items(*, product:products(name, images))`
      )
      .eq('id', id)
      .single();

    if (error) {
      alert(error.message);
      router.push('/dashboard/orders');
    } else {
      setOrder(data as Order);
    }
    setLoading(false);
  };

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    if (error) {
      alert(error.message);
    } else {
      setOrder({ ...order, status: newStatus });
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  if (!order) return null;

  const allowedTransitions = NEXT_STATUSES[order.status] ?? [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/orders"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Orders
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-mono font-medium">
          #{order.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{formatDate(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1.5 rounded-full text-sm font-semibold capitalize ${orderStatusColor(order.status)}`}
          >
            {order.status}
          </span>
          {/* Status actions */}
          {allowedTransitions.length > 0 && (
            <div className="flex gap-2">
              {allowedTransitions.map((next) => (
                <button
                  key={next}
                  onClick={() => updateStatus(next)}
                  disabled={updating}
                  className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:border-purple-400 hover:text-purple-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={13} className={updating ? 'animate-spin' : ''} />
                  Mark {next}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Items</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {order.order_items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  {item.product?.images?.[0] ? (
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-gray-100 rounded-lg flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.product?.name ?? 'Deleted product'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-base font-bold text-gray-900">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Side panels */}
        <div className="space-y-4">
          {/* Payment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Payment</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Method</dt>
                <dd className="font-medium capitalize">
                  {order.payment_method?.replace('_', ' ') ?? '—'}
                </dd>
              </div>
              {order.payment_intent_id && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Intent ID</dt>
                  <dd className="font-mono text-xs text-gray-600 truncate max-w-[130px]">
                    {order.payment_intent_id}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Total</dt>
                <dd className="font-bold">{formatCurrency(order.total_amount)}</dd>
              </div>
            </dl>
          </div>

          {/* Shipping address */}
          {order.shipping_address && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Ship to</h2>
              <address className="text-sm text-gray-600 not-italic space-y-0.5">
                {Object.values(order.shipping_address)
                  .filter(Boolean)
                  .map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
              </address>
            </div>
          )}

          {/* Customer */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Customer</h2>
            <p className="text-sm text-gray-500 font-mono break-all">{order.user_id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
