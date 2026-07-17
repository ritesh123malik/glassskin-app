export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        }
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        }
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          price: number;
          compare_at_price: number | null;
          category: string | null;
          tags: string[] | null;
          images: string[] | null;
          stock_quantity: number;
          rating: number;
          review_count: number;
          skin_types: string[] | null;
          certifications: string[] | null;
          ingredients: string | null;
          usage: string | null;
          created_at: string;
          updated_at: string;
        }
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          price: number;
          compare_at_price?: number | null;
          category?: string | null;
          tags?: string[] | null;
          images?: string[] | null;
          stock_quantity?: number;
          rating?: number;
          review_count?: number;
          skin_types?: string[] | null;
          certifications?: string[] | null;
          ingredients?: string | null;
          usage?: string | null;
          created_at?: string;
          updated_at?: string;
        }
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          price?: number;
          compare_at_price?: number | null;
          category?: string | null;
          tags?: string[] | null;
          images?: string[] | null;
          stock_quantity?: number;
          rating?: number;
          review_count?: number;
          skin_types?: string[] | null;
          certifications?: string[] | null;
          ingredients?: string | null;
          usage?: string | null;
          created_at?: string;
          updated_at?: string;
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          quantity: number;
          created_at: string;
        }
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          quantity?: number;
          created_at?: string;
        }
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          quantity?: number;
          created_at?: string;
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        }
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        }
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          status: string;
          total_amount: number;
          tax_amount: number;
          shipping_amount: number;
          discount_amount: number;
          shipping_address: Json;
          payment_method: string;
          created_at: string;
          updated_at: string;
        }
        Insert: {
          id: string;
          user_id?: string | null;
          status?: string;
          total_amount: number;
          tax_amount?: number;
          shipping_amount?: number;
          discount_amount?: number;
          shipping_address: Json;
          payment_method: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: {
          id?: string;
          user_id?: string | null;
          status?: string;
          total_amount?: number;
          tax_amount?: number;
          shipping_amount?: number;
          discount_amount?: number;
          shipping_address?: Json;
          payment_method?: string;
          created_at?: string;
          updated_at?: string;
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          price: number;
          quantity: number;
          created_at: string;
        }
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          price: number;
          quantity: number;
          created_at?: string;
        }
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          price?: number;
          quantity?: number;
          created_at?: string;
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      reviews: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          rating: number;
          comment: string;
          images: string[] | null;
          helpful_count: number;
          status: 'pending' | 'published' | 'flagged';
          verified_purchase: boolean;
          reported_by: string[];
          created_at: string;
        }
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          rating: number;
          comment: string;
          images?: string[] | null;
          helpful_count?: number;
          status?: 'pending' | 'published' | 'flagged';
          verified_purchase?: boolean;
          reported_by?: string[];
          created_at?: string;
        }
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          rating?: number;
          comment?: string;
          images?: string[] | null;
          helpful_count?: number;
          status?: 'pending' | 'published' | 'flagged';
          verified_purchase?: boolean;
          reported_by?: string[];
          created_at?: string;
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      review_votes: {
        Row: {
          id: string;
          user_id: string;
          review_id: string;
          direction: 'helpful' | 'not_helpful';
          created_at: string;
        }
        Insert: {
          id?: string;
          user_id: string;
          review_id: string;
          direction: 'helpful' | 'not_helpful';
          created_at?: string;
        }
        Update: {
          id?: string;
          user_id?: string;
          review_id?: string;
          direction?: 'helpful' | 'not_helpful';
          created_at?: string;
        }
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey"
            columns: ["review_id"]
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_votes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      addresses: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          address_line1: string;
          address_line2: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        }
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        }
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          state?: string;
          postal_code?: string;
          country?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      payment_methods: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          last_four: string;
          expiry_month: number | null;
          expiry_year: number | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        }
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          last_four: string;
          expiry_month?: number | null;
          expiry_year?: number | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        }
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          last_four?: string;
          expiry_month?: number | null;
          expiry_year?: number | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: string;
          created_at: string;
          updated_at: string;
        }
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: string;
          created_at?: string;
          updated_at?: string;
        }
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          platform?: string;
          created_at?: string;
          updated_at?: string;
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_preferences: {
        Row: {
          user_id: string;
          order_notifications: boolean;
          promo_notifications: boolean;
          cart_reminders: boolean;
          created_at: string;
          updated_at: string;
        }
        Insert: {
          user_id: string;
          order_notifications?: boolean;
          promo_notifications?: boolean;
          cart_reminders?: boolean;
          created_at?: string;
          updated_at?: string;
        }
        Update: {
          user_id?: string;
          order_notifications?: boolean;
          promo_notifications?: boolean;
          cart_reminders?: boolean;
          created_at?: string;
          updated_at?: string;
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order_transaction: {
        Args: {
          p_order_id: string;
          p_user_id: string | null;
          p_total_amount: number;
          p_tax_amount: number;
          p_shipping_amount: number;
          p_discount_amount: number;
          p_shipping_address: Json;
          p_payment_method: string;
          p_items: Json;
          p_promo_code?: string | null;
        }
        Returns: Json;
      }
      confirm_order_payment: {
        Args: { p_order_id: string }
        Returns: void;
      }
      fail_order_payment: {
        Args: { p_order_id: string }
        Returns: void;
      }
      submit_review: {
        Args: {
          p_user_id: string;
          p_product_id: string;
          p_rating: number;
          p_comment: string;
          p_image_urls?: string[] | null;
        }
        Returns: Json;
      }
      vote_review: {
        Args: {
          p_user_id: string;
          p_review_id: string;
          p_direction: string | null;
        }
        Returns: void;
      }
      flag_review: {
        Args: {
          p_user_id: string;
          p_review_id: string;
        }
        Returns: void;
      }
      check_verified_purchase: {
        Args: {
          p_user_id: string;
          p_product_id: string;
        }
        Returns: boolean;
      }
      get_user_review_vote: {
        Args: {
          p_user_id: string;
          p_review_id: string;
        }
        Returns: string | null;
      }
      get_abandoned_cart_users: {
        Args: {
          p_abandonment_cutoff: string;
          p_cooldown_cutoff: string;
        }
        Returns: { user_id: string }[];
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
