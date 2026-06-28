import { Transaction, AppSettings } from './types';

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    type: 'expense',
    amount: 142.50,
    category: 'อาหารและเครื่องดื่ม',
    date: '2023-10-24',
    time: '10:42',
    title: 'โฮลฟู้ดส์ มาร์เก็ต',
    note: 'ของกินของใช้',
    status: 'success'
  },
  {
    id: '2',
    type: 'income',
    amount: 4250.00,
    category: 'รายรับ',
    date: '2023-10-24',
    time: '09:00',
    title: 'เงินเดือน Acme Corp',
    note: 'รายรับรายเดือน',
    status: 'success'
  },
  {
    id: '3',
    type: 'expense',
    amount: 6.50,
    category: 'อาหารและเครื่องดื่ม',
    date: '2023-10-23',
    time: '08:15',
    title: 'บลูบอทเทิล คอฟฟี่',
    note: 'อาหารและเครื่องดื่ม',
    status: 'success'
  },
  {
    id: '4',
    type: 'expense',
    amount: 24.80,
    category: 'การเดินทาง',
    date: '2023-10-23',
    time: '18:30',
    title: 'ค่าเดินทาง Uber',
    note: 'การเดินทาง',
    status: 'success'
  },
  {
    id: '5',
    type: 'income',
    amount: 7100.00,
    category: 'รายรับ',
    date: '2023-10-22',
    time: '10:00',
    title: 'เงินเดือน',
    note: 'เงินฝากรายเดือน',
    status: 'success'
  },
  {
    id: '6',
    type: 'expense',
    amount: 450.00,
    category: 'การเดินทาง',
    date: '2023-10-18',
    time: '14:20',
    title: 'การเดินทาง',
    note: 'เดลตาแอร์ไลน์',
    status: 'success'
  },
  {
    id: '7',
    type: 'income',
    amount: 2850.00,
    category: 'รายรับ',
    date: '2023-10-15',
    time: '11:00',
    title: 'งานฟรีแลนซ์ออกแบบ UI',
    note: 'รับจ้างเขียนโปรแกรมอิสระ',
    status: 'success'
  },
  {
    id: '8',
    type: 'expense',
    amount: 3226.20,
    category: 'สาธารณูปโภค',
    date: '2023-10-01',
    time: '09:30',
    title: 'ค่าเช่าห้องคอนโด',
    note: 'ค่าเช่าที่พักอาศัยประจำเดือน',
    status: 'success'
  }
];

export const CATEGORIES = [
  { id: 'food', label: 'อาหารและเครื่องดื่ม', icon: 'Utensils' },
  { id: 'transport', label: 'การเดินทาง', icon: 'Car' },
  { id: 'shopping', label: 'ช้อปปิ้ง', icon: 'ShoppingBag' },
  { id: 'utilities', label: 'สาธารณูปโภค', icon: 'Zap' },
  { id: 'entertainment', label: 'ความบันเทิง', icon: 'Tv' },
  { id: 'income', label: 'รายรับ', icon: 'TrendingUp' },
  { id: 'others', label: 'อื่นๆ', icon: 'CircleEllipsis' }
];

// Calculations:
// Total Income = 4250 + 7100 + 2850 = 14200 (Matches mockup $14,200)
// Total Expense = 142.50 + 6.50 + 24.80 + 450 + 3226.20 = 3850 (Matches mockup $3,850)
// Net = 14200 - 3850 = 10350
// Target balance = 124500
// Starting balance = 124500 - 10350 = 114150
export const INITIAL_SETTINGS: AppSettings = {
  currency: 'USD',
  startingBalance: 114150.00,
  darkMode: false,
  accentColor: 'emerald',
};
