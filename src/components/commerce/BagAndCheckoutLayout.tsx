'use client';

import React, { useState } from 'react';
import { ShoppingBag, CreditCard, Truck, Trash2, Plus, Minus, CheckCircle2 } from 'lucide-react';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/StateViews';
import { AtelierAddressDTO, AtelierBagDTO } from '@/services/atelierService';
import { formatNgnMinor } from '@/lib/atelier/serialize';

export function ShoppingBagLayout({
  bag,
  onUpdateQty,
  onRemoveItem,
  onProceedToCheckout,
}: {
  bag: AtelierBagDTO | null;
  onUpdateQty: (itemId: string, qty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onProceedToCheckout: () => void;
}) {
  const items = bag?.items || [];
  const subtotalLabel = bag ? formatNgnMinor(Number(bag.subtotalMinor)) : '₦0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      <div className="md:col-span-2 space-y-3">
        {items.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="w-5 h-5" />}
            title="Your Shopping Bag is Empty"
            description="Browse the Atelier catalogue and add formulations to begin your ritual order."
          />
        ) : (
          items.map((item) => (
            <SurfaceCard key={item.id} variant="default" padding="sm" className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-brand)] block">
                  {item.variant.product.brandName}
                </span>
                <h3 className="font-display text-lg font-semibold text-[var(--text-main)] truncate">
                  {item.variant.product.name}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {item.variant.sizeLabel || item.variant.name} · {formatNgnMinor(Number(item.unitPriceMinor))} each
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] px-1.5 py-1">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => (item.quantity > 1 ? onUpdateQty(item.id, item.quantity - 1) : onRemoveItem(item.id))}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--surface)] cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold tabular-nums w-5 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--surface)] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <span className="text-sm font-bold text-[var(--text-main)] tabular-nums">
                  {formatNgnMinor(Number(item.lineTotalMinor))}
                </span>

                <button
                  type="button"
                  aria-label="Remove item"
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--status-danger)] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </SurfaceCard>
          ))
        )}
      </div>

      <SurfaceCard variant="warm" padding="md" className="space-y-4">
        <h3 className="font-display text-xl font-semibold text-[var(--text-main)]">Order Summary</h3>
        <div className="space-y-2 text-xs border-y border-[var(--border-subtle)] py-3">
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Subtotal ({bag?.itemCount ?? 0} items)</span>
            <span className="tabular-nums font-semibold text-[var(--text-main)]">{subtotalLabel}</span>
          </div>
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Estimated Delivery</span>
            <span className="tabular-nums font-semibold text-[var(--text-main)]">Calculated at checkout</span>
          </div>
        </div>
        <Button variant="primary" size="lg" fullWidth disabled={items.length === 0} onClick={onProceedToCheckout}>
          <span>Proceed to Checkout</span>
        </Button>
      </SurfaceCard>
    </div>
  );
}

export function CheckoutLayout({
  bag,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onCreateAddress,
  shippingQuote,
  onPlaceOrder,
  isSubmitting,
}: {
  bag: AtelierBagDTO | null;
  addresses: AtelierAddressDTO[];
  selectedAddressId: string | null;
  onSelectAddress: (id: string, state: string) => void;
  onCreateAddress: (payload: {
    recipientName: string;
    phone: string;
    line1: string;
    city: string;
    state: string;
  }) => Promise<void>;
  shippingQuote: { zoneName: string; amountMinor: string; estimatedDays: string | null } | null;
  onPlaceOrder: () => Promise<void>;
  isSubmitting: boolean;
}) {
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('Lagos');
  const [state, setState] = useState('Lagos');
  const [savingAddr, setSavingAddr] = useState(false);

  const subtotalMinor = Number(bag?.subtotalMinor ?? 0);
  const shippingMinor = Number(shippingQuote?.amountMinor ?? 0);
  const totalMinor = subtotalMinor + shippingMinor;

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName || !phone || !line1 || !city || !state) return;
    setSavingAddr(true);
    try {
      await onCreateAddress({ recipientName, phone, line1, city, state });
      setRecipientName('');
      setPhone('');
      setLine1('');
    } finally {
      setSavingAddr(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      <SurfaceCard variant="default" padding="lg" className="md:col-span-2 space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h2 className="font-display text-2xl font-semibold text-[var(--text-main)]">Delivery &amp; Payment</h2>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] bg-[var(--bg-surface-warm)] text-[var(--accent-brand)]">
            Paystack NGN
          </span>
        </div>

        {addresses.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Saved Addresses</h3>
            <div className="space-y-2">
              {addresses.map((addr) => (
                <button
                  key={addr.id}
                  type="button"
                  onClick={() => onSelectAddress(addr.id, addr.state)}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                    selectedAddressId === addr.id
                      ? 'bg-[var(--surface-accent)] border-[var(--brand-plum)]'
                      : 'bg-[var(--surface)] border-[var(--border)]'
                  }`}
                >
                  <div className="text-xs">
                    <span className="font-semibold text-[var(--text-main)] block">
                      {addr.recipientName} · {addr.phone}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {addr.line1}, {addr.city}, {addr.state}
                    </span>
                  </div>
                  {selectedAddressId === addr.id && <CheckCircle2 className="w-4 h-4 text-[var(--brand-plum)] shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSaveAddress} className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Add Delivery Address
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Recipient Name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Full name" required />
            <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" required />
          </div>
          <Input label="Street Address" value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="House number, street" required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} required />
            <Input label="State" value={state} onChange={(e) => setState(e.target.value)} placeholder="Lagos, Abuja, etc." required />
          </div>
          <Button type="submit" variant="secondary" size="sm" isLoading={savingAddr}>
            Save Address
          </Button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] flex items-center gap-3">
            <Truck className="w-4 h-4 text-[var(--accent-brand)] shrink-0" />
            <div>
              <span className="text-xs font-semibold text-[var(--text-main)] block">
                {shippingQuote?.zoneName || 'Standard Courier'}
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {shippingQuote?.estimatedDays || 'Select address for estimate'}
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-[var(--accent-brand)] shrink-0" />
            <div>
              <span className="text-xs font-semibold text-[var(--text-main)] block">Paystack Checkout</span>
              <span className="text-[11px] text-[var(--text-muted)]">Cards, Bank Transfer &amp; USSD</span>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard variant="warm" padding="md" className="space-y-4">
        <h3 className="font-display text-xl font-semibold text-[var(--text-main)]">Order Total</h3>
        <div className="space-y-2 text-xs border-y border-[var(--border-subtle)] py-3 tabular-nums">
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Subtotal</span>
            <span className="font-semibold text-[var(--text-main)]">{formatNgnMinor(subtotalMinor)}</span>
          </div>
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Delivery</span>
            <span className="font-semibold text-[var(--text-main)]">
              {shippingQuote ? formatNgnMinor(shippingMinor) : 'Select address'}
            </span>
          </div>
          <div className="flex justify-between text-sm font-bold text-[var(--text-main)] pt-1 border-t border-[var(--border-subtle)]">
            <span>Total</span>
            <span>{formatNgnMinor(totalMinor)}</span>
          </div>
        </div>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          disabled={!selectedAddressId || !bag || bag.items.length === 0}
          onClick={onPlaceOrder}
        >
          <span>Place Order &amp; Pay</span>
        </Button>
      </SurfaceCard>
    </div>
  );
}
