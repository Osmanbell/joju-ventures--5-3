import React, { useState, useEffect } from "react";
import { 
  Printer, Bluetooth, Check, X, RefreshCw, Play, CheckCircle2, AlertCircle, Unlink
} from "lucide-react";
import { 
  PrinterConfig, PaperWidth, getStoredPrinterConfig, savePrinterConfig, 
  ReceiptData, executePrint, isWebBluetoothAvailable,
  connectBluetoothPrinter, disconnectBluetoothPrinter,
  isBluetoothPrinterConnected, getConnectedBluetoothDeviceName,
  pingCleanter, OFFICIAL_PHONE, OFFICIAL_ADDRESS
} from "../utils/printerService";

interface PrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChange?: (newConfig: PrinterConfig) => void;
  onPrinterConnected?: (printerName: string | null) => void;
}

export default function PrinterModal({ 
  isOpen, 
  onClose, 
  onConfigChange,
  onPrinterConnected 
}: PrinterModalProps) {
  const [config, setConfig] = useState<PrinterConfig>(getStoredPrinterConfig());
  const [connectedDevice, setConnectedDevice] = useState<string | null>(getConnectedBluetoothDeviceName());
  const [isScanning, setIsScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isCheckingCleanter, setIsCheckingCleanter] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredPrinterConfig();
      setConfig(cfg);
      setConnectedDevice(getConnectedBluetoothDeviceName());
      setStatusMsg(null);
    }
  }, [isOpen]);

  const handleWidthChange = (paperWidth: PaperWidth) => {
    const updated = { ...config, paperWidth };
    setConfig(updated);
    savePrinterConfig(updated);
    if (onConfigChange) onConfigChange(updated);
  };

  const handleModeChange = (mode: 'webbluetooth' | 'cleanter' | 'browser') => {
    const updated = { ...config, mode };
    setConfig(updated);
    savePrinterConfig(updated);
    if (onConfigChange) onConfigChange(updated);
  };

  const handleAutoPrintToggle = (autoPrintOnCheckout: boolean) => {
    const updated = { ...config, autoPrintOnCheckout };
    setConfig(updated);
    savePrinterConfig(updated);
    if (onConfigChange) onConfigChange(updated);
  };

  // Real Web Bluetooth scanning and connection (No Hallucination)
  const handleSearchAndPair = async () => {
    setIsScanning(true);
    setStatusMsg(null);

    const result = await connectBluetoothPrinter();
    setIsScanning(false);

    if (result.success && result.deviceName) {
      setConnectedDevice(result.deviceName);
      const updatedCfg = { ...config, mode: 'webbluetooth' as const };
      setConfig(updatedCfg);
      savePrinterConfig(updatedCfg);
      if (onConfigChange) onConfigChange(updatedCfg);
      setStatusMsg({ success: true, text: `Successfully connected to ${result.deviceName} via Bluetooth!` });
      if (onPrinterConnected) onPrinterConnected(result.deviceName);
    } else {
      setConnectedDevice(null);
      setStatusMsg({ success: false, text: result.message });
      if (onPrinterConnected) onPrinterConnected(null);
    }
  };

  // Disconnect printer
  const handleDisconnect = () => {
    disconnectBluetoothPrinter();
    setConnectedDevice(null);
    setStatusMsg({ success: true, text: "Printer disconnected." });
    if (onPrinterConnected) onPrinterConnected(null);
  };

  // Test Cleanter local HTTP bridge connectivity
  const handleTestCleanter = async () => {
    setIsCheckingCleanter(true);
    setStatusMsg(null);
    const result = await pingCleanter(config.cleanterUrl);
    setIsCheckingCleanter(false);

    if (result.ok) {
      const updated = { ...config, mode: 'cleanter' as const };
      setConfig(updated);
      savePrinterConfig(updated);
      if (onConfigChange) onConfigChange(updated);
      setStatusMsg({ success: true, text: `Cleanter bridge is active and reachable at ${config.cleanterUrl}!` });
      if (onPrinterConnected) onPrinterConnected(`Cleanter Bridge (${config.paperWidth})`);
    } else {
      setStatusMsg({ 
        success: false, 
        text: `Could not reach Cleanter at ${config.cleanterUrl}. If using Android, open Cleanter app and tap 'Start'.` 
      });
    }
  };

  // Test print
  const handleTestPrint = async () => {
    setIsTesting(true);
    setStatusMsg(null);

    const testReceipt: ReceiptData = {
      receiptNo: "TEST-" + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toLocaleDateString('en-GB'),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: "Test Customer (Ibadan)",
      cashier: "Cashier",
      paymentMethod: "CASH",
      items: [
        { name: "Local Broiler Chicken 1kg", quantity: 1, pricePerUnit: 4500, totalPrice: 4500 },
        { name: "Maltina Can", quantity: 1, pricePerUnit: 600, totalPrice: 600 },
      ],
      totalAmount: 5100,
      netAmount: 5100,
      barcodeValue: OFFICIAL_PHONE
    };

    try {
      const result = await executePrint(testReceipt, config);
      if (result.success) {
        setStatusMsg({ success: true, text: "Receipt printed successfully!" });
      } else {
        setStatusMsg({ success: false, text: result.message || "Failed to print receipt." });
      }
    } catch (err: any) {
      setStatusMsg({ success: false, text: err.message || "Print test error." });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  const isBtConnected = isBluetoothPrinterConnected();
  const isPermissionError = statusMsg && !statusMsg.success && (
    statusMsg.text.toLowerCase().includes('permissions policy') || 
    statusMsg.text.toLowerCase().includes('permission')
  );

  return (
    <div className="fixed inset-0 bg-[#0F172A]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 font-sans flex flex-col max-h-[90vh] my-auto overflow-hidden">
        
        {/* Header - Fixed */}
        <div className="bg-[#0F172A] text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/20">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-white">Thermal Receipt Printer Setup</h3>
              <p className="text-[11px] text-slate-400">Bluetooth, System Spooler & Hardware Bridge</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Connection Mode Selection Tabs */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Print Mode
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => handleModeChange('browser')}
                className={`py-2 px-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                  config.mode === 'browser'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                System Spooler
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('webbluetooth')}
                className={`py-2 px-2 rounded-lg font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  config.mode === 'webbluetooth'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bluetooth className="h-3.5 w-3.5" /> Bluetooth
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('cleanter')}
                className={`py-2 px-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                  config.mode === 'cleanter'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cleanter Android
              </button>
            </div>
          </div>

          {/* Connection Status Box */}
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            isBtConnected 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
              : config.mode === 'cleanter'
                ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                : config.mode === 'webbluetooth'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-3 h-3 rounded-full shrink-0 ${
                isBtConnected ? 'bg-emerald-500 animate-ping' : config.mode === 'browser' ? 'bg-blue-500' : 'bg-slate-400'
              }`} />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500">
                  Active Status
                </span>
                <p className="font-bold text-xs truncate">
                  {isBtConnected 
                    ? `Connected: ${connectedDevice || 'Bluetooth Thermal Printer'}`
                    : config.mode === 'cleanter'
                      ? 'Cleanter Android Bridge Mode (Port 9100)'
                      : config.mode === 'webbluetooth'
                        ? 'Web Bluetooth (Not Paired)'
                        : 'Universal System / Browser Spooler (Active)'}
                </p>
              </div>
            </div>

            {isBtConnected && (
              <button
                onClick={handleDisconnect}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-white border border-rose-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Unlink className="h-3 w-3" /> Disconnect
              </button>
            )}
          </div>

          {/* Action Status / Error Banner */}
          {statusMsg && (
            <div className={`p-3.5 rounded-xl border text-xs space-y-2 animate-in fade-in duration-200 ${
              statusMsg.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-start gap-2.5">
                {statusMsg.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed font-medium">{statusMsg.text}</span>
              </div>

              {/* Quick resolution buttons when Permissions Policy restricts Web Bluetooth */}
              {isPermissionError && (
                <div className="pt-2 border-t border-rose-200/80 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleModeChange('browser');
                      setStatusMsg({ success: true, text: "Switched to Universal System / Browser Spooler mode. You can test print now!" });
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    ✓ Switch to System Spooler
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold px-3 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer active:scale-95"
                  >
                    Open in Full Tab for Bluetooth
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mode-Specific Settings: Web Bluetooth Mode */}
          {config.mode === 'webbluetooth' && (
            <div className="space-y-2 p-3.5 bg-blue-50/40 rounded-xl border border-blue-100">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Direct Bluetooth Device Search
              </label>

              <button
                type="button"
                onClick={handleSearchAndPair}
                disabled={isScanning}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-xs disabled:opacity-60"
              >
                <Bluetooth className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? "Scanning for Bluetooth Printers..." : "Search & Connect Bluetooth Printer"}</span>
              </button>
              
              <p className="text-[11px] text-slate-500 leading-tight">
                Works on Chrome (Android, Windows, Mac, ChromeOS). Note: Web Bluetooth requires a standalone tab (permissions policy prevents it in iframe previews).
              </p>
            </div>
          )}

          {/* Mode-Specific Settings: Cleanter Android Bridge */}
          {config.mode === 'cleanter' && (
            <div className="space-y-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-800">Cleanter Android Bridge</p>
                  <p className="text-[10px] text-slate-500">Local background ESC/POS server at {config.cleanterUrl}</p>
                </div>
                <button
                  type="button"
                  onClick={handleTestCleanter}
                  disabled={isCheckingCleanter}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  <RefreshCw className={`h-3 w-3 ${isCheckingCleanter ? 'animate-spin' : ''}`} />
                  <span>{isCheckingCleanter ? "Checking..." : "Check Cleanter"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Mode-Specific Settings: System Spooler */}
          {config.mode === 'browser' && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Universal System / OS Print Spooler
              </p>
              <p className="text-[11px] text-slate-500">
                Sends receipt directly to your operating system print dialog. Compatible with all thermal printers (USB, Network LAN, Bluetooth paired in OS, PDF).
              </p>
            </div>
          )}

          {/* Paper Width Selection */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Paper Roll Width
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleWidthChange('58mm')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  config.paperWidth === '58mm'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {config.paperWidth === '58mm' && <Check className="h-3.5 w-3.5 text-blue-600" />}
                <span>58mm (Mini Roll)</span>
              </button>
              <button
                type="button"
                onClick={() => handleWidthChange('80mm')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  config.paperWidth === '80mm'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {config.paperWidth === '80mm' && <Check className="h-3.5 w-3.5 text-blue-600" />}
                <span>80mm (Counter Roll)</span>
              </button>
            </div>
          </div>

          {/* Auto-print toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Auto-Print on Checkout</span>
              <span className="text-[10px] text-slate-400">Instantly print receipt after processing sale</span>
            </div>
            <input 
              type="checkbox" 
              checked={config.autoPrintOnCheckout}
              onChange={(e) => handleAutoPrintToggle(e.target.checked)}
              className="h-4.5 w-4.5 rounded accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Official Store Info Preview */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase text-[9px]">Receipt Store:</span>
              <span className="font-semibold text-slate-800">{config.storeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase text-[9px]">Official Address:</span>
              <span className="font-semibold text-slate-800">{OFFICIAL_ADDRESS}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase text-[9px]">Phone / WhatsApp:</span>
              <span className="font-semibold text-slate-800">{OFFICIAL_PHONE}</span>
            </div>
          </div>

        </div>

        {/* Modal Footer - Fixed */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex justify-between items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTestPrint}
            disabled={isTesting}
            className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-60"
          >
            <Play className={`h-3.5 w-3.5 text-blue-600 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? "Printing..." : "Test Print Receipt"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
