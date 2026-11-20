'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ShoppingBag,
  Droplet,
  Package,
  CreditCard,
  Layers,
  HeartHandshake,
  Check,
  BookOpen,
  FlaskConical,
} from 'lucide-react';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProductCard } from '@/components/commerce/ProductCard';
import { ProductDetailLayout } from '@/components/commerce/ProductDetailLayout';
import { ShoppingBagLayout, CheckoutLayout } from '@/components/commerce/BagAndCheckoutLayout';
import { OrderHistoryLayout, PersonalRoutineLayout } from '@/components/commerce/RoutineAndOrdersLayout';
import { IngredientLibraryView, ProgressJournalView } from '@/components/commerce/BeautyIntelligenceViews';
import { useToast } from '@/components/common/ToastProvider';
import { useAuth } from '@/hooks/useAuth';
import {
  atelierService,
  AtelierAddressDTO,
  AtelierBagDTO,
  AtelierConcernDTO,
  AtelierOrderDTO,
  AtelierProductDTO,
  AtelierRecommendationDTO,
} from '@/services/atelierService';

type CommerceView = 'CATALOGUE' | 'PDP' | 'ROUTINES' | 'QUESTIONNAIRE' | 'INGREDIENTS' | 'JOURNAL' | 'BAG' | 'CHECKOUT' | 'ORDERS';

const CATEGORIES = [
  { id: 'ALL', label: 'All' },
  { id: 'cleansers', label: 'Cleansers' },
  { id: 'serums', label: 'Serums' },
  { id: 'moisturizers', label: 'Moisturisers' },
  { id: 'sun-care', label: 'SPF' },
  { id: 'ritual-sets', label: 'Ritual Sets' },
];

const SKIN_TYPES = [
  { id: 'NORMAL', label: 'Normal' },
  { id: 'DRY', label: 'Dry' },
  { id: 'OILY', label: 'Oily' },
  { id: 'COMBINATION', label: 'Combination' },
  { id: 'UNSURE', label: 'Unsure' },
];

const VIEWS: { id: CommerceView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'CATALOGUE', label: 'Catalogue', icon: Layers },
  { id: 'QUESTIONNAIRE', label: 'Skin Profile', icon: HeartHandshake },
  { id: 'ROUTINES', label: 'Routines', icon: Droplet },
  { id: 'INGREDIENTS', label: 'Ingredients', icon: FlaskConical },
  { id: 'JOURNAL', label: 'Journal', icon: BookOpen },
  { id: 'BAG', label: 'Bag', icon: ShoppingBag },
  { id: 'CHECKOUT', label: 'Checkout', icon: CreditCard },
  { id: 'ORDERS', label: 'History', icon: Package },
];

