export interface User {
  id: number;
  nickname: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  parentId?: number | null;
  level: number;
  path?: string;
  orderIndex: number;
  children?: Category[];
}

export interface Tag {
  id: number;
  name: string;
  category_id?: number;
  category_name?: string;
  product_count?: number;
  originalName?: string;
}

export interface TagWithStats {
  id: number;
  name: string;
  category_id?: number;
  category_name?: string;
  product_count: number;
}

export interface Product {
  id: number;
  name: string;
}

export interface TagData {
  name: string;
  category_id?: number;
  productIds: number[];
}

export interface Evaluation {
  id: number;
  user_id: number;
  user_nickname: string;
  content: string;
  rating: number;
  tags: Tag[];
  created_at: string;
}

export interface Prize {
  id: number;
  name: string;
  image_url: string;
  stock: number;
  probability: number;
}

export interface LotteryRecord {
  id: number;
  user_id: number;
  user_nickname: string;
  prize_name: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  merchant: {
    id: number;
    username: string;
    role: 'admin' | 'staff';
  };
}

export interface DashboardStats {
  total_users: number;
  total_evaluations: number;
  today_evaluations: number;
  lottery_participants: number;
}

export interface MerchantProfile {
  id: number;
  username: string;
  shopName: string;
  contact_phone?: string;
  address?: string;
  description?: string;
  customerServiceQrUrl?: string;
}