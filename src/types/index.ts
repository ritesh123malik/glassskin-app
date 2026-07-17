export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  is_anonymous?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price?: number;
  category: string;
  tags: string[];
  images: string[];
  stock_quantity: number;
  rating: number;
  review_count: number;
  created_at?: string;
  updated_at?: string;
  skin_types?: string[]; // dry, oily, sensitive, normal, combination
  certifications?: string[]; // organic, vegan, cruelty-free, toxin-free
  ingredients?: string;
  usage?: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at?: string;
  product?: Product;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at?: string;
  product?: Product;
}

export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  shipping_address: ShippingAddress;
  payment_method: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  created_at?: string;
  product?: Product;
}

export interface Review {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  product_id: string;
  rating: number;
  comment: string;
  images?: string[];
  helpful_count: number;
  created_at: string;
  /** Moderation status — only 'published' reviews are displayed publicly */
  status?: 'pending' | 'published' | 'flagged';
  /** True if reviewer has a delivered order containing this product */
  verified_purchase?: boolean;
  /** Current authenticated user's vote on this review, if any */
  user_vote?: 'helpful' | 'not_helpful' | null;
}