export default function SkincareAtelierPage() {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [activeView, setActiveView] = useState<CommerceView>('CATALOGUE');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Catalogue & PDP
  const [products, setProducts] = useState<AtelierProductDTO[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<AtelierProductDTO | null>(null);
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);

  // Skin Profile & Recommendations & Routines
  const [concerns, setConcerns] = useState<AtelierConcernDTO[]>([]);
  const [skinType, setSkinType] = useState('COMBINATION');
  const [routinePreference, setRoutinePreference] = useState<'MINIMAL' | 'BALANCED' | 'COMPLETE'>('MINIMAL');
  const [sensitivitiesInput, setSensitivitiesInput] = useState('');
  const [existingOwned, setExistingOwned] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [selectedConcernIds, setSelectedConcernIds] = useState<string[]>([]);
  const [skinConsent, setSkinConsent] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [recommendations, setRecommendations] = useState<AtelierRecommendationDTO[]>([]);
  const [noPurchaseReason, setNoPurchaseReason] = useState<string | null>(null);
  const [routines, setRoutines] = useState<Array<{
    id: string;
    name: string;
    steps: Array<{ id: string; timeOfDay: 'AM' | 'PM'; stepNumber: number; stepTitle: string; guidance: string | null }>;
  }>>([]);

  // Bag, Addresses, Checkout, Orders
  const [bag, setBag] = useState<AtelierBagDTO | null>(null);
  const [addresses, setAddresses] = useState<AtelierAddressDTO[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [shippingQuote, setShippingQuote] = useState<{ zoneName: string; amountMinor: string; estimatedDays: string | null } | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orders, setOrders] = useState<AtelierOrderDTO[]>([]);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await atelierService.getProducts({
        q: searchQuery.trim() || undefined,
        category: activeCategory,
      });
      setProducts(res.products || []);
    } catch (err) {
      console.warn('Failed to load Atelier products:', err);
    } finally {
      setProductsLoading(false);
    }
  }, [activeCategory, searchQuery]);

  const loadUserData = useCallback(async () => {
    try {
      const [bagRes, ordersRes, addrRes, recRes, routineRes, profileRes] = await Promise.all([
        atelierService.getBag().catch(() => null),
        atelierService.getOrders().catch(() => null),
        atelierService.getAddresses().catch(() => null),
        atelierService.getRecommendations().catch(() => null),
        atelierService.getRoutines().catch(() => null),
        atelierService.getSkinProfile().catch(() => null),
      ]);
      if (bagRes?.bag) setBag(bagRes.bag);
      if (ordersRes?.orders) setOrders(ordersRes.orders);
      if (addrRes?.addresses) {
        setAddresses(addrRes.addresses);
        const def = addrRes.addresses.find((a) => a.isDefault) || addrRes.addresses[0];
        if (def) {
          setSelectedAddressId(def.id);
          atelierService.getShippingQuote(def.state).then((q) => setShippingQuote(q.quote)).catch(() => {});
        }
      }
      if (recRes?.recommendations) {
        setRecommendations(recRes.recommendations);
        setNoPurchaseReason(recRes.noPurchaseSuggested ? recRes.noPurchaseReason || null : null);
      }
      if (routineRes?.routines) setRoutines(routineRes.routines);
      if (profileRes) {
        setSkinConsent(profileRes.hasConsent);
        if (profileRes.profile) {
          setSkinType(profileRes.profile.skinType);
          setSelectedConcernIds(profileRes.profile.concerns.map((c) => c.concernId));
        }
      }
    } catch {
      // Unauthenticated users can still browse public catalogue
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const requested = new URLSearchParams(window.location.search).get('view') as CommerceView | null;
      if (requested && VIEWS.some((v) => v.id === requested)) {
        queueMicrotask(() => setActiveView(requested));
      }
    }
    atelierService.getConcerns().then((res) => setConcerns(res.concerns || [])).catch(() => {});
    loadUserData();
  }, [loadUserData]);

  const handleInspectProduct = async (product: AtelierProductDTO) => {
    setSelectedProduct(product);
    setActiveView('PDP');
    try {
      const res = await atelierService.getProductBySlug(product.slug);
      if (res.product) setSelectedProduct(res.product);
    } catch {}
  };

  const handleInspectBySlug = async (slug: string) => {
    try {
      const res = await atelierService.getProductBySlug(slug);
      if (res.product) {
        setSelectedProduct(res.product);
        setActiveView('PDP');
      }
    } catch {
      showToast('Could not load product details', 'error');
    }
  };

  const handleAddToBag = async (variantId: string, productName: string) => {
    setAddingVariantId(variantId);
    try {
      await atelierService.addToBag(variantId, 1);
      const bagRes = await atelierService.getBag();
      setBag(bagRes.bag);
      showToast(`Added ${productName} to your bag`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please sign in to add items to your bag';
      showToast(msg, 'error');
    } finally {
      setAddingVariantId(null);
    }
  };

  const handleUpdateQty = async (itemId: string, qty: number) => {
    try {
      await atelierService.updateBagItem(itemId, qty);
      const bagRes = await atelierService.getBag();
      setBag(bagRes.bag);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update quantity', 'error');
    }
  };

  const handleRemoveBagItem = async (itemId: string) => {
    try {
      await atelierService.removeBagItem(itemId);
      const bagRes = await atelierService.getBag();
      setBag(bagRes.bag);
      showToast('Item removed from bag', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not remove item', 'error');
    }
  };

  const toggleConcern = (id: string) => {
    setSelectedConcernIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const handleSaveSkinProfile = async () => {
    setSavingProfile(true);
    try {
      if (!skinConsent) {
        await atelierService.grantSkinConsent();
        setSkinConsent(true);
      }
      const sensitivities = sensitivitiesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await atelierService.saveSkinProfile({
        skinType,
        routinePreference,
        concernIds: selectedConcernIds,
        sensitivities,
        existingProducts: existingOwned,
        restrictions,
      });
      const recRes = await atelierService.getRecommendations();
      setRecommendations(recRes.recommendations || []);
      setNoPurchaseReason(recRes.noPurchaseSuggested ? recRes.noPurchaseReason || null : null);
      showToast('Skin profile saved & recommendations updated!', 'success');
      setActiveView('ROUTINES');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Please sign in to save your skin profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateRoutine = async () => {
    try {
      await atelierService.createDefaultRoutine();
      const res = await atelierService.getRoutines();
      setRoutines(res.routines || []);
      showToast('Daily ritual created!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Please sign in to create a routine', 'error');
    }
  };

  const handleSelectAddress = (id: string, state: string) => {
    setSelectedAddressId(id);
    atelierService.getShippingQuote(state).then((q) => setShippingQuote(q.quote)).catch(() => {});
  };

  const handleCreateAddress = async (payload: {
    recipientName: string;
    phone: string;
    line1: string;
    city: string;
    state: string;
  }) => {
    try {
      const res = await atelierService.createAddress({ ...payload, isDefault: true });
      setAddresses((prev) => [res.address, ...prev]);
      handleSelectAddress(res.address.id, res.address.state);
      showToast('Delivery address saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save address', 'error');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) return;
    setIsCheckingOut(true);
    try {
      const checkoutRes = await atelierService.checkout(selectedAddressId);
      const payRes = await atelierService.initializePayment(checkoutRes.order.id);
      await loadUserData();
      if (payRes.mode === 'mock') {
        showToast(`Order #${checkoutRes.order.orderNumber} placed (Paystack test mode)`, 'success');
        setActiveView('ORDERS');
      } else if (payRes.authorizationUrl) {
        window.location.href = payRes.authorizationUrl;
      } else {
        setActiveView('ORDERS');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Checkout failed', 'error');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className={`relative min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased pb-32 ${user ? 'md:pl-16 lg:pl-52' : ''}`}>
      <main className="relative z-10 max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-8 pt-5 space-y-5">
        <PageHeader title="Atelier" backHref="/shop" backLabel="Back to Boutique" />

        <SurfaceCard variant="warm" padding="sm" className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="space-y-0.5 text-xs">
              <p className="font-semibold text-[var(--foreground)]">Atelier Skincare Storefront</p>
              <p className="text-[var(--foreground-secondary)] leading-relaxed">
                Curated formulations, personalised routines, and NGN checkout. Digital card cosmetics remain in the{' '}
                <Link href="/shop" className="underline underline-offset-2 text-[var(--link)] font-semibold">
                  Points Boutique
                </Link>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('BAG')}
            className="px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{bag?.itemCount ?? 0}</span>
          </button>
        </SurfaceCard>

        <nav aria-label="Commerce layout views" className="flex items-center p-1 rounded-full bg-[var(--surface)] border border-[var(--border)] overflow-x-auto no-scrollbar gap-1">
          {VIEWS.map((view) => {
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
                className={`py-2 px-3.5 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-xs)]'
                    : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {view.label}
                {view.id === 'BAG' && (bag?.itemCount ?? 0) > 0 ? ` (${bag?.itemCount})` : ''}
              </button>
            );
          })}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeView === 'CATALOGUE' && (
              <section className="space-y-5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[var(--foreground-muted)] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    aria-label="Search skincare formulations"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find your next favourite..."
                    className="w-full h-12 pl-11 pr-4 rounded-full bg-[var(--surface)] border border-[var(--input-border)] text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--focus-ring)]"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                        activeCategory === cat.id
                          ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-xs)]'
                          : 'bg-[var(--surface-secondary)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productsLoading ? (
                    <>
                      <ProductCard product={null} />
                      <ProductCard product={null} />
                      <ProductCard product={null} />
                    </>
                  ) : products.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-xs text-[var(--foreground-muted)]">
                      No formulations match your current filter.
                    </div>
                  ) : (
                    products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onInspect={handleInspectProduct}
                        onAddToBag={handleAddToBag}
                        addingVariantId={addingVariantId}
                      />
                    ))
                  )}
                </div>
              </section>
            )}

            {activeView === 'PDP' && (
              <ProductDetailLayout
                product={selectedProduct}
                onAddToBag={handleAddToBag}
                isAdding={Boolean(addingVariantId)}
              />
            )}

            {activeView === 'QUESTIONNAIRE' && (
              <SurfaceCard variant="default" padding="lg" className="w-full space-y-6">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-plum)]">
                    Voluntary Consultation
                  </span>
                  <h2 className="font-display text-3xl font-medium text-[var(--foreground)]">
                    Your Skin Profile &amp; Goals
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--foreground-secondary)]">
                    Completely voluntary and separate from Face Card portrait scoring.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[var(--foreground)] block">Skin Type</span>
                  <div className="flex flex-wrap gap-2">
                    {SKIN_TYPES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSkinType(st.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                          skinType === st.id
                            ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent'
                            : 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-secondary)]'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[var(--foreground)] block">Primary Concerns</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {concerns.map((concern) => {
                      const isSelected = selectedConcernIds.includes(concern.id);
                      return (
                        <button
                          key={concern.id}
                          type="button"
                          onClick={() => toggleConcern(concern.id)}
                          aria-pressed={isSelected}
                          className={`h-12 px-4 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--surface-accent)] border-[var(--brand-plum)] text-[var(--foreground)]'
                              : 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          <span>{concern.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-[var(--brand-plum)]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1.5 block">
                    <span className="text-xs font-semibold text-[var(--foreground)] block">
                      Known Sensitivities or Allergies (comma-separated)
                    </span>
                    <input
                      type="text"
                      value={sensitivitiesInput}
                      onChange={(e) => setSensitivitiesInput(e.target.value)}
                      placeholder="e.g. fragrance, salicylic acid, retinol"
                      className="w-full h-11 px-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--foreground)]"
                    />
                  </label>

                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--foreground)] block">
                      Preferred Routine Complexity
                    </span>
                    <div className="flex gap-2">
                      {(['MINIMAL', 'BALANCED', 'COMPLETE'] as const).map((pref) => (
                        <button
                          key={pref}
                          type="button"
                          onClick={() => setRoutinePreference(pref)}
                          className={`flex-1 h-11 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                            routinePreference === pref
                              ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent'
                              : 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-secondary)]'
                          }`}
                        >
                          {pref.charAt(0) + pref.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--foreground)] block">
                      Products You Already Own
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {['Gentle Cleanser', 'Moisturiser', 'Sunscreen SPF'].map((owned) => {
                        const active = existingOwned.includes(owned);
                        return (
                          <button
                            key={owned}
                            type="button"
                            onClick={() =>
                              setExistingOwned((prev) =>
                                prev.includes(owned) ? prev.filter((x) => x !== owned) : [...prev, owned]
                              )
                            }
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                              active
                                ? 'bg-[var(--surface-accent)] border-[var(--brand-plum)] text-[var(--foreground)]'
                                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-secondary)]'
                            }`}
                          >
                            {owned}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--foreground)] block">
                      Restrictions
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {['pregnancy', 'fragrance-free'].map((rest) => {
                        const active = restrictions.includes(rest);
                        return (
                          <button
                            key={rest}
                            type="button"
                            onClick={() =>
                              setRestrictions((prev) =>
                                prev.includes(rest) ? prev.filter((x) => x !== rest) : [...prev, rest]
                              )
                            }
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                              active
                                ? 'bg-[var(--surface-accent)] border-[var(--brand-plum)] text-[var(--foreground)]'
                                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-secondary)]'
                            }`}
                          >
                            {rest === 'pregnancy' ? 'Pregnancy / Nursing Safe' : 'Fragrance-Free Only'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] gap-3">
                  <span className="text-[11px] text-[var(--foreground-muted)]">
                    Saving grants consent to personalise your Atelier recommendations.
                  </span>
                  <Button variant="primary" size="md" isLoading={savingProfile} onClick={handleSaveSkinProfile}>
                    Save &amp; Match Routine
                  </Button>
                </div>
              </SurfaceCard>
            )}

            {activeView === 'ROUTINES' && (
              <div className="space-y-4">
                {noPurchaseReason && (
                  <SurfaceCard variant="warm" padding="md" className="space-y-1">
                    <p className="text-xs font-semibold text-[var(--foreground)]">No New Purchase Needed</p>
                    <p className="text-xs text-[var(--foreground-secondary)]">{noPurchaseReason}</p>
                  </SurfaceCard>
                )}
                <PersonalRoutineLayout
                  recommendations={recommendations}
                  routines={routines}
                  onCreateRoutine={handleCreateRoutine}
                  onSelectProductSlug={handleInspectBySlug}
                />
              </div>
            )}

            {activeView === 'INGREDIENTS' && <IngredientLibraryView />}

            {activeView === 'JOURNAL' && <ProgressJournalView isAuthenticated={Boolean(user)} />}

            {activeView === 'BAG' && (
              <ShoppingBagLayout
                bag={bag}
                onUpdateQty={handleUpdateQty}
                onRemoveItem={handleRemoveBagItem}
                onProceedToCheckout={() => setActiveView('CHECKOUT')}
              />
            )}

            {activeView === 'CHECKOUT' && (
              <CheckoutLayout
                bag={bag}
                addresses={addresses}
                selectedAddressId={selectedAddressId}
                onSelectAddress={handleSelectAddress}
                onCreateAddress={handleCreateAddress}
                shippingQuote={shippingQuote}
                onPlaceOrder={handlePlaceOrder}
                isSubmitting={isCheckingOut}
              />
            )}

            {activeView === 'ORDERS' && <OrderHistoryLayout orders={orders} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
