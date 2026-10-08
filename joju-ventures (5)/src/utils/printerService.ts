// Thermal Receipt Printer Service & Real Bluetooth / Android Bridge Connector
// Production-grade implementation for 58mm / 80mm thermal receipt printers

export type PrinterMode = 'webbluetooth' | 'cleanter' | 'upeoretail' | 'rawbt' | 'browser';
export type PaperWidth = '58mm' | '80mm';

export interface PrinterConfig {
  mode: PrinterMode;
  paperWidth: PaperWidth;
  cleanterUrl: string; // default http://localhost:9100
  storeName: string;
  storeTagline: string;
  storeAddress: string;
  storePhone: string;
  footerMessage: string;
  autoPrintOnCheckout: boolean;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
}

export interface ReceiptData {
  receiptNo: string;
  date: string;
  time?: string;
  customerName: string;
  customerId?: string | null;
  cashier?: string;
  paymentMethod: string;
  items: ReceiptItem[];
  totalAmount: number;
  discountAmount?: number;
  pointsRedeemed?: number;
  netAmount: number;
  pointsEarned?: number;
  barcodeValue?: string; // 09135069662
}

export const OFFICIAL_PHONE = "09135069662";
export const OFFICIAL_ADDRESS = "Ibadan, Oyo state Nigeria";

const DEFAULT_CONFIG: PrinterConfig = {
  mode: 'browser',
  paperWidth: '58mm',
  cleanterUrl: 'http://localhost:9100',
  storeName: 'JOJU VENTURES LTD',
  storeTagline: 'Cold Room & Soft Drinks Wholesale',
  storeAddress: OFFICIAL_ADDRESS,
  storePhone: OFFICIAL_PHONE,
  footerMessage: 'Thank you for your valuable patronage!',
  autoPrintOnCheckout: false,
};

// Global active Web Bluetooth state
let activeBluetoothDevice: any = null;
let activeGattServer: any = null;
let activePrintCharacteristic: any = null;
let onBluetoothDisconnectCallback: (() => void) | null = null;

export function setBluetoothDisconnectListener(cb: () => void) {
  onBluetoothDisconnectCallback = cb;
}

export function getStoredPrinterConfig(): PrinterConfig {
  try {
    const raw = localStorage.getItem('joju_printer_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure official address and phone are synced
      return { 
        ...DEFAULT_CONFIG, 
        ...parsed,
        storeAddress: OFFICIAL_ADDRESS,
        storePhone: OFFICIAL_PHONE
      };
    }
  } catch (e) {
    console.error('Failed to parse stored printer config', e);
  }
  return DEFAULT_CONFIG;
}

export function savePrinterConfig(cfg: PrinterConfig): void {
  try {
    localStorage.setItem('joju_printer_config', JSON.stringify(cfg));
  } catch (e) {
    console.error('Failed to save printer config', e);
  }
}

// Check if running inside UpeoRetail Print Android WebView
export function isUpeoRetailAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).UpeoRetailPrinter;
}

// Check if Web Bluetooth is supported in browser
export function isWebBluetoothAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

// Check real Bluetooth connection state
export function isBluetoothPrinterConnected(): boolean {
  return !!(activeBluetoothDevice && activeBluetoothDevice.gatt && activeBluetoothDevice.gatt.connected);
}

export function getConnectedBluetoothDeviceName(): string | null {
  if (isBluetoothPrinterConnected()) {
    return activeBluetoothDevice.name || "Bluetooth Thermal Printer";
  }
  return null;
}

