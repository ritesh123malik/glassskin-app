'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, ShoppingBag, Users, DollarSign } from 'lucide-react';

type MonthlyRevenue = { month: string; revenue: number; orders: number };

export default function AnalyticsPage() {
  const [monthly, setMonthly] = useState<MonthlyRevenue[]>([]);
  const [totals, setTotals] = useState({
    revenue: 0,
    orders: 0,
    customers: 0,
    avgOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const [ordersRes, usersRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, created_at, total_amount, status')
        .eq('status', 'delivered'),
      supabase.from('users').select('id'),
    ]);

    const orders = ordersRes.data ?? [];
    const customers = usersRes.data?.length ?? 0;
    const totalRevenue = orders.reduce((s, o) => s + (o.total_amount ?? 0), 0);

    setTotals({
      revenue: totalRevenue,
      orders: orders.length,
      customers,
      avgOrderValue: orders.length ? totalRevenue / orders.length : 0,
    });

    // Build monthly buckets
    const buckets: Record<string, MonthlyRevenue> = {};
    orders.forEach((o) => {
      const month = o.created_at.slice(0, 7); // "YYYY-MM"
      if (!buckets[month]) buckets[month] = { month, revenue: 0, orders: 0 };
      buckets[month].revenue += o.total_amount ?? 0;
      buckets[month].orders += 1;
    });
    setMonthly(
      Object.values(buckets)
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6)
    );

    setLoading(false);
  };

  const maxRevenue = Math.max(...monthly.map((m) => m.revenue), 1);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Revenue from delivered orders only
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Revenue', value: formatCurrency(totals.revenue), icon: DollarSign, color: 'bg-green-50 text-green-600' },
          { label: 'Total Orders', value: totals.orders, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
          { label: 'Customers', value: totals.customers, icon: Users, color: 'bg-orange-50 text-orange-600' },
          { label: 'Avg. Order Value', value: formatCurrency(totals.avgOrderValue), icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-3 ${color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Revenue Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-6">
          Monthly Revenue (Last 6 months)
        </h2>
        {monthly.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No revenue data yet
          </p>
        ) : (
          <div className="flex items-end gap-4 h-48">
            {monthly.map((m) => {
              const heightPct = (m.revenue / maxRevenue) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {formatCurrency(m.revenue)}
                  </span>
                  <div
                    className="w-full bg-purple-500 rounded-t-md transition-all hover:bg-purple-600"
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                    title={`${m.month}: ${formatCurrency(m.revenue)}`}
                  />
                  <span className="text-xs text-gray-400">
                    {m.month.slice(5)}
                  </span>
                  <span className="text-xs text-gray-400">{m.orders} orders</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
