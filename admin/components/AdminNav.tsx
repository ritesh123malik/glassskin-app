'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth, type AdminUser } from '@/lib/auth';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  BarChart3,
  Tags,
  Users,
  Bell,
  Mail,
  Smartphone,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/promo-codes', label: 'Promo Codes', icon: Tags },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/dashboard/push-tokens', label: 'Push Tokens', icon: Smartphone },
  { href: '/dashboard/user-preferences', label: 'Preferences', icon: Users },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/newsletter', label: 'Newsletter', icon: Mail },
  { href: '/dashboard/audit-log', label: 'Audit Log', icon: FileText },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function AdminNav({ user }: { user: AdminUser }) {
  const pathname = usePathname();
  const { signOut } = useAdminAuth();

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left: logo + nav links */}
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="text-xl font-bold tracking-tight text-gray-900"
            >
              GLASSSKIN{' '}
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full ml-1">
                Admin
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  id={`nav-${label.toLowerCase()}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(href)
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: user + sign out */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-gray-900">{user.email}</p>
              <p className="text-xs text-purple-600">Administrator</p>
            </div>
            <button
              id="btn-sign-out"
              onClick={signOut}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-gray-100">
        <div className="flex overflow-x-auto px-4 py-2 gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive(href)
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
