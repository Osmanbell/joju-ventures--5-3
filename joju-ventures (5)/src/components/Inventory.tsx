import React, { useState } from "react";
import { 
  Package, Search, Plus, Filter, AlertTriangle, Edit2, Trash2, 
  Sparkles, CheckCircle, RefreshCw, X, ArrowUpRight, TrendingUp, Info,
  Upload, Image as ImageIcon, Camera
} from "lucide-react";
import { Product } from "../types";
import { 
  createProductInFirestore, 
  updateProductInFirestore, 
  deleteProductInFirestore 
} from "../services/firestoreService";

interface InventoryProps {
  products: Product[];
  refreshData: () => void;
}

export default function Inventory({ products, refreshData }: InventoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'frozen_foods' | 'soft_drinks'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modal open triggers
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState<'frozen_foods' | 'soft_drinks'>('frozen_foods');
  const [unit, setUnit] = useState<'kg' | 'pcs' | 'bag' | 'crate' | 'pack'>('kg');
  const [pricePerUnit, setPricePerUnit] = useState<number>(0);
  const [costPerUnit, setCostPerUnit] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [minStockLevel, setMinStockLevel] = useState<number>(10);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Quick replenish states
  const [replenishModalOpen, setReplenishModalOpen] = useState(false);
  const [replenishId, setReplenishId] = useState<string | null>(null);
  const [amountToReplenish, setAmountToReplenish] = useState<number>(50);

  // Process uploaded image with lightweight compression
  const processAndSetImage = (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }
    setImageUploading(true);
    setErrorMsg("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDimension = 500;
        let { width, height } = img;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
          setImageUrl(compressedDataUrl);
        } else {
          setImageUrl(e.target?.result as string);
        }
        setImageUploading(false);
      };
      img.onerror = () => {
        setImageUploading(false);
        setErrorMsg("Failed to process image.");
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setImageUploading(false);
      setErrorMsg("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndSetImage(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndSetImage(file);
    }
  };

  // Filter products matching constraints
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
    
    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = p.stockQuantity <= p.minStockLevel && p.stockQuantity > 0;
    } else if (stockFilter === 'out') {
      matchesStock = p.stockQuantity <= 0;
    }

    return matchesSearch && matchesCat && matchesStock;
  });

  // Totals calculations
  const totalStockItemsValue = products.reduce((acc, p) => acc + (p.stockQuantity * p.pricePerUnit), 0);
  const totalStockItemsCost = products.reduce((acc, p) => acc + (p.stockQuantity * p.costPerUnit), 0);
  const estimatedPotentialProfit = totalStockItemsValue - totalStockItemsCost;
  const criticalLowItems = products.filter(p => p.stockQuantity <= p.minStockLevel).length;

  const openAddModal = () => {
    setEditMode(false);
    setName("");
    setCategory("frozen_foods");
    setUnit("kg");
    setPricePerUnit(0);
    setCostPerUnit(0);
    setStockQuantity(0);
    setMinStockLevel(10);
    setDescription("");
    setImageUrl("");
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditMode(true);
    setEditingId(p.id);
    setName(p.name);
    setCategory(p.category);
    setUnit(p.unit);
    setPricePerUnit(p.pricePerUnit);
    setCostPerUnit(p.costPerUnit);
    setStockQuantity(p.stockQuantity);
    setMinStockLevel(p.minStockLevel);
    setDescription(p.description);
    setImageUrl(p.imageUrl || "");
    setErrorMsg("");
    setModalOpen(true);
  };

  const openReplenishModal = (p: Product) => {
    setReplenishId(p.id);
    setAmountToReplenish(25);
    setReplenishModalOpen(true);
  };

  const handleDelete = async (id: string, prodName: string) => {
    if (!confirm(`Are you absolutely sure you want to delete ${prodName}? This deletes its catalog entry and will not affect historic sales report ledgers.`)) return;

    try {
      await deleteProductInFirestore(id);
      try {
        await fetch(`/api/products/${id}`, { method: "DELETE" });
      } catch {}
      refreshData();
    } catch (e) {
      console.error("Delete product failure", e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Product title is required!");
      return;
    }
    if (pricePerUnit <= 0 || costPerUnit <= 0) {
      setErrorMsg("Price & Cost points must be positive numeric figures.");
      return;
    }
    if (pricePerUnit < costPerUnit) {
      if (!confirm("Your retail selling price is lower than the wholesale cost per unit. Do you still wish to submit this under negative profit?")) {
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg("");

    const payload = {
      name,
      category,
      unit,
      pricePerUnit,
      costPerUnit,
      stockQuantity,
      minStockLevel,
      description,
      imageUrl: imageUrl.trim() || undefined
    };

    try {
      if (editMode && editingId) {
        await updateProductInFirestore(editingId, payload);
      } else {
        await createProductInFirestore(payload);
      }

      // Secondary optional backup call to server API
      try {
        const url = editMode ? `/api/products/${editingId}` : "/api/products";
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
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplenish = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id === replenishId);
    if (!product) return;

    const newStock = product.stockQuantity + Number(amountToReplenish);

    try {
      await updateProductInFirestore(replenishId, { stockQuantity: newStock });
      try {
        await fetch(`/api/products/${replenishId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stockQuantity: newStock })
        });
      } catch {}

      setReplenishModalOpen(false);
      refreshData();
    } catch (err) {
      console.error("Replenishment put command failed", err);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Total Shelf Valuation</p>
          <p className="text-xl font-black font-mono text-slate-900 mt-1">₦{totalStockItemsValue.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
            <Info className="h-3 w-3 text-slate-400" /> Retail valuation of active stocks
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Acquisition Costs Value</p>
          <p className="text-xl font-black font-mono text-slate-900 mt-1">₦{totalStockItemsCost.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1">Capital active on room shelves</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Unrealized Profit Margin</p>
          <p className="text-xl font-black font-mono text-blue-750 mt-1">₦{estimatedPotentialProfit.toLocaleString()}</p>
          <span className="text-[10px] text-blue-750 font-bold bg-blue-50 px-2 py-0.5 rounded font-mono mt-1 inline-block">
            {totalStockItemsCost ? Math.round((estimatedPotentialProfit / totalStockItemsCost) * 105) : 0}% markup ROI
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Restock Alerts Triggered</p>
          <p className={`text-xl font-black font-mono mt-1 ${criticalLowItems > 0 ? 'text-amber-600' : 'text-blue-750'}`}>
            {criticalLowItems} types
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Stocks falling below limits</p>
        </div>
      </div>

      {/* FILTER CONTROL BAR */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            id="inventory-search"
            placeholder="Search stock code or product name..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-sans outline-none text-slate-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {/* Category Select Filter */}
          <select
            id="cat-select-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-lg p-2.5 outline-none text-slate-705 font-sans"
          >
            <option value="all">All Categories</option>
            <option value="frozen_foods">Frozen Foods Only</option>
            <option value="soft_drinks">Soft Drinks Only</option>
          </select>

          {/* Stock Alerts Filter */}
          <select
            id="stock-select-filter"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className={`border rounded-lg p-2.5 outline-none font-sans ${
              stockFilter !== 'all' ? 'border-amber-500 bg-amber-50 text-amber-805' : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">All Stock Statuses</option>
            <option value="low">⚠️ Low Stock Alerts</option>
            <option value="out">🛑 Out of Stock Entries</option>
          </select>

          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm shadow-blue-500/10 ml-auto font-display text-xs"
          >
            <Plus className="h-4 w-4" /> Add Food/Drink stock
          </button>
        </div>
      </div>

      {/* ADMIN STOCK DATATABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] text-left border-collapse">
            <thead>
              <tr className="bg-[#0F172A] text-white uppercase text-[9px] tracking-widest font-display font-medium">
                <th className="px-4 py-3 border-b border-slate-805 pl-5">STOCK CODE</th>
                <th className="px-4 py-3 border-b">PRODUCT PARTICULARS</th>
                <th className="px-4 py-3 border-b">CATEGORY</th>
                <th className="px-4 py-3 border-b text-right">COST PRICE</th>
                <th className="px-4 py-3 border-b text-right">SELLING PRICE</th>
                <th className="px-4 py-3 border-b text-right">GROSS MARGIN</th>
                <th className="px-4 py-3 border-b text-center">QUANTITY ON HAND</th>
                <th className="px-4 py-3 border-b text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((p) => {
                const margin = p.pricePerUnit - p.costPerUnit;
                const marginPercent = p.costPerUnit ? Math.round((margin / p.costPerUnit) * 100) : 0;
                
                const isOutOfStock = p.stockQuantity <= 0;
                const isLowStock = p.stockQuantity <= p.minStockLevel && p.stockQuantity > 0;

                return (
                  <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${
                    isOutOfStock ? 'bg-red-50/10' : isLowStock ? 'bg-amber-50/10' : ''
                  }`}>
                    <td className="px-4 py-3.5 font-mono text-gray-500 font-semibold">{p.id}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {p.imageUrl ? (
                          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                            <img 
                              src={p.imageUrl} 
                              alt={p.name} 
                              className="w-full h-full object-contain" 
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 font-display text-xs truncate">{p.name}</div>
                          {p.description && <div className="text-[10px] text-gray-400 mt-0.5 max-w-xs truncate">{p.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase ${
                        p.category === 'frozen_foods' ? 'bg-blue-50 text-blue-800 border border-blue-105' : 'bg-indigo-50 text-indigo-850 border border-indigo-105'
                      }`}>
                        {p.category === 'frozen_foods' ? 'Frozen Food' : 'Soft Drink'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-500 font-medium">₦{p.costPerUnit.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-black text-slate-900">₦{p.pricePerUnit.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-mono text-[10px] font-bold ${margin < 0 ? 'text-red-650' : 'text-blue-700'}`}>
                        ₦{margin.toLocaleString()} ({marginPercent}%)
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 font-sans">
                        <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                          isOutOfStock ? 'bg-red-100 text-red-800 font-black' :
                          isLowStock ? 'bg-amber-100 text-amber-800 font-black' : 'bg-slate-100 text-slate-700 font-black'
                        }`}>
                          {p.stockQuantity} {p.unit}
                        </span>
                        
                        {/* Status Dots */}
                        {isOutOfStock ? (
                          <span className="h-2 w-2 rounded-full bg-red-600 select-none animate-ping" title="STOCK OUT" />
                        ) : isLowStock ? (
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="LOW STOCK SPEED REFILL" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-blue-500" title="HEALTHY STOCK" />
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 block font-mono">Limit: {p.minStockLevel} {p.unit}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1 font-sans">
                        <button
                          onClick={() => openReplenishModal(p)}
                          className="bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-800 font-bold px-2.5 py-1 rounded-md text-[10px] transition-all border border-slate-200"
                          title="Replenish stock"
                        >
                          Replenish +
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1 px-2 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 font-sans rounded-md text-[10px] font-semibold"
                          title="Modify"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="p-1 px-2 border border-slate-200 hover:bg-red-50 hover:text-red-700 rounded-md text-[10px] text-slate-400"
                          title="Trash entry"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 bg-slate-50/50">
                    <Package className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-2 text-xs font-semibold text-slate-900 font-display">No items fit the search/alert parameter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRODUCT SUBMISSION ADD & EDIT DIALOG */}
      {modalOpen && (
        <div className="fixed inset-0 bg-[#0F172A]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 leading-normal my-auto">
            <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm tracking-wide font-display">
                {editMode ? `Edit Product: ${name}` : "Catalog New Product Addition"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden text-xs font-sans">
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">Product Trade Name *</label>
                  <input
                    type="text"
                    className="w-full border border-slate-205 rounded-xl p-2.5 focus:ring-1 focus:ring-blue-500 font-medium"
                    placeholder="e.g. Local Broiler cuts, Panda fillet, Malt pack..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">Category Classification</label>
                    <select
                      className="w-full border border-slate-205 rounded-xl p-2.5 focus:ring-1 focus:ring-blue-500 font-medium font-sans"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                    >
                      <option value="frozen_foods">Frozen Foods (Kilograms)</option>
                      <option value="soft_drinks">Soft Drinks & Beverages</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">Pricing / Trade Unit</label>
                    <select
                      className="w-full border border-slate-205 rounded-xl p-2.5 focus:ring-1 focus:ring-blue-500 font-medium font-sans"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as any)}
                    >
                      <option value="kg">Kilogram (kg)</option>
                      <option value="pcs">Single Piece (pcs)</option>
                      <option value="bag">Bag / Bundle (bag)</option>
                      <option value="crate">Crate (crate)</option>
                      <option value="pack">Pack / Pack of 12 (pack)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">Cost Price per Unit * (Audit purposes)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-bold text-slate-405">₦</span>
                      <input
                        type="number"
                        className="w-full border border-slate-205 rounded-xl p-2.5 pl-7 focus:ring-1 focus:ring-blue-500 font-mono"
                        placeholder="Wholesale acquisition cost"
                        value={costPerUnit || ""}
                        onChange={(e) => setCostPerUnit(Math.max(0, Number(e.target.value)))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">Retail Selling Price per Unit *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-bold text-slate-405">₦</span>
                      <input
                        type="number"
                        className="w-full border border-slate-205 rounded-xl p-2.5 pl-7 focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                        placeholder="Retail pricing"
                        value={pricePerUnit || ""}
                        onChange={(e) => setPricePerUnit(Math.max(0, Number(e.target.value)))}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">Initial Room Stock Balance *</label>
                    <input
                      type="number"
                      className="w-full border border-slate-205 rounded-xl p-2.5 focus:ring-1 focus:ring-blue-500 font-mono"
                      placeholder="Physical shelves count"
                      value={stockQuantity || ""}
                      onChange={(e) => setStockQuantity(Math.max(0, Number(e.target.value)))}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">Critical Low Warning Level</label>
                    <input
                      type="number"
                      className="w-full border border-slate-205 rounded-xl p-2.5 focus:ring-1 focus:ring-blue-500 font-mono"
                      placeholder="Limit trigger e.g. 20"
                      value={minStockLevel || ""}
                      onChange={(e) => setMinStockLevel(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">Stock Particulars / Specifications</label>
                  <textarea
                    className="w-full border border-slate-205 rounded-xl p-2.5 focus:ring-1 focus:ring-blue-500 font-sans h-16"
                    placeholder="Brief details about product size, quality, storage room details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Product Image Upload Section */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 block text-xs">
                      Product Picture (Upload Photo)
                    </label>
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-bold hover:underline"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>

                  {imageUrl ? (
                    <div className="relative rounded-2xl border border-slate-200 p-3 bg-slate-50 flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-xl border border-slate-200 shadow-xs bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        <img 
                          src={imageUrl} 
                          alt="Product Preview" 
                          className="w-full h-full object-contain" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800">Photo Attached</p>
                        <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCircle className="h-3 w-3" /> Will display on POS & Inventory
                        </p>
                      </div>
                      <label className="cursor-pointer bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shadow-xs shrink-0">
                        <Upload className="h-3.5 w-3.5 text-blue-600" />
                        <span>Change</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleFileInputChange} 
                        />
                      </label>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                        dragActive 
                          ? "border-blue-500 bg-blue-50/60" 
                          : "border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50"
                      }`}
                    >
                      <input 
                        type="file" 
                        id="product-image-upload" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileInputChange} 
                      />
                      <label 
                        htmlFor="product-image-upload" 
                        className="cursor-pointer flex flex-col items-center justify-center space-y-1.5"
                      >
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                          {imageUploading ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                          ) : (
                            <Upload className="h-5 w-5" />
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-800">
                          <span className="text-blue-600 hover:underline">Click to upload photo</span> or drag & drop
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Take photo with camera or choose from gallery (JPG, PNG, WebP)
                        </p>
                      </label>
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="bg-red-50 text-red-750 p-2.5 border border-red-200 rounded-xl font-bold font-mono">
                    {errorMsg}
                  </div>
                )}
              </div>

              {/* Action Buttons Sticky Footer */}
              <div className="p-4 flex gap-2 justify-end border-t border-slate-150 bg-slate-50/90 backdrop-blur-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="border border-[#cbd5e1] hover:bg-slate-100 bg-white text-slate-600 font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors shadow-xs cursor-pointer active:scale-97 disabled:opacity-50"
                >
                  {submitting ? "Writing data..." : "Save Product Stock"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* QUICK REPLENISH LEVEL MODAL */}
      {replenishModalOpen && (
        <div className="fixed inset-0 bg-[#0F172A]/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider font-display flex items-center gap-1.5">
                <Package className="h-4 w-4 text-blue-400" /> Stock Batch Replenishment
              </h3>
              <button 
                onClick={() => setReplenishModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleReplenish} className="p-4 space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Supply batch replenishment count</label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-blue-500 font-mono font-bold text-base text-slate-850"
                    value={amountToReplenish}
                    onChange={(e) => setAmountToReplenish(Math.max(1, Number(e.target.value)))}
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Specifying this adds directly to current active storage counts.</p>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setReplenishModalOpen(false)}
                  className="border border-[#cbd5e1] text-slate-550 font-bold px-4 py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl shadow-xs"
                >
                  Accept Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
