import React, { useState } from "react";
import { 
  User, Search, Plus, Calendar, Mail, Phone, ShoppingBag, Coins, 
  Trash2, Edit, ChevronRight, FileSpreadsheet, X, Gift, Sparkles, TrendingUp
} from "lucide-react";
import { Customer, Sale } from "../types";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { 
  createCustomerInFirestore, 
  updateCustomerInFirestore, 
  deleteCustomerInFirestore 
} from "../services/firestoreService";

interface CustomersProps {
  customers: Customer[];
  sales: Sale[];
  refreshData: () => void;
}

// Authentic WhatsApp Brand Icon SVG
function WhatsAppIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
      aria-hidden="true"
    >
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

export default function Customers({ customers, sales, refreshData }: CustomersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Fields state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  
  // Filter sales for the selected customer
  const customerSales = sales.filter(s => s.customerId === selectedCustomerId);

  // Group customer purchases by month for charting
  const customerMonthlySummary = React.useMemo(() => {
    if (!selectedCustomerId) return [];
    
    const monthlyData: Record<string, number> = {};
    // Ensure last 5 readable months are filled or at least active months
    customerSales.forEach(s => {
      const month = s.month; // YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + s.netAmount;
    });

    return Object.entries(monthlyData)
      .map(([month, spent]) => ({ month, spent }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [selectedCustomerId, customerSales]);

  // Group individual items bought by customer
  const allPurchasedItems = React.useMemo(() => {
    if (!selectedCustomer) return [];
    
    const itemsList: Array<{
      name: string;
      quantity: number;
      pricePerUnit: number;
      totalPrice: number;
      date: string;
      receiptNo: string;
    }> = [];

    // 1. Gather custom items bought from dynamic customer purchasedItems field
    if (selectedCustomer.purchasedItems) {
      selectedCustomer.purchasedItems.forEach(itm => {
        itemsList.push({
          name: itm.name,
          quantity: itm.quantity,
          pricePerUnit: itm.pricePerUnit,
          totalPrice: itm.totalPrice,
          date: itm.date,
          receiptNo: itm.receiptNo
        });
      });
    }

    // 2. Backwards compatibility: Fallback to resolve items from local sales list if empty or legacy
    if (itemsList.length === 0) {
      customerSales.forEach(sale => {
        sale.items.forEach(itm => {
          itemsList.push({
            name: itm.name,
            quantity: itm.quantity,
            pricePerUnit: itm.pricePerUnit,
            totalPrice: itm.totalPrice,
            date: sale.date,
            receiptNo: sale.receiptNo
          });
        });
      });
    }

    // Sort by date descending
    return itemsList.sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedCustomer, customerSales]);

  const openAddModal = () => {
    setEditMode(false);
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setLoyaltyPoints(0);
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditMode(true);
    setEditingId(c.id);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email);
    setNotes(c.notes);
    setLoyaltyPoints(c.loyaltyPoints);
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Customer name is required!");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const payload = { name, phone, email, notes, loyaltyPoints };

    try {
      if (editMode && editingId) {
        await updateCustomerInFirestore(editingId, payload);
      } else {
        await createCustomerInFirestore({
          name,
          phone,
          email,
          notes,
          loyaltyPoints,
          createdAt: new Date().toISOString(),
          purchaseCount: 0,
          totalSpent: 0
        });
      }

      try {
        const url = editMode ? `/api/customers/${editingId}` : "/api/customers";
        const method = editMode ? "PUT" : "POST";
        await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch {}

      setModalOpen(false);
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save customer data.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this customer record? This will archive their loyalty card points.")) return;
    
    try {
      await deleteCustomerInFirestore(id);
      try {
        await fetch(`/api/customers/${id}`, { method: "DELETE" });
      } catch {}
      if (selectedCustomerId === id) setSelectedCustomerId(null);
      refreshData();
    } catch (e) {
      console.error("Delete customer failure", e);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
      
      {/* LEFT COLUMN: LIST OF CUSTOMERS (COL-5) */}
      <div className="lg:col-span-12 xl:col-span-5 space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/80 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              id="customer-search"
              placeholder="Search customer name, phone or email..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg transition-all flex items-center gap-1 text-xs font-bold font-display shadow-sm shadow-blue-500/10 shrink-0"
          >
            <Plus className="h-4 w-4" /> Add Record
          </button>
        </div>

        {/* CUSTOMERS ROSTER */}
        <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
          {filteredCustomers.map((c) => {
            const isSelected = selectedCustomerId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCustomerId(c.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left flex items-center justify-between group ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50/20 shadow-sm' 
                    : 'border-slate-200 bg-white hover:border-slate-350'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm transition-transform ${
                    isSelected ? 'bg-blue-600 text-white scale-105' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {c.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs font-display">{c.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono font-medium">{c.phone || "No phone corded"}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-450">
                      <span className="flex items-center gap-0.5 text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                        <Coins className="h-3 w-3" /> {c.loyaltyPoints} pts
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-slate-600">{c.purchaseCount || 0} purchases</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-100 lg:opacity-20 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(c); }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg"
                    title="Edit Customer"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg"
                    title="Delete Record"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            );
          })}

          {filteredCustomers.length === 0 && (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <User className="mx-auto h-8 w-8 text-slate-350" />
              <h3 className="mt-2 text-xs font-semibold text-slate-900 font-display">No customers cataloged</h3>
              <p className="mt-1 text-[11px] text-slate-500">Add a profile to keep record of their periodic soft drinks & frozen kgs orders.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: DETAILS DRAWER & HISTORIC ORDERS (COL-7) */}
      <div className="lg:col-span-12 xl:col-span-7">
        {selectedCustomer ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-150">
            {/* Header info card */}
            <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex gap-4 items-center">
                <div className="h-12 w-12 bg-[#0F172A] text-white font-extrabold text-base rounded-xl flex items-center justify-center font-display">
                  {selectedCustomer.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold font-display text-slate-900 text-sm tracking-tight leading-none mb-1.5">{selectedCustomer.name}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-slate-550 font-mono flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      <Phone className="h-3 w-3 text-slate-400" /> {selectedCustomer.phone || "N/A"}
                    </span>
                    {selectedCustomer.phone && (
                      <a
                        href={`https://wa.me/${selectedCustomer.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold bg-[#25D366] hover:bg-[#20ba59] text-white px-2 py-0.5 rounded-md flex items-center gap-1 transition-all active:scale-95 shadow-xs"
                        title="Chat on WhatsApp"
                      >
                        <WhatsAppIcon className="h-3 w-3" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {selectedCustomer.email && (
                      <span className="text-[10px] text-slate-550 font-mono flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        <Mail className="h-3 w-3 text-slate-400" /> {selectedCustomer.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Reward stats */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center gap-3 w-full sm:w-auto shrink-0">
                <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <Gift className="h-5 w-5 animate-bounce" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-amber-800 tracking-wider">Loyalty Rewards Card</p>
                  <p className="text-xs font-black font-mono text-amber-950">{selectedCustomer.loyaltyPoints} points</p>
                </div>
              </div>
            </div>

            {/* Quick stats grid */}
            <div className="p-4 grid grid-cols-3 gap-3.5 text-center bg-slate-50/30">
              <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Revenue Spent</p>
                <p className="font-mono font-black text-xs text-slate-900 mt-1">
                  ₦{(selectedCustomer.totalSpent || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Purchases</p>
                <p className="font-mono font-black text-xs text-slate-900 mt-1">
                  {selectedCustomer.purchaseCount || 0} times
                </p>
              </div>
              <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg Order Value</p>
                <p className="font-mono font-black text-xs text-blue-700 mt-1">
                  ₦{selectedCustomer.purchaseCount ? Math.round(selectedCustomer.totalSpent / selectedCustomer.purchaseCount).toLocaleString() : 0}
                </p>
              </div>
            </div>

            {/* Loyalty and sales trends chart */}
            <div className="p-5 bg-white">
              <h4 className="font-bold text-[10px] uppercase text-slate-400 tracking-wider flex items-center gap-1.5 mb-3.5">
                <TrendingUp className="h-3.5 w-3.5 text-slate-500" /> Purchase Outlays Trend (Monthly)
              </h4>
              {customerMonthlySummary.length > 0 ? (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={customerMonthlySummary}>
                      <defs>
                        <linearGradient id="customerIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#94a3b8" 
                        fontSize={9} 
                        tickLine={false} 
                        fontFamily="monospace"
                        fontValue="semibold"
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false}
                        fontFamily="monospace"
                        tickFormatter={(v) => `₦${v/1000}k`}
                      />
                      <Tooltip 
                        contentStyle={{ fontSize: 11, borderRadius: 12, fontFamily: "sans-serif", border: "1px solid #cbd5e1" }}
                        formatter={(value: any) => [`₦${Number(value).toLocaleString()}`, "Spent"]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="spent" 
                        stroke="#2563eb" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#customerIncome)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  Not enough historical purchase points to outline a chart. Completing POS sales will populate this layout.
                </div>
              )}
            </div>

            {/* Customer Notes */}
            <div className="p-4 bg-slate-50 text-xs border-t border-slate-200">
              <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block mb-1">Customer Internal Notes</span>
              <p className="text-slate-600 leading-relaxed italic">
                {selectedCustomer.notes || "No custom briefing recorded for this customer yet."}
              </p>
            </div>

            {/* Historical receipts */}
            <div className="p-5 space-y-3.5">
              <h4 className="font-bold text-[10px] uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5 text-slate-500" /> Historic Purchase Records ({customerSales.length})
              </h4>

              <div className="divide-y divide-slate-150 max-h-[220px] overflow-y-auto font-sans pr-1">
                {customerSales.map((sale) => (
                  <div key={sale.id} className="py-3 flex items-center justify-between text-xs group">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-800">{sale.receiptNo}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          sale.paymentMethod === 'cash' ? 'bg-amber-100 text-amber-800' :
                          sale.paymentMethod === 'pos' ? 'bg-blue-100 text-blue-850' : 'bg-indigo-100 text-indigo-850'
                        }`}>
                          {sale.paymentMethod}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-1 flex items-center flex-wrap gap-1">
                        <span>{sale.date} • {sale.items.length} item types</span>
                        {sale.cashier && (
                          <span className="text-indigo-655 bg-indigo-50/70 py-0.5 px-1 rounded text-[8px] font-bold tracking-wider leading-none">
                            BY {sale.cashier.split(' ')[0].toUpperCase()}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono font-black text-slate-900">₦{sale.netAmount.toLocaleString()}</p>
                      <p className="text-[9px] text-blue-600 font-mono mt-0.5">+{sale.pointsEarned} loyalty pts</p>
                    </div>
                  </div>
                ))}

                {customerSales.length === 0 && (
                  <div className="text-center py-6 text-slate-450 text-xs">
                    No individual sales have been checked out under this customer card.
                  </div>
                )}
              </div>
            </div>

            {/* Bought Goods & Price Log */}
            <div className="p-5 border-t border-slate-150 space-y-3">
              <h4 className="font-bold text-[10px] uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" /> Bought Goods & Price Log ({allPurchasedItems.length})
              </h4>

              <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto font-sans pr-1">
                {allPurchasedItems.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/50 rounded-lg px-1">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-450 font-mono mt-0.5">
                        {item.date} • {item.receiptNo}
                      </div>
                    </div>
                    <div className="text-right ml-4 shrink-0 font-mono font-bold">
                      <div className="text-slate-900">₦{item.totalPrice.toLocaleString()}</div>
                      <div className="text-[9px] text-slate-400 font-normal">
                        {item.quantity} pcs @ ₦{item.pricePerUnit.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}

                {allPurchasedItems.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No items recorded yet on this customer file.
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-slate-50 p-16 text-center rounded-2xl border border-dashed border-slate-200">
            <User className="mx-auto h-12 w-12 text-slate-350 animate-pulse" />
            <h3 className="mt-2 text-sm font-semibold text-slate-900 font-display">Client Detailed Files</h3>
            <p className="mt-1 text-xs text-slate-500">Pick any customer card on the left list to view phone coordinates, lifetime sales charts, and transaction ledger logs.</p>
          </div>
        )}
      </div>

      {/* CREATE & EDIT CUSTOMER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 font-sans my-auto">
            <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm tracking-wide font-display">
                {editMode ? "Modify Customer Record" : "Add Customer Record"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden text-xs">
              <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
                
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">Full Name *</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 font-sans"
                    placeholder="e.g. Amina Bello"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">Phone Number</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 font-mono"
                      placeholder="e.g. +234 803 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">E-mail Address</label>
                    <input
                      type="email"
                      className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 font-sans"
                      placeholder="e.g. name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block font-mono">Starter Loyalty Bonus Points (Points)</label>
                  <input
                    type="number"
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 font-mono"
                    placeholder="e.g. 50"
                    value={loyaltyPoints || ""}
                    onChange={(e) => setLoyaltyPoints(Math.max(0, Number(e.target.value)))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">Notes & Wholesale Preferences</label>
                  <textarea
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 font-sans h-20"
                    placeholder="e.g. Buys in bulk crates, soft drinks vendor..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {errorMsg && (
                  <div className="bg-red-50 text-red-750 p-2.5 rounded-lg font-bold border border-red-200 text-[11px]">
                    {errorMsg}
                  </div>
                )}
              </div>

              <div className="p-4 flex gap-2 justify-end border-t border-slate-150 bg-slate-50/90 backdrop-blur-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="border border-slate-200 hover:bg-slate-100 bg-white text-slate-600 px-4 py-2 rounded-lg font-bold cursor-pointer shadow-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold shadow-xs active:scale-98 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Record"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
