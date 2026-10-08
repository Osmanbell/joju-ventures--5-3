/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  ShoppingCart, Users, Package, BarChart2, RefreshCw, 
  Clock, AlertCircle, ShoppingBag, Bluetooth, Check, RefreshCcw, Lock, LogIn, LogOut, KeyRound, ShieldAlert,
  FileSpreadsheet, Printer, Database, Flame, CheckCircle2, ShieldCheck, X, Eye, EyeOff, Bell
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, Customer, Sale, Attendant, SaleNotification } from "./types";
import PrinterModal from "./components/PrinterModal";
import { NotificationBanner, NotificationCenterModal } from "./components/NotificationCenter";
import { 
  getStoredPrinterConfig, isBluetoothPrinterConnected, 
  getConnectedBluetoothDeviceName, setBluetoothDisconnectListener 
} from "./utils/printerService";
import { 
  seedFirestoreIfEmpty,
  subscribeToProducts,
  subscribeToCustomers,
  subscribeToSales,
  subscribeToAttendants,
  subscribeToStoreSettings
} from "./services/firestoreService";

// Import custom screens
import POS from "./components/POS";
import Customers from "./components/Customers";
import Inventory from "./components/Inventory";
import Analytics from "./components/Analytics";
import Attendants from "./components/Attendants";
import AttendantStats from "./components/AttendantStats";

