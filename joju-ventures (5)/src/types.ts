export interface Product {
  id: string;
  name: string;
  category: 'frozen_foods' | 'soft_drinks';
  unit: 'kg' | 'pcs' | 'bag' | 'crate' | 'pack';
  pricePerUnit: number;
  costPerUnit: number;
  stockQuantity: number;
  minStockLevel: number;
  description: string;
  imageUrl?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  createdAt: string;
  notes: string;
  purchaseCount: number;
  totalSpent: number;
  purchasedItems?: PurchasedItem[];
}

export interface PurchasedItem {
  productId: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  date: string;
  receiptNo: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number; // weight in kg, or pieces
  pricePerUnit: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  receiptNo: string;
  customerId: string | null;
  customerName: string;
  items: SaleItem[];
  totalAmount: number;
  discountAmount: number;
  netAmount: number;
  pointsEarned: number;
  pointsRedeemed: number;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  year: number; // YYYY
  paymentMethod: 'cash' | 'pos' | 'transfer';
  printedRef: boolean;
  cashier?: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalSalesCount: number;
  totalCustomersCount: number;
  lowStockItemsCount: number;
}

export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  connected: boolean;
  type: string;
}

export interface Attendant {
  id: string;
  name: string;
  password?: string;
  role: 'manager' | 'attendant';
}

export interface SaleNotification {
  id: string;
  saleId: string;
  receiptNo: string;
  cashier: string;
  time: string;
  date: string;
  items: { productId?: string; name: string; quantity: number; pricePerUnit: number; totalPrice: number }[];
  totalAmount: number;
  netAmount: number;
  paymentMethod: 'cash' | 'pos' | 'transfer';
  customerName?: string;
  timestamp: number;
  read: boolean;
}
