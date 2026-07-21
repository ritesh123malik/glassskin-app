export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string | null
          full_name: string
          id: string
          is_default: boolean | null
          postal_code: string
          state: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country: string
          created_at?: string | null
          full_name: string
          id?: string
          is_default?: boolean | null
          postal_code: string
          state: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string | null
          full_name?: string
          id?: string
          is_default?: boolean | null
          postal_code?: string
          state?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          changes: Json | null
          created_at: string | null
          id: string
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          admin_id: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          admin_id?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          target_id?: string | null
          target_table?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_reminder_log: {
        Row: {
          last_sent_at: string
          user_id: string
        }
        Insert: {
          last_sent_at?: string
          user_id: string
        }
        Update: {
          last_sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_reminder_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip: string
          success: boolean
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip: string
          success?: boolean
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip?: string
          success?: boolean
        }
        Relationships: []
      }
      moderation_config: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          source: string | null
          subscribed_at: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_name: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          product_name: string
          quantity: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          id: string
          payment_method: string
          shipping_address: Json
          shipping_amount: number | null
          status: string | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          id: string
          payment_method: string
          shipping_address: Json
          shipping_amount?: number | null
          status?: string | null
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          payment_method?: string
          shipping_address?: Json
          shipping_amount?: number | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string | null
          expiry_month: number | null
          expiry_year: number | null
          id: string
          is_default: boolean | null
          last_four: string
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_default?: boolean | null
          last_four: string
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_default?: boolean | null
          last_four?: string
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      paypal_webhook_events: {
        Row: {
          created_at: string | null
          event_id: string
          event_type: string
          id: string
          order_id: string | null
          payload: Json
          paypal_order_id: string | null
          processed_at: string | null
          verified: boolean
        }
        Insert: {
          created_at?: string | null
          event_id: string
          event_type: string
          id?: string
          order_id?: string | null
          payload: Json
          paypal_order_id?: string | null
          processed_at?: string | null
          verified?: boolean
        }
        Update: {
          created_at?: string | null
          event_id?: string
          event_type?: string
          id?: string
          order_id?: string | null
          payload?: Json
          paypal_order_id?: string | null
          processed_at?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "paypal_webhook_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          certifications: string[] | null
          color_code: string | null
          compare_at_price: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          images: string[] | null
          ingredients: string | null
          key_benefits: string | null
          name: string
          price: number
          rating: number | null
          review_count: number | null
          shared_metadata: string | null
          skin_types: string[] | null
          slug: string
          stock_quantity: number | null
          tags: string[] | null
          updated_at: string | null
          usage: string | null
        }
        Insert: {
          category?: string | null
          certifications?: string[] | null
          color_code?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          ingredients?: string | null
          key_benefits?: string | null
          name: string
          price: number
          rating?: number | null
          review_count?: number | null
          shared_metadata?: string | null
          skin_types?: string[] | null
          slug: string
          stock_quantity?: number | null
          tags?: string[] | null
          updated_at?: string | null
          usage?: string | null
        }
        Update: {
          category?: string | null
          certifications?: string[] | null
          color_code?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          ingredients?: string | null
          key_benefits?: string | null
          name?: string
          price?: number
          rating?: number | null
          review_count?: number | null
          shared_metadata?: string | null
          skin_types?: string[] | null
          slug?: string
          stock_quantity?: number | null
          tags?: string[] | null
          updated_at?: string | null
          usage?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          id: string
          max_uses: number | null
          min_subtotal: number
          uses_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          id?: string
          max_uses?: number | null
          min_subtotal?: number
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          min_subtotal?: number
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      review_votes: {
        Row: {
          created_at: string | null
          direction: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string
          created_at: string | null
          helpful_count: number | null
          id: string
          images: string[] | null
          product_id: string
          rating: number
          reported_by: string[]
          status: string
          user_id: string
          verified_purchase: boolean
        }
        Insert: {
          comment: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          product_id: string
          rating: number
          reported_by?: string[]
          status?: string
          user_id: string
          verified_purchase?: boolean
        }
        Update: {
          comment?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          product_id?: string
          rating?: number
          reported_by?: string[]
          status?: string
          user_id?: string
          verified_purchase?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_rates: {
        Row: {
          base_rate: number
          free_threshold: number
          id: string
          label: string | null
          state_code: string
          updated_at: string | null
        }
        Insert: {
          base_rate: number
          free_threshold?: number
          id?: string
          label?: string | null
          state_code: string
          updated_at?: string | null
        }
        Update: {
          base_rate?: number
          free_threshold?: number
          id?: string
          label?: string | null
          state_code?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          id: string
          label: string | null
          rate: number
          state_code: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          label?: string | null
          rate: number
          state_code: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          label?: string | null
          rate?: number
          state_code?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          cart_reminders: boolean | null
          created_at: string | null
          order_notifications: boolean | null
          promo_notifications: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cart_reminders?: boolean | null
          created_at?: string | null
          order_notifications?: boolean | null
          promo_notifications?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cart_reminders?: boolean | null
          created_at?: string | null
          order_notifications?: boolean | null
          promo_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_verified_purchase: {
        Args: { p_product_id: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      compute_order_totals: {
        Args: { p_items: Json; p_promo_code?: string; p_state: string }
        Returns: Json
      }
      confirm_order_payment: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      create_order_transaction: {
        Args: {
          p_discount_amount?: number
          p_items: Json
          p_order_id: string
          p_payment_method: string
          p_promo_code?: string
          p_shipping_address: Json
          p_shipping_amount?: number
          p_tax_amount?: number
          p_total_amount?: number
          p_user_id: string
        }
        Returns: Json
      }
      fail_order_payment: { Args: { p_order_id: string }; Returns: undefined }
      flag_review: {
        Args: { p_review_id: string; p_user_id: string }
        Returns: undefined
      }
      get_abandoned_cart_users: {
        Args: { p_abandonment_cutoff: string; p_cooldown_cutoff: string }
        Returns: {
          user_id: string
        }[]
      }
      get_shipping_rate_by_region: {
        Args: { p_state: string }
        Returns: number
      }
      get_tax_rate_by_region: { Args: { p_state: string }; Returns: number }
      get_user_review_vote: {
        Args: { p_review_id: string; p_user_id: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      submit_review: {
        Args: {
          p_comment: string
          p_image_urls?: string[]
          p_product_id: string
          p_rating: number
          p_user_id: string
        }
        Returns: Json
      }
      validate_promo_code: {
        Args: { p_code: string; p_subtotal: number }
        Returns: Json
      }
      vote_review: {
        Args: { p_direction: string; p_review_id: string; p_user_id: string }
        Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
