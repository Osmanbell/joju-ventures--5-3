import React, { useState, useEffect } from 'react';
import { Attendant } from '../types';
import { Plus, Trash2, Edit2, UserPlus, Key, Users, Check, X, ShieldAlert, RefreshCw, Lock, Eye, EyeOff, ShieldCheck, Sparkles, Crown, ArrowUpDown } from 'lucide-react';
import { 
  getManagerPasswordFromFirestore, 
  updateManagerPasswordInFirestore, 
  createAttendantInFirestore, 
  updateAttendantInFirestore, 
  deleteAttendantInFirestore 
} from '../services/firestoreService';

interface AttendantsProps {
  attendants: Attendant[];
  refreshData: () => void;
}

export default function Attendants({ attendants, refreshData }: AttendantsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Manager Password states
  const [managerPass, setManagerPass] = useState('');
  const [showManagerPass, setShowManagerPass] = useState(false);
  const [managerPassSaving, setManagerPassSaving] = useState(false);
  const [managerPassMsg, setManagerPassMsg] = useState<{ text: string; success: boolean } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'attendant' | 'manager'>('attendant');
  const [showNewPass, setShowNewPass] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'attendant' | 'manager'>('attendant');
  const [showEditPass, setShowEditPass] = useState(false);
  const [editError, setEditError] = useState('');
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  // Fetch initial manager password
  useEffect(() => {
    async function loadManagerPassword() {
      try {
        const pass = await getManagerPasswordFromFirestore();
        setManagerPass(pass || '1234');
      } catch (err) {
        setManagerPass('1234');
      }
    }
    loadManagerPassword();
  }, []);

  const handleUpdateManagerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerPass.trim()) {
      setManagerPassMsg({ text: 'Manager password cannot be empty.', success: false });
      return;
    }

    setManagerPassSaving(true);
    setManagerPassMsg(null);

    try {
      // 1. Update in Firestore
      await updateManagerPasswordInFirestore(managerPass.trim());

      // 2. Backup update via server API (safely guarded)
      try {
        await fetch('/api/settings/manager-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: managerPass.trim() })
        });
      } catch {}

      setManagerPassMsg({ text: 'Manager Access Password updated & securely saved in Cloud Database!', success: true });
      refreshData();
    } catch (err: any) {
      setManagerPassMsg({ text: err.message || 'Failed to update manager password.', success: false });
    } finally {
      setManagerPassSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPassword('');
    setRole('attendant');
    setShowNewPass(false);
    setFormError('');
    setIsAdding(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) {
      setFormError('Both name and password are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      // 1. Direct Firestore create
      await createAttendantInFirestore({
        name: name.trim(),
        password: password.trim(),
        role: role
      });

      // 2. Backup to server API (safely guarded)
      try {
        await fetch('/api/attendants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), password: password.trim(), role: role })
        });
      } catch {}

      resetForm();
      refreshData();
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (attendant: Attendant) => {
    setEditingId(attendant.id);
    setEditName(attendant.name);
    setEditPassword(attendant.password || '');
    setEditRole(attendant.role || 'attendant');
    setShowEditPass(false);
    setEditError('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      setEditError('Name is required.');
      return;
    }

    try {
      const payload: any = { 
        name: editName.trim(),
        role: editRole
      };
      if (editPassword.trim() !== '') {
        payload.password = editPassword.trim();
      }

      // 1. Update in Firestore
      await updateAttendantInFirestore(id, payload);

      // 2. Backup to server API (safely guarded)
      try {
        await fetch(`/api/attendants/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch {}

      setEditingId(null);
      refreshData();
    } catch (err: any) {
      setEditError(err.message || 'Error occurred while updating.');
    }
  };

  // Quick 1-Click Promote / Demote Toggle
  const handleToggleRole = async (attendant: Attendant) => {
    const nextRole = attendant.role === 'manager' ? 'attendant' : 'manager';
    
    setRoleUpdatingId(attendant.id);
    try {
      // 1. Firestore update
      await updateAttendantInFirestore(attendant.id, { role: nextRole });

      // 2. Server API update (safely guarded)
      try {
        await fetch(`/api/attendants/${attendant.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: nextRole })
        });
      } catch {}

      refreshData();
    } catch (err: any) {
      alert(`Failed to update staff role: ${err.message || 'Error occurred'}`);
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this staff account? This will remove their profile and they won\'t be able to log in.')) {
      return;
    }

    try {
      // 1. Delete in Firestore
      await deleteAttendantInFirestore(id);

      // 2. Delete in server API (safely guarded)
      try {
        await fetch(`/api/attendants/${id}`, { method: 'DELETE' });
      } catch {}

      refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Title Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 font-display">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Staff & Manager Accounts Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Promote any staff member to Store Manager for full access, reverse roles at any time, manage custom passwords, and configure master security.
          </p>
        </div>

        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            id="btn-add-attendant"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Register New Staff</span>
          </button>
        )}
      </div>

      {/* STORE MANAGER MASTER PASSWORD CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 p-6 rounded-2xl text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white font-display flex items-center gap-2">
                <span>Manager Access Security & Master Password</span>
                <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-blue-500/30">
                  Admin Level
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Set any custom password with full support for letters, numbers, and symbols. Stored securely in your persistent cloud database.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateManagerPassword} className="space-y-4">
          <div className="max-w-xl">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
              Master Manager Password (All characters supported)
            </label>
            <div className="relative flex items-center">
              <input
                type={showManagerPass ? "text" : "password"}
                required
                placeholder="Enter new manager password (letters, numbers, symbols)"
                value={managerPass}
                onChange={(e) => setManagerPass(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pr-24 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-600 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowManagerPass(!showManagerPass)}
                className="absolute right-3 text-slate-400 hover:text-white p-1 text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                {showManagerPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="text-[10px] font-bold">{showManagerPass ? "Hide" : "Show"}</span>
              </button>
            </div>
          </div>

          {managerPassMsg && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
              managerPassMsg.success 
                ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300" 
                : "bg-rose-950/60 border border-rose-800 text-rose-300"
            }`}>
              {managerPassMsg.success ? (
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span>{managerPassMsg.text}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={managerPassSaving}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-97 disabled:opacity-50"
            >
              {managerPassSaving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving Password...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Update Manager Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-3 text-xs">
          <ShieldAlert className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
          <p className="font-semibold leading-relaxed">{formError}</p>
        </div>
      )}

      {/* Add New Staff Panel */}
      {isAdding && (
        <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm tracking-wide text-slate-200 flex items-center gap-2 font-display">
              <UserPlus className="h-4 w-4 text-blue-400" />
              <span>New Staff Account Registration</span>
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="att-new-name" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                Full Staff Name *
              </label>
              <input
                type="text"
                id="att-new-name"
                required
                placeholder="e.g. Fatima Abubakar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600 text-slate-100 font-medium"
              />
            </div>

            <div>
              <label htmlFor="att-new-password" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                Access Password * (All characters)
              </label>
              <div className="relative flex items-center">
                <input
                  type={showNewPass ? "text" : "password"}
                  id="att-new-password"
                  required
                  placeholder="Set password (letters, numbers, symbols)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pr-20 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600 text-slate-100 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 text-slate-400 hover:text-white p-1 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {showNewPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span className="text-[10px] font-bold">{showNewPass ? "Hide" : "Show"}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                Account Role & Access Level
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRole('attendant')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    role === 'attendant'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Cashier / Staff
                </button>
                <button
                  type="button"
                  onClick={() => setRole('manager')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    role === 'manager'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Crown className="h-3.5 w-3.5" /> Store Manager
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-97 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <span>Confirm Registration</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Attendants List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Active Staff Accounts ({attendants.length})
          </span>
          <span className="bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase">
            Full Role Management Active
          </span>
        </div>

        <div className="divide-y divide-slate-150">
          {attendants.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium">No staff registered on this Joju Ventures system yet.</p>
            </div>
          ) : (
            attendants.map((attendant) => {
              const isEditing = editingId === attendant.id;
              const isManager = attendant.role === 'manager';
              const isUpdatingRole = roleUpdatingId === attendant.id;

              return (
                <div key={attendant.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  {isEditing ? (
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Staff Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            New Password (All characters allowed)
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type={showEditPass ? "text" : "password"}
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              placeholder="Enter new password"
                              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-3 py-2 pr-16 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditPass(!showEditPass)}
                              className="absolute right-2 text-slate-400 hover:text-slate-700 p-1 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                            >
                              {showEditPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              <span>{showEditPass ? "Hide" : "Show"}</span>
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Account Access Role
                          </label>
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as 'manager' | 'attendant')}
                            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                          >
                            <option value="attendant">Cashier / Staff (POS Only)</option>
                            <option value="manager">Store Manager (Full Admin Access)</option>
                          </select>
                        </div>
                      </div>
                      {editError && <p className="text-[10px] text-rose-500 font-bold">{editError}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold uppercase font-sans text-xs shrink-0 shadow-sm border ${
                        isManager 
                          ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-400/20' 
                          : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                      }`}>
                        {isManager ? <Crown className="h-5 w-5 text-amber-600" /> : attendant.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 tracking-tight">{attendant.name}</h4>
                          {isManager ? (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 font-black text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1 font-mono uppercase tracking-wider">
                              <Crown className="h-3 w-3 text-amber-700" /> Store Manager
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[9px] px-2 py-0.5 rounded-md font-mono uppercase tracking-wider">
                              Cashier / Staff
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Key className="h-3 w-3 inline text-slate-400" /> Password Configured
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className={isManager ? "text-amber-700 font-semibold" : "text-slate-500"}>
                            {isManager ? "Full Manager Permissions (Audits, Inventory, Shift Reports)" : "POS Terminal & Sales Scoped"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(attendant.id)}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Save Changes</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {/* 1-Click Promote / Demote Role Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleRole(attendant)}
                          disabled={isUpdatingRole}
                          title={isManager ? "Reverse back to Cashier / Staff" : "Promote to Store Manager (Full Access)"}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs border ${
                            isManager
                              ? 'bg-slate-100 hover:bg-amber-50 text-slate-700 border-slate-300 hover:border-amber-300 hover:text-amber-800'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                          }`}
                        >
                          {isUpdatingRole ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : isManager ? (
                            <>
                              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
                              <span>Reverse to Staff</span>
                            </>
                          ) : (
                            <>
                              <Crown className="h-3.5 w-3.5 text-amber-600" />
                              <span>Make Store Manager</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEdit(attendant)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-1 text-[11px] font-bold font-sans cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Edit / Password</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(attendant.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex items-center gap-1 text-[11px] font-bold font-sans cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
