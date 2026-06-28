export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  title: string;
  note: string;
  status?: 'success' | 'pending';
}

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'THB';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', label: 'USD ($)' },
  EUR: { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  GBP: { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  JPY: { code: 'JPY', symbol: '¥', label: 'JPY (¥)' },
  THB: { code: 'THB', symbol: '฿', label: 'THB (฿)' },
};

export type AccentColor = 'black' | 'emerald' | 'blue';

export interface AppSettings {
  currency: CurrencyCode;
  startingBalance: number;
  darkMode: boolean;
  accentColor: AccentColor;
}
