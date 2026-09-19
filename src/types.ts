export interface ExpenseItem {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  storeName: string;
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  paymentMethod: string;
  receiptNumber?: string;
  source: 'MANUAL' | 'OCR_PHOTO' | 'BANK_SYNC';
  notes?: string;
  createdAt: string;
}

export interface ReceiptScanResult {
  storeName: string;
  date: string;
  time?: string;
  receiptNo?: string;
  category: string;
  paymentMethod: string;
  items: {
    id?: string;
    name: string;
    qty: number;
    unitPrice: number;
    discount: number;
    totalPrice: number;
    category: string;
  }[];
  subtotal: number;
  discountTotal: number;
  tax: number;
  totalAmount: number;
  notes?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  holderName: string;
  balance: number;
  connected: boolean;
  lastSynced: string | null;
  logoColor: string;
}

export interface BankMutation {
  id: string;
  bank: string;
  date: string;
  time: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  categorySuggestion: string;
  storeSuggestion: string;
  imported: boolean;
  referenceNumber?: string;
}

export interface DailyReminderConfig {
  enabled: boolean;
  reminderTime: string; // e.g. "20:00"
  streakDays: number;
  lastLoggedDate: string;
  soundEnabled: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
}

export interface CategorySummary {
  name: string;
  total: number;
  count: number;
  color: string;
}
