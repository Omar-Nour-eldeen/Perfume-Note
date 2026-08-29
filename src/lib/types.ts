export interface Profile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  governorate: string | null;
  avatar_url: string | null;
  balance: number;
  is_admin: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  created_at: string;
}

export interface Product {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  original_price: number | null;
  unit: string | null;
  badge_ar: string | null;
  badge_en: string | null;
  images: string[];
  category_id: string | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  is_offer: boolean;
  top_notes_ar: string | null;
  top_notes_en: string | null;
  heart_notes_ar: string | null;
  heart_notes_en: string | null;
  base_notes_ar: string | null;
  base_notes_en: string | null;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface DiscountCode {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  min_order: number;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  created_at: string;
}

export interface ShippingZone {
  id: string;
  name_ar: string;
  name_en: string;
  cost: number;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  status: "pending" | "processing" | "shipped" | "delivered" | "returned" | "cancelled";
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  customer_name: string;
  phone: string;
  address: string;
  governorate: string;
  discount_code: string | null;
  payment_method: string;
  created_at: string;
  delivered_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  title: string;
  price: number;
  quantity: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string | null;
  session_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  message: string;
  created_at: string;
}

export interface ReturnRequest {
  id: string;
  order_id: string;
  user_id: string;
  reason: string;
  images: string[] | null;
  status: "pending" | "approved" | "rejected" | "received" | "completed" | "reopened" | "cancelled";
  refund_amount: number;
  returned_items?: { item_id: string; quantity: number; title: string; price: number }[];
  received_items?: { item_id: string; quantity: number; title: string; price: number }[];
  rejection_reason: string | null;
  rejected_at: string | null;
  refunded: boolean;
  created_at: string;
  order?: Order;
}

export interface OrderActivity {
  id: string;
  order_id: string;
  user_id: string | null;
  action: string;
  description_ar: string;
  description_en: string;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: "refund" | "purchase" | "admin_adjustment";
  description: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string; // If 'admin', it's for all admins
  type: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}