// Real Web Bluetooth Device Pairing & Connection
export async function connectBluetoothPrinter(): Promise<{
  success: boolean;
  deviceName?: string;
  message: string;
}> {
  if (!isWebBluetoothAvailable()) {
    return {
      success: false,
      message: "Web Bluetooth is not supported in this browser. Please open in Google Chrome (Android, Mac, Windows, ChromeOS) or use Cleanter Android print bridge."
    };
  }

  try {
    const bluetooth = (navigator as any).bluetooth;
    // Known thermal printer BLE service UUIDs
    const PRINTER_SERVICES = [
      '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer
      '0000ffe0-0000-1000-8000-00805f9b34fb', // Common thermal printer transparent UART
      '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Pos-58/80 BLE
    ];

    const device = await bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        'generic_access',
        ...PRINTER_SERVICES
      ]
    });

    if (!device) {
      return { success: false, message: "No Bluetooth device selected." };
    }

    // Connect to GATT server
    const server = await device.gatt.connect();
    if (!server || !server.connected) {
      return {
        success: false,
        message: `Could not establish GATT connection to ${device.name || 'device'}. Please ensure printer is powered on and within range.`
      };
    }

    // Search for writeable characteristic across services
    let writeChar: any = null;
    for (const serviceUuid of PRINTER_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeChar = char;
            break;
          }
        }
        if (writeChar) break;
      } catch {
        // service not present on this device, check next
      }
    }

    // Fallback: discover any primary service with a writeable characteristic
    if (!writeChar) {
      try {
        const services = await server.getPrimaryServices();
        for (const s of services) {
          try {
            const chars = await s.getCharacteristics();
            for (const c of chars) {
              if (c.properties.write || c.properties.writeWithoutResponse) {
                writeChar = c;
                break;
              }
            }
            if (writeChar) break;
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }

    activeBluetoothDevice = device;
    activeGattServer = server;
    activePrintCharacteristic = writeChar;

    const deviceName = device.name || "Bluetooth Thermal Printer";

    // Setup disconnection listener
    device.addEventListener('gattserverdisconnected', () => {
      activeBluetoothDevice = null;
      activeGattServer = null;
      activePrintCharacteristic = null;
      localStorage.removeItem('joju_connected_printer_name');
      if (onBluetoothDisconnectCallback) {
        onBluetoothDisconnectCallback();
      }
    });

    localStorage.setItem('joju_connected_printer_name', deviceName);

    return {
      success: true,
      deviceName,
      message: `Successfully connected to ${deviceName} via Bluetooth.`
    };
  } catch (err: any) {
    if (err.name === 'NotFoundError' || err.message?.includes('cancelled') || err.message?.includes('User cancelled')) {
      return { success: false, message: "Bluetooth device search was cancelled. No printer connected." };
    }
    if (err.name === 'SecurityError' || err.message?.toLowerCase().includes('permissions policy') || err.message?.toLowerCase().includes('disallowed by permissions policy')) {
      return { 
        success: false, 
        message: "Bluetooth is restricted inside iframe preview mode by the browser's Permissions Policy. To connect via direct Web Bluetooth, open the app in a standalone browser tab. You can also switch to 'System / Browser Spooler' mode to print directly to any printer." 
      };
    }
    return {
      success: false,
      message: `Failed to connect to printer: ${err.message || 'Connection error'}`
    };
  }
}

// Disconnect active Bluetooth printer
export function disconnectBluetoothPrinter(): { success: boolean; message: string } {
  try {
    if (activeGattServer && activeGattServer.connected) {
      activeGattServer.disconnect();
    }
    activeBluetoothDevice = null;
    activeGattServer = null;
    activePrintCharacteristic = null;
    localStorage.removeItem('joju_connected_printer_name');
    if (onBluetoothDisconnectCallback) {
      onBluetoothDisconnectCallback();
    }
    return { success: true, message: "Printer disconnected successfully." };
  } catch (err: any) {
    return { success: false, message: `Disconnection error: ${err.message}` };
  }
}

// Ping Cleanter local HTTP bridge
export async function pingCleanter(cleanterUrl = 'http://localhost:9100'): Promise<{ ok: boolean; message: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${cleanterUrl}/ping`, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal
    }).catch(async () => {
      return await fetch(`${cleanterUrl}/`, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal
      });
    });

    clearTimeout(timeoutId);
    if (res.ok || res.status === 200 || res.status === 404 || res.status === 405) {
      return { ok: true, message: 'Cleanter server is reachable on this device' };
    }
    return { ok: true, message: `Cleanter responded with status ${res.status}` };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { ok: false, message: 'Cleanter server connection timed out' };
    }
    return { ok: false, message: err.message || 'Cleanter server unreachable' };
  }
}

// Generate formatted plain-text ESC/POS lines based on 58mm (32 chars) or 80mm (48 chars)
export function formatReceiptText(receipt: ReceiptData, config: PrinterConfig): string {
  const width = config.paperWidth === '58mm' ? 32 : 48;
  const divider = '='.repeat(width);
  const dashed = '-'.repeat(width);

  const center = (text: string) => {
    if (text.length >= width) return text.substring(0, width);
    const leftPad = Math.floor((width - text.length) / 2);
    return ' '.repeat(leftPad) + text;
  };

  const lineCols = (left: string, right: string) => {
    const spaceNeeded = width - left.length - right.length;
    if (spaceNeeded <= 0) {
      return left.substring(0, width - right.length - 1) + ' ' + right;
    }
    return left + ' '.repeat(spaceNeeded) + right;
  };

  const lines: string[] = [];

  // Header
  lines.push(center(config.storeName));
  if (config.storeTagline) lines.push(center(config.storeTagline));
  lines.push(center(OFFICIAL_ADDRESS));
  lines.push(center(`Tel/WhatsApp: ${OFFICIAL_PHONE}`));
  lines.push(divider);

  // Meta
  lines.push(lineCols(`RECEIPT: ${receipt.receiptNo}`, receipt.paymentMethod.toUpperCase()));
  lines.push(lineCols(`DATE: ${receipt.date}`, receipt.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })));
  lines.push(`CUSTOMER: ${receipt.customerName}`);
  if (receipt.cashier) {
    lines.push(`CASHIER : ${receipt.cashier}`);
  }
  lines.push(dashed);

  // Item headers
  lines.push(lineCols('ITEM / PRICE', 'QTY / TOTAL'));
  lines.push(dashed);

  // Items
  for (const item of receipt.items) {
    lines.push(item.name);
    const unitText = `  ${item.quantity} x ₦${item.pricePerUnit.toLocaleString()}`;
    const totText = `₦${item.totalPrice.toLocaleString()}`;
    lines.push(lineCols(unitText, totText));
  }
  lines.push(dashed);

  // Totals
  lines.push(lineCols('SUBTOTAL:', `₦${receipt.totalAmount.toLocaleString()}`));
  if (receipt.discountAmount && receipt.discountAmount > 0) {
    lines.push(lineCols('DISCOUNT:', `-₦${receipt.discountAmount.toLocaleString()}`));
  }
  if (receipt.pointsRedeemed && receipt.pointsRedeemed > 0) {
    lines.push(lineCols('PTS REDEEMED:', `-₦${(receipt.pointsRedeemed * 10).toLocaleString()}`));
  }
  lines.push(divider);
  lines.push(lineCols('TOTAL NET:', `₦${receipt.netAmount.toLocaleString()}`));
  lines.push(divider);

  // Loyalty
  if (receipt.pointsEarned && receipt.pointsEarned > 0) {
    lines.push(center('** LOYALTY REWARD **'));
    lines.push(center(`Earned: +${receipt.pointsEarned} Points`));
    lines.push(dashed);
  }

  // Footer reference
  lines.push(center(config.footerMessage));
  lines.push(center(`WhatsApp Orders: ${OFFICIAL_PHONE}`));
  lines.push('');
  lines.push(''); // Feed lines

  return lines.join('\n');
}

// Print via active Web Bluetooth connection
export async function printViaBluetooth(
  receipt: ReceiptData,
  config: PrinterConfig
): Promise<{ success: boolean; message: string }> {
  if (!isBluetoothPrinterConnected()) {
    return {
      success: false,
      message: "No Bluetooth printer connected. Please pair your thermal printer first."
    };
  }

  try {
    const text = formatReceiptText(receipt, config);
    const encoder = new TextEncoder();
    
    // ESC/POS Initialization: ESC @ (reset), text bytes, LF, GS V A 3 (cut)
    const initCmd = new Uint8Array([0x1b, 0x40]);
    const textBytes = encoder.encode(text + "\n\n\n");
    const cutCmd = new Uint8Array([0x1d, 0x56, 0x41, 0x03]);

    const fullPayload = new Uint8Array(initCmd.length + textBytes.length + cutCmd.length);
    fullPayload.set(initCmd, 0);
    fullPayload.set(textBytes, initCmd.length);
    fullPayload.set(cutCmd, initCmd.length + textBytes.length);

    if (activePrintCharacteristic) {
      // Send in chunks of 100 bytes to avoid BLE MTU buffer overflow
      const chunkSize = 100;
      for (let i = 0; i < fullPayload.length; i += chunkSize) {
        const slice = fullPayload.slice(i, i + chunkSize);
        if (activePrintCharacteristic.properties.writeWithoutResponse) {
          await activePrintCharacteristic.writeValueWithoutResponse(slice);
        } else {
          await activePrintCharacteristic.writeValue(slice);
        }
        await new Promise(r => setTimeout(r, 20));
      }

      return {
        success: true,
        message: `Receipt printed successfully to ${activeBluetoothDevice?.name || 'Bluetooth Printer'}!`
      };
    } else {
      return {
        success: false,
        message: "Connected device does not support ESC/POS text writing."
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Bluetooth printing failed: ${err.message}`
    };
  }
}

