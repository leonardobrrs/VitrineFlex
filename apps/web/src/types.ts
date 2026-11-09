export type StoreSegment = 'FASHION' | 'TECH' | 'BOOKS';

export interface StoreManifestTheme {
  primary_color: string;
  secondary_color: string;
  font_family?: string;
  logo_url?: string;
  store_name?: string;
}

export interface StoreManifest {
  schema_version: string;
  version: number;
  created_at: string;
  store_id: string;
  store_slug: string;
  store_name: string;
  segment: StoreSegment;
  store?: {
    id: string;
    name: string;
    slug: string;
    segment: StoreSegment;
  };
  features: {
    auth: boolean;
    catalog: boolean;
    cart: boolean;
    orders: boolean;
    checkout: boolean;
    recommendations: boolean;
    size_grid?: boolean;
    color_variants?: boolean;
    variant_sku?: boolean;
    technical_specs?: boolean;
    warranty_info?: boolean;
    product_comparison?: boolean;
    isbn?: boolean;
    author?: boolean;
    publisher?: boolean;
    literary_genre?: boolean;
    edition?: boolean;
    favorites?: boolean;
    recently_viewed?: boolean;
    fashion_size_guide?: boolean;
    technical_filters?: boolean;
    book_preview?: boolean;
    back_in_stock_alert?: boolean;
    [key: string]: boolean | undefined;
  };
  payment_methods: string[];
  fulfillment_modes: string[];
  theme: StoreManifestTheme;
  theme_colors?: {
    primary: string;
    secondary: string;
    accent?: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export interface ServiceHealth {
  id: string;
  name: string;
  port: number;
  planned_sprint: number;
  status: 'UP' | 'DOWN' | 'NOT_STARTED';
  latency_ms: number | null;
  message: string;
}

export interface SystemServicesResponse {
  gateway_port: number;
  total_services: number;
  services: ServiceHealth[];
}

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  sku: string;
  stock_quantity: number;
}

export interface ProductAttribute {
  id: string;
  name: string;
  value: string;
}

export interface Product {
  id: string;
  store_id: string;
  title: string;
  description: string;
  price: number;
  stock_quantity: number;
  category: string;
  image_url?: string;
  is_active: boolean;
  preview_content?: string;
  variants: ProductVariant[];
  attributes: ProductAttribute[];
  created_at: string;
}

export interface Store {
  id: string;
  slug: string;
  name: string;
  segment: StoreSegment;
  created_at: string;
  current_manifest?: StoreManifest;
}

export interface CartItem {
  id: string;
  product_id: string;
  variant_id?: string;
  title: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  image_url?: string;
}

export interface Cart {
  id: string;
  store_id: string;
  user_id: string;
  items: CartItem[];
  total_items: number;
  subtotal: number;
}

export interface ShippingOption {
  code: string;
  modality: string;
  name: string;
  cost: number;
  estimated_days: number;
}

export interface OrderItemSnapshot {
  id: string;
  product_id: string;
  variant_id?: string;
  title: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  snapshot_attributes: Record<string, any>;
  reservation_operation_id: string;
}

export interface OrderStatusHistory {
  id: string;
  from_status: string;
  to_status: string;
  reason?: string;
  created_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  user_id: string;
  status: string;
  subtotal: number;
  shipping_cost: number;
  total_amount: number;
  payment_method: string;
  fulfillment_mode: string;
  shipping_zip_code: string;
  shipping_address?: string;
  items: OrderItemSnapshot[];
  history: OrderStatusHistory[];
  created_at: string;
  updated_at: string;
}

export interface RecommendationItem {
  product_id: string;
  title: string;
  category: string;
  price: number;
  available_stock: number;
  score: number;
  reason: string;
  image_url?: string;
}

export interface RecommendationResponse {
  store_id: string;
  total: number;
  items: RecommendationItem[];
  degraded: boolean;
  cold_start: boolean;
}

export interface StockAlertCreateRequest {
  store_id: string;
  user_id: string;
  user_email: string;
  product_id: string;
  variant_id?: string | null;
}

export interface StockAlertResponse {
  id: string;
  store_id: string;
  user_id: string;
  user_email: string;
  product_id: string;
  variant_id?: string | null;
  status: 'PENDING' | 'NOTIFIED' | 'CANCELLED';
  created_at: string;
  notified_at?: string | null;
}

export interface TechnicalFilterGroup {
  name: string;
  options: string[];
  attribute_name?: string;
  values?: string[];
}

export interface TechnicalFiltersResponse {
  store_id: string;
  filters: TechnicalFilterGroup[];
}


