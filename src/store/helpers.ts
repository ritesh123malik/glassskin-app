import { User, Product } from '../types';
import { User as AuthUser } from '@supabase/supabase-js';

export const generateId = (): string => {
  return (globalThis as any).crypto?.randomUUID?.() ??
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
};

export const mapAuthUser = (authUser: AuthUser | null): User | null => {
  if (!authUser) return null;
  return {
    id: authUser.id,
    email: authUser.email || '',
    full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
    phone: authUser.phone || '',
    is_anonymous: authUser.is_anonymous,
    created_at: authUser.created_at,
    updated_at: authUser.updated_at || authUser.created_at,
  };
};

export const mapProduct = (p: any): Product => {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description || '',
    price: parseFloat(p.price),
    compare_at_price: p.compare_at_price ? parseFloat(p.compare_at_price) : undefined,
    category: p.category || '',
    tags: p.tags || [],
    images: p.images || [],
    stock_quantity: p.stock_quantity || 0,
    rating: parseFloat(p.rating || 0),
    review_count: p.review_count || 0,
    skin_types: p.skin_types || [],
    certifications: p.certifications || [],
    ingredients: p.ingredients || '',
    usage: p.usage || '',
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
};

export const handleAuthError = (err: any): string => {
  if (!err) return 'An unknown error occurred';
  if (err.status === 429 || err.message?.toLowerCase().includes('rate limit') || err.message?.toLowerCase().includes('too many requests')) {
    return 'Too many attempts. Please try again in a few minutes.';
  }
  const msg = err.message || '';
  if (msg.includes('Invalid login credentials')) {
    return 'Wrong password or email. Please verify your credentials.';
  }
  if (msg.includes('User not found') || msg.includes('Email not found')) {
    return 'Account not found. Please sign up first.';
  }
  if (msg.includes('already registered') || msg.includes('Email already exists')) {
    return 'This email is already registered. Please sign in instead.';
  }
  return msg;
};
