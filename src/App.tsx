import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  History,
  Settings as SettingsIcon,
  HelpCircle,
  LogOut,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Download,
  SlidersHorizontal,
  Search,
  Bell,
  ChevronDown,
  User,
  Moon,
  Sun,
  Palette,
  AlertTriangle,
  ShoppingCart,
  Plane,
  Coffee,
  Coins,
  Zap,
  Tv,
  Wallet,
  Check,
  TrendingUp,
  X,
  CreditCard,
  Menu,
  Landmark,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, AppSettings, CurrencyCode, CURRENCY_CONFIGS, AccentColor } from './types';
import { CATEGORIES } from './mockData';
import { supabase } from './lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

export default function App() {
  // --- AUTHENTICATION STATE ---
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // --- DATA LOADING STATES ---
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  // --- STATE MANAGEMENT ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    currency: 'THB',
    startingBalance: 0.00,
    darkMode: false,
    accentColor: 'emerald',
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');
  
  // Mobile menu sidebar state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Search and filter states (History Page)
  const [historySearch, setHistorySearch] = useState('');
  const [historyMonthFilter, setHistoryMonthFilter] = useState('ทั้งหมด');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('ทุกหมวดหมู่');

  // Search state (Dashboard)
  const [dashboardSearch, setDashboardSearch] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Pre-filled modal values
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
  const [modalAmount, setModalAmount] = useState('');
  const [modalCategory, setModalCategory] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalNote, setModalNote] = useState('');
  const [modalDate, setModalDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Inline balance editing state
  const [isEditingBalanceInline, setIsEditingBalanceInline] = useState(false);
  const [inlineBalanceValue, setInlineBalanceValue] = useState('');

  // Manual Settings Balance input state
  const [settingsBalanceInput, setSettingsBalanceInput] = useState('');

  // Reset confirmation modal state
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Notifications/Toast Toast Alert
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // --- TOAST TRIGGER ---
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- CHECK AUTH SESSION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- FETCH DATA FROM SUPABASE ---
  const fetchUserData = async () => {
    if (!currentUser) return;
    setIsLoadingData(true);
    try {
      // 1. Fetch profile settings
      let profile = null;
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();
        
        if (profileError) {
          console.warn('Profile fetch error:', profileError);
        } else {
          profile = data;
        }
      } catch (e) {
        console.warn('Failed to select profile:', e);
      }

      if (profile) {
        setSettings({
          currency: (profile.currency as CurrencyCode) || 'THB',
          startingBalance: Number(profile.starting_balance) || 0,
          darkMode: !!profile.dark_mode,
          accentColor: (profile.accent_color as AccentColor) || 'emerald',
        });
      } else {
        // Create profile if not auto-created by trigger
        const defaultProfile = {
          id: currentUser.id,
          currency: 'THB',
          starting_balance: 0.00,
          dark_mode: false,
          accent_color: 'emerald'
        };
        try {
          await supabase.from('profiles').insert(defaultProfile);
        } catch (e) {
          console.warn('Failed to insert default profile:', e);
        }
      }

      // 2. Fetch transactions
      let formattedTxs: Transaction[] = [];
      try {
        const { data: txs, error: txsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('date', { ascending: false })
          .order('time', { ascending: false });

        if (txsError) throw txsError;

        formattedTxs = (txs || []).map(t => ({
          id: t.id,
          type: t.type as 'income' | 'expense',
          amount: Number(t.amount),
          category: t.category,
          date: t.date,
          time: t.time ? t.time.slice(0, 5) : '00:00',
          title: t.title,
          note: t.note || '',
          status: (t.status as 'success' | 'pending') || 'success'
        }));
      } catch (txErr: any) {
        console.warn('Failed to fetch transactions:', txErr);
      }

      setTransactions(formattedTxs);
    } catch (err: any) {
      console.error(err);
      triggerToast('ไม่สามารถดึงข้อมูลได้: ' + err.message, 'error');
    } finally {
      setIsLoadingData(false);
    }
  };


  useEffect(() => {
    if (currentUser) {
      fetchUserData();
    } else {
      setTransactions([]);
    }
  }, [currentUser]);

  // Handle dark mode class toggle
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('bg-[#0b0f19]', 'text-slate-100');
      document.body.classList.remove('bg-[#f7f9fb]', 'text-[#191c1e]');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.add('bg-[#f7f9fb]', 'text-[#191c1e]');
      document.body.classList.remove('bg-[#0b0f19]', 'text-slate-100');
    }
  }, [settings.darkMode]);

  // Sync settings balance inputs when settings load or update
  const currentTotalCalculatedBalance = useMemo(() => {
    const totalIncome = transactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum, 0);
    const totalExpense = transactions.reduce((sum, t) => t.type === 'expense' ? sum + t.amount : sum, 0);
    return settings.startingBalance + totalIncome - totalExpense;
  }, [transactions, settings.startingBalance]);

  useEffect(() => {
    setSettingsBalanceInput(currentTotalCalculatedBalance.toFixed(2));
    setInlineBalanceValue(currentTotalCalculatedBalance.toFixed(2));
  }, [currentTotalCalculatedBalance]);

  const getAccentColorClass = (type: 'text' | 'bg' | 'border' | 'ring' | 'activeBg' | 'badge') => {
    const accent = settings.accentColor;
    if (accent === 'emerald') {
      switch (type) {
        case 'text': return 'text-emerald-600 dark:text-emerald-400';
        case 'bg': return 'bg-emerald-600 hover:bg-emerald-700 text-white';
        case 'border': return 'border-emerald-600 dark:border-emerald-500';
        case 'ring': return 'focus:ring-emerald-500 focus:border-emerald-500';
        case 'activeBg': return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-semibold';
        case 'badge': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30';
      }
    }
    if (accent === 'blue') {
      switch (type) {
        case 'text': return 'text-blue-600 dark:text-blue-400';
        case 'bg': return 'bg-blue-600 hover:bg-blue-700 text-white';
        case 'border': return 'border-blue-600 dark:border-blue-500';
        case 'ring': return 'focus:ring-blue-500 focus:border-blue-500';
        case 'activeBg': return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold';
        case 'badge': return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/30';
      }
    }
    // Default: Black Slate
    switch (type) {
      case 'text': return 'text-slate-900 dark:text-slate-100';
      case 'bg': return 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900';
      case 'border': return 'border-slate-900 dark:border-slate-400';
      case 'ring': return 'focus:ring-slate-900 focus:border-slate-900 dark:focus:ring-slate-200';
      case 'activeBg': return 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-semibold';
      case 'badge': return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700';
    }
  };

  const formatCurrency = (value: number) => {
    const config = CURRENCY_CONFIGS[settings.currency] || CURRENCY_CONFIGS.THB;
    return `${config.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getCurrencySymbol = () => {
    return (CURRENCY_CONFIGS[settings.currency] || CURRENCY_CONFIGS.THB).symbol;
  };

  // Custom function to calculate and adjust starting balance to preserve user adjusted balances
  const handleUpdateBalanceInput = async (newVal: string) => {
    if (!currentUser) return;
    const parsed = parseFloat(newVal);
    if (isNaN(parsed)) {
      triggerToast('กรุณากรอกจำนวนเงินให้ถูกต้อง', 'error');
      return;
    }
    
    setIsMutating(true);
    try {
      const totalIncome = transactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum, 0);
      const totalExpense = transactions.reduce((sum, t) => t.type === 'expense' ? sum + t.amount : sum, 0);
      const newStartingBalance = parsed - (totalIncome - totalExpense);
      
      const { error } = await supabase
        .from('profiles')
        .update({ starting_balance: newStartingBalance })
        .eq('id', currentUser.id);

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        startingBalance: newStartingBalance
      }));
      setIsEditingBalanceInline(false);
      triggerToast('ปรับปรุงยอดเงินคงเหลือเรียบร้อยแล้ว');
    } catch (err: any) {
      triggerToast('อัปเดตล้มเหลว: ' + err.message, 'error');
    } finally {
      setIsMutating(false);
    }
  };

  // Open transaction modal in 'add' mode
  const openAddModal = (preferredType?: 'income' | 'expense') => {
    setModalMode('add');
    setEditingTransaction(null);
    setModalType(preferredType || 'expense');
    setModalAmount('');
    setModalCategory(preferredType === 'income' ? 'รายรับ' : 'อาหารและเครื่องดื่ม');
    setModalTitle('');
    setModalNote('');
    setModalDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  // Open transaction modal in 'edit' mode
  const openEditModal = (tx: Transaction) => {
    setModalMode('edit');
    setEditingTransaction(tx);
    setModalType(tx.type);
    setModalAmount(tx.amount.toString());
    setModalCategory(tx.category);
    setModalTitle(tx.title);
    setModalNote(tx.note);
    setModalDate(tx.date);
    setIsModalOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const amountNum = parseFloat(modalAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      triggerToast('กรุณาระบุจำนวนเงินที่ถูกต้องและมากกว่า 0', 'error');
      return;
    }
    if (!modalTitle.trim()) {
      triggerToast('กรุณาระบุหัวข้อรายการ', 'error');
      return;
    }

    // Prevents negative balance if enabled (for expenses)
    if (modalType === 'expense') {
      const balanceAfterTx = currentTotalCalculatedBalance - amountNum + (modalMode === 'edit' && editingTransaction ? editingTransaction.amount : 0);
      if (balanceAfterTx < 0) {
        triggerToast('ยอดเงินคงเหลือไม่เพียงพอสำหรับรายการนี้', 'error');
        return;
      }
    }

    setIsMutating(true);
    try {
      const currentLocalTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

      if (modalMode === 'add') {
        const insertData = {
          user_id: currentUser.id,
          type: modalType,
          amount: amountNum,
          category: modalCategory || (modalType === 'income' ? 'รายรับ' : 'อาหารและเครื่องดื่ม'),
          date: modalDate,
          time: currentLocalTime,
          title: modalTitle.trim(),
          note: modalNote.trim(),
          status: 'success'
        };

        const { data, error } = await supabase
          .from('transactions')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        const newTx: Transaction = {
          id: data.id,
          type: data.type as 'income' | 'expense',
          amount: Number(data.amount),
          category: data.category,
          date: data.date,
          time: data.time.slice(0, 5),
          title: data.title,
          note: data.note || '',
          status: (data.status as 'success' | 'pending') || 'success'
        };

        setTransactions(prev => [newTx, ...prev]);
        triggerToast('เพิ่มรายการธุรกรรมเรียบร้อยแล้ว');
      } else if (modalMode === 'edit' && editingTransaction) {
        const updateData = {
          type: modalType,
          amount: amountNum,
          category: modalCategory,
          date: modalDate,
          title: modalTitle.trim(),
          note: modalNote.trim()
        };

        const { error } = await supabase
          .from('transactions')
          .update(updateData)
          .eq('id', editingTransaction.id)
          .eq('user_id', currentUser.id);

        if (error) throw error;

        setTransactions(prev => prev.map(t => t.id === editingTransaction.id ? {
          ...t,
          ...updateData,
          amount: amountNum
        } : t));
        triggerToast('แก้ไขข้อมูลธุรกรรมเรียบร้อยแล้ว');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      triggerToast('ทำรายการไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      setIsMutating(false);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!currentUser) return;
    const confirmDelete = window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?');
    if (!confirmDelete) return;

    setIsMutating(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      setTransactions(prev => prev.filter(t => t.id !== id));
      triggerToast('ลบรายการธุรกรรมเรียบร้อยแล้ว', 'info');
    } catch (err: any) {
      triggerToast('ลบล้มเหลว: ' + err.message, 'error');
    } finally {
      setIsMutating(false);
    }
  };

  // Reset all account data to defaults
  const handleResetData = async () => {
    if (!currentUser) return;
    setIsMutating(true);
    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', currentUser.id);

      if (deleteError) throw deleteError;

      const defaultProfile = {
        currency: 'THB',
        starting_balance: 0.00,
        dark_mode: false,
        accent_color: 'emerald'
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update(defaultProfile)
        .eq('id', currentUser.id);

      if (profileError) throw profileError;

      setTransactions([]);
      setSettings({
        currency: 'THB',
        startingBalance: 0.00,
        darkMode: false,
        accentColor: 'emerald'
      });
      setIsResetConfirmOpen(false);
      setActiveTab('dashboard');
      triggerToast('ระบบได้ล้างข้อมูลและตั้งค่าใหม่เรียบร้อยแล้ว');
    } catch (err: any) {
      triggerToast('รีเซ็ตล้มเหลว: ' + err.message, 'error');
    } finally {
      setIsMutating(false);
    }
  };

  // Update Settings Profile Settings (Currency, Dark Mode, Accent Color)
  const handleUpdateProfileSetting = async (updates: Partial<AppSettings>) => {
    if (!currentUser) return;
    try {
      const dbUpdates: any = {};
      if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
      if (updates.darkMode !== undefined) dbUpdates.dark_mode = updates.darkMode;
      if (updates.accentColor !== undefined) dbUpdates.accent_color = updates.accentColor;

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', currentUser.id);

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...updates }));
    } catch (err: any) {
      triggerToast('บันทึกการตั้งค่าไม่สำเร็จ: ' + err.message, 'error');
    }
  };

  // Handle Authentication (Login / Register)
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      triggerToast('กรุณากรอกอีเมลและรหัสผ่าน', 'error');
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword.trim(),
        });
        if (error) throw error;
        triggerToast('ลงชื่อเข้าใช้งานสำเร็จ!');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword.trim(),
        });
        if (error) throw error;
        
        // Auto-login if session is returned (email confirmation is off)
        if (data.session) {
          triggerToast('สมัครสมาชิกและเข้าสู่ระบบสำเร็จ!');
        } else {
          // If confirm email is ON, tell the user to confirm or turn it off
          triggerToast('สมัครสมาชิกสำเร็จ! กรุณาเปิดแดชบอร์ด Supabase ไปปิด Confirm Email ใน Auth Settings หรือเช็คอีเมลเพื่อเปิดใช้งาน', 'info');
        }
      }
    } catch (err: any) {
      triggerToast(err.message, 'error');
    } finally {
      setAuthLoading(false);
    }
  };


  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      triggerToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
    } catch (err: any) {
      triggerToast(err.message, 'error');
    }
  };

  // Export dynamically to CSV with UTF-8 support for Thai labels
  const handleExportCSV = () => {
    const headers = ['ID', 'ประเภท', 'จำนวนเงิน', 'หมวดหมู่', 'วันที่', 'เวลา', 'หัวข้อ', 'บันทึก', 'สถานะ'];
    const rows = transactions.map(t => [
      t.id,
      t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
      t.amount,
      t.category,
      t.date,
      t.time,
      t.title.replace(/,/g, ' '),
      t.note.replace(/,/g, ' '),
      t.status || 'success'
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lumina_finance_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('ส่งออกประวัติธุรกรรมเป็นไฟล์ CSV เรียบร้อย');
  };

  // --- DYNAMIC CALCULATIONS ---
  const stats = useMemo(() => {
    const filteredIncome = transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc, 0);
    const filteredExpense = transactions.reduce((acc, t) => t.type === 'expense' ? acc + t.amount : acc, 0);
    return {
      income: filteredIncome,
      expense: filteredExpense,
    };
  }, [transactions]);

  // Categories helper mapping for icon rendering
  const getTransactionIcon = (category: string, title: string) => {
    const t = title.toLowerCase();
    const c = category.toLowerCase();
    
    if (t.includes('โฮลฟู้ดส์') || t.includes('สินค้าอุปโภค') || c.includes('ช้อปปิ้ง') || c.includes('ของกิน') || c.includes('shopping')) {
      return <ShoppingCart className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />;
    }
    if (t.includes('เดลตา') || t.includes('uber') || t.includes('เดินทาง') || c.includes('เดินทาง') || c.includes('transport')) {
      return <Plane className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
    if (t.includes('บลูบอทเทิล') || t.includes('คอฟฟี่') || c.includes('อาหาร') || c.includes('cafe') || c.includes('dining')) {
      return <Coffee className="w-5 h-5 text-amber-700 dark:text-amber-500" />;
    }
    if (c.includes('รายรับ') || t.includes('เงินเดือน') || c.includes('income')) {
      return <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
    if (c.includes('สาธารณูปโภค') || c.includes('ไฟ') || c.includes('utilities') || c.includes('zap')) {
      return <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
    }
    if (c.includes('ความบันเทิง') || t.includes('netflix') || t.includes('youtube') || c.includes('entertainment')) {
      return <Tv className="w-5 h-5 text-red-600 dark:text-red-400" />;
    }
    return <Wallet className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />;
  };

  // Process filter combinations for History Page
  const processedTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Search filter
      const matchesSearch = t.title.toLowerCase().includes(historySearch.toLowerCase()) ||
                            t.note.toLowerCase().includes(historySearch.toLowerCase()) ||
                            t.category.toLowerCase().includes(historySearch.toLowerCase());
      
      // 2. Month filter (e.g. "ตุลาคม 2023", "กันยายน 2023", "สิงหาคม 2023", "ทั้งหมด")
      let matchesMonth = true;
      if (historyMonthFilter !== 'ทั้งหมด') {
        const [monthName, yearStr] = historyMonthFilter.split(' ');
        const year = parseInt(yearStr);
        const txDate = new Date(t.date);
        const txMonth = txDate.getMonth();
        const txYear = txDate.getFullYear();
        
        const monthsThai = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        const monthsEng = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        const thaiMonthIndex = monthsThai.indexOf(monthName);
        const engMonthIndex = monthsEng.indexOf(monthName);
        const targetMonthIndex = thaiMonthIndex !== -1 ? thaiMonthIndex : engMonthIndex;

        matchesMonth = (txMonth === targetMonthIndex) && (txYear === year);
      }

      // 3. Category filter
      let matchesCategory = true;
      if (historyCategoryFilter !== 'ทุกหมวดหมู่') {
        matchesCategory = t.category === historyCategoryFilter;
      }

      return matchesSearch && matchesMonth && matchesCategory;
    });
  }, [transactions, historySearch, historyMonthFilter, historyCategoryFilter]);

  // Process Dashboard Search
  const dashboardFilteredTransactions = useMemo(() => {
    if (!dashboardSearch.trim()) return transactions.slice(0, 4); // Display latest 4 items
    return transactions.filter(t => 
      t.title.toLowerCase().includes(dashboardSearch.toLowerCase()) || 
      t.note.toLowerCase().includes(dashboardSearch.toLowerCase())
    );
  }, [transactions, dashboardSearch]);

  // Group processed transactions by Date (for history screen layout)
  const groupedHistoryTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    
    // Sort transactions chronologically
    const sorted = [...processedTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    sorted.forEach(t => {
      // Format Thai dynamic date labels e.g., "วันนี้, 24 ต.ค.", "เมื่อวาน, 23 ต.ค.", or standard date formatted
      const dateObj = new Date(t.date);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let groupLabel = '';
      const formattedThaiDate = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

      if (dateObj.toDateString() === today.toDateString()) {
        groupLabel = `วันนี้, ${formattedThaiDate}`;
      } else if (dateObj.toDateString() === yesterday.toDateString()) {
        groupLabel = `เมื่อวาน, ${formattedThaiDate}`;
      } else {
        const fullThaiDate = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        groupLabel = fullThaiDate;
      }

      if (!groups[groupLabel]) {
        groups[groupLabel] = [];
      }
      groups[groupLabel].push(t);
    });

    return groups;
  }, [processedTransactions]);

  // Dynamic Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
          <p className="text-slate-400 text-sm font-medium">กำลังโหลดแอปพลิเคชัน...</p>
        </div>
      </div>
    );
  }

  // --- 0. AUTHENTICATION VIEW ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        {/* TOAST NOTIFICATION CONTAINER */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 16, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all ${
                toast.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                  : toast.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              }`}
            >
              {toast.type === 'success' && <Check className="w-4 h-4 text-emerald-500" />}
              {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#131b2e] border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl flex flex-col gap-6"
        >
          <div className="text-center flex flex-col items-center gap-3">
            <div className="p-3 bg-emerald-950/40 text-emerald-400 rounded-2xl border border-emerald-900/30">
              <Landmark className="w-8 h-8" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-white tracking-tight">FlowCash</h1>
              <p className="text-xs text-slate-400 mt-1 font-medium">จัดการระบบการเงินส่วนตัวได้อย่างง่ายดาย</p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">อีเมล</label>
              <input 
                type="email"
                required
                placeholder="name@example.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 focus:bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">รหัสผ่าน</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-slate-800 focus:bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full font-semibold py-3 mt-2 rounded-xl text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
            >
              {authMode === 'login' ? 'เข้าสู่ระบบ' : 'ลงทะเบียนบัญชีใหม่'}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-xs text-emerald-400 hover:underline font-bold"
            >
              {authMode === 'login' ? 'ยังไม่มีบัญชีใช่หรือไม่? สมัครสมาชิกใหม่' : 'มีบัญชีอยู่แล้ว? ลงชื่อเข้าใช้ที่นี่'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-200">
      
      {/* TOAST NOTIFICATION CONTAINER */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all ${
              toast.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                : toast.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                : 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
            }`}
          >
            {toast.type === 'success' && <Check className="w-4 h-4 text-emerald-500" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDE NAVIGATION BAR (Desktop always visible, mobile floating drawer) */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-[#131b2e] border-r border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-6 transition-transform duration-300 md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        {/* Brand */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${getAccentColorClass('activeBg')}`}>
              <Landmark className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-slate-900 dark:text-white">
              FlowCash
            </span>
          </div>
          {/* Mobile close button */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-600">
            {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-slate-800 dark:text-slate-100 truncate text-xs">{currentUser?.email || 'User'}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">สมาชิกเข้าสู่ระบบ</span>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <nav className="flex flex-col gap-1 flex-grow">
          <button
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all text-sm font-medium ${
              activeTab === 'dashboard' 
                ? getAccentColorClass('activeBg') 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>แผงควบคุม</span>
          </button>

          <button
            onClick={() => { setActiveTab('history'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all text-sm font-medium ${
              activeTab === 'history' 
                ? getAccentColorClass('activeBg') 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-5 h-5" />
            <span>ประวัติธุรกรรม</span>
          </button>

          <button
            onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all text-sm font-medium ${
              activeTab === 'settings' 
                ? getAccentColorClass('activeBg') 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <SettingsIcon className="w-5 h-5" />
            <span>การตั้งค่า</span>
          </button>
        </nav>

        {/* Sidebar Actions & Footers */}
        <div className="flex flex-col gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => openAddModal()}
            className={`w-full font-semibold py-3 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${getAccentColorClass('bg')}`}
          >
            <Plus className="w-4 h-4" /> เพิ่มรายการ
          </button>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Backdrop overlay for mobile menu drawer */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 z-30 md:hidden backdrop-blur-sm"
        />
      )}

      {/* MAIN LAYOUT CANVAS CONTAINER */}
      <div className="flex-grow flex flex-col md:ml-64 min-h-screen relative">
        
        {/* HEADER / NAVIGATION BAR (Top of screen) */}
        <header className="w-full h-16 sticky top-0 bg-white/80 dark:bg-[#0b0f19]/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-6 z-20">
          
          {/* Mobile Hamburguer Toggle Button */}
          <div className="flex items-center md:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 mr-2"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-display font-bold text-lg text-slate-900 dark:text-white">FlowCash</span>
          </div>

          {/* Desktop Tab Identifier */}
          <div className="hidden md:block">
            <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
              {activeTab === 'dashboard' && 'แผงควบคุมหลัก'}
              {activeTab === 'history' && 'ประวัติธุรกรรมทั้งหมด'}
              {activeTab === 'settings' && 'การตั้งค่าระบบ'}
            </h2>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-4">
            {/* Unified Quick Search */}
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="ค้นหาด่วน..." 
                value={activeTab === 'history' ? historySearch : dashboardSearch}
                onChange={(e) => {
                  if (activeTab === 'history') {
                    setHistorySearch(e.target.value);
                  } else {
                    setDashboardSearch(e.target.value);
                  }
                }}
                className="pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border-none rounded-full text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:focus:ring-slate-700 transition-all w-52 font-medium"
              />
            </div>

            {/* Notification Alert Bell */}
            <button 
              onClick={() => triggerToast('คุณมีข้อความใหม่: ยินดีต้อนรับสู่ FlowCash!', 'info')}
              className="p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all relative"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* SCREEN CANVAS AREA */}
        <main className="flex-grow p-6 md:p-8 max-w-5xl mx-auto w-full flex flex-col gap-8">
          
          <AnimatePresence mode="wait">
            
            {/* 1. DASHBOARD OVERVIEW SCREEN */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-8"
              >
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h1 className="font-display font-bold text-3xl text-slate-950 dark:text-white tracking-tight">ภาพรวม</h1>
                    <p className="text-sm font-medium text-slate-400 dark:text-slate-400 mt-1">สรุปทางการเงินของคุณในเดือนนี้</p>
                  </div>
                  {/* Action Add Buttons */}
                  <div className="flex gap-3">
                    <button 
                      onClick={() => openAddModal('income')}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white py-2.5 px-5 rounded-xl text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Plus className="w-4 h-4" /> Add Income
                    </button>
                    <button 
                      onClick={() => openAddModal('expense')}
                      className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 text-white py-2.5 px-5 rounded-xl text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Minus className="w-4 h-4" /> Add Expense
                    </button>
                  </div>
                </div>

                {/* Bento Grid: Balance + Cards Stack */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Main Balance Card (Left Column) */}
                  <div className="lg:col-span-2 glass-panel rounded-2xl p-6 dark:bg-[#131b2e] dark:border-slate-800 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                    
                    {/* Visual soft background decorative accent blob */}
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl opacity-60 pointer-events-none" />
                    
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                        ยอดเงินคงเหลือทั้งหมด
                      </span>
                      <button 
                        onClick={() => setIsEditingBalanceInline(!isEditingBalanceInline)}
                        className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-baseline gap-1.5 mb-6 relative z-10">
                      {isEditingBalanceInline ? (
                        <div className="flex items-center gap-2 mt-2 w-full max-w-sm">
                          <span className="text-3xl font-semibold text-slate-800 dark:text-white">{getCurrencySymbol()}</span>
                          <input 
                            type="number"
                            step="0.01"
                            value={inlineBalanceValue}
                            onChange={(e) => setInlineBalanceValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateBalanceInput(inlineBalanceValue);
                              if (e.key === 'Escape') setIsEditingBalanceInline(false);
                            }}
                            className="text-2xl font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 text-slate-900 dark:text-white w-full focus:outline-none focus:ring-1 focus:ring-slate-300"
                            autoFocus
                          />
                          <button 
                            onClick={() => handleUpdateBalanceInput(inlineBalanceValue)}
                            className={`p-2 rounded-lg ${getAccentColorClass('bg')}`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setIsEditingBalanceInline(false)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tighter leading-none">
                            {formatCurrency(currentTotalCalculatedBalance).split('.')[0]}
                          </span>
                          <span className="text-xl font-medium text-slate-400 dark:text-slate-400">
                            .{formatCurrency(currentTotalCalculatedBalance).split('.')[1] || '00'}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 relative z-10">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/40 dark:border-emerald-900/40 px-2.5 py-1 rounded-full text-xs font-semibold">
                        <TrendingUp className="w-3.5 h-3.5" /> +2.4%
                      </span>
                      <span className="text-xs font-medium text-slate-400 dark:text-slate-400">
                        เทียบกับเดือนที่แล้ว
                      </span>
                    </div>
                  </div>

                  {/* Summary Stack (Right Column) */}
                  <div className="flex flex-col gap-4">
                    {/* Total Income Card */}
                    <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                          <Plus className="w-4.5 h-4.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                          Total Income
                        </span>
                      </div>
                      <span className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(stats.income)}
                      </span>
                    </div>

                    {/* Total Expense Card */}
                    <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                          <Minus className="w-4.5 h-4.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                          Total Expense
                        </span>
                      </div>
                      <span className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(stats.expense)}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Recent Transactions List Section */}
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white">
                      รายการล่าสุด
                    </h3>
                    <button 
                      onClick={() => setActiveTab('history')}
                      className={`text-xs font-bold tracking-tight hover:underline flex items-center gap-0.5 ${getAccentColorClass('text')}`}
                    >
                      View All
                    </button>
                  </div>

                  {/* Dashboard Search filter info */}
                  {dashboardSearch.trim() && (
                    <p className="text-xs font-medium text-slate-400 -mt-2">
                      แสดงผลลัพธ์จากคำค้นหา: "{dashboardSearch}"
                    </p>
                  )}

                  {/* Transaction items loop */}
                  <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    {isLoadingData ? (
                      <div className="p-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-emerald-500"></div>
                        กำลังโหลดข้อมูล...
                      </div>
                    ) : dashboardFilteredTransactions.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm">
                        ไม่พบรายการธุรกรรมตามเงื่อนไขที่กำหนด
                      </div>
                    ) : (
                      <div className="flex flex-col divide-y divide-slate-50 dark:divide-slate-800">
                        {dashboardFilteredTransactions.map((tx) => (
                          <div 
                            key={tx.id}
                            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all group"
                          >
                            <div className="flex items-center gap-4">
                              {/* Circle icon */}
                              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm">
                                {getTransactionIcon(tx.category, tx.title)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {tx.title}
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-0.5">
                                  {tx.note || tx.category}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-6">
                              {/* Responsive Date Column */}
                              <div className="text-right hidden sm:block">
                                <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">
                                  {new Date(tx.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>

                              {/* Amount column */}
                              <div className="text-right min-w-[90px]">
                                <p className={`text-sm font-bold ${
                                  tx.type === 'income' 
                                    ? 'text-emerald-600 dark:text-emerald-400' 
                                    : 'text-slate-900 dark:text-white'
                                }}`}>
                                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </p>
                              </div>

                              {/* Action hover tools */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => openEditModal(tx)}
                                  className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                  title="แก้ไขธุรกรรม"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                  title="ลบธุรกรรม"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            )}

            {/* 2. TRANSACTION HISTORY SCREEN */}
            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-6"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display font-bold text-2xl text-slate-950 dark:text-white tracking-tight">ประวัติธุรกรรม</h1>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 mt-1">รายละเอียดและประวัติรายการทางการเงินของคุณ</p>
                  </div>
                </div>

                {/* Filters & Control Toolbar Panel */}
                <section className="bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    
                    {/* Month Select Filter */}
                    <div className="relative w-full sm:w-44">
                      <select 
                        value={historyMonthFilter}
                        onChange={(e) => setHistoryMonthFilter(e.target.value)}
                        className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2.5 pl-4 pr-10 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-700 cursor-pointer outline-none"
                      >
                        <option value="ทั้งหมด">ทั้งหมดทุกช่วงเวลา</option>
                        <option value="ตุลาคม 2023">ตุลาคม 2023</option>
                        <option value="กันยายน 2023">กันยายน 2023</option>
                        <option value="สิงหาคม 2023">สิงหาคม 2023</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Category Select Filter */}
                    <div className="relative w-full sm:w-44">
                      <select 
                        value={historyCategoryFilter}
                        onChange={(e) => setHistoryCategoryFilter(e.target.value)}
                        className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2.5 pl-4 pr-10 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-700 cursor-pointer outline-none"
                      >
                        <option value="ทุกหมวดหมู่">ทุกหมวดหมู่</option>
                        {CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.label}>{cat.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    
                    {/* CSV Export Button */}
                    <button 
                      onClick={handleExportCSV}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all"
                    >
                      <Download className="w-4 h-4" /> ส่งออก
                    </button>

                    {/* Reset Filters Shortcut */}
                    {(historySearch || historyMonthFilter !== 'ทั้งหมด' || historyCategoryFilter !== 'ทุกหมวดหมู่') && (
                      <button 
                        onClick={() => {
                          setHistorySearch('');
                          setHistoryMonthFilter('ทั้งหมด');
                          setHistoryCategoryFilter('ทุกหมวดหมู่');
                        }}
                        className="p-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all"
                        title="ล้างตัวกรอง"
                      >
                        ล้างตัวกรอง
                      </button>
                    )}
                  </div>
                </section>

                {/* Main transactions List sorted and grouped by Date */}
                <div className="flex flex-col gap-6">
                  {isLoadingData ? (
                    <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-12 border border-slate-100 dark:border-slate-800 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-emerald-500"></div>
                      กำลังโหลดข้อมูลประวัติธุรกรรม...
                    </div>
                  ) : Object.keys(groupedHistoryTransactions).length === 0 ? (
                    <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-12 border border-slate-100 dark:border-slate-800 text-center text-slate-400 text-sm">
                      ไม่พบรายการประวัติธุรกรรมที่ตรงกับเงื่อนไขการค้นหาและตัวกรองของคุณ
                    </div>
                  ) : (
                    Object.keys(groupedHistoryTransactions).map(dateGroup => (
                      <div key={dateGroup} className="flex flex-col gap-3">
                        {/* Group Header Label */}
                        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest pl-1">
                          {dateGroup}
                        </h3>

                        {/* List elements in this group */}
                        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                          <div className="flex flex-col divide-y divide-slate-50 dark:divide-slate-800">
                            {groupedHistoryTransactions[dateGroup].map(tx => (
                              <div 
                                key={tx.id}
                                className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all cursor-pointer group"
                                onClick={() => openEditModal(tx)}
                              >
                                <div className="flex items-center gap-4">
                                  {/* Icon circle */}
                                  <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm">
                                    {getTransactionIcon(tx.category, tx.title)}
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {tx.title}
                                    </div>
                                    <div className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-1">
                                      {tx.category} • {tx.time} น.
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-6" onClick={(e) => e.stopPropagation()}>
                                  {/* Right values column */}
                                  <div className="text-right">
                                    <div className={`text-sm font-bold ${
                                      tx.type === 'income' 
                                        ? 'text-emerald-600 dark:text-emerald-400' 
                                        : 'text-slate-900 dark:text-white'
                                    }`}>
                                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </div>
                                    {/* Success badge for income status */}
                                    {tx.type === 'income' && (
                                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${getAccentColorClass('badge')}`}>
                                        สำเร็จ
                                      </div>
                                    )}
                                  </div>

                                  {/* Hover tools edit and delete buttons */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => openEditModal(tx)}
                                      className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                      title="แก้ไขธุรกรรม"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteTransaction(tx.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                                      title="ลบธุรกรรม"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    ))
                  )}
                </div>

              </motion.div>
            )}

            {/* 3. SETTINGS PAGE */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-6"
              >
                {/* Header */}
                <div>
                  <h1 className="font-display font-bold text-2xl text-slate-950 dark:text-white tracking-tight">การตั้งค่า</h1>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 mt-1">จัดการข้อมูลบัญชีและโครงสร้างแอปพลิเคชันของคุณ</p>
                </div>

                <div className="flex flex-col gap-6">
                  
                  {/* General Configuration Card */}
                  <section className="bg-white dark:bg-[#131b2e] rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-50 dark:border-slate-800 flex items-center gap-2">
                      <SlidersHorizontal className={`w-5 h-5 ${getAccentColorClass('text')}`} /> ทั่วไป
                    </h2>
                    
                    <div className="flex flex-col gap-6">
                      
                      {/* Currency selection */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">สกุลเงินหลัก</label>
                          <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">เลือกสกุลเงินเริ่มต้นสำหรับหน้าหลักและประวัติธุรกรรมทั้งหมด</p>
                        </div>
                        <div className="relative w-full sm:w-48">
                          <select 
                            value={settings.currency}
                            onChange={(e) => {
                              const code = e.target.value as CurrencyCode;
                              handleUpdateProfileSetting({ currency: code });
                              triggerToast(`เปลี่ยนสกุลเงินหลักเป็น ${CURRENCY_CONFIGS[code]?.label || code}`);
                            }}
                            className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:bg-white rounded-xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 cursor-pointer"
                          >
                            {Object.values(CURRENCY_CONFIGS).map(curr => (
                              <option key={curr.code} value={curr.code}>{curr.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <hr className="border-slate-50 dark:border-slate-800" />

                      {/* Manual starting balance adjustment */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">ปรับแก้ส่วนต่างยอดคงเหลือ</label>
                          <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">
                            แก้ไขตัวเลขยอดคงเหลือรวมของคุณโดยตรง ตัวช่วยนี้จะคำนวณฐานงบเริ่มต้นใหม่เพื่อรักษาประวัติรายการทั้งหมด
                          </p>
                        </div>
                        <div className="w-full sm:w-auto flex items-center gap-2">
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                              {getCurrencySymbol()}
                            </span>
                            <input 
                              type="number"
                              step="0.01"
                              value={settingsBalanceInput}
                              onChange={(e) => setSettingsBalanceInput(e.target.value)}
                              className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:bg-white rounded-xl pl-8 pr-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 w-full sm:w-44 focus:outline-none focus:ring-1 focus:ring-slate-300 text-right"
                            />
                          </div>
                          <button 
                            disabled={isMutating}
                            onClick={() => handleUpdateBalanceInput(settingsBalanceInput)}
                            className={`px-4 py-3 rounded-xl text-xs font-semibold transition-all shadow-sm ${getAccentColorClass('bg')} disabled:opacity-50`}
                          >
                            อัปเดต
                          </button>
                        </div>
                      </div>

                    </div>
                  </section>

                  {/* Aesthetic Theme Configuration Card */}
                  <section className="bg-white dark:bg-[#131b2e] rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-50 dark:border-slate-800 flex items-center gap-2">
                      <Palette className={`w-5 h-5 ${getAccentColorClass('text')}`} /> รูปแบบและการแสดงผล
                    </h2>

                    <div className="flex flex-col gap-6">
                      
                      {/* Dark Mode toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">โหมดกลางคืน (Dark Mode)</label>
                          <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">สลับการตั้งค่าระบบระหว่างสว่างและมืด เพื่อรักษาสุขภาพสายตาของคุณ</p>
                        </div>

                        {/* Switch Toggle style element */}
                        <button 
                          onClick={() => {
                            const newMode = !settings.darkMode;
                            handleUpdateProfileSetting({ darkMode: newMode });
                            triggerToast(`สลับใช้งานโหมด ${newMode ? 'กลางคืน' : 'กลางวัน'} สำเร็จ`);
                          }}
                          className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative flex items-center ${
                            settings.darkMode ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        >
                          <motion.div 
                            layout
                            className="w-5 h-5 bg-white rounded-full shadow-sm"
                            animate={{ x: settings.darkMode ? 20 : 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        </button>
                      </div>

                      <hr className="border-slate-50 dark:border-slate-800" />

                      {/* Accent highlight color switcher */}
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">สีโทนหลักแอปพลิเคชัน (Accent Color)</label>
                        <p className="text-xs text-slate-400 dark:text-slate-400">เลือกสีเพื่อเปลี่ยนความรู้สึกและดีไซน์โดยรวมของปุ่มกดและหมวดหมู่เด่นในหน้าจอ</p>
                        
                        <div className="flex gap-4 mt-2">
                          
                          {/* Emerald Accent */}
                          <button 
                            onClick={() => {
                              handleUpdateProfileSetting({ accentColor: 'emerald' });
                              triggerToast('เปลี่ยนสีโทนหลักแอปพลิเคชันเป็น สีเขียวมรกต');
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
                              settings.accentColor === 'emerald' 
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300' 
                                : 'bg-white border-slate-200 text-slate-600 dark:bg-[#131b2e] dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className="w-3 h-3 rounded-full bg-emerald-600" />
                            <span>เขียวมรกต (Emerald)</span>
                          </button>

                          {/* Tech Blue Accent */}
                          <button 
                            onClick={() => {
                              handleUpdateProfileSetting({ accentColor: 'blue' });
                              triggerToast('เปลี่ยนสีโทนหลักแอปพลิเคชันเป็น สีฟ้าน้ำทะเล');
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
                              settings.accentColor === 'blue' 
                                ? 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300' 
                                : 'bg-white border-slate-200 text-slate-600 dark:bg-[#131b2e] dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className="w-3 h-3 rounded-full bg-blue-600" />
                            <span>น้ำเงินคราม (Tech Blue)</span>
                          </button>

                          {/* Minimalist Black Accent */}
                          <button 
                            onClick={() => {
                              handleUpdateProfileSetting({ accentColor: 'black' });
                              triggerToast('เปลี่ยนสีโทนหลักแอปพลิเคชันเป็น สีดำสเลท');
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
                              settings.accentColor === 'black' 
                                ? 'bg-slate-100 border-slate-400 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-white' 
                                : 'bg-white border-slate-200 text-slate-600 dark:bg-[#131b2e] dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className="w-3 h-3 rounded-full bg-slate-900 dark:bg-slate-200" />
                            <span>มินิมอล (Carbon Black)</span>
                          </button>

                        </div>
                      </div>

                    </div>
                  </section>

                  {/* Danger resetting Section Card */}
                  <section className="border border-rose-200/60 dark:border-rose-950/40 bg-rose-50/20 dark:bg-rose-950/5 p-6 rounded-2xl flex flex-col gap-4">
                    <h3 className="font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" /> ส่วนอันตราย
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      ลบการตั้งค่า ข้อมูล และธุรกรรมที่จัดเก็บอยู่ทั้งหมด เพื่อรีเซ็ตกลับเป็นข้อมูลตัวอย่างเริ่มต้น
                    </p>
                    <div>
                      <button 
                        onClick={() => setIsResetConfirmOpen(true)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition-all shadow-sm"
                      >
                        ลบและรีเซ็ตบัญชี
                      </button>
                    </div>
                  </section>

                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </main>
      </div>

      {/* 4. TRANSACTION EDITOR MODAL DIALOG */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Dark fuzzy overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Modal Body Card */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-[#131b2e] rounded-2xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] w-full max-w-lg border border-slate-100 dark:border-slate-800 z-10 overflow-hidden flex flex-col"
            >
              
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                <h3 className="font-display font-bold text-lg text-slate-950 dark:text-white">
                  {modalMode === 'add' ? 'เพิ่มรายการใหม่' : 'แก้ไขข้อมูลธุรกรรม'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Input fields */}
              <form onSubmit={handleSaveTransaction} className="p-6 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
                
                {/* Transaction Type Toggle */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest pl-1">ประเภทธุรกรรม</span>
                  <div className="flex p-1 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <button 
                      type="button"
                      onClick={() => {
                        setModalType('expense');
                        if (modalMode === 'add') setModalCategory('อาหารและเครื่องดื่ม');
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        modalType === 'expense' 
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800' 
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      รายจ่าย (Expense)
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setModalType('income');
                        if (modalMode === 'add') setModalCategory('รายรับ');
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        modalType === 'income' 
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800' 
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      รายรับ (Income)
                    </button>
                  </div>
                </div>

                {/* Amount input */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest pl-1" htmlFor="amount">
                    จำนวนเงิน
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">
                      {getCurrencySymbol()}
                    </span>
                    <input 
                      id="amount"
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={modalAmount}
                      onChange={(e) => setModalAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800 focus:bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors"
                    />
                  </div>
                </div>

                {/* Double column elements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Category dropdown selection */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest pl-1" htmlFor="category">
                      หมวดหมู่
                    </label>
                    <div className="relative">
                      <select 
                        id="category"
                        value={modalCategory}
                        onChange={(e) => setModalCategory(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 focus:bg-white"
                      >
                        {modalType === 'income' ? (
                          <>
                            <option value="รายรับ">รายรับปกติ</option>
                            <option value="เงินฝากรายเดือน">เงินเดือน / เงินฝากประจำ</option>
                            <option value="โบนัส">โบนัสและเงินรางวัล</option>
                            <option value="อื่นๆ">อื่นๆ</option>
                          </>
                        ) : (
                          <>
                            <option value="อาหารและเครื่องดื่ม">อาหารและเครื่องดื่ม</option>
                            <option value="การเดินทาง">การเดินทาง</option>
                            <option value="ของกินของใช้">ของกินของใช้</option>
                            <option value="ช้อปปิ้ง">ช้อปปิ้ง</option>
                            <option value="สาธารณูปโภค">สาธารณูปโภค</option>
                            <option value="ความบันเทิง">ความบันเทิง</option>
                            <option value="โอนเงิน">โอนเงินออก</option>
                            <option value="อื่นๆ">อื่นๆ</option>
                          </>
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Date picker */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest pl-1" htmlFor="date">
                      วันที่ทำรายการ
                    </label>
                    <input 
                      id="date"
                      type="date"
                      required
                      value={modalDate}
                      onChange={(e) => setModalDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 focus:bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors [color-scheme:light]"
                    />
                  </div>

                </div>

                {/* Headline input */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest pl-1" htmlFor="title">
                    ชื่อหัวข้อ / สถานที่ (เช่น โฮลฟู้ดส์ มาร์เก็ต)
                  </label>
                  <input 
                    id="title"
                    type="text"
                    required
                    placeholder="ระบุหัวข้อทำรายการ..."
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 focus:bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors"
                  />
                </div>

                {/* Additional notes area */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest pl-1" htmlFor="note">
                    บันทึกย่อเพิ่มเติม (เลือกระบุได้)
                  </label>
                  <textarea 
                    id="note"
                    rows={2}
                    placeholder="เขียนรายละเอียดบันทึกความจำสั้น..."
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 focus:bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors resize-none"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="button"
                    disabled={isMutating}
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors focus:outline-none"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit"
                    disabled={isMutating}
                    className={`px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 ${getAccentColorClass('bg')} disabled:opacity-50`}
                  >
                    {isMutating ? 'กำลังบันทึก...' : 'บันทึกข้อมูลธุรกรรม'}
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. DANGER ZONE RESET CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResetConfirmOpen(false)}
              className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-[#131b2e] rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 dark:border-slate-800 p-6 z-10 flex flex-col gap-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200/40">
                <AlertTriangle className="w-6 h-6" />
              </div>
              
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                  ยืนยันลบข้อมูลและตั้งค่าใหม่?
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-2 font-medium leading-relaxed">
                  การดำเนินการนี้จะลบรายการธุรกรรมที่กำหนดเองทั้งหมด และย้อนประวัติกลับคืนสู่ค่าเริ่มต้นเดิมจากระบบ ไม่สามารถกู้คืนได้ภายหลัง
                </p>
              </div>

              <div className="flex gap-3 justify-center mt-3">
                <button 
                  disabled={isMutating}
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button 
                  disabled={isMutating}
                  onClick={handleResetData}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  {isMutating ? 'กำลังดำเนินการ...' : 'ใช่, ลบทั้งหมดและตั้งค่าใหม่'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