// Send receipt to Cleanter Android bridge via HTTP POST
export async function printViaCleanter(
  receipt: ReceiptData,
  config: PrinterConfig
): Promise<{ success: boolean; message: string }> {
  const url = config.cleanterUrl.replace(/\/$/, '') + '/print';
  const textContent = formatReceiptText(receipt, config);

  const payload = {
    paper: config.paperWidth === '80mm' ? '80mm' : '58mm',
    rawText: textContent,
    receiptNo: receipt.receiptNo,
    storeName: config.storeName,
    items: receipt.items,
    total: receipt.netAmount,
    date: receipt.date,
    barcode: OFFICIAL_PHONE,
    commands: [
      { type: 'align', value: 'center' },
      { type: 'bold', value: true },
      { type: 'size', value: 'double' },
      { type: 'text', value: `${config.storeName}\n` },
      { type: 'size', value: 'normal' },
      { type: 'bold', value: false },
      { type: 'text', value: `${config.storeTagline}\n` },
      { type: 'text', value: `${OFFICIAL_ADDRESS}\n` },
      { type: 'text', value: `Tel/WhatsApp: ${OFFICIAL_PHONE}\n` },
      { type: 'divider', value: '=' },
      { type: 'align', value: 'left' },
      { type: 'text', value: `RECEIPT: ${receipt.receiptNo}\n` },
      { type: 'text', value: `DATE   : ${receipt.date}\n` },
      { type: 'text', value: `CLIENT : ${receipt.customerName}\n` },
      { type: 'text', value: `PAYMENT: ${receipt.paymentMethod.toUpperCase()}\n` },
      receipt.cashier ? { type: 'text', value: `CASHIER: ${receipt.cashier}\n` } : null,
      { type: 'divider', value: '-' },
      ...receipt.items.flatMap(item => [
        { type: 'bold', value: true },
        { type: 'text', value: `${item.name}\n` },
        { type: 'bold', value: false },
        { 
          type: 'row', 
          cols: [
            `${item.quantity} x ₦${item.pricePerUnit.toLocaleString()}`, 
            `₦${item.totalPrice.toLocaleString()}`
          ] 
        }
      ]),
      { type: 'divider', value: '-' },
      { type: 'row', cols: ['SUBTOTAL:', `₦${receipt.totalAmount.toLocaleString()}`] },
      receipt.discountAmount ? { type: 'row', cols: ['DISCOUNT:', `-₦${receipt.discountAmount.toLocaleString()}`] } : null,
      receipt.pointsRedeemed ? { type: 'row', cols: ['POINTS REDEEMED:', `-₦${(receipt.pointsRedeemed * 10).toLocaleString()}`] } : null,
      { type: 'divider', value: '=' },
      { type: 'bold', value: true },
      { type: 'row', cols: ['TOTAL NET:', `₦${receipt.netAmount.toLocaleString()}`] },
      { type: 'bold', value: false },
      { type: 'divider', value: '=' },
      { type: 'align', value: 'center' },
      { type: 'text', value: `${config.footerMessage}\n` },
      { type: 'text', value: `Order via WhatsApp: ${OFFICIAL_PHONE}\n` },
      { type: 'feed', lines: 2 },
      { type: 'cut' }
    ].filter(Boolean)
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { success: true, message: 'Receipt printed successfully via Cleanter Android Bridge!' };
    } else {
      const errText = await response.text().catch(() => '');
      return { 
        success: false, 
        message: `Cleanter returned status ${response.status}: ${errText || 'Print request error'}. Ensure Cleanter is started and printer is paired.` 
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { 
        success: false, 
        message: 'Connection to Cleanter timed out. Make sure Cleanter app is open on your Android device and port 9100 is active.' 
      };
    }
    return { 
      success: false, 
      message: `Could not reach Cleanter at ${config.cleanterUrl}. If using an Android phone/tablet, open Cleanter and tap 'Start'.` 
    };
  }
}

// Master dispatch function to execute printing based on active configuration
export async function executePrint(
  receipt: ReceiptData,
  config: PrinterConfig
): Promise<{ success: boolean; message: string }> {
  // If active Bluetooth printer is connected, print directly via Bluetooth GATT
  if (isBluetoothPrinterConnected()) {
    const btResult = await printViaBluetooth(receipt, config);
    if (btResult.success) {
      return btResult;
    }
    // If bluetooth failed, fall through with warning
    console.warn("Bluetooth print failed, attempting fallback:", btResult.message);
  }

  // If Cleanter mode configured
  if (config.mode === 'cleanter') {
    const cleanterResult = await printViaCleanter(receipt, config);
    if (cleanterResult.success) {
      return cleanterResult;
    }
    // Cleanter failed to connect
    return {
      success: false,
      message: cleanterResult.message
    };
  }

  // Universal system thermal print (CSS styled 58mm/80mm)
  try {
    window.print();
    return { success: true, message: 'Receipt sent to printer spooler successfully!' };
  } catch (err: any) {
    return { success: false, message: `System print error: ${err.message}` };
  }
}
