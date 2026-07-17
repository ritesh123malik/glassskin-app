'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import {
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

type DashboardStats = {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  pendingOrders: number;
  lowStockProducts: number;
};

type RecentOrder = {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  user_id: string;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const [ordersRes, productsRes, usersRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, created_at, status, total_amount, user_id')
          .order('created_at', { ascending: false }),
        supabase.from('products').select('id, stock_quantity'),
        supabase.from('users').select('id'),
      ]);

      const orders = ordersRes.data ?? [];
      const products = productsRes.data ?? [];
      const users = usersRes.data ?? [];

      const totalRevenue = orders
        .filter((o) => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

      setStats({
        totalRevenue,
        totalOrders: orders.length,
        totalProducts: products.length,
        totalCustomers: users.length,
        pendingOrders: orders.filter((o) => o.status === 'pending').length,
        lowStockProducts: products.filter((p) => p.stock_quantity < 5).length,
      });

      setRecentOrders(orders.slice(0, 5));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue ?? 0),
      icon: DollarSign,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Total Orders',
      value: stats?.totalOrders ?? 0,
      icon: ShoppingBag,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Products',
      value: stats?.totalProducts ?? 0,
      icon: Package,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Customers',
      value: stats?.totalCustomers ?? 0,
      icon: Users,
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back — here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Alert row */}
      {((stats?.pendingOrders ?? 0) > 0 ||
        (stats?.lowStockProducts ?? 0) > 0) && (
        <div className="flex flex-wrap gap-3">
          {(stats?.pendingOrders ?? 0) > 0 && (
            <Link
              href="/dashboard/orders?status=pending"
              className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-4 py-2 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <AlertTriangle size={14} />
              {stats?.pendingOrders} pending orders need attention
            </Link>
          )}
          {(stats?.lowStockProducts ?? 0) > 0 && (
            <Link
              href="/dashboard/products"
              className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
            >
              <AlertTriangle size={14} />
              {stats?.lowStockProducts} products low on stock
            </Link>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-100"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-lg p-3 ${color}`}>
                  <Icon size={20} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp size={16} className="text-purple-600" />
            Recent Orders
          </h2>
          <Link
            href="/dashboard/orders"
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentOrders.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">
              No orders yet
            </p>
          ) : (
            recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      order.status === 'delivered'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {order.status}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
