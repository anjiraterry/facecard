'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Coins,
  CheckSquare,
  MessageSquare,
  Flag,
  UserCog,
  FileText,
  LogOut,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
} from 'lucide-react';

interface StaffSession {
  id: string;
  email: string;
  fullName: string;
  role: {
    slug: string;
    name: string;
    permissions: string[];
  };
}

type NavSection =
  | 'overview'
  | 'users'
  | 'atelier_orders'
  | 'atelier_inventory'
  | 'economy'
  | 'approvals'
  | 'support'
  | 'moderation'
  | 'staff_rbac'
  | 'audit';

type User360Tab = 'overview' | 'orders' | 'scans' | 'cards' | 'points' | 'support' | 'security';

export default function ControlCentrePage() {
  const [staff, setStaff] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState<NavSection>('overview');
  const [globalSearch, setGlobalSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Overview
  const [overview, setOverview] = useState<any | null>(null);

  // Users & 360
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userTab, setUserTab] = useState<User360Tab>('overview');
  const [actionReason, setActionReason] = useState('');
  const [pointsDelta, setPointsDelta] = useState('');

  // Atelier
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stockDelta, setStockDelta] = useState<Record<string, string>>({});
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const [imagePrimaryByProduct, setImagePrimaryByProduct] = useState<Record<string, boolean>>({});

  // Economy & Approvals
  const [reconcileData, setReconcileData] = useState<any | null>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [decisionNote, setDecisionNote] = useState('');

  // Support & Moderation
  const [tickets, setTickets] = useState<any[]>([]);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [abuseFlags, setAbuseFlags] = useState<any[]>([]);
  const [flagOutcome, setFlagOutcome] = useState<Record<string, string>>({});

  // Staff & RBAC & Audit
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [newStaff, setNewStaff] = useState({ email: '', fullName: '', password: '', roleId: '' });

  const notify = (type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const checkSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff);
      } else {
        setStaff(null);
      }
    } catch {
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error || 'Authentication failed');
      return;
    }
    setStaff(data.staff);
    setPassword('');
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    setStaff(null);
    setSelectedUser(null);
  };

  const loadSection = useCallback(async (section: NavSection, q = globalSearch) => {
    if (section === 'overview') {
      const res = await fetch('/api/admin/overview');
      if (res.ok) setOverview(await res.json());
    } else if (section === 'users') {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      if (res.ok) setUsers((await res.json()).users || []);
    } else if (section === 'atelier_orders') {
      const res = await fetch('/api/admin/atelier/orders');
      if (res.ok) setOrders((await res.json()).orders || []);
    } else if (section === 'atelier_inventory') {
      const res = await fetch('/api/admin/atelier/products');
      if (res.ok) setProducts((await res.json()).products || []);
    } else if (section === 'economy') {
      const res = await fetch('/api/admin/economy/reconcile');
      if (res.ok) setReconcileData(await res.json());
    } else if (section === 'approvals') {
      const res = await fetch('/api/admin/approvals');
      if (res.ok) setApprovals((await res.json()).approvals || []);
    } else if (section === 'support') {
      const res = await fetch('/api/admin/support');
      if (res.ok) setTickets((await res.json()).tickets || []);
    } else if (section === 'moderation') {
      const res = await fetch('/api/admin/abuse-flags');
      if (res.ok) setAbuseFlags((await res.json()).flags || []);
    } else if (section === 'staff_rbac') {
      const [rRes, sRes] = await Promise.all([
        fetch('/api/admin/roles'),
        fetch('/api/admin/staff'),
      ]);
      if (rRes.ok) {
        const d = await rRes.json();
        setRoles(d.roles || []);
        setAllPermissions(d.allPermissions || []);
        if (d.roles?.[0]?.id) {
          setNewStaff((prev) => (prev.roleId ? prev : { ...prev, roleId: d.roles[0].id }));
        }
      }
      if (sRes.ok) setStaffUsers((await sRes.json()).staffUsers || []);
    } else if (section === 'audit') {
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) setAuditLogs((await res.json()).logs || []);
    }
  }, [globalSearch]);

  useEffect(() => {
    if (staff) loadSection(activeNav);
  }, [staff, activeNav, loadSection]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const el = document.getElementById('cc-global-search');
        el?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const loadUser360 = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}`);
    if (res.ok) {
      const data = await res.json();
      setSelectedUser(data.user);
      setUserTab('overview');
    }
  };

  const runUserAction = async (
    userId: string,
    action: 'REVOKE_SESSIONS' | 'REQUEST_SUSPENSION' | 'APPROVE_SUSPENSION' | 'RESTORE_USER'
  ) => {
    if (actionReason.trim().length < 5) {
      notify('err', 'Enter an audit reason (min 5 chars) first.');
      return;
    }
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason: actionReason.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      notify('ok', `Completed ${action}`);
      setActionReason('');
      loadUser360(userId);
      loadSection('users');
    } else {
      notify('err', data.error || 'Action failed');
    }
  };

  const proposePointsAdjustment = async (userId: string) => {
    const amount = Number(pointsDelta);
    if (!Number.isFinite(amount) || amount === 0 || actionReason.trim().length < 5) {
      notify('err', 'Enter a non-zero points delta and a reason (min 5 chars).');
      return;
    }
    const res = await fetch('/api/admin/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'POINTS_ADJUSTMENT',
        targetType: 'USER',
        targetId: userId,
        payload: { amount, balanceKind: 'SPENDABLE' },
        reason: actionReason.trim(),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      notify('ok', 'Submitted points adjustment for maker-checker approval.');
      setPointsDelta('');
      setActionReason('');
    } else {
      notify('err', data.error || 'Failed to submit approval request');
    }
  };

  const handleApprovalDecision = async (approvalId: string, decision: 'APPROVED' | 'REJECTED') => {
    const res = await fetch('/api/admin/approvals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId, decision, note: decisionNote.trim() || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      notify('ok', `Request ${decision.toLowerCase()}.`);
      setDecisionNote('');
      loadSection('approvals');
    } else {
      notify('err', data.error || 'Could not process decision');
    }
  };

  const handleOrderStatus = async (orderId: string, status: string) => {
    const res = await fetch('/api/admin/atelier/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status }),
    });
    const data = await res.json();
    if (res.ok) {
      notify('ok', `Order updated to ${status}`);
      loadSection('atelier_orders');
    } else {
      notify('err', data.error || 'Failed to update order');
    }
  };

  const handleStockAdjust = async (variantId: string, locationId: string) => {
    const delta = Number(stockDelta[variantId]);
    if (!Number.isFinite(delta) || delta === 0) {
      notify('err', 'Enter a non-zero stock adjustment');
      return;
    }
    const res = await fetch('/api/admin/atelier/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId,
        locationId,
        onHandDelta: delta,
        reason: 'Control Centre inventory adjustment',
      }),
    });
    const data = await res.json();
    if (res.ok) {
      notify('ok', `Stock adjusted (${delta > 0 ? `+${delta}` : delta})`);
      setStockDelta((prev) => ({ ...prev, [variantId]: '' }));
      loadSection('atelier_inventory');
    } else {
      notify('err', data.error || 'Stock adjustment failed');
    }
  };

  const handleProductImageUpload = async (productId: string, file: File | null) => {
    if (!file) return;
    setUploadingProductId(productId);
    try {
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('file', file);
      formData.append('isPrimary', String(imagePrimaryByProduct[productId] ?? true));

      const res = await fetch('/api/admin/atelier/products/images', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        notify('ok', 'Product image uploaded & saved');
        loadSection('atelier_inventory');
      } else {
        notify('err', data.error || 'Product image upload failed');
      }
    } catch {
      notify('err', 'Network error uploading product image');
    } finally {
      setUploadingProductId(null);
    }
  };

  const handleTicketReply = async (ticketId: string) => {
    const body = replyDraft[ticketId]?.trim();
    if (!body) return;
    const res = await fetch('/api/admin/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId, body, nextStatus: 'IN_PROGRESS' }),
    });
    if (res.ok) {
      notify('ok', 'Reply sent');
      setReplyDraft((prev) => ({ ...prev, [ticketId]: '' }));
      loadSection('support');
    }
  };

  const handleResolveFlag = async (flagId: string) => {
    const outcome = flagOutcome[flagId]?.trim() || 'DISMISSED';
    const res = await fetch('/api/admin/abuse-flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagId, outcome, reason: `Moderator review: ${outcome}` }),
    });
    if (res.ok) {
      notify('ok', 'Flag resolved');
      loadSection('moderation');
    }
  };

  const toggleRolePermission = async (role: any, perm: string) => {
    const has = role.permissions.includes(perm);
    const next = has ? role.permissions.filter((p: string) => p !== perm) : [...role.permissions, perm];
    const res = await fetch('/api/admin/roles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId: role.id, permissions: next }),
    });
    if (res.ok) {
      notify('ok', `Updated ${role.name}`);
      loadSection('staff_rbac');
    } else {
      notify('err', 'Failed to update role permissions');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStaff),
    });
    const data = await res.json();
    if (res.ok) {
      notify('ok', `Staff account created for ${data.staffUser.email}`);
      setNewStaff({ email: '', fullName: '', password: '', roleId: roles[0]?.id || '' });
      loadSection('staff_rbac');
    } else {
      notify('err', data.error || 'Failed to create staff');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4] text-[#251E24] text-sm">
        Loading Face Card Control Centre...
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4] text-[#251E24] p-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-2xl border border-[#E6DDD6] bg-white p-7 space-y-5 shadow-lg"
        >
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#96788D]">
              facecard. Control Centre
            </p>
            <h1 className="text-2xl font-semibold text-[#251E24]">Staff Sign In</h1>
            <p className="text-xs text-[#6E626B]">
              Private operations workspace. Independent staff credentials and audit trail enforced.
            </p>
          </div>
          {authError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {authError}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#251E24] block">Staff Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@facecard.ng"
              className="w-full h-10 rounded-lg border border-[#DDD3CB] bg-[#FAF7F4] px-3 text-sm text-[#251E24] focus:outline-none focus:border-[#96788D]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#251E24] block">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 rounded-lg border border-[#DDD3CB] bg-[#FAF7F4] px-3 text-sm text-[#251E24] focus:outline-none focus:border-[#96788D]"
            />
          </div>
          <button
            type="submit"
            className="w-full h-10 rounded-lg bg-[#251E24] text-[#FAF7F4] font-semibold text-sm hover:bg-[#3A2F38] transition-colors cursor-pointer"
          >
            Sign In to Control Centre
          </button>
        </form>
      </div>
    );
  }

  const perms = new Set(staff.role.permissions);

  const navGroups: Array<{
    group: string;
    items: Array<{ id: NavSection; label: string; icon: React.ReactNode; perm?: string }>;
  }> = [
    {
      group: 'Command',
      items: [
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'users', label: 'Customer 360', icon: <Users className="w-4 h-4" />, perm: 'users.read' },
      ],
    },
    {
      group: 'The Atelier',
      items: [
        { id: 'atelier_orders', label: 'Orders & Fulfilment', icon: <ShoppingBag className="w-4 h-4" />, perm: 'atelier.read' },
        { id: 'atelier_inventory', label: 'Catalogue & Stock', icon: <ShoppingBag className="w-4 h-4" />, perm: 'atelier.read' },
      ],
    },
    {
      group: 'Economy & Governance',
      items: [
        { id: 'economy', label: 'Points & Ledger', icon: <Coins className="w-4 h-4" />, perm: 'economy.reconcile' },
        { id: 'approvals', label: 'Approvals', icon: <CheckSquare className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Trust & Support',
      items: [
        { id: 'support', label: 'Support Desk', icon: <MessageSquare className="w-4 h-4" />, perm: 'support.read' },
        { id: 'moderation', label: 'Moderation', icon: <Flag className="w-4 h-4" />, perm: 'moderation.read' },
      ],
    },
    {
      group: 'Administration',
      items: [
        { id: 'staff_rbac', label: 'Staff & RBAC', icon: <UserCog className="w-4 h-4" />, perm: 'staff.read' },
        { id: 'audit', label: 'Staff Audit Log', icon: <FileText className="w-4 h-4" />, perm: 'audit.read' },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex bg-[#FAF7F4] text-[#251E24] font-sans">
      {/* Collapsible Sidebar (#251E24) */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-[72px]' : 'w-[256px]'
        } shrink-0 bg-[#251E24] text-[#FAF7F4] flex flex-col justify-between transition-all duration-200 border-r border-[#3B3039]`}
      >
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
            {!sidebarCollapsed && (
              <div>
                <p className="text-sm font-semibold tracking-tight">facecard.</p>
                <p className="text-[10px] tracking-[0.16em] uppercase text-[#D2B8C9]">Control Centre</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#D2B8C9] cursor-pointer"
              title="Toggle sidebar"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          <nav className="p-3 space-y-5">
            {navGroups.map((grp) => {
              const visible = grp.items.filter((i) => !i.perm || perms.has(i.perm));
              if (visible.length === 0) return null;
              return (
                <div key={grp.group} className="space-y-1">
                  {!sidebarCollapsed && (
                    <p className="px-2.5 text-[10px] uppercase tracking-[0.14em] text-[#D2B8C9]/60 font-semibold">
                      {grp.group}
                    </p>
                  )}
                  {visible.map((item) => {
                    const active = activeNav === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveNav(item.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#96788D] text-white'
                            : 'text-[#EBDCD5]/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {item.icon}
                        {!sidebarCollapsed && <span>{item.label}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-white/10 space-y-2">
          {!sidebarCollapsed && (
            <div className="px-2">
              <p className="text-xs font-medium text-white truncate">{staff.fullName}</p>
              <p className="text-[11px] text-[#D2B8C9] truncate">{staff.role.name}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-[#EBDCD5]/80 hover:bg-white/10 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#E6DDD6] px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-[#6E626B] absolute left-3" />
            <input
              id="cc-global-search"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setActiveNav('users');
                  loadSection('users', globalSearch);
                }
              }}
              placeholder="Search customers by name, @handle... (⌘K)"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E6DDD6] bg-[#FAF7F4] text-xs text-[#251E24] focus:outline-none focus:border-[#96788D]"
            />
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-[#FAF7F4] border border-[#E6DDD6] text-[#6E626B] font-medium">
              {staff.role.permissions.length} permissions active
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto">
          {toast && (
            <div
              className={`rounded-xl px-4 py-2.5 text-xs font-medium border ${
                toast.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {toast.text}
            </div>
          )}

          {/* 1. OVERVIEW */}
          {activeNav === 'overview' && overview && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Platform Overview</h1>
                <p className="text-xs text-[#6E626B]">Live operational metrics across Face Card Social, Economy, and The Atelier.</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  { label: 'Registered Users', val: overview.metrics.totalUsers },
                  { label: 'Active Users (30d)', val: overview.metrics.activeUsers30d },
                  { label: 'Portrait Scans', val: overview.metrics.totalScans },
                  { label: 'Paid Orders', val: overview.metrics.paidOrdersCount },
                  { label: 'Atelier Revenue', val: `₦${(overview.metrics.atelierRevenueMinor / 100).toLocaleString()}` },
                  { label: 'Open Tickets', val: overview.metrics.openTickets },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl bg-white border border-[#E6DDD6] p-4 space-y-1">
                    <p className="text-[11px] text-[#6E626B] font-medium">{m.label}</p>
                    <p className="text-xl font-semibold text-[#251E24]">{m.val}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl bg-white border border-[#E6DDD6] p-5 space-y-3">
                  <h2 className="text-sm font-semibold">Requires Attention</h2>
                  <div className="divide-y divide-[#F0EAE4] text-xs">
                    {[
                      { label: 'Low stock SKUs (≤5 units)', count: overview.requiresAttention.lowStockProducts, nav: 'atelier_inventory' as NavSection },
                      { label: 'Paid orders awaiting fulfilment', count: overview.requiresAttention.ordersAwaitingFulfilment, nav: 'atelier_orders' as NavSection },
                      { label: 'Unreviewed abuse flags', count: overview.requiresAttention.suspiciousScanFlags, nav: 'moderation' as NavSection },
                      { label: 'Pending maker-checker approvals', count: overview.requiresAttention.pendingApprovals, nav: 'approvals' as NavSection },
                      { label: 'Open support tickets', count: overview.requiresAttention.openSupportTickets, nav: 'support' as NavSection },
                    ].map((row) => (
                      <button
                        key={row.label}
                        onClick={() => setActiveNav(row.nav)}
                        className="w-full py-2.5 flex items-center justify-between hover:bg-[#FAF7F4] px-2 rounded cursor-pointer"
                      >
                        <span>{row.label}</span>
                        <span className="px-2 py-0.5 rounded-md bg-[#FAF7F4] border border-[#E6DDD6] font-semibold">
                          {row.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-white border border-[#E6DDD6] p-5 space-y-3">
                  <h2 className="text-sm font-semibold">Card Tier Distribution</h2>
                  <div className="space-y-2.5 text-xs">
                    {overview.metrics.tierDistribution.map((t: any) => (
                      <div key={t.tier} className="flex items-center justify-between">
                        <span className="font-medium">{t.tier}</span>
                        <span className="text-[#6E626B]">{t.count} users</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. CUSTOMER 360 */}
          {activeNav === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 rounded-xl bg-white border border-[#E6DDD6] p-4 space-y-3">
                <h2 className="text-sm font-semibold">Customers ({users.length})</h2>
                <div className="divide-y divide-[#F0EAE4] max-h-[600px] overflow-y-auto">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => loadUser360(u.id)}
                      className={`w-full text-left py-2.5 px-2.5 rounded-lg flex items-center justify-between cursor-pointer ${
                        selectedUser?.id === u.id ? 'bg-[#FAF7F4]' : 'hover:bg-[#FAF7F4]/60'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-semibold">{u.displayName}</p>
                        <p className="text-[11px] text-[#6E626B]">
                          @{u.handle || 'unclaimed'} · {u.tier} · {u.spendableBalance} PTS
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#FAF7F4] border border-[#E6DDD6]">
                        {u.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-8 rounded-xl bg-white border border-[#E6DDD6] p-5 space-y-4">
                {!selectedUser ? (
                  <p className="text-xs text-[#6E626B]">Select a customer to inspect their User 360 profile.</p>
                ) : (
                  <>
                    <div className="flex items-start justify-between border-b border-[#F0EAE4] pb-4">
                      <div>
                        <h2 className="text-lg font-semibold">{selectedUser.displayName}</h2>
                        <p className="text-xs text-[#6E626B]">
                          @{selectedUser.handle || 'none'} · {selectedUser.status} · ID {selectedUser.id.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-[#6E626B] mt-1">
                          {perms.has('users.read_contact_information') ? (
                            <span>Email: {selectedUser.email || 'None'}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#96788D]">
                              <Lock className="w-3 h-3" /> Contact info redacted
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="font-semibold text-[#96788D]">{selectedUser.tier}</p>
                        <p>{selectedUser.spendableBalance} spendable</p>
                        <p className="text-[#6E626B]">{selectedUser.lifetimePoints} lifetime</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 border-b border-[#F0EAE4] pb-2">
                      {(['overview', 'orders', 'scans', 'cards', 'points', 'support', 'security'] as User360Tab[]).map(
                        (tab) => (
                          <button
                            key={tab}
                            onClick={() => setUserTab(tab)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer ${
                              userTab === tab ? 'bg-[#251E24] text-white' : 'bg-[#FAF7F4] text-[#6E626B]'
                            }`}
                          >
                            {tab}
                          </button>
                        )
                      )}
                    </div>

                    {userTab === 'overview' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-[#FAF7F4]">
                          <p className="text-[#6E626B]">Daily Streak</p>
                          <p className="font-semibold">{selectedUser.streak?.currentCount ?? 0} days</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[#FAF7F4]">
                          <p className="text-[#6E626B]">Atelier Orders</p>
                          <p className="font-semibold">{selectedUser.atelierOrders?.length ?? 0}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[#FAF7F4]">
                          <p className="text-[#6E626B]">Support Tickets</p>
                          <p className="font-semibold">{selectedUser.supportTickets?.length ?? 0}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[#FAF7F4]">
                          <p className="text-[#6E626B]">Abuse Flags</p>
                          <p className="font-semibold">{selectedUser.abuseFlags?.length ?? 0}</p>
                        </div>
                      </div>
                    )}

                    {userTab === 'orders' && (
                      <div className="divide-y divide-[#F0EAE4] text-xs">
                        {(selectedUser.atelierOrders || []).map((o: any) => (
                          <div key={o.id} className="py-2 flex justify-between">
                            <span>{o.orderNumber} · {o.orderStatus}</span>
                            <span>₦{(o.totalMinor / 100).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {userTab === 'scans' && (
                      <div className="divide-y divide-[#F0EAE4] text-xs">
                        {(selectedUser.scans || []).map((s: any) => (
                          <div key={s.id} className="py-2 flex justify-between">
                            <span>Score {s.score} ({s.band}) · {s.source}</span>
                            <span className="text-[#6E626B]">{new Date(s.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {userTab === 'cards' && (
                      <div className="text-xs space-y-2">
                        {(selectedUser.cards || []).map((c: any) => (
                          <div key={c.id} className="p-3 rounded-lg bg-[#FAF7F4] flex justify-between">
                            <span className="font-mono">{c.cardNumber}</span>
                            <span>Slot {c.slot}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {userTab === 'points' && (
                      <div className="space-y-3 text-xs">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={pointsDelta}
                            onChange={(e) => setPointsDelta(e.target.value)}
                            placeholder="Points delta (e.g. 50)"
                            className="h-9 px-3 rounded-lg border border-[#DDD3CB] bg-[#FAF7F4] w-44"
                          />
                          <button
                            onClick={() => proposePointsAdjustment(selectedUser.id)}
                            className="px-3 h-9 rounded-lg bg-[#96788D] text-white font-medium cursor-pointer"
                          >
                            Propose Adjustment (Maker-Checker)
                          </button>
                        </div>
                        <div className="divide-y divide-[#F0EAE4] max-h-48 overflow-y-auto">
                          {(selectedUser.pointsLedger || []).map((p: any) => (
                            <div key={p.id} className="py-1.5 flex justify-between">
                              <span>{p.type} ({p.balanceKind})</span>
                              <span className="font-semibold">{p.amount > 0 ? `+${p.amount}` : p.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {userTab === 'support' && (
                      <div className="divide-y divide-[#F0EAE4] text-xs">
                        {(selectedUser.supportTickets || []).map((t: any) => (
                          <div key={t.id} className="py-2 flex justify-between">
                            <span>{t.subject} ({t.category})</span>
                            <span>{t.status}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {userTab === 'security' && (
                      <div className="space-y-3 text-xs">
                        <p className="text-[#6E626B]">
                          Consent Records: {selectedUser.consentRecords?.length ?? 0} · Age Confirmed:{' '}
                          {selectedUser.ageConfirmedAt ? 'Yes' : 'No'}
                        </p>
                        <input
                          value={actionReason}
                          onChange={(e) => setActionReason(e.target.value)}
                          placeholder="Mandatory audit reason (min 5 chars)..."
                          className="w-full h-9 px-3 rounded-lg border border-[#DDD3CB] bg-[#FAF7F4]"
                        />
                        <div className="flex flex-wrap gap-2">
                          {perms.has('users.revoke_sessions') && (
                            <button
                              onClick={() => runUserAction(selectedUser.id, 'REVOKE_SESSIONS')}
                              className="px-3 py-1.5 rounded-lg bg-[#251E24] text-white cursor-pointer"
                            >
                              Revoke Sessions
                            </button>
                          )}
                          {perms.has('users.request_suspension') && (
                            <button
                              onClick={() => runUserAction(selectedUser.id, 'REQUEST_SUSPENSION')}
                              className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 cursor-pointer"
                            >
                              Request Suspension
                            </button>
                          )}
                          {perms.has('users.approve_suspension') && (
                            <>
                              <button
                                onClick={() => runUserAction(selectedUser.id, 'APPROVE_SUSPENSION')}
                                className="px-3 py-1.5 rounded-lg bg-red-100 text-red-900 cursor-pointer"
                              >
                                Suspend Account
                              </button>
                              <button
                                onClick={() => runUserAction(selectedUser.id, 'RESTORE_USER')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-900 cursor-pointer"
                              >
                                Restore Account
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* 3. ATELIER ORDERS */}
          {activeNav === 'atelier_orders' && (
            <div className="rounded-xl bg-white border border-[#E6DDD6] p-5 space-y-4">
              <h1 className="text-lg font-semibold">Atelier Orders & Fulfilment</h1>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[#6E626B] border-b border-[#E6DDD6]">
                    <tr>
                      <th className="py-2.5">Order #</th>
                      <th className="py-2.5">Total</th>
                      <th className="py-2.5">Order</th>
                      <th className="py-2.5">Payment</th>
                      <th className="py-2.5">Fulfilment</th>
                      <th className="py-2.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EAE4]">
                    {orders.map((o) => (
                      <tr key={o.id} className="h-11">
                        <td className="font-mono font-medium">{o.orderNumber}</td>
                        <td>₦{(o.totalMinor / 100).toLocaleString()}</td>
                        <td>{o.orderStatus}</td>
                        <td>{o.paymentStatus}</td>
                        <td>{o.fulfilmentStatus}</td>
                        <td>
                          {perms.has('atelier.orders_write') && (
                            <select
                              value={o.orderStatus}
                              onChange={(e) => handleOrderStatus(o.id, e.target.value)}
                              className="h-8 rounded border border-[#DDD3CB] bg-[#FAF7F4] px-2 text-xs"
                            >
                              <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                              <option value="CONFIRMED">CONFIRMED</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. ATELIER INVENTORY */}
          {activeNav === 'atelier_inventory' && (
            <div className="rounded-xl bg-white border border-[#E6DDD6] p-5 space-y-4">
              <h1 className="text-lg font-semibold">Atelier Catalogue & Inventory</h1>
              <div className="divide-y divide-[#F0EAE4]">
                {products.map((p) => (
                  <div key={p.id} className="py-3 space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{p.name} ({p.brand?.name})</span>
                      <span className="text-[#6E626B]">{p.variants?.length ?? 0} variants · {p.images?.length ?? 0} images</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {(p.images || []).map((img: any) => (
                        <a
                          key={img.id}
                          href={img.objectKey}
                          target="_blank"
                          rel="noreferrer"
                          className="relative group block w-12 h-12 rounded-lg overflow-hidden border border-[#E6DDD6] bg-[#FAF7F4]"
                          title={img.altText || p.name}
                        >
                          <img src={img.objectKey} alt={img.altText || p.name} className="w-full h-full object-cover" />
                          {img.isPrimary && (
                            <span className="absolute bottom-0 inset-x-0 bg-[#251E24]/80 text-white text-[9px] text-center leading-tight py-0.5">
                              Primary
                            </span>
                          )}
                        </a>
                      ))}
                      {perms.has('atelier.write') && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <label className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded border border-[#DDD3CB] bg-[#FAF7F4] hover:bg-[#F2ECE6] cursor-pointer">
                            <span>{uploadingProductId === p.id ? 'Uploading…' : 'Upload image'}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/avif"
                              disabled={uploadingProductId === p.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                e.target.value = '';
                                handleProductImageUpload(p.id, file);
                              }}
                              className="hidden"
                            />
                          </label>
                          <label className="inline-flex items-center gap-1 text-[#6E626B] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={imagePrimaryByProduct[p.id] ?? true}
                              onChange={(e) =>
                                setImagePrimaryByProduct((prev) => ({ ...prev, [p.id]: e.target.checked }))
                              }
                            />
                            <span>Set primary</span>
                          </label>
                        </div>
                      )}
                    </div>
                    {(p.variants || []).map((v: any) =>
                      (v.inventoryLevels || []).map((lvl: any) => (
                        <div key={lvl.id} className="flex items-center justify-between text-xs bg-[#FAF7F4] px-3 py-2 rounded-lg">
                          <span>
                            {v.title} ({v.sku}) · On hand: <strong>{lvl.onHand}</strong> · Reserved: {lvl.reserved}
                          </span>
                          {perms.has('atelier.inventory_write') && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={stockDelta[v.id] || ''}
                                onChange={(e) => setStockDelta((prev) => ({ ...prev, [v.id]: e.target.value }))}
                                placeholder="+/- delta"
                                className="w-24 h-8 px-2 rounded border border-[#DDD3CB] bg-white text-xs"
                              />
                              <button
                                onClick={() => handleStockAdjust(v.id, lvl.locationId)}
                                className="px-2.5 h-8 rounded bg-[#251E24] text-white text-xs cursor-pointer"
                              >
                                Adjust
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. ECONOMY & LEDGER */}
          {activeNav === 'economy' && reconcileData && (
            <div className="rounded-xl bg-white border border-[#E6DDD6] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold">Points Economy & Reconciliation</h1>
                  <p className="text-xs text-[#6E626B]">
                    Checked {reconcileData.report.usersChecked} users ·{' '}
                    {reconcileData.report.drifted.length === 0 ? (
                      <span className="text-emerald-700 inline-flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Zero drift
                      </span>
                    ) : (
                      <span className="text-red-700 inline-flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> {reconcileData.report.drifted.length} drifted
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => loadSection('economy')}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[#251E24] text-white text-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reconcile Now
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[#6E626B] border-b border-[#E6DDD6]">
                    <tr>
                      <th className="py-2">Type</th>
                      <th className="py-2">Kind</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">User</th>
                      <th className="py-2">Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EAE4]">
                    {reconcileData.recentEntries.map((e: any) => (
                      <tr key={e.id} className="h-10">
                        <td className="font-mono">{e.type}</td>
                        <td>{e.balanceKind}</td>
                        <td>{e.amount}</td>
                        <td className="font-mono text-[#6E626B]">{e.userId.slice(0, 8)}...</td>
                        <td className="text-[#6E626B]">{e.refType || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. MAKER-CHECKER APPROVALS */}
          {activeNav === 'approvals' && (
            <div className="rounded-xl bg-white border border-[#E6DDD6] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold">Maker-Checker Approval Queue</h1>
                  <p className="text-xs text-[#6E626B]">Proposers cannot approve or reject their own requests.</p>
                </div>
                <input
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder="Optional decision note..."
                  className="h-9 px-3 rounded-lg border border-[#DDD3CB] bg-[#FAF7F4] text-xs w-64"
                />
              </div>
              <div className="divide-y divide-[#F0EAE4]">
                {approvals.length === 0 ? (
                  <p className="text-xs text-[#6E626B] py-4">No approval requests yet.</p>
                ) : (
                  approvals.map((a) => (
                    <div key={a.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <p className="font-semibold">
                          {a.actionType} · <span className="text-[#96788D]">{a.status}</span>
                        </p>
                        <p className="text-[#6E626B]">
                          By {a.proposer?.fullName} · Target {a.targetType}:{a.targetId.slice(0, 8)}... · Reason: {a.reason}
                        </p>
                      </div>
                      {a.status === 'PENDING' && a.proposerId !== staff.id && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprovalDecision(a.id, 'APPROVED')}
                            className="px-3 h-8 rounded-lg bg-emerald-600 text-white font-medium cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApprovalDecision(a.id, 'REJECTED')}
                            className="px-3 h-8 rounded-lg bg-red-600 text-white font-medium cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 7. SUPPORT DESK */}
          {activeNav === 'support' && (
            <div className="rounded-xl bg-white border border-[#E6DDD6] p-5 space-y-4">
              <h1 className="text-lg font-semibold">Customer Support Desk ({tickets.length})</h1>
              {tickets.length === 0 ? (
                <p className="text-xs text-[#6E626B]">No support tickets in queue.</p>
              ) : (
                tickets.map((t) => (
                  <div key={t.id} className="border border-[#E6DDD6] rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span>{t.subject} ({t.category})</span>
                      <span className="text-[#96788D]">{t.status}</span>
                    </div>
                    <div className="space-y-1 text-[#6E626B]">
                      {(t.messages || []).map((m: any) => (
                        <p key={m.id}>
                          <strong>{m.senderType}:</strong> {m.body}
                        </p>
                      ))}
                    </div>
                    {perms.has('support.reply') && (
                      <div className="flex gap-2 pt-1">
                        <input
                          value={replyDraft[t.id] || ''}
                          onChange={(e) => setReplyDraft((prev) => ({ ...prev, [t.id]: e.target.value }))}
                          placeholder="Write reply..."
                          className="flex-1 h-8 px-3 rounded border border-[#DDD3CB] bg-[#FAF7F4]"
                        />
                        <button
                          onClick={() => handleTicketReply(t.id)}
                          className="px-3 h-8 rounded bg-[#251E24] text-white cursor-pointer"
                        >
                          Send
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* 8. MODERATION */}
          {activeNav === 'moderation' && (
            <div className="rounded-xl bg-white border border-[#E6DDD6] p-5 space-y-4">
              <h1 className="text-lg font-semibold">Moderation & Abuse Flags ({abuseFlags.length})</h1>
              <div className="divide-y divide-[#F0EAE4]">
                {abuseFlags.map((f) => (
                  <div key={f.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <p className="font-semibold">
                        {f.user?.displayName || f.userId} · <span className="text-[#96788D]">{f.severity}</span>
                      </p>
                      <p className="text-[#6E626B]">{f.reason}</p>
                    </div>
                    {f.reviewedAt ? (
                      <span className="px-2.5 py-1 rounded bg-[#FAF7F4] border border-[#E6DDD6]">{f.outcome}</span>
                    ) : (
                      perms.has('moderation.resolve') && (
                        <div className="flex gap-2">
                          <select
                            value={flagOutcome[f.id] || 'DISMISSED'}
                            onChange={(e) => setFlagOutcome((prev) => ({ ...prev, [f.id]: e.target.value }))}
                            className="h-8 rounded border border-[#DDD3CB] bg-[#FAF7F4] px-2"
                          >
                            <option value="DISMISSED">DISMISSED</option>
                            <option value="WARNING_ISSUED">WARNING_ISSUED</option>
                            <option value="ESCALATED">ESCALATED</option>
                          </select>
                          <button
                            onClick={() => handleResolveFlag(f.id)}
                            className="px-3 h-8 rounded bg-[#251E24] text-white cursor-pointer"
                          >
                            Resolve
                          </button>
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. STAFF & RBAC MATRIX */}
          {activeNav === 'staff_rbac' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl bg-white border border-[#E6DDD6] p-5 space-y-3">
                  <h2 className="text-sm font-semibold">Staff Accounts ({staffUsers.length})</h2>
                  <div className="divide-y divide-[#F0EAE4] text-xs">
                    {staffUsers.map((su) => (
                      <div key={su.id} className="py-2 flex justify-between">
                        <div>
                          <p className="font-semibold">{su.fullName}</p>
                          <p className="text-[#6E626B]">{su.email} · {su.role?.name}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#FAF7F4] border border-[#E6DDD6] h-fit">{su.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {perms.has('staff.manage') && (
                  <form onSubmit={handleCreateStaff} className="rounded-xl bg-white border border-[#E6DDD6] p-5 space-y-3">
                    <h2 className="text-sm font-semibold flex items-center gap-1.5">
                      <Plus className="w-4 h-4" /> Invite / Create Staff Account
                    </h2>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input
                        required
                        placeholder="Full name"
                        value={newStaff.fullName}
                        onChange={(e) => setNewStaff((p) => ({ ...p, fullName: e.target.value }))}
                        className="h-9 px-3 rounded border border-[#DDD3CB] bg-[#FAF7F4]"
                      />
                      <input
                        required
                        type="email"
                        placeholder="staff@facecard.ng"
                        value={newStaff.email}
                        onChange={(e) => setNewStaff((p) => ({ ...p, email: e.target.value }))}
                        className="h-9 px-3 rounded border border-[#DDD3CB] bg-[#FAF7F4]"
                      />
                      <input
                        required
                        type="password"
                        minLength={10}
                        placeholder="Temp password (min 10 chars)"
                        value={newStaff.password}
                        onChange={(e) => setNewStaff((p) => ({ ...p, password: e.target.value }))}
                        className="h-9 px-3 rounded border border-[#DDD3CB] bg-[#FAF7F4]"
                      />
                      <select
                        value={newStaff.roleId}
                        onChange={(e) => setNewStaff((p) => ({ ...p, roleId: e.target.value }))}
                        className="h-9 px-3 rounded border border-[#DDD3CB] bg-[#FAF7F4]"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="px-4 h-9 rounded-lg bg-[#251E24] text-white text-xs font-medium cursor-pointer">
                      Create Staff Account
                    </button>
                  </form>
                )}
              </div>

              <div className="rounded-xl bg-white border border-[#E6DDD6] p-5 space-y-3 overflow-x-auto">
                <h2 className="text-sm font-semibold">Interactive Permission Matrix</h2>
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E6DDD6] text-[#6E626B]">
                    <tr>
                      <th className="py-2 pr-4">Permission</th>
                      {roles.map((r) => (
                        <th key={r.id} className="py-2 px-2 text-center">
                          {r.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EAE4]">
                    {allPermissions.map((perm) => (
                      <tr key={perm} className="h-9">
                        <td className="font-mono pr-4">{perm}</td>
                        {roles.map((r) => {
                          const checked = r.permissions.includes(perm);
                          return (
                            <td key={r.id} className="text-center px-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!perms.has('staff.manage')}
                                onChange={() => toggleRolePermission(r, perm)}
                                className="accent-[#96788D] cursor-pointer"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 10. AUDIT LOG */}
          {activeNav === 'audit' && (
            <div className="rounded-xl bg-white border border-[#E6DDD6] p-5 space-y-3">
              <h1 className="text-lg font-semibold">Immutable Staff Audit Log</h1>
              <div className="divide-y divide-[#F0EAE4] max-h-[600px] overflow-y-auto text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-mono font-semibold text-[#96788D]">{log.action}</p>
                      <p className="text-[#6E626B]">
                        {log.staffUser?.email || 'system'} → {log.targetType}{' '}
                        {log.targetId ? `(${log.targetId.slice(0, 8)}...)` : ''}
                        {log.reason ? ` · Reason: ${log.reason}` : ''}
                      </p>
                    </div>
                    <span className="text-[11px] text-[#6E626B] shrink-0">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
