'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, ArrowLeft, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/commerce/ProductCard';
import { ProductDetailLayout } from '@/components/commerce/ProductDetailLayout';
import { useAuth } from '@/hooks/useAuth';
import { atelierService, AtelierProductDTO } from '@/services/atelierService';
import { formatNgnMinor } from '@/lib/atelier/serialize';

const CATEGORIES = [
  { id: 'ALL', label: 'All' },
  { id: 'cleansers', label: 'Cleansers' },
  { id: 'serums', label: 'Serums' },
  { id: 'moisturizers', label: 'Moisturisers' },
  { id: 'sun-care', label: 'SPF' },
  { id: 'ritual-sets', label: 'Ritual Sets' },
];

export default function PublicAtelierPage() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<AtelierProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<AtelierProductDTO | null>(null);
  const [signInPromptTarget, setSignInPromptTarget] = useState<{ variantId: string; product: AtelierProductDTO } | null>(null);
  const [buyTarget, setBuyTarget] = useState<{ variantId: string; product: AtelierProductDTO } | null>(null);
  const [zones, setZones] = useState<Array<{ id: string; name: string; baseFeeMinor: string; freeAboveMinor: string | null }>>([]);
  const [buyQty, setBuyQty] = useState(1);
  const [buyEmail, setBuyEmail] = useState('');
  const [buyName, setBuyName] = useState('');
  const [buyPhone, setBuyPhone] = useState('');
  const [buyStreet, setBuyStreet] = useState('');
  const [buyCity, setBuyCity] = useState('');
  const [buyState, setBuyState] = useState('Lagos');
  const [buyZoneId, setBuyZoneId] = useState('');
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState<{ orderNumber: string; totalMinor: number; reference: string } | null>(null);

  useEffect(() => {
    fetch('/api/atelier/delivery-zones')
      .then((r) => r.json())
      .then((d) => {
        if (d.zones?.length) {
          setZones(d.zones);
          setBuyZoneId(d.zones[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const openBuyNow = (variantId: string, product: AtelierProductDTO) => {
    setBuyTarget({ variantId, product });
    setBuyQty(1);
    setBuyError(null);
    setBuySuccess(null);
    if (user?.email && !buyEmail) setBuyEmail(user.email);
    if (user?.displayName && !buyName) setBuyName(user.displayName);
  };

  const handleAddClick = (variantId: string, product: AtelierProductDTO) => {
    if (user) {
      window.location.href = '/skincare';
      return;
    }
    setSignInPromptTarget({ variantId, product });
  };

  const handleGuestBuySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyTarget) return;
    setBuySubmitting(true);
    setBuyError(null);
    try {
      const res = await fetch('/api/atelier/guest-buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: buyTarget.variantId,
          quantity: buyQty,
          email: buyEmail,
          recipientName: buyName,
          phone: buyPhone,
          streetLine1: buyStreet,
          city: buyCity,
          state: buyState,
          deliveryZoneId: buyZoneId || null,
          callbackUrl: `${window.location.origin}/atelier`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Purchase failed');
      if (data.authorizationUrl && data.mode === 'paystack') {
        window.location.href = data.authorizationUrl;
        return;
      }
      setBuySuccess({
        orderNumber: data.order.orderNumber,
        totalMinor: data.order.totalMinor,
        reference: data.reference,
      });
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : 'Unable to complete purchase');
    } finally {
      setBuySubmitting(false);
    }
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await atelierService.getProducts({
        q: searchQuery.trim() || undefined,
        category: activeCategory,
      });
      setProducts(res.products || []);
    } catch (err) {
      setProducts([]);
      setLoadError(err instanceof Error ? err.message : 'Unable to load Atelier catalogue.');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleInspect = async (product: AtelierProductDTO) => {
    try {
      const res = await atelierService.getProductBySlug(product.slug);
      setSelectedProduct(res.product);
    } catch {
      setSelectedProduct(product);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased">
      {/* Public Top Navigation (No Sidebar) */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-display text-xl font-semibold tracking-tight">
              facecard<span className="text-[var(--brand-plum)]">.</span>
            </Link>
            <span className="text-xs font-medium text-[var(--foreground-muted)] hidden sm:inline">
              / Atelier
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            {user ? (
              <Link href="/skincare">
                <Button variant="primary" size="sm">Open My Atelier</Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/onboarding">
                  <Button variant="primary" size="sm">Claim Face Card</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-8 space-y-6">
        {selectedProduct ? (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Catalogue
            </Button>
            <ProductDetailLayout
              product={selectedProduct}
              onAddToBag={(variantId) => handleAddClick(variantId, selectedProduct)}
              onBuyNow={(variantId, prod) => openBuyNow(variantId, prod)}
            />
          </div>
        ) : (
          <>
            <SurfaceCard variant="warm" padding="lg" className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-plum)]">
                  The Atelier
                </span>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold">
                  Barrier-First Formulations
                </h1>
                <p className="text-xs sm:text-sm text-[var(--foreground-secondary)]">
                  Browse our curated skincare collection. Sign in to build a personalised AM/PM routine, save your skin profile, and check out in NGN.
                </p>
              </div>
              <Link href={user ? '/skincare' : '/sign-in'}>
                <Button variant="secondary" size="sm">
                  {user ? 'Go to Personalised Atelier' : 'Sign In to Personalise'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </SurfaceCard>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[var(--foreground-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cleansers, niacinamide, SPF..."
                  className="w-full h-11 pl-10 pr-4 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--brand-plum)]"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3.5 h-10 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {loadError && (
              <SurfaceCard variant="default" padding="md" className="flex items-center justify-between gap-3 border-red-200 bg-red-50/60 text-xs text-red-800">
                <span>{loadError}</span>
                <Button variant="secondary" size="sm" onClick={loadProducts}>Retry</Button>
              </SurfaceCard>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {loading
                ? Array.from({ length: 6 }).map((_, idx) => <ProductCard key={idx} product={null} />)
                : products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onInspect={handleInspect}
                      onAddToBag={(variantId) => handleAddClick(variantId, product)}
                      onBuyNow={(variantId, prod) => openBuyNow(variantId, prod)}
                    />
                  ))}
            </div>
          </>
        )}
      </main>

      {/* Sign-In Prompt for Add to Bag */}
      {signInPromptTarget && (
        <div
          onClick={() => setSignInPromptTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[24px] bg-[var(--surface)] border border-[var(--border)] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--foreground)]">Sign in to save your bag</h3>
              <button
                type="button"
                onClick={() => setSignInPromptTarget(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--foreground-muted)] hover:bg-[var(--surface-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
              Sign in to keep items in your Atelier bag across devices, or buy <strong>{signInPromptTarget.product.name}</strong> right now without signing in.
            </p>
            <div className="space-y-2">
              <Link
                href="/sign-in?redirect=/skincare"
                className="w-full py-2.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold flex items-center justify-center"
              >
                Sign In to Add to Bag
              </Link>
              <button
                type="button"
                onClick={() => {
                  const target = signInPromptTarget;
                  setSignInPromptTarget(null);
                  openBuyNow(target.variantId, target.product);
                }}
                className="w-full py-2.5 rounded-full bg-[var(--surface-secondary)] text-[var(--foreground)] border border-[var(--border)] text-xs font-semibold cursor-pointer"
              >
                Buy Now Without Signing In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Express Checkout Modal */}
      {buyTarget && (
        <div
          onClick={() => setBuyTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[24px] bg-[var(--surface)] border border-[var(--border)] p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">Express Checkout</h3>
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  No sign-in required · {buyTarget.product.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBuyTarget(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--foreground-muted)] hover:bg-[var(--surface-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {buySuccess ? (
              <div className="space-y-3 text-center py-4">
                <CheckCircle2 className="w-10 h-10 text-[var(--success)] mx-auto" />
                <h4 className="text-sm font-bold text-[var(--foreground)]">
                  Order Placed · {buySuccess.orderNumber}
                </h4>
                <p className="text-xs text-[var(--foreground-secondary)]">
                  Total: {formatNgnMinor(buySuccess.totalMinor)} · Reference: {buySuccess.reference}
                </p>
                <Button variant="primary" size="md" fullWidth onClick={() => setBuyTarget(null)}>
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={handleGuestBuySubmit} className="space-y-3">
                {buyError && (
                  <div className="p-2.5 rounded-xl bg-[var(--error-surface)] text-[var(--error)] text-xs">
                    {buyError}
                  </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-secondary)] text-xs">
                  <span className="font-semibold text-[var(--foreground)]">Quantity</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBuyQty((q) => Math.max(1, q - 1))}
                      className="w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--border)] font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold tabular-nums">{buyQty}</span>
                    <button
                      type="button"
                      onClick={() => setBuyQty((q) => Math.min(10, q + 1))}
                      className="w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--border)] font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <input
                  type="email"
                  required
                  value={buyEmail}
                  onChange={(e) => setBuyEmail(e.target.value)}
                  placeholder="Email for receipt *"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={buyName}
                    onChange={(e) => setBuyName(e.target.value)}
                    placeholder="Full name *"
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                  <input
                    type="tel"
                    required
                    value={buyPhone}
                    onChange={(e) => setBuyPhone(e.target.value)}
                    placeholder="Phone *"
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={buyStreet}
                  onChange={(e) => setBuyStreet(e.target.value)}
                  placeholder="Delivery street address *"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={buyCity}
                    onChange={(e) => setBuyCity(e.target.value)}
                    placeholder="City *"
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                  <input
                    type="text"
                    required
                    value={buyState}
                    onChange={(e) => setBuyState(e.target.value)}
                    placeholder="State *"
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  />
                </div>
                {zones.length > 0 && (
                  <select
                    value={buyZoneId}
                    onChange={(e) => setBuyZoneId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} (+{formatNgnMinor(Number(z.baseFeeMinor))} shipping)
                      </option>
                    ))}
                  </select>
                )}

                <Button type="submit" variant="primary" size="lg" fullWidth isLoading={buySubmitting}>
                  {buySubmitting ? 'Processing...' : 'Complete Purchase'}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