export default function App() {
  const [activeTab, setActiveTab] = useState<'pos' | 'customers' | 'inventory' | 'analytics' | 'attendants' | 'reports'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [managerPassword, setManagerPassword] = useState<string>("1234");
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Role scoping states
  const [userRole, setUserRole] = useState<'manager' | 'attendant'>('manager');
  const [activeAttendant, setActiveAttendant] = useState<string>("Fatima Abubakar");

  // Real-time sale notification states
  const [notifications, setNotifications] = useState<SaleNotification[]>(() => {
    try {
      const saved = localStorage.getItem('joju_sales_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeBannerNotification, setActiveBannerNotification] = useState<SaleNotification | null>(null);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const isInitialSalesLoadRef = useRef(true);
  const bannerTimeoutRef = useRef<any>(null);

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      try { localStorage.setItem('joju_sales_notifications', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    try { localStorage.removeItem('joju_sales_notifications'); } catch {}
  };

  // Lock and credentials states
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [loginRole, setLoginRole] = useState<'manager' | 'attendant'>('manager');
  const [loginSelectedAttendantId, setLoginSelectedAttendantId] = useState<string>("");
  const [pinInput, setPinInput] = useState<string>("");
  const [showLoginPass, setShowLoginPass] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");

  const handleRoleChange = (role: 'manager' | 'attendant') => {
    setUserRole(role);
    if (role === 'attendant') {
      if (activeTab === 'inventory' || activeTab === 'analytics' || activeTab === 'attendants') {
        setActiveTab('pos');
      }
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (loginRole === 'manager') {
      const validPass = managerPassword || '1234';
      if (pinInput.trim() === validPass.trim()) { 
        setUserRole('manager');
        setActiveAttendant("Store Manager");
        setIsLocked(false);
        setPinInput("");
        setActiveTab('pos');
      } else {
        setLoginError("Invalid Manager Access Password. Please check your credentials.");
      }
    } else {
      if (!loginSelectedAttendantId) {
        setLoginError("Please choose your cashier name.");
        return;
      }
      const att = attendants.find(a => a.id === loginSelectedAttendantId);
      if (!att) {
        setLoginError("Please choose a valid attendant profile.");
        return;
      }
      if (pinInput.trim() === (att.password || '').trim()) {
        const effectiveRole = att.role === 'manager' ? 'manager' : 'attendant';
        setUserRole(effectiveRole);
        setActiveAttendant(att.name);
        setIsLocked(false);
        setActiveTab('pos');
        setPinInput("");
      } else {
        setLoginError(`Incorrect passcode for ${att.name}.`);
      }
    }
  };

  // Shared bluetooth printer state
  const initialPrinterCfg = getStoredPrinterConfig();
  const [printer, setPrinter] = useState<{ name: string; connected: boolean; deviceType: string }>(() => {
    const isBt = isBluetoothPrinterConnected();
    const btName = getConnectedBluetoothDeviceName();
    if (isBt && btName) {
      return { name: btName, connected: true, deviceType: initialPrinterCfg.paperWidth };
    }
    return {
      name: "No Printer Connected",
      connected: false,
      deviceType: initialPrinterCfg.paperWidth
    };
  });
  const [isPrinterHubOpen, setIsPrinterHubOpen] = useState(false);

  useEffect(() => {
    setBluetoothDisconnectListener(() => {
      setPrinter({
        name: "No Printer Connected",
        connected: false,
        deviceType: initialPrinterCfg.paperWidth
      });
    });
  }, [initialPrinterCfg.paperWidth]);

  // Fetch all state from full-stack backend safely
  const refreshData = async () => {
    try {
      const [pRes, cRes, sRes, aRes] = await Promise.all([
        fetch("/api/products").catch(() => null),
        fetch("/api/customers").catch(() => null),
        fetch("/api/sales").catch(() => null),
        fetch("/api/attendants").catch(() => null)
      ]);

      if (pRes?.ok && cRes?.ok && sRes?.ok && aRes?.ok) {
        const isJson = (res: Response) => res.headers.get("content-type")?.includes("application/json");
        if (isJson(pRes) && isJson(cRes) && isJson(sRes) && isJson(aRes)) {
          const [pData, cData, sData, aData] = await Promise.all([
            pRes.json().catch(() => null),
            cRes.json().catch(() => null),
            sRes.json().catch(() => null),
            aRes.json().catch(() => null)
          ]);
          if (Array.isArray(pData) && Array.isArray(cData) && Array.isArray(sData) && Array.isArray(aData)) {
            setProducts(pData);
            setCustomers(cData);
            setSales(sData);
            setAttendants(aData);
            
            if (aData.length > 0) {
              setLoginSelectedAttendantId(prev => prev || aData[0].id);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Backend API sync skipped, relying on Firestore live streams:", err);
    } finally {
      setLoading(false);
    }
  };

  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  useEffect(() => {
    // Seed initial catalog to Firestore if empty
    seedFirestoreIfEmpty();

    // Subscribe to real-time live data streams from Firebase Firestore
    const unsubProds = subscribeToProducts(
      (data) => {
        if (data && data.length > 0) {
          setProducts(data);
        }
        setLoading(false);
      },
      (err) => console.warn("Firestore products stream:", err)
    );

    const unsubCusts = subscribeToCustomers(
      (data) => setCustomers(data),
      (err) => console.warn("Firestore customers stream:", err)
    );

    const unsubSales = subscribeToSales(
      (data) => {
        if (!data) return;
        if (isInitialSalesLoadRef.current) {
          isInitialSalesLoadRef.current = false;
          setSales(data);
          return;
        }

        setSales((prevSales) => {
          const existingIds = new Set(prevSales.map(s => s.id));
          const newSales = data.filter(s => !existingIds.has(s.id));

          if (newSales.length > 0) {
            const createdNotifs: SaleNotification[] = newSales.map(s => ({
              id: `notif-${s.id}-${Date.now()}`,
              saleId: s.id,
              receiptNo: s.receiptNo,
              cashier: s.cashier || "Cashier Staff",
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              date: s.date || new Date().toISOString().split('T')[0],
              items: s.items || [],
              totalAmount: s.totalAmount,
              netAmount: s.netAmount,
              paymentMethod: s.paymentMethod,
              customerName: s.customerId ? customers.find(c => c.id === s.customerId)?.name : undefined,
              timestamp: Date.now(),
              read: false
            }));

            setNotifications(prev => {
              const updated = [...createdNotifs, ...prev].slice(0, 100);
              try { localStorage.setItem('joju_sales_notifications', JSON.stringify(updated)); } catch {}
              return updated;
            });

            // Trigger 5-second popup banner for store manager
            const latestSaleNotif = createdNotifs[0];
            setActiveBannerNotification(latestSaleNotif);

            if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
            bannerTimeoutRef.current = setTimeout(() => {
              setActiveBannerNotification(null);
            }, 5000);
          }

          return data;
        });
      },
      (err) => console.warn("Firestore sales stream:", err)
    );

    const unsubAtts = subscribeToAttendants(
      (data) => {
        if (data && data.length > 0) {
          setAttendants(data);
          setLoginSelectedAttendantId((prev) => prev || data[0].id);
        }
      },
      (err) => console.warn("Firestore attendants stream:", err)
    );

    const unsubSettings = subscribeToStoreSettings(
      (data) => {
        if (data && data.managerPassword) {
          setManagerPassword(data.managerPassword);
        }
      },
      (err) => console.warn("Firestore settings stream:", err)
    );

    // Initial backend refresh
    refreshData();

    // Start active clock interval
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(clock);
      unsubProds();
      unsubCusts();
      unsubSales();
      unsubAtts();
      unsubSettings();
    };
  }, []);

  // Compute stats for indicators
  const lowStockProductsCount = products.filter(p => p.stockQuantity <= p.minStockLevel).length;

  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 font-sans select-none">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-white text-xl mx-auto shadow-lg shadow-blue-500/10">
              JV
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-none pt-1 font-display">
              Joju Ventures
            </h1>
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono font-bold leading-none">
              Shift Login Gate
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="bg-rose-950/40 border border-rose-900 text-rose-300 p-3 rounded-xl text-[11px] font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="bg-slate-950 border border-slate-800 p-1 rounded-xl grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => { setLoginRole('manager'); setLoginError(""); }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${loginRole === 'manager' ? 'bg-blue-600 text-white font-extrabold shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Store Manager
              </button>
              <button
                type="button"
                onClick={() => { setLoginRole('attendant'); setLoginError(""); }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${loginRole === 'attendant' ? 'bg-blue-600 text-white font-extrabold shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Staff Cashier
              </button>
            </div>

            {loginRole === 'attendant' && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Choose Cashier Profile</label>
                <select
                  value={loginSelectedAttendantId}
                  onChange={(e) => { setLoginSelectedAttendantId(e.target.value); setLoginError(""); }}
                  className="w-full bg-slate-950 text-slate-200 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                >
                  <option value="">-- Choose your name --</option>
                  {attendants.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.role === 'manager' ? '👑 (Store Manager - Full Access)' : '(Cashier)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                {loginRole === 'manager' ? 'Manager Password *' : 'Shift Access Passcode *'}
              </label>
              <div className="relative flex items-center">
                <input
                  type={showLoginPass ? "text" : "password"}
                  required
                  placeholder={loginRole === 'manager' ? "Enter manager password" : "Enter cashier passcode"}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 border border-slate-850 rounded-xl px-4 py-2.5 pr-20 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPass(!showLoginPass)}
                  className="absolute right-3 text-slate-400 hover:text-white p-1 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {showLoginPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span className="text-[10px] font-bold">{showLoginPass ? "Hide" : "Show"}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-97 cursor-pointer block text-center"
            >
              Verify & Unlock Terminal
            </button>
          </form>

          <p className="text-[9px] text-slate-500 text-center leading-normal">
            For registration shift accounts or password assistance, contact the principal store manager.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-slate-800 overflow-x-hidden">
      
      {/* SIDEBAR NAVIGATION - DESKTOP */}
      <aside className="w-64 bg-[#0F172A] text-slate-350 flex flex-col shrink-0 hidden md:flex border-r border-slate-900 shadow-xl">
        <div className="p-6 flex items-center gap-3 pb-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-md shadow-blue-500/20 text-sm">
            JV
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight leading-tight">
              Joju Ventures
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase font-bold">
              Operations Hub
            </p>
          </div>
        </div>

        {/* Dynamic Perspective Switcher Panel (Secure Display Only) */}
        <div className="px-5 pb-5">
          <div className="bg-slate-900 border border-slate-850 rounded-xl p-3 flex flex-col gap-1.5 font-sans">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
              Shift Terminal Status
            </span>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-blue-900/40 flex items-center justify-center text-[10px] text-blue-400 font-extrabold border border-blue-500/10 shrink-0">
                {userRole === 'manager' ? 'MG' : 'AT'}
              </div>
              <div className="truncate flex-1">
                <p className="text-[11px] font-extrabold text-white leading-none mb-1 capitalize truncate">
                  {userRole === 'manager' ? 'Admin Manager' : activeAttendant}
                </p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider leading-none">
                    SECURE ACTIVE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Tabs */}
        <nav className="flex-1 px-4 py-2 space-y-1">
          <button
            onClick={() => setActiveTab('pos')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all font-semibold text-xs text-left leading-none ${
              activeTab === 'pos' 
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/10 font-bold' 
                : 'hover:bg-slate-800/80 text-slate-300'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Sales & POS Terminal</span>
          </button>

          {userRole === 'manager' && (
            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all font-semibold text-xs text-left leading-none ${
                activeTab === 'inventory' 
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/10 font-bold' 
                  : 'hover:bg-slate-800/80 text-slate-300'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Inventory Management</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('customers')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all font-semibold text-xs text-left leading-none ${
              activeTab === 'customers' 
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/10 font-bold' 
                : 'hover:bg-slate-800/80 text-slate-300'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Customer Database</span>
          </button>

          {userRole === 'manager' && (
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all font-semibold text-xs text-left leading-none ${
                activeTab === 'analytics' 
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/10 font-bold' 
                  : 'hover:bg-slate-800/80 text-slate-300'
              }`}
            >
              <BarChart2 className="h-4 w-4" />
              <span>Financial Audits (P&L)</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all font-semibold text-xs text-left leading-none ${
              activeTab === 'reports' 
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/10 font-bold' 
                : 'hover:bg-slate-800/80 text-slate-300'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{userRole === 'manager' ? "Cashiers Shift Reports" : "My Shift Reports"}</span>
          </button>

          {userRole === 'manager' && (
            <button
              onClick={() => setActiveTab('attendants')}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all font-semibold text-xs text-left leading-none ${
                activeTab === 'attendants' 
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/10 font-bold' 
                  : 'hover:bg-slate-800/80 text-slate-300'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Staff Accounts</span>
            </button>
          )}
        </nav>

        {/* Active Cashier Card & Log Out */}
        <div className="p-3.5 mx-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-2 mb-3.5 font-sans">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase shrink-0">
              {userRole === 'manager' ? 'MG' : activeAttendant.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="truncate min-w-0 flex-1">
              <p className="text-[11px] font-bold text-white truncate leading-none mb-1">
                {userRole === 'manager' ? 'Store Manager' : activeAttendant}
              </p>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none">
                {userRole === 'manager' ? 'Admin Level' : 'Attendant'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setIsLocked(true);
              setPinInput("");
              setLoginError("");
            }}
            id="btn-sidebar-logout"
            className="w-full py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950/60 text-slate-400 hover:text-slate-105 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-97"
          >
            <Lock className="h-3 w-3" /> Lock & Log Out
          </button>
        </div>

        {/* Dynamic Printer Connectivity inside Sidebar Footer */}
        <div 
          onClick={() => setIsPrinterHubOpen(true)}
          className="p-4 border-t border-slate-800 bg-slate-950/40 hover:bg-slate-900/60 transition-colors cursor-pointer group"
          title="Click to manage Bluetooth Thermal Printer Hub"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${printer.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-blue-400 transition-colors">
                {printer.connected ? "Thermal Hub Ready" : "Printer Offline"}
              </span>
            </div>
            <span className="text-[9px] text-blue-400 group-hover:underline font-bold">Configure</span>
          </div>
          <p className="bg-slate-900 rounded p-2 text-[9px] text-slate-400 font-mono leading-tight truncate border border-slate-800">
            {printer.name}
          </p>
        </div>
      </aside>

      {/* MOBILE TOP NAVIGATION BAR */}
      <div className="md:hidden bg-[#0F172A] text-white py-3 px-4 flex flex-col gap-2 border-b border-slate-900 font-sans">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-xs">
              JV
            </div>
            <span className="text-sm font-bold text-white tracking-tight">Joju Ventures</span>
          </div>
          <div className="flex items-center gap-1.5">
            {userRole === 'manager' && (
              <button
                type="button"
                onClick={() => setIsNotificationCenterOpen(true)}
                className="relative bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 outline-none flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                title="Real-Time Sales Alerts"
              >
                <Bell className="h-3.5 w-3.5 text-blue-400" />
                <span>Alerts</span>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="bg-rose-500 text-white font-mono font-black text-[9px] px-1 rounded-full">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setIsPrinterHubOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-blue-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 active:scale-95 transition-all"
              title="Thermal Printer Hub"
            >
              <Printer className="h-3 w-3" />
              <span>Printer</span>
            </button>
            <button
              onClick={() => {
                setIsLocked(true);
                setPinInput("");
                setLoginError("");
              }}
              className="bg-slate-800 text-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 outline-none flex items-center gap-1 active:scale-95"
            >
              <Lock className="h-3 w-3 text-rose-450" />
              <span>Lock</span>
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 text-xs">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 flex items-center gap-1 transition-all ${
              activeTab === 'pos' ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-800/50'
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" /> POS
          </button>
          {userRole === 'manager' && (
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 flex items-center gap-1 transition-all ${
                activeTab === 'inventory' ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-800/50'
              }`}
            >
              <Package className="h-3.5 w-3.5" /> Inventory
            </button>
          )}
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 flex items-center gap-1 transition-all ${
              activeTab === 'customers' ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-800/50'
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Customers
          </button>
          {userRole === 'manager' && (
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 flex items-center gap-1 transition-all ${
                activeTab === 'analytics' ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-800/50'
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" /> Audits
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 flex items-center gap-1 transition-all ${
              activeTab === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-800/50'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Reports
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER PANELS */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        
        {/* TOP COMPACT HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 font-display tracking-tight leading-none">
              {activeTab === 'pos' && "Central Sales Terminal"}
              {activeTab === 'customers' && "Customer Loyalty & Invoicing"}
              {activeTab === 'inventory' && "Storage Stocks Coordinator"}
              {activeTab === 'analytics' && "Accounting Audits & P&L Statements"}
              {activeTab === 'attendants' && "Staff Attendants Accounts Registry"}
              {activeTab === 'reports' && "Shift Accounts Reports Ledger"}
            </h2>
            {userRole === 'manager' ? (
              <span className="hidden sm:inline-block bg-blue-50 text-blue-600 border border-blue-100 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider">
                ADMIN ACCESS
              </span>
            ) : (
              <span className="hidden sm:inline-block bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] px-2.5 py-0.5 rounded font-black uppercase tracking-widest font-mono font-bold">
                CASHIER: {activeAttendant.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
            {userRole === 'manager' && (
              <button 
                type="button"
                onClick={() => setIsNotificationCenterOpen(true)}
                className="relative p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
                title="Real-Time Staff Sales Alerts"
              >
                <Bell className="h-4 w-4 text-slate-600 hover:text-blue-600" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-mono font-black text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center animate-pulse">
                    {notifications.filter(n => !n.read).length > 9 ? '9+' : notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
            )}

            {lowStockProductsCount > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-800 px-3 py-1 rounded-xl text-[11px] font-bold">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                <span>{lowStockProductsCount} Refills Alert</span>
              </div>
            )}
            <div className="bg-slate-100 border border-slate-150 px-3 py-1 rounded-xl flex items-center gap-2 text-slate-600 font-mono text-[10px]">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}</span>
            </div>
            
            <button 
              onClick={() => { setLoading(true); refreshData(); }}
              className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg transition-all active:scale-95 flex items-center justify-center"
              title="Refresh local cache"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* CONTAINER FOR ACTIVE VIEWS */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          {loading && products.length === 0 ? (
            <div className="py-28 text-center space-y-4">
              <RefreshCw className="h-10 w-10 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs font-black text-slate-400 font-mono uppercase tracking-widest">
                Contacting Coldroom database clusters...
              </p>
            </div>
          ) : (
            <div className="flex-1">
              <AnimatePresence mode="wait">
                {activeTab === 'pos' && (
                  <motion.div
                    key="pos"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <POS 
                      products={products} 
                      customers={customers} 
                      refreshData={refreshData}
                      printer={printer}
                      setPrinter={setPrinter}
                      userRole={userRole}
                      activeAttendant={activeAttendant}
                    />
                  </motion.div>
                )}

                {activeTab === 'customers' && (
                  <motion.div
                    key="customers"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Customers 
                      customers={customers} 
                      sales={sales} 
                      refreshData={refreshData} 
                    />
                  </motion.div>
                )}

                {activeTab === 'inventory' && (
                  <motion.div
                    key="inventory"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Inventory 
                      products={products} 
                      refreshData={refreshData} 
                    />
                  </motion.div>
                )}

                {activeTab === 'analytics' && (
                  <motion.div
                    key="analytics"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Analytics 
                      sales={sales} 
                      products={products} 
                    />
                  </motion.div>
                )}

                {activeTab === 'attendants' && userRole === 'manager' && (
                  <motion.div
                    key="attendants"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Attendants 
                      attendants={attendants} 
                      refreshData={refreshData} 
                    />
                  </motion.div>
                )}

                {activeTab === 'reports' && (
                  <motion.div
                    key="reports"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <AttendantStats 
                      sales={sales}
                      attendants={attendants}
                      products={products}
                      currentCashierName={userRole === 'manager' ? "All Attendants" : activeAttendant}
                      isManager={userRole === 'manager'}
                      onRefresh={refreshData}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </main>

        {/* BOTTOM METADATA RAIL */}
        <footer className="bg-white border-t border-slate-150 py-3.5 px-6 text-center text-[10px] text-slate-450 font-medium font-sans">
          Joju Ventures Ltd Operations Dashboard • Secure Local & Cloud Firestore Authenticated.
        </footer>
      </div>

      {/* GLOBAL THERMAL PRINTER MODAL */}
      <PrinterModal 
        isOpen={isPrinterHubOpen} 
        onClose={() => setIsPrinterHubOpen(false)} 
        onPrinterConnected={(name) => {
          setPrinter({
            name: `${name || "Thermal Printer"} (${printer.deviceType || "58mm"})`,
            connected: !!name,
            deviceType: printer.deviceType || "58mm"
          });
        }}
      />

      {/* REAL-TIME 5-SECOND SALE PROMPT BANNER (STORE MANAGER ONLY) */}
      {userRole === 'manager' && (
        <NotificationBanner
          notification={activeBannerNotification}
          onClose={() => setActiveBannerNotification(null)}
          onOpenCenter={() => setIsNotificationCenterOpen(true)}
        />
      )}

      {/* REAL-TIME SALES NOTIFICATIONS CENTER (STORE MANAGER ONLY) */}
      {userRole === 'manager' && (
        <NotificationCenterModal
          isOpen={isNotificationCenterOpen}
          onClose={() => setIsNotificationCenterOpen(false)}
          notifications={notifications}
          onMarkAllAsRead={handleMarkAllNotificationsRead}
          onClearAll={handleClearAllNotifications}
        />
      )}
    </div>
  );
}

