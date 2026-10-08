import React, { useState, useEffect } from "react";
import { 
  ShoppingCart, Search, User, SlidersHorizontal, Bluetooth, Check, 
  Printer, X, Receipt, Sparkles, Tag, CreditCard, Wallet, Coins, RefreshCw, AlertTriangle, UserPlus, Plus,
  Settings, Play, Smartphone, CheckCircle2, MessageCircle, Package
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Product, Customer, Sale } from "../types";
import PrinterModal from "./PrinterModal";
import { 
  PrinterConfig, ReceiptData, getStoredPrinterConfig, executePrint, 
  isBluetoothPrinterConnected, getConnectedBluetoothDeviceName,
  setBluetoothDisconnectListener, OFFICIAL_PHONE, OFFICIAL_ADDRESS 
} from "../utils/printerService";
import { recordSaleInFirestore, createCustomerInFirestore } from "../services/firestoreService";

interface POSProps {
  products: Product[];
  customers: Customer[];
  refreshData: () => void;
  printer: { name: string; connected: boolean; deviceType: string };
  setPrinter: React.Dispatch<React.SetStateAction<{ name: string; connected: boolean; deviceType: string }>>;
  userRole?: 'manager' | 'attendant';
  activeAttendant?: string;
}

export default function POS({ 
  products, 
  customers, 
  refreshData, 
  printer, 
  setPrinter,
  userRole = "manager",
  activeAttendant = "General Cashier"
}: POSProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'frozen_foods' | 'soft_drinks'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [redeemPoints, setRedeemPoints] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pos' | 'transfer'>('cash');
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null);
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [posError, setPosError] = useState("");
  const [receiptFeed, setReceiptFeed] = useState(false);

  // Printer State & Feedback
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(getStoredPrinterConfig());
  const [isPrinting, setIsPrinting] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<{ success: boolean; text: string } | null>(null);

  // Sync printer display name with real connection state
  useEffect(() => {
    const isBt = isBluetoothPrinterConnected();
    const btName = getConnectedBluetoothDeviceName();
    if (isBt && btName) {
      setPrinter({
        name: `${btName} (${printerConfig.paperWidth})`,
        connected: true,
        deviceType: printerConfig.paperWidth
      });
    } else {
      setPrinter({
        name: `No Printer Connected (${printerConfig.paperWidth})`,
        connected: false,
        deviceType: printerConfig.paperWidth
      });
    }

    setBluetoothDisconnectListener(() => {
      setPrinter({
        name: `No Printer Connected (${printerConfig.paperWidth})`,
        connected: false,
        deviceType: printerConfig.paperWidth
      });
    });
  }, [printerConfig]);

  // Quick Customer Creation inline states
  const [isShowingAddCustomer, setIsShowingAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [custError, setCustError] = useState("");

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      setCustError("Customer name is required.");
      return;
    }
    setIsSavingCustomer(true);
    setCustError("");
    try {
      // 1. Write directly to Firestore
      const newCust = await createCustomerInFirestore({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        email: newCustEmail.trim(),
        notes: "",
        loyaltyPoints: 0,
        createdAt: new Date().toISOString(),
        purchaseCount: 0,
        totalSpent: 0
      });

      // 2. Optional server API backup (safe against HTML responses on static hosts)
      try {
        await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCustName.trim(),
            phone: newCustPhone.trim(),
            email: newCustEmail.trim(),
            loyaltyPoints: 0
          })
        });
      } catch (apiErr) {
        console.log("Server endpoint skipped on static deployment:", apiErr);
      }
      
      // Auto-select the newly added customer
      setSelectedCustomerId(newCust.id);
      
      // Reset inputs & close modal
      setNewCustName("");
      setNewCustPhone("");
      setNewCustEmail("");
      setIsShowingAddCustomer(false);
      
      refreshData();
    } catch (err: any) {
      setCustError(err.message || "Could not register new client");
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Play thermal printer audio tone
  const playPrintTone = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const time = audioCtx.currentTime;
      const playBeep = (freq: number, duration: number, delay: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, time + delay);
        gain.gain.setValueAtTime(0.04, time + delay);
        osc.start(time + delay);
        osc.stop(time + delay + duration);
      };
      playBeep(1200, 0.08, 0);
      playBeep(1500, 0.08, 0.1);
    } catch (e) {
      // AudioContext optional
    }
  };

  // Execute print on active receipt
  const printReceiptNow = async (targetSale = checkoutResult) => {
    if (!targetSale) return;
    setIsPrinting(true);
    setPrintFeedback(null);

    const receiptPayload: ReceiptData = {
      receiptNo: targetSale.receiptNo,
      date: targetSale.date,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: targetSale.customerName,
      customerId: targetSale.customerId,
      cashier: targetSale.cashier,
      paymentMethod: targetSale.paymentMethod,
      items: targetSale.items,
      totalAmount: targetSale.totalAmount,
      discountAmount: targetSale.discountAmount,
      pointsRedeemed: targetSale.pointsRedeemed,
      netAmount: targetSale.netAmount,
      pointsEarned: targetSale.pointsEarned,
      barcodeValue: OFFICIAL_PHONE
    };

    try {
      playPrintTone();
      const result = await executePrint(receiptPayload, printerConfig);
      if (result.success) {
        setPrintFeedback({
          success: true,
          text: `Receipt printed successfully!`
        });
      } else {
        setPrintFeedback({
          success: false,
          text: `Printer notice: ${result.message}`
        });
      }
    } catch (err: any) {
      setPrintFeedback({
        success: false,
        text: `Printer connection error: ${err.message || 'Could not communicate with printer.'}`
      });
      try {
        window.print();
      } catch {
        // ignore
      }
    } finally {
      setIsPrinting(false);
      setTimeout(() => {
        setPrintFeedback(null);
      }, 5000);
    }
  };

  // Add item to cart
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      if (product.category === 'frozen_foods') {
        // weights go up by 0.5 kg by default on subsequent clicks
        updatedCart[existingIndex].quantity += 0.5;
      } else {
        // drinks go up by 1 piece
        updatedCart[existingIndex].quantity += 1;
      }
      setCart(updatedCart);
    } else {
      const initialQty = product.category === 'frozen_foods' ? 1.0 : 1;
      setCart([...cart, { product, quantity: initialQty }]);
    }
    setPosError("");
    setCheckoutResult(null);
  };

  // Update item quantity directly
  const updateQuantity = (index: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) return;
    const updatedCart = [...cart];
    updatedCart[index].quantity = num;
    setCart(updatedCart);
    setPosError("");
  };

  // Change quantity offsets (+ / - buttons)
  const adjustQuantity = (index: number, delta: number) => {
    const updatedCart = [...cart];
    const item = updatedCart[index];
    const isFrozen = item.product.category === 'frozen_foods';
    const amount = isFrozen ? 0.5 : 1;
    
    item.quantity = Math.max(0.1, +(item.quantity + delta * amount).toFixed(1));
    setCart(updatedCart);
    setPosError("");
  };

  const removeFromCart = (index: number) => {
    const updatedCart = cart.filter((_, i) => i !== index);
    setCart(updatedCart);
  };

  // Compute pricing
  const subtotal = cart.reduce((sum, item) => sum + (item.product.pricePerUnit * item.quantity), 0);
  
  // Redeem points value logic: 1 point = 10 Naira discount maximum
  // Check if customer has enough points
  const pointsAvailable = selectedCustomer?.loyaltyPoints || 0;
  const pointsDiscountValue = pointsAvailable * 10;
  // Caps discount value to not exceed subtotal
  const maxPointsToRedeem = Math.min(pointsAvailable, Math.floor((subtotal - discount) / 10));
  const pointsDiscount = redeemPoints ? maxPointsToRedeem * 10 : 0;

  const total = Math.max(0, subtotal - discount - pointsDiscount);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setPosError("Your shopping cart is empty!");
      return;
    }

    // Verify stock check before request
    for (const item of cart) {
      if (item.product.stockQuantity < item.quantity) {
        setPosError(`Not enough stock for ${item.product.name}. Available: ${item.product.stockQuantity} ${item.product.unit}`);
        return;
      }
    }

    setIsCheckingOut(true);
    setPosError("");

    try {
      const salePayload = {
        customerId: selectedCustomerId || null,
        customerName: selectedCustomer ? selectedCustomer.name : "Anonymous Walk-in",
        items: cart.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          pricePerUnit: item.product.pricePerUnit,
          totalPrice: item.product.pricePerUnit * item.quantity
        })),
        totalAmount: subtotal,
        discountAmount: discount,
        netAmount: total,
        pointsRedeemed: redeemPoints ? maxPointsToRedeem : 0,
        paymentMethod,
        cashier: activeAttendant || (userRole === "manager" ? "Store Manager" : "General Cashier")
      };

      // 1. Direct persistent Firestore checkout & stock deduction
      let processedSale: Sale;
      try {
        processedSale = await recordSaleInFirestore(salePayload, products, selectedCustomer);
      } catch (fsErr: any) {
        console.warn("Firestore sale write warning, generating local receipt fallback:", fsErr);
        const today = new Date();
        const year = today.getFullYear();
        const monthStr = String(today.getMonth() + 1).padStart(2, "0");
        const dayStr = String(today.getDate()).padStart(2, "0");
        processedSale = {
          id: `sale-${Date.now()}`,
          receiptNo: `REC-${year}${monthStr}${dayStr}-${Math.floor(100 + Math.random() * 900)}`,
          customerId: salePayload.customerId,
          customerName: salePayload.customerName,
          items: salePayload.items,
          totalAmount: salePayload.totalAmount,
          discountAmount: salePayload.discountAmount,
          netAmount: salePayload.netAmount,
          pointsEarned: Math.floor(salePayload.netAmount / 1000),
          pointsRedeemed: salePayload.pointsRedeemed,
          date: `${year}-${monthStr}-${dayStr}`,
          month: `${year}-${monthStr}`,
          year,
          paymentMethod: salePayload.paymentMethod,
          printedRef: false,
          cashier: salePayload.cashier
        };
      }

      // 2. Secondary optional backup call to server API (safely guarded against HTML responses on static Netlify)
      try {
        const response = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(salePayload)
        }).catch(() => null);
        if (response && response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const apiData = await response.json().catch(() => null);
            if (apiData && apiData.sale) {
              processedSale = apiData.sale;
            }
          }
        }
      } catch (apiErr) {
        console.log("Server API endpoint skipped on static host (Netlify):", apiErr);
      }

      setCheckoutResult(processedSale);
      setCart([]);
      setDiscount(0);
      setRedeemPoints(false);
      setSelectedCustomerId("");
      setReceiptFeed(true);
      refreshData();

      // Automatic thermal receipt dispatch if enabled in Printer Hub
      if (printerConfig.autoPrintOnCheckout) {
        setTimeout(() => {
          printReceiptNow(processedSale);
        }, 300);
      } else {
        playPrintTone();
      }

    } catch (err: any) {
      setPosError(err.message || "An unexpected error occurred during POS checkout.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handlePrintPhysical = () => {
    window.print();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT: PRODUCTS LISTING (COL-7) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Filter bar */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              id="pos-search"
              placeholder="Search frozen fish, chicken, coke, malt..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold font-sans">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${categoryFilter === 'all' ? 'bg-white shadow-xs text-slate-950' : 'text-slate-500 hover:text-slate-900'}`}
            >
              All Items
            </button>
            <button
              onClick={() => setCategoryFilter('frozen_foods')}
              className={`px-3 py-1.5 rounded-md transition-all ${categoryFilter === 'frozen_foods' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Frozen Food (KGs)
            </button>
            <button
              onClick={() => setCategoryFilter('soft_drinks')}
              className={`px-3 py-1.5 rounded-md transition-all ${categoryFilter === 'soft_drinks' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Soft Drinks
            </button>
          </div>
        </div>

        {/* Dynamic products list */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {filteredProducts.map((p) => {
            const isLowStock = p.stockQuantity <= p.minStockLevel;
            const isOutOfStock = p.stockQuantity <= 0;
            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`relative bg-white text-left p-3 rounded-xl border transition-all flex flex-col justify-between shadow-xs hover:shadow-md group overflow-hidden ${
                  isOutOfStock 
                    ? 'border-slate-200 opacity-60 cursor-not-allowed'
                    : isLowStock
                      ? 'border-amber-200 hover:border-amber-400 bg-amber-50/10 cursor-pointer active:scale-98'
                      : 'border-slate-200 hover:border-blue-500 cursor-pointer active:scale-98'
                }`}
              >
                {/* Product Image */}
                <div className="relative w-full h-28 mb-2.5 rounded-lg overflow-hidden bg-slate-50/80 shrink-0 border border-slate-200/90 flex items-center justify-center p-1.5">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className={`w-full h-full rounded-md flex flex-col items-center justify-center gap-1 ${
                      p.category === 'frozen_foods' ? 'bg-blue-50/60 text-blue-500' : 'bg-indigo-50/60 text-indigo-500'
                    }`}>
                      <Package className="h-7 w-7 opacity-80" />
                      <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-slate-400">{p.unit} unit</span>
                    </div>
                  )}

                  {/* Category Pill Tag */}
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wide backdrop-blur-md shadow-xs ${
                    p.category === 'frozen_foods' 
                      ? 'bg-blue-600/90 text-white' 
                      : 'bg-indigo-600/90 text-white'
                  }`}>
                    {p.category === 'frozen_foods' ? 'FROZEN' : 'DRINK'}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-1 relative z-10">
                  <h4 className="font-bold text-slate-900 font-display text-xs leading-tight group-hover:text-blue-700 transition-colors line-clamp-1">
                    {p.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-sans line-clamp-1">
                    {p.description || "Authentic coldroom item"}
                  </p>
                </div>

                {/* Stock alert & price bottom bar */}
                <div className="space-y-1.5 mt-2 relative z-10 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px] font-mono font-semibold">
                      Stock: {p.stockQuantity} {p.unit}
                    </span>
                    {isLowStock && !isOutOfStock && (
                      <span className="text-amber-750 bg-amber-50 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 font-sans animate-pulse">
                        <AlertTriangle className="h-2.5 w-2.5" /> Low
                      </span>
                    )}
                    {isOutOfStock && (
                      <span className="text-red-650 bg-red-50 px-1.5 py-0.5 rounded text-[9px] font-bold font-sans">
                        OUT OF STOCK
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-slate-950 font-mono flex items-baseline">
                      <span className="text-xs text-slate-500 font-sans font-medium mr-0.5">₦</span>
                      {p.pricePerUnit.toLocaleString()}
                      <span className="text-[10px] text-slate-400 font-normal font-sans">/{p.unit}</span>
                    </div>

                    <span className="text-[10px] font-bold text-blue-600 group-hover:underline">
                      + Add
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="bg-slate-50 p-12 text-center rounded-xl border border-dashed border-slate-200">
            <X className="mx-auto h-8 w-8 text-slate-300" />
            <h3 className="mt-2 text-sm font-semibold text-slate-900 font-display">No food or drinks found</h3>
            <p className="mt-1 text-xs text-slate-500 font-sans">Try adjusting your filters or add new stock in the admin page.</p>
          </div>
        )}
      </div>

      {/* RIGHT: CART & CHECKOUT TERMINAL (COL-5) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Connection status card */}
        <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 font-sans font-medium min-w-0">
            <div className={`p-2 rounded-xl shrink-0 ${printer.connected ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
              <Bluetooth className={`h-4 w-4 ${printer.connected ? 'animate-pulse' : ''}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Receipt Printer</p>
              <p className="font-bold text-xs text-slate-800 truncate">
                {printer.name}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setPairingModalOpen(true)}
            className={`font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs shrink-0 cursor-pointer active:scale-95 ${
              printer.connected 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
            }`}
          >
            <Bluetooth className="h-3.5 w-3.5" />
            <span>{printer.connected ? 'Configure' : 'Connect'}</span>
          </button>
        </div>

        {/* Real Printing Status / Feedback Banner */}
        {printFeedback && (
          <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
            printFeedback.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold' 
              : 'bg-amber-50 border-amber-200 text-amber-900 font-medium'
          }`}>
            <div className="flex items-center gap-2">
              {printFeedback.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              )}
              <span className="leading-snug">{printFeedback.text}</span>
            </div>
            <button 
              type="button"
              onClick={() => setPrintFeedback(null)} 
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Checkout panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
          <div className="bg-[#0F172A] p-4 text-white flex items-center justify-between">
            <h3 className="font-bold font-display text-xs flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-400 animate-pulse" /> Live Sale Cart
            </h3>
            <span className="bg-blue-505 bg-white/10 text-blue-300 font-mono text-xs px-2.5 py-0.5 rounded-full font-black">
              {cart.reduce((sum, item) => sum + (item.product.category === 'frozen_foods' ? 1 : Math.round(item.quantity)), 0)} lines
            </span>
          </div>

          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-600 font-sans font-medium">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>Served by: <strong className="text-slate-900 font-bold">{userRole === 'attendant' ? activeAttendant : 'Store Manager (Admin)'}</strong></span>
            </div>
            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold font-mono tracking-wide">
              {userRole === 'attendant' ? 'CASHIER' : 'ADMIN'}
            </span>
          </div>

          <div className="p-4 flex-1 min-h-[180px] max-h-[300px] overflow-y-auto divide-y divide-slate-100">
            {cart.map((item, idx) => {
              const isFrozen = item.product.category === 'frozen_foods';
              const isLowOnStock = item.product.stockQuantity < item.quantity;
              return (
                <div key={idx} className="py-3 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-slate-900 text-xs truncate font-display">{item.product.name}</h5>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                      <span className="font-mono">₦{item.product.pricePerUnit.toLocaleString()}/{item.product.unit}</span>
                      <span>•</span>
                      <span className="bg-slate-55 px-1 py-0.2 rounded font-semibold text-slate-600">Stock: {item.product.stockQuantity} {item.product.unit}</span>
                    </div>
                  </div>

                  {/* Quantity control actions */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => adjustQuantity(idx, -1)}
                      className="h-6 w-6 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step={isFrozen ? 0.5 : 1}
                      className={`w-14 text-center font-mono text-xs border rounded h-6 p-0 focus:ring-1 focus:ring-blue-500 ${isLowOnStock ? 'bg-red-50 border-red-300 font-bold text-red-600' : 'border-slate-200'}`}
                      value={item.quantity}
                      onChange={(e) => updateQuantity(idx, e.target.value)}
                    />
                    <button 
                      onClick={() => adjustQuantity(idx, 1)}
                      className="h-6 w-6 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Price column */}
                  <div className="text-right min-w-[75px]">
                    <p className="font-mono font-bold text-xs text-slate-950">
                      ₦{(item.product.pricePerUnit * item.quantity).toLocaleString()}
                    </p>
                    <button 
                      onClick={() => removeFromCart(idx)}
                      className="text-[10px] text-red-500 hover:text-red-700 underline font-sans"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}

            {cart.length === 0 && (
              <div className="py-12 text-center text-slate-450 flex flex-col items-center justify-center">
                <ShoppingCart className="h-8 w-8 text-slate-200 animate-bounce mb-2" />
                <p className="text-xs font-sans font-medium">Add frozen items or soft drinks from the left catalog.</p>
              </div>
            )}
          </div>

          {/* Pricing computation summary */}
          <div className="bg-slate-50 p-4 border-t border-slate-200/85 space-y-3.5 font-sans">
            
            {/* Customer profile selection dropdown */}
            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="customer-select" className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Attach Customer (For Loyalty Points)</label>
                <button
                  type="button"
                  onClick={() => setIsShowingAddCustomer(true)}
                  className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 active:scale-95 transition-all outline-none"
                >
                  <Plus className="h-3 w-3 inline" /> <span>Add New Customer</span>
                </button>
              </div>
              <div className="relative">
                <select
                  id="customer-select"
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-755"
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    setRedeemPoints(false); // reset
                  }}
                >
                  <option value="">-- Guest Walk-in Account --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || 'No Phone'}) — Points: {c.loyaltyPoints}
                    </option>
                  ))}
                </select>
                <User className="absolute right-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Loyalty Point redemption action if customer attached */}
            {selectedCustomer && selectedCustomer.loyaltyPoints > 0 && (
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-blue-600 animate-spin" />
                  <div>
                    <p className="text-[11px] font-bold text-blue-800">Redeem Loyalty Points rewards?</p>
                    <p className="text-[9px] text-blue-550 font-medium leading-none">
                      {pointsAvailable} pts available worth ₦{pointsDiscountValue.toLocaleString()}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="redeem-points"
                  className="h-4.5 w-4.5 accent-blue-600 cursor-pointer"
                  checked={redeemPoints}
                  onChange={(e) => setRedeemPoints(e.target.checked)}
                />
              </div>
            )}

            {/* Custom Discount input */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="flat-discount" className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Flat Discount (₦)</label>
                <div className="relative">
                  <input
                    type="number"
                    id="flat-discount"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 font-mono text-right bg-white"
                    value={discount || ""}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  />
                  <Tag className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
                </div>
              </div>

              {/* Payment Method picker */}
              <div className="space-y-1">
                <label htmlFor="pay-method" className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Payment Option</label>
                <select
                  id="pay-method"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 font-semibold bg-white"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                >
                  <option value="cash">Cash 💵</option>
                  <option value="pos">POS Terminal 💳</option>
                  <option value="transfer">Bank Transfer 🏦</option>
                </select>
              </div>
            </div>

            {/* Detailed price summary */}
            <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Total Items Value:</span>
                <span className="font-mono font-medium">₦{subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Custom Discount Applied:</span>
                  <span className="font-mono font-medium">-₦{discount.toLocaleString()}</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-blue-650">
                  <span>Points Redeemed Discount:</span>
                  <span className="font-mono font-medium">-₦{pointsDiscount.toLocaleString()} ({maxPointsToRedeem} pts)</span>
                </div>
              )}
              {selectedCustomer && (
                <div className="flex justify-between text-blue-600 text-[10px] font-semibold bg-blue-50 px-2 py-1 rounded">
                  <span>Loyalty Points to Earn on Checkout:</span>
                  <span className="font-mono">+{Math.floor(total / 1000)} pts</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-black text-base pt-1 items-baseline">
                <span>Final To Pay:</span>
                <span className="font-mono text-lg flex items-baseline">
                  <span className="text-xs font-normal text-slate-500 mr-0.5">₦</span>
                  {total.toLocaleString()}
                </span>
              </div>
            </div>

            {posError && (
              <div className="bg-red-55/10 border border-red-200 p-2.5 rounded-lg text-xs font-bold text-red-700 font-sans">
                {posError}
              </div>
            )}

            {/* Execute CheckOut button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isCheckingOut}
              className={`w-full py-3 rounded-xl font-bold font-display text-sm tracking-wide shadow-md transition-all ${
                cart.length === 0 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-98 shadow-blue-500/10'
              }`}
            >
              {isCheckingOut ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Finalizing Ledger Audit...
                </span>
              ) : (
                "PROCESS SALE & PRINT RECEIPT"
              )}
            </button>
          </div>
        </div>

        {/* RECEIPT EMULATOR PREVIEW BOX (ONLY AFTER ORDER OR TRIGGERED) */}
        {receiptFeed && checkoutResult && (
          <div className="bg-amber-100/10 border border-amber-200 p-4 rounded-2xl relative shadow-md overflow-hidden bg-cover py-6">
            <div className="absolute top-2 right-2 flex gap-1">
              <button 
                onClick={() => setReceiptFeed(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-150 transition-colors"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <h4 className="font-bold text-[10px] text-amber-800 uppercase tracking-wider mb-2.5 text-center flex items-center justify-center gap-1.5 font-display">
              <Receipt className="h-4 w-4" /> Thermal Print Output Roll
            </h4>

            {/* VIRTUAL INV */}
            <div 
              id="thermal-receipt-print-area"
              className={`bg-white p-5 rounded border border-dashed border-slate-350 max-w-xs mx-auto text-xs text-slate-800 font-mono shadow-sm space-y-4 paper-${printerConfig.paperWidth}`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <div className="text-center space-y-1">
                <h4 className="font-extrabold text-slate-900 border-b border-slate-950 pb-1 uppercase tracking-tight text-sm">
                  {printerConfig.storeName || "JOJU VENTURES LTD"}
                </h4>
                <p className="text-[10px] text-slate-600 font-sans leading-none">{printerConfig.storeTagline || "Cold Room & Soft Drinks Wholesale"}</p>
                <p className="text-[10px] text-slate-700 font-sans font-medium leading-none">{OFFICIAL_ADDRESS}</p>
                <p className="text-[9px] text-slate-800 pt-0.5 font-sans font-bold leading-none">Tel/WhatsApp: {OFFICIAL_PHONE}</p>
              </div>

              <div className="border-y border-dashed border-slate-950 py-1.5 space-y-0.5 text-[10px]">
                <div>RECEIPT : {checkoutResult.receiptNo}</div>
                <div>DATE    : {checkoutResult.date} {new Date().toLocaleTimeString()}</div>
                <div>CUSTOMER: {checkoutResult.customerName}</div>
                <div>METHOD  : {checkoutResult.paymentMethod.toUpperCase()}</div>
                {checkoutResult.cashier && (
                  <div>CASHIER : {checkoutResult.cashier.toUpperCase()}</div>
                )}
              </div>

              {/* Items in kg & pieces */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold border-b border-dashed border-slate-950 pb-0.5 text-[10px]">
                  <span>ITEM / PRICE</span>
                  <span>QTY / TOTAL</span>
                </div>
                {checkoutResult.items.map((item: any, idx: number) => (
                  <div key={idx} className="space-y-0.2 text-[10px] text-slate-900">
                    <div className="font-bold">{item.name}</div>
                    <div className="flex justify-between text-slate-500 pl-2">
                      <span>{item.quantity} x ₦{item.pricePerUnit.toLocaleString()}</span>
                      <span>₦{item.totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-slate-950 pt-1.5 space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>₦{checkoutResult.totalAmount.toLocaleString()}</span>
                </div>
                {checkoutResult.discountAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>DISCOUNT:</span>
                    <span>-₦{checkoutResult.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                {checkoutResult.pointsRedeemed > 0 && (
                  <div className="flex justify-between text-blue-800 font-bold">
                    <span>PTS REDEEMED:</span>
                    <span>-₦{(checkoutResult.pointsRedeemed * 10).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xs text-slate-955 border-t border-slate-950 pt-1 pb-0.5">
                  <span>TOTAL NET:</span>
                  <span>₦{checkoutResult.netAmount.toLocaleString()}</span>
                </div>
              </div>

              {checkoutResult.customerId && (
                <div className="border-t border-dashed border-slate-950 pt-1 px-1 bg-slate-50 rounded text-center text-[9px] text-blue-800 space-y-0.5">
                  <p className="font-bold">✨ LOYALTY CARD DETAILS ✨</p>
                  <p>Points Earned This Sale: +{checkoutResult.pointsEarned} pts</p>
                </div>
              )}
              
              {/* WhatsApp Order QR & Official Store Info */}
              <div className="flex flex-col items-center justify-center pt-2.5 border-t border-dashed border-slate-950 space-y-1.5 text-center">
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight">Order via WhatsApp</p>
                <div className="bg-white p-1 rounded border border-slate-200 inline-block shadow-xs">
                  <QRCodeSVG value={`https://wa.me/2349135069662`} size={64} level="M" />
                </div>
                <p className="text-[9px] text-slate-900 font-mono font-bold">{OFFICIAL_PHONE}</p>
                <p className="text-[8px] text-slate-500 font-sans">{OFFICIAL_ADDRESS}</p>
              </div>

              {/* Print Trigger */}
              <div className="pt-3 block-print space-y-2">
                <button 
                  onClick={() => printReceiptNow()}
                  disabled={isPrinting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer shadow-sm"
                >
                  <Printer className={`h-3.5 w-3.5 ${isPrinting ? 'animate-spin' : ''}`} />
                  <span>{isPrinting ? "Printing..." : `Print Receipt (${printerConfig.paperWidth})`}</span>
                </button>
              </div>

              <div className="text-center pt-2 border-t border-dashed border-slate-950 text-[9px] text-slate-400 font-sans space-y-1">
                <p className="font-semibold">{printerConfig.footerMessage}</p>
                <div className="flex justify-center gap-1.5 text-[8px] pt-1">
                  <span>-------------------------</span>
                </div>
              </div>
            </div>

            {/* Print trigger secondary buttons */}
            <div className="mt-4 flex gap-2 justify-center">
              <button
                onClick={() => setPairingModalOpen(true)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Bluetooth className="h-3.5 w-3.5 text-blue-600" /> Connect Printer
              </button>
            </div>

          </div>
        )}
      </div>

      {/* QUICK INLINE CUSTOMER REGISTRATION MODAL */}
      {isShowingAddCustomer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 font-sans">
            <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide font-display flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-400" /> POS Speedy Customer Creation
              </h3>
              <button 
                type="button"
                onClick={() => setIsShowingAddCustomer(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleQuickAddCustomer} className="p-5 space-y-4">
              {custError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3 rounded-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>{custError}</span>
                </div>
              )}

              <p className="text-xs text-slate-500 leading-normal">
                Quickly register this customer on the system during sales to track loyalty points and output custom-addressed invoices.
              </p>

              <div className="space-y-3.5">
                <div>
                  <label htmlFor="quick-cust-name" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    id="quick-cust-name"
                    required
                    placeholder="e.g. Aliyu Dangote"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 text-xs font-semibold rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                  />
                </div>

                <div>
                  <label htmlFor="quick-cust-phone" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Telephone / WhatsApp Contact</label>
                  <input
                    type="tel"
                    id="quick-cust-phone"
                    placeholder="e.g. +234 803 000 1122"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 text-xs font-semibold rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                  />
                </div>

                <div>
                  <label htmlFor="quick-cust-email" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    id="quick-cust-email"
                    placeholder="e.g. name@domain.com"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 text-xs font-semibold rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsShowingAddCustomer(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded-lg text-xs transition-all flex items-center gap-1 shadow-sm active:scale-95"
                >
                  {isSavingCustomer ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Create & Attach</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* THERMAL PRINTER MODAL */}
      <PrinterModal 
        isOpen={pairingModalOpen} 
        onClose={() => setPairingModalOpen(false)} 
        onConfigChange={(newCfg) => setPrinterConfig(newCfg)} 
        onPrinterConnected={(name) => {
          if (name) {
            setPrinter({
              name: `${name} (${printerConfig.paperWidth})`,
              connected: true,
              deviceType: printerConfig.paperWidth
            });
          } else {
            setPrinter({
              name: `No Printer Connected (${printerConfig.paperWidth})`,
              connected: false,
              deviceType: printerConfig.paperWidth
            });
          }
        }}
      />
    </div>
  );
}
