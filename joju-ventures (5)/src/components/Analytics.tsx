import React, { useState, useEffect } from "react";
import { 
  TrendingUp, Calendar, FileSpreadsheet, ListFilter, CreditCard, 
  Wallet, Landmark, Receipt, Sparkles, RefreshCw, Layers
} from "lucide-react";
import { Sale, Product } from "../types";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, Legend
} from "recharts";

interface AnalyticsProps {
  sales: Sale[];
  products: Product[];
}

interface FinancialData {
  summary: {
    totalRevenue: number;
    totalCostOfGoods: number;
    totalProfit: number;
    totalSalesCount: number;
    totalCustomersCount: number;
  };
  topProducts: Array<{ name: string; category: string; quantitySold: number; revenue: number; cost: number; profit: number }>;
  financialHistory: Array<{ month: string; revenue: number; cost: number; profit: number; count: number }>;
}

export default function Analytics({ sales, products }: AnalyticsProps) {
  const [financials, setFinancials] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'pos' | 'transfer'>('all');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports").catch(() => null);
      if (res?.ok && res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json().catch(() => null);
        if (data) setFinancials(data);
        else throw new Error("Fallback to client calculation");
      } else {
        // Dynamic client-side P&L computation fallback (Netlify / Static mode)
        const totalRevenue = sales.reduce((sum, s) => sum + s.netAmount, 0);
        const totalCost = sales.reduce((sum, s) => {
          const saleCost = s.items.reduce((itemSum, i) => {
            const prod = products.find(p => p.id === i.productId || p.name === i.name);
            const unitCost = prod ? prod.costPerUnit : i.pricePerUnit * 0.7;
            return itemSum + (unitCost * i.quantity);
          }, 0);
          return sum + saleCost;
        }, 0);
        const totalProfit = totalRevenue - totalCost;

        setFinancials({
          overview: {
            totalRevenue,
            totalCost,
            totalProfit,
            totalSalesCount: sales.length,
            averageTicketValue: sales.length > 0 ? totalRevenue / sales.length : 0
          },
          topProducts: [],
          financialHistory: []
        });
      }
    } catch (e) {
      console.error("Fetch financial statistics failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [sales, products]); // reload when checkout transactions or admin updates trigger

  // Compute Payment methods counts for the visual summary
  const paymentMethodsStats = React.useMemo(() => {
    const methods = { cash: 0, pos: 0, transfer: 0, opay: 0 };
    sales.forEach(s => {
      if (s.paymentMethod in methods) {
        methods[s.paymentMethod as 'cash' | 'pos' | 'transfer' | 'opay'] += s.netAmount;
      }
    });
    return [
      { name: "Cash 💵", value: methods.cash, color: "#f59e0b" },
      { name: "POS Terminal 💳", value: methods.pos, color: "#0ea5e9" },
      { name: "Bank Transfer 🏦", value: methods.transfer, color: "#10b981" },
      { name: "Pay with OPay 🟢", value: methods.opay, color: "#00B875" }
    ];
  }, [sales]);

  // Filter local sales matching filters
  const filteredSales = sales.filter(s => paymentFilter === 'all' || s.paymentMethod === paymentFilter);

  if (loading || !financials) {
    return (
      <div className="py-24 text-center space-y-4">
        <RefreshCw className="h-10 w-10 text-emerald-600 animate-spin mx-auto animate-reverse" />
        <p className="text-sm font-semibold text-gray-500 font-sans">Compiling financial ledger audits...</p>
      </div>
    );
  }

  const { summary, topProducts, financialHistory } = financials;

  return (
    <div className="space-y-6 font-sans">
      
      {/* LEDGER STATS COUNTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-405 uppercase tracking-widest font-mono">Gross Sales Turnover</p>
            <p className="text-xl font-black font-mono text-slate-905 mt-1">₦{summary.totalRevenue.toLocaleString()}</p>
            <p className="text-[9px] text-slate-450 mt-1 font-bold">₦{summary.totalSalesCount} registered checkout receipts</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-700">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-405 uppercase tracking-widest font-mono">Costs of Goods Sold (COGS)</p>
            <p className="text-xl font-black font-mono text-slate-905 mt-1">₦{summary.totalCostOfGoods.toLocaleString()}</p>
            <p className="text-[9px] text-slate-400 mt-1 font-medium">Acquisition value of sold inventory</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-red-650">
            <Layers className="h-6 w-6 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-405 uppercase tracking-widest font-mono">Net Accounting Profits</p>
            <p className="text-xl font-black font-mono text-blue-750 mt-1">₦{summary.totalProfit.toLocaleString()}</p>
            <span className="text-[9px] text-blue-750 font-bold bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block font-mono">
              {summary.totalRevenue ? Math.round((summary.totalProfit / summary.totalRevenue) * 105) : 0}% Net Margins
            </span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-605">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Average Basket Value</p>
            <p className="text-xl font-black font-mono text-slate-905 mt-1">
              ₦{summary.totalSalesCount ? Math.round(summary.totalRevenue / summary.totalSalesCount).toLocaleString() : 0}
            </p>
            <p className="text-[9px] text-slate-400 mt-1 font-medium">Mean spent size per receipt roll</p>
          </div>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-800">
            <Receipt className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* CHARTS ANALYSIS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* MONTHLY REVENUE & COGS AREA CHART (COL-8) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-205 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold font-display text-slate-905 text-sm flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-blue-600" /> Historic Store Ledger Performance (Monthly P&L Statement)
            </h4>
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-widest font-mono">2026 Fiscal Cycle</span>
          </div>

          <div className="h-60 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} fontFamily="monospace" />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v/1000}k`} fontFamily="monospace" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#2563EB" strokeWidth={2.5} fillOpacity={0.06} fill="#2563EB" />
                <Area type="monotone" dataKey="cost" name="COGS (Expenses)" stroke="#ef4444" strokeWidth={1.5} fillOpacity={0.02} fill="#ef4444" />
                <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#4F46E5" strokeWidth={3} fillOpacity={0.08} fill="#4F46E5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PAYMENT METHOD SPREAD BAR CHART (COL-4) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-205 shadow-sm space-y-4">
          <h4 className="font-bold font-display text-slate-905 text-sm flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-blue-600" /> Payment Methods Yields
          </h4>
          <p className="text-[10px] text-slate-450 leading-relaxed font-sans">Turnover generated broken down by client checkout channels.</p>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentMethodsStats}>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v/1000}k`} />
                <Tooltip formatter={(value) => `₦${Number(value).toLocaleString()}`} />
                <Bar dataKey="value" name="Volume Handled" radius={[8, 8, 0, 0]}>
                  {paymentMethodsStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3B82F6' : index === 1 ? '#4F46E5' : '#0EA5E9'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* TOP SELLING PRODUCTS ANALYSIS */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-205 shadow-sm space-y-4">
          <h4 className="font-bold font-display text-slate-905 text-sm">
            🔥 Product Sales Rankings
          </h4>
          <p className="text-[10px] text-slate-400 font-sans">Inventory rankings structured by yield revenue and volumes sold in room store.</p>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {topProducts.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-150">
                <div>
                  <h5 className="font-bold text-slate-900 font-display text-xs">{p.name}</h5>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 font-mono">
                    <span className="bg-white border border-slate-205 px-1.5 py-0.5 rounded font-semibold text-blue-700">Sold: {p.quantitySold} {p.name.includes("Sachet") ? 'bag' : p.name.includes("Water") || p.name.includes("Coke") || p.name.includes("Pepsi") || p.name.includes("Malt") || p.name.includes("Fanta") ? 'pcs' : 'kg'}</span>
                    <span>·</span>
                    <span>Margin: ₦{Math.round(p.profit / p.quantitySold).toLocaleString()}/unit</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <p className="font-bold text-slate-900">₦{p.revenue.toLocaleString()}</p>
                  <p className="text-[9px] text-blue-600 font-bold">₦{p.profit.toLocaleString()} markups</p>
                </div>
              </div>
            ))}

            {topProducts.length === 0 && (
              <div className="text-center py-12 text-slate-450 text-xs font-semibold">
                No stock volumes checked out yet.
              </div>
            )}
          </div>
        </div>

        {/* RECENT HISTORIC SALES BOOK LEDGERS */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-205 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="font-bold font-display text-slate-905 text-sm flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" /> Historic Auditing Register Logs
            </h4>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border text-[10px] font-bold font-sans">
              <button onClick={() => setPaymentFilter('all')} className={`px-2.5 py-1 rounded-md transition-all ${paymentFilter === 'all' ? 'bg-white shadow-xs text-slate-900 font-extrabold' : 'text-slate-500'}`}>All</button>
              <button onClick={() => setPaymentFilter('cash')} className={`px-2.5 py-1 rounded-md transition-all ${paymentFilter === 'cash' ? 'bg-white shadow-xs text-blue-805 font-extrabold' : 'text-slate-500'}`}>Cash</button>
              <button onClick={() => setPaymentFilter('pos')} className={`px-2.5 py-1 rounded-md transition-all ${paymentFilter === 'pos' ? 'bg-white shadow-xs text-indigo-850 font-extrabold' : 'text-slate-500'}`}>POS Card</button>
              <button onClick={() => setPaymentFilter('transfer')} className={`px-2.5 py-1 rounded-md transition-all ${paymentFilter === 'transfer' ? 'bg-white shadow-xs text-cyan-850 font-extrabold' : 'text-slate-500'}`}>Transfer</button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[300px] divide-y divide-slate-150 pr-1">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-xs">{sale.receiptNo}</span>
                    <span className="text-slate-400 font-mono text-[9px]">{sale.date}</span>
                    <span className={`px-2 py-0.2 rounded text-[8px] font-bold uppercase tracking-widest ${
                      sale.paymentMethod === 'cash' ? 'bg-blue-50 text-blue-800 border border-blue-105' :
                      sale.paymentMethod === 'pos' ? 'bg-indigo-50 text-indigo-805 border border-indigo-105' : 'bg-cyan-50 text-cyan-850 border border-cyan-105'
                    }`}>
                      {sale.paymentMethod}
                    </span>
                  </div>
                  
                  {/* Detailed inline items listing to show amount & kg bought */}
                  <div className="text-[10px] text-slate-500 mt-1 font-sans flex flex-wrap gap-1 leading-relaxed">
                    <span className="text-slate-405 font-bold mr-1 font-mono uppercase text-[9px] tracking-wider">Products: </span>
                    {sale.items.map((i, k) => (
                      <span key={k} className="bg-slate-50 text-slate-700 border border-slate-150 px-1.5 py-0.2 rounded font-medium text-[10px]">
                        {i.name} ({i.quantity}{i.name.includes("Sachet") ? 'bag' : i.name.includes("Coke") || i.name.includes("Fanta") || i.name.includes("Pepsi") || i.name.includes("Malt") || i.name.includes("Water") ? 'pcs' : 'kg'})
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium font-sans mt-1">
                    Client: <span className="font-bold text-slate-700">{sale.customerName}</span>
                    {sale.cashier && (
                      <>
                        <span className="mx-1.5 text-slate-305">•</span>
                        Cashier: <span className="font-bold text-indigo-700 bg-indigo-50/70 px-1.5 py-0.5 rounded text-[8px] tracking-wide">{sale.cashier}</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="text-right min-w-[100px]">
                  <p className="font-mono font-black text-slate-900 text-sm">₦{sale.netAmount.toLocaleString()}</p>
                  {sale.discountAmount > 0 && <p className="text-[10px] text-amber-600 font-mono">Discount: -₦{sale.discountAmount.toLocaleString()}</p>}
                </div>
              </div>
            ))}

            {filteredSales.length === 0 && (
              <div className="text-center py-16 text-slate-405 text-xs font-sans">
                No logs matching checkout configurations exist in standard files.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
