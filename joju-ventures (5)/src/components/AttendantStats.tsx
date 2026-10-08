import React, { useState, useMemo } from "react";
import { 
  TrendingUp, Calendar, ShoppingBag, Coins, Users, CreditCard, 
  Wallet, Landmark, Receipt, FileSpreadsheet, ChevronRight, ChevronDown, BarChart2, Clock
} from "lucide-react";
import { Sale, Attendant, Product } from "../types";

interface AttendantStatsProps {
  sales: Sale[];
  attendants: Attendant[];
  products: Product[];
  currentCashierName: string;
  isManager: boolean;
  onRefresh?: () => void;
}

interface PeriodDrilldownDetailsProps {
  periodSales: Sale[];
  products: Product[];
  showProfit?: boolean;
}

function PeriodDrilldownDetails({ periodSales, products, showProfit = true }: PeriodDrilldownDetailsProps) {
  const [drilldownTab, setDrilldownTab] = useState<'items' | 'receipts'>('items');

  // Compute aggregated items for these sales
  const itemsBreakdown = useMemo(() => {
    const map: Record<string, { quantity: number; amount: number; profit: number; price: number; cost: number }> = {};
    periodSales.forEach(s => {
      s.items.forEach(itm => {
        const name = itm.name;
        const matchedProduct = products.find(p => p.id === itm.productId);
        const costPerUnit = matchedProduct ? matchedProduct.costPerUnit : (itm.pricePerUnit * 0.7);
        const itemCost = itm.quantity * costPerUnit;
        const itemProfit = itm.totalPrice - itemCost;

        if (!map[name]) {
          map[name] = { quantity: 0, amount: 0, profit: 0, price: itm.pricePerUnit, cost: costPerUnit };
        }
        map[name].quantity += itm.quantity;
        map[name].amount += itm.totalPrice;
        map[name].profit += itemProfit;
      });
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d }));
  }, [periodSales, products]);

  // Compute total profit for each sale
  const salesWithProfit = useMemo(() => {
    return periodSales.map(s => {
      let totalCost = 0;
      s.items.forEach(itm => {
        const matchedProduct = products.find(p => p.id === itm.productId);
        const costPerUnit = matchedProduct ? matchedProduct.costPerUnit : (itm.pricePerUnit * 0.7);
        totalCost += itm.quantity * costPerUnit;
      });
      const profit = s.netAmount - totalCost;
      return { ...s, profit };
    });
  }, [periodSales, products]);

  if (periodSales.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-400 font-medium">
        No sales details recorded for this profile yet.
      </div>
    );
  }

  return (
    <div className="mt-4 bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono">
            {showProfit ? "Period Drilldown Audit" : "Period Sales Breakdown"}
          </p>
          <p className="text-xs text-slate-300">
            Analyzing {periodSales.length} checkouts total • Turnover: <b className="text-white font-mono">₦{periodSales.reduce((acc, s) => acc + s.netAmount, 0).toLocaleString()}</b>
          </p>
        </div>

        {/* Small tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
          <button
            onClick={() => setDrilldownTab('items')}
            className={`px-3 py-1.5 rounded-lg transition-all ${drilldownTab === 'items' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Articles Sold ({itemsBreakdown.length})
          </button>
          <button
            onClick={() => setDrilldownTab('receipts')}
            className={`px-3 py-1.5 rounded-lg transition-all ${drilldownTab === 'receipts' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Receipt Trans Logs ({salesWithProfit.length})
          </button>
        </div>
      </div>

      {drilldownTab === 'items' ? (
        <div className="space-y-2">
          {itemsBreakdown.length === 0 ? (
            <p className="text-xs text-center text-slate-500 italic py-4">No specific items found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {itemsBreakdown.map((item) => (
                <div key={item.name} className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate font-display">{item.name}</p>
                    <div className="flex items-center gap-2 text-[9px] text-slate-450 font-mono">
                      <span>Rate: ₦{item.price.toLocaleString()}</span>
                      {showProfit && (
                        <>
                          <span>•</span>
                          <span>Cost: ₦{item.cost.toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold font-mono text-white">
                      x{item.quantity.toFixed(1).replace('.0', '')} pcs
                    </p>
                    {showProfit && (
                      <p className="text-[10px] font-black text-emerald-400 font-mono">
                        +₦{item.profit.toLocaleString()} profit
                      </p>
                    )}
                    <p className="text-[9px] text-slate-400 font-mono">
                      ₦{item.amount.toLocaleString()} revenue
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          {salesWithProfit.map((sale) => (
            <div key={sale.id} className="bg-slate-950 border border-slate-850 hover:border-slate-800 p-4 rounded-xl space-y-2.5 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-black text-xs text-blue-400 tracking-wider">
                    {sale.receiptNo}
                  </span>
                  <span className="text-[9px] bg-slate-900 text-slate-400 px-2.5 py-0.5 rounded font-bold font-mono">
                    {sale.date}
                  </span>
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    sale.paymentMethod === 'cash' ? 'bg-amber-900/30 text-amber-300 border border-amber-900/50' :
                    sale.paymentMethod === 'pos' ? 'bg-sky-900/30 text-sky-300 border border-sky-900/50' : 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/50'
                  }`}>
                    {sale.paymentMethod}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-white">
                    ₦{sale.netAmount.toLocaleString()}
                  </span>
                  {showProfit && (
                    <span className="text-[9px] text-emerald-400 font-mono block font-bold">
                      +₦{sale.profit.toLocaleString()} Profit
                    </span>
                  )}
                </div>
              </div>

              {/* Items in this specific transaction receipt */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {sale.items.map((itm, iidx) => (
                  <span key={iidx} className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] font-medium text-slate-300">
                    <b className="text-white font-mono">x{itm.quantity}</b> {itm.name} @ ₦{itm.pricePerUnit.toLocaleString()}
                  </span>
                ))}
              </div>

              {/* Cashier & Customer Info */}
              <div className="flex items-center justify-between text-[9px] text-slate-450 mt-1 font-sans">
                <span>Customer: <b className="text-slate-305 text-slate-300">{sale.customerName}</b></span>
                {sale.cashier && <span>Cashier: <b className="text-indigo-400">{sale.cashier}</b></span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AttendantStats({ sales, attendants, products, currentCashierName, isManager, onRefresh }: AttendantStatsProps) {
  // If manager, they can select which attendant profile to view, default to "All Attendants"
  const [selectedCashier, setSelectedCashier] = useState<string>(
    isManager ? "All Attendants" : currentCashierName
  );

  const [activeReportTab, setActiveReportTab] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  
  // Drill-down toggles for expanded list/details of items bought & transactions
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [detailViewMode, setDetailViewMode] = useState<'items' | 'transactions'>('items');

  const selectReportTab = (tab: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    setActiveReportTab(tab);
    setExpandedRow(null);
  };

  // Filter sales belonging to the selected cashier
  const cashierSales = useMemo(() => {
    if (selectedCashier === "All Attendants") {
      return sales;
    }
    return sales.filter(s => s.cashier?.toLowerCase() === selectedCashier.toLowerCase());
  }, [sales, selectedCashier]);

  // General shift counts (with profit calculation)
  const statsSummary = useMemo(() => {
    let totalAmt = 0;
    let itemsCount = 0;
    let transCount = cashierSales.length;
    let cashAmt = 0;
    let posAmt = 0;
    let transferAmt = 0;
    let totalProfit = 0;

    cashierSales.forEach(s => {
      totalAmt += s.netAmount;
      if (s.paymentMethod === 'cash') cashAmt += s.netAmount;
      else if (s.paymentMethod === 'pos') posAmt += s.netAmount;
      else if (s.paymentMethod === 'transfer') transferAmt += s.netAmount;

      let saleCost = 0;
      s.items.forEach(itm => {
        itemsCount += itm.quantity;
        const matchedProduct = products.find(p => p.id === itm.productId);
        const costPerUnit = matchedProduct ? matchedProduct.costPerUnit : (itm.pricePerUnit * 0.7);
        saleCost += itm.quantity * costPerUnit;
      });
      const saleProfit = s.netAmount - saleCost;
      totalProfit += saleProfit;
    });

    return { totalAmt, itemsCount, transCount, cashAmt, posAmt, transferAmt, totalProfit };
  }, [cashierSales, products]);

  // 1. Daily Reports: Grouped by YYYY-MM-DD
  const dailyReport = useMemo(() => {
    const dailyData: Record<string, { totalAmount: number; itemsCount: number; salesCount: number; totalProfit: number; itemsList: Record<string, { quantity: number; amount: number; price: number; profit: number }> }> = {};

    cashierSales.forEach(s => {
      const date = s.date;
      if (!dailyData[date]) {
        dailyData[date] = { totalAmount: 0, itemsCount: 0, salesCount: 0, totalProfit: 0, itemsList: {} };
      }
      dailyData[date].totalAmount += s.netAmount;
      dailyData[date].salesCount += 1;

      let saleCost = 0;
      s.items.forEach(itm => {
        dailyData[date].itemsCount += itm.quantity;
        const name = itm.name;
        
        const matchedProduct = products.find(p => p.id === itm.productId);
        const costPerUnit = matchedProduct ? matchedProduct.costPerUnit : (itm.pricePerUnit * 0.7);
        const itemCost = itm.quantity * costPerUnit;
        const itemProfit = itm.totalPrice - itemCost;
        saleCost += itemCost;

        if (!dailyData[date].itemsList[name]) {
          dailyData[date].itemsList[name] = { quantity: 0, amount: 0, price: itm.pricePerUnit, profit: 0 };
        }
        dailyData[date].itemsList[name].quantity += itm.quantity;
        dailyData[date].itemsList[name].amount += itm.totalPrice;
        dailyData[date].itemsList[name].profit += itemProfit;
      });

      const saleProfit = s.netAmount - saleCost;
      dailyData[date].totalProfit += saleProfit;
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [cashierSales, products]);

  // 2. Days of the week Reports: Grouped by day of week (Monday - Sunday)
  const daysOfTheWeekReport = useMemo(() => {
    const daysName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekData: Array<{ dayIndex: number; name: string; totalAmount: number; itemsCount: number; salesCount: number; totalProfit: number; itemsList: Record<string, { quantity: number; amount: number; profit: number }> }> = Array.from({ length: 7 }, (_, i) => ({
      dayIndex: i,
      name: daysName[i],
      totalAmount: 0,
      itemsCount: 0,
      salesCount: 0,
      totalProfit: 0,
      itemsList: {}
    }));

    cashierSales.forEach(s => {
      const dateObj = new Date(s.date);
      const dayIndex = dateObj.getDay(); // 0 (Sun) to 6 (Sat)
      
      weekData[dayIndex].totalAmount += s.netAmount;
      weekData[dayIndex].salesCount += 1;

      let saleCost = 0;
      s.items.forEach(itm => {
        weekData[dayIndex].itemsCount += itm.quantity;
        const name = itm.name;
        
        const matchedProduct = products.find(p => p.id === itm.productId);
        const costPerUnit = matchedProduct ? matchedProduct.costPerUnit : (itm.pricePerUnit * 0.7);
        const itemCost = itm.quantity * costPerUnit;
        const itemProfit = itm.totalPrice - itemCost;
        saleCost += itemCost;

        if (!weekData[dayIndex].itemsList[name]) {
          weekData[dayIndex].itemsList[name] = { quantity: 0, amount: 0, profit: 0 };
        }
        weekData[dayIndex].itemsList[name].quantity += itm.quantity;
        weekData[dayIndex].itemsList[name].amount += itm.totalPrice;
        weekData[dayIndex].itemsList[name].profit += itemProfit;
      });

      const saleProfit = s.netAmount - saleCost;
      weekData[dayIndex].totalProfit += saleProfit;
    });

    // Reorder so week starts at Monday (Monday, Tuesday,..., Sunday)
    const mondayFirst = [1, 2, 3, 4, 5, 6, 0].map(idx => weekData[idx]);
    return mondayFirst;
  }, [cashierSales, products]);

  // 3. Monthly Reports: Grouped by YYYY-MM
  const monthlyReport = useMemo(() => {
    const monthsName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthlyData: Record<string, { monthKey: string; name: string; year: number; totalAmount: number; itemsCount: number; salesCount: number; totalProfit: number; itemsList: Record<string, { quantity: number; amount: number; profit: number }> }> = {};

    cashierSales.forEach(s => {
      const monthKey = s.month; // YYYY-MM
      if (!monthlyData[monthKey]) {
        const [yearStr, monthStr] = monthKey.split("-");
        const monthIndex = parseInt(monthStr, 10) - 1;
        const name = `${monthsName[monthIndex]} ${yearStr}`;
        monthlyData[monthKey] = { monthKey, name, year: parseInt(yearStr, 10), totalAmount: 0, itemsCount: 0, salesCount: 0, totalProfit: 0, itemsList: {} };
      }
      monthlyData[monthKey].totalAmount += s.netAmount;
      monthlyData[monthKey].salesCount += 1;

      let saleCost = 0;
      s.items.forEach(itm => {
        monthlyData[monthKey].itemsCount += itm.quantity;
        const name = itm.name;
        
        const matchedProduct = products.find(p => p.id === itm.productId);
        const costPerUnit = matchedProduct ? matchedProduct.costPerUnit : (itm.pricePerUnit * 0.7);
        const itemCost = itm.quantity * costPerUnit;
        const itemProfit = itm.totalPrice - itemCost;
        saleCost += itemCost;

        if (!monthlyData[monthKey].itemsList[name]) {
          monthlyData[monthKey].itemsList[name] = { quantity: 0, amount: 0, profit: 0 };
        }
        monthlyData[monthKey].itemsList[name].quantity += itm.quantity;
        monthlyData[monthKey].itemsList[name].amount += itm.totalPrice;
        monthlyData[monthKey].itemsList[name].profit += itemProfit;
      });

      const saleProfit = s.netAmount - saleCost;
      monthlyData[monthKey].totalProfit += saleProfit;
    });

    return Object.values(monthlyData)
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [cashierSales, products]);

  // 4. Yearly Reports: Grouped by YYYY (number)
  const yearlyReport = useMemo(() => {
    const yearlyData: Record<number, { year: number; totalAmount: number; itemsCount: number; salesCount: number; totalProfit: number; itemsList: Record<string, { quantity: number; profit: number }> }> = {};

    cashierSales.forEach(s => {
      const year = s.year;
      if (!yearlyData[year]) {
        yearlyData[year] = { year, totalAmount: 0, itemsCount: 0, salesCount: 0, totalProfit: 0, itemsList: {} };
      }
      yearlyData[year].totalAmount += s.netAmount;
      yearlyData[year].salesCount += 1;

      let saleCost = 0;
      s.items.forEach(itm => {
        yearlyData[year].itemsCount += itm.quantity;
        const name = itm.name;

        const matchedProduct = products.find(p => p.id === itm.productId);
        const costPerUnit = matchedProduct ? matchedProduct.costPerUnit : (itm.pricePerUnit * 0.7);
        const itemCost = itm.quantity * costPerUnit;
        const itemProfit = itm.totalPrice - itemCost;
        saleCost += itemCost;

        if (!yearlyData[year].itemsList[name]) {
          yearlyData[year].itemsList[name] = { quantity: 0, profit: 0 };
        }
        yearlyData[year].itemsList[name].quantity += itm.quantity;
        yearlyData[year].itemsList[name].profit += itemProfit;
      });

      const saleProfit = s.netAmount - saleCost;
      yearlyData[year].totalProfit += saleProfit;
    });

    return Object.values(yearlyData)
      .sort((a, b) => b.year - a.year);
  }, [cashierSales, products]);

  // Quick list of active cashiers to swap on view
  const cachedCashierNames = useMemo(() => {
    const set = new Set<string>();
    // Add real registered attendants
    attendants.forEach(a => set.add(a.name));
    // Add any cashier name seen in sales
    sales.forEach(s => {
      if (s.cashier) set.add(s.cashier);
    });
    
    const cashierList = Array.from(set);
    if (isManager) {
      return ["All Attendants", ...cashierList];
    }
    return cashierList;
  }, [sales, attendants, isManager]);

  // ==========================================
  // VIEW FOR THE ATTENDANT (CASHIER RESTRICTION)
  // Only shows list of days and their corresponding total net sales amounts.
  // ==========================================
  if (!isManager) {
    return (
      <div className="space-y-6 font-sans">
        {/* Simple Attendant Header */}
        <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xs flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-5.5 w-5.5 text-blue-400" />
              <span>Shift Sales Registry</span>
            </h1>
            <p className="text-xs text-slate-400">
              Personal shift sales records updated in real-time.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Account Active</div>
            <div className="text-xs font-black text-blue-400 font-mono mt-0.5">{selectedCashier}</div>
          </div>
        </div>

        {/* METRICS ROW FOR ATTENDANT (ONLY TOTAL REVENUE CARD) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-indigo-950 text-white p-5 rounded-2xl shadow-xs relative overflow-hidden border border-indigo-900">
            <div className="absolute right-3 bottom-1 text-white/5 font-bold font-mono text-7xl select-none leading-none -mb-3">
              ₦
            </div>
            <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest font-mono block mb-1">
              My Total Shift Sales
            </span>
            <p className="text-2xl font-black font-mono text-blue-300">₦{statsSummary.totalAmt.toLocaleString()}</p>
            <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-indigo-200">
              <Receipt className="h-3.5 w-3.5 text-blue-300" />
              <span>{statsSummary.transCount} receipts processed</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
                Total Pieces/Units Handled
              </span>
              <p className="text-2xl font-black font-mono text-slate-900 mt-1">
                {statsSummary.itemsCount.toFixed(1).replace('.0', '')} units
              </p>
              <p className="text-[9px] text-slate-500 mt-1">
                Tracked correctly under cashier ID.
              </p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingBag className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* ATTENDANT SIMPLE LIST OF DAILY SALES TOTALS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="border-b pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-blue-600" />
                <span>My Daily Sales Log</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">Click any day to view details of items sold and transactions (excludes profits).</p>
            </div>
            <span className="text-[9px] bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1 rounded font-bold font-mono shrink-0">ACCOUNTING AUDIT</span>
          </div>

          {dailyReport.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="h-10 w-10 text-slate-300 mx-auto mb-2.5" />
              <p className="text-xs">No transaction records found for your shift today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailyReport.map(day => (
                <div key={day.date} className="bg-slate-50/50 hover:bg-slate-50 border border-slate-150 p-4 rounded-xl transition-colors">
                  <div 
                    onClick={() => setExpandedRow(expandedRow === day.date ? null : day.date)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      {expandedRow === day.date ? <ChevronDown className="h-4 w-4 text-blue-650 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                      <span className="font-mono font-black text-sm text-slate-900 uppercase">
                        {new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-3.5 text-[11px] font-mono font-semibold">
                      <span className="text-slate-500">Items Sold: <b className="text-slate-800">{day.itemsCount.toFixed(1).replace('.0', '')}</b></span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500">Receipts: <b className="text-slate-800">{day.salesCount}</b></span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-850 font-black">Sales Total: ₦{day.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {expandedRow === day.date && (
                    <PeriodDrilldownDetails 
                      periodSales={cashierSales.filter(s => s.date === day.date)}
                      products={products}
                      showProfit={false}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW FOR THE MANAGER (COMPLETE ACCESS)
  // Shows full breakdown controls, selecting "All Attendants", sales, items and profits
  // ==========================================
  return (
    <div className="space-y-6 font-sans">
      {/* HEADER CONTROLS SECTION */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="h-5.5 w-5.5 text-blue-600" />
            <span>Staff Account Shift Ledgers</span>
          </h1>
          <p className="text-xs text-slate-500">
            Review detailed sales performance, units, and precise stock profits separately or combined.
          </p>
        </div>

        {/* Cashier profile Selector (For Manager to filter individual or aggregate cashier records) */}
        <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">Select Cashier Account:</span>
          <select
            value={selectedCashier}
            onChange={(e) => setSelectedCashier(e.target.value)}
            className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer font-sans"
          >
            {cachedCashierNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* METRICS ROW (THREE-COLUMN COMPREHENSIVE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CARD 1: REVENUE */}
        <div className="bg-indigo-950 text-white p-5 rounded-2xl shadow-xs relative overflow-hidden">
          <div className="absolute right-3 bottom-1 text-white/5 font-bold font-mono text-7xl select-none leading-none -mb-3">
            ₦
          </div>
          <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest font-mono block mb-1 font-sans">
            {selectedCashier} Sales Turnover
          </span>
          <p className="text-2xl font-black font-mono">₦{statsSummary.totalAmt.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-indigo-200">
            <Receipt className="h-3.5 w-3.5 text-blue-400" />
            <span>Over {statsSummary.transCount} receipts processed</span>
          </div>
        </div>

        {/* CARD 2: PROFITS */}
        <div className="bg-emerald-905 bg-emerald-900 text-white p-5 rounded-2xl shadow-xs relative overflow-hidden">
          <div className="absolute right-3 bottom-1 text-white/5 font-bold font-mono text-7xl select-none leading-none -mb-3">
            ₦
          </div>
          <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-widest font-mono block mb-1 font-sans">
            Calculated Net Profit
          </span>
          <p className="text-2xl font-black font-mono text-emerald-250">₦{statsSummary.totalProfit.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-emerald-200">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
            <span>Average Margin: {statsSummary.totalAmt > 0 ? ((statsSummary.totalProfit / statsSummary.totalAmt) * 100).toFixed(1) : "0"}%</span>
          </div>
        </div>

        {/* CARD 3: ITEMS SOLD */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
              Quantity / Pieces Discharged
            </span>
            <p className="text-2xl font-black font-mono text-slate-900 mt-1">
              {statsSummary.itemsCount.toFixed(1).replace('.0', '')} units
            </p>
            <p className="text-[9px] text-slate-450 mt-1">
              Average of {(statsSummary.itemsCount / (statsSummary.transCount || 1)).toFixed(1)} units per checkout flow
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* METRIC AUDITS (PAYMENT BREAKDOWNS) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
          Payment Settlement Channels
        </span>
        <div className="grid grid-cols-3 gap-2 divide-x divide-slate-100 text-center">
          <div>
            <p className="text-[10px] font-bold text-amber-600 flex items-center justify-center gap-1.5"><Coins className="h-3 w-3" /> Cash Drafts</p>
            <p className="text-sm font-black font-mono text-slate-800 mt-1">₦{statsSummary.cashAmt.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-600 flex items-center justify-center gap-1.5"><CreditCard className="h-3 w-3" /> POS Settlement</p>
            <p className="text-sm font-black font-mono text-slate-800 mt-1">₦{statsSummary.posAmt.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-600 flex items-center justify-center gap-1.5"><Landmark className="h-3 w-3" /> Bank Transfer Wire</p>
            <p className="text-sm font-black font-mono text-slate-800 mt-1">₦{statsSummary.transferAmt.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* DETAILED TIME BREAKDOWN CARD CONTAINER & REPORT TAB BUTTONS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* TAB BUTTONS BAR */}
        <div className="flex flex-wrap border-b border-slate-200 bg-slate-50 p-2.5 gap-1">
          <button
            onClick={() => selectReportTab('daily')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 leading-none ${activeReportTab === 'daily' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-850'}`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Daily Ledger Record</span>
          </button>
          
          <button
            onClick={() => selectReportTab('weekly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 leading-none ${activeReportTab === 'weekly' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-850'}`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Days of the Week Logs</span>
          </button>

          <button
            onClick={() => selectReportTab('monthly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 leading-none ${activeReportTab === 'monthly' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-850'}`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Month-by-Month Audits</span>
          </button>

          <button
            onClick={() => selectReportTab('yearly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 leading-none ${activeReportTab === 'yearly' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-850'}`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Yearly Summary</span>
          </button>
        </div>

        {/* TABS INNER PAGES CONTENT */}
        <div className="p-5 font-sans">
          
          {/* TAB 1: DAILY RECORD */}
          {activeReportTab === 'daily' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Date Listings Breakdown ({dailyReport.length})</span>
                <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-mono font-bold uppercase block">Click row to inspect articles bought and receipts</span>
              </div>

              {dailyReport.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Clock className="h-10 w-10 text-slate-300 mx-auto mb-2.5" />
                  <p className="text-xs font-medium">No daily checkouts saved on this shift ledger yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dailyReport.map(day => (
                    <div key={day.date} className="bg-slate-50/50 hover:bg-slate-50 border border-slate-150 p-4 rounded-xl transition-colors">
                      <div 
                        onClick={() => setExpandedRow(expandedRow === day.date ? null : day.date)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2">
                          {expandedRow === day.date ? <ChevronDown className="h-4 w-4 text-blue-650 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                          <span className="font-mono font-black text-sm text-slate-900 uppercase">
                            {new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 sm:gap-3.5 text-[11px] font-mono font-semibold">
                          <span className="text-slate-500">Items Sold: <b className="text-slate-800">{day.itemsCount.toFixed(1).replace('.0', '')}</b></span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-500">Receipts: <b className="text-slate-800">{day.salesCount}</b></span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-800 font-black">Sales: ₦{day.totalAmount.toLocaleString()}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-emerald-700 font-black">Profit: ₦{day.totalProfit.toLocaleString()}</span>
                        </div>
                      </div>

                      {expandedRow === day.date && (
                        <PeriodDrilldownDetails 
                          periodSales={cashierSales.filter(s => s.date === day.date)}
                          products={products}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DAYS OF THE WEEK RECORD */}
          {activeReportTab === 'weekly' && (
            <div className="space-y-4">
              <div className="mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Weekly Shift Load Balancing</span>
                <p className="text-xs text-slate-500 mt-0.5">Aggregate performance and net profitability grouped by day of the week. Click any day to see details.</p>
              </div>

              <div className="space-y-3">
                {daysOfTheWeekReport.map((day) => {
                  const hasSales = day.salesCount > 0;
                  const rowKey = `weekly-${day.name}`;
                  return (
                    <div key={day.name} className={`border p-4 rounded-xl transition-all ${hasSales ? 'border-indigo-100 bg-indigo-50/10 hover:bg-indigo-50/20' : 'border-slate-150 bg-slate-50/20'}`}>
                      <div 
                        onClick={() => hasSales && setExpandedRow(expandedRow === rowKey ? null : rowKey)}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${hasSales ? 'cursor-pointer select-none' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          {hasSales && (expandedRow === rowKey ? <ChevronDown className="h-4 w-4 text-blue-650 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />)}
                          <span className="font-bold text-sm text-slate-900 font-display">{day.name}s</span>
                          <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded leading-none ${hasSales ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                            {day.salesCount} Checkouts
                          </span>
                        </div>
                        
                        {hasSales ? (
                          <div className="flex flex-wrap items-center gap-3.5 text-xs font-mono font-semibold">
                            <span className="text-slate-500">Gross Sales: <b className="text-slate-850 font-bold">₦{day.totalAmount.toLocaleString()}</b></span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-500">Pieces: <b className="text-slate-850 font-bold">{day.itemsCount.toFixed(1).replace('.0', '')} pcs</b></span>
                            <span className="text-slate-300">|</span>
                            <span className="text-emerald-700 font-black">Net Profit: ₦{day.totalProfit.toLocaleString()}</span>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">No historical data recorded for {day.name}s on this shift profile.</p>
                        )}
                      </div>

                      {hasSales && expandedRow === rowKey && (
                        <PeriodDrilldownDetails 
                          periodSales={cashierSales.filter(s => new Date(s.date).getDay() === day.dayIndex)}
                          products={products}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: MONTHLY RECORD */}
          {activeReportTab === 'monthly' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Monthly Audits History</span>
                <span className="text-[9px] text-emerald-650 font-bold bg-emerald-50 px-2 py-0.5 rounded uppercase font-mono">Month-by-month sales & profits performance. Click to inspect details.</span>
              </div>

              {monthlyReport.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <BarChart2 className="h-10 w-10 text-slate-300 mx-auto mb-2.5" />
                  <p className="text-xs font-semibold">No monthly totals available yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyReport.map(month => (
                    <div key={month.monthKey} className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl overflow-hidden shadow-xs transition-shadow">
                      <div 
                        onClick={() => setExpandedRow(expandedRow === month.monthKey ? null : month.monthKey)}
                        className="bg-slate-900 text-white px-4.5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2">
                          {expandedRow === month.monthKey ? <ChevronDown className="h-4 w-4 text-blue-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                          <span className="font-bold text-sm tracking-wide">{month.name}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono">
                          <span>Qty Sold: <b>{month.itemsCount}</b></span>
                          <span>•</span>
                          <span>Receipts: <b>{month.salesCount}</b></span>
                          <span>•</span>
                          <span className="text-slate-100"> Turnover: <b>₦{month.totalAmount.toLocaleString()}</b></span>
                          <span>•</span>
                          <span className="text-green-400 font-black font-mono">Net Profit: ₦{month.totalProfit.toLocaleString()}</span>
                        </div>
                      </div>

                      {expandedRow === month.monthKey && (
                        <div className="p-4 bg-slate-950">
                          <PeriodDrilldownDetails 
                            periodSales={cashierSales.filter(s => s.month === month.monthKey)}
                            products={products}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: YEARLY SUMMARY */}
          {activeReportTab === 'yearly' && (
            <div className="space-y-4">
              <div className="mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Shift Ledger Fiscal Year Breakdown</span>
                <p className="text-xs text-slate-500 mt-0.5 font-sans">Compare overall cashier discharge, baskets, sales totals, and profits by calendar year. Click to expand audit details.</p>
              </div>

              {yearlyReport.length === 0 ? (
                <div className="text-center py-12 text-slate-405">
                  <TrendingUp className="h-10 w-10 text-slate-300 mx-auto mb-2.5" />
                  <p className="text-xs">No yearly metrics recorded for this store account.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {yearlyReport.map(yr => {
                    const rowKey = `yearly-${yr.year}`;
                    return (
                      <div key={yr.year} className="bg-white border-2 border-slate-150 p-5 rounded-2xl space-y-4">
                        <div 
                          onClick={() => setExpandedRow(expandedRow === rowKey ? null : rowKey)}
                          className="border-b pb-3 flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2">
                            {expandedRow === rowKey ? <ChevronDown className="h-5 w-5 text-blue-650 shrink-0" /> : <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />}
                            <span className="text-lg font-black font-mono text-slate-900">{yr.year} Financials</span>
                          </div>
                          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold font-mono rounded-lg">Fiscal Audited</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-605 bg-slate-50 p-4 rounded-xl border border-slate-150">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Transactions</span>
                            <span className="font-mono text-slate-900 font-extrabold text-sm">{yr.salesCount} times</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Discharged Qty</span>
                            <span className="font-mono text-slate-900 font-extrabold text-sm">{yr.itemsCount.toFixed(1).replace('.0', '')} pcs</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Yearly Turnover</span>
                            <span className="font-mono text-slate-900 font-extrabold text-sm">₦{yr.totalAmount.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-emerald-600 uppercase font-mono block">Net Audited Profit</span>
                            <span className="font-mono text-emerald-600 font-black text-sm">₦{yr.totalProfit.toLocaleString()}</span>
                          </div>
                        </div>

                        {expandedRow === rowKey && (
                          <PeriodDrilldownDetails 
                            periodSales={cashierSales.filter(s => s.year === yr.year)}
                            products={products}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
