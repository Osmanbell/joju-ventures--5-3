import React from 'react';
import { 
  Bell, X, CheckCheck, Trash2, ShoppingBag, Clock, User, 
  CreditCard, Coins, Smartphone, ArrowRight, Sparkles, AlertCircle 
} from 'lucide-react';
import { SaleNotification } from '../types';

interface NotificationBannerProps {
  notification: SaleNotification | null;
  onClose: () => void;
  onOpenCenter: () => void;
}

export function NotificationBanner({ notification, onClose, onOpenCenter }: NotificationBannerProps) {
  if (!notification) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-2xl p-4 text-white font-sans overflow-hidden relative group">
        
        {/* Animated 5-second progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 origin-left"
            style={{
              animation: 'progressCountdown 5s linear forwards'
            }}
          />
        </div>

        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShoppingBag className="h-4 w-4 animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-emerald-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                  Live Sale
                </span>
                <span className="text-xs font-extrabold text-white truncate">
                  ₦{notification.netAmount.toLocaleString()}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono uppercase">
                  {notification.paymentMethod}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium truncate mt-0.5 flex items-center gap-1.5">
                <span>Sold by <strong className="text-white font-bold">{notification.cashier}</strong></span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 font-mono text-[10px]">{notification.time}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Item preview summary */}
        <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 gap-2">
          <p className="truncate text-[11px] text-slate-300 font-sans">
            {notification.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCenter();
            }}
            className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 shrink-0 hover:underline cursor-pointer"
          >
            <span>All Alerts</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SaleNotification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export function NotificationCenterModal({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll
}: NotificationCenterModalProps) {
  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 bg-[#0F172A]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 font-sans flex flex-col max-h-[90vh] my-auto overflow-hidden">
        
        {/* Header - Fixed */}
        <div className="bg-[#0F172A] text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/20 relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-[#0F172A]" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-white flex items-center gap-2 font-display">
                <span>Real-Time Sales Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                    {unreadCount} NEW
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">Live staff transactions logged in real time</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 text-xs font-semibold">
          <span className="text-slate-500 text-[11px]">
            Total {notifications.length} staff transaction alerts
          </span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 text-[11px] cursor-pointer ml-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear alerts</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Notifications List */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="py-14 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Bell className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-slate-600">No Sales Alerts Yet</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Whenever any cashier completes a sale, the exact item details, amount, and time will appear here automatically.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id}
                className={`pt-3 first:pt-0 p-3 rounded-xl transition-colors ${
                  !notif.read ? 'bg-blue-50/40 border border-blue-100' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      !notif.read ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">
                          {notif.cashier}
                        </span>
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                          {notif.paymentMethod}
                        </span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>{notif.time} • {notif.date}</span>
                        <span>•</span>
                        <span>Receipt #{notif.receiptNo}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-emerald-700 font-mono block">
                      ₦{notif.netAmount.toLocaleString()}
                    </span>
                    {notif.customerName && notif.customerName !== 'Walk-in Buyer' && (
                      <span className="text-[9px] text-slate-400 block truncate max-w-[100px]">
                        {notif.customerName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Itemized List */}
                <div className="mt-2.5 bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1 text-[11px]">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Items Sold ({notif.items.length})
                  </p>
                  {notif.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-700">
                      <span className="truncate pr-2">
                        <strong className="font-bold text-slate-900">{item.quantity}x</strong> {item.name}
                      </span>
                      <span className="font-mono text-slate-500 shrink-0 font-medium">
                        ₦{item.totalPrice.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer - Fixed */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
